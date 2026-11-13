-- Perluas peran pengguna untuk mode ujian (bukan akses operasional).
do $$
declare
  cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'toko'
    and rel.relname = 'pengguna'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%peran%';

  if cname is not null then
    execute format('alter table toko.pengguna drop constraint %I', cname);
  end if;
end $$;

alter table toko.pengguna
  add constraint pengguna_peran_check
  check (peran in (
    'admin',
    'kasir',
    'pembelian',
    'akunting',
    'uji_karyawan',
    'uji_kepala'
  ));

insert into toko.pengguna (nama, peran, pin_hash)
values
  ('Karyawan Test', 'uji_karyawan', encode(digest('1234', 'sha256'), 'hex')),
  ('Kepala Toko Test', 'uji_kepala', encode(digest('1234', 'sha256'), 'hex'))
on conflict (nama) do update
set
  peran = excluded.peran,
  pin_hash = excluded.pin_hash,
  aktif = true;
