import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { ImapFlow } from 'imapflow';

/**
 * Parse email address from various formats
 */
function parseEmailAddress(address: unknown): { name: string; email: string } {
  if (!address) {
    return { name: 'Unknown', email: '' };
  }

  if (Array.isArray(address)) {
    address = address[0];
  }

  if (typeof address === 'object' && address !== null) {
    const addressObj = address as { address?: string; name?: string };
    if (addressObj.address) {
      return {
        name: addressObj.name || addressObj.address,
        email: addressObj.address,
      };
    }
  }

  if (typeof address === 'string') {
    const emailMatch = address.match(/<([^>]+)>/);
    const email = emailMatch ? emailMatch[1] : address;
    const name = address.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || email;
    return { name, email };
  }

  return { name: 'Unknown', email: '' };
}

/**
 * Check if email has attachments
 */
function checkForAttachments(bodyStructure: unknown): boolean {
  if (!bodyStructure || typeof bodyStructure !== 'object') return false;

  const structure = bodyStructure as Record<string, unknown>;

  if (Array.isArray(bodyStructure)) {
    return bodyStructure.some((part: unknown) => {
      if (typeof part === 'object' && part !== null) {
        const partObj = part as Record<string, unknown>;
        if (partObj.disposition === 'attachment') return true;
      }
      return checkForAttachments(part);
    });
  }

  if (structure.disposition === 'attachment') return true;

  if (structure.childNodes && Array.isArray(structure.childNodes)) {
    return structure.childNodes.some((child: unknown) => checkForAttachments(child));
  }

  return false;
}

/**
 * Fetch IMAP emails
 */
export async function GET(req: NextRequest) {
  let client: ImapFlow | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'User not authenticated' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const folder = searchParams.get('folder') || 'INBOX';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!accountId) {
      return NextResponse.json({ message: 'Account ID is required' }, { status: 400 });
    }

    // Fetch the user's IMAP credentials from the database
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .eq('provider', 'imap')
      .single();

    if (tokenError || !tokenData) {
      console.error('No IMAP account found:', tokenError);
      return NextResponse.json({ message: 'IMAP account not found' }, { status: 404 });
    }

    // Validate IMAP configuration
    if (!tokenData.imap_host || !tokenData.imap_username || !tokenData.imap_password) {
      return NextResponse.json(
        { message: 'Incomplete IMAP configuration' },
        { status: 400 }
      );
    }

    console.log(`Connecting to IMAP: ${tokenData.imap_host}:${tokenData.imap_port || 993}`);

    // Create ImapFlow client
    client = new ImapFlow({
      host: tokenData.imap_host,
      port: tokenData.imap_port || 993,
      secure: tokenData.imap_secure !== false,
      auth: {
        user: tokenData.imap_username,
        pass: tokenData.imap_password,
      },
      logger: false,
    });

    // Connect to the server
    await client.connect();
    console.log('Connected to IMAP server');

    // List available mailboxes for debugging
    try {
      const list = await client.list();
      console.log('Available mailboxes:', list.map((box: { path: string }) => box.path).join(', '));
    } catch (listErr) {
      console.warn('Could not list mailboxes:', listErr);
    }

    // Try to find the correct folder name
    let actualFolder = folder;
    if (folder.toLowerCase() === 'sent') {
      // Try common sent folder names
      const sentFolders = ['Sent', 'Sent Items', 'Sent Mail', '[Gmail]/Sent Mail'];
      for (const tryFolder of sentFolders) {
        try {
          const testLock = await client.getMailboxLock(tryFolder);
          testLock.release();
          actualFolder = tryFolder;
          console.log(`Found sent folder: ${tryFolder}`);
          break;
        } catch {
          // Folder doesn't exist, continue trying
          continue;
        }
      }
    }

    // Open the mailbox
    let lock;
    try {
      lock = await client.getMailboxLock(actualFolder);
      console.log(`Opened folder: ${actualFolder}`);
      
      const mailbox = client.mailbox;
      const totalMessages = mailbox && typeof mailbox === 'object' && 'exists' in mailbox 
        ? (mailbox.exists as number) 
        : 0;
      
      console.log(`Total messages: ${totalMessages}`);
      if (totalMessages === 0) {
        return NextResponse.json({
          emails: [],
          count: 0,
        });
      }

      // Calculate sequence range for last N messages
      const start = Math.max(1, totalMessages - limit + 1);
      const end = totalMessages;

      console.log(`Fetching messages ${start}:${end}`);

      // Fetch messages with envelope and flags
      const messages = [];
      for await (const message of client.fetch(`${start}:${end}`, {
        envelope: true,
        flags: true,
        bodyStructure: true,
        source: false,
      })) {
        messages.push(message);
      }

      // Parse messages into Email format
      const emails = messages.map((msg) => {
        const envelope = (msg.envelope || {}) as Record<string, unknown>;
        const flags = msg.flags || new Set();

        const fromAddress = parseEmailAddress(envelope.from);
        const toAddress = parseEmailAddress(envelope.to);
        const hasAttachments = msg.bodyStructure
          ? checkForAttachments(msg.bodyStructure)
          : false;

        return {
          id: `imap-${msg.seq}`,
          subject: (envelope.subject as string) || '(No Subject)',
          from: fromAddress.name,
          fromEmail: fromAddress.email,
          to: toAddress.email,
          date: envelope.date
            ? new Date(envelope.date as string).toISOString()
            : new Date().toISOString(),
          isRead: flags.has('\\Seen'),
          hasAttachments: hasAttachments,
        };
      });

      console.log(`Successfully fetched ${emails.length} emails`);

      // Sort by date descending (newest first)
      const sortedEmails = emails.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      return NextResponse.json({
        emails: sortedEmails,
        count: sortedEmails.length,
      });
    } finally {
      if (lock) {
        lock.release();
      }
    }
  } catch (error) {
    console.error('Error fetching IMAP emails:', error);
    
    let errorMessage = 'An unknown error occurred';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Provide more specific error messages
      if (error.message.includes('AUTHENTICATIONFAILED')) {
        errorMessage = 'Authentication failed. Please check your IMAP username and password.';
        errorDetails = 'Make sure you are using an App Password if your email provider requires it (e.g., Gmail).';
      } else if (error.message.includes('Command failed')) {
        errorMessage = 'IMAP command failed. The mailbox folder might not exist.';
        errorDetails = 'Try checking your mailbox settings or use INBOX instead.';
      } else if (error.message.includes('Mailbox does not exist')) {
        errorMessage = 'The specified mailbox folder does not exist.';
        errorDetails = 'Available folders vary by email provider. Try INBOX or check your email client for folder names.';
      } else if (error.message.includes('Connection timeout')) {
        errorMessage = 'Connection timeout. Please check your IMAP host and port settings.';
      }
    }
    
    return NextResponse.json(
      {
        message: 'Failed to fetch IMAP emails',
        error: errorMessage,
        details: errorDetails,
        originalError: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      try {
        await client.logout();
        console.log('Logged out from IMAP server');
      } catch (err) {
        console.error('Error during logout:', err);
      }
    }
  }
}

