-- Jatuh tempo nota Bekon selalu hari terakhir bulan tanggal nota.
-- Nota 1–30 November jatuh tempo 30 November. Bulan lain mengikuti hari terakhirnya.
-- Aman dijalankan ulang.

create or replace function toko.isi_tempo_bekon()
returns trigger
language plpgsql
as $$
begin
  if new.bekon_po_id is not null then
    new.jatuh_tempo := (date_trunc('month', coalesce(new.tanggal, current_date)) + interval '1 month' - interval '1 day')::date;
  end if;
  return new;
end;
$$;

drop trigger if exists penjualan_tempo_bekon on toko.penjualan;
create trigger penjualan_tempo_bekon
before insert or update of tanggal, bekon_po_id
on toko.penjualan
for each row
execute function toko.isi_tempo_bekon();

update toko.penjualan
set jatuh_tempo = (date_trunc('month', tanggal) + interval '1 month' - interval '1 day')::date
where bekon_po_id is not null;
