-- Daftar akun perkiraan: kelompok (header) dan detail.
-- Aman dijalankan ulang.

create table if not exists toko.akun_perkiraan (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  nama text not null,
  jenis text not null check (jenis in ('kelompok', 'akun')),
  induk_id uuid references toko.akun_perkiraan (id),
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

alter table toko.akun_perkiraan enable row level security;
drop policy if exists akun_perkiraan_all on toko.akun_perkiraan;
create policy akun_perkiraan_all on toko.akun_perkiraan
  for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on toko.akun_perkiraan to anon, authenticated, service_role;

insert into toko.akun_perkiraan (kode, nama, jenis)
values
  ('1', 'Aset', 'kelompok'),
  ('2', 'Kewajiban', 'kelompok'),
  ('3', 'Ekuitas', 'kelompok'),
  ('4', 'Pendapatan', 'kelompok'),
  ('5', 'Beban', 'kelompok')
on conflict (kode) do nothing;

insert into toko.akun_perkiraan (kode, nama, jenis, induk_id)
select v.kode, v.nama, 'kelompok', p.id
from (values
  ('1-1', 'Aset lancar', '1'),
  ('1-2', 'Aset tetap', '1')
) as v(kode, nama, induk)
join toko.akun_perkiraan p on p.kode = v.induk
on conflict (kode) do nothing;

insert into toko.akun_perkiraan (kode, nama, jenis, induk_id)
select v.kode, v.nama, 'akun', p.id
from (values
  ('1-1110', 'Kas kasir', '1-1'),
  ('1-1120', 'Bank BCA', '1-1'),
  ('1-1130', 'Bank BSI', '1-1'),
  ('1-1163', 'Kasbon Hilman', '1-1'),
  ('1-1171', 'Shopee beli', '1-1'),
  ('1-1172', 'Shopee jual', '1-1'),
  ('1-1300', 'Piutang umum', '1-1'),
  ('1-1310', 'Piutang Bekon', '1-1'),
  ('1-2310', 'Mobil pick up 2009', '1-2'),
  ('1-2400', 'Perlengkapan', '1-2'),
  ('2-2100', 'Hutang usaha', '2'),
  ('2-3200', 'Setoran dimuka belum dijurnal', '2')
) as v(kode, nama, induk)
join toko.akun_perkiraan p on p.kode = v.induk
on conflict (kode) do nothing;
