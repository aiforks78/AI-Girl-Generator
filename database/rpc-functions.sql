-- ============================================================================
-- Girl Generator RPC helpers (clean release)
-- ============================================================================
-- These stored procedures keep credit mutations consistent and encapsulate
-- the logic required by the Cloudflare Worker and Next.js frontend.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_system_config(config_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_value JSONB;
BEGIN
  SELECT value INTO config_value
  FROM system_config
  WHERE key = config_key;

  IF config_value IS NOT NULL THEN
    RETURN config_value;
  END IF;

  CASE config_key
    WHEN 'credit_costs' THEN
      RETURN jsonb_build_object('txt2img', 1, 'img2img', 10, 'img2vid', 60);
    WHEN 'credit_rewards' THEN
      RETURN jsonb_build_object('signup_bonus', 5, 'daily_checkin', 0);
    WHEN 'daily_limits' THEN
      RETURN jsonb_build_object('checkin_max', 3, 'checkin_interval', 4);
    ELSE
      RETURN '{}'::jsonb;
  END CASE;
EXCEPTION WHEN OTHERS THEN
  RETURN '{}'::jsonb;
END;
$$;

-- ============================================================================
-- Atomic credit deduction helper
-- ============================================================================
CREATE OR REPLACE FUNCTION deduct_credits_atomic(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS TABLE(
  new_balance INTEGER,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
  updated_credits INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RETURN QUERY SELECT 0, FALSE, 'USER_MISMATCH';
    RETURN;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT 0, FALSE, 'INVALID_AMOUNT';
    RETURN;
  END IF;

  SELECT credits INTO current_credits
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, FALSE, 'USER_NOT_FOUND';
    RETURN;
  END IF;

  IF current_credits < p_amount THEN
    RETURN QUERY SELECT current_credits, FALSE, 'INSUFFICIENT_CREDITS';
    RETURN;
  END IF;

  updated_credits := current_credits - p_amount;

  UPDATE user_credits
  SET
    credits = updated_credits,
    total_spent = total_spent + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT updated_credits, TRUE, NULL::TEXT;
END;
$$;

-- ============================================================================
-- Deduct credits and create a generation job atomically
-- ============================================================================
CREATE OR REPLACE FUNCTION deduct_and_create_job(
  p_user_id UUID,
  p_replicate_id TEXT,
  p_prompt TEXT,
  p_style TEXT,
  p_action TEXT,
  p_credit_cost INTEGER
)
RETURNS TABLE(
  job_id BIGINT,
  new_balance INTEGER,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
  updated_credits INTEGER;
  normalized_action TEXT := LOWER(COALESCE(p_action, 'txt2img'));
  job_status TEXT;
  created_job_id BIGINT;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RETURN QUERY SELECT 0, FALSE, 'USER_MISMATCH';
    RETURN;
  END IF;

  IF normalized_action = 'img2video' THEN
    normalized_action := 'img2vid';
  END IF;

  IF normalized_action NOT IN ('txt2img','img2img','img2vid') THEN
    RETURN QUERY SELECT 0, FALSE, 'INVALID_ACTION';
    RETURN;
  END IF;

  IF p_credit_cost IS NULL OR p_credit_cost <= 0 THEN
    RETURN QUERY SELECT 0, FALSE, 'INVALID_AMOUNT';
    RETURN;
  END IF;

  SELECT credits INTO current_credits
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::BIGINT, 0, FALSE, 'USER_NOT_FOUND';
    RETURN;
  END IF;

  IF current_credits < p_credit_cost THEN
    RETURN QUERY SELECT NULL::BIGINT, current_credits, FALSE, 'INSUFFICIENT_CREDITS';
    RETURN;
  END IF;

  updated_credits := current_credits - p_credit_cost;

  UPDATE user_credits
  SET
    credits = updated_credits,
    total_spent = total_spent + p_credit_cost,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  job_status := CASE normalized_action
    WHEN 'img2img' THEN 'img2img_pending'
    ELSE 'pending'
  END;

  INSERT INTO generation_jobs (
    replicate_id,
    user_id,
    action,
    status,
    prompt,
    style,
    created_at,
    updated_at
  ) VALUES (
    p_replicate_id,
    p_user_id,
    normalized_action,
    job_status,
    p_prompt,
    p_style,
    NOW(),
    NOW()
  ) RETURNING id INTO created_job_id;

  INSERT INTO credit_transactions (
    user_id,
    job_id,
    action,
    amount,
    balance_after,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    created_job_id,
    normalized_action,
    -p_credit_cost,
    updated_credits,
    jsonb_strip_nulls(jsonb_build_object(
      'prompt', LEFT(p_prompt, 160),
      'style', p_style
    )),
    NOW()
  );

  RETURN QUERY SELECT created_job_id, updated_credits, TRUE, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::BIGINT, current_credits, FALSE, COALESCE(SQLERRM, 'UNKNOWN_ERROR');
END;
$$;

-- ============================================================================
-- Upgrade an existing job to img2img (second-pass) generation
-- ============================================================================
CREATE OR REPLACE FUNCTION upgrade_to_img2img_atomic(
  p_user_id UUID,
  p_job_id BIGINT,
  p_new_replicate_id TEXT,
  p_credit_cost INTEGER
)
RETURNS TABLE(
  new_balance INTEGER,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
  updated_credits INTEGER;
  job_status TEXT;
  job_user UUID;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RETURN QUERY SELECT 0, FALSE, 'USER_MISMATCH';
    RETURN;
  END IF;

  IF p_credit_cost IS NULL OR p_credit_cost <= 0 THEN
    RETURN QUERY SELECT 0, FALSE, 'INVALID_AMOUNT';
    RETURN;
  END IF;

  SELECT user_id, status INTO job_user, job_status
  FROM generation_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND OR job_user <> p_user_id THEN
    RETURN QUERY SELECT 0, FALSE, 'JOB_NOT_FOUND';
    RETURN;
  END IF;

  IF job_status NOT IN ('ready', 'img2img_ready') THEN
    RETURN QUERY SELECT 0, FALSE, 'JOB_NOT_READY';
    RETURN;
  END IF;

  SELECT credits INTO current_credits
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF current_credits < p_credit_cost THEN
    RETURN QUERY SELECT current_credits, FALSE, 'INSUFFICIENT_CREDITS';
    RETURN;
  END IF;

  updated_credits := current_credits - p_credit_cost;

  UPDATE user_credits
  SET
    credits = updated_credits,
    total_spent = total_spent + p_credit_cost,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  UPDATE generation_jobs
  SET
    status = 'img2img_pending',
    action = 'img2img',
    replicate_id = p_new_replicate_id,
    credits_charged_hd = credits_charged_hd + p_credit_cost,
    updated_at = NOW()
  WHERE id = p_job_id;

  INSERT INTO credit_transactions (
    user_id,
    job_id,
    action,
    amount,
    balance_after,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    p_job_id,
    'img2img',
    -p_credit_cost,
    updated_credits,
    jsonb_build_object('upgrade', TRUE),
    NOW()
  );

  RETURN QUERY SELECT updated_credits, TRUE, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT current_credits, FALSE, COALESCE(SQLERRM, 'UNKNOWN_ERROR');
END;
$$;

-- ============================================================================
-- Refund credits atomically and log the transaction
-- ============================================================================
CREATE OR REPLACE FUNCTION refund_credits(
  p_user_id UUID,
  p_job_id BIGINT,
  p_refund_amount INTEGER,
  p_reason TEXT
)
RETURNS TABLE(
  new_balance INTEGER,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
  updated_credits INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RETURN QUERY SELECT 0, FALSE, 'USER_MISMATCH';
    RETURN;
  END IF;

  IF p_refund_amount IS NULL OR p_refund_amount <= 0 THEN
    RETURN QUERY SELECT 0, FALSE, 'INVALID_AMOUNT';
    RETURN;
  END IF;

  SELECT credits INTO current_credits
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, FALSE, 'USER_NOT_FOUND';
    RETURN;
  END IF;

  updated_credits := current_credits + p_refund_amount;

  UPDATE user_credits
  SET
    credits = updated_credits,
    total_earned = total_earned + p_refund_amount,
    total_spent = GREATEST(total_spent - p_refund_amount, 0),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO credit_transactions (
    user_id,
    job_id,
    action,
    amount,
    balance_after,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    p_job_id,
    'refund',
    p_refund_amount,
    updated_credits,
    jsonb_strip_nulls(jsonb_build_object('reason', p_reason)),
    NOW()
  );

  RETURN QUERY SELECT updated_credits, TRUE, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT current_credits, FALSE, COALESCE(SQLERRM, 'UNKNOWN_ERROR');
END;
$$;

-- ============================================================================
-- Daily top-up helper: ensure user balance meets minimum threshold once a day
-- ============================================================================
CREATE OR REPLACE FUNCTION daily_topup_to_minimum(
  p_user_id UUID,
  p_minimum INTEGER
)
RETURNS TABLE(
  new_balance INTEGER,
  credited INTEGER,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
  delta INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RETURN QUERY SELECT 0, 0, FALSE, 'USER_MISMATCH';
    RETURN;
  END IF;

  IF p_minimum IS NULL OR p_minimum < 0 THEN
    RETURN QUERY SELECT 0, 0, FALSE, 'INVALID_MINIMUM';
    RETURN;
  END IF;

  SELECT credits INTO current_credits
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, credits, total_earned, total_spent)
    VALUES (p_user_id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    current_credits := 0;
  END IF;

  delta := GREATEST(p_minimum - current_credits, 0);

  IF delta <= 0 THEN
    RETURN QUERY SELECT current_credits, 0, TRUE, NULL::TEXT;
    RETURN;
  END IF;

  UPDATE user_credits
  SET
    credits = current_credits + delta,
    total_earned = total_earned + delta,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO credit_transactions (
    user_id,
    action,
    amount,
    balance_after,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    'daily_topup',
    delta,
    current_credits + delta,
    jsonb_build_object('reason', 'daily_topup_to_minimum'),
    NOW()
  );

  RETURN QUERY SELECT current_credits + delta, delta, TRUE, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT current_credits, 0, FALSE, COALESCE(SQLERRM, 'UNKNOWN_ERROR');
END;
$$;
