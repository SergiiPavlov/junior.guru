import assert from 'node:assert/strict';
import test from 'node:test';

import type { Prisma, PrismaClient } from '@prisma/client';

import { registerSearchHooks } from '../../../../api/src/search/hooks';
import { createEventsCsvWorker } from '../events-csv-worker';
import { createJobsCsvWorker } from '../jobs-csv-worker';
import { runWorker } from '../base';

type SourceRecord = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  type?: string | null;
};

type CompanyRecord = {
  id: string;
  slug: string;
  name: string;
  websiteUrl?: string | null;
  email?: string | null;
  location?: string | null;
  description?: string | null;
  logoUrl?: string | null;
};

type RegionRecord = {
  id: string;
  code: string;
  nameUk: string;
  nameEn: string;
};

type JobRecord = {
  id: string;
  slug: string;
  sourceId: string;
  companyId: string | null;
  regionId: string | null;
  title: string;
  city: string | null;
  remote: boolean;
  urlOriginal: string | null;
  urlApply: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  experience: string | null;
  employmentType: string | null;
  skills: string[];
  tags: string[];
  descriptionRaw: string | null;
  description: string | null;
  publishedAt: Date;
  validUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type EventRecord = {
  id: string;
  slug: string;
  sourceId: string;
  regionId: string | null;
  title: string;
  city: string | null;
  remote: boolean;
  venue: string | null;
  urlOriginal: string | null;
  urlRegister: string | null;
  skills: string[];
  tags: string[];
  descriptionRaw: string | null;
  description: string | null;
  startAt: Date;
  endAt: Date | null;
  language: string | null;
  priceFrom: number | null;
  priceTo: number | null;
  currency: string | null;
  createdAt: Date;
  updatedAt: Date;
};

class InMemoryPrismaClient {
  private middlewares: Prisma.Middleware[] = [];
  private idSequence = 1;
  private sources = new Map<string, SourceRecord>();
  private companiesBySlug = new Map<string, CompanyRecord>();
  private companiesById = new Map<string, CompanyRecord>();
  private regionsByCode = new Map<string, RegionRecord>();
  private regionsById = new Map<string, RegionRecord>();
  private jobsBySlug = new Map<string, JobRecord>();
  private jobsById = new Map<string, JobRecord>();
  private eventsBySlug = new Map<string, EventRecord>();
  private eventsById = new Map<string, EventRecord>();

  public readonly source = {
    upsert: (args: Prisma.SourceUpsertArgs) => this.upsertSource(args)
  } as PrismaClient['source'];

  public readonly company = {
    upsert: (args: Prisma.CompanyUpsertArgs) => this.upsertCompany(args),
    create: (args: Prisma.CompanyCreateArgs) => this.createCompany(args)
  } as PrismaClient['company'];

  public readonly region = {
    upsert: (args: Prisma.RegionUpsertArgs) => this.upsertRegion(args),
    findUnique: (args: Prisma.RegionFindUniqueArgs) => this.findRegion(args)
  } as PrismaClient['region'];

  public readonly job = {
    upsert: (args: Prisma.JobUpsertArgs) => this.runWithMiddleware('Job', 'upsert', args, (finalArgs) => this.upsertJob(finalArgs)),
    findUnique: (args: Prisma.JobFindUniqueArgs) => this.findJob(args),
    findMany: (args: Prisma.JobFindManyArgs) => this.findManyJobs(args)
  } as PrismaClient['job'];

  public readonly event = {
    upsert: (args: Prisma.EventUpsertArgs) => this.runWithMiddleware('Event', 'upsert', args, (finalArgs) => this.upsertEvent(finalArgs)),
    findUnique: (args: Prisma.EventFindUniqueArgs) => this.findEvent(args),
    findMany: (args: Prisma.EventFindManyArgs) => this.findManyEvents(args)
  } as PrismaClient['event'];

  $use(middleware: Prisma.Middleware) {
    this.middlewares.push(middleware);
  }

  async $disconnect() {
    // no-op
  }

  getJobs(): JobRecord[] {
    return Array.from(this.jobsById.values()).map((job) => this.cloneJob(job));
  }

  getEvents(): EventRecord[] {
    return Array.from(this.eventsById.values()).map((event) => this.cloneEvent(event));
  }

  private cloneJob(job: JobRecord): JobRecord {
    return {
      ...job,
      skills: [...job.skills],
      tags: [...job.tags],
      publishedAt: new Date(job.publishedAt),
      validUntil: job.validUntil ? new Date(job.validUntil) : null,
      createdAt: new Date(job.createdAt),
      updatedAt: new Date(job.updatedAt)
    };
  }

  private cloneEvent(event: EventRecord): EventRecord {
    return {
      ...event,
      skills: [...event.skills],
      tags: [...event.tags],
      startAt: new Date(event.startAt),
      endAt: event.endAt ? new Date(event.endAt) : null,
      createdAt: new Date(event.createdAt),
      updatedAt: new Date(event.updatedAt)
    };
  }

  private async runWithMiddleware<T>(
    model: Prisma.ModelName | 'Job' | 'Event',
    action: Prisma.PrismaAction,
    args: unknown,
    executor: (args: unknown) => Promise<T> | T
  ): Promise<T> {
    const execute = async (index: number, params: Prisma.MiddlewareParams): Promise<T> => {
      const middleware = this.middlewares[index];
      if (!middleware) {
        return executor(params.args);
      }
      return middleware(params, (nextParams) => execute(index + 1, nextParams ?? params));
    };

    return execute(0, { model, action, args } as Prisma.MiddlewareParams);
  }

  private generateId(prefix: string): string {
    const id = `${prefix}_${this.idSequence}`;
    this.idSequence += 1;
    return id;
  }

  private async upsertSource(args: Prisma.SourceUpsertArgs): Promise<SourceRecord> {
    const existing = this.sources.get(args.where.key);
    if (existing) {
      const updated: SourceRecord = {
        ...existing,
        name: 'name' in args.update ? (args.update.name as string) : existing.name,
        description: 'description' in args.update ? (args.update.description as string | null | undefined) ?? null : existing.description ?? null,
        type: 'type' in args.update ? (args.update.type as string | null | undefined) ?? null : existing.type ?? null
      };
      this.sources.set(updated.key, updated);
      return { ...updated };
    }

    const record: SourceRecord = {
      id: this.generateId('source'),
      key: args.create.key,
      name: args.create.name,
      description: (args.create.description as string | null | undefined) ?? null,
      type: (args.create.type as string | null | undefined) ?? null
    };
    this.sources.set(record.key, record);
    return { ...record };
  }

  private async upsertCompany(args: Prisma.CompanyUpsertArgs): Promise<CompanyRecord> {
    const existing = this.companiesBySlug.get(args.where.slug);
    if (existing) {
      const updated: CompanyRecord = {
        ...existing,
        name: args.update.name as string,
        websiteUrl: (args.update.websiteUrl as string | null | undefined) ?? null,
        email: (args.update.email as string | null | undefined) ?? null,
        location: (args.update.location as string | null | undefined) ?? null,
        description: (args.update.description as string | null | undefined) ?? null,
        logoUrl: (args.update.logoUrl as string | null | undefined) ?? null
      };
      this.companiesBySlug.set(updated.slug, updated);
      this.companiesById.set(updated.id, updated);
      return { ...updated };
    }

    return this.createCompany({ data: args.create });
  }

  private async createCompany(args: Prisma.CompanyCreateArgs): Promise<CompanyRecord> {
    const record: CompanyRecord = {
      id: this.generateId('company'),
      slug: args.data.slug,
      name: args.data.name,
      websiteUrl: (args.data.websiteUrl as string | null | undefined) ?? null,
      email: (args.data.email as string | null | undefined) ?? null,
      location: (args.data.location as string | null | undefined) ?? null,
      description: (args.data.description as string | null | undefined) ?? null,
      logoUrl: (args.data.logoUrl as string | null | undefined) ?? null
    };
    this.companiesBySlug.set(record.slug, record);
    this.companiesById.set(record.id, record);
    return { ...record };
  }

  private async upsertRegion(args: Prisma.RegionUpsertArgs): Promise<RegionRecord> {
    const existing = this.regionsByCode.get(args.where.code);
    if (existing) {
      const updated: RegionRecord = {
        ...existing,
        nameUk: args.update.nameUk as string,
        nameEn: args.update.nameEn as string
      };
      this.regionsByCode.set(updated.code, updated);
      this.regionsById.set(updated.id, updated);
      return { ...updated };
    }

    const record: RegionRecord = {
      id: this.generateId('region'),
      code: args.create.code,
      nameUk: args.create.nameUk,
      nameEn: args.create.nameEn
    };
    this.regionsByCode.set(record.code, record);
    this.regionsById.set(record.id, record);
    return { ...record };
  }

  private async findRegion(args: Prisma.RegionFindUniqueArgs): Promise<RegionRecord | null> {
    if (args.where.code) {
      const region = this.regionsByCode.get(args.where.code);
      return region ? { ...region } : null;
    }
    if (args.where.id) {
      const region = this.regionsById.get(args.where.id);
      return region ? { ...region } : null;
    }
    return null;
  }

  private async upsertJob(args: Prisma.JobUpsertArgs): Promise<JobRecord> {
    const slug = args.where.slug as string;
    const existing = this.jobsBySlug.get(slug);
    if (existing) {
      const updated = this.applyJobUpdate(existing, args.update as Prisma.JobUncheckedUpdateInput);
      this.jobsBySlug.set(slug, updated);
      this.jobsById.set(updated.id, updated);
      return this.cloneJob(updated);
    }

    const created = this.applyJobCreate(args.create as Prisma.JobUncheckedCreateInput);
    this.jobsBySlug.set(slug, created);
    this.jobsById.set(created.id, created);
    return this.cloneJob(created);
  }

  private applyJobCreate(create: Prisma.JobUncheckedCreateInput): JobRecord {
    const record: JobRecord = {
      id: this.generateId('job'),
      slug: create.slug!,
      sourceId: create.sourceId!,
      companyId: (create.companyId as string | undefined) ?? null,
      regionId: (create.regionId as string | undefined) ?? null,
      title: create.title!,
      city: (create.city as string | undefined) ?? null,
      remote: (create.remote as boolean | undefined) ?? false,
      urlOriginal: (create.urlOriginal as string | undefined) ?? null,
      urlApply: (create.urlApply as string | undefined) ?? null,
      salaryMin: (create.salaryMin as number | null | undefined) ?? null,
      salaryMax: (create.salaryMax as number | null | undefined) ?? null,
      currency: (create.currency as string | null | undefined) ?? null,
      experience: (create.experience as string | null | undefined) ?? null,
      employmentType: (create.employmentType as string | null | undefined) ?? null,
      skills: Array.isArray(create.skills) ? [...(create.skills as string[])] : [],
      tags: Array.isArray(create.tags) ? [...(create.tags as string[])] : [],
      descriptionRaw: (create.descriptionRaw as string | null | undefined) ?? null,
      description: (create.description as string | null | undefined) ?? null,
      publishedAt: new Date(create.publishedAt as Date | string),
      validUntil: create.validUntil ? new Date(create.validUntil as Date | string) : null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return record;
  }

  private applyJobUpdate(record: JobRecord, update: Prisma.JobUncheckedUpdateInput): JobRecord {
    const updated: JobRecord = { ...record, skills: [...record.skills], tags: [...record.tags], createdAt: record.createdAt };

    if ('sourceId' in update && update.sourceId !== undefined) {
      updated.sourceId = update.sourceId as string;
    }
    if ('companyId' in update) {
      updated.companyId = (update.companyId as string | null | undefined) ?? null;
    }
    if ('regionId' in update) {
      updated.regionId = (update.regionId as string | null | undefined) ?? null;
    }
    if ('title' in update && update.title !== undefined) {
      updated.title = update.title as string;
    }
    if ('city' in update) {
      updated.city = (update.city as string | null | undefined) ?? null;
    }
    if ('remote' in update && update.remote !== undefined) {
      updated.remote = update.remote as boolean;
    }
    if ('urlOriginal' in update) {
      updated.urlOriginal = (update.urlOriginal as string | null | undefined) ?? null;
    }
    if ('urlApply' in update) {
      updated.urlApply = (update.urlApply as string | null | undefined) ?? null;
    }
    if ('salaryMin' in update) {
      updated.salaryMin = (update.salaryMin as number | null | undefined) ?? null;
    }
    if ('salaryMax' in update) {
      updated.salaryMax = (update.salaryMax as number | null | undefined) ?? null;
    }
    if ('currency' in update) {
      updated.currency = (update.currency as string | null | undefined) ?? null;
    }
    if ('experience' in update) {
      updated.experience = (update.experience as string | null | undefined) ?? null;
    }
    if ('employmentType' in update) {
      updated.employmentType = (update.employmentType as string | null | undefined) ?? null;
    }
    if ('skills' in update && Array.isArray(update.skills)) {
      updated.skills = [...(update.skills as string[])];
    }
    if ('tags' in update && Array.isArray(update.tags)) {
      updated.tags = [...(update.tags as string[])];
    }
    if ('descriptionRaw' in update) {
      updated.descriptionRaw = (update.descriptionRaw as string | null | undefined) ?? null;
    }
    if ('description' in update) {
      updated.description = (update.description as string | null | undefined) ?? null;
    }
    if ('publishedAt' in update && update.publishedAt !== undefined) {
      updated.publishedAt = new Date(update.publishedAt as Date | string);
    }
    if ('validUntil' in update) {
      updated.validUntil = update.validUntil ? new Date(update.validUntil as Date | string) : null;
    }

    updated.updatedAt = new Date();
    return updated;
  }

  private async findJob(args: Prisma.JobFindUniqueArgs): Promise<any> {
    let record: JobRecord | undefined;
    if (args.where.id) {
      record = this.jobsById.get(args.where.id);
    } else if (args.where.slug) {
      record = this.jobsBySlug.get(args.where.slug);
    }
    if (!record) {
      return null;
    }

    const job = this.cloneJob(record) as any;
    if (args.include?.company) {
      job.company = record.companyId ? this.cloneCompany(record.companyId) : null;
    }
    if (args.include?.region) {
      job.region = record.regionId ? this.cloneRegion(record.regionId) : null;
    }
    return job;
  }

  private cloneCompany(id: string | null): CompanyRecord | null {
    if (!id) {
      return null;
    }
    const company = this.companiesById.get(id);
    return company ? { ...company } : null;
  }

  private cloneRegion(id: string | null): RegionRecord | null {
    if (!id) {
      return null;
    }
    const region = this.regionsById.get(id);
    return region ? { ...region } : null;
  }

  private async findManyJobs(args: Prisma.JobFindManyArgs): Promise<any[]> {
    const jobs = Array.from(this.jobsById.values()).map((job) => this.cloneJob(job));
    if (args.include?.company || args.include?.region) {
      return jobs.map((job) => ({
        ...job,
        company: args.include?.company ? this.cloneCompany(job.companyId) : undefined,
        region: args.include?.region ? this.cloneRegion(job.regionId) : undefined
      }));
    }
    return jobs;
  }

  private async upsertEvent(args: Prisma.EventUpsertArgs): Promise<EventRecord> {
    const slug = args.where.slug as string;
    const existing = this.eventsBySlug.get(slug);
    if (existing) {
      const updated = this.applyEventUpdate(existing, args.update as Prisma.EventUncheckedUpdateInput);
      this.eventsBySlug.set(slug, updated);
      this.eventsById.set(updated.id, updated);
      return this.cloneEvent(updated);
    }

    const created = this.applyEventCreate(args.create as Prisma.EventUncheckedCreateInput);
    this.eventsBySlug.set(slug, created);
    this.eventsById.set(created.id, created);
    return this.cloneEvent(created);
  }

  private applyEventCreate(create: Prisma.EventUncheckedCreateInput): EventRecord {
    return {
      id: this.generateId('event'),
      slug: create.slug!,
      sourceId: create.sourceId!,
      regionId: (create.regionId as string | undefined) ?? null,
      title: create.title!,
      city: (create.city as string | undefined) ?? null,
      remote: (create.remote as boolean | undefined) ?? false,
      venue: (create.venue as string | undefined) ?? null,
      urlOriginal: (create.urlOriginal as string | undefined) ?? null,
      urlRegister: (create.urlRegister as string | undefined) ?? null,
      skills: Array.isArray(create.skills) ? [...(create.skills as string[])] : [],
      tags: Array.isArray(create.tags) ? [...(create.tags as string[])] : [],
      descriptionRaw: (create.descriptionRaw as string | null | undefined) ?? null,
      description: (create.description as string | null | undefined) ?? null,
      startAt: new Date(create.startAt as Date | string),
      endAt: create.endAt ? new Date(create.endAt as Date | string) : null,
      language: (create.language as string | null | undefined) ?? null,
      priceFrom: (create.priceFrom as number | null | undefined) ?? null,
      priceTo: (create.priceTo as number | null | undefined) ?? null,
      currency: (create.currency as string | null | undefined) ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private applyEventUpdate(record: EventRecord, update: Prisma.EventUncheckedUpdateInput): EventRecord {
    const updated: EventRecord = { ...record, skills: [...record.skills], tags: [...record.tags], createdAt: record.createdAt };

    if ('sourceId' in update && update.sourceId !== undefined) {
      updated.sourceId = update.sourceId as string;
    }
    if ('regionId' in update) {
      updated.regionId = (update.regionId as string | null | undefined) ?? null;
    }
    if ('title' in update && update.title !== undefined) {
      updated.title = update.title as string;
    }
    if ('city' in update) {
      updated.city = (update.city as string | null | undefined) ?? null;
    }
    if ('remote' in update && update.remote !== undefined) {
      updated.remote = update.remote as boolean;
    }
    if ('venue' in update) {
      updated.venue = (update.venue as string | null | undefined) ?? null;
    }
    if ('urlOriginal' in update) {
      updated.urlOriginal = (update.urlOriginal as string | null | undefined) ?? null;
    }
    if ('urlRegister' in update) {
      updated.urlRegister = (update.urlRegister as string | null | undefined) ?? null;
    }
    if ('skills' in update && Array.isArray(update.skills)) {
      updated.skills = [...(update.skills as string[])];
    }
    if ('tags' in update && Array.isArray(update.tags)) {
      updated.tags = [...(update.tags as string[])];
    }
    if ('descriptionRaw' in update) {
      updated.descriptionRaw = (update.descriptionRaw as string | null | undefined) ?? null;
    }
    if ('description' in update) {
      updated.description = (update.description as string | null | undefined) ?? null;
    }
    if ('startAt' in update && update.startAt !== undefined) {
      updated.startAt = new Date(update.startAt as Date | string);
    }
    if ('endAt' in update) {
      updated.endAt = update.endAt ? new Date(update.endAt as Date | string) : null;
    }
    if ('language' in update) {
      updated.language = (update.language as string | null | undefined) ?? null;
    }
    if ('priceFrom' in update) {
      updated.priceFrom = (update.priceFrom as number | null | undefined) ?? null;
    }
    if ('priceTo' in update) {
      updated.priceTo = (update.priceTo as number | null | undefined) ?? null;
    }
    if ('currency' in update) {
      updated.currency = (update.currency as string | null | undefined) ?? null;
    }

    updated.updatedAt = new Date();
    return updated;
  }

  private async findEvent(args: Prisma.EventFindUniqueArgs): Promise<any> {
    let record: EventRecord | undefined;
    if (args.where.id) {
      record = this.eventsById.get(args.where.id);
    } else if (args.where.slug) {
      record = this.eventsBySlug.get(args.where.slug);
    }
    if (!record) {
      return null;
    }

    const event = this.cloneEvent(record) as any;
    if (args.include?.region) {
      event.region = record.regionId ? this.cloneRegion(record.regionId) : null;
    }
    return event;
  }

  private async findManyEvents(args: Prisma.EventFindManyArgs): Promise<any[]> {
    const events = Array.from(this.eventsById.values()).map((event) => this.cloneEvent(event));
    if (args.include?.region) {
      return events.map((event) => ({
        ...event,
        region: event.regionId ? this.cloneRegion(event.regionId) : null
      }));
    }
    return events;
  }
}

test('workers import CSV data into Prisma and sync Meili documents', async () => {
  const prisma = new InMemoryPrismaClient();
  registerSearchHooks(prisma as unknown as PrismaClient);

  const originalFetch = globalThis.fetch;
  const meiliRequests: Array<{ method: string; path: string; body?: any }> = [];
  let taskUid = 0;

  const fetchParameters = globalThis.fetch ? (globalThis.fetch as typeof fetch) : fetch;
  globalThis.fetch = (async (
    input: Parameters<typeof fetchParameters>[0],
    init?: Parameters<typeof fetchParameters>[1]
  ) => {
    const url =
      typeof input === 'string' || input instanceof URL
        ? new URL(input.toString())
        : new URL((input as Request).url);
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(init.body.toString()) : undefined;
    meiliRequests.push({ method, path: url.pathname, body });

    if (method === 'POST' && /\/indexes\/.+\/documents$/.test(url.pathname)) {
      taskUid += 1;
      return new Response(JSON.stringify({ taskUid }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (method === 'POST' && url.pathname === '/indexes') {
      taskUid += 1;
      return new Response(JSON.stringify({ taskUid }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (method === 'GET' && url.pathname.startsWith('/tasks/')) {
      return new Response(JSON.stringify({ status: 'succeeded' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (method === 'GET' && url.pathname.startsWith('/indexes/')) {
      return new Response(JSON.stringify({ uid: url.pathname.split('/')[2] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (method === 'DELETE' && /\/indexes\/.+\/documents\//.test(url.pathname)) {
      taskUid += 1;
      return new Response(JSON.stringify({ taskUid }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    throw new Error(`Unhandled fetch request: ${method} ${url.pathname}`);
  }) as typeof globalThis.fetch;

  try {
    process.env.MEILI_HOST = 'http://localhost:7700';
    process.env.MEILI_MASTER_KEY = '';

    const jobWorker = createJobsCsvWorker(prisma as unknown as PrismaClient);
    const eventWorker = createEventsCsvWorker(prisma as unknown as PrismaClient);

    const jobRows = (await jobWorker.fetchList()) as Array<Record<string, string>>;
    const eventRows = (await eventWorker.fetchList()) as Array<Record<string, string>>;

    const firstRunJobs = await runWorker(jobWorker);
    const firstRunEvents = await runWorker(eventWorker);

    const secondRunJobs = await runWorker(jobWorker);
    const secondRunEvents = await runWorker(eventWorker);

    assert.equal(firstRunJobs.processed, jobRows.length);
    assert.equal(firstRunJobs.failed, 0);
    assert.equal(firstRunEvents.processed, eventRows.length);
    assert.equal(firstRunEvents.failed, 0);

    assert.equal(secondRunJobs.processed, jobRows.length);
    assert.equal(secondRunEvents.processed, eventRows.length);

    const storedJobs = prisma.getJobs();
    const storedEvents = prisma.getEvents();

    assert.equal(storedJobs.length, jobRows.length);
    assert.equal(storedEvents.length, eventRows.length);

    const kyivJob = storedJobs.find((job) => job.slug === 'junior-frontend-kyiv');
    assert(kyivJob);
    assert.equal(kyivJob?.remote, false);
    assert.equal(kyivJob?.skills.includes('JavaScript'), true);
    assert.equal(kyivJob?.companyId !== null, true);

    const meetupEvent = storedEvents.find((event) => event.slug === 'js-meetup-kyiv');
    assert(meetupEvent);
    assert.equal(meetupEvent?.remote, false);
    assert.equal(meetupEvent?.skills.includes('JavaScript'), true);

    const jobDocumentRequests = meiliRequests.filter(
      (request) => request.method === 'POST' && request.path === '/indexes/jobs/documents'
    );
    const eventDocumentRequests = meiliRequests.filter(
      (request) => request.method === 'POST' && request.path === '/indexes/events/documents'
    );

    assert(jobDocumentRequests.length >= jobRows.length);
    assert(eventDocumentRequests.length >= eventRows.length);

    const [latestJobRequest] = jobDocumentRequests.slice(-1);
    const firstJobDoc = latestJobRequest.body?.[0];
    assert.equal(firstJobDoc.slug.length > 0, true);
    assert.equal(Array.isArray(firstJobDoc.skills), true);

    const [latestEventRequest] = eventDocumentRequests.slice(-1);
    const firstEventDoc = latestEventRequest.body?.[0];
    assert.equal(firstEventDoc.slug.length > 0, true);
    assert.equal(Array.isArray(firstEventDoc.tags), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
