import Link from "next/link";

export default function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  const other = locale === "uk" ? "en" : "uk";
  return (
    <section>
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
        <div className="container flex items-center gap-4 py-3">
          <div className="font-bold text-xl">Junior UA</div>
          <nav className="flex gap-4">
            <Link href={`/${locale}`}>Головна</Link>
            <Link href={`/${locale}/jobs`}>Вакансії</Link>
            <Link href={`/${locale}/events`}>Події</Link>
          </nav>
          <div className="ml-auto">
            <Link className="underline" href={`/${other}`}>{other.toUpperCase()}</Link>
          </div>
        </div>
      </header>
      <main className="container py-6">{children}</main>
      <footer className="border-t mt-8">
        <div className="container py-6 text-sm text-gray-500">
          © {new Date().getFullYear()} Junior UA — стартова версія
        </div>
      </footer>
    </section>
  );
}
