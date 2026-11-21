import Link from "next/link";
import { CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canCheckout, formatPrice, type Listing } from "@/lib/listings";
import { supabase } from "@/lib/supabase";

/** Buy Now for listings whose seller finished Stripe onboarding; otherwise explains why not. */
export async function BuyBox({ listing, checkoutError }: { listing: Listing; checkoutError: boolean }) {
  if (listing.sold_at) {
    return (
      <div className="rounded-lg border bg-muted p-4">
        <p className="font-semibold">Sold</p>
        <p className="text-sm text-muted-foreground">This item has already been bought.</p>
      </div>
    );
  }

  if (!canCheckout(listing.price)) return null; // Free items: just message the seller.

  const { data: seller } = await supabase
    .from("sellers")
    .select("charges_enabled")
    .eq("email", listing.seller_email)
    .maybeSingle();
  const ready = !!seller?.charges_enabled;

  if (!ready) {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-dashed p-4 text-sm">
        <p className="font-medium">Online payment isn&apos;t set up for this item</p>
        <p className="text-muted-foreground">The seller hasn&apos;t connected Stripe yet. You can still message them below.</p>
        <Link href={`/sell?email=${encodeURIComponent(listing.seller_email)}`} className="mt-1 w-fit font-medium text-primary hover:underline">
          Is this your listing? Get paid with Stripe
        </Link>
      </div>
    );
  }

  return (
    <form action="/api/checkout" method="post" className="flex flex-col gap-2">
      <input type="hidden" name="listing_id" value={listing.id} />
      {checkoutError && (
        <p role="alert" className="text-sm text-destructive">
          This item can&apos;t be bought right now. Please try again or message the seller.
        </p>
      )}
      <Button type="submit" size="lg" className="h-11 text-[15px] font-semibold">
        <CreditCard className="size-5" aria-hidden="true" />
        Buy Now · {formatPrice(listing.price)}
      </Button>
      <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <Lock className="size-3" aria-hidden="true" />
        Secure checkout by Stripe (test mode: card 4242 4242 4242 4242)
      </p>
    </form>
  );
}
