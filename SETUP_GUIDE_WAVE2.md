# SuperLedger — Wave Two Setup Guide (the real backend)

This turns on real accounts, login, and encrypted saving. Follow the steps **in
order**. It's written for a non-coder — every click is spelled out. Budget about
15 minutes.

You'll do four things:
1. Run one SQL script in Supabase (creates the tables)
2. Check two settings in Supabase
3. Deploy the new code (your normal unzip → GitHub Desktop → push)
4. Test that it works

---

## Before you start — confirm your Vercel variables

You already added these. Just confirm the **names** are exactly:

- `NEXT_PUBLIC_SUPABASE_URL`  ✅ (public — fine)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`  ✅ (public — fine)
- `SUPABASE_SERVICE_ROLE_KEY`  ✅ (secret — must NOT have NEXT_PUBLIC)
- `ENCRYPTION_MASTER_KEY`  ✅ (secret — must NOT have NEXT_PUBLIC)

> ⚠️ **Never change `ENCRYPTION_MASTER_KEY` once real users have saved data.**
> The key is what unlocks their encrypted balance/salary/age. If you change it,
> everything already saved becomes permanently unreadable. Treat it like the
> only key to a safe.

---

## Step 1 — Create the database tables

1. Go to **supabase.com** → open your project.
2. In the left sidebar, click **SQL Editor**.
3. Click **+ New query**.
4. Open the file **`supabase_setup.sql`** from this zip, copy **everything** in it,
   and paste it into the query box.
5. Click **Run** (bottom right).
6. You should see **"Success. No rows returned."** That's correct — it means the
   tables were created.
7. Click **Table Editor** in the sidebar. You should now see three tables:
   `private_profile`, `public_alias`, `follows`. Each should say **RLS enabled**.

If you see an error instead, copy the red message and send it to me.

---

## Step 2 — Check two Supabase auth settings

1. In the sidebar, click **Authentication** → **Providers** → **Email**.
   Make sure **Email** is **enabled**. (It is by default.)
2. Still under Authentication, find **Email confirmation** (sometimes under
   "Sign In / Up" settings):
   - **If ON:** new users must click a link in their email before they can log in.
     More secure, slightly more friction.
   - **If OFF:** users are logged in immediately after signing up. Smoother for
     testing.
   - **My suggestion:** leave it **OFF while you test**, then turn it **ON before
     real users arrive**. Either works with the code.
3. Go to **Authentication** → **URL Configuration**. In **Site URL**, put your
   live address: `https://super-ledger-taupe.vercel.app`. This makes the
   confirmation/redirect links point to the right place.

---

## Step 3 — Deploy the code

Same as you always do:
1. Unzip this file.
2. Copy its contents into your SuperLedger folder, letting it overwrite when asked.
   New files this time include a `lib/supabase/` folder, `lib/crypto.ts`,
   `lib/useProfile.ts`, a `middleware.ts`, and an `app/api/` folder — make sure
   those copy across too, not just the changed components.
3. Open **GitHub Desktop** → you'll see the changed/new files → write a summary
   like "Wave two: real auth + encrypted save" → **Commit** → **Push**.
4. Vercel rebuilds automatically. Watch the build log in your Vercel dashboard.
   - **First build after adding the Supabase packages may take a minute longer**
     (it's installing them). That's normal.
   - If the build **fails**, copy the red error text from the Vercel log and send
     it to me. Don't panic — a failed build doesn't break your live site; the
     previous version stays up until a build succeeds.

---

## Step 4 — Test it (do this yourself first, before telling anyone)

1. Open `https://super-ledger-taupe.vercel.app` in a **private/incognito window**
   (so you're not relying on any cached state).
2. You should see the signup page — **no "preview" banner anymore**.
3. Create a test account: a real email you can access, a 10+ character password,
   and any alias.
4. If email confirmation is ON, check your inbox and click the link. If OFF,
   you'll go straight into the tool.
5. In the tool, change your balance and salary, then click **Save my comparison**
   (it also autosaves). You should see **"Saved ✓"**.
6. **The real test:** close the tab, reopen the site, log in with the same account.
   Your saved balance and salary should still be there. If they are — the full
   loop works: encrypted save → store → load → decrypt. 🎉
7. **Verify the encryption is real:** in Supabase → Table Editor → `private_profile`,
   look at your row. The `enc_balance`, `enc_salary`, `enc_age` columns should be
   **base64 gibberish** (e.g. `k8Jd2f...`), NOT your actual numbers. If you can read
   your real balance there in plain digits, something's wrong — tell me immediately.

---

## What is and isn't live after this

**Live and working:** real accounts, login/logout, encrypted save + autosave of
each user's own figures, private-by-default profiles.

**Built but intentionally still OFF until your legal artifacts are published:**
- The **public leaderboard** view. The opt-in plumbing and the suppression rules
  exist, but I have not switched on a public feed page. Per your privacy lawyer,
  the privacy policy, collection notice, and NDB plan must be **live on the site**
  before any user data — even aliased — is shown publicly. Publish those (the
  drafts I gave you, finalised by your lawyer), then tell me and I'll wire the
  leaderboard page on.
- **Referral links.** The directory is a neutral APRA table; no money-earning
  links are attached yet. That's a deliberate, separate step.

**Still your job before public promotion:**
- Finalise + publish the three legal artifacts (privacy policy, APP-5 collection
  notice, NDB breach plan).
- Add links to the privacy policy and collection notice from the signup page (I
  can wire these once you have the URLs/text).

---

## If something goes wrong

- **Build fails on Vercel** → send me the red error text from the build log.
- **"Couldn't save" message in the tool** → usually means you're not logged in,
  or a Supabase setting. Tell me what the Vercel "Functions" log shows.
- **Saved data doesn't reload** → check the `private_profile` table has a row for
  your user, and that the `enc_` columns aren't empty.
- **You can read real numbers in the database** → stop and tell me; the encryption
  env var may not be wired correctly.

Send me whatever you see and I'll diagnose it.
