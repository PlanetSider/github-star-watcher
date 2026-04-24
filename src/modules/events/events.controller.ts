import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EventsService } from './events.service';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  eventType: z.enum(['code_updated', 'release_published']).optional(),
  repoId: z.string().optional(),
});

export async function registerEventsRoutes(app: FastifyInstance): Promise<void> {
  const eventsService = new EventsService(app.prisma);

  app.get('/events', async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Request validation failed',
          details: parsed.error.flatten(),
        },
      });
    }

    const result = await eventsService.listEvents(parsed.data);
    return {
      success: true,
      data: { items: result.items },
      meta: {
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / parsed.data.pageSize),
      },
    };
  });
}
