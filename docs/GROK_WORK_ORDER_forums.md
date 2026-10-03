# WORK ORDER — SVN Proving Grounds live as "Forums" on ammoncovino.com

**To:** Grok Bot (Chief of Staff, deploys)
**From:** Claude (SVN build steward)
**Owner / rulings:** Ammon Covino. Ammon rules; stewards recommend.
**Date:** 3 October 2026

---

## What Ammon asked for

Put SVN (the Symbiotic Value Network, repo `ammoncovino/SVN`) live, hosted under ammoncovino.com, reachable from a **Forums** tab on the site. It must be a *safe* forum: Ammon's ruling is that no bots are allowed anywhere votes or actions happen, and a human identity check is required per session before anyone can act.

## The split

**Claude: done, merged to `main` in `ammoncovino/SVN`:**
- Plants 11–20 added (`docs/seed-plants/plants-11-20.md`), next to plants 1–10.
- A fresh database now seeds the live Proving Grounds with the **20 real, research-backed plants** under one account, `svn_stewards`. The old fictional demo users and plants only load when `SVN_DEMO_SEED=true` (local development only, never in production).
- **Read-only mode:** with `SVN_READ_ONLY=true`, anyone can read every plant, but planting, joining, consuming and evaluating are refused with a plain message. This is required: the prototype has no login, and any visitor can switch to any user, so an open launch would let bots and impersonators act.
- The database location is set by `SVN_DB_PATH`, so it can live on a persistent volume.
- Tested: the production build serves all 20 plants, POST requests return 403 in read-only mode, and 23/23 tests pass.

**Grok: deploy and wire the tab (this order):**

### 1. Deploy SVN on Railway
Kevin or Gabe holds Railway access, so route through them if needed.
- New service from GitHub repo `ammoncovino/SVN`, branch `main`.
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Attach a volume mounted at `/data`.
- Environment variables:
  - `NODE_ENV=production`
  - `SVN_READ_ONLY=true`
  - `SVN_DB_PATH=/data/svn.db`
  - Do **not** set `SVN_DEMO_SEED`.
  - `OPENAI_API_KEY` is optional. Without it, scoring uses the built-in heuristic.
- Railway sets `PORT` itself. The app reads it.

### 2. Domain
- Point **forums.ammoncovino.com** at the Railway service: add the custom domain in Railway, then the CNAME record at the DNS host.

### 3. Forums tab on the website
- In the ammoncovino.com site repo, add **Forums** to the main navigation on every page, linking to `https://forums.ammoncovino.com`.
- site-steward owns site content and wording. Any copy beyond the word "Forums" goes to site-steward or Ammon first.

### 4. Verify before reporting done
- [ ] `https://forums.ammoncovino.com/api/config` returns `{"readOnly":true}`
- [ ] The Proving Grounds page shows 20 plants, starting with "How Judges Get Their Power"
- [ ] Trying to plant shows the read-only message (no new plant appears)
- [ ] The Forums tab appears on every page of ammoncovino.com and opens the forum
- [ ] The database survives a redeploy (still 20 plants, not 40, and not empty)

### 5. Report back
File the live URL, the checklist results, and screenshots to the QUESTIONS folder as `A_` answering this order. Report from the **live site**, not from the repo.

## Out of scope: do not do

- Do not turn off read-only mode. Interaction opens only after Phase 2.
- Do not enable the demo seed in production.
- Do not change auth, energy rules, or scoring.

## Phase 2 (separate order, coming from Claude)

Per-session human verification (one verified human per action, no bots), then interaction turns on. Claude writes the spec. Ammon rules on the verification method before any build.
