import Link from "next/link";

export default async function JobDetails({ params }: { params: { locale: string, id: string } }) {
  const { locale, id } = params;
  const res = await fetch(`http://localhost:8787/api/v1/jobs/${id}`, { cache: "no-store" });
  if (!res.ok) {
    return <div className="muted">Вакансію не знайдено.</div>;
  }
  const job = await res.json();

  return (
    <article className="space-y-4">
      <Link className="underline" href={`/${locale}/jobs`}>← Назад</Link>
      <h1 className="text-2xl font-semibold">{job.title}</h1>
      <div className="text-sm text-gray-500">{job.companyName ?? "—"}</div>
      <div className="text-sm">{job.city ?? (job.remote ? "Remote" : "—")}</div>
      <p className="mt-4">Це демо-опис вакансії. На проді тут буде узгоджений короткий опис та посилання на оригінал.</p>
      {job.urlOriginal && <a className="inline-block px-4 py-2 rounded-xl bg-black text-white" href={job.urlOriginal} target="_blank">Відкрити оригінал</a>}
    </article>
  );
}
