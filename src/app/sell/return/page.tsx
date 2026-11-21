import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, Clock } from "lucide-react";
import { ConnectStripeForm } from "@/components/connect-stripe-form";
import { buttonVariants } from "@/components/ui/button";
import { isEmail } from "@/lib/listings";
import { getSeller, updateSeller } from "@/lib/server-db";
import { getStripe } from "@/lib/stripe";

export const metadata: Metadata = { title: "Stripe onboarding" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ReturnPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col p-4">
      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <Suspense fallback={<p className="text-muted-foreground">Checking your Stripe account…</p>}>
          <Status searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Status({ searchParams }: { searchParams: SearchParams }) {
  const raw = (await searchParams).email;
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  const seller = isEmail(email) ? await getSeller(email) : null;
  if (!seller) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">No Stripe account found</h1>
        <p className="text-muted-foreground">Start again with the email on your listings.</p>
        <ConnectStripeForm defaultEmail={email} />
      </div>
    );
  }

  // Ask Stripe for the latest status (the account.updated webhook keeps it in sync too).
  const account = await getStripe().accounts.retrieve(seller.stripe_account_id);
  await updateSeller(account.id, account.charges_enabled, account.details_submitted);

  if (account.charges_enabled) {
    return (
      <div className="flex flex-col gap-3" role="status">
        <h1 className="flex items-center gap-2 text-xl font-bold text-green-700">
          <CircleCheck className="size-6" aria-hidden="true" />
          You&apos;re ready to get paid
        </h1>
        <p>
          Stripe onboarding is complete for <strong>{email}</strong>. Your listings with this email now show a <strong>Buy Now</strong> button.
        </p>
        <p className="text-sm text-muted-foreground">Stripe account {account.id}</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className={buttonVariants({ size: "lg", className: "px-4 font-semibold" })}>
            Browse Marketplace
          </Link>
          <Link href="/create" className={buttonVariants({ size: "lg", variant: "secondary", className: "px-4 font-semibold" })}>
            Create new listing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <Clock className="size-6 text-amber-600" aria-hidden="true" />
        Stripe needs a few more details
      </h1>
      <p className="text-muted-foreground">
        {account.details_submitted
          ? "Stripe is reviewing your details. This page updates when you refresh it."
          : "Onboarding isn't finished yet. Continue where you left off."}
      </p>
      <ConnectStripeForm defaultEmail={email} label="Continue onboarding" />
    </div>
  );
}
