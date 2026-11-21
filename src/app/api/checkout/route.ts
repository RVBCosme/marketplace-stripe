import { NextResponse } from "next/server";
import { canCheckout, isUuid, platformFeeCents, toCents } from "@/lib/listings";
import { getCheckoutListing } from "@/lib/server-db";
import { APP_TAG, getStripe } from "@/lib/stripe";

/**
 * Buy Now: creates a Stripe Checkout Session on the seller's connected account (a direct charge)
 * with a 10% application fee for the marketplace, then redirects the buyer to Stripe.
 */
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const form = await request.formData();
  const listingId = String(form.get("listing_id") ?? "");
  if (!isUuid(listingId)) return NextResponse.redirect(`${origin}/`, 303);

  const unavailable = NextResponse.redirect(`${origin}/item/${listingId}?checkout=unavailable`, 303);

  try {
    const listing = await getCheckoutListing(listingId);
    // Only unsold items from sellers who finished Stripe onboarding can be bought.
    if (!listing || listing.sold_at || !listing.stripe_account_id || !listing.charges_enabled || !canCheckout(listing.price)) {
      return unavailable;
    }

    const amount = toCents(listing.price);
    const fee = platformFeeCents(amount);
    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: amount,
              product_data: { name: listing.title, images: [listing.image_url] },
            },
          },
        ],
        payment_intent_data: { application_fee_amount: fee },
        // Keep the window short in which two buyers could both be paying for the same item.
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&listing=${listing.id}`,
        cancel_url: `${origin}/item/${listing.id}`,
        metadata: { app: APP_TAG, listing_id: listing.id, application_fee_amount: String(fee) },
      },
      { stripeAccount: listing.stripe_account_id }
    );
    if (!session.url) return unavailable;
    return NextResponse.redirect(session.url, 303);
  } catch (err) {
    console.error("checkout failed", err);
    return unavailable;
  }
}
