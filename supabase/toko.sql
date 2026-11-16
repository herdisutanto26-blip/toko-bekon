-- Skema toko di database bekon-pro.
-- Setelah dijalankan: Project Settings → Data API → Exposed schemas, tambahkan "toko".

create schema if not exists toko;
create extension if not exists pgcrypto;

create table if not exists toko.kategori_produk (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  keterangan text,
  created_at timestamptz not null default now()
);

create table if not exists toko.satuan (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique
);

create table if not exists toko.produk (
  id uuid primary key default gen_random_uuid(),
  kode_sku text,
  nama text not null,
  kategori_id uuid references toko.kategori_produk (id),
  satuan_id uuid references toko.satuan (id),
  harga_beli numeric not null default 0,
  harga_jual numeric not null default 0,
  stok numeric not null default 0,
  stok_minimum numeric not null default 0,
  punya_varian boolean not null default false,
  aktif boolean not null default true,
  keterangan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists toko.supplier (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  telepon text,
  alamat text,
  email text,
  keterangan text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists toko.pelanggan (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  telepon text,
  alamat text,
  email text,
  tipe text not null default 'umum' check (tipe in ('umum', 'kontraktor')),
  limit_kredit numeric not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists toko.pengguna (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  username text unique,
  peran text not null check (peran in ('admin', 'kasir', 'pembelian', 'akunting', 'uji_karyawan', 'uji_kepala')),
  pin_hash text not null,
  menu_izin text[],
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists toko.penjualan (
  id uuid primary key default gen_random_uuid(),
  nomor_nota text not null unique,
  tanggal date not null default current_date,
  pelanggan_id uuid references toko.pelanggan (id),
  catatan text,
  total numeric not null default 0,
  diskon numeric not null default 0,
  grand_total numeric not null default 0,
  dibayar numeric not null default 0,
  status_bayar text not null default 'belum_lunas' check (status_bayar in ('belum_lunas', 'sebagian', 'lunas')),
  dicatat_oleh text,
  created_at timestamptz not null default now()
);

create table if not exists toko.penjualan_item (
  id uuid primary key default gen_random_uuid(),
  penjualan_id uuid not null references toko.penjualan (id) on delete cascade,
  produk_id uuid not null references toko.produk (id),
  qty numeric not null check (qty > 0),
  satuan text,
  konversi numeric not null default 1,
  harga_satuan numeric not null,
  harga_beli numeric not null default 0,
  subtotal numeric not null
);

create table if not exists toko.pembelian (
  id uuid primary key default gen_random_uuid(),
  nomor_po text not null unique,
  tanggal date not null default current_date,
  supplier_id uuid not null references toko.supplier (id),
  catatan text,
  total numeric not null default 0,
  dibayar numeric not null default 0,
  status_bayar text not null default 'belum_lunas' check (status_bayar in ('belum_lunas', 'sebagian', 'lunas')),
  dicatat_oleh text,
  created_at timestamptz not null default now()
);

create table if not exists toko.pembelian_item (
  id uuid primary key default gen_random_uuid(),
  pembelian_id uuid not null references toko.pembelian (id) on delete cascade,
  produk_id uuid not null references toko.produk (id),
  qty numeric not null check (qty > 0),
  satuan text,
  konversi numeric not null default 1,
  harga_satuan numeric not null,
  subtotal numeric not null
);

create table if not exists toko.retur_penjualan (
  id uuid primary key default gen_random_uuid(),
  nomor_retur text not null unique,
  penjualan_id uuid not null references toko.penjualan (id),
  tanggal date not null default current_date,
  total numeric not null default 0,
  catatan text,
  dicatat_oleh text,
  created_at timestamptz not null default now()
);

create table if not exists toko.retur_penjualan_item (
  id uuid primary key default gen_random_uuid(),
  retur_id uuid not null references toko.retur_penjualan (id) on delete cascade,
  penjualan_item_id uuid not null references toko.penjualan_item (id),
  produk_id uuid not null references toko.produk (id),
  qty numeric not null check (qty > 0),
  harga_satuan numeric not null,
  harga_beli numeric not null default 0,
  subtotal numeric not null
);

create table if not exists toko.retur_pembelian (
  id uuid primary key default gen_random_uuid(),
  nomor_retur text not null unique,
  pembelian_id uuid not null references toko.pembelian (id),
  tanggal date not null default current_date,
  total numeric not null default 0,
  catatan text,
  dicatat_oleh text,
  created_at timestamptz not null default now()
);

create table if not exists toko.retur_pembelian_item (
  id uuid primary key default gen_random_uuid(),
  retur_id uuid not null references toko.retur_pembelian (id) on delete cascade,
  pembelian_item_id uuid not null references toko.pembelian_item (id),
  produk_id uuid not null references toko.produk (id),
  qty numeric not null check (qty > 0),
  harga_satuan numeric not null,
  subtotal numeric not null
);

create table if not exists toko.pelunasan_piutang (
  id uuid primary key default gen_random_uuid(),
  penjualan_id uuid not null references toko.penjualan (id),
  tanggal date not null default current_date,
  jumlah numeric not null check (jumlah > 0),
  catatan text,
  dicatat_oleh text,
  created_at timestamptz not null default now()
);

create table if not exists toko.pelunasan_hutang (
  id uuid primary key default gen_random_uuid(),
  pembelian_id uuid not null references toko.pembelian (id),
  tanggal date not null default current_date,
  jumlah numeric not null check (jumlah > 0),
  catatan text,
  dicatat_oleh text,
  created_at timestamptz not null default now()
);

insert into toko.pengguna (nama, peran, pin_hash)
values
  ('Admin', 'admin', encode(digest('1234', 'sha256'), 'hex')),
  ('Kasir', 'kasir', encode(digest('1234', 'sha256'), 'hex')),
  ('Pembelian', 'pembelian', encode(digest('1234', 'sha256'), 'hex')),
  ('Akunting', 'akunting', encode(digest('1234', 'sha256'), 'hex')),
  ('Karyawan Test', 'uji_karyawan', encode(digest('1234', 'sha256'), 'hex')),
  ('Kepala Toko Test', 'uji_kepala', encode(digest('1234', 'sha256'), 'hex'))
on conflict (nama) do nothing;

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
  else
    select count(*) + 1 into n from toko.retur_pembelian
      where nomor_retur like prefix || '-' || to_char(current_date, 'YYMMDD') || '-%';
  end if;
  return prefix || '-' || to_char(current_date, 'YYMMDD') || '-' || lpad(n::text, 3, '0');
end;
$$;

create or replace function toko.status_bayar(grand numeric, dibayar numeric, retur numeric)
returns text
language sql
immutable
as $$
  select case
    when grand - retur - dibayar <= 0 then 'lunas'
    when dibayar > 0 or retur > 0 then 'sebagian'
    else 'belum_lunas'
  end;
$$;

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

create or replace function toko.simpan_pembelian(payload jsonb)
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
  v_dibayar numeric := coalesce((payload->>'dibayar')::numeric, 0);
begin
  if nullif(payload->>'supplier_id', '') is null then
    raise exception 'Supplier wajib diisi';
  end if;
  if payload->'items' is null or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Pembelian belum punya barang';
  end if;

  insert into toko.pembelian (id, nomor_po, tanggal, supplier_id, catatan, dicatat_oleh)
  values (
    v_id,
    toko.nomor_baru('BL'),
    coalesce((payload->>'tanggal')::date, current_date),
    (payload->>'supplier_id')::uuid,
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
    v_harga := coalesce(nullif(v_item->>'harga_satuan', '')::numeric, v_produk.harga_beli);
    insert into toko.pembelian_item (pembelian_id, produk_id, qty, satuan, konversi, harga_satuan, subtotal)
    values (v_id, v_produk.id, v_qty, nullif(v_item->>'satuan', ''), v_konv, v_harga, v_qty * v_harga);
    update toko.produk
    set stok = stok + v_butuh,
        harga_beli = round(v_harga / v_konv, 2),
        updated_at = now()
    where id = v_produk.id;
    v_total := v_total + (v_qty * v_harga);
  end loop;

  if v_dibayar < 0 then
    raise exception 'Pembayaran tidak valid';
  end if;
  if v_dibayar > v_total then
    v_dibayar := v_total;
  end if;

  update toko.pembelian
  set total = v_total,
      dibayar = v_dibayar,
      status_bayar = toko.status_bayar(v_total, v_dibayar, 0)
  where id = v_id;

  return v_id;
end;
$$;

create or replace function toko.simpan_retur_penjualan(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = toko, public
as $$
declare
  v_id uuid := gen_random_uuid();
  v_jual toko.penjualan%rowtype;
  v_item jsonb;
  v_baris toko.penjualan_item%rowtype;
  v_qty numeric;
  v_sudah numeric;
  v_total numeric := 0;
  v_retur numeric;
begin
  select * into v_jual from toko.penjualan where id = (payload->>'penjualan_id')::uuid for update;
  if not found then
    raise exception 'Nota penjualan tidak ditemukan';
  end if;
  if payload->'items' is null or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Retur belum punya barang';
  end if;

  insert into toko.retur_penjualan (id, nomor_retur, penjualan_id, tanggal, catatan, dicatat_oleh)
  values (
    v_id,
    toko.nomor_baru('RJ'),
    v_jual.id,
    coalesce((payload->>'tanggal')::date, current_date),
    nullif(payload->>'catatan', ''),
    nullif(payload->>'dicatat_oleh', '')
  );

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
    update toko.produk set stok = stok + (v_qty * coalesce(v_baris.konversi, 1)), updated_at = now() where id = v_baris.produk_id;
    v_total := v_total + (v_qty * v_baris.harga_satuan);
  end loop;

  if v_total <= 0 then
    raise exception 'Isi jumlah barang yang diretur';
  end if;
  update toko.retur_penjualan set total = v_total where id = v_id;

  select coalesce(sum(total), 0) into v_retur from toko.retur_penjualan where penjualan_id = v_jual.id;
  update toko.penjualan
  set status_bayar = toko.status_bayar(grand_total, dibayar, v_retur)
  where id = v_jual.id;

  return v_id;
end;
$$;

create or replace function toko.simpan_retur_pembelian(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = toko, public
as $$
declare
  v_id uuid := gen_random_uuid();
  v_beli toko.pembelian%rowtype;
  v_item jsonb;
  v_baris toko.pembelian_item%rowtype;
  v_produk toko.produk%rowtype;
  v_qty numeric;
  v_sudah numeric;
  v_total numeric := 0;
  v_retur numeric;
begin
  select * into v_beli from toko.pembelian where id = (payload->>'pembelian_id')::uuid for update;
  if not found then
    raise exception 'Nota pembelian tidak ditemukan';
  end if;
  if payload->'items' is null or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Retur belum punya barang';
  end if;

  insert into toko.retur_pembelian (id, nomor_retur, pembelian_id, tanggal, catatan, dicatat_oleh)
  values (
    v_id,
    toko.nomor_baru('RB'),
    v_beli.id,
    coalesce((payload->>'tanggal')::date, current_date),
    nullif(payload->>'catatan', ''),
    nullif(payload->>'dicatat_oleh', '')
  );

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
    select * into v_produk from toko.produk where id = v_baris.produk_id for update;
    select coalesce(sum(qty), 0) into v_sudah
    from toko.retur_pembelian_item
    where pembelian_item_id = v_baris.id;
    if v_qty > v_baris.qty - v_sudah then
      raise exception 'Retur melebihi barang yang masih bisa dikembalikan';
    end if;
    if v_produk.stok + 0.0000001 < v_qty * coalesce(v_baris.konversi, 1) then
      raise exception 'Stok % tidak cukup untuk diretur. Sisa %', v_produk.nama, v_produk.stok;
    end if;
    insert into toko.retur_pembelian_item (retur_id, pembelian_item_id, produk_id, qty, harga_satuan, subtotal)
    values (v_id, v_baris.id, v_baris.produk_id, v_qty, v_baris.harga_satuan, v_qty * v_baris.harga_satuan);
    update toko.produk set stok = stok - (v_qty * coalesce(v_baris.konversi, 1)), updated_at = now() where id = v_baris.produk_id;
    v_total := v_total + (v_qty * v_baris.harga_satuan);
  end loop;

  if v_total <= 0 then
    raise exception 'Isi jumlah barang yang diretur';
  end if;
  update toko.retur_pembelian set total = v_total where id = v_id;

  select coalesce(sum(total), 0) into v_retur from toko.retur_pembelian where pembelian_id = v_beli.id;
  update toko.pembelian
  set status_bayar = toko.status_bayar(total, dibayar, v_retur)
  where id = v_beli.id;

  return v_id;
end;
$$;

create or replace function toko.catat_pelunasan_piutang(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = toko, public
as $$
declare
  v_jual toko.penjualan%rowtype;
  v_retur numeric;
  v_sisa numeric;
  v_jumlah numeric := (payload->>'jumlah')::numeric;
  v_id uuid := gen_random_uuid();
begin
  select * into v_jual from toko.penjualan where id = (payload->>'penjualan_id')::uuid for update;
  if not found then
    raise exception 'Nota tidak ditemukan';
  end if;
  select coalesce(sum(total), 0) into v_retur from toko.retur_penjualan where penjualan_id = v_jual.id;
  v_sisa := v_jual.grand_total - v_retur - v_jual.dibayar;
  if v_jumlah is null or v_jumlah <= 0 then
    raise exception 'Jumlah pelunasan harus lebih dari nol';
  end if;
  if v_jumlah > v_sisa then
    raise exception 'Pelunasan melebihi sisa piutang';
  end if;
  insert into toko.pelunasan_piutang (id, penjualan_id, tanggal, jumlah, catatan, dicatat_oleh)
  values (
    v_id, v_jual.id, coalesce((payload->>'tanggal')::date, current_date), v_jumlah,
    nullif(payload->>'catatan', ''), nullif(payload->>'dicatat_oleh', '')
  );
  update toko.penjualan
  set dibayar = dibayar + v_jumlah,
      status_bayar = toko.status_bayar(grand_total, dibayar + v_jumlah, v_retur)
  where id = v_jual.id;
  return v_id;
end;
$$;

create or replace function toko.catat_pelunasan_hutang(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = toko, public
as $$
declare
  v_beli toko.pembelian%rowtype;
  v_retur numeric;
  v_sisa numeric;
  v_jumlah numeric := (payload->>'jumlah')::numeric;
  v_id uuid := gen_random_uuid();
begin
  select * into v_beli from toko.pembelian where id = (payload->>'pembelian_id')::uuid for update;
  if not found then
    raise exception 'Nota tidak ditemukan';
  end if;
  select coalesce(sum(total), 0) into v_retur from toko.retur_pembelian where pembelian_id = v_beli.id;
  v_sisa := v_beli.total - v_retur - v_beli.dibayar;
  if v_jumlah is null or v_jumlah <= 0 then
    raise exception 'Jumlah pelunasan harus lebih dari nol';
  end if;
  if v_jumlah > v_sisa then
    raise exception 'Pelunasan melebihi sisa hutang';
  end if;
  insert into toko.pelunasan_hutang (id, pembelian_id, tanggal, jumlah, catatan, dicatat_oleh)
  values (
    v_id, v_beli.id, coalesce((payload->>'tanggal')::date, current_date), v_jumlah,
    nullif(payload->>'catatan', ''), nullif(payload->>'dicatat_oleh', '')
  );
  update toko.pembelian
  set dibayar = dibayar + v_jumlah,
      status_bayar = toko.status_bayar(total, dibayar + v_jumlah, v_retur)
  where id = v_beli.id;
  return v_id;
end;
$$;

grant usage on schema toko to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema toko to anon, authenticated, service_role;
grant execute on all functions in schema toko to anon, authenticated, service_role;

alter table toko.kategori_produk enable row level security;
alter table toko.satuan enable row level security;
alter table toko.produk enable row level security;
alter table toko.supplier enable row level security;
alter table toko.pelanggan enable row level security;
alter table toko.pengguna enable row level security;
alter table toko.penjualan enable row level security;
alter table toko.penjualan_item enable row level security;
alter table toko.pembelian enable row level security;
alter table toko.pembelian_item enable row level security;
alter table toko.retur_penjualan enable row level security;
alter table toko.retur_penjualan_item enable row level security;
alter table toko.retur_pembelian enable row level security;
alter table toko.retur_pembelian_item enable row level security;
alter table toko.pelunasan_piutang enable row level security;
alter table toko.pelunasan_hutang enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'kategori_produk','satuan','produk','supplier','pelanggan','pengguna',
    'penjualan','penjualan_item','pembelian','pembelian_item',
    'retur_penjualan','retur_penjualan_item','retur_pembelian','retur_pembelian_item',
    'pelunasan_piutang','pelunasan_hutang'
  ]
  loop
    execute format('drop policy if exists %I_all on toko.%I', t, t);
    execute format(
      'create policy %I_all on toko.%I for all to anon, authenticated using (true) with check (true)',
      t, t
    );
  end loop;
end $$;
