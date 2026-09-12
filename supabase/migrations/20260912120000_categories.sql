-- Categories: one optional, workspace-wide classification per task
-- (e.g. Bug, Feature, Design). Tags stay free-form and multi-valued.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text not null default 'gray',
  icon text,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);
create index categories_workspace_idx on public.categories(workspace_id);

alter table public.tasks
  add column category_id uuid references public.categories(id) on delete set null;
create index tasks_category_idx on public.tasks(category_id);

alter table public.categories enable row level security;
create policy "categories: read" on public.categories for select
  using (public.is_workspace_member(workspace_id));
create policy "categories: manage" on public.categories for all
  using (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) <> 'guest')
  with check (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) <> 'guest');

alter publication supabase_realtime add table public.categories;

-- Log category changes in the task activity feed.
create or replace function public.on_task_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  old_status text; new_status text; old_cat text; new_cat text; w uuid;
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.workspace_id, new.id, 'task_created', jsonb_build_object('title', new.title));
    insert into public.task_watchers (task_id, user_id) values (new.id, auth.uid()) on conflict do nothing;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.status_id is distinct from old.status_id then
      select name into old_status from public.statuses where id = old.status_id;
      select name into new_status from public.statuses where id = new.status_id;
      perform public.log_activity(new.workspace_id, new.id, 'status_changed',
        jsonb_build_object('from', old_status, 'to', new_status));
      for w in select user_id from public.task_watchers where task_id = new.id loop
        perform public.notify_user(w, new.workspace_id, new.id, 'status_changed',
          jsonb_build_object('title', new.title, 'from', old_status, 'to', new_status));
      end loop;
      if new.completed_at is not null and old.completed_at is null then
        perform public.log_activity(new.workspace_id, new.id, 'task_completed', '{}'::jsonb);
      elsif new.completed_at is null and old.completed_at is not null then
        perform public.log_activity(new.workspace_id, new.id, 'task_reopened', '{}'::jsonb);
      end if;
    end if;
    if new.priority is distinct from old.priority then
      perform public.log_activity(new.workspace_id, new.id, 'priority_changed',
        jsonb_build_object('from', old.priority, 'to', new.priority));
    end if;
    if new.due_date is distinct from old.due_date then
      perform public.log_activity(new.workspace_id, new.id, 'due_date_changed',
        jsonb_build_object('from', old.due_date, 'to', new.due_date));
    end if;
    if new.list_id is distinct from old.list_id then
      perform public.log_activity(new.workspace_id, new.id, 'task_moved',
        jsonb_build_object('from', old.list_id, 'to', new.list_id));
    end if;
    if new.title is distinct from old.title then
      perform public.log_activity(new.workspace_id, new.id, 'task_updated',
        jsonb_build_object('field', 'title', 'from', old.title, 'to', new.title));
    end if;
    if new.category_id is distinct from old.category_id then
      select name into old_cat from public.categories where id = old.category_id;
      select name into new_cat from public.categories where id = new.category_id;
      perform public.log_activity(new.workspace_id, new.id, 'task_updated',
        jsonb_build_object('field', 'category', 'from', old_cat, 'to', new_cat));
    end if;
    return new;
  end if;
  return null;
end $$;
