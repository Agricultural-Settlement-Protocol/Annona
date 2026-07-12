-- Phase 4b: retire the "agrinas" name for the input-principal party, renaming it
-- to "supplier" across the whole off-chain schema. Data-preserving (ALTER ...
-- RENAME); the only drop is the redundant app_user.agrinas_id column (its value
-- is folded into the pre-existing supplier_id first). PT Agrinas remains the
-- real-world entity that fills the supplier role; the warehouse operator is a
-- separate (infra) concept and is untouched here.

-- 1. Migrate the operator account's role onto the retained enum value first,
--    so the enum can be recreated without 'agrinas'.
update app_user set role = 'supplier' where role = 'agrinas';

-- 2. Consolidate app_user: fold the used agrinas_id into supplier_id, then drop
--    the redundant column (this also drops its FK app_user_agrinas_id_fkey).
update app_user set supplier_id = agrinas_id
  where supplier_id is null and agrinas_id is not null;
alter table app_user drop column agrinas_id;

-- 3. Recreate app_role without the retired 'agrinas' value.
alter type app_role rename to app_role_old;
create type app_role as enum ('kmp', 'pemerintah', 'supplier', 'financier');
alter table app_user alter column role type app_role using role::text::app_role;
drop type app_role_old;

-- 4. Rename FK / value columns.
alter table coop              rename column agrinas_id          to supplier_id;
alter table saprotan_catalog  rename column agrinas_id          to supplier_id;
alter table saprotan_catalog  rename column base_price_agrinas  to base_price_supplier;
alter table agreement         rename column agrinas_id          to supplier_id;
alter table agreement         rename column base_price_agrinas  to base_price_supplier;
alter table agreement_input   rename column base_price_agrinas  to base_price_supplier;
alter table residu_remittance rename column agrinas_id          to supplier_id;
alter table harvest_shipment  rename column agrinas_id          to supplier_id;
alter table settlement        rename column principal_to_agrinas to principal_to_supplier;

-- 5. Rename plain indexes.
alter index coop_agrinas_id_idx              rename to coop_supplier_id_idx;
alter index saprotan_catalog_agrinas_id_idx  rename to saprotan_catalog_supplier_id_idx;
alter index agreement_agrinas_id_idx         rename to agreement_supplier_id_idx;
alter index residu_remittance_agrinas_id_idx rename to residu_remittance_supplier_id_idx;
alter index harvest_shipment_agrinas_idx     rename to harvest_shipment_supplier_idx;

-- 6. Rename FK / PK / unique constraints to their post-rename drizzle names.
alter table agreement         rename constraint agreement_agrinas_id_agrinas_id_fk         to agreement_supplier_id_supplier_id_fk;
alter table app_user          rename constraint app_user_supplier_id_agrinas_id_fk         to app_user_supplier_id_supplier_id_fk;
alter table coop              rename constraint coop_agrinas_id_agrinas_id_fk               to coop_supplier_id_supplier_id_fk;
alter table harvest_shipment  rename constraint harvest_shipment_agrinas_id_fkey           to harvest_shipment_supplier_id_supplier_id_fk;
alter table residu_remittance rename constraint residu_remittance_agrinas_id_agrinas_id_fk to residu_remittance_supplier_id_supplier_id_fk;
alter table saprotan_catalog  rename constraint saprotan_catalog_agrinas_id_agrinas_id_fk  to saprotan_catalog_supplier_id_supplier_id_fk;
alter table supplier_payable  rename constraint supplier_payable_supplier_id_agrinas_id_fk to supplier_payable_supplier_id_supplier_id_fk;
alter table agrinas           rename constraint agrinas_pkey                                to supplier_pkey;
alter table agrinas           rename constraint agrinas_wallet_address_unique              to supplier_wallet_address_unique;

-- 7. Rename the table last (FKs auto-follow).
alter table agrinas rename to supplier;
