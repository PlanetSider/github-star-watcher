import { AppError } from '../../lib/errors';
import type { Notifier, SendNotificationInput } from './notifier.interface';

export class ServerChanNotifier implements Notifier {
  constructor(private readonly sendKey: string) {}

  async send(input: SendNotificationInput): Promise<void> {
    const endpoint = this.buildEndpoint();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (response.status === 429) {
      throw new AppError(429, 'SERVERCHAN_RATE_LIMITED', 'ServerChan rate limit exceeded');
    }

    if (!response.ok) {
      throw new AppError(502, 'SERVERCHAN_REQUEST_FAILED', 'ServerChan request failed');
    }
  }

  private buildEndpoint(): string {
    const match = /^sctp(\d+)t/.exec(this.sendKey);
    if (!match) {
      throw new AppError(400, 'BAD_REQUEST', 'Invalid ServerChan send key');
    }

    const uid = match[1];
    return `https://${uid}.push.ft07.com/send/${this.sendKey}.send`;
  }
}
