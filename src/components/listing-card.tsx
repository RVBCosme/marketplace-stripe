import Image from "next/image";
import Link from "next/link";
import { formatPrice, type Listing } from "@/lib/listings";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/item/${listing.id}`} className="group flex flex-col gap-1.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4">
      <div className="relative aspect-square overflow-hidden rounded-lg border bg-white">
        <Image
          src={listing.image_url}
          alt={listing.title}
          fill
          sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {listing.sold_at && (
          <span className="absolute top-2 left-2 rounded-md bg-foreground/85 px-2 py-0.5 text-xs font-bold tracking-wide text-white uppercase">
            Sold
          </span>
        )}
      </div>
      <div className="px-0.5">
        <p className="text-[17px] font-semibold">{formatPrice(listing.price)}</p>
        <p className="line-clamp-2 text-[15px] leading-snug">{listing.title}</p>
        <p className="text-[13px] text-muted-foreground">{listing.location}</p>
      </div>
    </Link>
  );
}

export function ListingGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="aspect-square animate-pulse rounded-lg bg-secondary" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-secondary" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-secondary" />
        </div>
      ))}
    </div>
  );
}
