import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth-utils';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[share API] Missing Supabase configuration');
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

function generatePublicId(): string {
  // Generate a random 10-character alphanumeric ID
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const jobId = params.id;
    console.log('[share API] Request for job:', jobId);

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Verify user authentication
    const userId = await getAuthenticatedUserId(req);
    console.log('[share API] Authenticated user:', userId);

    if (!userId) {
      console.warn('[share API] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if job exists and belongs to user
    const { data: job, error: fetchError } = await supabase
      .from('generation_jobs')
      .select('id, public_id, is_public, user_id')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If already has public_id, return it
    if (job.public_id) {
      return NextResponse.json({
        publicId: job.public_id,
        shareUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://girlgenerator.net'}/v/${job.public_id}?source=share`
      });
    }

    // Generate new public_id and update database
    let publicId: string;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      publicId = generatePublicId();

      const { data: updated, error: updateError } = await supabase
        .from('generation_jobs')
        .update({
          public_id: publicId,
          is_public: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('user_id', userId)
        .select('public_id')
        .single();

      if (updateError) {
        // If unique constraint violation, try again with new ID
        if (updateError.code === '23505') {
          attempts++;
          continue;
        }
        throw updateError;
      }

      if (updated) {
        return NextResponse.json({
          publicId: updated.public_id,
          shareUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://girlgenerator.net'}/v/${updated.public_id}?source=share`
        });
      }

      attempts++;
    }

    return NextResponse.json(
      { error: 'Failed to generate unique public ID' },
      { status: 500 }
    );

  } catch (error) {
    console.error('Error generating share link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
