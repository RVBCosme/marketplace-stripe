import type Stripe from "stripe";
import { recordOrder, updateSeller } from "@/lib/server-db";
import { APP_TAG, getStripe } from "@/lib/stripe";

/**
 * Stripe Connect webhook. Registered with `connect: true`, so it receives events from sellers'
 * connected accounts (where the direct charges happen). The sandbox is shared with other apps,
 * so anything that isn't ours is acknowledged and ignored.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const listingId = session.metadata?.listing_id;
      if (session.metadata?.app === APP_TAG && listingId && event.account && session.payment_status === "paid") {
        await recordOrder({
          listingId,
          accountId: event.account,
          sessionId: session.id,
          paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
          amountTotal: session.amount_total ?? 0,
          applicationFeeAmount: Number(session.metadata.application_fee_amount ?? 0),
          currency: session.currency ?? "usd",
          buyerEmail: session.customer_details?.email ?? null,
          fromWebhook: true,
        });
      }
    } else if (event.type === "account.updated") {
      const account = event.data.object;
      await updateSeller(account.id, account.charges_enabled, account.details_submitted); // no-op for other apps' accounts
    }
  } catch (err) {
    console.error("webhook handling failed", event.type, err);
    return new Response("Webhook handler failed", { status: 500 }); // Stripe will retry
  }

  return Response.json({ received: true });
}
