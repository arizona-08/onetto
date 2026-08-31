import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GoCardlessOAuthService } from './gocardless-oauth.service';

/** Periodically detects OAuth tokens revoked outside of Onetto. */
@Injectable()
export class GoCardlessConnectionHealthService {
  private readonly logger = new Logger(GoCardlessConnectionHealthService.name);

  constructor(private readonly oauth: GoCardlessOAuthService) {}

  @Cron('0 */15 * * * *', { timeZone: 'Europe/Paris' })
  async validateConnections(): Promise<void> {
    const result = await this.oauth.validateAllActiveCompanyAccounts();
    if (result.disconnected > 0) {
      this.logger.warn(
        `${result.disconnected} connexion(s) GoCardless désactivée(s) après contrôle de jeton.`,
      );
    }
  }
}
