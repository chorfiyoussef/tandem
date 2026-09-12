-- Recurring tasks. `recurrence` is {"every": n, "unit": "day"|"week"|"month"|"year"}.
-- Completing a recurring task spawns the next occurrence: same title, details,
-- list, category, tags, assignees, watchers and an unchecked copy of the
-- checklist, due `every unit` after the previous due date (rolled forward so
-- it never lands in the past). The completed task stays as history.

alter table public.tasks
  add column recurrence jsonb,
  add column recurrence_source_id uuid references public.tasks(id) on delete set null;
create index tasks_recurrence_source_idx on public.tasks(recurrence_source_id);

alter table public.tasks
  add constraint tasks_recurrence_shape check (
    recurrence is null or (
      jsonb_typeof(recurrence->'every') = 'number'
      and (recurrence->>'every')::int between 1 and 365
      and recurrence->>'unit' in ('day', 'week', 'month', 'year')
    )
  );

create or replace function public.spawn_next_occurrence()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  every int; unit text; step interval; next_due date; new_id uuid; first_status uuid; sp uuid; span int;
begin
  if new.recurrence is null then return null; end if;
  if exists (select 1 from public.tasks where recurrence_source_id = new.id) then return null; end if;

  every := greatest(coalesce((new.recurrence->>'every')::int, 1), 1);
  unit := coalesce(new.recurrence->>'unit', 'week');
  step := (every || ' ' || unit)::interval;
  next_due := (coalesce(new.due_date, current_date) + step)::date;
  while next_due < current_date loop
    next_due := (next_due + step)::date;
  end loop;

  select l.space_id into sp from public.lists l where l.id = new.list_id;
  select id into first_status from public.statuses where space_id = sp order by position asc, created_at asc limit 1;
  span := case when new.start_date is not null and new.due_date is not null then new.due_date - new.start_date else null end;

  insert into public.tasks (
    workspace_id, list_id, parent_id, number, title, description, description_text, status_id, category_id,
    priority, start_date, due_date, due_time, estimate_minutes, position, created_by, recurrence, recurrence_source_id
  ) values (
    new.workspace_id, new.list_id, new.parent_id, 0, new.title, new.description, new.description_text, first_status, new.category_id,
    new.priority, case when span is not null then next_due - span else null end, next_due, new.due_time, new.estimate_minutes,
    0, new.created_by, new.recurrence, new.id
  ) returning id into new_id;

  insert into public.task_assignees (task_id, user_id, assigned_by)
    select new_id, user_id, assigned_by from public.task_assignees where task_id = new.id;
  insert into public.task_tags (task_id, tag_id)
    select new_id, tag_id from public.task_tags where task_id = new.id;
  insert into public.checklist_items (task_id, title, done, position)
    select new_id, title, false, position from public.checklist_items where task_id = new.id;
  insert into public.task_watchers (task_id, user_id)
    select new_id, user_id from public.task_watchers where task_id = new.id
    on conflict do nothing;
  return null;
end $$;

-- Not "update of completed_at": that column is set by a BEFORE trigger when the
-- status changes, and column-scoped triggers only see columns in the SET list.
create trigger tasks_recurrence
  after update on public.tasks
  for each row
  when (old.completed_at is null and new.completed_at is not null and new.recurrence is not null)
  execute function public.spawn_next_occurrence();
