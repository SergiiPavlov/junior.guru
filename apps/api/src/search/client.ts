import { setTimeout as delay } from 'node:timers/promises';

import { env } from '../env';

export const JOBS_INDEX = 'jobs';
export const EVENTS_INDEX = 'events';

type IndexSettings = {
  searchableAttributes?: string[];
  filterableAttributes?: string[];
  sortableAttributes?: string[];
  synonyms?: Record<string, string[]>;
};

type SearchFilter = Array<string | string[]> | string | undefined;

type SearchParams = {
  offset?: number;
  limit?: number;
  sort?: string[];
  filter?: SearchFilter;
};

type SearchResponse<T> = {
  hits: T[];
  estimatedTotalHits?: number;
};

class MeiliHttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'MeiliHttpError';
  }
}

class MeiliIndex<TDocument> {
  constructor(private readonly client: MeiliHttpClient, private readonly name: string) {}

  async updateSettings(settings: IndexSettings) {
    const task = await this.client.request<{ taskUid: number }>(`/indexes/${this.name}/settings`, {
      method: 'PATCH',
      body: settings
    });
    await this.client.waitForTask(task.taskUid);
  }

  async addDocuments(documents: TDocument[]) {
    const task = await this.client.request<{ taskUid: number }>(`/indexes/${this.name}/documents`, {
      method: 'POST',
      body: documents
    });
    await this.client.waitForTask(task.taskUid);
  }

  async replaceDocuments(documents: TDocument[]) {
    const task = await this.client.request<{ taskUid: number }>(`/indexes/${this.name}/documents`, {
      method: 'PUT',
      body: documents
    });
    await this.client.waitForTask(task.taskUid);
  }

  async deleteDocument(id: string) {
    const task = await this.client.request<{ taskUid: number }>(`/indexes/${this.name}/documents/${id}`, {
      method: 'DELETE'
    });
    if (task?.taskUid) {
      await this.client.waitForTask(task.taskUid);
    }
  }

  async search<R = TDocument>(query: string, params: SearchParams): Promise<SearchResponse<R>> {
    return this.client.request<SearchResponse<R>>(`/indexes/${this.name}/search`, {
      method: 'POST',
      body: { q: query, ...params }
    });
  }

  async getStats() {
    return this.client.request<{ numberOfDocuments?: number }>(`/indexes/${this.name}/stats`, {
      method: 'GET'
    });
  }
}

class MeiliHttpClient {
  constructor(private readonly host: string, private readonly apiKey?: string) {}

  index<T>(name: string): MeiliIndex<T> {
    return new MeiliIndex<T>(this, name);
  }

  async getOrCreateIndex(name: string, options: { primaryKey?: string }) {
    try {
      await this.request(`/indexes/${name}`, { method: 'GET' });
    } catch (error) {
      if (error instanceof MeiliHttpError && error.status === 404) {
        await this.request(`/indexes`, {
          method: 'POST',
          body: { uid: name, primaryKey: options.primaryKey }
        });
      } else {
        throw error;
      }
    }
    return this.index(name);
  }

  async request<T>(path: string, init: { method: string; body?: unknown }): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['X-Meili-API-Key'] = this.apiKey;
    }

    const response = await fetch(new URL(path, this.host), {
      method: init.method,
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined
    });

    if (!response.ok) {
      const message = await response.text();
      throw new MeiliHttpError(response.status, message || response.statusText);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async waitForTask(taskUid: number) {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const task = await this.request<{ status: string; error?: { message: string } }>(`/tasks/${taskUid}`, {
        method: 'GET'
      });

      if (task.status === 'succeeded') {
        return;
      }

      if (task.status === 'failed') {
        throw new Error(task.error?.message ?? 'Meilisearch task failed');
      }

      await delay(100);
    }

    throw new Error(`Timeout while waiting for Meilisearch task ${taskUid}`);
  }
}

export const isSearchEnabled = Boolean(env.API_SEARCH_ENABLED && env.MEILI_HOST);

export const meiliClient = isSearchEnabled && env.MEILI_HOST
  ? new MeiliHttpClient(env.MEILI_HOST, env.MEILI_MASTER_KEY || undefined)
  : null;

const JOBS_INDEX_SETTINGS: IndexSettings = {
  searchableAttributes: ['title', 'companyName', 'city', 'region', 'skills', 'tags', 'descriptionHtmlTrimmed'],
  filterableAttributes: ['city', 'region', 'skills', 'tags', 'isRemote', 'experienceLevel', 'currency', 'salaryMin'],
  sortableAttributes: ['postedAt', 'salaryMin'],
  synonyms: {
    'Київ': ['Киев', 'Kyiv'],
    'Киев': ['Київ', 'Kyiv'],
    Kyiv: ['Київ', 'Киев'],
    'віддалена': ['удалённая', 'remote'],
    'удалённая': ['віддалена', 'remote'],
    remote: ['віддалена', 'удалённая']
  }
};

const EVENTS_INDEX_SETTINGS: IndexSettings = {
  searchableAttributes: ['title', 'city', 'region', 'skills', 'tags', 'descriptionHtmlTrimmed', 'venue'],
  filterableAttributes: ['city', 'region', 'skills', 'tags', 'isRemote', 'language'],
  sortableAttributes: ['startAt']
};

export async function ensureSearchIndexes() {
  if (!meiliClient) {
    console.warn('Meilisearch client is not configured; skipping index initialization.');
    return;
  }

  const jobs = await meiliClient.getOrCreateIndex(JOBS_INDEX, { primaryKey: 'id' });
  const events = await meiliClient.getOrCreateIndex(EVENTS_INDEX, { primaryKey: 'id' });

  await Promise.all([jobs.updateSettings(JOBS_INDEX_SETTINGS), events.updateSettings(EVENTS_INDEX_SETTINGS)]);
}

export type { MeiliHttpClient, SearchParams, SearchResponse, SearchFilter };
export { MeiliHttpError };
