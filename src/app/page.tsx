import { Suspense } from "react";
import Link from "next/link";
import { CategorySidebar, CategoryTabs } from "@/components/category-nav";
import { ListingCard, ListingGridSkeleton } from "@/components/listing-card";
import { buttonVariants } from "@/components/ui/button";
import { categoryFromSlug, searchTerm } from "@/lib/listings";
import { getListings } from "@/lib/queries";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Marketplace searchParams={searchParams} />
    </Suspense>
  );
}

async function Marketplace({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const category = categoryFromSlug(first(params.category));
  const q = searchTerm(first(params.q));
  const listings = await getListings({ category, q });

  const heading = q ? `Results for “${q}”` : category ?? "Today's picks";

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-1">
      <CategorySidebar active={category} q={q} />
      <main className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4 lg:px-6">
        <CategoryTabs active={category} q={q} />
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-bold">{heading}</h2>
          <p className="text-sm text-muted-foreground">
            {listings.length} {listings.length === 1 ? "listing" : "listings"}
            {q && category ? ` in ${category}` : ""}
          </p>
        </div>

        {listings.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-white px-6 py-16 text-center">
            <p className="text-lg font-semibold">No listings found</p>
            <p className="max-w-sm text-muted-foreground">
              {q ? "Try a different keyword or another category." : "Nothing here yet. Be the first to sell something!"}
            </p>
            <Link href="/create" className={buttonVariants({ size: "lg", className: "px-4 font-semibold" })}>
              Create new listing
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-label="Listings">
            {listings.map((listing) => (
              <li key={listing.id}>
                <ListingCard listing={listing} />
              </li>
            ))}
          </ul>
        )}

        <footer className="mt-auto pt-8 pb-2 text-center text-xs text-muted-foreground">
          Built by Rene Vincent Cosme with Next.js, React, Tailwind CSS, shadcn/ui and Supabase ·{" "}
          <a className="underline-offset-2 hover:underline" href="https://github.com/RVBCosme/marketplace">
            Source on GitHub
          </a>
        </footer>
      </main>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-1">
      <aside className="hidden w-[300px] shrink-0 border-r bg-white lg:block" />
      <main className="flex-1 px-4 py-4 lg:px-6">
        <div className="mb-4 h-7 w-40 animate-pulse rounded bg-secondary" />
        <ListingGridSkeleton />
      </main>
    </div>
  );
}
