import type { RepoListMode } from './repos.types';
import type { FilterMode } from '../settings/settings.types';
import { SettingsService } from '../settings/settings.service';

export class RepoFilterService {
  constructor(private readonly settingsService: SettingsService) {}

  shouldMonitor(listMode: RepoListMode, filterMode: FilterMode): boolean {
    if (filterMode === 'whitelist_only') {
      return listMode === 'whitelist';
    }

    return listMode !== 'blacklist';
  }

  async getFilterMode(): Promise<FilterMode> {
    return this.settingsService.getFilterMode();
  }
}
