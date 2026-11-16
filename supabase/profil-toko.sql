-- Identitas toko yang tercetak di kepala dan kaki nota POS.
-- Aman dijalankan ulang.

create table if not exists toko.profil (
  id int primary key default 1 check (id = 1),
  alamat text,
  telepon text,
  ucapan text,
  catatan text,
  instagram text
);

insert into toko.profil (id, ucapan)
values (1, 'Terima kasih telah berbelanja!')
on conflict (id) do nothing;

alter table toko.profil enable row level security;
drop policy if exists profil_all on toko.profil;
create policy profil_all on toko.profil
  for all to anon, authenticated
  using (true) with check (true);

grant select, insert, update, delete on toko.profil to anon, authenticated, service_role;

notify pgrst, 'reload schema';
