import { Injectable } from '@nestjs/common';
import { AppNotificationType, Prisma } from '@prisma/client';
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly mail: MailService) {}

  async notifyCompany(input: { companyId: string; type: AppNotificationType; title: string; message: string; href?: string; deduplicationKey: string; metadata?: Prisma.InputJsonValue }) {
    const company = await this.prisma.company.findUnique({
      where: { id: input.companyId },
      select: { owner: { select: { id: true, email: true } }, companyUsers: { where: { role: 'ADMIN', isHidden: false }, select: { user: { select: { id: true, email: true } } } } },
    });
    if (!company) return;
    const recipients = [company.owner, ...company.companyUsers.map(({ user }) => user)]
      .filter((user, index, users) => users.findIndex((candidate) => candidate.id === user.id) === index);
    await Promise.all(recipients.map(async (user) => {
      const notification = await this.prisma.appNotification.upsert({
        where: { userId_deduplicationKey: { userId: user.id, deduplicationKey: input.deduplicationKey } },
        create: { userId: user.id, companyId: input.companyId, type: input.type, title: input.title, message: input.message, href: input.href, deduplicationKey: input.deduplicationKey, metadata: input.metadata },
        update: {},
      });
      if (notification.createdAt.getTime() + 1_000 < Date.now()) return;
      await this.mail.sendMail({ to: user.email, ...this.mail.createAppNotificationMail(input) });
    }));
  }

  listForUser(userId: string) { return this.prisma.appNotification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 }); }
  markRead(userId: string, notificationId: string) { return this.prisma.appNotification.updateMany({ where: { id: notificationId, userId }, data: { readAt: new Date() } }); }
}
