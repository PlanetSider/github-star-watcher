import type { PrismaClient } from '@prisma/client';
import type { AppEnv } from '../../config/env';
import { generateToken } from '../../lib/crypto';
import { AppError } from '../../lib/errors';
import type { FilterMode } from './settings.types';

const FILTER_MODE_KEY = 'filter_mode';
const RSS_ENABLED_KEY = 'rss_enabled';
const RSS_FEED_TOKEN_KEY = 'rss_feed_token';
const LAST_SYNC_AT_KEY = 'last_sync_at';
const LAST_POLL_AT_KEY = 'last_poll_at';

export class SettingsService {
  constructor(private readonly prisma: PrismaClient) {}

  async initializeDefaults(env: AppEnv): Promise<void> {
    await this.setIfMissing(FILTER_MODE_KEY, 'all_except_blacklist');
    await this.setValue(RSS_ENABLED_KEY, String(env.RSS_ENABLED));
    await this.setValue(RSS_FEED_TOKEN_KEY, env.RSS_FEED_TOKEN ?? generateToken());
  }

  async getFilterMode(): Promise<FilterMode> {
    const value = await this.getValue(FILTER_MODE_KEY);
    if (value === 'whitelist_only') {
      return value;
    }

    return 'all_except_blacklist';
  }

  async setFilterMode(mode: FilterMode): Promise<FilterMode> {
    await this.setValue(FILTER_MODE_KEY, mode);
    return mode;
  }

  async isRssEnabled(): Promise<boolean> {
    const value = await this.getValue(RSS_ENABLED_KEY);
    return value !== 'false';
  }

  async getRssFeedToken(): Promise<string> {
    const value = await this.getValue(RSS_FEED_TOKEN_KEY);
    if (!value) {
      const token = generateToken();
      await this.setValue(RSS_FEED_TOKEN_KEY, token);
      return token;
    }

    return value;
  }

  async regenerateRssFeedToken(): Promise<string> {
    const token = generateToken();
    await this.setValue(RSS_FEED_TOKEN_KEY, token);
    return token;
  }

  async getPublicSettings(baseUrl: string): Promise<{
    filterMode: FilterMode;
    rssEnabled: boolean;
    rssFeedUrl: string | null;
  }> {
    const filterMode = await this.getFilterMode();
    const rssEnabled = await this.isRssEnabled();
    const token = rssEnabled ? await this.getRssFeedToken() : null;

    return {
      filterMode,
      rssEnabled,
      rssFeedUrl: token ? `${baseUrl}/feeds/${token}/rss.xml` : null,
    };
  }

  async setLastSyncAt(value: string): Promise<void> {
    await this.setValue(LAST_SYNC_AT_KEY, value);
  }

  async getLastSyncAt(): Promise<string | null> {
    return this.getValue(LAST_SYNC_AT_KEY);
  }

  async setLastPollAt(value: string): Promise<void> {
    await this.setValue(LAST_POLL_AT_KEY, value);
  }

  async getLastPollAt(): Promise<string | null> {
    return this.getValue(LAST_POLL_AT_KEY);
  }

  async assertValidFeedToken(token: string): Promise<void> {
    const enabled = await this.isRssEnabled();
    if (!enabled) {
      throw new AppError(403, 'RSS_DISABLED', 'RSS feed is disabled');
    }

    const currentToken = await this.getRssFeedToken();
    if (token !== currentToken) {
      throw new AppError(403, 'INVALID_FEED_TOKEN', 'RSS feed token is invalid');
    }
  }

  private async getValue(key: string): Promise<string | null> {
    const record = await this.prisma.appSetting.findUnique({ where: { key } });
    return record?.value ?? null;
  }

  private async setValue(key: string, value: string): Promise<void> {
    await this.prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  private async setIfMissing(key: string, value: string): Promise<void> {
    const current = await this.getValue(key);
    if (!current) {
      await this.setValue(key, value);
    }
  }
}
