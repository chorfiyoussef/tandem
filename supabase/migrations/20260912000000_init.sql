-- ============================================================================
-- Tandem — initial schema
-- Hierarchy: workspace > space > list > task (> subtask)
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'admin', 'member', 'guest');
create type public.task_priority as enum ('none', 'low', 'normal', 'high', 'urgent');
create type public.status_category as enum ('todo', 'active', 'done');
create type public.activity_type as enum (
  'task_created', 'task_updated', 'status_changed', 'priority_changed',
  'assignee_added', 'assignee_removed', 'due_date_changed', 'comment_added',
  'attachment_added', 'task_moved', 'task_completed', 'task_reopened', 'task_deleted'
);
create type public.notification_type as enum (
  'assigned', 'mentioned', 'commented', 'status_changed', 'due_soon', 'invited'
);

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ----------------------------------------------------------------------------
-- Profiles (mirror of auth.users)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''), '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Workspaces & membership
-- ----------------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  icon text,
  task_prefix text not null default 'T' check (task_prefix ~ '^[A-Z]{1,5}$'),
  task_counter integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members(user_id);

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role public.member_role not null default 'member',
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);
create index workspace_invites_workspace_idx on public.workspace_invites(workspace_id);

-- ----------------------------------------------------------------------------
-- Spaces, statuses, lists
-- ----------------------------------------------------------------------------
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  color text not null default 'lavender',
  icon text,
  position double precision not null default 0,
  is_private boolean not null default false,
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index spaces_workspace_idx on public.spaces(workspace_id);
create trigger spaces_updated_at before update on public.spaces
  for each row execute function public.set_updated_at();

create table public.space_members (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (space_id, user_id)
);

create table public.statuses (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text not null default 'gray',
  category public.status_category not null default 'todo',
  position double precision not null default 0,
  created_at timestamptz not null default now()
);
create index statuses_space_idx on public.statuses(space_id);

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text,
  color text,
  icon text,
  position double precision not null default 0,
  default_view text not null default 'list' check (default_view in ('list','board','calendar')),
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lists_space_idx on public.lists(space_id);
create index lists_workspace_idx on public.lists(workspace_id);
create trigger lists_updated_at before update on public.lists
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Tags
-- ----------------------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text not null default 'gray',
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

-- ----------------------------------------------------------------------------
-- Tasks
-- ----------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  list_id uuid not null references public.lists(id) on delete cascade,
  parent_id uuid references public.tasks(id) on delete cascade,
  number integer not null,
  title text not null check (char_length(title) between 1 and 500),
  description jsonb,
  description_text text,
  status_id uuid references public.statuses(id) on delete set null,
  priority public.task_priority not null default 'none',
  start_date date,
  due_date date,
  due_time time,
  estimate_minutes integer check (estimate_minutes is null or estimate_minutes >= 0),
  position double precision not null default 0,
  completed_at timestamptz,
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, number)
);
create index tasks_list_idx on public.tasks(list_id) where archived_at is null;
create index tasks_parent_idx on public.tasks(parent_id);
create index tasks_workspace_idx on public.tasks(workspace_id);
create index tasks_status_idx on public.tasks(status_id);
create index tasks_due_idx on public.tasks(due_date) where archived_at is null and completed_at is null;
create index tasks_title_trgm_idx on public.tasks using gin (title gin_trgm_ops);
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- Prepare a task on insert: sync workspace from the list, assign the
-- per-workspace sequential number (T-1, T-2, ...), default the status to the
-- first status of the space and the position to the end of the list.
create or replace function public.prepare_task()
returns trigger language plpgsql security definer set search_path = public as $$
declare next_num integer; sp uuid;
begin
  select l.workspace_id, l.space_id into new.workspace_id, sp from public.lists l where l.id = new.list_id;
  if new.workspace_id is null then
    raise exception 'list % not found', new.list_id;
  end if;

  if new.number is null or new.number <= 0 then
    update public.workspaces
      set task_counter = task_counter + 1
      where id = new.workspace_id
      returning task_counter into next_num;
    new.number = next_num;
  end if;

  if new.status_id is null then
    select id into new.status_id from public.statuses
      where space_id = sp order by position asc, created_at asc limit 1;
  end if;

  if new.position is null or new.position = 0 then
    select coalesce(max(position), 0) + 1 into new.position from public.tasks
      where list_id = new.list_id and parent_id is not distinct from new.parent_id;
  end if;
  return new;
end $$;

create trigger tasks_prepare before insert on public.tasks
  for each row execute function public.prepare_task();

-- Keep workspace_id consistent when a task moves between lists
create or replace function public.sync_task_workspace()
returns trigger language plpgsql as $$
begin
  select workspace_id into new.workspace_id from public.lists where id = new.list_id;
  return new;
end $$;

create trigger tasks_sync_workspace before update of list_id on public.tasks
  for each row execute function public.sync_task_workspace();

-- Maintain completed_at from the status category
create or replace function public.sync_task_completion()
returns trigger language plpgsql as $$
declare cat public.status_category;
begin
  if new.status_id is null then
    return new;
  end if;
  select category into cat from public.statuses where id = new.status_id;
  if cat = 'done' and new.completed_at is null then
    new.completed_at = now();
  elsif cat <> 'done' and new.completed_at is not null then
    new.completed_at = null;
  end if;
  return new;
end $$;

create trigger tasks_sync_completion before insert or update of status_id on public.tasks
  for each row execute function public.sync_task_completion();

create table public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);
create index task_assignees_user_idx on public.task_assignees(user_id);

create table public.task_tags (
  task_id uuid not null references public.tasks(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (task_id, tag_id)
);

create table public.task_watchers (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (task_id, user_id)
);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  done boolean not null default false,
  position double precision not null default 0,
  created_at timestamptz not null default now()
);
create index checklist_items_task_idx on public.checklist_items(task_id);

-- ----------------------------------------------------------------------------
-- Comments, attachments, activity, notifications
-- ----------------------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body jsonb not null,
  body_text text not null default '',
  edited_at timestamptz,
  created_at timestamptz not null default now()
);
create index comments_task_idx on public.comments(task_id, created_at);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
create index attachments_task_idx on public.attachments(task_id);

create table public.activity (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type public.activity_type not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_task_idx on public.activity(task_id, created_at desc);
create index activity_workspace_idx on public.activity(workspace_id, created_at desc);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  task_id uuid references public.tasks(id) on delete cascade,
  type public.notification_type not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
create index notifications_unread_idx on public.notifications(user_id) where read_at is null;

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  list_id uuid not null references public.lists(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, list_id)
);

-- ----------------------------------------------------------------------------
-- Access helpers (security definer so RLS policies can call them cheaply)
-- ----------------------------------------------------------------------------
create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

create or replace function public.workspace_role(ws uuid)
returns public.member_role language sql stable security definer set search_path = public as $$
  select m.role from public.workspace_members m
  where m.workspace_id = ws and m.user_id = auth.uid();
$$;

create or replace function public.is_workspace_admin(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.workspace_role(ws) in ('owner','admin'), false);
$$;

create or replace function public.can_access_space(sp uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.spaces s
    where s.id = sp
      and public.is_workspace_member(s.workspace_id)
      and (
        not s.is_private
        or public.is_workspace_admin(s.workspace_id)
        or exists (select 1 from public.space_members sm where sm.space_id = s.id and sm.user_id = auth.uid())
      )
  );
$$;

create or replace function public.can_access_list(l uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.lists x where x.id = l and public.can_access_space(x.space_id)
  );
$$;

create or replace function public.can_access_task(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tasks x where x.id = t and public.can_access_list(x.list_id)
  );
$$;

-- ----------------------------------------------------------------------------
-- Row level security
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.statuses enable row level security;
alter table public.lists enable row level security;
alter table public.tags enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_tags enable row level security;
alter table public.task_watchers enable row level security;
alter table public.checklist_items enable row level security;
alter table public.comments enable row level security;
alter table public.attachments enable row level security;
alter table public.activity enable row level security;
alter table public.notifications enable row level security;
alter table public.favorites enable row level security;

-- profiles: visible to anyone sharing a workspace; editable by self
create policy "profiles: read shared" on public.profiles for select using (
  id = auth.uid() or exists (
    select 1 from public.workspace_members a
    join public.workspace_members b on a.workspace_id = b.workspace_id
    where a.user_id = auth.uid() and b.user_id = profiles.id
  )
);
create policy "profiles: update self" on public.profiles for update using (id = auth.uid());

-- workspaces
create policy "workspaces: read member" on public.workspaces for select using (public.is_workspace_member(id));
create policy "workspaces: create" on public.workspaces for insert with check (auth.uid() is not null and created_by = auth.uid());
create policy "workspaces: update admin" on public.workspaces for update using (public.is_workspace_admin(id));
create policy "workspaces: delete owner" on public.workspaces for delete using (public.workspace_role(id) = 'owner');

-- workspace_members
create policy "members: read" on public.workspace_members for select using (public.is_workspace_member(workspace_id));
create policy "members: admin insert" on public.workspace_members for insert with check (
  public.is_workspace_admin(workspace_id)
  -- bootstrap: creator becomes the first (owner) member
  or (user_id = auth.uid() and role = 'owner' and exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.created_by = auth.uid()
      and not exists (select 1 from public.workspace_members m where m.workspace_id = w.id)
  ))
);
create policy "members: admin update" on public.workspace_members for update using (public.is_workspace_admin(workspace_id));
create policy "members: admin delete or self" on public.workspace_members for delete using (
  public.is_workspace_admin(workspace_id) or user_id = auth.uid()
);

-- invites: admins manage; the invited person can read their own by email
create policy "invites: admin all" on public.workspace_invites for all using (public.is_workspace_admin(workspace_id));
create policy "invites: invitee read" on public.workspace_invites for select using (
  lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- spaces
create policy "spaces: read" on public.spaces for select using (public.can_access_space(id));
create policy "spaces: insert" on public.spaces for insert with check (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) <> 'guest');
create policy "spaces: update" on public.spaces for update using (public.can_access_space(id) and public.workspace_role(workspace_id) <> 'guest');
create policy "spaces: delete admin" on public.spaces for delete using (public.is_workspace_admin(workspace_id));

create policy "space_members: read" on public.space_members for select using (public.can_access_space(space_id));
create policy "space_members: manage" on public.space_members for all using (
  exists (select 1 from public.spaces s where s.id = space_id and public.is_workspace_admin(s.workspace_id))
);

-- statuses
create policy "statuses: read" on public.statuses for select using (public.can_access_space(space_id));
create policy "statuses: manage" on public.statuses for all using (
  public.can_access_space(space_id) and exists (
    select 1 from public.spaces s where s.id = space_id and public.workspace_role(s.workspace_id) <> 'guest'
  )
);

-- lists
create policy "lists: read" on public.lists for select using (public.can_access_list(id));
create policy "lists: insert" on public.lists for insert with check (public.can_access_space(space_id) and public.workspace_role(workspace_id) <> 'guest');
create policy "lists: update" on public.lists for update using (public.can_access_list(id) and public.workspace_role(workspace_id) <> 'guest');
create policy "lists: delete" on public.lists for delete using (public.can_access_list(id) and public.workspace_role(workspace_id) <> 'guest');

-- tags
create policy "tags: read" on public.tags for select using (public.is_workspace_member(workspace_id));
create policy "tags: manage" on public.tags for all using (public.is_workspace_member(workspace_id) and public.workspace_role(workspace_id) <> 'guest');

-- tasks
create policy "tasks: read" on public.tasks for select using (public.can_access_list(list_id));
create policy "tasks: insert" on public.tasks for insert with check (public.can_access_list(list_id));
create policy "tasks: update" on public.tasks for update using (public.can_access_list(list_id));
create policy "tasks: delete" on public.tasks for delete using (public.can_access_list(list_id));

create policy "task_assignees: read" on public.task_assignees for select using (public.can_access_task(task_id));
create policy "task_assignees: manage" on public.task_assignees for all using (public.can_access_task(task_id));
create policy "task_tags: read" on public.task_tags for select using (public.can_access_task(task_id));
create policy "task_tags: manage" on public.task_tags for all using (public.can_access_task(task_id));
create policy "task_watchers: read" on public.task_watchers for select using (public.can_access_task(task_id));
create policy "task_watchers: manage" on public.task_watchers for all using (public.can_access_task(task_id));
create policy "checklist: read" on public.checklist_items for select using (public.can_access_task(task_id));
create policy "checklist: manage" on public.checklist_items for all using (public.can_access_task(task_id));

-- comments
create policy "comments: read" on public.comments for select using (public.can_access_task(task_id));
create policy "comments: insert" on public.comments for insert with check (public.can_access_task(task_id) and author_id = auth.uid());
create policy "comments: update own" on public.comments for update using (author_id = auth.uid());
create policy "comments: delete own or admin" on public.comments for delete using (author_id = auth.uid() or public.is_workspace_admin(workspace_id));

-- attachments
create policy "attachments: read" on public.attachments for select using (public.can_access_task(task_id));
create policy "attachments: insert" on public.attachments for insert with check (public.can_access_task(task_id) and uploaded_by = auth.uid());
create policy "attachments: delete own or admin" on public.attachments for delete using (uploaded_by = auth.uid() or public.is_workspace_admin(workspace_id));

-- activity: readable by workspace members, written by triggers only
create policy "activity: read" on public.activity for select using (
  case when task_id is null then public.is_workspace_member(workspace_id) else public.can_access_task(task_id) end
);

-- notifications: own only
create policy "notifications: read own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications: update own" on public.notifications for update using (user_id = auth.uid());
create policy "notifications: delete own" on public.notifications for delete using (user_id = auth.uid());

-- favorites
create policy "favorites: own" on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Activity + notification triggers
-- ----------------------------------------------------------------------------
create or replace function public.log_activity(
  ws uuid, t uuid, kind public.activity_type, data jsonb default '{}'::jsonb
) returns void language sql security definer set search_path = public as $$
  insert into public.activity (workspace_id, task_id, actor_id, type, payload)
  values (ws, t, auth.uid(), kind, coalesce(data, '{}'::jsonb));
$$;

create or replace function public.notify_user(
  target uuid, ws uuid, t uuid, kind public.notification_type, data jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  if target is null or target = auth.uid() then
    return;
  end if;
  insert into public.notifications (user_id, workspace_id, actor_id, task_id, type, payload)
  values (target, ws, auth.uid(), t, kind, coalesce(data, '{}'::jsonb));
end $$;

create or replace function public.on_task_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  old_status text; new_status text; w uuid;
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.workspace_id, new.id, 'task_created', jsonb_build_object('title', new.title));
    -- creator watches their own task
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
    return new;
  end if;
  return null;
end $$;

create trigger tasks_activity after insert or update on public.tasks
  for each row execute function public.on_task_change();

create or replace function public.on_assignee_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare t public.tasks;
begin
  if tg_op = 'INSERT' then
    select * into t from public.tasks where id = new.task_id;
    perform public.log_activity(t.workspace_id, t.id, 'assignee_added', jsonb_build_object('user_id', new.user_id));
    perform public.notify_user(new.user_id, t.workspace_id, t.id, 'assigned', jsonb_build_object('title', t.title));
    insert into public.task_watchers (task_id, user_id) values (t.id, new.user_id) on conflict do nothing;
    return new;
  else
    select * into t from public.tasks where id = old.task_id;
    if t.id is not null then
      perform public.log_activity(t.workspace_id, t.id, 'assignee_removed', jsonb_build_object('user_id', old.user_id));
    end if;
    return old;
  end if;
end $$;

create trigger task_assignees_activity after insert or delete on public.task_assignees
  for each row execute function public.on_assignee_change();

create or replace function public.on_comment_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare t public.tasks; w uuid; m uuid;
begin
  select * into t from public.tasks where id = new.task_id;
  perform public.log_activity(t.workspace_id, t.id, 'comment_added', jsonb_build_object('comment_id', new.id));
  insert into public.task_watchers (task_id, user_id) values (t.id, auth.uid()) on conflict do nothing;

  -- mentions: payload may carry an array of user ids under body->'mentions'
  for m in select (value #>> '{}')::uuid from jsonb_array_elements(coalesce(new.body->'mentions', '[]'::jsonb)) loop
    perform public.notify_user(m, t.workspace_id, t.id, 'mentioned',
      jsonb_build_object('title', t.title, 'comment_id', new.id, 'excerpt', left(new.body_text, 140)));
  end loop;

  for w in select user_id from public.task_watchers where task_id = t.id
           and user_id not in (select (value #>> '{}')::uuid from jsonb_array_elements(coalesce(new.body->'mentions', '[]'::jsonb))) loop
    perform public.notify_user(w, t.workspace_id, t.id, 'commented',
      jsonb_build_object('title', t.title, 'comment_id', new.id, 'excerpt', left(new.body_text, 140)));
  end loop;
  return new;
end $$;

create trigger comments_activity after insert on public.comments
  for each row execute function public.on_comment_insert();

-- ----------------------------------------------------------------------------
-- RPCs
-- ----------------------------------------------------------------------------

-- Create a workspace with a default space, statuses and list; caller becomes owner.
create or replace function public.create_workspace(p_name text, p_slug text, p_prefix text default 'T')
returns public.workspaces language plpgsql security definer set search_path = public as $$
declare ws public.workspaces; sp uuid; ls uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.workspaces (name, slug, task_prefix, created_by)
    values (p_name, p_slug, upper(coalesce(nullif(p_prefix,''), 'T')), uid) returning * into ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws.id, uid, 'owner');
  insert into public.spaces (workspace_id, name, color, icon, position, created_by)
    values (ws.id, 'General', 'lavender', 'squares-four', 1, uid) returning id into sp;
  insert into public.statuses (space_id, name, color, category, position) values
    (sp, 'To do', 'gray', 'todo', 1),
    (sp, 'In progress', 'sky', 'active', 2),
    (sp, 'In review', 'lavender', 'active', 3),
    (sp, 'Done', 'mint', 'done', 4);
  insert into public.lists (space_id, workspace_id, name, position, created_by)
    values (sp, ws.id, 'Tasks', 1, uid) returning id into ls;
  return ws;
end $$;

-- Create a space with default statuses.
create or replace function public.create_space(p_workspace uuid, p_name text, p_color text default 'lavender', p_icon text default null, p_private boolean default false)
returns public.spaces language plpgsql security definer set search_path = public as $$
declare sp public.spaces; uid uuid := auth.uid();
begin
  if not public.is_workspace_member(p_workspace) or public.workspace_role(p_workspace) = 'guest' then
    raise exception 'not allowed';
  end if;
  insert into public.spaces (workspace_id, name, color, icon, is_private, position, created_by)
    values (p_workspace, p_name, p_color, p_icon, p_private,
      coalesce((select max(position) from public.spaces where workspace_id = p_workspace), 0) + 1, uid)
    returning * into sp;
  insert into public.statuses (space_id, name, color, category, position) values
    (sp.id, 'To do', 'gray', 'todo', 1),
    (sp.id, 'In progress', 'sky', 'active', 2),
    (sp.id, 'Done', 'mint', 'done', 3);
  if p_private then
    insert into public.space_members (space_id, user_id) values (sp.id, uid) on conflict do nothing;
  end if;
  return sp;
end $$;

-- Accept an invite by token (called by the invitee after signing in).
create or replace function public.accept_invite(p_token text)
returns public.workspaces language plpgsql security definer set search_path = public as $$
declare inv public.workspace_invites; ws public.workspaces; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into inv from public.workspace_invites where token = p_token;
  if inv.id is null then raise exception 'invite not found'; end if;
  if inv.accepted_at is not null then raise exception 'invite already used'; end if;
  if inv.expires_at < now() then raise exception 'invite expired'; end if;
  insert into public.workspace_members (workspace_id, user_id, role)
    values (inv.workspace_id, uid, inv.role)
    on conflict (workspace_id, user_id) do nothing;
  update public.workspace_invites set accepted_at = now() where id = inv.id;
  select * into ws from public.workspaces where id = inv.workspace_id;
  return ws;
end $$;

-- Full-text-ish search across tasks in a workspace.
create or replace function public.search_tasks(p_workspace uuid, p_query text, p_limit int default 20)
returns setof public.tasks language sql stable security invoker as $$
  select t.* from public.tasks t
  where t.workspace_id = p_workspace
    and t.archived_at is null
    and (
      t.title ilike '%' || p_query || '%'
      or coalesce(t.description_text, '') ilike '%' || p_query || '%'
      or (p_query ~ '^\d+$' and t.number = p_query::int)
    )
  order by similarity(t.title, p_query) desc, t.updated_at desc
  limit p_limit;
$$;

-- Mark all notifications read
create or replace function public.mark_all_notifications_read()
returns void language sql security invoker as $$
  update public.notifications set read_at = now() where user_id = auth.uid() and read_at is null;
$$;

-- ----------------------------------------------------------------------------
-- Realtime
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.task_assignees;
alter publication supabase_realtime add table public.task_tags;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.lists;
alter publication supabase_realtime add table public.spaces;
alter publication supabase_realtime add table public.statuses;
alter publication supabase_realtime add table public.checklist_items;

-- ----------------------------------------------------------------------------
-- Storage bucket for attachments
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 26214400)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 2097152)
on conflict (id) do nothing;

-- attachments path convention: {workspace_id}/{task_id}/{uuid}-{filename}
create policy "attachments: read members" on storage.objects for select using (
  bucket_id = 'attachments' and public.is_workspace_member((storage.foldername(name))[1]::uuid)
);
create policy "attachments: upload members" on storage.objects for insert with check (
  bucket_id = 'attachments' and public.is_workspace_member((storage.foldername(name))[1]::uuid)
);
create policy "attachments: delete members" on storage.objects for delete using (
  bucket_id = 'attachments' and public.is_workspace_member((storage.foldername(name))[1]::uuid)
);

-- avatars path convention: {user_id}/avatar.{ext}
create policy "avatars: public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars: own write" on storage.objects for insert with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "avatars: own update" on storage.objects for update using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "avatars: own delete" on storage.objects for delete using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
