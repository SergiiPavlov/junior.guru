export default async function EventsPage() {
  const res = await fetch("http://localhost:8787/api/v1/events", { cache: "no-store" });
  const data = await res.json();
  const items = data.items ?? [];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Події</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((ev: any) => (
          <article key={ev.id} className="card">
            <h2 className="text-lg font-semibold">{ev.title}</h2>
            <div className="text-sm text-gray-500">{new Date(ev.startAt).toLocaleString("uk-UA")}</div>
          </article>
        ))}
        {items.length === 0 && <div className="muted">Поки подій немає (демо).</div>}
      </div>
    </div>
  );
}
