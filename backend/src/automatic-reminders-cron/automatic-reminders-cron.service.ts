import { Injectable, Logger } from "@nestjs/common";
import { AutomaticRemindersService } from "./automatic-reminders.service";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class AutomaticRemindersCron {
  private readonly logger = new Logger(AutomaticRemindersCron.name)

  constructor(
    private readonly automaticRemindersService: AutomaticRemindersService
  ){}

  @Cron(CronExpression.EVERY_DAY_AT_8AM, {
    timeZone: 'Europe/Paris',
  })
  async handleReminders(){
    try{
     this.logger.log("Lancement du traitement des relances automatiques...")
      await this.automaticRemindersService.processReminders()
    } catch (error) {
      this.logger.error("Erreur pendant le traitement des relances automatiques:", error)
    }
  }
}