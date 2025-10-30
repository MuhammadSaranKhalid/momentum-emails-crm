import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export async function GET() {
  try {
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

    // Get total campaigns executed (status = 'sent')
    const { count: campaignsExecuted, error: campaignsError } = await supabase
      .from('email_campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'sent');

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
    }

    // Get all campaign IDs for this user first
    const { data: userCampaigns, error: campaignsQueryError } = await supabase
      .from('email_campaigns')
      .select('id')
      .eq('user_id', user.id);

    let totalEmailsSent = 0;
    
    if (userCampaigns && userCampaigns.length > 0 && !campaignsQueryError) {
      const campaignIds = userCampaigns.map(c => c.id);
      
      // Count sent emails for these campaigns
      const { count, error: emailsError } = await supabase
        .from('campaign_recipients')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent')
        .in('campaign_id', campaignIds);

      if (emailsError) {
        console.error('Error fetching emails count:', emailsError);
      } else {
        totalEmailsSent = count || 0;
      }
    }

    return NextResponse.json({
      campaignsExecuted: campaignsExecuted || 0,
      emailsSent: totalEmailsSent,
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

