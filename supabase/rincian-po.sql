-- Isi barang satu PO Toko Bekon, untuk dibuka dari antrian Dari Bekon.
create or replace function public.rincian_po_toko_bekon(p_po_id uuid)
returns table (
  nama text,
  satuan text,
  qty numeric,
  harga numeric,
  subtotal numeric
)
language sql
stable
security definer
set search_path = toko, public
as $$
  select
    i.material_name,
    coalesce(i.unit, ''),
    i.qty_ordered,
    coalesce(i.unit_price, 0),
    round(i.qty_ordered * coalesce(i.unit_price, 0), 2)
  from public.material_purchase_order_items i
  join public.material_purchase_orders o on o.id = i.po_id
  where i.po_id = p_po_id
    and lower(trim(o.supplier_name)) = 'toko bekon'
  order by i.sort_order, i.created_at;
$$;

grant execute on function public.rincian_po_toko_bekon(uuid) to anon, authenticated, service_role;
