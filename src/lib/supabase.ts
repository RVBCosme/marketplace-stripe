import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in."
  );
}

// The public key is safe in the browser: Row Level Security only lets visitors read and add
// listings, send messages (without reading them back) and upload photos to listing-images.
export const supabase = createClient(url, key, { auth: { persistSession: false } });

export const PHOTO_BUCKET = "listing-images";
