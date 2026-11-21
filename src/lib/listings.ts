// Listing rules shared by the pages, the forms and the tests.
// The database enforces the same limits (supabase/schema.sql).

export const CATEGORIES = [
  "Vehicles",
  "Property Rentals",
  "Apparel",
  "Classifieds",
  "Electronics",
  "Entertainment",
  "Family",
  "Free Stuff",
  "Garden & Outdoor",
  "Hobbies",
  "Home Goods",
  "Home Improvement",
  "Home Sales",
  "Musical Instruments",
  "Office Supplies",
  "Pet Supplies",
  "Sporting Goods",
  "Toys & Games",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const MAX_TITLE = 100;
export const MAX_DESCRIPTION = 2000;
export const MAX_LOCATION = 80;
export const MAX_MESSAGE = 1000;
export const MAX_PRICE = 99_999_999.99;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const DEFAULT_LOCATION = "Palo Alto, CA";
export const FEED_LIMIT = 60;

export type Listing = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: Category;
  seller_email: string;
  image_url: string;
  location: string;
  created_at: string;
  sold_at: string | null;
};

export const LISTING_COLUMNS = "id, title, description, price, category, seller_email, image_url, location, created_at, sold_at";

/** "Garden & Outdoor" -> "garden-and-outdoor" */
export function categorySlug(category: Category): string {
  return category.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function categoryFromSlug(slug: string | undefined | null): Category | null {
  if (!slug) return null;
  return CATEGORIES.find((c) => categorySlug(c) === slug) ?? null;
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export function isEmail(value: string): boolean {
  const v = value.trim();
  return v.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
}

/** Parses what a seller typed in the price box: "1,250", "12.5", "0". Returns null if it isn't a valid price. */
export function parsePrice(input: string): number | null {
  const cleaned = input.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return value <= MAX_PRICE ? value : null;
}

/** 0 -> "Free", 1250 -> "$1,250", 12.5 -> "$12.50" */
export function formatPrice(value: number | string): string {
  const n = Number(value);
  if (n === 0) return "Free";
  const whole = Number.isInteger(n);
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export type ListingInput = {
  title: string;
  description: string;
  price: string;
  category: string;
  email: string;
  location: string;
  hasPhoto: boolean;
};

export type FieldErrors = Partial<Record<keyof ListingInput, string>>;

export function validateListing(input: ListingInput): FieldErrors {
  const errors: FieldErrors = {};
  const title = input.title.trim();
  if (!input.hasPhoto) errors.hasPhoto = "Add a photo of your item.";
  if (!title) errors.title = "Add a title.";
  else if (title.length > MAX_TITLE) errors.title = `Keep the title under ${MAX_TITLE} characters.`;
  if (parsePrice(input.price) === null) errors.price = "Enter a price, like 25 or 12.50 (0 for free).";
  if (!isCategory(input.category)) errors.category = "Choose a category.";
  if (input.description.trim().length > MAX_DESCRIPTION)
    errors.description = `Keep the description under ${MAX_DESCRIPTION} characters.`;
  if (!isEmail(input.email)) errors.email = "Enter an email address buyers can reach you at.";
  if (input.location.trim().length > MAX_LOCATION) errors.location = `Keep the location under ${MAX_LOCATION} characters.`;
  return errors;
}

export function validatePhoto(file: { type: string; size: number }): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return "Photos must be JPG, PNG, GIF or WebP.";
  if (file.size > MAX_PHOTO_BYTES) return "Photos must be 5 MB or smaller.";
  return null;
}

export function validateMessage(input: { buyerEmail: string; message: string }): { buyerEmail?: string; message?: string } {
  const errors: { buyerEmail?: string; message?: string } = {};
  if (!isEmail(input.buyerEmail)) errors.buyerEmail = "Enter your email so the seller can reply.";
  const message = input.message.trim();
  if (!message) errors.message = "Write a message.";
  else if (message.length > MAX_MESSAGE) errors.message = `Keep the message under ${MAX_MESSAGE} characters.`;
  return errors;
}

/**
 * Cleans a search box value so it can go inside a Supabase `or` filter.
 * Keeps letters, numbers, spaces and a few safe symbols; drops filter syntax like , ( ) * % and quotes.
 */
export function searchTerm(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw
    .replace(/[^\p{L}\p{N}\s\-'.&+#/]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export function timeAgo(iso: string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: string): boolean {
  return UUID.test(value);
}

// ---- Payments (Stripe Connect) ----

/** The marketplace keeps 10% of each sale. */
export const PLATFORM_FEE_PERCENT = 10;
/** Stripe's smallest card charge in USD. Cheaper (and free) items can't be bought online. */
export const MIN_CHECKOUT_PRICE = 0.5;

export function toCents(price: number | string): number {
  return Math.round(Number(price) * 100);
}

export function platformFeeCents(amountCents: number): number {
  return Math.round((amountCents * PLATFORM_FEE_PERCENT) / 100);
}

export function canCheckout(price: number | string): boolean {
  return Number(price) >= MIN_CHECKOUT_PRICE;
}

export function formatCents(cents: number, currency = "usd"): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: currency.toUpperCase() });
}
