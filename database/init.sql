-- ============================================================================
-- Girl Generator Database Schema (Clean Release)
-- ============================================================================
-- This script provisions the minimal schema and policies required to run the
-- Replicate-only version of Girl Generator. Apply via psql or Supabase SQL.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

BEGIN;

-- ============================================================================
-- generation_jobs: primary job ledger for txt2img / img2img / img2vid
-- ============================================================================
CREATE TABLE generation_jobs (
  id BIGSERIAL PRIMARY KEY,
  replicate_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('txt2img', 'img2img', 'img2vid')),
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'ready', 'img2img_pending', 'img2img_ready', 'failed', 'blocked')
  ) DEFAULT 'pending',
  model_id TEXT,
  prompt TEXT NOT NULL,
  prompt_enhanced TEXT,
  aspect_ratio TEXT NOT NULL DEFAULT '1:1' CHECK (
    aspect_ratio IN ('1:1','16:9','9:16','4:3','3:4','3:2','2:3')
  ),
  image_width INTEGER,
  image_height INTEGER,
  output_count INTEGER NOT NULL DEFAULT 1 CHECK (output_count BETWEEN 1 AND 4),
  credits_charged INTEGER NOT NULL DEFAULT 0,
  credits_charged_hd INTEGER NOT NULL DEFAULT 0,
  request_fingerprint TEXT,
  character_id UUID,
  character_association_source TEXT,
  style TEXT,
  image_url TEXT,
  hd_url TEXT,
  video_url TEXT,
  public_id TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  moderation_status TEXT NOT NULL DEFAULT 'pending',
  moderation_labels TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  moderated_at TIMESTAMPTZ,
  related JSONB NOT NULL DEFAULT '{}'::JSONB,
  cost_usd NUMERIC(10,4),
  error_message TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_generation_jobs_user_created
  ON generation_jobs (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_generation_jobs_status_pending
  ON generation_jobs (status)
  WHERE status IN ('pending', 'img2img_pending');

CREATE INDEX idx_generation_jobs_replicate_id
  ON generation_jobs (replicate_id);

CREATE UNIQUE INDEX idx_generation_jobs_public_id
  ON generation_jobs (public_id)
  WHERE public_id IS NOT NULL;

CREATE UNIQUE INDEX idx_generation_jobs_user_fingerprint
  ON generation_jobs (user_id, request_fingerprint)
  WHERE request_fingerprint IS NOT NULL;

CREATE INDEX idx_generation_jobs_character
  ON generation_jobs (character_id)
  WHERE character_id IS NOT NULL;

CREATE INDEX idx_generation_jobs_moderation
  ON generation_jobs (moderation_status)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- generation_images: persisted variants (standard/img2img/video)
-- ============================================================================
CREATE TABLE generation_images (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('standard', 'img2img', 'video')),
  url TEXT NOT NULL,
  index INTEGER NOT NULL DEFAULT 1 CHECK (index >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_generation_images_job ON generation_images(job_id);

-- ============================================================================
-- user_credits: simple wallet ledger per user
-- ============================================================================
CREATE TABLE user_credits (
  user_id UUID PRIMARY KEY,
  credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  total_spent INTEGER NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- credit_transactions: immutable audit log for credit movements
-- ============================================================================
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  job_id BIGINT,
  asset_idx INTEGER NOT NULL DEFAULT 0,
  action TEXT NOT NULL CHECK (
    action IN (
      'txt2img','img2img','img2vid','refund','purchase',
      'signup_bonus','daily_checkin','daily_topup','create_character'
    )
  ),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, asset_idx, action)
);

CREATE INDEX idx_credit_transactions_user_created
  ON credit_transactions (user_id, created_at DESC);

CREATE INDEX idx_credit_transactions_action
  ON credit_transactions (action);

CREATE INDEX idx_credit_transactions_job
  ON credit_transactions (job_id)
  WHERE job_id IS NOT NULL;

-- ============================================================================
-- user_daily_limits: lightweight rate limiting counters
-- ============================================================================
CREATE TABLE user_daily_limits (
  user_id UUID,
  action_date DATE,
  ip_address INET,
  user_agent TEXT,
  checkin_count INTEGER NOT NULL DEFAULT 0,
  generation_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, action_date)
);

CREATE INDEX idx_user_daily_limits_date
  ON user_daily_limits (action_date);

CREATE INDEX idx_user_daily_limits_ip_date
  ON user_daily_limits (ip_address, action_date);

-- ============================================================================
-- public_cdn_keys: short-id mapping for public CDN access
-- ============================================================================
CREATE TABLE public_cdn_keys (
  id BIGSERIAL PRIMARY KEY,
  short_id TEXT NOT NULL UNIQUE,
  object_key TEXT NOT NULL,
  content_type TEXT,
  user_id UUID,
  job_id BIGINT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_public_cdn_keys_job ON public_cdn_keys(job_id);
CREATE INDEX idx_public_cdn_keys_user ON public_cdn_keys(user_id);

-- ============================================================================
-- moderation_blocklist: hashed asset blocklist
-- ============================================================================
CREATE TABLE moderation_blocklist (
  id BIGSERIAL PRIMARY KEY,
  hash TEXT NOT NULL UNIQUE,
  hash_algo TEXT NOT NULL DEFAULT 'sha256',
  type TEXT NOT NULL DEFAULT 'image',
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_moderation_blocklist_hash ON moderation_blocklist(hash);

-- ============================================================================
-- system_config: JSON configuration storage
-- ============================================================================
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_config (key, value, description) VALUES
  ('credit_costs', jsonb_build_object('txt2img', 1, 'img2img', 10, 'img2vid', 60), 'Model credit costs'),
  ('credit_rewards', jsonb_build_object('signup_bonus', 5, 'daily_checkin', 0), 'Credit reward settings'),
  ('daily_limits', jsonb_build_object('checkin_max', 3, 'checkin_interval', 4), 'Daily usage limits'),
  ('styles', jsonb_build_array('sweet','elegant','playful','dreamy','modern'), 'Selectable styles');

-- ============================================================================
-- Timestamp trigger helper
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generation_jobs_updated
  BEFORE UPDATE ON generation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_user_credits_updated
  BEFORE UPDATE ON user_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_user_daily_limits_updated
  BEFORE UPDATE ON user_daily_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_system_config_updated
  BEFORE UPDATE ON system_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security policies
-- ============================================================================
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_blocklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY generation_jobs_select_own ON generation_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY generation_jobs_insert_own ON generation_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY generation_jobs_update_own ON generation_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY generation_images_select_own ON generation_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM generation_jobs gj
      WHERE gj.id = generation_images.job_id
        AND gj.user_id = auth.uid()
        AND gj.deleted_at IS NULL
    )
  );

CREATE POLICY user_credits_select_own ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY credit_transactions_select_own ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_daily_limits_select_own ON user_daily_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY moderation_blocklist_read ON moderation_blocklist
  FOR SELECT USING (true);

CREATE POLICY system_config_read ON system_config
  FOR SELECT USING (true);

COMMIT;

-- ============================================================================
-- End of schema
-- ============================================================================
