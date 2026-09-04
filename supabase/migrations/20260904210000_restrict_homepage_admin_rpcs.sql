begin;

revoke all on function public.upsert_homepage_block(
  public.homepage_block_slot, text, text, text, text, text, boolean, integer
) from anon;

revoke all on function public.get_admin_dashboard_stats(timestamptz)
from anon;

commit;
