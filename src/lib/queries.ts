import { supabase } from "@/lib/supabase";
import { FEED_LIMIT, LISTING_COLUMNS, isUuid, searchTerm, type Category, type Listing } from "@/lib/listings";

/** Newest listings first, optionally in one category and/or matching a keyword. */
export async function getListings({ category, q }: { category: Category | null; q: string }): Promise<Listing[]> {
  let query = supabase
    .from("listings")
    .select(LISTING_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT);

  if (category) query = query.eq("category", category);

  const term = searchTerm(q);
  if (term) query = query.or(`title.ilike.*${term}*,description.ilike.*${term}*`);

  const { data, error } = await query;
  if (error) throw new Error(`Couldn't load listings: ${error.message}`);
  return (data ?? []) as Listing[];
}

export async function getListing(id: string): Promise<Listing | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await supabase.from("listings").select(LISTING_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't load the listing: ${error.message}`);
  return data as Listing | null;
}
