import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { SearchForm } from "@/components/search-form";
import { buttonVariants } from "@/components/ui/button";
import { CATEGORIES, categorySlug, type Category } from "@/lib/listings";
import { cn } from "@/lib/utils";

function hrefFor(category: Category | null, q: string) {
  const params = new URLSearchParams();
  if (category) params.set("category", categorySlug(category));
  if (q) params.set("q", q);
  const s = params.toString();
  return s ? `/?${s}` : "/";
}

/** Desktop: the left sidebar with search and the category list. */
export function CategorySidebar({ active, q }: { active: Category | null; q: string }) {
  const item = (selected: boolean) =>
    cn(
      "flex items-center gap-3 rounded-lg px-2 py-1.5 text-[15px] font-medium transition-colors hover:bg-muted",
      selected && "bg-muted"
    );
  const icon = (selected: boolean) =>
    cn(
      "flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary",
      selected && "bg-primary text-white"
    );

  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-[300px] shrink-0 overflow-y-auto border-r bg-white px-3 py-4 lg:block">
      <h1 className="px-2 text-2xl font-bold">Marketplace</h1>
      <div className="mt-3 px-1">
        <SearchForm q={q} category={active} />
      </div>
      <nav aria-label="Categories" className="mt-3 flex flex-col gap-0.5">
        <Link href={hrefFor(null, q)} className={item(!active)} aria-current={!active ? "page" : undefined}>
          <span className={icon(!active)}>
            <LayoutGrid className="size-5" aria-hidden="true" />
          </span>
          Browse all
        </Link>
        <Link href="/create" className={cn(buttonVariants({ variant: "secondary", className: "my-2 h-9 gap-1.5 bg-accent text-primary hover:bg-accent/80" }))}>
          <Plus className="size-4" aria-hidden="true" />
          Create new listing
        </Link>
        <h2 className="mt-2 mb-1 border-t px-2 pt-3 text-[17px] font-semibold">Categories</h2>
        {CATEGORIES.map((c) => {
          const selected = active === c;
          return (
            <Link key={c} href={hrefFor(c, q)} className={item(selected)} aria-current={selected ? "page" : undefined}>
              <span className={icon(selected)}>
                <CategoryIcon category={c} className="size-5" />
              </span>
              {c}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/** Phones and tablets: search plus category tabs that scroll sideways. */
export function CategoryTabs({ active, q }: { active: Category | null; q: string }) {
  const tab = (selected: boolean) =>
    cn(
      "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap",
      selected ? "bg-accent text-primary" : "bg-secondary text-foreground"
    );
  return (
    <div className="flex flex-col gap-3 lg:hidden">
      <SearchForm q={q} category={active} onGray />
      <nav aria-label="Categories" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href={hrefFor(null, q)} className={tab(!active)} aria-current={!active ? "page" : undefined}>
          All
        </Link>
        {CATEGORIES.map((c) => (
          <Link key={c} href={hrefFor(c, q)} className={tab(active === c)} aria-current={active === c ? "page" : undefined}>
            <CategoryIcon category={c} className="size-4" />
            {c}
          </Link>
        ))}
      </nav>
    </div>
  );
}
