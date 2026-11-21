import Form from "next/form";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { categorySlug, type Category } from "@/lib/listings";
import { cn } from "@/lib/utils";

/** Keyword search. Submits to /?q=... and keeps the selected category. */
export function SearchForm({ q, category, onGray = false }: { q: string; category: Category | null; onGray?: boolean }) {
  return (
    <Form action="/" role="search" className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        name="q"
        type="search"
        defaultValue={q}
        placeholder={category ? `Search ${category}` : "Search Marketplace"}
        aria-label="Search listings"
        maxLength={60}
        className={cn("h-10 rounded-full pl-9 text-[15px]", onGray ? "border-border bg-white" : "border-transparent bg-muted")}
      />
      {category && <input type="hidden" name="category" value={categorySlug(category)} />}
    </Form>
  );
}
