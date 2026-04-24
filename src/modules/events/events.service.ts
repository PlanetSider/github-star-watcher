import type { PrismaClient, RepoEventType } from '@prisma/client';

type CreateEventInput = {
  repoId: string;
  eventType: RepoEventType;
  fingerprint: string;
  title: string;
  link: string | null;
  payloadJson: string | null;
};

export class EventsService {
  constructor(private readonly prisma: PrismaClient) {}

  async createMany(events: CreateEventInput[]) {
    const created: Awaited<ReturnType<PrismaClient['repoEvent']['create']>>[] = [];

    for (const event of events) {
      const existing = await this.prisma.repoEvent.findUnique({
        where: { fingerprint: event.fingerprint },
      });

      if (existing) {
        continue;
      }

      const saved = await this.prisma.repoEvent.create({ data: event });
      created.push(saved);
    }

    return created;
  }

  async listEvents(input: {
    page: number;
    pageSize: number;
    eventType?: RepoEventType;
    repoId?: string;
  }) {
    const where = {
      ...(input.eventType ? { eventType: input.eventType } : {}),
      ...(input.repoId ? { repoId: input.repoId } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.repoEvent.count({ where }),
      this.prisma.repoEvent.findMany({
        where,
        include: { repo: true },
        orderBy: { detectedAt: 'desc' },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
    ]);

    return {
      total,
      items: items.map((event) => ({
        id: event.id,
        repoId: event.repoId,
        fullName: event.repo.fullName,
        eventType: event.eventType,
        title: event.title,
        link: event.link,
        payload: this.parsePayload(event.payloadJson),
        detectedAt: event.detectedAt.toISOString(),
        serverchanNotifiedAt: event.serverchanNotifiedAt?.toISOString() ?? null,
      })),
    };
  }

  async getRecentEvents(limit: number, eventType?: RepoEventType) {
    return this.prisma.repoEvent.findMany({
      where: eventType ? { eventType } : undefined,
      include: { repo: true },
      orderBy: { detectedAt: 'desc' },
      take: limit,
    });
  }

  async markNotified(eventIds: number[]): Promise<void> {
    if (eventIds.length === 0) {
      return;
    }

    await this.prisma.repoEvent.updateMany({
      where: { id: { in: eventIds } },
      data: { serverchanNotifiedAt: new Date() },
    });
  }

  private parsePayload(payloadJson: string | null): unknown {
    if (!payloadJson) {
      return null;
    }

    try {
      return JSON.parse(payloadJson);
    } catch {
      return {
        raw: payloadJson,
      };
    }
  }
}
