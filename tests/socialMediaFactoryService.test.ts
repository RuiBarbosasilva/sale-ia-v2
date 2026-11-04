const mockPrisma = {
  socialPost: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  socialPublishLog: {
    create: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('../src/modules/social-media-factory/social-media-factory.publisher', () => ({
  checkSocialPostProcessing: jest.fn(),
  publishSocialPost: jest.fn(),
}));

import { markStalePublishingPostsAsUnconfirmed } from '../src/modules/social-media-factory/social-media-factory.service';

describe('Social Media Factory interrupted publication recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks only still-stale PUBLISHING posts as DELIVERY_UNKNOWN and logs manual verification', async () => {
    mockPrisma.socialPost.findMany.mockResolvedValue([
      { id: 'post-stale', platform: 'FACEBOOK' },
      { id: 'post-raced', platform: 'INSTAGRAM' },
    ]);
    mockPrisma.socialPost.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    mockPrisma.socialPublishLog.create.mockResolvedValue({});

    const changed = await markStalePublishingPostsAsUnconfirmed(30, 100);

    expect(changed).toBe(1);
    expect(mockPrisma.socialPost.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'PUBLISHING', updatedAt: { lte: expect.any(Date) } },
      orderBy: { updatedAt: 'asc' },
      take: 100,
    }));
    expect(mockPrisma.socialPost.updateMany).toHaveBeenCalledTimes(2);
    expect(mockPrisma.socialPost.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'post-stale', status: 'PUBLISHING', updatedAt: { lte: expect.any(Date) } },
      data: expect.objectContaining({
        status: 'DELIVERY_UNKNOWN',
        lastError: expect.stringContaining('Verifique a conta de destino'),
      }),
    }));
    expect(mockPrisma.socialPublishLog.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.socialPublishLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        postId: 'post-stale',
        platform: 'FACEBOOK',
        outcome: 'DELIVERY_UNKNOWN',
        message: expect.stringContaining('reenvio automático bloqueado'),
      }),
    });
  });

  it('does not create log entries when no abandoned publication exists', async () => {
    mockPrisma.socialPost.findMany.mockResolvedValue([]);

    await expect(markStalePublishingPostsAsUnconfirmed()).resolves.toBe(0);

    expect(mockPrisma.socialPost.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.socialPublishLog.create).not.toHaveBeenCalled();
  });

  it('clamps unsafe recovery settings to safe bounds', async () => {
    mockPrisma.socialPost.findMany.mockResolvedValue([]);

    await markStalePublishingPostsAsUnconfirmed(Number.NaN, 10000);

    expect(mockPrisma.socialPost.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 500 }));
  });
});
