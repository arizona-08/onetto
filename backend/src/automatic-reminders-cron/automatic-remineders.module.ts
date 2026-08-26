import { Module } from '@nestjs/common';
import { MailModule } from 'src/mail/mail.module';
import { PlanAccessModule } from 'src/plan-access/plan-access.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AutomaticRemindersService } from './automatic-reminders.service';
import { AutomaticRemindersCron } from './automatic-reminders-cron.service';
import { EstimateReminderNegotiationService } from './estimate-reminder-negotiation.service';

@Module({
  imports: [PrismaModule, MailModule, PlanAccessModule],
  providers: [
    AutomaticRemindersService,
    AutomaticRemindersCron,
    EstimateReminderNegotiationService,
  ],
})
export class AutomaticRemindersModule {}
