-- Pesanan penjualan toko (SO). Nomor keluar otomatis: SO-YYMMDD-001.
-- Stok baru berkurang ketika pesanan dijadikan nota penjualan.
-- Jalankan sekali di SQL Editor proyek Supabase bekon-pro.

create table if not exists toko.pesanan_penjualan (
  id uuid primary key default gen_random_uuid(),
  nomor_so text not null unique,
  tanggal date not null default current_date,
  pelanggan_id uuid references toko.pelanggan (id),
  catatan text,
  total numeric not null default 0,
  status text not null default 'menunggu' check (status in ('menunggu', 'jadi_nota', 'batal')),
  penjualan_id uuid references toko.penjualan (id),
  dicatat_oleh text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists toko.pesanan_penjualan_item (
  id uuid primary key default gen_random_uuid(),
  pesanan_id uuid not null references toko.pesanan_penjualan (id) on delete cascade,
  produk_id uuid not null references toko.produk (id),
  qty numeric not null check (qty > 0),
  satuan text,
  konversi numeric not null default 1,
  harga_satuan numeric not null,
  subtotal numeric not null
);

create or replace function toko.nomor_baru(prefix text)
returns text
language plpgsql
as $$
declare
  n int;
begin
  if prefix = 'JL' then
    select count(*) + 1 into n from toko.penjualan
      where nomor_nota like prefix || '-' || to_char(current_date, 'YYMMDD') || '-%';
  elsif prefix = 'BL' then
    select count(*) + 1 into n from toko.pembelian
      where nomor_po like prefix || '-' || to_char(current_date, 'YYMMDD') || '-%';
  elsif prefix = 'RJ' then
    select count(*) + 1 into n from toko.retur_penjualan
      where nomor_retur like prefix || '-' || to_char(current_date, 'YYMMDD') || '-%';
  elsif prefix = 'SO' then
    select count(*) + 1 into n from toko.pesanan_penjualan
      where nomor_so like prefix || '-' || to_char(current_date, 'YYMMDD') || '-%';
  else
    select count(*) + 1 into n from toko.retur_pembelian
      where nomor_retur like prefix || '-' || to_char(current_date, 'YYMMDD') || '-%';
  end if;
  return prefix || '-' || to_char(current_date, 'YYMMDD') || '-' || lpad(n::text, 3, '0');
end;
$$;

create or replace function toko.simpan_pesanan_penjualan(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = toko, public
as $$
declare
  v_id uuid := nullif(payload->>'id', '')::uuid;
  v_item jsonb;
  v_produk toko.produk%rowtype;
  v_qty numeric;
  v_konv numeric;
  v_harga numeric;
  v_total numeric := 0;
  v_status text;
begin
  if payload->'items' is null or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Pesanan belum punya barang';
  end if;

  if v_id is null then
    insert into toko.pesanan_penjualan (nomor_so, tanggal, pelanggan_id, catatan, dicatat_oleh, status)
    values (
      toko.nomor_baru('SO'),
      coalesce((payload->>'tanggal')::date, current_date),
      nullif(payload->>'pelanggan_id', '')::uuid,
      nullif(payload->>'catatan', ''),
      nullif(payload->>'dicatat_oleh', ''),
      'menunggu'
    )
    returning id into v_id;
  else
    select status into v_status from toko.pesanan_penjualan where id = v_id for update;
    if not found then
      raise exception 'Pesanan tidak ditemukan';
    end if;
    if v_status <> 'menunggu' then
      raise exception 'Pesanan ini sudah tidak bisa diubah';
    end if;
    update toko.pesanan_penjualan
    set tanggal = coalesce((payload->>'tanggal')::date, tanggal),
        pelanggan_id = nullif(payload->>'pelanggan_id', '')::uuid,
        catatan = nullif(payload->>'catatan', ''),
        dicatat_oleh = coalesce(nullif(payload->>'dicatat_oleh', ''), dicatat_oleh),
        updated_at = now()
    where id = v_id;
    delete from toko.pesanan_penjualan_item where pesanan_id = v_id;
  end if;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_qty := (v_item->>'qty')::numeric;
    v_konv := coalesce(nullif(v_item->>'konversi', '')::numeric, 1);
    if v_qty is null or v_qty <= 0 then
      raise exception 'Jumlah barang harus lebih dari nol';
    end if;
    if v_konv <= 0 then
      raise exception 'Konversi satuan tidak valid';
    end if;
    select * into v_produk from toko.produk where id = (v_item->>'produk_id')::uuid;
    if not found then
      raise exception 'Produk tidak ditemukan';
    end if;
    v_harga := coalesce(nullif(v_item->>'harga_satuan', '')::numeric, v_produk.harga_jual);
    insert into toko.pesanan_penjualan_item (pesanan_id, produk_id, qty, satuan, konversi, harga_satuan, subtotal)
    values (
      v_id, v_produk.id, v_qty, nullif(v_item->>'satuan', ''), v_konv, v_harga, round(v_qty * v_harga, 2)
    );
    v_total := v_total + round(v_qty * v_harga, 2);
  end loop;

  update toko.pesanan_penjualan set total = v_total, updated_at = now() where id = v_id;
  return v_id;
end;
$$;

create or replace function toko.jadi_penjualan_dari_so(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = toko, public
as $$
declare
  v_so toko.pesanan_penjualan%rowtype;
  v_item toko.pesanan_penjualan_item%rowtype;
  v_produk toko.produk%rowtype;
  v_butuh numeric;
  v_id uuid;
  v_total numeric := 0;
  v_beli numeric;
begin
  select * into v_so
  from toko.pesanan_penjualan
  where id = nullif(payload->>'id', '')::uuid
  for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan';
  end if;
  if v_so.penjualan_id is not null then
    return v_so.penjualan_id;
  end if;
  if v_so.status <> 'menunggu' then
    raise exception 'Pesanan ini sudah tidak menunggu';
  end if;
  if not exists (select 1 from toko.pesanan_penjualan_item where pesanan_id = v_so.id) then
    raise exception 'Pesanan belum punya barang';
  end if;

  perform 1
  from toko.produk
  where id in (select produk_id from toko.pesanan_penjualan_item where pesanan_id = v_so.id)
  order by id
  for update;

  for v_item in select * from toko.pesanan_penjualan_item where pesanan_id = v_so.id
  loop
    select * into v_produk from toko.produk where id = v_item.produk_id;
    if not found then
      raise exception 'Produk tidak ditemukan';
    end if;
    v_butuh := round(v_item.qty * coalesce(v_item.konversi, 1), 6);
    if v_produk.stok + 0.0000001 < v_butuh then
      raise exception 'Stok % tidak cukup. Sisa %', v_produk.nama, v_produk.stok;
    end if;
  end loop;

  v_id := gen_random_uuid();
  insert into toko.penjualan (id, nomor_nota, tanggal, pelanggan_id, catatan, dicatat_oleh)
  values (
    v_id,
    toko.nomor_baru('JL'),
    current_date,
    v_so.pelanggan_id,
    nullif(trim(concat_ws(' · ', 'SO ' || v_so.nomor_so, nullif(v_so.catatan, ''))), ''),
    nullif(trim(coalesce(payload->>'dicatat_oleh', v_so.dicatat_oleh)), '')
  );

  for v_item in select * from toko.pesanan_penjualan_item where pesanan_id = v_so.id
  loop
    select * into v_produk from toko.produk where id = v_item.produk_id;
    v_butuh := round(v_item.qty * coalesce(v_item.konversi, 1), 6);
    v_beli := round(coalesce(v_produk.harga_beli, 0) * coalesce(v_item.konversi, 1), 2);
    insert into toko.penjualan_item (penjualan_id, produk_id, qty, satuan, konversi, harga_satuan, harga_beli, subtotal)
    values (v_id, v_item.produk_id, v_item.qty, v_item.satuan, coalesce(v_item.konversi, 1), v_item.harga_satuan, v_beli, v_item.subtotal);
    update toko.produk set stok = stok - v_butuh, updated_at = now() where id = v_item.produk_id;
    v_total := v_total + v_item.subtotal;
  end loop;

  update toko.penjualan
  set total = v_total,
      diskon = 0,
      grand_total = v_total,
      dibayar = 0,
      status_bayar = 'belum_lunas'
  where id = v_id;

  update toko.pesanan_penjualan
  set status = 'jadi_nota', penjualan_id = v_id, updated_at = now()
  where id = v_so.id;

  return v_id;
end;
$$;

create or replace function toko.batal_pesanan_penjualan(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = toko, public
as $$
declare
  v_id uuid := nullif(payload->>'id', '')::uuid;
begin
  update toko.pesanan_penjualan
  set status = 'batal', updated_at = now()
  where id = v_id and status = 'menunggu' and penjualan_id is null;
  if not found then
    raise exception 'Pesanan tidak bisa dibatalkan';
  end if;
  return v_id;
end;
$$;

grant select, insert, update, delete on toko.pesanan_penjualan to anon, authenticated, service_role;
grant select, insert, update, delete on toko.pesanan_penjualan_item to anon, authenticated, service_role;
grant execute on function toko.simpan_pesanan_penjualan(jsonb) to anon, authenticated, service_role;
grant execute on function toko.jadi_penjualan_dari_so(jsonb) to anon, authenticated, service_role;
grant execute on function toko.batal_pesanan_penjualan(jsonb) to anon, authenticated, service_role;
grant execute on function toko.nomor_baru(text) to anon, authenticated, service_role;

alter table toko.pesanan_penjualan enable row level security;
alter table toko.pesanan_penjualan_item enable row level security;
drop policy if exists pesanan_penjualan_all on toko.pesanan_penjualan;
drop policy if exists pesanan_penjualan_item_all on toko.pesanan_penjualan_item;
create policy pesanan_penjualan_all on toko.pesanan_penjualan for all to anon, authenticated using (true) with check (true);
create policy pesanan_penjualan_item_all on toko.pesanan_penjualan_item for all to anon, authenticated using (true) with check (true);

update toko.pengguna
set menu_izin = array_replace(menu_izin, '/dari-bekon', '/pesanan')
where menu_izin is not null and '/dari-bekon' = any(menu_izin);

notify pgrst, 'reload schema';
