// Sends a correctly signed checkout.session.completed event for a real paid session to a local
// server, the same way Stripe would, to check the webhook route without registering an endpoint.
//   node --env-file=.env.local scripts/test-webhook-local.mjs <session id> <connected account id> [base url]
import Stripe from "stripe";

const [sessionId, account, base = "http://localhost:3126"] = process.argv.slice(2);
if (!sessionId || !account) throw new Error("Usage: test-webhook-local.mjs <cs_...> <acct_...> [base url]");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const secret = process.env.STRIPE_WEBHOOK_SECRET;
const session = await stripe.checkout.sessions.retrieve(sessionId, {}, { stripeAccount: account });

const event = {
  id: `evt_local_${Date.now()}`,
  object: "event",
  type: "checkout.session.completed",
  account,
  api_version: null,
  created: Math.floor(Date.now() / 1000),
  livemode: false,
  data: { object: session },
};
const payload = JSON.stringify(event);
const url = `${base}/api/stripe/webhook`;

async function send(label, signature) {
  const res = await fetch(url, { method: "POST", headers: { "stripe-signature": signature, "content-type": "application/json" }, body: payload });
  console.log(`${label}: HTTP ${res.status} ${await res.text()}`);
}

await send("bad signature", stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_wrong" }));
await send("signed event", stripe.webhooks.generateTestHeaderString({ payload, secret }));
