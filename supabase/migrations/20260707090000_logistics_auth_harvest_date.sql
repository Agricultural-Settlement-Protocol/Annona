-- v3.1 off-chain additions: auth profiles, catalog stock status,
-- expected harvest date (read-model gap fix), harvest logistics KMP -> Agrinas.

-- ── 1. expected_harvest_date ────────────────────────────────────────────────
-- Read-model gap: "Panen Minggu Ini" needs a harvest window, but no on-chain
-- event carries it (expected_vol_g is on-chain, the DATE is a pure off-chain
-- estimate captured at agreement creation). Stored here as the authoritative
-- off-chain source; never a settlement input.
alter table agreement
  add column if not exists expected_harvest_date date;

comment on column agreement.expected_harvest_date is
  'Off-chain harvest window estimate captured at creation. Not derivable from chain events; powers mv_upcoming_harvest. Never a settlement input.';

-- ── 2. saprotan catalog: stock status + unit label ──────────────────────────
do $$ begin
  create type stock_status as enum ('Tersedia', 'Menipis', 'Habis');
exception when duplicate_object then null; end $$;

alter table saprotan_catalog
  add column if not exists stock_status stock_status not null default 'Tersedia',
  add column if not exists unit_label text not null default 'unit';

-- ── 3. app_user: email login profiles (MVP RBAC) ────────────────────────────
do $$ begin
  create type app_role as enum ('kmp', 'agrinas', 'pemerintah');
exception when duplicate_object then null; end $$;

create table if not exists app_user (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role app_role not null,
  display_name text not null,
  coop_id uuid references coop (id),
  agrinas_id uuid references agrinas (id),
  created_at timestamptz not null default now()
);

alter table app_user enable row level security;

drop policy if exists "app_user_select_own" on app_user;
create policy "app_user_select_own"
  on app_user for select
  to authenticated
  using (id = (select auth.uid()));

-- ── 4. harvest logistics: KMP forwards stored harvest to gudang Agrinas ─────
-- Off-chain for MVP (physical goods movement, not money settlement). The
-- KMP-sends / Agrinas-confirms double gate mirrors the residu pattern and is
-- the designed v3.1 on-chain upgrade path (see SMART-CONTRACT.md roadmap).
do $$ begin
  create type shipment_status as enum ('Draft', 'Dikirim', 'Diterima', 'Selisih');
exception when duplicate_object then null; end $$;

create table if not exists harvest_shipment (
  id uuid primary key default gen_random_uuid(),
  coop_id uuid not null references coop (id),
  agrinas_id uuid not null references agrinas (id),
  commodity_code text not null references commodity (code),
  status shipment_status not null default 'Draft',
  -- sender-declared totals
  total_volume_g bigint not null default 0,
  -- receiver-confirmed totals (null until Agrinas confirms)
  received_volume_g bigint,
  discrepancy_note text,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now()
);

-- Lot lines keep per-farmer traceability: which deliveries compose the
-- shipment. Grade is per line; kadar air per line (weighted average shown in
-- UI per grade-lot, standard grain-logistics practice).
create table if not exists harvest_shipment_line (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references harvest_shipment (id) on delete cascade,
  delivery_id uuid references delivery (id),
  agreement_id uuid not null references agreement (id),
  farmer_id uuid not null references farmer (id),
  volume_g bigint not null,
  grade text not null,
  moisture_bps integer not null
);

create index if not exists harvest_shipment_coop_idx on harvest_shipment (coop_id);
create index if not exists harvest_shipment_agrinas_idx on harvest_shipment (agrinas_id);
create index if not exists harvest_shipment_status_idx on harvest_shipment (status);
create index if not exists harvest_shipment_line_shipment_idx on harvest_shipment_line (shipment_id);

alter table harvest_shipment enable row level security;
alter table harvest_shipment_line enable row level security;

drop policy if exists "shipment_read_authenticated" on harvest_shipment;
create policy "shipment_read_authenticated"
  on harvest_shipment for select to authenticated using (true);

drop policy if exists "shipment_line_read_authenticated" on harvest_shipment_line;
create policy "shipment_line_read_authenticated"
  on harvest_shipment_line for select to authenticated using (true);
