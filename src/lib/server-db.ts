// Server only: database calls that need SERVER_RPC_SECRET (see supabase/stripe.sql).
import { supabase } from "@/lib/supabase";

function secret(): string {
  const s = process.env.SERVER_RPC_SECRET;
  if (!s) throw new Error("Missing SERVER_RPC_SECRET. Add it to .env.local and to Vercel.");
  return s;
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, { p_secret: secret(), ...args });
  if (error) throw new Error(`${fn} failed: ${error.message}`);
  return data as T;
}

export type Seller = { email: string; stripe_account_id: string; charges_enabled: boolean; details_submitted: boolean };

export async function getSeller(email: string): Promise<Seller | null> {
  const rows = await rpc<Seller[]>("server_get_seller", { p_email: email });
  return rows[0] ?? null;
}

export async function saveSeller(email: string, accountId: string): Promise<void> {
  await rpc("server_save_seller", { p_email: email, p_account_id: accountId });
}

/** Returns false if the account isn't one of this app's sellers. */
export async function updateSeller(accountId: string, chargesEnabled: boolean, detailsSubmitted: boolean): Promise<boolean> {
  return rpc<boolean>("server_update_seller", {
    p_account_id: accountId,
    p_charges_enabled: chargesEnabled,
    p_details_submitted: detailsSubmitted,
  });
}

export type CheckoutListing = {
  id: string;
  title: string;
  price: number;
  image_url: string;
  sold_at: string | null;
  seller_email: string;
  stripe_account_id: string | null;
  charges_enabled: boolean;
};

export async function getCheckoutListing(listingId: string): Promise<CheckoutListing | null> {
  const rows = await rpc<CheckoutListing[]>("server_checkout_listing", { p_listing_id: listingId });
  return rows[0] ?? null;
}

export type NewOrder = {
  listingId: string;
  accountId: string;
  sessionId: string;
  paymentIntentId: string | null;
  amountTotal: number;
  applicationFeeAmount: number;
  currency: string;
  buyerEmail: string | null;
  fromWebhook: boolean;
};

/** Saves a paid order once and marks the listing as sold. Safe to call twice (webhook and success page). */
export async function recordOrder(o: NewOrder): Promise<string> {
  return rpc<string>("server_record_order", {
    p_listing_id: o.listingId,
    p_account_id: o.accountId,
    p_session_id: o.sessionId,
    p_payment_intent_id: o.paymentIntentId,
    p_amount_total: o.amountTotal,
    p_application_fee_amount: o.applicationFeeAmount,
    p_currency: o.currency,
    p_buyer_email: o.buyerEmail,
    p_from_webhook: o.fromWebhook,
  });
}

export type Order = {
  id: string;
  listing_id: string;
  amount_total: number;
  application_fee_amount: number;
  currency: string;
  buyer_email: string | null;
  confirmed_by_webhook_at: string | null;
  created_at: string;
};

export async function getOrder(sessionId: string): Promise<Order | null> {
  const rows = await rpc<Order[]>("server_get_order", { p_session_id: sessionId });
  return rows[0] ?? null;
}
