-- Jatuh tempo nota, pelunasan beberapa nota sekaligus, dan jurnal kas.
-- Aman dijalankan ulang.

alter table toko.pembelian add column if not exists jatuh_tempo date;
alter table toko.penjualan add column if not exists jatuh_tempo date;

create table if not exists toko.jurnal (
  id uuid primary key default gen_random_uuid(),
  nomor text not null unique,
  tanggal date not null default current_date,
  jenis text not null check (jenis in ('pelunasan_hutang', 'pelunasan_piutang')),
  keterangan text,
  dicatat_oleh text,
  created_at timestamptz not null default now()
);

create table if not exists toko.jurnal_baris (
  id uuid primary key default gen_random_uuid(),
  jurnal_id uuid not null references toko.jurnal (id) on delete cascade,
  kode text not null,
  nama text not null,
  debit numeric not null default 0 check (debit >= 0),
  kredit numeric not null default 0 check (kredit >= 0),
  urutan int not null default 0
);

alter table toko.pelunasan_hutang add column if not exists jurnal_id uuid references toko.jurnal (id);
alter table toko.pelunasan_piutang add column if not exists jurnal_id uuid references toko.jurnal (id);

alter table toko.jurnal enable row level security;
alter table toko.jurnal_baris enable row level security;
drop policy if exists jurnal_all on toko.jurnal;
drop policy if exists jurnal_baris_all on toko.jurnal_baris;
create policy jurnal_all on toko.jurnal for all to anon, authenticated using (true) with check (true);
create policy jurnal_baris_all on toko.jurnal_baris for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on toko.jurnal, toko.jurnal_baris to anon, authenticated, service_role;

create or replace function toko.atur_jatuh_tempo(payload jsonb)
returns void
language plpgsql
security definer
set search_path = toko, public
as $$
declare
  v_id uuid := (payload->>'id')::uuid;
  v_tempo date := nullif(payload->>'jatuh_tempo', '')::date;
begin
  if payload->>'jenis' = 'hutang' then
    update toko.pembelian set jatuh_tempo = v_tempo where id = v_id;
    if not found then
      raise exception 'Nota pembelian tidak ditemukan';
    end if;
  elsif payload->>'jenis' = 'piutang' then
    update toko.penjualan set jatuh_tempo = v_tempo where id = v_id;
    if not found then
      raise exception 'Nota penjualan tidak ditemukan';
    end if;
  else
    raise exception 'Jenis tagihan tidak dikenal';
  end if;
end;
$$;

create or replace function toko.catat_pelunasan_banyak(payload jsonb)
returns text
language plpgsql
security definer
set search_path = toko, public
as $$
declare
  v_jenis text := payload->>'jenis';
  v_tanggal date := coalesce((payload->>'tanggal')::date, current_date);
  v_kas text := payload->>'akun_kas';
  v_kas_nama text;
  v_lawan_kode text;
  v_lawan_nama text;
  v_pihak uuid;
  v_bekon boolean;
  v_item jsonb;
  v_id uuid;
  v_jumlah numeric;
  v_sisa numeric;
  v_retur numeric;
  v_beli toko.pembelian%rowtype;
  v_jual toko.penjualan%rowtype;
  v_total numeric := 0;
  v_jurnal uuid := gen_random_uuid();
  v_nomor text;
  v_n int;
  v_ket text := '';
  v_nama_pihak text;
  v_mulai boolean := true;
begin
  v_kas_nama := case v_kas
    when '1-1110' then 'Kas kasir'
    when '1-1120' then 'Bank BCA'
    when '1-1130' then 'Bank BSI'
    when '1-1163' then 'Kasbon Hilman'
    when '1-1171' then 'Shopee beli'
    when '1-1172' then 'Shopee jual'
    else null
  end;
  if v_kas_nama is null then
    raise exception 'Pilih kas atau bank untuk pembayaran';
  end if;
  if v_jenis not in ('hutang', 'piutang') then
    raise exception 'Jenis tagihan tidak dikenal';
  end if;
  if payload->'baris' is null or jsonb_array_length(payload->'baris') = 0 then
    raise exception 'Pilih minimal satu nota';
  end if;

  for v_item in
    select value from jsonb_array_elements(payload->'baris') order by (value->>'id')
  loop
    v_id := (v_item->>'id')::uuid;
    v_jumlah := round((v_item->>'jumlah')::numeric, 2);
    if v_jumlah is null or v_jumlah <= 0 then
      raise exception 'Jumlah pelunasan harus lebih dari nol';
    end if;

    if v_jenis = 'hutang' then
      select * into v_beli from toko.pembelian where id = v_id for update;
      if not found then
        raise exception 'Nota pembelian tidak ditemukan';
      end if;
      if v_mulai then
        v_pihak := v_beli.supplier_id;
        v_mulai := false;
      elsif v_pihak is distinct from v_beli.supplier_id then
        raise exception 'Bayar sekaligus hanya untuk nota supplier yang sama';
      end if;
      select coalesce(sum(total), 0) into v_retur from toko.retur_pembelian where pembelian_id = v_beli.id;
      v_sisa := round(v_beli.total - v_retur - v_beli.dibayar, 2);
      if v_jumlah > v_sisa then
        raise exception 'Pelunasan % melebihi sisa hutang', v_beli.nomor_po;
      end if;
      v_ket := concat_ws(', ', v_ket, v_beli.nomor_po);
    else
      select * into v_jual from toko.penjualan where id = v_id for update;
      if not found then
        raise exception 'Nota penjualan tidak ditemukan';
      end if;
      if v_mulai then
        v_pihak := v_jual.pelanggan_id;
        v_bekon := v_jual.bekon_po_id is not null;
        v_mulai := false;
      else
        if v_pihak is distinct from v_jual.pelanggan_id then
          raise exception 'Bayar sekaligus hanya untuk nota pelanggan yang sama';
        end if;
        if v_bekon is distinct from (v_jual.bekon_po_id is not null) then
          raise exception 'Nota umum dan nota Bekon dibayar terpisah';
        end if;
      end if;
      select coalesce(sum(total), 0) into v_retur from toko.retur_penjualan where penjualan_id = v_jual.id;
      v_sisa := round(v_jual.grand_total - v_retur - v_jual.dibayar, 2);
      if v_jumlah > v_sisa then
        raise exception 'Pelunasan % melebihi sisa piutang', v_jual.nomor_nota;
      end if;
      v_ket := concat_ws(', ', v_ket, v_jual.nomor_nota);
    end if;
    v_total := v_total + v_jumlah;
  end loop;

  if v_jenis = 'hutang' then
    select nama into v_nama_pihak from toko.supplier where id = v_pihak;
    v_lawan_kode := '2-2100';
    v_lawan_nama := 'Hutang usaha';
    v_ket := 'Pelunasan hutang ' || coalesce(v_nama_pihak, '') || ': ' || v_ket;
  else
    select nama into v_nama_pihak from toko.pelanggan where id = v_pihak;
    if v_bekon then
      v_lawan_kode := '1-1310';
      v_lawan_nama := 'Piutang Bekon';
    else
      v_lawan_kode := '1-1300';
      v_lawan_nama := 'Piutang umum';
    end if;
    v_ket := 'Pelunasan piutang ' || coalesce(v_nama_pihak, 'umum') || ': ' || v_ket;
  end if;

  select count(*) + 1 into v_n from toko.jurnal
  where nomor like 'JU-' || to_char(v_tanggal, 'YYMMDD') || '-%';
  v_nomor := 'JU-' || to_char(v_tanggal, 'YYMMDD') || '-' || lpad(v_n::text, 3, '0');

  insert into toko.jurnal (id, nomor, tanggal, jenis, keterangan, dicatat_oleh)
  values (
    v_jurnal,
    v_nomor,
    v_tanggal,
    case when v_jenis = 'hutang' then 'pelunasan_hutang' else 'pelunasan_piutang' end,
    v_ket,
    nullif(payload->>'dicatat_oleh', '')
  );

  if v_jenis = 'hutang' then
    insert into toko.jurnal_baris (jurnal_id, kode, nama, debit, kredit, urutan)
    values
      (v_jurnal, v_lawan_kode, v_lawan_nama, v_total, 0, 1),
      (v_jurnal, v_kas, v_kas_nama, 0, v_total, 2);
  else
    insert into toko.jurnal_baris (jurnal_id, kode, nama, debit, kredit, urutan)
    values
      (v_jurnal, v_kas, v_kas_nama, v_total, 0, 1),
      (v_jurnal, v_lawan_kode, v_lawan_nama, 0, v_total, 2);
  end if;

  for v_item in
    select value from jsonb_array_elements(payload->'baris') order by (value->>'id')
  loop
    v_id := (v_item->>'id')::uuid;
    v_jumlah := round((v_item->>'jumlah')::numeric, 2);
    if v_jenis = 'hutang' then
      select * into v_beli from toko.pembelian where id = v_id for update;
      select coalesce(sum(total), 0) into v_retur from toko.retur_pembelian where pembelian_id = v_beli.id;
      insert into toko.pelunasan_hutang (pembelian_id, tanggal, jumlah, catatan, dicatat_oleh, jurnal_id)
      values (v_beli.id, v_tanggal, v_jumlah, nullif(payload->>'catatan', ''), nullif(payload->>'dicatat_oleh', ''), v_jurnal);
      update toko.pembelian
      set dibayar = dibayar + v_jumlah,
          status_bayar = toko.status_bayar(total, dibayar + v_jumlah, v_retur)
      where id = v_beli.id;
    else
      select * into v_jual from toko.penjualan where id = v_id for update;
      select coalesce(sum(total), 0) into v_retur from toko.retur_penjualan where penjualan_id = v_jual.id;
      insert into toko.pelunasan_piutang (penjualan_id, tanggal, jumlah, catatan, dicatat_oleh, jurnal_id)
      values (v_jual.id, v_tanggal, v_jumlah, nullif(payload->>'catatan', ''), nullif(payload->>'dicatat_oleh', ''), v_jurnal);
      update toko.penjualan
      set dibayar = dibayar + v_jumlah,
          status_bayar = toko.status_bayar(grand_total, dibayar + v_jumlah, v_retur)
      where id = v_jual.id;
    end if;
  end loop;

  return v_nomor;
end;
$$;

grant execute on function toko.atur_jatuh_tempo(jsonb) to anon, authenticated, service_role;
grant execute on function toko.catat_pelunasan_banyak(jsonb) to anon, authenticated, service_role;
