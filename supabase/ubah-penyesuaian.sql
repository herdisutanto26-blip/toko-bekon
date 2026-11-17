-- Ubah item masuk / item keluar yang sudah tersimpan.
-- Stok hanya bergeser sebesar selisihnya. Nomor nota tidak berubah.
-- Aman dijalankan ulang.

create or replace function toko.ubah_penyesuaian_stok(payload jsonb)
returns text
language plpgsql
security definer
set search_path = toko, public
as $$
declare
  v_id uuid := nullif(payload->>'id', '')::uuid;
  v_nota toko.penyesuaian_stok%rowtype;
  v_item jsonb;
  v_produk toko.produk%rowtype;
  v_lama jsonb := '{}'::jsonb;
  v_baru jsonb := '{}'::jsonb;
  v_kunci text;
  v_qty numeric;
  v_arah numeric;
  v_delta numeric;
begin
  if v_id is null then
    raise exception 'Penyesuaian tidak ditemukan';
  end if;
  select * into v_nota from toko.penyesuaian_stok where id = v_id for update;
  if not found then
    raise exception 'Penyesuaian tidak ditemukan';
  end if;
  if payload->'baris' is null or jsonb_array_length(payload->'baris') = 0 then
    raise exception 'Isi minimal satu barang';
  end if;

  v_arah := case when v_nota.jenis = 'masuk' then 1 else -1 end;

  select coalesce(jsonb_object_agg(produk_id::text, qty_signed), '{}'::jsonb) into v_lama
  from (
    select produk_id, sum(qty) * v_arah as qty_signed
    from toko.penyesuaian_stok_item
    where penyesuaian_id = v_id
    group by produk_id
  ) s;

  delete from toko.penyesuaian_stok_item where penyesuaian_id = v_id;

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
    insert into toko.penyesuaian_stok_item (penyesuaian_id, produk_id, qty, harga_beli, nilai)
    values (v_id, v_produk.id, v_qty, v_produk.harga_beli, round(v_qty * v_produk.harga_beli, 2));
    v_baru := jsonb_set(
      v_baru,
      array[v_produk.id::text],
      to_jsonb(coalesce((v_baru->>v_produk.id::text)::numeric, 0) + (v_qty * v_arah))
    );
  end loop;

  for v_kunci in
    select kunci from (
      select jsonb_object_keys(v_lama) as kunci
      union
      select jsonb_object_keys(v_baru)
    ) k
    order by 1
  loop
    v_delta := coalesce((v_baru->>v_kunci)::numeric, 0) - coalesce((v_lama->>v_kunci)::numeric, 0);
    if v_delta = 0 then
      continue;
    end if;
    select * into v_produk from toko.produk where id = v_kunci::uuid for update;
    if not found then
      raise exception 'Barang tidak ditemukan';
    end if;
    if v_delta < 0 and v_produk.stok + 0.0000001 < -v_delta then
      raise exception 'Stok % tidak cukup untuk mengubah penyesuaian. Sisa %', v_produk.nama, v_produk.stok;
    end if;
    update toko.produk
    set stok = stok + v_delta,
        updated_at = now()
    where id = v_produk.id;
  end loop;

  update toko.penyesuaian_stok
  set tanggal = coalesce((payload->>'tanggal')::date, tanggal),
      keterangan = nullif(payload->>'keterangan', ''),
      dicatat_oleh = coalesce(nullif(payload->>'dicatat_oleh', ''), dicatat_oleh)
  where id = v_id;

  return v_nota.nomor;
end;
$$;

grant execute on function toko.ubah_penyesuaian_stok(jsonb) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
