import { env } from '../env.js';
import { jobItemSchema, jobListResponseSchema } from '../routes/job-schemas.js';
import { searchJobsInIndex, type JobQueryInput } from '../search/jobs-service.js';
import { z } from '../lib/zod.js';

const aiJobsRequestSchema = z.object({
  query: z.string().min(1),
  locale: z.enum(['uk', 'en']).optional().default('uk'),
  country: z.string().optional(),
  remoteOnly: z.boolean().optional().default(false)
});

const aiJobsResponseSchema = z.object({
  explanation: z.string(),
  jobs: jobListResponseSchema.shape.items
});

type AiJobsRequest = z.infer<typeof aiJobsRequestSchema>;

type AiJobsResponse = z.infer<typeof aiJobsResponseSchema>;

type SuggestionFilters = {
  q?: string | null;
  skills?: string[];
  remote?: boolean | null;
  country?: string | null;
  salaryMin?: number | null;
  experience?: string | null;
};

type ChatCompletionMessage = {
  role: 'system' | 'user';
  content: string;
};

type ChatCompletionParams = {
  model: string;
  messages: ChatCompletionMessage[];
  response_format?: { type: 'json_object' };
};

type ChatCompletionResponse = {
  choices: Array<{ message?: { content?: string | null } }>;
};

type ChatCompletionClient = (params: ChatCompletionParams) => Promise<ChatCompletionResponse>;

type FetchResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

type FetchImpl = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<FetchResponse>;

type SuggestJobsDeps = {
  createChatCompletion: () => ChatCompletionClient;
  searchJobsInIndex: typeof searchJobsInIndex;
};

const defaultDeps: SuggestJobsDeps = {
  createChatCompletion,
  searchJobsInIndex
};

function getFetch(): FetchImpl {
  const globalWithFetch = globalThis as { fetch?: FetchImpl } & Record<string, unknown>;
  if (typeof globalWithFetch.fetch !== 'function') {
    throw new Error('Global fetch API is not available in this runtime');
  }
  return globalWithFetch.fetch;
}

function createChatCompletion(): ChatCompletionClient {
  if (!env.OPENAI_API_KEY) {
    throw new Error('AI is not configured (OPENAI_API_KEY is missing)');
  }
  const fetchImpl = getFetch();
  return async (params: ChatCompletionParams): Promise<ChatCompletionResponse> => {
    const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }

    return (await response.json()) as ChatCompletionResponse;
  };
}

function normalizeCountry(input?: string | null): string | undefined {
  if (!input) return undefined;
  const normalized = input.trim();
  if (!normalized || normalized.toLowerCase() === 'any') {
    return undefined;
  }
  return normalized.toUpperCase();
}

function normalizeSkills(input?: string[] | null): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((skill): skill is string => typeof skill === 'string')
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0);
}

function normalizeSalary(value?: number | null): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined;
  }
  if (!Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(0, Math.round(value));
}

function normalizeText(input?: string | null): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildSystemPrompt() {
  return `You are a job search assistant for a junior-level jobs site.
The user is looking for jobs in our own database.
You MUST respond ONLY with a JSON object with these fields:
- q: string | null
- skills: string[]
- remote: boolean | null
- country: string | null
- salaryMin: number | null
- experience: string | null

Do not add any explanations, just raw JSON.`;
}

function buildExplanation(locale: AiJobsRequest['locale'], count: number, query: JobQueryInput) {
  const isEnglish = locale === 'en';
  const parts: string[] = [];
  parts.push(
    isEnglish
      ? `I found ${count} jobs based on your request.`
      : `Я знайшов ${count} вакансій відповідно до твого запиту.`
  );
  if (query.remote === true) {
    parts.push(
      isEnglish
        ? 'I prioritized remote-friendly openings.'
        : 'Я надав пріоритет віддаленим позиціям.'
    );
  }
  if (query.country) {
    parts.push(
      isEnglish
        ? `I used the country filter: ${query.country}.`
        : `Я врахував країну: ${query.country}.`
    );
  }
  if (query.salaryMin) {
    parts.push(
      isEnglish
        ? `I tried to stay above ~${query.salaryMin} by salary.`
        : `Старався не опускатися нижче ~${query.salaryMin} по зарплаті.`
    );
  }
  return parts.join(' ');
}

async function requestFiltersFromAI(
  createCompletion: ChatCompletionClient,
  input: AiJobsRequest
): Promise<SuggestionFilters> {
  const userMessage = `User query: "${input.query}"
Locale: ${input.locale}
Preferred country hint: ${input.country ?? 'none'}
Remote only hint: ${input.remoteOnly}`;

  const completion = await createCompletion({
    model: env.AI_JOBS_MODEL,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: userMessage }
    ],
    response_format: { type: 'json_object' }
  });

  const content = completion.choices[0]?.message?.content ?? '{}';
  try {
    return JSON.parse(content) as SuggestionFilters;
  } catch {
    return {};
  }
}

function buildSearchQuery(input: AiJobsRequest, filters: SuggestionFilters): JobQueryInput {
  const hintedCountry = normalizeCountry(input.country);
  const aiCountry = normalizeCountry(filters.country);
  const country = hintedCountry ?? aiCountry;

  const remoteValue =
    typeof filters.remote === 'boolean'
      ? filters.remote
      : input.remoteOnly
        ? true
        : undefined;

  return {
    q: normalizeText(filters.q) ?? input.query,
    city: undefined,
    region: undefined,
    country,
    remote: remoteValue,
    skills: normalizeSkills(filters.skills),
    tags: [],
    salaryMin: normalizeSalary(filters.salaryMin),
    currency: undefined,
    experience: normalizeText(filters.experience),
    page: 1,
    perPage: 20,
    sort: 'relevant'
  } satisfies JobQueryInput;
}

export async function suggestJobs(rawBody: unknown, deps: SuggestJobsDeps = defaultDeps): Promise<AiJobsResponse> {
  const input = aiJobsRequestSchema.parse(rawBody);
  const createCompletion = deps.createChatCompletion();
  const filters = await requestFiltersFromAI(createCompletion, input);
  const searchQuery = buildSearchQuery(input, filters);
  const result = await deps.searchJobsInIndex(searchQuery);
  const explanation = buildExplanation(input.locale, result.items.length, searchQuery);

  return aiJobsResponseSchema.parse({
    explanation,
    jobs: result.items.map((item) => jobItemSchema.parse(item))
  });
}

export { aiJobsRequestSchema, aiJobsResponseSchema };
