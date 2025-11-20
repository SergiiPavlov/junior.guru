export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-gray-500">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && <span>/</span>}
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  className="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
                >
                  {item.label}
                </a>
              ) : (
                <span className={isLast ? "font-medium text-gray-700" : ""}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
