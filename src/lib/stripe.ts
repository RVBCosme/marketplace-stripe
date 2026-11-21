// Server only: the Stripe secret key never reaches the browser.
import Stripe from "stripe";

/** Tags this app's Checkout Sessions. The Stripe sandbox is shared with other apps, so the webhook ignores anything without it. */
export const APP_TAG = "rene-cosme-marketplace";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Missing STRIPE_SECRET_KEY. Add it to .env.local and to Vercel.");
    client = new Stripe(key);
  }
  return client;
}
