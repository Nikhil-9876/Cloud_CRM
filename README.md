# Cloud CRM

A full-stack, cloud-native Customer Relationship Management (CRM) application built on AWS. The frontend is a React SPA hosted on AWS Amplify; the backend is a set of serverless Lambda functions behind API Gateway that talk to an Amazon RDS PostgreSQL database, with authentication handled by Amazon Cognito and email notifications sent through Amazon SES.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [AWS Services Used](#aws-services-used)
3. [Features](#features)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [Role-Based Access Control](#role-based-access-control)
8. [Environment Variables](#environment-variables)
9. [Local Development](#local-development)
10. [Deployment](#deployment)
11. [Tech Stack](#tech-stack)

---

## Architecture Overview

```
Browser (React SPA)
    │  AWS Amplify (Auth SDK + Hosted UI)
    │  Cognito ID Token  →  Authorization: Bearer <JWT>
    ▼
Amazon API Gateway  (REST API, CORS enabled)
    │
    ├── /contacts  ──────► Lambda: contacts
    ├── /leads     ──────► Lambda: leads
    ├── /deals     ──────► Lambda: deals
    ├── /activities ─────► Lambda: activities
    ├── /dashboard ──────► Lambda: dashboard
    ├── /reports   ──────► Lambda: reports
    └── /team      ──────► Lambda: team
                               │
                        ┌──────┴──────────────────┐
                        ▼                         ▼
                Amazon RDS (PostgreSQL)    Amazon SES (Email)
                        │
                Amazon Cognito (JWT verify + user management)
```

The React frontend is deployed and served by **AWS Amplify Hosting** with automatic CI/CD triggered on every Git push.

---

## AWS Services Used

### 1. AWS Amplify
- **Role**: Frontend hosting and CI/CD pipeline.
- **How it is used**:
  - Hosts the production React build (static assets served via CloudFront).
  - `amplify.yml` defines the build pipeline (`npm ci` → `npm run build`) with `dist/` as the artifact directory.
  - The `aws-amplify` v6 JavaScript SDK is used client-side for all Cognito Auth operations (sign-up, sign-in, session management).
- **SDK package**: `aws-amplify@^6`

### 2. Amazon Cognito
- **Role**: User authentication and identity management.
- **How it is used**:
  - A **Cognito User Pool** stores all CRM users.
  - Users register with email + password. Cognito sends a **6-digit verification code** to confirm the email before the account is active.
  - A **custom attribute** `custom:role` (values: `admin` | `sales_rep`) is stored on each user to control permissions.
  - The frontend uses the Amplify Auth SDK to call `signUp`, `confirmSignUp`, `signIn`, `signOut`, `getCurrentUser`, and `fetchAuthSession`.
  - Every API request attaches the Cognito **ID Token** as a `Bearer` token in the `Authorization` header.
  - Lambda functions verify the token using the `aws-jwt-verify` library and extract `sub` (userId) and `custom:role` from the JWT payload — no separate user table is needed in RDS.
  - The **Team Lambda** uses the Cognito Identity Provider SDK (`@aws-sdk/client-cognito-identity-provider`) to call `ListUsersCommand` and `AdminUpdateUserAttributesCommand`, allowing admins to view and change user roles without touching the User Pool console.
- **SDK packages**: `aws-amplify/auth` (frontend), `aws-jwt-verify` (Lambda), `@aws-sdk/client-cognito-identity-provider` (Lambda)

### 3. Amazon API Gateway
- **Role**: Managed REST API layer between the frontend and Lambda functions.
- **How it is used**:
  - Exposes a single **REST API** with resource paths for each domain (`/contacts`, `/leads`, `/deals`, `/activities`, `/dashboard`, `/reports`, `/team`).
  - Each resource is backed by a Lambda **proxy integration** — API Gateway passes the full HTTP event to Lambda and returns whatever Lambda responds with.
  - **CORS** is configured on all routes; preflight `OPTIONS` requests are handled inside every Lambda with the `CORS_HEADERS` helper.
  - The base URL is injected into the frontend at build time via the `VITE_API_URL` environment variable.

### 4. AWS Lambda
- **Role**: Serverless compute — all backend business logic.
- **How it is used**: Seven independent Lambda functions (Node.js ESM), one per domain:

| Function | File | Routes handled |
|---|---|---|
| **contacts** | `lambda/contacts/index.mjs` | `GET /contacts`, `POST /contacts`, `GET /contacts/{id}`, `PUT /contacts/{id}`, `DELETE /contacts/{id}`, `GET /contacts/{id}/deals`, `GET /contacts/{id}/activities` |
| **leads** | `lambda/leads/index.mjs` | `GET /leads`, `POST /leads`, `PUT /leads/{id}`, `DELETE /leads/{id}`, `POST /leads/{id}/convert` |
| **deals** | `lambda/deals/index.mjs` | `GET /deals`, `POST /deals`, `PUT /deals/{id}`, `DELETE /deals/{id}`, `GET /deals/{id}/activities`, `GET /deals/{id}/history` |
| **activities** | `lambda/activities/index.mjs` | `GET /activities`, `POST /activities`, `PUT /activities/{id}`, `DELETE /activities/{id}` |
| **dashboard** | `lambda/dashboard/index.mjs` | `GET /dashboard/stats` |
| **reports** | `lambda/reports/index.mjs` | `GET /reports/summary` |
| **team** | `lambda/team/index.mjs` | `GET /team`, `PUT /team/{username}` |

- Each function uses a **singleton `pg.Pool`** (shared across warm invocations) for efficient RDS connections.
- Shared helpers live in `lambda/shared/`: `auth.mjs` (JWT verification + response builder), `db.mjs` (RDS pool), `email.mjs` (SES client + templates).

### 5. Amazon RDS (PostgreSQL)
- **Role**: Primary relational data store.
- **How it is used**:
  - An **RDS PostgreSQL** instance (or Aurora PostgreSQL) holds all CRM data across five tables: `contacts`, `leads`, `deals`, `activities`, and `deal_stage_history`.
  - Schema is defined in `aws-schema.sql` and seed data in `aws_seed_data.sql`.
  - Lambda connects using the `pg` (node-postgres) library with SSL enabled (`RDS_SSL=true`).
  - Connection parameters are stored as **Lambda environment variables** (`RDS_HOST`, `RDS_PORT`, `RDS_DATABASE`, `RDS_USER`, `RDS_PASSWORD`).
  - Every query filters by `user_id` (the Cognito `sub`) to enforce row-level data isolation — admins bypass this filter to see all rows.
  - UUIDs are generated in the database using `gen_random_uuid()` (from the `pgcrypto` extension).

### 6. Amazon SES (Simple Email Service)
- **Role**: Transactional email notifications.
- **How it is used**:
  - Lambda functions send emails asynchronously (non-blocking, errors are swallowed so they never break an API response).
  - Three canned email templates are defined in `lambda/shared/email.mjs`:
    - **New Lead notification** — sent to `NOTIFY_EMAIL` when a lead is created.
    - **Deal stage change notification** — sent to `NOTIFY_EMAIL` when a deal moves to a new stage (e.g., "Won 🎉", "Lost 😞").
    - **Task assigned to contact** — sent to the linked contact's email when a new activity is created or a deal triggers an auto-follow-up.
  - Uses `@aws-sdk/client-ses` (`SESClient` + `SendEmailCommand`).
  - The sender address is configured via the `SES_FROM_EMAIL` environment variable (must be a verified SES identity).
- **SDK package**: `@aws-sdk/client-ses`

---

## Features

### Authentication
- **Sign Up** with email + password. Cognito sends an email with a 6-digit confirmation code.
- **Email Verification** — users enter the code to activate their account.
- **Sign In / Sign Out** with persistent sessions (Cognito tokens are refreshed automatically by the Amplify SDK).
- **Role assignment** at sign-up (`admin` or `sales_rep`); defaults to `sales_rep`.
- **Protected Routes** — all pages except Login and Signup require an active Cognito session.

### Dashboard
- **KPI stat cards**: Total Contacts, Total Leads, Open Deals, Deals Won This Month, Pending Activities — fetched in a single API call that fans out to 7 parallel RDS queries.
- **Recent Activities** panel — the 5 most recently created activities with type badges and linked contact names.
- **Overdue Deals** panel — open deals whose expected close date has passed, sorted soonest first.
- Skeleton loading states while data is fetched; inline error state with a retry button.

### Contacts
- **List all contacts** (admins see everyone; sales reps see only their own).
- **Create / Edit / Delete** contacts with fields: first name, last name, email, phone, company name, notes.
- **Contact Detail** view — shows the contact's metadata, all linked Deals, and all linked Activities in one page.
- Input validation (first name and last name are required).

### Leads
- **List, Create, Edit, Delete** leads.
- Fields: name, email, source (Website / Referral / Cold Call / Social / Other), status, assigned-to, notes.
- **Lead statuses**: `New` → `Contacted` → `Qualified` → `Dropped`.
- **Convert Lead to Contact** — one-click conversion: creates a Contact record from the lead's data, marks the lead as `Qualified`, and returns the new contact.
- **Email notification** — SES fires a "New Lead" email to `NOTIFY_EMAIL` whenever a lead is created.

### Deals Pipeline
- **Kanban board** with six columns: `Lead`, `Contacted`, `Proposal Sent`, `Negotiation`, `Won`, `Lost`.
- **Drag-and-drop** using `@dnd-kit/core` — drag a deal card between columns to change its stage.
- **Deal cards** show title, value, linked contact name, and expected close date.
- **Stage history** — every stage transition is recorded in the `deal_stage_history` table and is viewable per deal.
- **Auto follow-up activities** — moving a deal to `Proposal Sent`, `Negotiation`, or `Won` automatically creates a follow-up Activity (e.g., "Negotiation call" due in 2 days).
- **Email notifications** — SES sends a deal stage change email on every stage transition; the linked contact also receives a task-assigned email when an auto-activity is created.
- Create / Edit deal modal: title, value, stage, linked contact, expected close date, notes.

### Activities
- **List all activities** with joins to contact name and deal title.
- **Activity types**: `Call`, `Email`, `Meeting`, `Note`.
- **Create / Edit / Delete** activities; link each to a contact and/or a deal.
- **Mark done / pending** toggle.
- **Email notification** — when an activity is linked to a contact, SES sends a "task assigned" email to that contact.
- Due-date tracking with colour-coded overdue indicators.

### Reports
All charts are rendered using **Recharts** and update in real time from a single `/reports/summary` API call:
- **Deals by Stage** — horizontal bar chart showing count and total value per stage.
- **Revenue by Month** — line chart of won-deal revenue over the last 12 months.
- **Leads by Status** — pie chart of lead counts per status.
- **Activities by Type** — stacked bar chart showing done vs pending per activity type.
- **Conversion Rate** — percentage of leads that reached `Qualified` status.

### Team Management *(Admin only)*
- **List all Cognito users** with their email, role, account status, and creation date.
- **Promote / Demote** any user between `admin` and `sales_rep` — updates the Cognito `custom:role` attribute live.
- The Team page is hidden from `sales_rep` users entirely.

### General UX
- Responsive layout with a collapsible sidebar (`Layout.jsx`).
- Toast notifications for all success and error events (`react-hot-toast`).
- Skeleton screens during loading; rich error states with retry actions.
- **CSV Export** utility (`src/lib/csv.js`) for data downloads.

---

## Project Structure

```
Cloud_CRM/
├── amplify.yml                  # AWS Amplify CI/CD build spec
├── aws-schema.sql               # RDS PostgreSQL schema
├── aws_seed_data.sql            # Sample seed data for RDS
├── package.json                 # Frontend dependencies
├── vite.config.js               # Vite build configuration
├── tailwind.config.js           # Tailwind CSS config
│
├── lambda/                      # Backend — AWS Lambda functions (Node.js ESM)
│   ├── package.json             # Lambda-only dependencies (pg, aws-jwt-verify, @aws-sdk/*)
│   ├── shared/
│   │   ├── auth.mjs             # JWT verifier (aws-jwt-verify) + respond() helper + CORS headers
│   │   ├── db.mjs               # Singleton pg.Pool for RDS connections
│   │   └── email.mjs            # SES client + email templates (new lead, stage change, task assigned)
│   ├── contacts/index.mjs       # Contacts CRUD Lambda
│   ├── leads/index.mjs          # Leads CRUD + convert Lambda
│   ├── deals/index.mjs          # Deals CRUD + stage history + auto-activities Lambda
│   ├── activities/index.mjs     # Activities CRUD Lambda
│   ├── dashboard/index.mjs      # Dashboard stats Lambda (7 parallel queries)
│   ├── reports/index.mjs        # Reporting aggregates Lambda (5 parallel queries)
│   └── team/index.mjs           # Team management Lambda (Cognito admin APIs)
│
└── src/                         # Frontend — React SPA
    ├── main.jsx                 # App entry point; imports awsConfig.js
    ├── App.jsx                  # Router setup
    ├── lib/
    │   ├── awsConfig.js         # Amplify.configure() with Cognito User Pool settings
    │   ├── api.js               # HTTP client (fetch wrapper with Cognito Bearer token)
    │   └── csv.js               # CSV export utility
    ├── contexts/
    │   └── AuthContext.jsx      # Cognito auth state (signIn, signUp, confirmSignUp, signOut, role)
    ├── components/
    │   ├── Layout.jsx           # App shell with sidebar navigation
    │   ├── ProtectedRoute.jsx   # Redirects unauthenticated users to /login
    │   ├── Modal.jsx            # Reusable modal dialog
    │   ├── Button.jsx           # Reusable button component
    │   ├── Skeleton.jsx         # Loading skeleton screens
    │   └── ErrorState.jsx       # Error display with retry action
    └── pages/
        ├── Login.jsx            # Sign-in page
        ├── Signup.jsx           # Registration + email verification page
        ├── Dashboard.jsx        # KPI overview
        ├── Contacts.jsx         # Contacts list + CRUD
        ├── ContactDetail.jsx    # Single contact with linked deals & activities
        ├── Leads.jsx            # Leads list + CRUD + convert
        ├── Pipeline.jsx         # Kanban drag-and-drop deals board
        ├── Activities.jsx       # Activities list + CRUD
        ├── Reports.jsx          # Charts and analytics
        └── Team.jsx             # Admin user management
```

---

## Database Schema

All tables live in Amazon RDS PostgreSQL. UUIDs are generated by `gen_random_uuid()` (requires the `pgcrypto` extension). The `user_id` column stores the Cognito `sub` (a globally unique string); row-level isolation is enforced in every Lambda query.

### contacts
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `user_id` | TEXT | Cognito sub — owner of this record |
| `first_name` | TEXT | Required |
| `last_name` | TEXT | Required |
| `email` | TEXT | Optional |
| `phone` | TEXT | Optional |
| `company_name` | TEXT | Optional |
| `notes` | TEXT | Optional |
| `created_at` | TIMESTAMPTZ | Defaults to `NOW()` |

### leads
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | TEXT | |
| `name` | TEXT | Required |
| `email` | TEXT | |
| `source` | TEXT | Default `'Website'` |
| `status` | TEXT | `New` / `Contacted` / `Qualified` / `Dropped` |
| `assigned_to` | TEXT | Free-text name |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

### deals
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | TEXT | |
| `contact_id` | UUID FK | → `contacts.id` ON DELETE SET NULL |
| `title` | TEXT | Required |
| `value` | NUMERIC(12,2) | Default `0` |
| `stage` | TEXT | `Lead` / `Contacted` / `Proposal Sent` / `Negotiation` / `Won` / `Lost` |
| `expected_close_date` | DATE | |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

### activities
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | TEXT | |
| `contact_id` | UUID FK | → `contacts.id` ON DELETE SET NULL |
| `deal_id` | UUID FK | → `deals.id` ON DELETE SET NULL |
| `type` | TEXT | `Call` / `Email` / `Meeting` / `Note` |
| `title` | TEXT | Required |
| `description` | TEXT | |
| `due_date` | TIMESTAMPTZ | |
| `done` | BOOLEAN | Default `false` |
| `created_at` | TIMESTAMPTZ | |

### deal_stage_history
Automatically populated whenever a deal's `stage` changes via `PUT /deals/{id}`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `deal_id` | UUID FK | → `deals.id` |
| `from_stage` | TEXT | Previous stage |
| `to_stage` | TEXT | New stage |
| `user_id` | TEXT | Who made the change |
| `changed_at` | TIMESTAMPTZ | Defaults to `NOW()` |

---

## API Reference

All endpoints require `Authorization: Bearer <CognitoIdToken>` except `OPTIONS` (preflight).

### Contacts — `/contacts`
| Method | Path | Description |
|---|---|---|
| GET | `/contacts` | List all contacts (role-filtered) |
| POST | `/contacts` | Create a contact |
| GET | `/contacts/{id}` | Get a single contact |
| PUT | `/contacts/{id}` | Update a contact |
| DELETE | `/contacts/{id}` | Delete a contact |
| GET | `/contacts/{id}/deals` | List deals linked to a contact |
| GET | `/contacts/{id}/activities` | List activities linked to a contact |

### Leads — `/leads`
| Method | Path | Description |
|---|---|---|
| GET | `/leads` | List all leads (role-filtered) |
| POST | `/leads` | Create a lead (triggers SES notification) |
| PUT | `/leads/{id}` | Update a lead |
| DELETE | `/leads/{id}` | Delete a lead |
| POST | `/leads/{id}/convert` | Convert lead → contact; marks lead as Qualified |

### Deals — `/deals`
| Method | Path | Description |
|---|---|---|
| GET | `/deals` | List all deals with joined contact name |
| POST | `/deals` | Create a deal |
| PUT | `/deals/{id}` | Update a deal; records stage history; creates auto-activity; sends SES email |
| DELETE | `/deals/{id}` | Delete a deal |
| GET | `/deals/{id}/activities` | List activities linked to a deal |
| GET | `/deals/{id}/history` | List stage change history for a deal |

### Activities — `/activities`
| Method | Path | Description |
|---|---|---|
| GET | `/activities` | List all activities with joined contact name and deal title |
| POST | `/activities` | Create an activity (sends SES task-assigned email if contact has email) |
| PUT | `/activities/{id}` | Update an activity |
| DELETE | `/activities/{id}` | Delete an activity |

### Dashboard — `/dashboard`
| Method | Path | Description |
|---|---|---|
| GET | `/dashboard/stats` | Returns all KPI stats, recent activities, and overdue deals in one call |

### Reports — `/reports`
| Method | Path | Description |
|---|---|---|
| GET | `/reports/summary` | Returns deals by stage, revenue by month, leads by status, activities by type, conversion rate |

### Team — `/team` *(admin only)*
| Method | Path | Description |
|---|---|---|
| GET | `/team` | List all Cognito users with role and status |
| PUT | `/team/{username}` | Update a user's `custom:role` in Cognito |

---

## Role-Based Access Control

| Capability | `sales_rep` | `admin` |
|---|---|---|
| View / manage own contacts, leads, deals, activities | ✅ | ✅ |
| View / manage ALL users' data | ❌ | ✅ |
| Access Team management page | ❌ | ✅ |
| Change another user's role | ❌ | ✅ |

Roles are stored as the Cognito custom attribute `custom:role` and are embedded in the ID token claims. Lambda reads the claim on every request after verifying the JWT — no separate permissions database is needed.

---

## Environment Variables

### Frontend (`.env` / Amplify console environment variables)
| Variable | Description |
|---|---|
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID (e.g. `us-east-1_XXXXXXXXX`) |
| `VITE_COGNITO_CLIENT_ID` | Cognito App Client ID |
| `VITE_API_URL` | API Gateway invoke URL (e.g. `https://xxxx.execute-api.us-east-1.amazonaws.com/prod`) |

### Lambda (set in each function's configuration or via a shared Lambda layer / Secrets Manager)
| Variable | Description |
|---|---|
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID (for JWT verification) |
| `COGNITO_CLIENT_ID` | Cognito App Client ID |
| `RDS_HOST` | RDS instance endpoint |
| `RDS_PORT` | RDS port (default `5432`) |
| `RDS_DATABASE` | Database name |
| `RDS_USER` | Database username |
| `RDS_PASSWORD` | Database password |
| `RDS_SSL` | Set to `true` to enable SSL for RDS connections |
| `CORS_ORIGIN` | Allowed CORS origin (your Amplify / CloudFront URL) |
| `NOTIFY_EMAIL` | Recipient address for admin email notifications (new leads, deal changes) |
| `SES_FROM_EMAIL` | Verified SES sender address (e.g. `noreply@yourdomain.com`) |
| `AWS_REGION` | AWS region (e.g. `us-east-1`); automatically set by Lambda runtime |

---

## Local Development

### Prerequisites
- Node.js 20+
- A running PostgreSQL instance (local or RDS)
- AWS credentials configured (`aws configure`) for SES and Cognito SDK calls

### 1. Install frontend dependencies
```bash
npm install
```

### 2. Configure environment variables
Create a `.env` file in the project root:
```env
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=your_client_id
VITE_API_URL=https://xxxx.execute-api.us-east-1.amazonaws.com/prod
```

### 3. Set up the database
```bash
psql -h <host> -U <user> -d <database> -f aws-schema.sql
psql -h <host> -U <user> -d <database> -f aws_seed_data.sql
```

### 4. Install Lambda dependencies
```bash
cd lambda && npm install
```

### 5. Start the frontend dev server
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

---

## Deployment

### Frontend — AWS Amplify Hosting
1. Push the repository to GitHub / GitLab / Bitbucket.
2. In the AWS Amplify console, connect the repository and select the branch to deploy.
3. Amplify uses `amplify.yml` to run `npm ci` then `npm run build`, and serves the `dist/` folder.
4. Set the three `VITE_*` environment variables in the Amplify console under **App settings → Environment variables**.

### Backend — Lambda + API Gateway
1. Zip each Lambda function folder together with its `node_modules` (or use Lambda layers).
2. Upload to the corresponding Lambda function in the AWS console or via AWS SAM / CDK.
3. Set all Lambda environment variables in each function's configuration.
4. Ensure each Lambda's execution role has the following IAM permissions:
   - `rds-db:connect` (if using RDS IAM auth) or VPC access to the RDS subnet
   - `ses:SendEmail` on the `SES_FROM_EMAIL` identity
   - `cognito-idp:ListUsers` and `cognito-idp:AdminUpdateUserAttributes` (team Lambda only)

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| Vite | 5 | Build tool and dev server |
| Tailwind CSS | 3 | Utility-first styling |
| React Router | 7 | Client-side routing |
| aws-amplify | 6 | Cognito Auth SDK |
| @dnd-kit/core | 6 | Drag-and-drop for Kanban board |
| Recharts | 3 | Charts and data visualisation |
| react-hot-toast | 2 | Toast notifications |
| date-fns | 4 | Date formatting |

### Backend (Lambda)
| Technology | Purpose |
|---|---|
| Node.js (ESM) | Lambda runtime |
| pg (node-postgres) | RDS PostgreSQL client |
| aws-jwt-verify | Cognito JWT verification |
| @aws-sdk/client-ses | Amazon SES email sending |
| @aws-sdk/client-cognito-identity-provider | Cognito user management (team Lambda) |
