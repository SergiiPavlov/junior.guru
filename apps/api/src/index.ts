import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

// Simple CORS for local dev
app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type');
  if (c.req.method === 'OPTIONS') return c.text('', 204);
  await next();
});

// In-memory demo data
type Job = {
  id: string;
  title: string;
  companyName?: string;
  city?: string;
  remote?: boolean;
  postedAt: string;
  urlOriginal?: string;
};

const jobs: Job[] = [
  { id: '1', title: 'Junior Frontend Developer (React)', companyName: 'Kyiv Tech', city: 'Київ', remote: true, postedAt: new Date().toISOString(), urlOriginal: '#' },
  { id: '2', title: 'Intern QA Engineer', companyName: 'Lviv Labs', city: 'Львів', remote: false, postedAt: new Date().toISOString(), urlOriginal: '#' },
  { id: '3', title: 'Junior Node.js Developer', companyName: 'Dnipro Soft', city: 'Дніпро', remote: true, postedAt: new Date().toISOString(), urlOriginal: '#' }
];

const events = [
  { id: 'e1', title: 'JS Meetup Kyiv', startAt: new Date(Date.now() + 86400000).toISOString() },
  { id: 'e2', title: 'QA Bootcamp Intro', startAt: new Date(Date.now() + 172800000).toISOString() }
];

app.get('/api/v1/health', (c) => c.json({ ok: true }));

app.get('/api/v1/jobs', (c) => {
  const q = (c.req.query('q') || '').toLowerCase();
  const filtered = q ? jobs.filter(j => (j.title + ' ' + (j.companyName||'')).toLowerCase().includes(q)) : jobs;
  return c.json({ items: filtered, page: 1, perPage: filtered.length, total: filtered.length });
});

app.get('/api/v1/jobs/:id', (c) => {
  const id = c.req.param('id');
  const job = jobs.find(j => j.id === id);
  if (!job) return c.json({ message: 'Not found' }, 404);
  return c.json(job);
});

app.get('/api/v1/events', (c) => {
  return c.json({ items: events, page: 1, perPage: events.length, total: events.length });
});

const port = Number(process.env.PORT || 8787);
console.log(`API running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
