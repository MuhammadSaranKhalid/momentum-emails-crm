import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id;

    // Create Supabase client
    const supabase = await createSupabaseServerClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use RPC function to retry failed recipients
    // The database trigger will automatically invoke the edge function if recipients are queued
    const { data: result, error: rpcError } = await supabase
      .rpc('retry_failed_recipients', {
        campaign_id_param: campaignId,
      });

    if (rpcError) {
      console.error('Error retrying failed recipients:', rpcError);
      return NextResponse.json(
        { error: rpcError.message || 'Failed to retry recipients' },
        { status: 500 }
      );
    }

    // Check if RPC function returned an error
    if (result && !result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to retry recipients' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message || 'Retry initiated successfully',
      recipients_queued: result.recipients_queued || 0,
    });

  } catch (error) {
    console.error('Error retrying campaign:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

