-- Cara bayar nota penjualan: kasir, transfer, atau tempo.
-- Kasir dan transfer mencatat pelunasan plus jurnal kas. Tempo menyimpan jatuh tempo.
-- Aman dijalankan ulang.

create or replace function toko.simpan_penjualan(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = toko, public
as $$
declare
  v_id uuid := gen_random_uuid();
  v_item jsonb;
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
  v_nomor_nota text;
  v_nama_pihak text;
  v_jurnal uuid;
  v_nomor_jurnal text;
  v_n int;
begin
  if payload->'items' is null or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Nota belum punya barang';
  end if;

  v_nomor_nota := toko.nomor_baru('JL');
  insert into toko.penjualan (id, nomor_nota, tanggal, pelanggan_id, catatan, dicatat_oleh)
  values (
    v_id,
    v_nomor_nota,
    coalesce((payload->>'tanggal')::date, current_date),
    nullif(payload->>'pelanggan_id', '')::uuid,
    nullif(payload->>'catatan', ''),
    nullif(payload->>'dicatat_oleh', '')
  );

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
  elsif v_cara = '' then
    if v_dibayar < 0 then
      raise exception 'Pembayaran tidak valid';
    end if;
    if v_dibayar > v_grand then
      v_dibayar := v_grand;
    end if;
    v_kas := null;
    v_tempo := null;
  else
    raise exception 'Cara bayar tidak dikenal';
  end if;

  update toko.penjualan
  set total = v_total,
      diskon = v_diskon,
      grand_total = v_grand,
      dibayar = v_dibayar,
      jatuh_tempo = v_tempo,
      status_bayar = toko.status_bayar(v_grand, v_dibayar, 0)
  where id = v_id;

  if v_kas is not null and v_dibayar > 0 then
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
    select count(*) + 1 into v_n from toko.jurnal
    where nomor like 'JU-' || to_char(coalesce((payload->>'tanggal')::date, current_date), 'YYMMDD') || '-%';
    v_nomor_jurnal := 'JU-' || to_char(coalesce((payload->>'tanggal')::date, current_date), 'YYMMDD') || '-' || lpad(v_n::text, 3, '0');

    insert into toko.jurnal (id, nomor, tanggal, jenis, keterangan, dicatat_oleh)
    values (
      v_jurnal,
      v_nomor_jurnal,
      coalesce((payload->>'tanggal')::date, current_date),
      'pelunasan_piutang',
      'Penjualan ' || coalesce(v_nama_pihak, 'umum') || ': ' || v_nomor_nota,
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
