-- Run in Supabase SQL Editor (Dashboard → SQL).
-- Re-runnable. Auth is client-side allowlist + authenticated role;
-- disable public signups so only your users can get a JWT.

revoke select, update, insert, delete on table public.category from anon;
revoke select, update, insert, delete on table public.expense from anon;

grant select on table public.category to authenticated;
grant select, insert, update, delete on table public.expense to authenticated;

alter table public.category enable row level security;
alter table public.expense enable row level security;

drop policy if exists "anon_select_category" on public.category;
drop policy if exists "anon_select_expense" on public.expense;
drop policy if exists "anon_update_expense" on public.expense;
drop policy if exists "anon_insert_expense" on public.expense;
drop policy if exists "anon_delete_expense" on public.expense;

drop policy if exists "authenticated_select_category" on public.category;
create policy "authenticated_select_category"
  on public.category
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated_select_expense" on public.expense;
create policy "authenticated_select_expense"
  on public.expense
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated_insert_expense" on public.expense;
create policy "authenticated_insert_expense"
  on public.expense
  for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated_update_expense" on public.expense;
create policy "authenticated_update_expense"
  on public.expense
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated_delete_expense" on public.expense;
create policy "authenticated_delete_expense"
  on public.expense
  for delete
  to authenticated
  using (true);
