# One-time setup

Three things need manual configuration after the first deploy: Google sign-in, redirect URLs, and LINE reminders.
Do them in order. Step 2 needs the app URLs and step 1 needs one URL from Supabase.

Reference values for this project:

| Item | Value |
|---|---|
| Production URL | `https://home-management-two-theta.vercel.app` |
| Preview URL pattern | `https://home-management-*-paeybus-projects.vercel.app` |
| Supabase project ref | `xnrxlglgdxgylkjcikou` |
| Supabase OAuth callback | `https://xnrxlglgdxgylkjcikou.supabase.co/auth/v1/callback` |
| Supabase dashboard | https://supabase.com/dashboard/project/xnrxlglgdxgylkjcikou |

---

## 1. Google sign-in

### Google Cloud

1. Open https://console.cloud.google.com and create a project (e.g. "Home Management").
2. **Google Auth Platform → Branding** (older UI: APIs & Services → OAuth consent screen).
   Fill app name, support email, developer email. User type **External**.
3. **Audience**: keep the app in *Testing* and add each family Google account as a test user.
   This avoids Google's app verification and is enough for a private app.
4. **Clients → Create client**, type **Web application**:
   - Authorized JavaScript origins:
     `https://home-management-two-theta.vercel.app` and `http://localhost:3000`
   - Authorized redirect URIs:
     `https://xnrxlglgdxgylkjcikou.supabase.co/auth/v1/callback`
5. Create, then copy the **Client ID** and **Client secret**.

### Supabase

6. Open the Supabase dashboard (link above, or Vercel → project → Integrations → Supabase → *Open in Supabase*).
7. **Authentication → Sign In / Providers → Google**: enable, paste Client ID and Client secret, save.
   Leave *Skip nonce check* off.

---

## 2. Redirect URLs

Supabase → **Authentication → URL Configuration**:

1. **Site URL**: `https://home-management-two-theta.vercel.app`
2. **Redirect URLs**, add all three:
   ```
   https://home-management-two-theta.vercel.app/auth/callback
   https://home-management-*-paeybus-projects.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```
   The wildcard covers preview deployments. The app sends its own origin + `/auth/callback`
   as the redirect target; Supabase rejects anything not on this list.

### Test

```bash
bun dev
```
Open http://localhost:3000 and click **Continue with Google**.

If you see *"This Google account isn't on the allowlist"*, sign-in worked but the email is not in
`public.allowed_emails`. Only listed emails can get in. Add it (must be lower-case):

```sql
-- Supabase → SQL Editor
insert into public.allowed_emails (email, household_id)
select lower('you@gmail.com'), id from public.households where name = 'Home';
```

Or from the terminal, using the connection string already in `.env.local`:

```bash
set -a; source .env.local; set +a
psql "$POSTGRES_URL_NON_POOLING" -c "insert into public.allowed_emails (email, household_id) select lower('you@gmail.com'), id from public.households where name = 'Home';"
```

Then sign in again. The callback deletes rejected auth users, so a retry starts clean.
The first account to sign in becomes `owner`; later ones become `member` (identical access in v1).

To list who is allowed: `select email from public.allowed_emails;`

---

## 3. LINE reminders

A daily digest of overdue and due-in-3-days tasks is pushed to a LINE group by Vercel Cron
(`/api/cron/line-digest`, 01:00 UTC = 08:00 Asia/Bangkok).

LINE changed the flow in 2024: you create a LINE Official Account first, then enable the Messaging API on it.

### Create the bot

1. Go to https://manager.line.biz and create a **LINE Official Account** (free plan). Log in with your personal LINE account.
2. Official Account Manager → **Settings → Messaging API → Enable Messaging API**.
   Create or pick a provider (any name). This creates the Messaging API channel.
3. Turn **Allow bot to join group chats** on. It is off by default and the bot cannot be added to a group otherwise.
4. **Response settings**: disable auto-reply and greeting messages so the bot stays silent in the group.

### Get the access token

5. Open https://developers.line.biz/console → provider → channel → **Messaging API** tab.
6. At the bottom: **Channel access token (long-lived) → Issue**. Copy it. This is `LINE_CHANNEL_ACCESS_TOKEN`.

### Get the group ID

The group ID is only exposed through a webhook event, so use a temporary receiver.

7. Open https://webhook.site and copy the unique URL it shows.
8. In the Messaging API tab set **Webhook URL** to that address, click *Verify*, turn **Use webhook** on.
9. In the LINE app, create the family group (or use an existing one) and add the bot as a member.
   Add it like a friend by searching the Official Account ID shown in the Messaging API tab, or by scanning its QR code.
10. Send any message in the group. On webhook.site a request appears whose body contains:
    ```json
    "source": { "type": "group", "groupId": "C1234abcd..." }
    ```
    The value starting with `C` is `LINE_GROUP_ID`.
11. Point the webhook at the app (enables the `/task` command, see below):
    set **Webhook URL** to `https://<your-app>/api/line/webhook`, keep **Use webhook** on.
12. **Basic settings** tab → copy **Channel secret**. This is `LINE_CHANNEL_SECRET`.

### Store the values

```bash
vercel env add LINE_CHANNEL_ACCESS_TOKEN production
vercel env add LINE_GROUP_ID production
vercel env add LINE_CHANNEL_SECRET production
vercel env pull
```
Each command prompts for the value. Repeat with `preview` if previews should send too.
Redeploy afterwards; env vars are read at deploy time.

### Verify

In the app: **Settings → Send test digest now**. Or call the cron route directly:

```bash
set -a; source .env.local; set +a
curl -H "Authorization: Bearer $CRON_SECRET" "https://home-management-two-theta.vercel.app/api/cron/line-digest?force=1"
```

`?force=1` bypasses the once-per-day guard in `reminder_log`.

### `/task` command

Type `/task` (or `/tasks`) in the family group and the bot replies with the current digest
(overdue + due in the next 3 days). It only answers in `LINE_GROUP_ID`. Click *Verify* on the
Webhook URL in the LINE console after deploying; it should succeed.

Free Official Account plan limit: 200 push messages per month. One digest per day, only on days something is due, stays well under that.

---

## 4. Deploy to production

```bash
vercel deploy --prod
```
