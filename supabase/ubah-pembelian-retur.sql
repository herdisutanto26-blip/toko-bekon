-- Ubah pembelian dan retur yang sudah tersimpan.
-- Stok hanya bergeser sebesar selisih qty, jadi mengubah tanggal saja tidak mengubah stok.
-- Aman dijalankan ulang.

create or replace function toko.ubah_pembelian(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = toko, public
as $$
declare
  v_id uuid := nullif(payload->>'id', '')::uuid;
  v_beli toko.pembelian%rowtype;
  v_item jsonb;
  v_produk toko.produk%rowtype;
  v_lama jsonb := '{}'::jsonb;
  v_baru jsonb := '{}'::jsonb;
  v_kunci text;
  v_qty numeric;
  v_konv numeric;
  v_butuh numeric;
  v_harga numeric;
  v_delta numeric;
  v_total numeric := 0;
  v_dibayar numeric := coalesce((payload->>'dibayar')::numeric, 0);
begin
  if v_id is null then
    raise exception 'Pembelian tidak ditemukan';
  end if;
  if nullif(payload->>'supplier_id', '') is null then
    raise exception 'Supplier wajib diisi';
  end if;
  if payload->'items' is null or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Pembelian belum punya barang';
  end if;
  select * into v_beli from toko.pembelian where id = v_id for update;
  if not found then
    raise exception 'Pembelian tidak ditemukan';
  end if;
  if exists (select 1 from toko.retur_pembelian where pembelian_id = v_id) then
    raise exception 'Pembelian sudah ada retur, tidak bisa diubah';
  end if;
  if exists (select 1 from toko.pelunasan_hutang where pembelian_id = v_id) then
    raise exception 'Pembelian sudah ada pelunasan, tidak bisa diubah dari sini';
  end if;

  select coalesce(jsonb_object_agg(produk_id::text, butuh), '{}'::jsonb) into v_lama
  from (
    select produk_id, sum(round(qty * coalesce(konversi, 1), 6)) as butuh
    from toko.pembelian_item
    where pembelian_id = v_id
    group by produk_id
  ) s;

  delete from toko.pembelian_item where pembelian_id = v_id;

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
    select * into v_produk from toko.produk where id = (v_item->>'produk_id')::uuid for update;
    if not found then
      raise exception 'Produk tidak ditemukan';
    end if;
    v_butuh := round(v_qty * v_konv, 6);
    v_harga := coalesce(nullif(v_item->>'harga_satuan', '')::numeric, v_produk.harga_beli);
    insert into toko.pembelian_item (pembelian_id, produk_id, qty, satuan, konversi, harga_satuan, subtotal)
    values (v_id, v_produk.id, v_qty, nullif(v_item->>'satuan', ''), v_konv, v_harga, v_qty * v_harga);
    update toko.produk
    set harga_beli = round(v_harga / v_konv, 2),
        updated_at = now()
    where id = v_produk.id;
    v_baru := jsonb_set(
      v_baru,
      array[v_produk.id::text],
      to_jsonb(coalesce((v_baru->>v_produk.id::text)::numeric, 0) + v_butuh)
    );
    v_total := v_total + (v_qty * v_harga);
  end loop;

  for v_kunci in
    select kunci from (
      select jsonb_object_keys(v_lama) as kunci
      union
      select jsonb_object_keys(v_baru)
    ) k
  loop
    v_delta := coalesce((v_baru->>v_kunci)::numeric, 0) - coalesce((v_lama->>v_kunci)::numeric, 0);
    if v_delta = 0 then
      continue;
    end if;
    select * into v_produk from toko.produk where id = v_kunci::uuid for update;
    if not found then
      raise exception 'Produk tidak ditemukan';
    end if;
    if v_delta < 0 and v_produk.stok + 0.0000001 < -v_delta then
      raise exception 'Stok % tidak cukup untuk mengurangi pembelian. Sisa %', v_produk.nama, v_produk.stok;
    end if;
    update toko.produk
    set stok = stok + v_delta,
        updated_at = now()
    where id = v_produk.id;
  end loop;

  if v_dibayar < 0 then
    raise exception 'Pembayaran tidak valid';
  end if;
  if v_dibayar > v_total then
    v_dibayar := v_total;
  end if;

  update toko.pembelian
  set tanggal = coalesce((payload->>'tanggal')::date, tanggal),
      supplier_id = (payload->>'supplier_id')::uuid,
      catatan = nullif(payload->>'catatan', ''),
      total = v_total,
      dibayar = v_dibayar,
      status_bayar = toko.status_bayar(v_total, v_dibayar, 0),
      dicatat_oleh = coalesce(nullif(payload->>'dicatat_oleh', ''), dicatat_oleh)
  where id = v_id;

  return v_id;
end;
$$;

create or replace function toko.ubah_retur_penjualan(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = toko, public
as $$
declare
  v_id uuid := nullif(payload->>'id', '')::uuid;
  v_retur toko.retur_penjualan%rowtype;
  v_jual toko.penjualan%rowtype;
  v_item jsonb;
  v_baris toko.penjualan_item%rowtype;
  v_produk toko.produk%rowtype;
  v_lama jsonb := '{}'::jsonb;
  v_baru jsonb := '{}'::jsonb;
  v_kunci text;
  v_qty numeric;
  v_sudah numeric;
  v_delta numeric;
  v_total numeric := 0;
  v_jumlah_retur numeric;
begin
  if v_id is null then
    raise exception 'Retur tidak ditemukan';
  end if;
  select * into v_retur from toko.retur_penjualan where id = v_id for update;
  if not found then
    raise exception 'Retur tidak ditemukan';
  end if;
  select * into v_jual from toko.penjualan where id = v_retur.penjualan_id for update;
  if not found then
    raise exception 'Nota penjualan tidak ditemukan';
  end if;
  if payload->'items' is null or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Retur belum punya barang';
  end if;

  select coalesce(jsonb_object_agg(item_id::text, qty), '{}'::jsonb) into v_lama
  from (
    select penjualan_item_id as item_id, sum(qty) as qty
    from toko.retur_penjualan_item
    where retur_id = v_id
    group by penjualan_item_id
  ) s;

  delete from toko.retur_penjualan_item where retur_id = v_id;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_qty := coalesce((v_item->>'qty')::numeric, 0);
    if v_qty <= 0 then
      continue;
    end if;
    select * into v_baris from toko.penjualan_item where id = (v_item->>'penjualan_item_id')::uuid;
    if not found or v_baris.penjualan_id <> v_jual.id then
      raise exception 'Baris nota tidak ditemukan';
    end if;
    select coalesce(sum(qty), 0) into v_sudah
    from toko.retur_penjualan_item
    where penjualan_item_id = v_baris.id;
    if v_qty > v_baris.qty - v_sudah then
      raise exception 'Retur melebihi barang yang masih bisa dikembalikan';
    end if;
    insert into toko.retur_penjualan_item (retur_id, penjualan_item_id, produk_id, qty, harga_satuan, harga_beli, subtotal)
    values (v_id, v_baris.id, v_baris.produk_id, v_qty, v_baris.harga_satuan, v_baris.harga_beli, v_qty * v_baris.harga_satuan);
    v_baru := jsonb_set(
      v_baru,
      array[v_baris.id::text],
      to_jsonb(coalesce((v_baru->>v_baris.id::text)::numeric, 0) + v_qty)
    );
    v_total := v_total + (v_qty * v_baris.harga_satuan);
  end loop;

  if v_total <= 0 then
    raise exception 'Isi jumlah barang yang diretur';
  end if;

  for v_kunci in
    select kunci from (
      select jsonb_object_keys(v_lama) as kunci
      union
      select jsonb_object_keys(v_baru)
    ) k
  loop
    v_delta := coalesce((v_baru->>v_kunci)::numeric, 0) - coalesce((v_lama->>v_kunci)::numeric, 0);
    if v_delta = 0 then
      continue;
    end if;
    select * into v_baris from toko.penjualan_item where id = v_kunci::uuid;
    if not found then
      raise exception 'Baris nota tidak ditemukan';
    end if;
    select * into v_produk from toko.produk where id = v_baris.produk_id for update;
    v_qty := v_delta * coalesce(v_baris.konversi, 1);
    if v_qty < 0 and v_produk.stok + 0.0000001 < -v_qty then
      raise exception 'Stok % tidak cukup untuk mengubah retur. Sisa %', v_produk.nama, v_produk.stok;
    end if;
    update toko.produk
    set stok = stok + v_qty,
        updated_at = now()
    where id = v_produk.id;
  end loop;

  update toko.retur_penjualan
  set tanggal = coalesce((payload->>'tanggal')::date, tanggal),
      catatan = nullif(payload->>'catatan', ''),
      total = v_total,
      dicatat_oleh = coalesce(nullif(payload->>'dicatat_oleh', ''), dicatat_oleh)
  where id = v_id;

  select coalesce(sum(total), 0) into v_jumlah_retur from toko.retur_penjualan where penjualan_id = v_jual.id;
  update toko.penjualan
  set status_bayar = toko.status_bayar(grand_total, dibayar, v_jumlah_retur)
  where id = v_jual.id;

  return v_id;
end;
$$;

create or replace function toko.ubah_retur_pembelian(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = toko, public
as $$
declare
  v_id uuid := nullif(payload->>'id', '')::uuid;
  v_retur toko.retur_pembelian%rowtype;
  v_beli toko.pembelian%rowtype;
  v_item jsonb;
  v_baris toko.pembelian_item%rowtype;
  v_produk toko.produk%rowtype;
  v_lama jsonb := '{}'::jsonb;
  v_baru jsonb := '{}'::jsonb;
  v_kunci text;
  v_qty numeric;
  v_sudah numeric;
  v_delta numeric;
  v_total numeric := 0;
  v_jumlah_retur numeric;
begin
  if v_id is null then
    raise exception 'Retur tidak ditemukan';
  end if;
  select * into v_retur from toko.retur_pembelian where id = v_id for update;
  if not found then
    raise exception 'Retur tidak ditemukan';
  end if;
  select * into v_beli from toko.pembelian where id = v_retur.pembelian_id for update;
  if not found then
    raise exception 'Nota pembelian tidak ditemukan';
  end if;
  if payload->'items' is null or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Retur belum punya barang';
  end if;

  select coalesce(jsonb_object_agg(item_id::text, qty), '{}'::jsonb) into v_lama
  from (
    select pembelian_item_id as item_id, sum(qty) as qty
    from toko.retur_pembelian_item
    where retur_id = v_id
    group by pembelian_item_id
  ) s;

  delete from toko.retur_pembelian_item where retur_id = v_id;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_qty := coalesce((v_item->>'qty')::numeric, 0);
    if v_qty <= 0 then
      continue;
    end if;
    select * into v_baris from toko.pembelian_item where id = (v_item->>'pembelian_item_id')::uuid;
    if not found or v_baris.pembelian_id <> v_beli.id then
      raise exception 'Baris pembelian tidak ditemukan';
    end if;
    select coalesce(sum(qty), 0) into v_sudah
    from toko.retur_pembelian_item
    where pembelian_item_id = v_baris.id;
    if v_qty > v_baris.qty - v_sudah then
      raise exception 'Retur melebihi barang yang masih bisa dikembalikan';
    end if;
    insert into toko.retur_pembelian_item (retur_id, pembelian_item_id, produk_id, qty, harga_satuan, subtotal)
    values (v_id, v_baris.id, v_baris.produk_id, v_qty, v_baris.harga_satuan, v_qty * v_baris.harga_satuan);
    v_baru := jsonb_set(
      v_baru,
      array[v_baris.id::text],
      to_jsonb(coalesce((v_baru->>v_baris.id::text)::numeric, 0) + v_qty)
    );
    v_total := v_total + (v_qty * v_baris.harga_satuan);
  end loop;

  if v_total <= 0 then
    raise exception 'Isi jumlah barang yang diretur';
  end if;

  for v_kunci in
    select kunci from (
      select jsonb_object_keys(v_lama) as kunci
      union
      select jsonb_object_keys(v_baru)
    ) k
  loop
    v_delta := coalesce((v_baru->>v_kunci)::numeric, 0) - coalesce((v_lama->>v_kunci)::numeric, 0);
    if v_delta = 0 then
      continue;
    end if;
    select * into v_baris from toko.pembelian_item where id = v_kunci::uuid;
    if not found then
      raise exception 'Baris pembelian tidak ditemukan';
    end if;
    select * into v_produk from toko.produk where id = v_baris.produk_id for update;
    v_qty := v_delta * coalesce(v_baris.konversi, 1);
    if v_qty > 0 and v_produk.stok + 0.0000001 < v_qty then
      raise exception 'Stok % tidak cukup untuk mengubah retur. Sisa %', v_produk.nama, v_produk.stok;
    end if;
    update toko.produk
    set stok = stok - v_qty,
        updated_at = now()
    where id = v_produk.id;
  end loop;

  update toko.retur_pembelian
  set tanggal = coalesce((payload->>'tanggal')::date, tanggal),
      catatan = nullif(payload->>'catatan', ''),
      total = v_total,
      dicatat_oleh = coalesce(nullif(payload->>'dicatat_oleh', ''), dicatat_oleh)
  where id = v_id;

  select coalesce(sum(total), 0) into v_jumlah_retur from toko.retur_pembelian where pembelian_id = v_beli.id;
  update toko.pembelian
  set status_bayar = toko.status_bayar(total, dibayar, v_jumlah_retur)
  where id = v_beli.id;

  return v_id;
end;
$$;

grant execute on function toko.ubah_pembelian(jsonb) to anon, authenticated, service_role;
grant execute on function toko.ubah_retur_penjualan(jsonb) to anon, authenticated, service_role;
grant execute on function toko.ubah_retur_pembelian(jsonb) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
