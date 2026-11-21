import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">This listing isn&apos;t available</h1>
      <p className="max-w-sm text-muted-foreground">It may have been removed, or the link is wrong.</p>
      <Link href="/" className={buttonVariants({ size: "lg", className: "px-4 font-semibold" })}>
        Browse Marketplace
      </Link>
    </main>
  );
}
