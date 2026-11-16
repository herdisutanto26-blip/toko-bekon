-- Pesanan penjualan Toko Bekon dari PO yang masuk tahap cetak dan kirim.
-- Stok dan piutang baru bergerak saat toko mengesahkan pesanan.
-- Aman dijalankan ulang.

alter table toko.penjualan add column if not exists bekon_po_id uuid;
alter table toko.penjualan add column if not exists bekon_proyek_id uuid;
alter table toko.penjualan add column if not exists kode_proyek text;
alter table toko.penjualan add column if not exists nama_proyek text;
alter table toko.penjualan add column if not exists nama_pemilik text;
update toko.penjualan j
set nama_pemilik = nullif(trim(p.owner), '')
from public.projects p
where j.bekon_proyek_id = p.id
  and j.nama_pemilik is distinct from nullif(trim(p.owner), '');
create unique index if not exists penjualan_bekon_po_uidx
  on toko.penjualan (bekon_po_id)
  where bekon_po_id is not null;

alter table public.material_purchase_order_items
  add column if not exists toko_produk_id uuid references toko.produk (id) on delete set null;
create index if not exists material_po_items_toko_produk_idx
  on public.material_purchase_order_items (toko_produk_id)
  where toko_produk_id is not null;

create table if not exists toko.pesanan_bekon (
  id uuid primary key default gen_random_uuid(),
  bekon_po_id uuid not null unique references public.material_purchase_orders (id) on delete cascade,
  status text not null default 'menunggu' check (status in ('menunggu', 'dikembalikan', 'jadi_nota')),
  penjualan_id uuid references toko.penjualan (id),
  catatan_toko text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table toko.pesanan_bekon enable row level security;
drop policy if exists pesanan_bekon_all on toko.pesanan_bekon;
create policy pesanan_bekon_all on toko.pesanan_bekon
  for all to anon, authenticated
  using (true) with check (true);
grant select, insert, update, delete on toko.pesanan_bekon to anon, authenticated, service_role;

create or replace function public.toko_cocok_barang(
  p_produk_id uuid,
  p_nama text,
  p_unit text,
  p_qty numeric
) returns table (
  produk_id uuid,
  nama text,
  satuan text,
  satuan_stok text,
  konversi numeric,
  butuh numeric,
  stok numeric,
  pesan text
)
language plpgsql
stable
security definer
set search_path = toko, public
as $$
declare
  v_produk toko.produk%rowtype;
  v_ada boolean := false;
  v_satuan_stok text;
  v_konv numeric;
  v_satuan text;
begin
  if p_produk_id is not null then
    select * into v_produk from toko.produk p where p.id = p_produk_id and p.aktif;
    v_ada := found;
  end if;
  if not v_ada then
    select * into v_produk
    from toko.produk p
    where p.aktif and lower(trim(p.nama)) = lower(trim(coalesce(p_nama, '')))
    order by p.created_at
    limit 1;
    v_ada := found;
  end if;

  if not v_ada then
    produk_id := null;
    nama := coalesce(nullif(trim(p_nama), ''), 'tanpa nama');
    satuan := coalesce(p_unit, '');
    satuan_stok := coalesce(p_unit, '');
    konversi := null;
    butuh := null;
    stok := null;
    pesan := format('Barang "%s" belum ada di katalog Toko Bekon.', nama);
    return next;
    return;
  end if;

  select s.nama into v_satuan_stok from toko.satuan s where s.id = v_produk.satuan_id;
  v_satuan_stok := coalesce(nullif(trim(v_satuan_stok), ''), 'satuan');

  if p_unit is null or length(trim(p_unit)) = 0
     or lower(trim(p_unit)) = lower(v_satuan_stok) then
    v_konv := 1;
    v_satuan := v_satuan_stok;
  else
    select k.konversi, k.satuan into v_konv, v_satuan
    from toko.produk_kemasan k
    where k.produk_id = v_produk.id
      and lower(k.satuan) = lower(trim(p_unit))
      and k.konversi > 0
    limit 1;
  end if;

  -- Satuan katalog yang benar. Satuan bebas di PO (bh, set, dan sejenisnya)
  -- tidak menahan pesanan: jumlah tetap, dipakai satuan dasar katalog.
  if v_konv is null or v_konv <= 0 then
    v_konv := 1;
    v_satuan := v_satuan_stok;
  end if;

  produk_id := v_produk.id;
  nama := v_produk.nama;
  satuan := v_satuan;
  satuan_stok := v_satuan_stok;
  konversi := v_konv;
  butuh := round(coalesce(p_qty, 0) * v_konv, 3);
  stok := v_produk.stok;
  pesan := null;
  return next;
end;
$$;

create or replace function public.toko_urai_baris(p_baris jsonb)
returns table (
  urutan bigint,
  baris_id uuid,
  produk_id uuid,
  nama text,
  satuan text,
  satuan_stok text,
  konversi numeric,
  qty numeric,
  butuh numeric,
  muat numeric,
  cukup boolean,
  pesan text
)
language plpgsql
volatile
security definer
set search_path = toko, public
as $$
declare
  v_el record;
  v_cocok record;
  v_sisa jsonb := '{}'::jsonb;
  v_tersedia numeric;
  v_muat numeric;
  v_pakai numeric;
  v_kunci text;
begin
  for v_el in
    select t.ordinality as ord, t.value
    from jsonb_array_elements(coalesce(p_baris, '[]'::jsonb)) with ordinality as t(value, ordinality)
    order by t.ordinality
  loop
    select * into v_cocok
    from public.toko_cocok_barang(
      nullif(v_el.value->>'produk_id', '')::uuid,
      v_el.value->>'nama',
      v_el.value->>'satuan',
      coalesce((v_el.value->>'qty')::numeric, 0)
    );

    urutan := v_el.ord;
    baris_id := nullif(v_el.value->>'id', '')::uuid;
    produk_id := v_cocok.produk_id;
    nama := v_cocok.nama;
    satuan := v_cocok.satuan;
    satuan_stok := v_cocok.satuan_stok;
    konversi := v_cocok.konversi;
    qty := coalesce((v_el.value->>'qty')::numeric, 0);
    butuh := v_cocok.butuh;
    if v_cocok.pesan is not null then
      muat := 0;
      cukup := false;
      pesan := v_cocok.pesan;
      return next;
      continue;
    end if;

    v_kunci := v_cocok.produk_id::text;
    if v_sisa ? v_kunci then
      v_tersedia := (v_sisa->>v_kunci)::numeric;
    else
      v_tersedia := coalesce(v_cocok.stok, 0);
    end if;

    v_muat := trunc(v_tersedia / v_cocok.konversi, 3);
    if v_muat < 0 then
      v_muat := 0;
    end if;
    if v_muat > qty then
      v_muat := qty;
    end if;
    v_pakai := round(v_muat * v_cocok.konversi, 3);
    v_sisa := jsonb_set(v_sisa, array[v_kunci], to_jsonb(round(v_tersedia - v_pakai, 3)), true);

    muat := v_muat;
    cukup := v_muat + 0.0000001 >= qty;
    if cukup then
      pesan := null;
    else
      pesan := format(
        'Stok %s tidak cukup. Pesan %s %s, yang muat %s %s (sisa %s %s).',
        v_cocok.nama,
        trim(to_char(qty, 'FM999999990.###')),
        v_cocok.satuan,
        trim(to_char(v_muat, 'FM999999990.###')),
        v_cocok.satuan,
        trim(to_char(greatest(v_tersedia, 0), 'FM999999990.###')),
        v_cocok.satuan_stok
      );
    end if;
    return next;
  end loop;
end;
$$;

create or replace function public.daftar_katalog_toko_bekon()
returns table (
  id uuid,
  nama text,
  satuan text,
  harga_jual numeric,
  stok numeric,
  kemasan jsonb
)
language sql
stable
security definer
set search_path = toko, public
as $$
  select
    p.id,
    p.nama,
    coalesce(s.nama, ''),
    p.harga_jual,
    p.stok,
    coalesce((
      select jsonb_agg(
        jsonb_build_object('satuan', k.satuan, 'harga_jual', k.harga_jual, 'konversi', k.konversi)
        order by k.satuan
      )
      from toko.produk_kemasan k
      where k.produk_id = p.id
    ), '[]'::jsonb)
  from toko.produk p
  left join toko.satuan s on s.id = p.satuan_id
  where p.aktif
  order by p.nama;
$$;

create or replace function public.cek_barang_toko_bekon(p_baris jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = toko, public
as $$
declare
  v_row record;
  v_masalah text := '';
begin
  if jsonb_array_length(coalesce(p_baris, '[]'::jsonb)) = 0 then
    raise exception 'Pesanan Toko Bekon belum punya barang.';
  end if;
  for v_row in select * from public.toko_urai_baris(p_baris) loop
    if v_row.pesan is not null then
      v_masalah := v_masalah || v_row.pesan || ' ';
    end if;
  end loop;
  if length(trim(v_masalah)) > 0 then
    raise exception '%', trim(v_masalah);
  end if;
end;
$$;

create or replace function public.kunci_barang_toko_bekon(p_po_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = toko, public
as $$
declare
  v_po public.material_purchase_orders%rowtype;
  v_baris jsonb;
  v_row record;
  v_masalah text := '';
begin
  select * into v_po from public.material_purchase_orders where id = p_po_id;
  if not found then
    raise exception 'PO tidak ditemukan';
  end if;
  if lower(trim(coalesce(v_po.supplier_name, ''))) <> 'toko bekon' then
    return;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'nama', i.material_name,
      'satuan', i.unit,
      'qty', i.qty_ordered,
      'produk_id', i.toko_produk_id
    )
    order by i.sort_order, i.created_at
  ), '[]'::jsonb)
  into v_baris
  from public.material_purchase_order_items i
  where i.po_id = p_po_id;

  if jsonb_array_length(v_baris) = 0 then
    raise exception 'Pesanan Toko Bekon belum punya barang.';
  end if;

  for v_row in select * from public.toko_urai_baris(v_baris) loop
    if v_row.pesan is not null then
      v_masalah := v_masalah || v_row.pesan || ' ';
    elsif v_row.baris_id is not null then
      update public.material_purchase_order_items
      set material_name = v_row.nama,
          unit = v_row.satuan,
          toko_produk_id = v_row.produk_id
      where id = v_row.baris_id;
    end if;
  end loop;

  if length(trim(v_masalah)) > 0 then
    raise exception '%', trim(v_masalah);
  end if;

  update public.material_purchase_orders
  set payment_method = 'credit'
  where id = p_po_id
    and payment_method is distinct from 'credit';
end;
$$;

create or replace function public.siapkan_pesanan_toko_bekon(p_po_id uuid)
returns void
language plpgsql
security definer
set search_path = toko, public
as $$
declare
  v_po public.material_purchase_orders%rowtype;
  v_jual uuid;
begin
  select * into v_po from public.material_purchase_orders where id = p_po_id;
  if not found then
    return;
  end if;
  if lower(trim(coalesce(v_po.supplier_name, ''))) <> 'toko bekon' then
    return;
  end if;
  if v_po.status <> 'approved' then
    return;
  end if;

  select id into v_jual from toko.penjualan where bekon_po_id = p_po_id;
  if v_jual is not null then
    insert into toko.pesanan_bekon (bekon_po_id, status, penjualan_id)
    values (p_po_id, 'jadi_nota', v_jual)
    on conflict (bekon_po_id) do update
      set status = 'jadi_nota',
          penjualan_id = excluded.penjualan_id,
          updated_at = now();
    return;
  end if;

  insert into toko.pesanan_bekon (bekon_po_id, status)
  values (p_po_id, 'menunggu')
  on conflict (bekon_po_id) do update
    set status = 'menunggu',
        updated_at = now()
    where toko.pesanan_bekon.status is distinct from 'jadi_nota';
end;
$$;

create or replace function public.trg_siapkan_pesanan_toko_bekon()
returns trigger
language plpgsql
security definer
set search_path = toko, public
as $$
begin
  if lower(trim(coalesce(new.supplier_name, ''))) = 'toko bekon'
     and new.status = 'approved'
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.siapkan_pesanan_toko_bekon(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists pesanan_toko_bekon_siap on public.material_purchase_orders;
create trigger pesanan_toko_bekon_siap
after insert or update of status, supplier_name
on public.material_purchase_orders
for each row
execute function public.trg_siapkan_pesanan_toko_bekon();

drop function if exists public.daftar_pesanan_toko_bekon();
create or replace function public.daftar_pesanan_toko_bekon()
returns table (
  po_id uuid,
  nomor_po text,
  nomor_pengajuan text,
  kode_proyek text,
  nama_proyek text,
  nama_pemilik text,
  tanggal date,
  total numeric,
  siap boolean,
  baris jsonb
)
language plpgsql
volatile
security definer
set search_path = toko, public
as $$
declare
  v_po record;
  v_baris jsonb;
  v_urai jsonb;
  v_total numeric;
  v_siap boolean;
begin
  for v_po in
    select o.id
    from public.material_purchase_orders o
    where lower(trim(o.supplier_name)) = 'toko bekon'
      and o.status = 'approved'
      and not exists (select 1 from toko.penjualan j where j.bekon_po_id = o.id)
  loop
    perform public.siapkan_pesanan_toko_bekon(v_po.id);
  end loop;

  for v_po in
    select
      o.id,
      o.po_number,
      o.po_approved_at,
      o.ordered_at,
      r.request_number,
      p.code as kode,
      p.name as nama,
      nullif(trim(p.owner), '') as pemilik
    from public.material_purchase_orders o
    join toko.pesanan_bekon b on b.bekon_po_id = o.id and b.status = 'menunggu'
    left join public.projects p on p.id = o.project_id
    left join public.material_requests r on r.id = o.material_request_id
    where lower(trim(o.supplier_name)) = 'toko bekon'
      and o.status = 'approved'
      and not exists (select 1 from toko.penjualan j where j.bekon_po_id = o.id)
    order by o.po_approved_at desc nulls last
    limit 50
  loop
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'nama', i.material_name,
        'satuan', i.unit,
        'qty', i.qty_ordered,
        'harga', coalesce(i.unit_price, 0),
        'produk_id', i.toko_produk_id
      )
      order by i.sort_order, i.created_at
    ), '[]'::jsonb)
    into v_baris
    from public.material_purchase_order_items i
    where i.po_id = v_po.id;

    create temp table if not exists tmp_urai_daftar (
      urutan bigint,
      baris_id uuid,
      produk_id uuid,
      nama text,
      satuan text,
      satuan_stok text,
      konversi numeric,
      qty numeric,
      butuh numeric,
      muat numeric,
      cukup boolean,
      pesan text
    ) on commit drop;
    truncate tmp_urai_daftar;
    insert into tmp_urai_daftar
    select * from public.toko_urai_baris(v_baris);

    select coalesce(jsonb_agg(x.obj order by x.ord), '[]'::jsonb),
           coalesce(bool_and(x.cukup), false),
           coalesce(sum(x.nilai), 0)
    into v_urai, v_siap, v_total
    from (
      select
        src.ord,
        u.cukup,
        round(u.qty * coalesce((src.value->>'harga')::numeric, 0), 2) as nilai,
        jsonb_build_object(
          'nama', u.nama,
          'satuan', u.satuan,
          'satuan_asal', case
            when length(trim(coalesce(src.value->>'satuan', ''))) > 0
             and lower(trim(src.value->>'satuan')) <> lower(u.satuan)
            then trim(src.value->>'satuan')
            else null
          end,
          'qty', u.qty,
          'harga', coalesce((src.value->>'harga')::numeric, 0),
          'stok', u.muat,
          'cukup', u.cukup,
          'pesan', u.pesan
        ) as obj
      from jsonb_array_elements(v_baris) with ordinality as src(value, ord)
      join tmp_urai_daftar u on u.urutan = src.ord
    ) x;

    po_id := v_po.id;
    nomor_po := v_po.po_number;
    nomor_pengajuan := v_po.request_number;
    kode_proyek := v_po.kode;
    nama_proyek := v_po.nama;
    nama_pemilik := v_po.pemilik;
    tanggal := coalesce(v_po.po_approved_at::date, v_po.ordered_at::date, current_date);
    total := v_total;
    siap := v_siap;
    baris := v_urai;
    return next;
  end loop;
end;
$$;

drop function if exists public.sahkan_pesanan_toko_bekon(uuid);
create or replace function public.sahkan_pesanan_toko_bekon(p_po_id uuid, p_kasir text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = toko, public
as $$
declare
  v_po public.material_purchase_orders%rowtype;
  v_id uuid;
  v_pelanggan uuid;
  v_baris jsonb;
  v_row record;
  v_masalah text := '';
  v_total numeric := 0;
  v_proyek_id uuid;
  v_proyek text;
  v_nama_proyek text;
  v_nama_pemilik text;
  v_pengajuan text;
  v_catatan text;
  v_harga numeric;
  v_beli numeric;
begin
  select * into v_po from public.material_purchase_orders where id = p_po_id;
  if not found then
    raise exception 'PO tidak ditemukan';
  end if;
  if lower(trim(coalesce(v_po.supplier_name, ''))) <> 'toko bekon' then
    raise exception 'Supplier PO ini bukan Toko Bekon';
  end if;

  select id into v_id from toko.penjualan where bekon_po_id = p_po_id;
  if found then
    update toko.pesanan_bekon
    set status = 'jadi_nota', penjualan_id = v_id, updated_at = now()
    where bekon_po_id = p_po_id;
    return v_id;
  end if;

  if v_po.status <> 'approved' then
    raise exception 'Pesanan belum berada di tahap cetak dan kirim';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'nama', i.material_name,
      'satuan', i.unit,
      'qty', i.qty_ordered,
      'produk_id', i.toko_produk_id
    )
    order by i.sort_order, i.created_at
  ), '[]'::jsonb)
  into v_baris
  from public.material_purchase_order_items i
  where i.po_id = p_po_id;

  perform 1
  from toko.produk
  where id in (
    select (value->>'produk_id')::uuid
    from jsonb_array_elements(v_baris)
    where nullif(value->>'produk_id', '') is not null
    union
    select c.produk_id
    from public.toko_urai_baris(v_baris) c
    where c.produk_id is not null
  )
  order by id
  for update;

  for v_row in select * from public.toko_urai_baris(v_baris) loop
    if v_row.pesan is not null then
      v_masalah := v_masalah || v_row.pesan || ' ';
    end if;
  end loop;
  if length(trim(v_masalah)) > 0 then
    raise exception '%', trim(v_masalah);
  end if;

  select id, code, name, nullif(trim(owner), '') into v_proyek_id, v_proyek, v_nama_proyek, v_nama_pemilik
  from public.projects where id = v_po.project_id;
  select request_number into v_pengajuan
  from public.material_requests where id = v_po.material_request_id;

  select id into v_pelanggan
  from toko.pelanggan
  where lower(trim(nama)) = 'bekon pro'
  limit 1;
  if v_pelanggan is null then
    insert into toko.pelanggan (nama, tipe)
    values ('Bekon Pro', 'kontraktor')
    returning id into v_pelanggan;
  end if;

  v_catatan := 'PO ' || v_po.po_number;
  if v_pengajuan is not null and length(trim(v_pengajuan)) > 0 then
    v_catatan := v_catatan || ' · ' || v_pengajuan;
  end if;
  if v_proyek is not null and length(trim(v_proyek)) > 0 then
    v_catatan := v_catatan || ' · ' || v_proyek;
  end if;

  v_id := gen_random_uuid();
  insert into toko.penjualan (
    id, nomor_nota, tanggal, pelanggan_id, catatan, dicatat_oleh, bekon_po_id,
    bekon_proyek_id, kode_proyek, nama_proyek, nama_pemilik
  )
  values (
    v_id,
    toko.nomor_baru('JL'),
    current_date,
    v_pelanggan,
    v_catatan,
    nullif(trim(p_kasir), ''),
    p_po_id,
    v_proyek_id,
    v_proyek,
    v_nama_proyek,
    v_nama_pemilik
  );

  for v_row in
    select u.*, i.unit_price, p.harga_beli
    from public.toko_urai_baris(v_baris) u
    join public.material_purchase_order_items i on i.id = u.baris_id
    join toko.produk p on p.id = u.produk_id
  loop
    v_harga := coalesce(v_row.unit_price, 0);
    if v_harga <= 0 then
      raise exception 'Harga % belum diisi di PO', v_row.nama;
    end if;
    v_beli := round(coalesce(v_row.harga_beli, 0) * v_row.konversi, 2);
    update public.material_purchase_order_items
    set material_name = v_row.nama,
        unit = v_row.satuan,
        toko_produk_id = v_row.produk_id
    where id = v_row.baris_id;
    insert into toko.penjualan_item (penjualan_id, produk_id, qty, harga_satuan, harga_beli, subtotal)
    values (v_id, v_row.produk_id, v_row.qty, v_harga, v_beli, round(v_row.qty * v_harga, 2));
    update toko.produk
    set stok = stok - v_row.butuh, updated_at = now()
    where id = v_row.produk_id;
    v_total := v_total + round(v_row.qty * v_harga, 2);
  end loop;

  if v_total <= 0 then
    raise exception 'PO tidak punya barang yang bisa dijadikan nota';
  end if;

  update toko.penjualan
  set total = v_total,
      diskon = 0,
      grand_total = v_total,
      dibayar = 0,
      status_bayar = 'belum_lunas'
  where id = v_id;

  insert into toko.pesanan_bekon (bekon_po_id, status, penjualan_id)
  values (p_po_id, 'jadi_nota', v_id)
  on conflict (bekon_po_id) do update
    set status = 'jadi_nota',
        penjualan_id = excluded.penjualan_id,
        updated_at = now();

  return v_id;
end;
$$;

create or replace function public.kembalikan_pesanan_toko_bekon(p_po_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = toko, public
as $$
declare
  v_po public.material_purchase_orders%rowtype;
  v_baris jsonb;
  v_row record;
  v_catatan text := '[Stok toko kurang]';
  v_notes text;
begin
  select * into v_po from public.material_purchase_orders where id = p_po_id for update;
  if not found then
    raise exception 'PO tidak ditemukan';
  end if;
  if lower(trim(coalesce(v_po.supplier_name, ''))) <> 'toko bekon' then
    raise exception 'Supplier PO ini bukan Toko Bekon';
  end if;
  if exists (select 1 from toko.penjualan where bekon_po_id = p_po_id) then
    raise exception 'Pesanan ini sudah menjadi nota';
  end if;
  if v_po.status <> 'approved' then
    raise exception 'Pesanan tidak lagi berada di tahap cetak dan kirim';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'nama', i.material_name,
      'satuan', i.unit,
      'qty', i.qty_ordered,
      'produk_id', i.toko_produk_id
    )
    order by i.sort_order, i.created_at
  ), '[]'::jsonb)
  into v_baris
  from public.material_purchase_order_items i
  where i.po_id = p_po_id;

  for v_row in select * from public.toko_urai_baris(v_baris) loop
    v_catatan := v_catatan || E'\n' || v_row.nama || ': pesan '
      || trim(to_char(v_row.qty, 'FM999999990.###')) || ' ' || coalesce(v_row.satuan, '');
    if v_row.pesan is not null then
      v_catatan := v_catatan || '. ' || v_row.pesan;
    else
      v_catatan := v_catatan || '. Stok cukup.';
    end if;
  end loop;

  if position('[Stok toko kurang]' in coalesce(v_po.notes, '')) > 0 then
    v_notes := nullif(trim(substring(v_po.notes from 1 for position('[Stok toko kurang]' in v_po.notes) - 1)), '');
  else
    v_notes := nullif(trim(v_po.notes), '');
  end if;
  v_notes := concat_ws(E'\n', v_notes, v_catatan);

  update public.material_purchase_orders
  set status = 'draft',
      po_approved_by = null,
      po_approved_at = null,
      notes = v_notes
  where id = p_po_id;

  insert into toko.pesanan_bekon (bekon_po_id, status, catatan_toko)
  values (p_po_id, 'dikembalikan', v_catatan)
  on conflict (bekon_po_id) do update
    set status = 'dikembalikan',
        catatan_toko = excluded.catatan_toko,
        updated_at = now()
    where toko.pesanan_bekon.status is distinct from 'jadi_nota';
end;
$$;

create or replace function public.pecah_sisa_stok_toko_bekon(p_po_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = toko, public
as $$
declare
  v_po public.material_purchase_orders%rowtype;
  v_baris jsonb;
  v_row record;
  v_ada_muat boolean := false;
  v_ada_kurang boolean := false;
  v_baru uuid;
  v_nomor text;
  v_kode text;
  v_ymd text;
  v_i int;
  v_sisa numeric;
  v_catatan text;
begin
  select * into v_po from public.material_purchase_orders where id = p_po_id for update;
  if not found then
    raise exception 'PO tidak ditemukan';
  end if;
  if lower(trim(coalesce(v_po.supplier_name, ''))) <> 'toko bekon' then
    raise exception 'Supplier PO ini bukan Toko Bekon';
  end if;
  if v_po.status <> 'draft' then
    raise exception 'Penyesuaian stok hanya untuk pesanan yang sudah dikembalikan ke isi pesanan';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'nama', i.material_name,
      'satuan', i.unit,
      'qty', i.qty_ordered,
      'produk_id', i.toko_produk_id
    )
    order by i.sort_order, i.created_at
  ), '[]'::jsonb)
  into v_baris
  from public.material_purchase_order_items i
  where i.po_id = p_po_id;

  create temp table if not exists tmp_urai_pecah (
    urutan bigint,
    baris_id uuid,
    produk_id uuid,
    nama text,
    satuan text,
    satuan_stok text,
    konversi numeric,
    qty numeric,
    butuh numeric,
    muat numeric,
    cukup boolean,
    pesan text
  ) on commit drop;
  truncate tmp_urai_pecah;
  insert into tmp_urai_pecah select * from public.toko_urai_baris(v_baris);

  if exists (select 1 from tmp_urai_pecah where pesan like 'Barang %' or pesan like 'Satuan %') then
    raise exception '%', (select string_agg(pesan, ' ') from tmp_urai_pecah where pesan is not null);
  end if;

  select bool_or(muat > 0), bool_or(not cukup)
  into v_ada_muat, v_ada_kurang
  from tmp_urai_pecah;

  if coalesce(v_ada_kurang, false) = false then
    raise exception 'Jumlah pesanan sudah sesuai stok. Ajukan ulang ke Manager.';
  end if;
  if coalesce(v_ada_muat, false) = false then
    raise exception 'Stok Toko Bekon kosong untuk pesanan ini. Biarkan di isi pesanan sampai stok tersedia.';
  end if;

  select code into v_kode from public.projects where id = v_po.project_id;
  v_kode := coalesce(nullif(trim(v_kode), ''), 'PRJ');
  v_ymd := to_char(now() at time zone 'Asia/Jakarta', 'YYYYMMDD');
  v_nomor := null;
  for v_i in 1..8 loop
    v_nomor := 'PO-' || v_kode || '-' || v_ymd || '-' || (1000 + floor(random() * 9000))::int::text;
    exit when not exists (
      select 1 from public.material_purchase_orders where po_number = v_nomor
    );
    v_nomor := null;
  end loop;
  if v_nomor is null then
    raise exception 'Gagal membuat nomor PO sisa';
  end if;

  insert into public.material_purchase_orders (
    material_request_id, project_id, po_number, supplier_name, supplier_contractor_id,
    status, notes, needed_date, created_by, payment_method
  )
  values (
    v_po.material_request_id,
    v_po.project_id,
    v_nomor,
    v_po.supplier_name,
    v_po.supplier_contractor_id,
    'draft',
    'Sisa dari ' || v_po.po_number || ' karena stok Toko Bekon kurang.',
    v_po.needed_date,
    v_po.created_by,
    'credit'
  )
  returning id into v_baru;

  for v_row in select * from tmp_urai_pecah loop
    if v_row.cukup then
      continue;
    end if;
    if v_row.muat <= 0 then
      update public.material_purchase_order_items
      set po_id = v_baru
      where id = v_row.baris_id;
    else
      v_sisa := round(v_row.qty - v_row.muat, 3);
      update public.material_purchase_order_items
      set qty_ordered = v_row.muat,
          excess_stock_qty = null,
          excess_warehouse = null
      where id = v_row.baris_id;
      insert into public.material_purchase_order_items (
        po_id, material_request_item_id, source_request_item_ids, rap_material_name,
        material_name, specification, unit, qty_ordered, sort_order, unit_price, toko_produk_id
      )
      select
        v_baru, material_request_item_id, source_request_item_ids, rap_material_name,
        material_name, specification, unit, v_sisa, sort_order, unit_price, toko_produk_id
      from public.material_purchase_order_items
      where id = v_row.baris_id;
    end if;
  end loop;

  v_catatan := 'Jumlah disesuaikan dengan stok toko. Sisa dipindah ke ' || v_nomor || '. Ajukan ulang PO ini ke Manager.';
  update public.material_purchase_orders
  set notes = concat_ws(E'\n', nullif(trim(coalesce(notes, '')), ''), v_catatan)
  where id = p_po_id;

  update toko.pesanan_bekon
  set catatan_toko = v_catatan, updated_at = now()
  where bekon_po_id = p_po_id
    and status = 'dikembalikan';

  return v_baru;
end;
$$;

create or replace function public.daftar_pengembalian_toko_bekon(p_request_id uuid)
returns table (
  po_id uuid,
  nomor_po text,
  catatan text
)
language sql
stable
security definer
set search_path = toko, public
as $$
  select o.id, o.po_number, b.catatan_toko
  from toko.pesanan_bekon b
  join public.material_purchase_orders o on o.id = b.bekon_po_id
  where o.material_request_id = p_request_id
    and o.status = 'draft'
    and lower(trim(o.supplier_name)) = 'toko bekon'
    and b.status = 'dikembalikan'
    and coalesce(b.catatan_toko, '') <> '';
$$;

create or replace function public.nota_toko_untuk_po(p_po_id uuid)
returns boolean
language sql
stable
security definer
set search_path = toko, public
as $$
  select exists (
    select 1 from toko.penjualan where bekon_po_id = p_po_id
  );
$$;

grant execute on function public.toko_cocok_barang(uuid, text, text, numeric) to anon, authenticated, service_role;
grant execute on function public.toko_urai_baris(jsonb) to anon, authenticated, service_role;
grant execute on function public.daftar_katalog_toko_bekon() to anon, authenticated, service_role;
grant execute on function public.cek_barang_toko_bekon(jsonb) to anon, authenticated, service_role;
grant execute on function public.kunci_barang_toko_bekon(uuid) to anon, authenticated, service_role;
grant execute on function public.siapkan_pesanan_toko_bekon(uuid) to anon, authenticated, service_role;
grant execute on function public.daftar_pesanan_toko_bekon() to anon, authenticated, service_role;
grant execute on function public.sahkan_pesanan_toko_bekon(uuid, text) to anon, authenticated, service_role;
grant execute on function public.kembalikan_pesanan_toko_bekon(uuid) to anon, authenticated, service_role;
grant execute on function public.pecah_sisa_stok_toko_bekon(uuid) to anon, authenticated, service_role;
grant execute on function public.daftar_pengembalian_toko_bekon(uuid) to anon, authenticated, service_role;
create or replace function public.rincian_po_toko_bekon(p_po_id uuid)
returns table (
  nama text,
  satuan text,
  qty numeric,
  harga numeric,
  subtotal numeric
)
language sql
stable
security definer
set search_path = toko, public
as $$
  select
    i.material_name,
    coalesce(i.unit, ''),
    i.qty_ordered,
    coalesce(i.unit_price, 0),
    round(i.qty_ordered * coalesce(i.unit_price, 0), 2)
  from public.material_purchase_order_items i
  join public.material_purchase_orders o on o.id = i.po_id
  where i.po_id = p_po_id
    and lower(trim(o.supplier_name)) = 'toko bekon'
  order by i.sort_order, i.created_at;
$$;

grant execute on function public.nota_toko_untuk_po(uuid) to anon, authenticated, service_role;
grant execute on function public.rincian_po_toko_bekon(uuid) to anon, authenticated, service_role;

create or replace function public.kirim_po_toko_bekon(p_po_id uuid)
returns table (
  alamat text,
  cara text,
  tanggal date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    nullif(trim(p.location), ''),
    case r.delivery_mode
      when 'delivery' then 'dikirim'
      when 'pickup' then 'diambil'
      else null
    end,
    case r.delivery_mode
      when 'pickup' then coalesce(r.pickup_date, r.needed_date, o.needed_date)
      when 'delivery' then coalesce(r.delivery_date, r.needed_date, o.needed_date)
      else coalesce(r.needed_date, o.needed_date)
    end
  from public.material_purchase_orders o
  left join public.projects p on p.id = o.project_id
  left join public.material_requests r on r.id = o.material_request_id
  where o.id = p_po_id
    and lower(trim(o.supplier_name)) = 'toko bekon';
$$;

grant execute on function public.kirim_po_toko_bekon(uuid) to anon, authenticated, service_role;

do $$
declare r record;
begin
  for r in
    select id
    from public.material_purchase_orders
    where lower(trim(supplier_name)) = 'toko bekon'
      and status = 'approved'
  loop
    perform public.siapkan_pesanan_toko_bekon(r.id);
  end loop;
end $$;
