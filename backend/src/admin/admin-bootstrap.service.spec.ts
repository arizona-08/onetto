import { AdminBootstrapService } from './admin-bootstrap.service';

jest.mock('argon2', () => ({
  __esModule: true,
  default: { hash: jest.fn().mockResolvedValue('hashed-password') },
}));

describe('AdminBootstrapService', () => {
  const config = {
    get: jest.fn((key: string) =>
      key === 'ADMIN_EMAIL' ? 'admin@test.com' : 'test123456',
    ),
  };
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userSubscription: { create: jest.fn() },
    $transaction: jest.fn(async (callback) => callback(prisma)),
  };
  const service = new AdminBootstrapService(config as never, prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('crée un administrateur et son abonnement Free lorsque le compte est absent', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'admin-1' });

    await service.onApplicationBootstrap();

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'admin@test.com',
        appUserRole: 'SUPERADMIN',
        subscriptionPlan: 'FREE',
      }),
    });
    expect(prisma.userSubscription.create).toHaveBeenCalledWith({
      data: {
        userId: 'admin-1',
        subscriptionPlan: 'FREE',
        isActive: true,
      },
    });
  });

  it('ne recrée pas un administrateur déjà existant', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      appUserRole: 'SUPERADMIN',
    });

    await service.onApplicationBootstrap();

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('ne promeut pas automatiquement un compte existant', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      appUserRole: 'USER',
    });

    await service.onApplicationBootstrap();

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
