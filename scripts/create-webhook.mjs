// Registers this app's webhook endpoint in the Stripe sandbox (run once after deploying):
//   node --env-file=.env.local scripts/create-webhook.mjs https://your-app.vercel.app
// Prints the signing secret: add it as STRIPE_WEBHOOK_SECRET in .env.local and Vercel, then redeploy.
import Stripe from "stripe";

const base = process.argv[2];
if (!base) throw new Error("Pass your production URL, e.g. https://your-app.vercel.app");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpoint = await stripe.webhookEndpoints.create({
  url: `${base.replace(/\/$/, "")}/api/stripe/webhook`,
  connect: true, // direct charges happen on sellers' connected accounts
  enabled_events: ["checkout.session.completed", "account.updated"],
});

console.log("Webhook endpoint:", endpoint.id, endpoint.url);
console.log("Signing secret:", endpoint.secret);
