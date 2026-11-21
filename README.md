# Marketplace + Stripe Connect

The Marketplace from Test 3 ([repo](https://github.com/RVBCosme/marketplace)), now with payments: sellers connect a Stripe account, buyers press **Buy Now** and pay with Stripe Checkout, the seller is paid, and the marketplace keeps a 10% fee. Built with Next.js, React, Tailwind CSS, shadcn/ui, Supabase and Stripe Connect. Everything runs in Stripe's sandbox (test mode), so no real money moves.

**Live app:** https://rene-cosme-marketplace-stripe.vercel.app

## Try a purchase

1. Open a listing that shows **Buy Now**, for example the Trek FX 2 hybrid bike (its seller, maya.chen@example.com, finished Stripe onboarding).
2. Press **Buy Now** and pay with the test card `4242 4242 4242 4242`, any future expiry date, any CVC and any ZIP code.
3. The success page shows the amount, the 10% fee and the order saved in Supabase, and the listing now shows **Sold**.

## How it works

- **Seller onboarding** (`/sell`): a seller enters the email on their listings and presses **Connect with Stripe**. The server creates a Stripe connected account (Express dashboard, the platform pays Stripe's fees), saves its account id in Supabase, and sends the seller to Stripe's hosted onboarding. `/sell/return` checks the account with Stripe when they come back.
- **Buy Now**: listings whose seller can take payments show the button; other listings can't be bought (they show "Online payment isn't set up"). Sold items and free items can't be bought either.
- **Pay the seller**: `/api/checkout` creates the Checkout Session on the seller's connected account (a direct charge) with an `application_fee_amount` of 10% for the marketplace.
- **Order confirmation**: a Stripe webhook (`/api/stripe/webhook`, for `connect: true` events) verifies the signature, records the order in Supabase and marks the listing as Sold. It also keeps sellers' status in sync from `account.updated`. The sandbox is shared, so events that aren't this app's are ignored. The success page also verifies the payment with Stripe and saves the order (idempotently), and shows whether the webhook has confirmed it.

> **Webhook endpoint note:** Stripe allows 16 test webhook endpoints per account, and the shared sandbox had already reached that limit (all other candidates' endpoints), so `scripts/create-webhook.mjs` couldn't register this app's endpoint yet. The route is deployed and verified: `scripts/test-webhook-local.mjs` sends a correctly signed `checkout.session.completed` event for a real paid session (a bad signature gets 400; the signed event gets 200 and sets `confirmed_by_webhook_at`). Once a slot is free, running `create-webhook.mjs` and adding `STRIPE_WEBHOOK_SECRET` to Vercel turns it on with no code changes. Until then, purchases still complete through the success page.

## How the data is protected

- The Stripe secret key, the webhook secret and a server secret stay on the server (Vercel environment variables); none are in this repo.
- `supabase/stripe.sql` adds `sellers`, `orders` and `listings.sold_at`. Visitors can see which seller emails take payments, but not their Stripe account ids, and can't read orders.
- Writes to sellers and orders go through Postgres functions that refuse to run without the server secret (only its SHA-256 hash is stored in the database), so nobody can attach their own Stripe account to someone's listings or mark an item as paid from the browser.
- Without a login, a seller is identified by the email on their listings, as the challenge allows. The first Stripe account connected to an email keeps it. A real deployment would verify the email (a one-time link or Supabase Auth) before connecting payouts.
- Checkout Sessions expire after 30 minutes. Two buyers paying for the same item at the same moment would both be charged; both orders are recorded, and the listing keeps the first sale time. A production version would reserve the item at checkout or refund the second payment automatically.

## Stack

- Next.js 16 (App Router, Cache Components) and React 19, TypeScript
- Tailwind CSS 4 and shadcn/ui
- Supabase: Postgres and Storage
- Stripe: Connect (connected accounts and Account Links), Checkout, webhooks (`stripe` Node SDK)
- Vitest unit tests for the listing and payment rules (prices in cents, the 10% fee, what can be bought)
- Deployed on Vercel

## Run it locally

1. Set up Supabase as in the [Test 3 repo](https://github.com/RVBCosme/marketplace) (`supabase/schema.sql`), then run `supabase/stripe.sql` and store your server secret's hash as described at the top of that file.
2. Copy `.env.example` to `.env.local` and fill it in (Supabase URL and public key, Stripe sandbox keys, a server secret).
3. Deploy, then register the webhook once: `node --env-file=.env.local scripts/create-webhook.mjs https://your-app.vercel.app`, and add the printed `STRIPE_WEBHOOK_SECRET` to `.env.local` and Vercel.
4. Then:

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests
npm run build    # production build
```

## Built with AI

Built with the help of an AI coding assistant (Claude Code). I checked it with unit tests, by onboarding a test seller through Stripe's hosted onboarding with Stripe's test data, buying with the 4242 test card (a direct charge on the seller's account with a $1.50 fee on $15), confirming the order was saved in Supabase and the listing marked Sold, and sending the webhook a signed event. I also checked that the database refuses seller and order changes without the server secret.

By Rene Vincent Cosme · [Portfolio](https://renevincentcosme.vercel.app) · [GitHub](https://github.com/RVBCosme)
