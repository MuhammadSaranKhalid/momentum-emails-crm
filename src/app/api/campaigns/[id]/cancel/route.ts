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

    // Get current user (for authentication)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use RPC function to cancel campaign
    const { data: result, error: rpcError } = await supabase
      .rpc('cancel_campaign', {
        campaign_id_param: campaignId,
      });

    if (rpcError) {
      console.error('Error cancelling campaign:', rpcError);
      return NextResponse.json(
        { error: rpcError.message || 'Failed to cancel campaign' },
        { status: 500 }
      );
    }

    // Check if RPC function returned an error
    if (result && !result.success) {
      return NextResponse.json(
        { error: result.error || 'Campaign not found or access denied' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message || 'Campaign cancelled successfully',
      campaign_id: result.campaign_id || campaignId,
      cancelled_recipients: result.cancelled_recipients || 0,
    });

  } catch (error) {
    console.error('Error cancelling campaign:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

