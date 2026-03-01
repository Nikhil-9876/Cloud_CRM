-- ================================================================
-- CRM Schema for Amazon RDS PostgreSQL (or Aurora PostgreSQL)
-- ================================================================
-- How to run:
--   Option A (AWS Console): Open RDS Query Editor and paste this.
--   Option B (Cloud Shell / local terminal):
--     psql -h <rds-endpoint> -U <username> -d crmdb -f aws-schema.sql
--
-- Note: user_id stores the Cognito sub (unique user identifier),
-- extracted from the JWT by each Lambda function.
-- Row isolation is enforced in Lambda by always filtering WHERE user_id = $1.
-- ================================================================

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. CONTACTS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT         NOT NULL,        -- Cognito sub
  first_name    TEXT         NOT NULL,
  last_name     TEXT         NOT NULL,
  email         TEXT,
  phone         TEXT,
  company_name  TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);

-- ── 2. LEADS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT         NOT NULL,
  name          TEXT         NOT NULL,
  email         TEXT,
  source        TEXT         NOT NULL DEFAULT 'Website',
  status        TEXT         NOT NULL DEFAULT 'New'
                             CHECK (status IN ('New','Contacted','Qualified','Dropped')),
  assigned_to   TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(user_id);

-- ── 3. DEALS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              TEXT          NOT NULL,
  contact_id           UUID          REFERENCES contacts(id) ON DELETE SET NULL,
  title                TEXT          NOT NULL,
  value                NUMERIC(12,2) NOT NULL DEFAULT 0,
  stage                TEXT          NOT NULL DEFAULT 'Lead'
                                     CHECK (stage IN ('Lead','Contacted','Proposal Sent','Negotiation','Won','Lost')),
  expected_close_date  DATE,
  notes                TEXT,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deals_user       ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact    ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage      ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_close_date ON deals(expected_close_date);

-- ── 4. ACTIVITIES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT         NOT NULL,
  contact_id    UUID         REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id       UUID         REFERENCES deals(id)    ON DELETE SET NULL,
  type          TEXT         NOT NULL DEFAULT 'Call'
                             CHECK (type IN ('Call','Email','Meeting','Note')),
  title         TEXT         NOT NULL,
  description   TEXT,
  due_date      TIMESTAMPTZ,
  done          BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activities_user     ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact  ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal     ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_due_date ON activities(due_date);
