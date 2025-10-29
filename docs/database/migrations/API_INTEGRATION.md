# API Integration Guide

This guide shows how to integrate the email campaign trigger system with your Next.js frontend.

## Overview

The database trigger automatically invokes the edge function when a campaign status changes to "sending". You can trigger this through:

1. **Database Functions** (Recommended): Use the helper functions via Supabase RPC
2. **Direct Status Update**: Update campaign status directly
3. **API Routes**: Use Next.js API routes that call the database functions

## Method 1: Using Supabase RPC (Recommended)

### Send Campaign

```typescript
// src/app/api/campaigns/[id]/send/route.ts
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient();
  const campaignId = params.id;

  try {
    // Call the database function via RPC
    const { data, error } = await supabase
      .rpc('send_campaign_emails', {
        campaign_id_param: campaignId
      });

    if (error) {
      return NextResponse.json(
        { message: 'Failed to start campaign', error: error.message },
        { status: 500 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        { message: data.error || 'Failed to start campaign' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Campaign started successfully',
      campaign_id: data.campaign_id,
      total_recipients: data.total_recipients
    });

  } catch (error) {
    console.error('Error starting campaign:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Pause Campaign

```typescript
// src/app/api/campaigns/[id]/pause/route.ts
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .rpc('pause_campaign', {
      campaign_id_param: params.id
    });

  if (error || !data.success) {
    return NextResponse.json(
      { message: data?.error || error?.message || 'Failed to pause campaign' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    message: 'Campaign paused successfully',
    campaign_id: data.campaign_id
  });
}
```

### Retry Failed Recipients

```typescript
// src/app/api/campaigns/[id]/retry/route.ts
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .rpc('retry_failed_recipients', {
      campaign_id_param: params.id
    });

  if (error || !data.success) {
    return NextResponse.json(
      { message: data?.error || error?.message || 'Failed to retry recipients' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    message: data.message,
    recipients_queued: data.recipients_queued
  });
}
```

### Cancel Campaign

```typescript
// src/app/api/campaigns/[id]/cancel/route.ts
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .rpc('cancel_campaign', {
      campaign_id_param: params.id
    });

  if (error || !data.success) {
    return NextResponse.json(
      { message: data?.error || error?.message || 'Failed to cancel campaign' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    message: 'Campaign cancelled successfully',
    campaign_id: data.campaign_id,
    cancelled_recipients: data.cancelled_recipients
  });
}
```

### Get Campaign Progress

```typescript
// src/app/api/campaigns/[id]/status/route.ts
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .rpc('get_campaign_progress', {
      campaign_id_param: params.id
    });

  if (error || !data.success) {
    return NextResponse.json(
      { message: data?.error || error?.message || 'Failed to get campaign progress' },
      { status: 400 }
    );
  }

  return NextResponse.json(data);
}
```

## Method 2: Direct Status Update

You can also update the campaign status directly, which will trigger the worker:

```typescript
// Simple status update that triggers the worker
const { error } = await supabase
  .from('email_campaigns')
  .update({ status: 'sending' })
  .eq('id', campaignId)
  .eq('user_id', user.id);

if (error) {
  console.error('Failed to start campaign:', error);
}
```

## Frontend Integration

### React Hook for Campaign Management

```typescript
// hooks/use-campaign-actions.ts
import { useState } from 'react';
import { toast } from 'sonner';

export function useCampaignActions() {
  const [isLoading, setIsLoading] = useState(false);

  const sendCampaign = async (campaignId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to start campaign');
      }

      toast.success('Campaign started successfully', {
        description: `Sending to ${data.total_recipients} recipients`
      });

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start campaign';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const pauseCampaign = async (campaignId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/pause`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to pause campaign');
      }

      toast.success('Campaign paused successfully');
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to pause campaign';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const retryCampaign = async (campaignId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/retry`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to retry campaign');
      }

      toast.success(data.message || 'Retrying failed recipients');
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to retry campaign';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelCampaign = async (campaignId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/cancel`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel campaign');
      }

      toast.success('Campaign cancelled successfully');
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel campaign';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getCampaignProgress = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/status`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get campaign status');
      }

      return data;
    } catch (error) {
      console.error('Error fetching campaign progress:', error);
      return null;
    }
  };

  return {
    sendCampaign,
    pauseCampaign,
    retryCampaign,
    cancelCampaign,
    getCampaignProgress,
    isLoading,
  };
}
```

### Usage in Components

```typescript
// components/campaigns/campaign-actions.tsx
'use client';

import { useCampaignActions } from '@/hooks/use-campaign-actions';
import { Button } from '@/components/ui/button';

interface CampaignActionsProps {
  campaignId: string;
  status: string;
}

export function CampaignActions({ campaignId, status }: CampaignActionsProps) {
  const { sendCampaign, pauseCampaign, retryCampaign, cancelCampaign, isLoading } = useCampaignActions();

  return (
    <div className="flex gap-2">
      {status === 'draft' && (
        <Button
          onClick={() => sendCampaign(campaignId)}
          disabled={isLoading}
        >
          Send Campaign
        </Button>
      )}

      {status === 'sending' && (
        <Button
          variant="outline"
          onClick={() => pauseCampaign(campaignId)}
          disabled={isLoading}
        >
          Pause
        </Button>
      )}

      {status === 'paused' && (
        <>
          <Button
            onClick={() => sendCampaign(campaignId)}
            disabled={isLoading}
          >
            Resume
          </Button>
          <Button
            variant="outline"
            onClick={() => cancelCampaign(campaignId)}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </>
      )}

      {(status === 'sent' || status === 'paused') && (
        <Button
          variant="outline"
          onClick={() => retryCampaign(campaignId)}
          disabled={isLoading}
        >
          Retry Failed
        </Button>
      )}
    </div>
  );
}
```

### Real-time Progress Monitoring

```typescript
// hooks/use-campaign-progress.ts
import { useEffect, useState } from 'react';
import { useCampaignActions } from './use-campaign-actions';

export function useCampaignProgress(campaignId: string, enabled: boolean = true) {
  const [progress, setProgress] = useState<any>(null);
  const { getCampaignProgress } = useCampaignActions();

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    getCampaignProgress(campaignId).then(setProgress);

    // Poll every 5 seconds while campaign is sending
    const interval = setInterval(async () => {
      const data = await getCampaignProgress(campaignId);
      setProgress(data);

      // Stop polling if campaign is complete
      if (data && !['sending', 'scheduled'].includes(data.status)) {
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [campaignId, enabled]);

  return progress;
}
```

### Progress Display Component

```typescript
// components/campaigns/campaign-progress.tsx
'use client';

import { useCampaignProgress } from '@/hooks/use-campaign-progress';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CampaignProgressProps {
  campaignId: string;
}

export function CampaignProgress({ campaignId }: CampaignProgressProps) {
  const progress = useCampaignProgress(campaignId, true);

  if (!progress || !progress.success) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {progress.sent_count} of {progress.total_recipients} sent
            </span>
            <span className="text-sm font-medium">
              {progress.progress_percent}%
            </span>
          </div>
          <Progress value={progress.progress_percent} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Sent</div>
            <div className="text-2xl font-bold">{progress.sent_count}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Delivered</div>
            <div className="text-2xl font-bold text-green-600">
              {progress.delivered_count}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Failed</div>
            <div className="text-2xl font-bold text-red-600">
              {progress.failed_count}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">
              {progress.pending_count}
            </div>
          </div>
        </div>

        {progress.status_breakdown && (
          <div className="text-xs text-muted-foreground">
            Status breakdown: {JSON.stringify(progress.status_breakdown, null, 2)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

## Testing

### Test Campaign Flow

```typescript
// Example test flow
async function testCampaignFlow() {
  const campaignId = 'your-test-campaign-id';

  // 1. Start campaign
  console.log('Starting campaign...');
  await fetch(`/api/campaigns/${campaignId}/send`, { method: 'POST' });

  // 2. Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 3. Check progress
  const statusRes = await fetch(`/api/campaigns/${campaignId}/status`);
  const status = await statusRes.json();
  console.log('Progress:', status);

  // 4. Pause campaign (optional)
  // await fetch(`/api/campaigns/${campaignId}/pause`, { method: 'POST' });

  // 5. Resume (optional)
  // await fetch(`/api/campaigns/${campaignId}/send`, { method: 'POST' });
}
```

## Error Handling

The database functions return structured error responses:

```typescript
interface ErrorResponse {
  success: false;
  error: string;
}

interface SuccessResponse {
  success: true;
  message: string;
  // ... additional data
}
```

Always check the `success` field in responses:

```typescript
const { data, error } = await supabase.rpc('send_campaign_emails', {
  campaign_id_param: campaignId
});

if (error) {
  // Supabase error (network, permissions, etc.)
  console.error('Supabase error:', error);
}

if (data && !data.success) {
  // Business logic error (no recipients, wrong status, etc.)
  console.error('Campaign error:', data.error);
}
```

## Summary

- ✅ Use RPC calls to database functions for campaign management
- ✅ The trigger automatically invokes the edge function
- ✅ No manual edge function invocation needed
- ✅ Real-time progress monitoring via polling
- ✅ Proper error handling and user feedback
- ✅ Status-based UI actions

