import { Suspense } from "react";
import type { Metadata } from "next";
import { BadgeCheck, CreditCard, Landmark } from "lucide-react";
import { ConnectStripeForm } from "@/components/connect-stripe-form";
import { PLATFORM_FEE_PERCENT } from "@/lib/listings";

export const metadata: Metadata = { title: "Get paid with Stripe" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function SellPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-4 p-4">
      <div className="flex flex-col gap-4 rounded-lg border bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Get paid with Stripe</h1>
          <p className="mt-1 text-muted-foreground">
            Connect a Stripe account to the email on your listings. Once Stripe approves it, every listing with that email shows a
            <strong className="text-foreground"> Buy Now </strong>button.
          </p>
        </div>
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex gap-2">
            <BadgeCheck className="size-5 shrink-0 text-primary" aria-hidden="true" />
            Stripe handles identity checks and onboarding on its own secure pages.
          </li>
          <li className="flex gap-2">
            <CreditCard className="size-5 shrink-0 text-primary" aria-hidden="true" />
            Buyers pay by card through Stripe Checkout.
          </li>
          <li className="flex gap-2">
            <Landmark className="size-5 shrink-0 text-primary" aria-hidden="true" />
            You receive the payment; the marketplace keeps a {PLATFORM_FEE_PERCENT}% fee.
          </li>
        </ul>
        <Suspense fallback={<ConnectStripeForm />}>
          <PrefilledForm searchParams={searchParams} />
        </Suspense>
        <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          Test mode: this uses Stripe&apos;s sandbox, so no real money moves. On Stripe&apos;s pages you can use their test data (for
          example the test phone number, code 000-000 and the test bank account).
        </p>
      </div>
    </main>
  );
}

async function PrefilledForm({ searchParams }: { searchParams: SearchParams }) {
  const email = (await searchParams).email;
  return <ConnectStripeForm defaultEmail={typeof email === "string" ? email : ""} />;
}
