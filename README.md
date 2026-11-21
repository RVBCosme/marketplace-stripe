# Marketplace

A mini Facebook-style Marketplace: post an item with a photo, browse by category, search, open a listing, and message the seller. Built with Next.js, React, Tailwind CSS, shadcn/ui and Supabase.

**Live app:** https://rene-cosme-marketplace.vercel.app

## What it does

- **Create listing** (`/create`): upload a photo (click or drag and drop), then enter a title, price, category, description, location and your email. A live preview shows how the listing will look. Photos go to Supabase Storage and the listing is saved in Supabase.
- **Browse and search** (`/`): all listings in a responsive grid, newest first, with category tabs (a sidebar on desktop, scrolling tabs on phones). Keyword search matches titles and descriptions and keeps the selected category.
- **Listing page** (`/item/[id]`): the photo, price, when and where it was listed, category, details and the seller's email.
- **Message Seller**: buyers write a message and leave their email; it is saved in the Supabase `messages` table. The seller's email is filled in by the database from the listing.
- No login needed. The 12 sample listings use illustrated product pictures and `example.com` seller emails.

## How the data is protected

The browser only has the Supabase public key, so the database enforces the rules itself (`supabase/schema.sql`, based on the challenge's schema):

- Row Level Security: anyone can read and add listings and send messages; nobody can edit or delete through the public key.
- Messages can be sent but not read back by visitors, because they contain buyers' email addresses.
- Check constraints: titles 1-100 characters, prices from 0, one of the 18 categories, valid emails, descriptions up to 2,000 characters, messages up to 1,000, and photos must come from this project's `listing-images` bucket.
- Triggers set ids and times on the server, trim text before the checks run, and copy the seller's email onto each message from the listing.
- The `listing-images` bucket accepts images only, up to 5 MB.

## Stack

- Next.js 16 (App Router, Cache Components with streaming) and React 19, TypeScript
- Tailwind CSS 4 and shadcn/ui (Button, Input, Textarea, Label, Badge, Card)
- Supabase: Postgres and Storage (`@supabase/supabase-js`)
- Vitest for the listing rules (categories, prices, validation, search, time labels)
- Deployed on Vercel

## Run it locally

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor (change the project URL in the `image_url` check to yours).
2. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (your project URL and its publishable or anon key).
3. Then:

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests
npm run build    # production build
```

## Built with AI

Built with the help of an AI coding assistant (Claude Code). I checked it with unit tests and an end-to-end browser run against the real database: creating a listing with a photo, browsing, category tabs, search, the listing page, Message Seller, a missing listing and the phone layout. I also probed the database with the public key (bad prices, categories, emails and photo links, edits, deletes and reading messages are all refused).

By Rene Vincent Cosme · [Portfolio](https://renevincentcosme.vercel.app) · [GitHub](https://github.com/RVBCosme)
