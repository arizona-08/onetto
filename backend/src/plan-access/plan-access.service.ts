import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export type PlanFeature =
  | 'negotiation'
  | 'instalments'
  | 'advancedAnalytics'
  | 'automaticReminders'
  | 'cashflowForecast';

export type OnettoPlan = 'FREE' | 'STARTER' | 'PRO';

export const PLAN_ACCESS: Record<
  OnettoPlan,
  { features: Record<PlanFeature, boolean>; maxOwnedCompanies: number }
> = {
  FREE: {
    features: {
      negotiation: false,
      instalments: false,
      advancedAnalytics: false,
      automaticReminders: false,
      cashflowForecast: false,
    },
    maxOwnedCompanies: 1,
  },
  STARTER: {
    features: {
      negotiation: true,
      instalments: false,
      advancedAnalytics: false,
      automaticReminders: true,
      cashflowForecast: false,
    },
    maxOwnedCompanies: 1,
  },
  PRO: {
    features: {
      negotiation: true,
      instalments: true,
      advancedAnalytics: true,
      automaticReminders: true,
      cashflowForecast: true,
    },
    maxOwnedCompanies: 3,
  },
};

const FEATURE_LABELS: Record<PlanFeature, string> = {
  negotiation: 'La négociation de devis est disponible avec Onetto Starter.',
  instalments: 'Le paiement en plusieurs fois requiert Onetto Pro.',
  advancedAnalytics: 'Les analytics avancées sont disponibles avec Onetto Pro.',
  automaticReminders:
    'Les relances automatiques sont disponibles avec Onetto Starter.',
  cashflowForecast:
    'Les prévisions d’encaissement sont disponibles avec Onetto Pro.',
};

@Injectable()
export class PlanAccessService {
  constructor(private readonly prismaService: PrismaService) {}

  normalizePlan(plan?: $Enums.SubscriptionPlan | null): OnettoPlan {
    if (plan === 'STARTER_MONTHLY' || plan === 'STARTER_YEARLY')
      return 'STARTER';
    if (plan === 'PRO_MONTHLY' || plan === 'PRO_YEARLY') return 'PRO';
    return 'FREE';
  }

  getAccess(plan?: $Enums.SubscriptionPlan | null) {
    const currentPlan = this.normalizePlan(plan);
    return { currentPlan, ...PLAN_ACCESS[currentPlan] };
  }

  async getUserAccess(userId: string, requireBusinessOwner = true) {
    const user = await this.prismaService.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        accountType: true,
        subscription: { select: { subscriptionPlan: true, isActive: true } },
      },
    });

    if (requireBusinessOwner && user.accountType !== 'BUSINESS_OWNER') {
      throw new ForbiddenException(
        'Seul le propriétaire du compte peut gérer un abonnement.',
      );
    }

    return this.getAccess(
      user.subscription?.isActive ? user.subscription.subscriptionPlan : 'FREE',
    );
  }

  async getCompanyAccess(companyId: string) {
    const company = await this.prismaService.company.findUniqueOrThrow({
      where: { id: companyId },
      select: {
        owner: {
          select: {
            subscription: {
              select: { subscriptionPlan: true, isActive: true },
            },
          },
        },
      },
    });

    return this.getAccess(
      company.owner.subscription?.isActive
        ? company.owner.subscription.subscriptionPlan
        : 'FREE',
    );
  }

  async assertFeatureAvailable(companyId: string, feature: PlanFeature) {
    const access = await this.getCompanyAccess(companyId);
    if (!access.features[feature]) {
      throw new ForbiddenException(FEATURE_LABELS[feature]);
    }
    return access;
  }

  async assertCanCreateCompany(userId: string) {
    const access = await this.getUserAccess(userId);
    const ownedCompanies = await this.prismaService.company.count({
      where: { ownerId: userId },
    });

    if (ownedCompanies >= access.maxOwnedCompanies) {
      throw new BadRequestException(
        `Votre formule ${access.currentPlan} permet de posséder au maximum ${access.maxOwnedCompanies} entreprise${access.maxOwnedCompanies > 1 ? 's' : ''}.`,
      );
    }

    return access;
  }
}
