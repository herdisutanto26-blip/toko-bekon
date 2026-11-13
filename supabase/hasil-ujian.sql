create table if not exists toko.hasil_ujian (
  id uuid primary key default gen_random_uuid(),
  pengguna_id uuid references toko.pengguna (id),
  nama text not null,
  peran text not null,
  paket text not null,
  skor integer not null check (skor >= 0),
  total integer not null check (total > 0),
  jawaban jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on toko.hasil_ujian to anon, authenticated, service_role;

alter table toko.hasil_ujian enable row level security;

drop policy if exists hasil_ujian_all on toko.hasil_ujian;
create policy hasil_ujian_all on toko.hasil_ujian
  for all to anon, authenticated
  using (true)
  with check (true);
