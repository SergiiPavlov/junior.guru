import { Hono } from 'hono'
import { env } from '../env'
import { jobsIndex } from '../search/jobs-index'
import { eventsIndex } from '../search/events-index'
import { prisma } from '../lib/prisma'
import { z } from '../lib/zod'

export const admin = new Hono()

// Simple admin guard via header x-admin-token
admin.use('*', async (c, next) => {
  const token = c.req.header('x-admin-token') || ''
  if (env.ADMIN_TOKEN && token !== env.ADMIN_TOKEN) {
    return c.json({ error: 'unauthorized' }, 401)
  }
  await next()
})

// POST /api/v1/admin/reindex/jobs
admin.post('/reindex/jobs', async (c) => {
  // Rebuild the jobs index from DB
  const jobs = await prisma.job.findMany()
  const { count } = await jobsIndex.reindexAll(jobs)
  return c.json({ ok: true, count })
})

// POST /api/v1/admin/reindex/events
admin.post('/reindex/events', async (c) => {
  const events = await prisma.event.findMany()
  const { count } = await eventsIndex.reindexAll(events)
  return c.json({ ok: true, count })
})

// GET /api/v1/admin/stats
admin.get('/stats', async (c) => {
  const jobsCount = await jobsIndex.count()
  const eventsCount = await eventsIndex.count()
  return c.json({ jobs: { count: jobsCount }, events: { count: eventsCount } })
})