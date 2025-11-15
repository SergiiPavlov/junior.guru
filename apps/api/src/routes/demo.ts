import type { Hono } from 'hono';
import fs from 'node:fs/promises';
import path from 'node:path';

export function registerDemoRoutes(api: Hono) {
  api.get('/demo/workua-jobs', async (c) => {
    try {
      const filePath = path.resolve(process.cwd(), 'seed', 'workua-jobs.mock.json');
      const raw = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(raw);

      if (!Array.isArray(data)) {
        console.warn('[demo] workua-jobs.mock.json root is not an array');
        return c.json({ error: 'Invalid demo data format' }, 500);
      }

      return c.json({ jobs: data });
    } catch (error) {
      console.error('[demo] Failed to load workua demo jobs:', error);
      return c.json({ error: 'Failed to load demo jobs' }, 500);
    }
  });
}
