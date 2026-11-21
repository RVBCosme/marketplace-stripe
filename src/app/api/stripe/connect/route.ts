import { NextResponse } from "next/server";
import { isEmail } from "@/lib/listings";
import { getSeller, saveSeller } from "@/lib/server-db";
import { APP_TAG, getStripe } from "@/lib/stripe";

/**
 * Starts (or resumes) Stripe onboarding for the seller with this email.
 * Body: { email }. Returns { url } to send the seller to.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isEmail(email)) {
    return NextResponse.json({ error: "Enter the email you use on your listings." }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const back = `${origin}/sell/return?email=${encodeURIComponent(email)}`;

  try {
    const stripe = getStripe();
    let seller = await getSeller(email);

    if (!seller) {
      // A seller account controlled by this marketplace, with Stripe's Express dashboard.
      const account = await stripe.accounts.create({
        country: "US",
        email,
        business_type: "individual",
        controller: {
          stripe_dashboard: { type: "express" },
          fees: { payer: "application" },
          losses: { payments: "stripe" },
          requirement_collection: "stripe",
        },
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_profile: { product_description: "Second-hand items sold on Marketplace" },
        metadata: { app: APP_TAG },
      });
      await saveSeller(email, account.id);
      // If two requests raced, the first saved account wins.
      seller = await getSeller(email);
    }
    if (!seller) throw new Error("Seller wasn't saved.");

    if (seller.charges_enabled) return NextResponse.json({ url: back });

    const link = await stripe.accountLinks.create({
      account: seller.stripe_account_id,
      type: "account_onboarding",
      refresh_url: `${origin}/sell?email=${encodeURIComponent(email)}`,
      return_url: back,
    });
    return NextResponse.json({ url: link.url });
  } catch (err) {
    console.error("connect failed", err);
    return NextResponse.json({ error: "Couldn't start Stripe onboarding. Please try again." }, { status: 500 });
  }
}
