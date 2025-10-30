'use client';

import * as React from 'react';
import { Authenticated } from '@refinedev/core';
import { V2Sidebar } from '@/components/v2/sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Authenticated key="dashboard-layout" redirectOnFail="/login">
      <SidebarProvider>
        <div className="flex h-screen w-full bg-background">
          <V2Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </div>
      </SidebarProvider>
    </Authenticated>
  );
}

