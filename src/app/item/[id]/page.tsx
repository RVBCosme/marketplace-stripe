import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Mail, MapPin } from "lucide-react";
import { BuyBox } from "@/components/buy-box";
import { CategoryIcon } from "@/components/category-icon";
import { MessageSeller } from "@/components/message-seller";
import { Badge } from "@/components/ui/badge";
import { categorySlug, formatPrice, timeAgo } from "@/lib/listings";
import { getListing } from "@/lib/queries";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ItemPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  return (
    <Suspense fallback={<ItemSkeleton />}>
      <Item params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Item({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params;
  const checkoutError = (await searchParams).checkout === "unavailable";
  const listing = await getListing(id);
  if (!listing) notFound();

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <section className="relative flex h-[56vh] min-h-[300px] items-center justify-center overflow-hidden bg-[#18191a] lg:h-[calc(100dvh-3.5rem)] lg:flex-1">
        {/* Blurred copy of the photo fills the background, like Marketplace's photo viewer. */}
        <Image src={listing.image_url} alt="" fill sizes="10vw" className="scale-110 object-cover opacity-40 blur-2xl" aria-hidden="true" />
        <Image src={listing.image_url} alt={listing.title} fill priority sizes="(min-width: 1024px) 70vw, 100vw" className="object-contain" />
        <Link
          href="/"
          className="absolute top-3 left-3 flex size-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
          aria-label="Back to Marketplace"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
      </section>

      <aside className="flex w-full flex-col gap-4 bg-white p-4 lg:h-[calc(100dvh-3.5rem)] lg:w-[400px] lg:shrink-0 lg:overflow-y-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl leading-tight font-bold">{listing.title}</h1>
          <p className="flex items-center gap-2 text-xl font-semibold">
            {formatPrice(listing.price)}
            {listing.sold_at && <Badge className="bg-foreground px-2 text-white">Sold</Badge>}
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden="true" />
              Listed <time dateTime={listing.created_at}>{timeAgo(listing.created_at)}</time>
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {listing.location}
            </span>
          </p>
          <Link href={`/?category=${categorySlug(listing.category)}`} className="mt-1 w-fit">
            <Badge variant="secondary" className="gap-1 px-2.5 py-3 text-sm">
              <CategoryIcon category={listing.category} className="size-3.5" />
              {listing.category}
            </Badge>
          </Link>
        </div>

        <BuyBox listing={listing} checkoutError={checkoutError} />

        <section className="flex flex-col gap-1 border-t pt-4">
          <h2 className="text-[17px] font-semibold">Details</h2>
          <p className="text-[15px] whitespace-pre-wrap break-words">
            {listing.description || <span className="text-muted-foreground">The seller didn&apos;t add a description.</span>}
          </p>
        </section>

        <section className="flex flex-col gap-2 border-t pt-4">
          <h2 className="text-[17px] font-semibold">Seller information</h2>
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-primary uppercase" aria-hidden="true">
              {listing.seller_email.charAt(0)}
            </span>
            <a href={`mailto:${listing.seller_email}`} className="flex min-w-0 items-center gap-1.5 text-[15px] font-medium hover:underline">
              <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{listing.seller_email}</span>
            </a>
          </div>
        </section>

        <MessageSeller listingId={listing.id} />
      </aside>
    </div>
  );
}

function ItemSkeleton() {
  return (
    <div className="flex flex-1 flex-col lg:flex-row" aria-hidden="true">
      <div className="h-[56vh] min-h-[300px] bg-[#18191a] lg:h-[calc(100dvh-3.5rem)] lg:flex-1" />
      <div className="flex w-full flex-col gap-3 bg-white p-4 lg:w-[400px]">
        <div className="h-7 w-3/4 animate-pulse rounded bg-secondary" />
        <div className="h-6 w-1/4 animate-pulse rounded bg-secondary" />
        <div className="h-24 animate-pulse rounded bg-secondary" />
      </div>
    </div>
  );
}
