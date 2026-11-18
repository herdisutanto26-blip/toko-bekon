-- Merek, spek, dan supplier jadi kolom sendiri di katalog bahan.
-- Jalankan sekali di SQL Editor proyek Supabase bekon-pro.

alter table toko.produk add column if not exists merek text;
alter table toko.produk add column if not exists spek text;
alter table toko.produk add column if not exists nama_supplier text;

update toko.produk
set merek = nullif(btrim(substring(keterangan from '(?i)merek\s*:\s*([^.\n]+)')), '')
where merek is null
  and keterangan ~* 'merek\s*:';

update toko.produk
set nama_supplier = nullif(btrim(substring(keterangan from '(?i)supplier\s*:\s*([^.\n]+)')), '')
where nama_supplier is null
  and keterangan ~* 'supplier\s*:';

update toko.produk
set spek = nullif(
  btrim(regexp_replace(
    regexp_replace(coalesce(keterangan, ''), '(?i)\s*merek\s*:\s*[^.\n]+\.?', '', 'g'),
    '(?i)\s*supplier\s*:\s*[^.\n]+\.?', '', 'g'
  ), ' .'),
  ''
)
where spek is null
  and keterangan is not null
  and keterangan ~* '(merek|supplier)\s*:';

update toko.produk
set keterangan = null
where keterangan is not null
  and keterangan ~* '(merek|supplier)\s*:'
  and nullif(
    btrim(regexp_replace(
      regexp_replace(keterangan, '(?i)\s*merek\s*:\s*[^.\n]+\.?', '', 'g'),
      '(?i)\s*supplier\s*:\s*[^.\n]+\.?', '', 'g'
    ), ' .'),
    ''
  ) is null;
