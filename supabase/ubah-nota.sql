-- Ubah nota penjualan yang sudah tersimpan: stok dikembalikan lalu dipotong ulang.
-- Jurnal kas hanya diganti bila nota ini memang sudah punya jurnal, atau nota masih belum dibayar.
-- Aman dijalankan ulang.

create or replace function toko.ubah_penjualan(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = toko, public
as $$
declare
  v_id uuid := nullif(payload->>'id', '')::uuid;
  v_nota toko.penjualan%rowtype;
  v_item jsonb;
  v_lama record;
  v_produk toko.produk%rowtype;
  v_qty numeric;
  v_konv numeric;
  v_butuh numeric;
  v_harga numeric;
  v_total numeric := 0;
  v_diskon numeric := coalesce((payload->>'diskon')::numeric, 0);
  v_dibayar numeric := coalesce((payload->>'dibayar')::numeric, 0);
  v_grand numeric;
  v_cara text := coalesce(payload->>'cara_bayar', '');
  v_kas text := nullif(payload->>'akun_kas', '');
  v_tempo date := nullif(payload->>'jatuh_tempo', '')::date;
  v_kas_nama text;
  v_nama_pihak text;
  v_jurnal uuid;
  v_jurnal_lama uuid;
  v_nomor_lama text;
  v_nomor_jurnal text;
  v_n int;
  v_dulu_dibayar numeric;
  v_sudah_jurnal boolean := false;
begin
  if v_id is null then
    raise exception 'Nota tidak ditemukan';
  end if;
  select * into v_nota from toko.penjualan where id = v_id for update;
  if not found then
    raise exception 'Nota tidak ditemukan';
  end if;
  if payload->'items' is null or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Nota belum punya barang';
  end if;
  if exists (select 1 from toko.retur_penjualan where penjualan_id = v_id) then
    raise exception 'Nota sudah ada retur, tidak bisa diubah';
  end if;

  select count(*) into v_n from toko.pelunasan_piutang where penjualan_id = v_id;
  if v_n > 1 then
    raise exception 'Nota sudah ada beberapa pembayaran, tidak bisa diubah dari sini';
  end if;
  select jurnal_id into v_jurnal_lama from toko.pelunasan_piutang where penjualan_id = v_id limit 1;
  if v_n = 1 and v_jurnal_lama is null then
    raise exception 'Pembayaran nota ini dicatat terpisah, tidak bisa diubah dari sini';
  end if;
  v_dulu_dibayar := v_nota.dibayar;
  v_sudah_jurnal := v_jurnal_lama is not null;

  for v_lama in
    select produk_id, qty, konversi from toko.penjualan_item where penjualan_id = v_id
  loop
    update toko.produk
    set stok = stok + round(v_lama.qty * coalesce(v_lama.konversi, 1), 6),
        updated_at = now()
    where id = v_lama.produk_id;
  end loop;
  delete from toko.penjualan_item where penjualan_id = v_id;

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
    if v_produk.stok + 0.0000001 < v_butuh then
      raise exception 'Stok % tidak cukup. Sisa %', v_produk.nama, v_produk.stok;
    end if;
    v_harga := coalesce(nullif(v_item->>'harga_satuan', '')::numeric, v_produk.harga_jual);
    insert into toko.penjualan_item (penjualan_id, produk_id, qty, satuan, konversi, harga_satuan, harga_beli, subtotal)
    values (
      v_id, v_produk.id, v_qty, nullif(v_item->>'satuan', ''), v_konv, v_harga,
      round(v_produk.harga_beli * v_konv, 2), v_qty * v_harga
    );
    update toko.produk set stok = stok - v_butuh, updated_at = now() where id = v_produk.id;
    v_total := v_total + (v_qty * v_harga);
  end loop;

  if v_diskon < 0 or v_diskon > v_total then
    raise exception 'Diskon tidak valid';
  end if;
  v_grand := v_total - v_diskon;

  if v_cara = 'tempo' then
    if v_tempo is null then
      raise exception 'Jatuh tempo wajib diisi';
    end if;
    v_dibayar := 0;
    v_kas := null;
  elsif v_cara = 'kasir' then
    if v_dibayar + 0.001 < v_grand then
      raise exception 'Uang bayar kurang dari total';
    end if;
    v_dibayar := v_grand;
    v_kas := '1-1110';
    v_tempo := null;
  elsif v_cara = 'transfer' then
    if v_kas is null or v_kas not in ('1-1120', '1-1130') then
      raise exception 'Pilih rekening tujuan transfer';
    end if;
    v_dibayar := v_grand;
    v_tempo := null;
  else
    raise exception 'Cara bayar tidak dikenal';
  end if;

  if v_jurnal_lama is not null then
    select nomor into v_nomor_lama from toko.jurnal where id = v_jurnal_lama;
    delete from toko.pelunasan_piutang where penjualan_id = v_id;
    delete from toko.jurnal where id = v_jurnal_lama;
  end if;

  update toko.penjualan
  set tanggal = coalesce((payload->>'tanggal')::date, tanggal),
      pelanggan_id = nullif(payload->>'pelanggan_id', '')::uuid,
      catatan = nullif(payload->>'catatan', ''),
      total = v_total,
      diskon = v_diskon,
      grand_total = v_grand,
      dibayar = v_dibayar,
      jatuh_tempo = v_tempo,
      status_bayar = toko.status_bayar(v_grand, v_dibayar, 0),
      dicatat_oleh = coalesce(nullif(payload->>'dicatat_oleh', ''), dicatat_oleh)
  where id = v_id;

  if v_kas is not null and v_dibayar > 0 and (v_sudah_jurnal or v_dulu_dibayar = 0) then
    v_kas_nama := case v_kas
      when '1-1110' then 'Kas kasir'
      when '1-1120' then 'Bank BCA'
      when '1-1130' then 'Bank BSI'
      else null
    end;
    if v_kas_nama is null then
      raise exception 'Rekening tujuan tidak dikenal';
    end if;

    select nama into v_nama_pihak
    from toko.pelanggan
    where id = nullif(payload->>'pelanggan_id', '')::uuid;

    v_jurnal := gen_random_uuid();
    if v_nomor_lama is not null then
      v_nomor_jurnal := v_nomor_lama;
    else
      select coalesce(max(substring(nomor from '([0-9]+)$')::int), 0) + 1 into v_n
      from toko.jurnal
      where nomor like 'JU-' || to_char(coalesce((payload->>'tanggal')::date, current_date), 'YYMMDD') || '-%';
      v_nomor_jurnal := 'JU-' || to_char(coalesce((payload->>'tanggal')::date, current_date), 'YYMMDD') || '-' || lpad(v_n::text, 3, '0');
    end if;

    insert into toko.jurnal (id, nomor, tanggal, jenis, keterangan, dicatat_oleh)
    values (
      v_jurnal,
      v_nomor_jurnal,
      coalesce((payload->>'tanggal')::date, current_date),
      'pelunasan_piutang',
      'Penjualan ' || coalesce(v_nama_pihak, 'umum') || ': ' || v_nota.nomor_nota,
      nullif(payload->>'dicatat_oleh', '')
    );
    insert into toko.jurnal_baris (jurnal_id, kode, nama, debit, kredit, urutan)
    values
      (v_jurnal, v_kas, v_kas_nama, v_dibayar, 0, 1),
      (v_jurnal, '1-1300', 'Piutang umum', 0, v_dibayar, 2);
    insert into toko.pelunasan_piutang (penjualan_id, tanggal, jumlah, catatan, dicatat_oleh, jurnal_id)
    values (
      v_id,
      coalesce((payload->>'tanggal')::date, current_date),
      v_dibayar,
      nullif(payload->>'catatan', ''),
      nullif(payload->>'dicatat_oleh', ''),
      v_jurnal
    );
  end if;

  return v_id;
end;
$$;

grant execute on function toko.ubah_penjualan(jsonb) to anon, authenticated, service_role;
