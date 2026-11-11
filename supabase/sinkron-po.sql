-- Tarik satu PO supplier Toko Bekon yang sudah dijurnal menjadi nota penjualan toko.
-- Jalankan sekali di SQL Editor proyek Supabase bekon-pro.

alter table toko.penjualan add column if not exists bekon_po_id uuid;
create unique index if not exists penjualan_bekon_po_uidx
  on toko.penjualan (bekon_po_id)
  where bekon_po_id is not null;

create or replace function public.daftar_po_toko_bekon()
returns table (
  po_id uuid,
  nomor_po text,
  nomor_pengajuan text,
  kode_proyek text,
  tanggal date,
  total numeric,
  barang text
)
language sql
stable
security definer
set search_path = toko, public
as $$
  select
    o.id,
    o.po_number,
    r.request_number,
    p.code,
    coalesce(o.completed_at::date, o.ordered_at::date),
    coalesce((
      select sum(round(i.qty_ordered * coalesce(i.unit_price, 0), 2))
      from public.material_purchase_order_items i
      where i.po_id = o.id
    ), 0),
    (
      select string_agg(
        i.material_name || ' × ' || trim(to_char(i.qty_ordered, 'FM999999990.###')),
        ', ' order by i.sort_order, i.created_at
      )
      from public.material_purchase_order_items i
      where i.po_id = o.id
    )
  from public.material_purchase_orders o
  left join public.projects p on p.id = o.project_id
  left join public.material_requests r on r.id = o.material_request_id
  where lower(trim(o.supplier_name)) = 'toko bekon'
    and o.status = 'completed'
    and not exists (
      select 1 from toko.penjualan j where j.bekon_po_id = o.id
    )
  order by o.completed_at desc nulls last
  limit 30;
$$;

create or replace function public.sinkron_penjualan_toko_bekon(p_po_id uuid)
returns uuid
language plpgsql
security definer
set search_path = toko, public
as $$
declare
  v_po public.material_purchase_orders%rowtype;
  v_id uuid;
  v_pelanggan uuid;
  v_item record;
  v_produk toko.produk%rowtype;
  v_qty numeric;
  v_harga numeric;
  v_total numeric := 0;
  v_proyek text;
  v_pengajuan text;
  v_catatan text;
begin
  select * into v_po from public.material_purchase_orders where id = p_po_id;
  if not found then
    raise exception 'PO tidak ditemukan';
  end if;
  if lower(trim(v_po.supplier_name)) <> 'toko bekon' then
    raise exception 'Supplier PO ini bukan Toko Bekon';
  end if;
  if v_po.status <> 'completed' then
    raise exception 'PO belum sampai tahap Sudah jurnal';
  end if;

  select id into v_id from toko.penjualan where bekon_po_id = p_po_id;
  if found then
    return v_id;
  end if;

  select code into v_proyek from public.projects where id = v_po.project_id;
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
    id, nomor_nota, tanggal, pelanggan_id, catatan, dicatat_oleh, bekon_po_id
  )
  values (
    v_id,
    toko.nomor_baru('JL'),
    coalesce(v_po.completed_at::date, current_date),
    v_pelanggan,
    v_catatan,
    'Bekon Pro',
    p_po_id
  );

  for v_item in
    select material_name, qty_ordered, unit_price
    from public.material_purchase_order_items
    where po_id = p_po_id
    order by sort_order, created_at
  loop
    v_qty := v_item.qty_ordered;
    v_harga := v_item.unit_price;
    if v_qty is null or v_qty <= 0 then
      continue;
    end if;
    if v_harga is null or v_harga <= 0 then
      raise exception 'Harga % belum diisi di PO', v_item.material_name;
    end if;

    select * into v_produk
    from toko.produk
    where aktif and lower(trim(nama)) = lower(trim(v_item.material_name))
    order by created_at
    limit 1
    for update;
    if not found then
      raise exception 'Barang "%" belum ada di katalog Toko Bekon. Samakan namanya, lalu tarik lagi.', v_item.material_name;
    end if;
    if v_produk.stok < v_qty then
      raise exception 'Stok % tidak cukup. Sisa %', v_produk.nama, v_produk.stok;
    end if;

    insert into toko.penjualan_item (penjualan_id, produk_id, qty, harga_satuan, harga_beli, subtotal)
    values (v_id, v_produk.id, v_qty, v_harga, v_produk.harga_beli, round(v_qty * v_harga, 2));
    update toko.produk
    set stok = stok - v_qty, updated_at = now()
    where id = v_produk.id;
    v_total := v_total + round(v_qty * v_harga, 2);
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

  return v_id;
end;
$$;

grant execute on function public.daftar_po_toko_bekon() to anon, authenticated, service_role;
grant execute on function public.sinkron_penjualan_toko_bekon(uuid) to anon, authenticated, service_role;
