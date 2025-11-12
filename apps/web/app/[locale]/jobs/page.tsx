import Link from "next/link";

export default async function JobsPage({ params, searchParams }: { params: { locale: string }, searchParams: { q?: string } }) {
  const { locale } = params;
  const url = new URL("http://localhost:8787/api/v1/jobs");
  if (searchParams.q) url.searchParams.set("q", searchParams.q);
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  const items = data.items ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Вакансії</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((job: any) => (
          <article key={job.id} className="card">
            <div className="text-sm text-gray-500">{job.companyName ?? "—"}</div>
            <h2 className="text-lg font-semibold">{job.title}</h2>
            <div className="text-sm">{job.city ?? (job.remote ? "Remote" : "—")}</div>
            <Link className="mt-2 inline-block underline" href={`/${locale}/jobs/${job.id}`}>Відкрити</Link>
          </article>
        ))}
        {items.length === 0 && <div className="muted">Поки що немає даних.</div>}
      </div>
    </div>
  );
}
