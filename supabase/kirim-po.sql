-- Alamat proyek dan cara/tanggal kirim atau ambil untuk nota Toko Bekon.
-- Aman dijalankan ulang.

create or replace function public.kirim_po_toko_bekon(p_po_id uuid)
returns table (
  alamat text,
  cara text,
  tanggal date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    nullif(trim(p.location), ''),
    case r.delivery_mode
      when 'delivery' then 'dikirim'
      when 'pickup' then 'diambil'
      else null
    end,
    case r.delivery_mode
      when 'pickup' then coalesce(r.pickup_date, r.needed_date, o.needed_date)
      when 'delivery' then coalesce(r.delivery_date, r.needed_date, o.needed_date)
      else coalesce(r.needed_date, o.needed_date)
    end
  from public.material_purchase_orders o
  left join public.projects p on p.id = o.project_id
  left join public.material_requests r on r.id = o.material_request_id
  where o.id = p_po_id
    and lower(trim(o.supplier_name)) = 'toko bekon';
$$;

grant execute on function public.kirim_po_toko_bekon(uuid) to anon, authenticated, service_role;
