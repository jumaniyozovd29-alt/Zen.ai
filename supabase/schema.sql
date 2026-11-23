-- ZENAI Supabase schema
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','premium')),
  monthly_limit integer not null default 250 check (monthly_limit in (250,1500)),
  usage_count integer not null default 0 check (usage_count >= 0),
  usage_month date not null default date_trunc('month', now())::date,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.reserve_usage(p_user_id uuid)
returns table (allowed boolean, remaining integer, plan text)
language plpgsql security definer set search_path = public as $$
declare v_limit integer; v_usage integer; v_plan text; v_month date := date_trunc('month', now())::date;
begin
  insert into public.profiles (id) values (p_user_id) on conflict (id) do nothing;
  update public.profiles set usage_count = case when usage_month <> v_month then 0 else usage_count end, usage_month = v_month where id = p_user_id;
  select monthly_limit, usage_count, profiles.plan into v_limit, v_usage, v_plan from public.profiles where id = p_user_id for update;
  if v_usage >= v_limit then return query select false, 0, v_plan; end if;
  update public.profiles set usage_count = usage_count + 1 where id = p_user_id;
  return query select true, v_limit - v_usage - 1, v_plan;
end;
$$;

grant execute on function public.reserve_usage(uuid) to authenticated;

create or replace function public.refund_usage(p_user_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set usage_count = greatest(usage_count - 1, 0)
  where id = p_user_id
    and usage_month = date_trunc('month', now())::date
    and usage_count > 0;
  return found;
end;
$$;

grant execute on function public.refund_usage(uuid) to authenticated;
