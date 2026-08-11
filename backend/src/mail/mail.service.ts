import { MailerService } from "@nestjs-modules/mailer";
import { Injectable } from "@nestjs/common";

type MailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
}

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendMail({ to, subject, text, html, attachments }: MailOptions){
    await this.mailerService.sendMail({
      to,
      subject,
      text,
      html,
      attachments,
    })
  }
}
