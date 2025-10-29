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

    // Use RPC function to pause campaign
    const { data: result, error: rpcError } = await supabase
      .rpc('pause_campaign', {
        campaign_id_param: campaignId,
      });

    if (rpcError) {
      console.error('Error pausing campaign:', rpcError);
      return NextResponse.json(
        { error: rpcError.message || 'Failed to pause campaign' },
        { status: 500 }
      );
    }

    // Check if RPC function returned an error
    if (result && !result.success) {
      return NextResponse.json(
        { error: result.error || 'Campaign not found or cannot be paused' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message || 'Campaign paused successfully',
      campaign_id: result.campaign_id || campaignId,
    });

  } catch (error) {
    console.error('Error pausing campaign:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

