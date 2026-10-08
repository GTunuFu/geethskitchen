# Geeth's Kitchen 🍝

A two-person dinner & lunch menu app. The chef sends menus, she picks what she's craving (or requests something else / sends a recipe), and she rates everything so the chef learns what she loves.

- **`/chef`** is the chef app ("GK Chef" on the home screen)
- **`/her`** is her app ("Geeth's Kitchen" on the home screen)

Built with Next.js + Postgres. Push notifications use standard Web Push, which works on iPhone (iOS 16.4+) when the site is added to the Home Screen.

---

## Deploy (about 10 minutes, all free)

1. **Import the repo.** On [vercel.com](https://vercel.com): **Add New → Project** → import `geethskitchen` → **Deploy**. The first deploy will load, but it can't log anyone in until steps 2–3 are done.
2. **Add a database.** In the project: **Storage → Create Database → Neon (Serverless Postgres)** → Free plan → **Connect** to this project. This adds `DATABASE_URL` automatically. The tables create themselves on first use.
3. **Set your PINs.** **Settings → Environment Variables**, add:

   | Name | Example | What it is |
   |---|---|---|
   | `CHEF_PIN` | `4821` | 4-digit PIN for the chef app |
   | `HER_PIN` | `1914` | 4-digit PIN for her app |
   | `HER_NAME` | `Priya` | Her name or nickname, shown all over her app |

4. **Redeploy.** **Deployments → ⋯ → Redeploy** so the new variables take effect.

Push notification keys are generated automatically on first run and stored in the database, so there's nothing else to configure.

## Install on iPhone

**Her phone:**
1. Open `https://<your-project>.vercel.app/her` in **Safari**.
2. Tap **Share → Add to Home Screen → Add**.
3. Open **Geeth's Kitchen** from the home screen and log in with `HER_PIN`.
4. Tap **Allow notifications** on the yellow card. (iPhone only allows this from the home-screen app, not from Safari.)

**Your phone:** same steps with `/chef` → it installs as **GK Chef**.

Use the "Send me a test ping" button to check notifications work.

## How it works

| Chef | Her |
|---|---|
| Add dishes (photo, cuisine, flavor tags) | Gets a push: "DINNER MENU JUST DROPPED" |
| **Ask about lunch / dinner**: pick 2–4 options, send | Taps the one she's craving → chef gets a push |
| Gets her request / recipe in the **Inbox** | …or "None of these": request a cuisine, something specific, or send a recipe (link, pasted text or photo) |
| Tap **Served! Ask for a rating** | Gets a push → rates the dish ⭐, flavors she loved / didn't, rates the chef, leaves a note |
| **Ratings** tab: chef score, flavor report, hall of fame, reviews wall | **Diary** of everything she's rated |

Dishes cooked 2+ times get a **REGULAR** badge, and every dish shows its average rating. The flavor report averages her ratings across every dish tagged with that flavor, plus her explicit "loved"/"not into" picks.

## Local dev

```bash
npm install
echo "DATABASE_URL=postgres://user:pass@localhost:5432/kitchen" > .env.local
npm run dev   # PINs default to 1111 (chef) / 2222 (her) in dev
```

## Swapping the bobbleheads

The heads are transparent PNGs in `public/heads/` (`geeth.png`, `her.png`). The chef hats, springs and bodies are drawn in code in `components/Bobbleheads.tsx`. Tap a head and it bobbles.
