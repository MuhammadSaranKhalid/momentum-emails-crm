import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export async function GET(
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

    // Fetch campaign with stats
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select(`
        id,
        name,
        subject,
        status,
        total_recipients,
        sent_count,
        delivered_count,
        failed_count,
        bounced_count,
        started_at,
        completed_at,
        created_at
      `)
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Calculate progress
    const progress = campaign.total_recipients > 0
      ? Math.round((campaign.sent_count / campaign.total_recipients) * 100)
      : 0;

    // Calculate delivery rate
    const deliveryRate = campaign.sent_count > 0
      ? Math.round((campaign.delivered_count / campaign.sent_count) * 100)
      : 0;

    // Fetch recent recipient activity
    const { data: recipients, error: recipientsError } = await supabase
      .from('campaign_recipients')
      .select('id, recipient_email, recipient_name, status, sent_at, error_message')
      .eq('campaign_id', campaignId)
      .order('updated_at', { ascending: false })
      .limit(10);

    // Fetch recent events
    const { data: events, error: eventsError } = await supabase
      .from('campaign_events')
      .select('id, event_type, created_at, event_data')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get status breakdown
    const { data: statusBreakdown } = await supabase
      .from('campaign_recipients')
      .select('status')
      .eq('campaign_id', campaignId);

    const statusCounts = statusBreakdown?.reduce((acc: Record<string, number>, r: any) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {}) || {};

    // Calculate estimated completion time
    let estimatedCompletion = null;
    if (campaign.status === 'sending' && campaign.started_at) {
      const elapsed = Date.now() - new Date(campaign.started_at).getTime();
      const rate = campaign.sent_count / (elapsed / 1000); // emails per second
      const remaining = campaign.total_recipients - campaign.sent_count;
      if (rate > 0) {
        const remainingSeconds = remaining / rate;
        estimatedCompletion = new Date(Date.now() + remainingSeconds * 1000).toISOString();
      }
    }

    return NextResponse.json({
      campaign: {
        ...campaign,
        progress,
        delivery_rate: deliveryRate,
        estimated_completion: estimatedCompletion,
      },
      stats: {
        pending: statusCounts.pending || 0,
        sending: statusCounts.sending || 0,
        sent: campaign.sent_count,
        delivered: campaign.delivered_count,
        failed: campaign.failed_count,
        bounced: campaign.bounced_count,
      },
      recent_recipients: recipients || [],
      recent_events: events || [],
    });

  } catch (error) {
    console.error('Error fetching campaign status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

