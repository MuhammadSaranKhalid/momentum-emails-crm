'use client';

import * as React from 'react';
import { Send, Eye, MousePointerClick, UserMinus, Mail, Inbox as InboxIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { formatDistanceToNow } from 'date-fns';

interface Email {
  id: string;
  subject: string;
  from: string;
  fromEmail: string;
  to: string;
  date: string;
  isRead: boolean;
  hasAttachments: boolean;
}

export default function DashboardOverviewPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'inbox' | 'sent'>('inbox');
  const [inboxEmails, setInboxEmails] = React.useState<Email[]>([]);
  const [sentEmails, setSentEmails] = React.useState<Email[]>([]);
  const [isLoadingInbox, setIsLoadingInbox] = React.useState(false);
  const [isLoadingSent, setIsLoadingSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const selectedAccount = useSelector((state: RootState) => state.accounts.selectedAccount);

  const stats = [
    {
      title: 'Emails Sent',
      value: '12,450',
      icon: Send,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: 'Open Rate',
      value: '23.5%',
      icon: Eye,
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600 dark:text-green-500',
    },
    {
      title: 'Click-through',
      value: '4.8%',
      icon: MousePointerClick,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-500',
    },
    {
      title: 'Unsubscribes',
      value: '1.2%',
      icon: UserMinus,
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-600 dark:text-orange-500',
    },
  ];

  // Fetch inbox emails
  const fetchInboxEmails = React.useCallback(async () => {
    if (!selectedAccount?.id) return;
    
    setIsLoadingInbox(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/microsoft/emails?accountId=${selectedAccount.id}&folder=inbox&top=10`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(errorData.message || 'Failed to fetch inbox emails');
      }
      
      const data = await response.json();
      setInboxEmails(data.emails || []);
    } catch (err) {
      console.error('Error fetching inbox emails:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load inbox emails';
      setError(errorMessage);
      setInboxEmails([]);
    } finally {
      setIsLoadingInbox(false);
    }
  }, [selectedAccount?.id]);

  // Fetch sent emails
  const fetchSentEmails = React.useCallback(async () => {
    if (!selectedAccount?.id) return;
    
    setIsLoadingSent(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/microsoft/emails?accountId=${selectedAccount.id}&folder=sentitems&top=10`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(errorData.message || 'Failed to fetch sent emails');
      }
      
      const data = await response.json();
      setSentEmails(data.emails || []);
    } catch (err) {
      console.error('Error fetching sent emails:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sent emails';
      setError(errorMessage);
      setSentEmails([]);
    } finally {
      setIsLoadingSent(false);
    }
  }, [selectedAccount?.id]);

  // Fetch emails when account changes
  React.useEffect(() => {
    if (selectedAccount) {
      fetchInboxEmails();
      fetchSentEmails();
    }
  }, [selectedAccount, fetchInboxEmails, fetchSentEmails]);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  // Filter emails based on search
  const filteredInboxEmails = inboxEmails.filter(
    (email) =>
      email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSentEmails = sentEmails.filter(
    (email) =>
      email.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Header */}
      <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-6 py-3">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <Button asChild>
          <Link href="/dashboard/campaigns/new">
            <Send className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Stats Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Latest Campaign Stats
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.title}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconBg}`}
                        >
                          <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {stat.title}
                          </p>
                          <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <Card>
            <div className="border-b px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('inbox')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${
                      activeTab === 'inbox'
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <InboxIcon className="h-4 w-4" />
                    Inbox
                    {inboxEmails.length > 0 && (
                      <span className="ml-1 text-xs">({inboxEmails.length})</span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('sent')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${
                      activeTab === 'sent'
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Mail className="h-4 w-4" />
                    Sent
                    {sentEmails.length > 0 && (
                      <span className="ml-1 text-xs">({sentEmails.length})</span>
                    )}
                  </button>
                </div>
                <div className="w-64">
                  <Input
                    placeholder="Search emails..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {!selectedAccount && (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Account Selected</h3>
                <p className="text-sm text-muted-foreground">
                  Please connect a Microsoft account to view your emails
                </p>
              </div>
            )}

            {selectedAccount && activeTab === 'inbox' && (
              <div className="overflow-x-auto">
                {isLoadingInbox ? (
                  <div className="flex items-center justify-center p-12">
                    <Spinner className="h-8 w-8" />
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <p className="text-destructive">{error}</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={fetchInboxEmails}
                    >
                      Retry
                    </Button>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="border-b">
                      <tr>
                        <th className="p-4 text-sm font-medium text-muted-foreground">From</th>
                        <th className="p-4 text-sm font-medium text-muted-foreground">Subject</th>
                        <th className="p-4 text-sm font-medium text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInboxEmails.length > 0 ? (
                        filteredInboxEmails.map((email) => (
                          <tr key={email.id} className="border-b hover:bg-accent/50 transition-colors">
                            <td className="p-4 text-sm font-medium">
                              <div className="flex items-center gap-2">
                                {!email.isRead && (
                                  <div className="h-2 w-2 rounded-full bg-primary" />
                                )}
                                {email.from}
                              </div>
                            </td>
                            <td className="p-4 text-sm">
                              <div className="flex items-center gap-2">
                                {email.hasAttachments && (
                                  <span className="text-xs text-muted-foreground">📎</span>
                                )}
                                <span className={!email.isRead ? 'font-semibold' : ''}>
                                  {email.subject}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">
                              {formatDate(email.date)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-muted-foreground">
                            {searchQuery ? 'No emails match your search' : 'No inbox emails'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {selectedAccount && activeTab === 'sent' && (
              <div className="overflow-x-auto">
                {isLoadingSent ? (
                  <div className="flex items-center justify-center p-12">
                    <Spinner className="h-8 w-8" />
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <p className="text-destructive">{error}</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={fetchSentEmails}
                    >
                      Retry
                    </Button>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="border-b">
                      <tr>
                        <th className="p-4 text-sm font-medium text-muted-foreground">To</th>
                        <th className="p-4 text-sm font-medium text-muted-foreground">Subject</th>
                        <th className="p-4 text-sm font-medium text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSentEmails.length > 0 ? (
                        filteredSentEmails.map((email) => (
                          <tr key={email.id} className="border-b hover:bg-accent/50 transition-colors">
                            <td className="p-4 text-sm font-medium">{email.to}</td>
                            <td className="p-4 text-sm">
                              <div className="flex items-center gap-2">
                                {email.hasAttachments && (
                                  <span className="text-xs text-muted-foreground">📎</span>
                                )}
                                {email.subject}
                              </div>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">
                              {formatDate(email.date)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-muted-foreground">
                            {searchQuery ? 'No emails match your search' : 'No sent emails'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}

