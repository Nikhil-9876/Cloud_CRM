-- ============================================================
-- SEED DATA — run this in Supabase Dashboard > SQL Editor
-- AFTER running supabase_schema.sql
--
-- This script automatically uses YOUR user ID from auth.users.
-- (Works as long as you have signed up at least once.)
-- ============================================================

do $$
declare
  u uuid;

  -- contact IDs
  c1 uuid := gen_random_uuid();
  c2 uuid := gen_random_uuid();
  c3 uuid := gen_random_uuid();
  c4 uuid := gen_random_uuid();
  c5 uuid := gen_random_uuid();
  c6 uuid := gen_random_uuid();
  c7 uuid := gen_random_uuid();
  c8 uuid := gen_random_uuid();

  -- deal IDs
  d1 uuid := gen_random_uuid();
  d2 uuid := gen_random_uuid();
  d3 uuid := gen_random_uuid();
  d4 uuid := gen_random_uuid();
  d5 uuid := gen_random_uuid();
  d6 uuid := gen_random_uuid();
  d7 uuid := gen_random_uuid();

begin
  -- grab the first user that signed up (you)
  select id into u from auth.users order by created_at limit 1;

  if u is null then
    raise exception 'No user found — please sign up first, then re-run this script.';
  end if;

  -- ----------------------------------------------------------------
  -- CONTACTS
  -- ----------------------------------------------------------------
  insert into public.contacts (id, user_id, first_name, last_name, email, phone, company_name, notes, created_at) values
    (c1, u, 'Aarav',    'Sharma',     'aarav.sharma@techbridge.in',    '+91 98100 11234', 'TechBridge Solutions',    'Met at a startup conf in Bangalore. Interested in enterprise plan.',      now() - interval '30 days'),
    (c2, u, 'Priya',    'Mehta',      'priya.mehta@cloudnova.io',      '+91 97302 55678', 'CloudNova Technologies',  'Referred by Aarav. Decision maker for procurement.',                     now() - interval '25 days'),
    (c3, u, 'Rohan',    'Verma',      'rohan.verma@finedge.co.in',     '+91 98765 43210', 'FinEdge Capital',         'Looking to automate invoicing. Follow-up pending after product demo.',   now() - interval '20 days'),
    (c4, u, 'Sneha',    'Nair',       'sneha.nair@greenlogix.com',     '+91 96543 21098', 'GreenLogix India',        'Interested in supply chain module. Has budget approved for Q1.',        now() - interval '18 days'),
    (c5, u, 'Vikram',   'Joshi',      'vikram.joshi@rapidretail.in',   '+91 91234 56789', 'RapidRetail India',       'E-commerce integrations. Running free trial currently.',                now() - interval '15 days'),
    (c6, u, 'Ananya',   'Gupta',      'ananya.gupta@nexusmedia.in',    '+91 93456 78901', 'Nexus Media Group',       'Content management upgrade. Team of 12 users.',                         now() - interval '10 days'),
    (c7, u, 'Karan',    'Singhania',  'karan@healthpulse.co.in',       '+91 99887 66554', 'HealthPulse Clinics',     'Healthcare SaaS. Compliance requirements are high.',                    now() - interval '7 days'),
    (c8, u, 'Divya',    'Reddy',      'divya.reddy@eduspark.in',       '+91 90011 22334', 'EduSpark Learning',       'EdTech platform. Wants custom onboarding flow.',                        now() - interval '3 days');

  -- ----------------------------------------------------------------
  -- LEADS
  -- ----------------------------------------------------------------
  insert into public.leads (user_id, name, email, source, status, assigned_to, notes, created_at) values
    (u, 'Rahul Kapoor',      'rahul.kapoor@infodyne.in',      'Website',      'New',       'Nikhil',   'Filled contact form. Interested in Basic plan.',                   now() - interval '28 days'),
    (u, 'Meena Iyer',        'meena.iyer@datatrace.io',       'Cold Call',    'Contacted', 'Nikhil',   'Called on 20-Feb. Will respond after internal review.',            now() - interval '22 days'),
    (u, 'Suresh Pillai',     'suresh@brightops.co.in',        'Referral',     'Qualified', 'Nikhil',   'Referred by Priya Mehta. High intent — demo requested.',           now() - interval '18 days'),
    (u, 'Tanya Bose',        'tanya.bose@socialbloom.in',     'Social Media', 'Contacted', 'Nikhil',   'Clicked LinkedIn ad. Scheduled intro call for next week.',         now() - interval '14 days'),
    (u, 'Ajay Patel',        'ajay.patel@opticsolutions.in',  'Website',      'New',       'Nikhil',   'Downloaded whitepaper. No response yet.',                          now() - interval '10 days'),
    (u, 'Pooja Rane',        'pooja.rane@craftstudio.in',     'Referral',     'Qualified', 'Nikhil',   'Strong interest, budget confirmed. Moving to proposal stage.',     now() - interval '8 days'),
    (u, 'Manish Tiwari',     'manish@logiqverse.com',         'Cold Call',    'Dropped',   'Nikhil',   'Not interested at this time. Revisit in Q3.',                      now() - interval '6 days'),
    (u, 'Nisha Desai',       'nisha.desai@urbanwrap.in',      'Social Media', 'New',       'Nikhil',   'Instagram DM. Needs follow-up with product deck.',                 now() - interval '3 days'),
    (u, 'Harish Malhotra',   'harish@scaleworks.in',          'Website',      'Contacted', 'Nikhil',   'Signed up for free trial. Engagement looks positive.',             now() - interval '2 days'),
    (u, 'Lavanya Krishnan',  'lavanya@pixelcraft.io',         'Referral',     'Qualified', 'Nikhil',   'Hot lead. Budget 5L. Ready to close this month.',                  now() - interval '1 day');

  -- ----------------------------------------------------------------
  -- DEALS
  -- ----------------------------------------------------------------
  insert into public.deals (id, user_id, contact_id, title, value, stage, expected_close_date, notes, created_at) values
    (d1, u, c1, 'TechBridge — Enterprise License',    850000, 'Negotiation',    current_date + 15,  'Final pricing discussion. 3-year deal on table.',          now() - interval '25 days'),
    (d2, u, c2, 'CloudNova — SaaS Subscription',      420000, 'Proposal Sent',  current_date + 30,  'Sent 3-tier proposal. Awaiting PMO approval.',             now() - interval '20 days'),
    (d3, u, c3, 'FinEdge — Invoicing Module',         180000, 'Contacted',      current_date + 45,  'Demo completed. Evaluating competitors.',                  now() - interval '18 days'),
    (d4, u, c4, 'GreenLogix — Supply Chain Suite',    650000, 'Won',            current_date - 5,   'Signed and onboarded. Kickoff done.',                      now() - interval '30 days'),
    (d5, u, c5, 'RapidRetail — E-commerce Integration',310000, 'Lead',          current_date + 60,  'Early stage. Free trial ends in 10 days.',                 now() - interval '15 days'),
    (d6, u, c6, 'Nexus Media — Content Platform Pro', 275000, 'Won',            current_date - 10,  'Deal closed. PO received. Implementation in progress.',    now() - interval '35 days'),
    (d7, u, c7, 'HealthPulse — Compliance Package',   920000, 'Lost',           current_date - 2,   'Lost to competitor. Price sensitivity + longer timeline.', now() - interval '40 days');

  -- ----------------------------------------------------------------
  -- ACTIVITIES
  -- ----------------------------------------------------------------
  insert into public.activities (user_id, contact_id, deal_id, type, title, description, due_date, done, created_at) values
    (u, c1, d1, 'Call',    'Negotiation call with Aarav',          'Discuss final pricing and contract terms for enterprise plan.',      now() + interval '2 days',   false, now() - interval '2 days'),
    (u, c2, d2, 'Email',   'Send revised proposal to Priya',       'Update proposal with 20% discount for annual billing.',             now() + interval '1 day',    false, now() - interval '1 day'),
    (u, c3, d3, 'Meeting', 'Product demo with FinEdge team',       'Live demo of invoicing module with CFO and accounts head.',        now() - interval '2 days',   true,  now() - interval '5 days'),
    (u, c4, d4, 'Note',    'Onboarding notes — GreenLogix',        'Setup complete. Users trained on supply chain module basics.',      now() - interval '5 days',   true,  now() - interval '6 days'),
    (u, c5, d5, 'Call',    'Trial check-in with Vikram',           'Understand usage so far and address any blockers.',                 now() + interval '3 days',   false, now() - interval '3 days'),
    (u, c6, d6, 'Meeting', 'Implementation kickoff — Nexus Media', 'Intro call with their tech lead. Align on rollout timeline.',      now() - interval '1 day',    true,  now() - interval '8 days'),
    (u, c7, d7, 'Email',   'Post-loss feedback to Karan',          'Send feedback survey and leave door open for future engagement.',   now() - interval '1 day',    true,  now() - interval '3 days'),
    (u, c8, null,'Call',   'Discovery call with Divya (EduSpark)', 'Understand their LMS needs and team size.',                        now() + interval '1 day',    false, now() - interval '1 day'),
    (u, c1, d1, 'Email',   'Legal review follow-up — TechBridge',  'Check if legal team at TechBridge has reviewed MSA.',              now() + interval '4 days',   false, now() - interval '1 day'),
    (u, c2, null,'Note',   'Priya out of office until 5 March',    'Do not call. Send email update only after 5th March.',             now() + interval '5 days',   false, now()),
    (u, c3, d3, 'Meeting', 'Competitor comparison review',         'FinEdge wants side-by-side comparison vs. Zoho Invoice.',          now() + interval '6 days',   false, now() - interval '2 days'),
    (u, c5, d5, 'Note',    'Trial extended by 7 days',             'Support approved a trial extension. Vikram seems close to buying.',now() - interval '3 days',   true,  now() - interval '4 days');

end $$;
