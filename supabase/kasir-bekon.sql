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

grant execute on function public.sahkan_pesanan_toko_bekon(uuid, text) to anon, authenticated, service_role;
notify pgrst, 'reload schema';
