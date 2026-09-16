# Home Management App — Plan (v1)

Stack: Next.js 16 (App Router), Supabase (Postgres, Auth, Storage), Vercel (hosting, Cron), Tailwind 4, shadcn/ui, Bun.
Decisions made 2026-09-15.

## Core idea
Everything is a task with a completion log. Tasks are recurring or one-off. Next due is computed per task.

## Decisions
| Area        | Decision |
|-------------|----------|
| Auth        | Google sign-in via Supabase Auth. Allowlist of emails; only listed accounts can access. |
| Members     | Single user in v1. Schema keeps `household_id` on every table so members can be added later without migration. |
| Scheduling  | Per task: `rolling` (last completion + interval) or `fixed` (calendar recurrence, e.g. 1st of month). One-off tasks have no interval. |
| Reminders   | LINE Messaging API bot added to a family group. Daily Vercel Cron pushes a digest of overdue + due-in-3-days. |
| Assets      | Basic table: name, brand, model, serial, purchased_at, warranty_until, notes. Tasks may link to one. |
| Costs       | Optional cost per completion. Payments view sums by category and year. |
| Photos      | Optional one photo per completion, Supabase Storage bucket `completions`. |
| Dashboard   | Due list: Overdue, This week, This month, Recently done. One-tap Mark Done. |
| Lifecycle   | `paused` hides from due lists (winter mowing). `archived` keeps history for tasks and assets. |
| UI          | shadcn/ui defaults, mobile first, PWA manifest. |

## Data model
households         id, name, created_by
household_members  household_id, user_id, role (owner|member)          -- v1: only the owner row
allowed_emails     email, household_id                                  -- gate for Google sign-in
categories         id, household_id, name, icon
                   seed: Lawn, HVAC, Plumbing, Electrical, Fees, Insurance, Safety, Cleaning, Other
assets             id, household_id, name, category_id, brand, model, serial, purchased_at, warranty_until,
                   notes, archived_at
tasks              id, household_id, title, category_id, asset_id?, notes,
                   schedule_type (rolling|fixed|once),
                   interval_value?, interval_unit? (day|week|month|year),   -- rolling & fixed
                   fixed_day_of_month?,                                     -- fixed monthly/yearly
                   fixed_month?,                                            -- fixed yearly
                   start_date, estimated_cost?,
                   paused_at, archived_at
task_completions   id, task_id, household_id, completed_at, completed_by, cost?, notes?, photo_path?

## Next due (SQL view `task_due`)
- once:    start_date if no completion, else null (done)
- rolling: coalesce(last completion, start_date) + interval
- fixed:   next calendar occurrence after last completion (or after start_date)
Status: overdue if due < today, due_soon if due <= today + 7, upcoming otherwise. Paused/archived excluded.

## Reminder flow
Vercel Cron 08:00 local -> /api/cron/line-digest (protected by CRON_SECRET)
-> query task_due for overdue + due within 3 days
-> LINE push to LINE_GROUP_ID via Messaging API
-> log to reminder_log to avoid duplicate sends
Env: LINE_CHANNEL_ACCESS_TOKEN, LINE_GROUP_ID, CRON_SECRET

## Screens
/                 dashboard (due list, mark done sheet)
/tasks            list with filters (category, status), create/edit
/tasks/[id]       detail, completion history, photos
/assets           list, create/edit
/assets/[id]      detail, linked tasks
/payments         cost by category, by year
/settings         categories, LINE test send

## Deferred
Member invites & roles, two-way LINE commands ("done mow"), documents/receipts on assets, push notifications,
multiple properties, service provider contacts, import/export.

## Build order
1. Supabase (Vercel Marketplace) + Google OAuth + email allowlist + schema + RLS + household bootstrap
2. Tasks CRUD, mark done (with cost + photo), task_due view, dashboard
3. Assets + payments view
4. LINE bot + cron digest
5. PWA manifest, pause/archive polish
