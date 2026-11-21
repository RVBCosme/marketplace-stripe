-- Test 4: Stripe Connect additions. Run after schema.sql.
--
-- The app's server calls the server_* functions below with SERVER_RPC_SECRET. Set its hash once
-- (not committed to git), replacing <your secret>:
--   insert into private.settings (name, value)
--   values ('server_secret_sha256', encode(extensions.digest('<your secret>', 'sha256'), 'hex'))
--   on conflict (name) do update set value = excluded.value;

-- 1. A listing can be sold once.
alter table public.listings add column if not exists sold_at timestamptz;

-- New listings always start unsold (visitors can't post a listing as already sold).
create or replace function public.listings_set_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := gen_random_uuid();
  new.created_at := now();
  new.updated_at := now();
  new.sold_at := null;
  new.title := btrim(new.title, E' \t\r\n');
  new.description := nullif(btrim(coalesce(new.description, ''), E' \t\r\n'), '');
  new.seller_email := lower(btrim(new.seller_email, E' \t\r\n'));
  new.location := coalesce(nullif(btrim(coalesce(new.location, ''), E' \t\r\n'), ''), 'Palo Alto, CA');
  return new;
end;
$$;

-- 2. Sellers who connected Stripe, identified by the email on their listings.
create table if not exists public.sellers (
  email varchar(254) primary key,
  stripe_account_id text not null unique,
  charges_enabled boolean not null default false,
  details_submitted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Paid orders. The Stripe webhook records them (the success page also does, as a fallback).
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id),
  stripe_account_id text not null,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  amount_total integer not null check (amount_total > 0),
  application_fee_amount integer not null check (application_fee_amount >= 0),
  currency text not null,
  buyer_email text,
  confirmed_by_webhook_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_listing_id on public.orders (listing_id);

-- 4. Access: visitors may see which seller emails can take payments (to show Buy Now),
-- but not their Stripe account ids. Orders are private.
alter table public.sellers enable row level security;
alter table public.orders enable row level security;
revoke all on public.sellers, public.orders from anon, authenticated;
grant select (email, charges_enabled) on public.sellers to anon, authenticated;

drop policy if exists "Anyone can see which sellers take payments" on public.sellers;
create policy "Anyone can see which sellers take payments"
  on public.sellers for select
  to anon, authenticated
  using (true);

-- 5. Server-only functions, guarded by a secret that only the app's server has.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.settings (name text primary key, value text not null);

create or replace function private.check_secret(p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_secret is null
     or encode(extensions.digest(p_secret, 'sha256'), 'hex') is distinct from
        (select s.value from private.settings s where s.name = 'server_secret_sha256') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
end;
$$;
revoke all on function private.check_secret(text) from public, anon, authenticated;

create or replace function public.server_get_seller(p_secret text, p_email text)
returns table (email text, stripe_account_id text, charges_enabled boolean, details_submitted boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return query
    select s.email::text, s.stripe_account_id, s.charges_enabled, s.details_submitted
    from public.sellers s
    where s.email = lower(btrim(p_email));
end;
$$;

-- First come, first served: an email keeps the Stripe account it was first connected to.
create or replace function public.server_save_seller(p_secret text, p_email text, p_account_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  insert into public.sellers (email, stripe_account_id)
  values (lower(btrim(p_email)), p_account_id)
  on conflict (email) do nothing;
end;
$$;

-- Returns true if the account belongs to one of this app's sellers.
create or replace function public.server_update_seller(
  p_secret text, p_account_id text, p_charges_enabled boolean, p_details_submitted boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  update public.sellers
  set charges_enabled = p_charges_enabled, details_submitted = p_details_submitted, updated_at = now()
  where stripe_account_id = p_account_id;
  return found;
end;
$$;

create or replace function public.server_checkout_listing(p_secret text, p_listing_id uuid)
returns table (
  id uuid, title text, price numeric, image_url text, sold_at timestamptz,
  seller_email text, stripe_account_id text, charges_enabled boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return query
    select l.id, l.title::text, l.price, l.image_url, l.sold_at, l.seller_email::text,
           s.stripe_account_id, coalesce(s.charges_enabled, false)
    from public.listings l
    left join public.sellers s on s.email = l.seller_email
    where l.id = p_listing_id;
end;
$$;

-- Saves a paid Checkout Session once and marks the listing as sold. Safe to call more than once.
create or replace function public.server_record_order(
  p_secret text, p_listing_id uuid, p_account_id text, p_session_id text, p_payment_intent_id text,
  p_amount_total integer, p_application_fee_amount integer, p_currency text, p_buyer_email text,
  p_from_webhook boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.check_secret(p_secret);
  insert into public.orders (
    listing_id, stripe_account_id, stripe_checkout_session_id, stripe_payment_intent_id,
    amount_total, application_fee_amount, currency, buyer_email
  )
  values (
    p_listing_id, p_account_id, p_session_id, p_payment_intent_id,
    p_amount_total, p_application_fee_amount, p_currency, p_buyer_email
  )
  on conflict (stripe_checkout_session_id) do nothing;

  if p_from_webhook then
    update public.orders
    set confirmed_by_webhook_at = coalesce(confirmed_by_webhook_at, now())
    where stripe_checkout_session_id = p_session_id;
  end if;

  update public.listings set sold_at = coalesce(sold_at, now()) where id = p_listing_id;

  select o.id into v_id from public.orders o where o.stripe_checkout_session_id = p_session_id;
  return v_id;
end;
$$;

create or replace function public.server_get_order(p_secret text, p_session_id text)
returns table (
  id uuid, listing_id uuid, amount_total integer, application_fee_amount integer, currency text,
  buyer_email text, confirmed_by_webhook_at timestamptz, created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return query
    select o.id, o.listing_id, o.amount_total, o.application_fee_amount, o.currency,
           o.buyer_email, o.confirmed_by_webhook_at, o.created_at
    from public.orders o
    where o.stripe_checkout_session_id = p_session_id;
end;
$$;

-- The public key may call the server_* functions, but they refuse without the server secret.
revoke all on function public.server_get_seller(text, text) from public;
revoke all on function public.server_save_seller(text, text, text) from public;
revoke all on function public.server_update_seller(text, text, boolean, boolean) from public;
revoke all on function public.server_checkout_listing(text, uuid) from public;
revoke all on function public.server_record_order(text, uuid, text, text, text, integer, integer, text, text, boolean) from public;
revoke all on function public.server_get_order(text, text) from public;
grant execute on function public.server_get_seller(text, text) to anon, authenticated;
grant execute on function public.server_save_seller(text, text, text) to anon, authenticated;
grant execute on function public.server_update_seller(text, text, boolean, boolean) to anon, authenticated;
grant execute on function public.server_checkout_listing(text, uuid) to anon, authenticated;
grant execute on function public.server_record_order(text, uuid, text, text, text, integer, integer, text, text, boolean) to anon, authenticated;
grant execute on function public.server_get_order(text, text) to anon, authenticated;
