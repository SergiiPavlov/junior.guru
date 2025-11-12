import Link from "next/link";

export default async function Home({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const jobsRes = await fetch("http://localhost:8787/api/v1/jobs", { cache: "no-store" });
  const jobs = await jobsRes.json().then((r: any) => r.items ?? []);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Вітаємо у Junior UA</h1>
        <p className="muted">Платформа для джунів: вакансії, події, комʼюніті.</p>
        <div className="flex gap-3">
          <Link href={`/${locale}/jobs`} className="px-4 py-2 rounded-xl bg-black text-white">Дивитись вакансії</Link>
          <Link href={`/${locale}/events`} className="px-4 py-2 rounded-xl border">Події</Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Останні вакансії</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {jobs.slice(0,4).map((job: any) => (
            <article key={job.id} className="card">
              <div className="text-sm text-gray-500">{job.companyName ?? "—"}</div>
              <h3 className="text-lg font-semibold">{job.title}</h3>
              <div className="text-sm">{job.city ?? (job.remote ? "Remote" : "—")}</div>
              <Link className="mt-2 inline-block underline" href={`/${locale}/jobs/${job.id}`}>Відкрити</Link>
            </article>
          ))}
          {jobs.length === 0 && <div className="muted">Поки що немає даних. Запустіть API.</div>}
        </div>
      </section>
    </div>
  );
}
