import Link from "next/link";

export default function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav className="text-sm text-black/60 dark:text-white/60 mb-4 flex flex-wrap items-center gap-1">
      <Link href="/" className="hover:underline">
        Home
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="mx-1">/</span>
          {item.href ? (
            <Link href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-black/90 dark:text-white/90 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
