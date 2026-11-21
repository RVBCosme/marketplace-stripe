import Link from "next/link";
import { Plus, Store } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 bg-white shadow-sm">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Marketplace home">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary text-white">
            <Store className="size-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-tight">Marketplace</span>
        </Link>
        <Link href="/create" className={buttonVariants({ size: "lg", className: "gap-1.5 px-3 font-semibold" })}>
          <Plus className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Create new listing</span>
          <span className="sm:hidden">Sell</span>
        </Link>
      </div>
    </header>
  );
}
