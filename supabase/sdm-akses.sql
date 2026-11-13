-- Akses akun (username + kata sandi) dan SDM rekrutmen toko.
-- Jalankan sekali di SQL Editor project bekon-pro, setelah supabase/toko.sql.

alter table toko.pengguna add column if not exists username text;
alter table toko.pengguna add column if not exists menu_izin text[];

update toko.pengguna
set username = trim(both '-' from lower(regexp_replace(trim(nama), '[^a-zA-Z0-9]+', '-', 'g')))
where username is null or btrim(username) = '';

create unique index if not exists pengguna_username_uidx on toko.pengguna (username);

alter table toko.pengguna alter column username set not null;

create table if not exists toko.karyawan (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  telepon text,
  jabatan text not null,
  tanggal_masuk date,
  status text not null default 'aktif' check (status in ('aktif', 'nonaktif')),
  pengguna_id uuid references toko.pengguna (id),
  keterangan text,
  created_at timestamptz not null default now()
);

create table if not exists toko.lowongan (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  paket_uji text not null check (paket_uji in ('uji_karyawan', 'uji_kepala')),
  status text not null default 'dibuka' check (status in ('dibuka', 'ditutup')),
  keterangan text,
  created_at timestamptz not null default now()
);

create table if not exists toko.pelamar (
  id uuid primary key default gen_random_uuid(),
  lowongan_id uuid not null references toko.lowongan (id),
  nama text not null,
  telepon text,
  sumber text,
  tahap text not null default 'baru' check (tahap in (
    'baru', 'screening', 'tes', 'wawancara', 'penawaran', 'diterima', 'ditolak'
  )),
  catatan text,
  catatan_wawancara text,
  hasil_tes text check (hasil_tes in ('lulus', 'tidak_lulus')),
  pengguna_uji_id uuid references toko.pengguna (id),
  token_tes text unique,
  karyawan_id uuid references toko.karyawan (id),
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'toko' and table_name = 'hasil_ujian'
  ) then
    alter table toko.hasil_ujian
      add column if not exists pelamar_id uuid references toko.pelamar (id);
  end if;
end $$;

insert into toko.lowongan (judul, paket_uji, status, keterangan)
select v.judul, v.paket_uji, v.status, v.keterangan
from (
  values
    ('Karyawan Toko', 'uji_karyawan', 'dibuka', 'Tes hitung kas, stok, dan sikap kerja di kasir.'),
    ('Kepala Toko', 'uji_kepala', 'dibuka', 'Tes margin, kas, stok, dan keputusan operasional toko.')
) as v(judul, paket_uji, status, keterangan)
where not exists (select 1 from toko.lowongan);

grant select, insert, update, delete on toko.karyawan to anon, authenticated, service_role;
grant select, insert, update, delete on toko.lowongan to anon, authenticated, service_role;
grant select, insert, update, delete on toko.pelamar to anon, authenticated, service_role;

alter table toko.karyawan enable row level security;
alter table toko.lowongan enable row level security;
alter table toko.pelamar enable row level security;

drop policy if exists karyawan_all on toko.karyawan;
create policy karyawan_all on toko.karyawan
  for all to anon, authenticated
  using (true) with check (true);

drop policy if exists lowongan_all on toko.lowongan;
create policy lowongan_all on toko.lowongan
  for all to anon, authenticated
  using (true) with check (true);

drop policy if exists pelamar_all on toko.pelamar;
create policy pelamar_all on toko.pelamar
  for all to anon, authenticated
  using (true) with check (true);
