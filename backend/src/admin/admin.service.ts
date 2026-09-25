import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [users, owners, employees, activeCompanies, subscriptions, failedPayments, recentUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { accountType: 'BUSINESS_OWNER' } }),
      this.prisma.user.count({ where: { accountType: 'EMPLOYEE' } }),
      this.prisma.company.count({ where: { status: 'ACTIVE' } }),
      this.prisma.userSubscription.groupBy({ by: ['subscriptionPlan'], _count: true }),
      this.prisma.payByBankPayment.count({ where: { status: 'FAILED' } }),
      this.prisma.user.findMany({ select: { id: true, firstname: true, lastname: true, email: true }, orderBy: { id: 'desc' }, take: 8 }),
    ]);
    return { users, owners, employees, activeCompanies, subscriptions, failedPayments, recentUsers };
  }

  async users(page = 1, query = '') {
    const where = query ? { OR: [{ email: { contains: query, mode: 'insensitive' as const } }, { firstname: { contains: query, mode: 'insensitive' as const } }, { lastname: { contains: query, mode: 'insensitive' as const } }] } : {};
    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({ where, select: { id: true, firstname: true, lastname: true, email: true, accountType: true, isAdmin: true, subscription: { select: { subscriptionPlan: true, isActive: true } }, _count: { select: { ownedCompanies: true } } }, orderBy: { email: 'asc' }, skip: (page - 1) * 25, take: 25 }),
    ]);
    return { items, pagination: { page, pageSize: 25, total, totalPages: Math.max(1, Math.ceil(total / 25)) } };
  }
}
