-- ============================================================
-- CRM AUTOMATIONS — run this in Supabase Dashboard > SQL Editor
-- Requires: supabase_schema.sql already applied
-- ============================================================


-- ──────────────────────────────────────────────────────────
-- AUTOMATION 1
-- When a new contact is inserted, automatically create a
-- "Follow-up Call" activity due 3 days from now.
-- ──────────────────────────────────────────────────────────
create or replace function public.auto_activity_on_new_contact()
returns trigger language plpgsql security definer as $$
begin
  insert into public.activities
    (user_id, contact_id, type, title, description, due_date, done)
  values (
    new.user_id,
    new.id,
    'Call',
    'Follow-up call with ' || new.first_name || ' ' || new.last_name,
    'Auto-created: initial follow-up after adding this contact.',
    now() + interval '3 days',
    false
  );
  return new;
end;
$$;

drop trigger if exists trg_auto_activity_on_new_contact on public.contacts;
create trigger trg_auto_activity_on_new_contact
  after insert on public.contacts
  for each row execute function public.auto_activity_on_new_contact();


-- ──────────────────────────────────────────────────────────
-- AUTOMATION 2
-- When a deal's stage is changed (via drag or edit),
-- automatically log a "Note" activity recording the change.
-- ──────────────────────────────────────────────────────────
create or replace function public.auto_log_deal_stage_change()
returns trigger language plpgsql security definer as $$
begin
  if old.stage is distinct from new.stage then
    insert into public.activities
      (user_id, contact_id, deal_id, type, title, description, due_date, done)
    values (
      new.user_id,
      new.contact_id,
      new.id,
      'Note',
      'Stage changed: ' || old.stage || ' → ' || new.stage,
      'Auto-logged by system when deal "' || new.title || '" was moved between stages.',
      now(),
      true
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auto_log_deal_stage_change on public.deals;
create trigger trg_auto_log_deal_stage_change
  after update on public.deals
  for each row execute function public.auto_log_deal_stage_change();
