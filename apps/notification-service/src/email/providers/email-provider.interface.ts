export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

export abstract class EmailProvider {
  abstract send(options: SendEmailOptions): Promise<void>;
  abstract getName(): string;
}
