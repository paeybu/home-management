# Home Management

Recurring home maintenance tasks, assets and costs. Plan: [`docs/PLAN.md`](docs/PLAN.md).

Stack: Next.js 16 (App Router) · Supabase (Postgres, Auth, Storage via Vercel Marketplace) · Vercel (hosting, Cron) · Tailwind 4 · shadcn/ui · Bun.

## Local development

```bash
bun install
vercel env pull          # writes .env.local (Supabase keys, CRON_SECRET)
bun dev
```

## One-time setup

Google sign-in, redirect URLs and LINE reminders need manual dashboard configuration.
Follow [`docs/SETUP.md`](docs/SETUP.md) step by step.

## Database

Migrations live in `supabase/migrations/` and were applied with `psql "$POSTGRES_URL_NON_POOLING" -f <file>`.
Key objects: tables per `docs/PLAN.md`, view `task_due` (security invoker) computing next due date and status, storage bucket `completions`, RLS on every table keyed by `household_members`.
