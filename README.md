# AdCoach

Facebook ads for people who don’t know Facebook ads. You type what you want in plain English — spend, who should see it, pause, launch — and AdCoach behaves like a hired media buyer.

## What it does

- **Coach bar** on every screen: “pause the holiday ads,” “$20 a day to people nearby who like coffee,” “don’t spend more than $60 a day.”
- **Campaigns in plain English**, with the Facebook term shown underneath so you can still talk to an agency later.
- **Spend, targeting, goal, placements, and the ad itself** — editable without Ads Manager jargon.
- **Safety cap** across every running ad.
- **Meta-ready**: connect a Facebook ad account. Pause, resume, budget, and campaign drafts can go to the Marketing API. Demo mode works with no credentials.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Connect Facebook (optional)

1. Create a Business type app at [developers.facebook.com/apps](https://developers.facebook.com/apps).
2. Add **Facebook Login** and **Marketing API**.
3. Valid OAuth redirect URI: `http://localhost:3000/api/meta/callback`
4. Copy `.env.example` to `.env.local` and fill in:

```
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=http://localhost:3000/api/meta/callback
```

5. Restart the dev server, then Settings → Connect Facebook.

Meta must review `ads_management` / `ads_read` before the app can manage ads for other people. Your own ad account can be used in development.

## Optional: smarter Coach

Set `OPENAI_API_KEY` in `.env.local` if you want Coach to parse longer, messier requests. Without it, the built-in interpreter still handles create, pause, resume, budget, targeting, goals, placements, spend reports, and “pause what’s not working.”

## Notes

- Coach never deletes ads. It pauses them.
- Large budgets and new campaigns ask for a confirm.
- Creating a full live ad on Facebook still needs a Page (and often a pixel). AdCoach creates a paused campaign draft and tells you what’s left.
