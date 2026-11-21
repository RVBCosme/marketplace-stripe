import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CircleCheck, Clock, Database, Webhook } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatCents, isUuid } from "@/lib/listings";
import { getCheckoutListing, getOrder, recordOrder } from "@/lib/server-db";
import { APP_TAG, getStripe } from "@/lib/stripe";

export const metadata: Metadata = { title: "Order confirmed" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function SuccessPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col p-4">
      <Suspense fallback={<p className="rounded-lg border bg-white p-5 text-muted-foreground">Confirming your payment with Stripe…</p>}>
        <Order searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function Problem({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border bg-white p-5">
      <h1 className="text-xl font-bold">We couldn&apos;t find that payment</h1>
      <p className="text-muted-foreground">{text}</p>
      <Link href="/" className={buttonVariants({ size: "lg", className: "px-4 font-semibold" })}>
        Back to Marketplace
      </Link>
    </div>
  );
}

async function Order({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === "string" ? params.session_id : "";
  const listingId = typeof params.listing === "string" ? params.listing : "";
  if (!sessionId.startsWith("cs_") || !isUuid(listingId)) return <Problem text="The link is missing its order details." />;

  const listing = await getCheckoutListing(listingId);
  if (!listing?.stripe_account_id) return <Problem text="This listing isn't connected to a Stripe seller." />;

  // The session lives on the seller's connected account (direct charge).
  const session = await getStripe()
    .checkout.sessions.retrieve(sessionId, {}, { stripeAccount: listing.stripe_account_id })
    .catch(() => null);
  if (!session || session.metadata?.app !== APP_TAG || session.metadata?.listing_id !== listingId) {
    return <Problem text="Stripe doesn't have a matching payment for this listing." />;
  }
  if (session.payment_status !== "paid") return <Problem text="This payment hasn't completed yet." />;

  // The webhook normally records the order first; this makes sure the page never shows a gap.
  await recordOrder({
    listingId,
    accountId: listing.stripe_account_id,
    sessionId: session.id,
    paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    amountTotal: session.amount_total ?? 0,
    applicationFeeAmount: Number(session.metadata?.application_fee_amount ?? 0),
    currency: session.currency ?? "usd",
    buyerEmail: session.customer_details?.email ?? null,
    fromWebhook: false,
  });
  const order = await getOrder(session.id);
  if (!order) return <Problem text="The order wasn't saved. Please contact the seller." />;

  const sellerGets = order.amount_total - order.application_fee_amount;

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-white p-5 shadow-sm" role="status">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-green-700">
        <CircleCheck className="size-7" aria-hidden="true" />
        Payment successful
      </h1>
      <div className="flex gap-4">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-lg border">
          <Image src={listing.image_url} alt={listing.title} fill sizes="96px" className="object-cover" />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-lg font-semibold">{listing.title}</p>
          <p className="text-sm text-muted-foreground">Sold by {listing.seller_email}</p>
          <p className="text-sm text-muted-foreground">Receipt sent to {order.buyer_email ?? "your email"}</p>
        </div>
      </div>

      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-lg bg-muted p-4 text-[15px]">
        <dt>You paid</dt>
        <dd className="text-right font-semibold">{formatCents(order.amount_total, order.currency)}</dd>
        <dt className="text-muted-foreground">Marketplace fee (10%)</dt>
        <dd className="text-right text-muted-foreground">{formatCents(order.application_fee_amount, order.currency)}</dd>
        <dt className="text-muted-foreground">Seller receives</dt>
        <dd className="text-right text-muted-foreground">{formatCents(sellerGets, order.currency)}</dd>
      </dl>

      <ul className="flex flex-col gap-2 text-sm">
        <li className="flex items-center gap-2">
          <Database className="size-4 text-primary" aria-hidden="true" />
          Order <code className="rounded bg-muted px-1">{order.id.slice(0, 8)}</code> saved in Supabase, and the listing is marked as Sold.
        </li>
        <li className="flex items-center gap-2">
          {order.confirmed_by_webhook_at ? (
            <Webhook className="size-4 text-green-700" aria-hidden="true" />
          ) : (
            <Clock className="size-4 text-amber-600" aria-hidden="true" />
          )}
          {order.confirmed_by_webhook_at
            ? "Payment confirmed by Stripe's webhook."
            : "Verified with Stripe on this page; not yet confirmed by Stripe's webhook."}
        </li>
      </ul>

      <div className="flex flex-wrap gap-2">
        <Link href={`/item/${listing.id}`} className={buttonVariants({ size: "lg", variant: "secondary", className: "px-4 font-semibold" })}>
          View listing
        </Link>
        <Link href="/" className={buttonVariants({ size: "lg", className: "px-4 font-semibold" })}>
          Keep browsing
        </Link>
      </div>
    </div>
  );
}
