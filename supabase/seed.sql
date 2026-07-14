-- Annona reference-data seed (idempotent). Off-chain only, no wallets/chain.
-- Money columns are bigint in SMALLEST UNIT (rupiah-cents, DIDR_DECIMALS=2):
--   Rp6.500 -> 650000. Sources: docs/technical/DATA-SOURCES.md.

-- ── commodities ────────────────────────────────────────────────────────────
insert into commodity (code, name, unit, hpp_version) values
  ('GABAH',  'Gabah Kering Panen',    'kg', 4),  -- Inpres 4/2026
  ('JAGUNG', 'Jagung Pipilan Kering', 'kg', 10)  -- Inpres 10/2025
on conflict (code) do nothing;

-- ── HPP anchors + market reference ─────────────────────────────────────────
insert into price_ref (commodity_code, hpp, hpp_source, market_price_kabupaten, pihps_source, as_of)
select v.code, v.hpp, v.src, v.mkt, v.pihps, v.as_of::date
from (values
  ('GABAH',  650000::bigint, 'Inpres 4/2026',  700000::bigint, 'PIHPS Kab. Karawang', '2026-07-01'),
  ('JAGUNG', 550000::bigint, 'Kepbadan 216/2025 + Inpres 10/2025', 580000::bigint, 'PIHPS Kab. Garut', '2026-07-01')
) as v(code, hpp, src, mkt, pihps, as_of)
where not exists (
  select 1 from price_ref p where p.commodity_code = v.code and p.as_of = v.as_of::date
);

-- ── yield table (BPS kabupaten averages, t/ha) ─────────────────────────────
insert into yield_table (commodity_code, kabupaten, avg_yield_t_per_ha, source, year)
values
  ('GABAH',  'Karawang',  5.50, 'BPS Kabupaten Karawang 2025', 2025),
  ('GABAH',  'Indramayu', 5.80, 'BPS Kabupaten Indramayu 2025', 2025),
  ('GABAH',  'Subang',    5.30, 'BPS Kabupaten Subang 2025', 2025),
  ('JAGUNG', 'Garut',     6.10, 'BPS Kabupaten Garut 2025', 2025),
  ('JAGUNG', 'Kediri',    6.40, 'BPS Kabupaten Kediri 2025', 2025)
on conflict (commodity_code, kabupaten, year) do nothing;

-- ── Agrinas (operator) ─────────────────────────────────────────────────────
-- Placeholder testnet wallet; replaced by scripts/seed.ts when chain wallets exist.
insert into agrinas (name, wallet_address)
values ('PT Agrinas Pangan Nusantara', 'GAGRINAS_PLACEHOLDER_TESTNET_WALLET')
on conflict (wallet_address) do nothing;

-- ── Master saprotan catalog (Agrinas-owned; base_price = PRINCIPAL) ────────
insert into saprotan_catalog (agrinas_id, code, name, category, region, base_price_agrinas, subsidi_flag, source)
select a.id, v.code, v.name, v.category, v.region, v.base_price, v.subsidi, v.source
from agrinas a,
(values
  ('UREA',        'Pupuk Urea 50kg',            'pupuk',     'Jawa Barat', 18000000::bigint, true,  'PT Pupuk Indonesia'),
  ('NPK-PHONSKA', 'NPK Phonska 50kg',           'pupuk',     'Jawa Barat', 23000000::bigint, true,  'PT Pupuk Indonesia'),
  ('PHONSKA-PLUS','Phonska Plus 25kg',          'pupuk',     'Jawa Barat', 32500000::bigint, false, 'PT Pupuk Indonesia'),
  ('ORGANIK',     'Pupuk Organik Petroganik 40kg','pupuk',   'Jawa Barat',  6000000::bigint, true,  'PT Pupuk Indonesia'),
  ('INPARI-32',   'Benih Padi Inpari 32 (5kg)', 'benih',     'Jawa Barat',  7500000::bigint, false, 'Balitbangtan'),
  ('JG-HIBRIDA',  'Benih Jagung Hibrida (5kg)', 'benih',     'Jawa Barat', 12500000::bigint, false, 'Balitbangtan'),
  ('INSEKTISIDA', 'Insektisida 500ml',          'pestisida', 'Jawa Barat',  9500000::bigint, false, 'Agrokimia'),
  ('HERBISIDA',   'Herbisida 1L',               'pestisida', 'Jawa Barat',  8000000::bigint, false, 'Agrokimia')
) as v(code, name, category, region, base_price, subsidi, source)
where a.wallet_address = 'GAGRINAS_PLACEHOLDER_TESTNET_WALLET'
on conflict (code, region) do nothing;
