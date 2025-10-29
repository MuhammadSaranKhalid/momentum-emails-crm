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

    // Verify user owns the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('id, user_id, status, total_recipients')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Check if campaign can be sent
    if (!['draft', 'scheduled', 'paused'].includes(campaign.status)) {
      return NextResponse.json(
        { error: `Campaign cannot be sent. Current status: ${campaign.status}` },
        { status: 400 }
      );
    }

    // Check if campaign has recipients
    if (campaign.total_recipients === 0) {
      return NextResponse.json(
        { error: 'Campaign has no recipients' },
        { status: 400 }
      );
    }

    // Verify user has a connected Microsoft account
    const { data: userToken, error: tokenError } = await supabase
      .from('user_tokens')
      .select('id, email')
      .eq('user_id', user.id)
      .eq('provider', 'microsoft')
      .limit(1)
      .single();

    if (tokenError || !userToken) {
      return NextResponse.json(
        { error: 'No Microsoft account connected. Please connect an account first.' },
        { status: 400 }
      );
    }

    // Use RPC function to start campaign
    // The database trigger will automatically invoke the edge function
    const { data: result, error: rpcError } = await supabase
      .rpc('send_campaign_emails', {
        campaign_id_param: campaignId,
      });

    if (rpcError) {
      console.error('Error starting campaign:', rpcError);
      return NextResponse.json(
        { error: rpcError.message || 'Failed to start campaign' },
        { status: 500 }
      );
    }

    // Check if RPC function returned an error
    if (result && !result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to start campaign' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message || 'Campaign started successfully',
      campaign_id: result.campaign_id || campaignId,
      total_recipients: result.total_recipients,
      sending_from: userToken.email,
    });

  } catch (error) {
    console.error('Error sending campaign:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

