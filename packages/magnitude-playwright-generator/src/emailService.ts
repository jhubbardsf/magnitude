import { GetInboxRequest, GetMessageRequest, MailinatorClient, Sort } from 'mailinator-client';

interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  fromfull: string;
  to: string;
  time: number;
  seconds_ago: number;
  parts?: EmailPart[];
  headers?: Record<string, string>;
}

interface EmailPart {
  headers: Record<string, string>;
  body: string;
}

export interface EmailServiceConfig {
  provider: 'mailinator';
  apiKey: string;
  domain: string;  // e.g., @team337632.testinator.com
}

export class EmailService {
  private client: MailinatorClient;
  private domain: string;

  constructor(config: EmailServiceConfig) {
    if (config.provider !== 'mailinator') {
      throw new Error(`Unsupported email provider: ${config.provider}`);
    }

    this.client = new MailinatorClient(config.apiKey);
    this.domain = config.domain.startsWith('@') ? config.domain : `@${config.domain}`;
  }

  /**
   * Generate a test email address
   */
  generateEmail(prefix: string = 'test'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${prefix}-${timestamp}-${random}${this.domain}`;
  }

  /**
   * Get inbox name from email address
   */
  private getInboxFromEmail(email: string): string {
    return email.split('@')[0];
  }

  /**
   * Wait for a new email to arrive in the inbox
   */
  async waitForEmail(
    email: string,
    options: {
      timeout?: number;
      pollInterval?: number;
      fromSender?: string;
      subjectContains?: string;
    } = {}
  ): Promise<EmailMessage | null> {
    const timeout = options.timeout || 30000;
    const pollInterval = options.pollInterval || 2000;
    const startTime = Date.now();
    const inbox = this.getInboxFromEmail(email);

    console.log(`📧 Waiting for email in: ${inbox}`);

    while (Date.now() - startTime < timeout) {
      try {
        const newEmails = await this.getNewEmails(inbox, startTime);

        // Filter by sender if specified
        let filteredEmails = newEmails;
        if (options.fromSender) {
          filteredEmails = filteredEmails.filter(
            (msg) =>
              msg.from.toLowerCase().includes(options.fromSender!.toLowerCase()) ||
              msg.fromfull.toLowerCase().includes(options.fromSender!.toLowerCase())
          );
        }

        // Filter by subject if specified
        if (options.subjectContains) {
          filteredEmails = filteredEmails.filter((msg) =>
            msg.subject.toLowerCase().includes(options.subjectContains!.toLowerCase())
          );
        }

        if (filteredEmails.length > 0) {
          console.log(`✓ Email received: ${filteredEmails[0].subject}`);
          return filteredEmails[0];
        }

        await this.sleep(pollInterval);
      } catch (error) {
        console.warn(`Error checking email:`, error);
        await this.sleep(pollInterval);
      }
    }

    console.log(`⚠ No email received within ${timeout}ms`);
    return null;
  }

  /**
   * Extract verification code from email content
   */
  async extractVerificationCode(
    email: EmailMessage,
    pattern?: RegExp
  ): Promise<string | null> {
    // Default pattern: 6 digits, or 4-4-4-4 format, or common OTP formats
    const defaultPattern = /\b\d{6}\b|\b\d{4}-\d{4}-\d{4}-\d{4}\b|\b\d{4}\s\d{4}\b/g;
    const codePattern = pattern || defaultPattern;

    try {
      // Check subject first
      const subjectMatch = email.subject.match(codePattern);
      if (subjectMatch) {
        return subjectMatch[0];
      }

      // Get full message content
      const fullMessage = await this.getMessage(email.id);

      if (fullMessage.parts && fullMessage.parts.length > 0) {
        const textContent = this.extractTextContent(fullMessage.parts);
        const bodyMatch = textContent.match(codePattern);

        if (bodyMatch) {
          return bodyMatch[0];
        }
      }

      return null;
    } catch (error) {
      console.error(`Error extracting verification code:`, error);
      return null;
    }
  }

  /**
   * Extract links from email content
   */
  async extractLinks(email: EmailMessage): Promise<string[]> {
    try {
      const fullMessage = await this.getMessage(email.id);

      if (!fullMessage.parts) {
        return [];
      }

      const textContent = this.extractTextContent(fullMessage.parts);
      const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
      const matches = textContent.match(urlRegex);

      return matches || [];
    } catch (error) {
      console.error(`Error extracting links:`, error);
      return [];
    }
  }

  // Private helper methods

  private async getNewEmails(inbox: string, sinceTimestamp: number): Promise<EmailMessage[]> {
    const request = new GetInboxRequest('private', inbox, 0, 50, 'descending' as Sort, false);
    const response = await this.client.request(request);

    if (!response.result || !response.result.msgs) {
      return [];
    }

    return response.result.msgs.filter((msg) => msg.time > sinceTimestamp);
  }

  private async getMessage(messageId: string): Promise<EmailMessage> {
    const request = new GetMessageRequest('private', messageId);
    const response = await this.client.request(request);

    if (!response.result) {
      throw new Error(`Message not found: ${messageId}`);
    }

    return response.result as EmailMessage;
  }

  private extractTextContent(emailParts: EmailPart[]): string {
    if (!emailParts || emailParts.length === 0) {
      return '';
    }

    const textParts = emailParts.filter(
      (part) =>
        part.headers['content-type']?.includes('text/plain') ||
        part.headers['content-type']?.includes('text/html')
    );

    return textParts.map((part) => part.body).join('\n');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
