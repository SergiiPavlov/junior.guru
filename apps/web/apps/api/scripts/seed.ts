import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../packages/db/prisma/.env") });

import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const prisma = new PrismaClient();

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = resolve(__dirname, '../../../seed');

type CsvRecord = Record<string, string>;

async function readCsv(fileName: string): Promise<CsvRecord[]> {
  const filePath = resolve(SEED_DIR, fileName);
  const raw = await readFile(filePath, 'utf-8');
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0].split(',').map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim());
    const record: CsvRecord = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? '';
    });
    return record;
  });
}

function parseBoolean(value: string | undefined): boolean {
  return (value ?? '').toLowerCase() === 'true';
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseArray(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split('|')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function main() {
  console.log('Starting database seed...');

  await prisma.jobTag.deleteMany();
  await prisma.eventTag.deleteMany();
  await prisma.job.deleteMany();
  await prisma.event.deleteMany();
  await prisma.company.deleteMany();
  await prisma.region.deleteMany();
  await prisma.crawl.deleteMany();
  await prisma.source.deleteMany();
  await prisma.tag.deleteMany();

  const seedSource = await prisma.source.create({
    data: {
      key: 'seed-data',
      name: 'Seed Data',
      type: 'internal'
    }
  });
  console.log('Created seed source');

  const regions = await readCsv('regions.csv');
  const regionMap: Record<string, string> = {};
  for (const region of regions) {
    const created = await prisma.region.create({
      data: {
        code: region.code,
        nameUk: region.nameUk,
        nameEn: region.nameEn
      }
    });
    regionMap[region.code] = created.id;
  }
  console.log(`Seeded ${regions.length} regions`);

  const companies = await readCsv('companies.csv');
  const companyMap: Record<string, string> = {};
  for (const company of companies) {
    const created = await prisma.company.create({
      data: {
        slug: company.slug,
        name: company.name,
        websiteUrl: company.websiteUrl || null,
        email: company.email || null,
        location: company.location || null,
        description: company.description || null,
        logoUrl: company.logoUrl || null
      }
    });
    companyMap[company.slug] = created.id;
  }
  console.log(`Seeded ${companies.length} companies`);

  const jobs = await readCsv('jobs.csv');
  for (const job of jobs) {
    await prisma.job.create({
      data: {
        sourceId: seedSource.id,
        companyId: job.companySlug ? companyMap[job.companySlug] ?? null : null,
        regionId: job.regionCode ? regionMap[job.regionCode] ?? null : null,
        slug: job.slug,
        title: job.title,
        city: job.city || null,
        remote: parseBoolean(job.remote),
        urlOriginal: job.urlOriginal || null,
        urlApply: job.urlApply || null,
        salaryMin: parseNumber(job.salaryMin) ?? undefined,
        salaryMax: parseNumber(job.salaryMax) ?? undefined,
        currency: job.currency || null,
        experience: job.experience || null,
        employmentType: job.employmentType || null,
        skills: parseArray(job.skills),
        tags: parseArray(job.tags),
        description: job.description || null,
        descriptionRaw: job.descriptionRaw || null,
        publishedAt: parseDate(job.publishedAt) ?? new Date(),
        validUntil: parseDate(job.validUntil) ?? null
      }
    });
  }
  console.log(`Seeded ${jobs.length} jobs`);

  const events = await readCsv('events.csv');
  for (const event of events) {
    await prisma.event.create({
      data: {
        sourceId: seedSource.id,
        regionId: event.regionCode ? regionMap[event.regionCode] ?? null : null,
        slug: event.slug,
        title: event.title,
        urlOriginal: event.urlOriginal || null,
        urlRegister: event.urlRegister || null,
        venue: event.venue || null,
        city: event.city || null,
        remote: parseBoolean(event.remote),
        skills: parseArray(event.skills),
        tags: parseArray(event.tags),
        description: event.description || null,
        descriptionRaw: event.descriptionRaw || null,
        startAt: parseDate(event.startAt) ?? new Date(),
        endAt: parseDate(event.endAt) ?? null,
        language: event.language || null,
        priceFrom: parseNumber(event.priceFrom) ?? undefined,
        priceTo: parseNumber(event.priceTo) ?? undefined,
        currency: event.currency || null
      }
    });
  }
  console.log(`Seeded ${events.length} events`);

  console.log('Database seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
