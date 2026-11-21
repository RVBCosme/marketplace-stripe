-- Marketplace: database setup for Supabase (run once in the SQL editor).
-- Based on the challenge's Supabase-Schema.sql, with stricter checks and private buyer messages.

-- 1. Listings
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  title varchar(255) not null check (char_length(title) between 1 and 100),
  description text check (description is null or char_length(description) <= 2000),
  price numeric(10, 2) not null check (price >= 0),
  category varchar(100) not null check (category in (
    'Vehicles', 'Property Rentals', 'Apparel', 'Classifieds', 'Electronics', 'Entertainment',
    'Family', 'Free Stuff', 'Garden & Outdoor', 'Hobbies', 'Home Goods', 'Home Improvement',
    'Home Sales', 'Musical Instruments', 'Office Supplies', 'Pet Supplies', 'Sporting Goods',
    'Toys & Games'
  )),
  seller_email varchar(255) not null check (
    char_length(seller_email) <= 254
    and seller_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  -- Photos must live in this project's listing-images bucket.
  image_url text not null check (
    image_url like 'https://igvxvgbufrinhqcropue.supabase.co/storage/v1/object/public/listing-images/%'
  ),
  location varchar(255) not null default 'Palo Alto, CA' check (char_length(location) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_listings_category on public.listings (category);
create index if not exists idx_listings_created_at on public.listings (created_at desc);

-- The server sets the id and times, and tidies the text before the checks above run.
create or replace function public.listings_set_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := gen_random_uuid();
  new.created_at := now();
  new.updated_at := now();
  new.title := btrim(new.title, E' \t\r\n');
  new.description := nullif(btrim(coalesce(new.description, ''), E' \t\r\n'), '');
  new.seller_email := lower(btrim(new.seller_email, E' \t\r\n'));
  new.location := coalesce(nullif(btrim(coalesce(new.location, ''), E' \t\r\n'), ''), 'Palo Alto, CA');
  return new;
end;
$$;

drop trigger if exists listings_set_defaults on public.listings;
create trigger listings_set_defaults
  before insert on public.listings
  for each row execute function public.listings_set_defaults();

-- 2. Messages from buyers to sellers
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_email varchar(255) not null check (
    char_length(buyer_email) <= 254
    and buyer_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  seller_email varchar(255) not null,
  message text not null check (char_length(message) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_listing_id on public.messages (listing_id);

-- The seller's email always comes from the listing, so a message can't be redirected elsewhere.
create or replace function public.messages_set_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := gen_random_uuid();
  new.created_at := now();
  new.buyer_email := lower(btrim(new.buyer_email, E' \t\r\n'));
  new.message := btrim(new.message, E' \t\r\n');
  select l.seller_email into new.seller_email from public.listings l where l.id = new.listing_id;
  if new.seller_email is null then
    raise exception 'Listing not found' using errcode = '23503';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_set_defaults on public.messages;
create trigger messages_set_defaults
  before insert on public.messages
  for each row execute function public.messages_set_defaults();

-- 3. Row Level Security: anyone can browse and post listings and send messages.
-- Nobody can edit or delete through the public key, and messages are not readable by visitors
-- (they contain buyers' email addresses).
alter table public.listings enable row level security;
alter table public.messages enable row level security;

revoke all on public.listings, public.messages from anon, authenticated;
grant select, insert on public.listings to anon, authenticated;
grant insert on public.messages to anon, authenticated;

drop policy if exists "Anyone can view listings" on public.listings;
create policy "Anyone can view listings"
  on public.listings for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can create listings" on public.listings;
create policy "Anyone can create listings"
  on public.listings for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anyone can message a seller" on public.messages;
create policy "Anyone can message a seller"
  on public.messages for insert
  to anon, authenticated
  with check (true);

-- 4. Listing photos: public bucket, images only, up to 5 MB each.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images', 'listing-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "Anyone can upload listing images" on storage.objects;
create policy "Anyone can upload listing images"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'listing-images');
