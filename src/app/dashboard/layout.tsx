'use client';

import * as React from 'react';
import { Authenticated } from '@refinedev/core';
import { V2Sidebar } from '@/components/v2/sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Authenticated key="dashboard-layout" redirectOnFail="/login">
      <SidebarProvider>
        <V2Sidebar />
        <SidebarInset>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </Authenticated>
  );
}

