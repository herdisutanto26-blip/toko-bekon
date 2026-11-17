-- Penyesuaian stok cek fisik: item masuk (IM) dan item keluar (IK).
-- Mengubah stok barang, sehingga nilai persediaan di neraca ikut berubah.
-- Aman dijalankan ulang.

create table if not exists toko.penyesuaian_stok (
  id uuid primary key default gen_random_uuid(),
  nomor text not null unique,
  tanggal date not null default current_date,
  jenis text not null check (jenis in ('masuk', 'keluar')),
  keterangan text,
  dicatat_oleh text,
  created_at timestamptz not null default now()
);

create table if not exists toko.penyesuaian_stok_item (
  id uuid primary key default gen_random_uuid(),
  penyesuaian_id uuid not null references toko.penyesuaian_stok (id) on delete cascade,
  produk_id uuid not null references toko.produk (id),
  qty numeric not null check (qty > 0),
  harga_beli numeric not null default 0,
  nilai numeric not null default 0
);

alter table toko.penyesuaian_stok enable row level security;
alter table toko.penyesuaian_stok_item enable row level security;
drop policy if exists penyesuaian_stok_all on toko.penyesuaian_stok;
drop policy if exists penyesuaian_stok_item_all on toko.penyesuaian_stok_item;
create policy penyesuaian_stok_all on toko.penyesuaian_stok
  for all to anon, authenticated using (true) with check (true);
create policy penyesuaian_stok_item_all on toko.penyesuaian_stok_item
  for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on toko.penyesuaian_stok, toko.penyesuaian_stok_item to anon, authenticated, service_role;

create or replace function toko.catat_penyesuaian_stok(payload jsonb)
returns text
language plpgsql
security definer
set search_path = toko, public
as $$
declare
  v_jenis text := payload->>'jenis';
  v_tanggal date := coalesce((payload->>'tanggal')::date, current_date);
  v_id uuid := gen_random_uuid();
  v_item jsonb;
  v_produk toko.produk%rowtype;
  v_qty numeric;
  v_n int;
  v_awalan text;
  v_nomor text;
begin
  if v_jenis not in ('masuk', 'keluar') then
    raise exception 'Jenis penyesuaian harus masuk atau keluar';
  end if;
  if payload->'baris' is null or jsonb_array_length(payload->'baris') = 0 then
    raise exception 'Isi minimal satu barang';
  end if;

  v_awalan := case when v_jenis = 'masuk' then 'IM' else 'IK' end;
  select count(*) + 1 into v_n
  from toko.penyesuaian_stok
  where nomor like v_awalan || '-' || to_char(v_tanggal, 'YYMMDD') || '-%';
  v_nomor := v_awalan || '-' || to_char(v_tanggal, 'YYMMDD') || '-' || lpad(v_n::text, 3, '0');

  insert into toko.penyesuaian_stok (id, nomor, tanggal, jenis, keterangan, dicatat_oleh)
  values (
    v_id,
    v_nomor,
    v_tanggal,
    v_jenis,
    nullif(payload->>'keterangan', ''),
    nullif(payload->>'dicatat_oleh', '')
  );

  for v_item in
    select value from jsonb_array_elements(payload->'baris')
  loop
    v_qty := round((v_item->>'qty')::numeric, 6);
    if v_qty is null or v_qty <= 0 then
      raise exception 'Jumlah barang harus lebih dari nol';
    end if;
    select * into v_produk from toko.produk where id = (v_item->>'produk_id')::uuid for update;
    if not found then
      raise exception 'Barang tidak ditemukan';
    end if;
    if v_jenis = 'keluar' and v_produk.stok + 0.0000001 < v_qty then
      raise exception 'Stok % tidak cukup. Sisa %', v_produk.nama, v_produk.stok;
    end if;
    update toko.produk
    set stok = stok + case when v_jenis = 'masuk' then v_qty else -v_qty end,
        updated_at = now()
    where id = v_produk.id;
    insert into toko.penyesuaian_stok_item (penyesuaian_id, produk_id, qty, harga_beli, nilai)
    values (v_id, v_produk.id, v_qty, v_produk.harga_beli, round(v_qty * v_produk.harga_beli, 2));
  end loop;

  return v_nomor;
end;
$$;

grant execute on function toko.catat_penyesuaian_stok(jsonb) to anon, authenticated, service_role;
