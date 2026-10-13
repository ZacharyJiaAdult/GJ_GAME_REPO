# Quiltopia

A free online world that everyone builds together, a few patches a day, and that nobody can wreck. Built from [the design doc](<Quiltopia — Game Design Document.md>): the prototype from its checklist, plus most of Phase 2. The question it has to answer first is whether players recruit each other to finish a Wonder without being asked.

## Play it now

Double-click `index.html`. With no server set up you get a **demo world** that lives in your browser: three Neighborhoods with 96 simulated neighbors, a river, a pond, the Great Treehouse about 85% built and the Grand Fountain gathering founders. Neighbors keep building while the page is open.

- `index.html?player=2` in a second tab is a second player in the same world, with live updates between the tabs.
- `index.html?sim=off` stops the simulated neighbors.
- **Settings → Start the demo world over** erases it and starts fresh.

## The first minute

No sign-up form. A new player lands on the whole quilt ("This bit is yours"), flies into their own home and finds five glowing spots: the welcome kit. Each tap stitches a patch instantly, with "+10 XP" floating up. After the house, a Stitchling moves in and waves until you tap it. That puts it in your Stitchbook and tells you what it needs. Finishing the kit sets off confetti and Level 2, then you pick a name from word lists. Next, one tap puts your patch on the Great Treehouse, with your name on its plaque. After that comes an optional nation, then the daily rewards.

## What's in it

| Area | What players get |
|---|---|
| Building | 17 patch kinds that shape themselves to their neighbors: houses merge, gardens become fields, trees become forests, water joins into rivers, paths become bridges. Plus parks, markets, lanterns, three rare landmarks and six home decorations. |
| The daily allowance | 3 picks and 2 surprises a day (`periodMinutes` in `js/config.js`; set it to 60 for hourly test sessions). Unused patches carry over up to 15. Watering neighbors' gardens earns up to 3 more. At home a patch stitches at once; anywhere else it bastes for 10 seconds so you can undo. |
| Stitchlings | One moves into every two house squares, wanders the paths and naps on benches. Each needs food (a garden), fun (a park or fountain), a path at the door, and paths that reach a neighbor's home within 30 squares, so they can visit (and they do: down the lanes to say hi, then home again). Building those paths together is the reason to talk to the people next door. Your own show what they wish for in a thought bubble, the tray marks the patch that grants it, and a granted wish pays 15 XP (a home with all four is "very cozy": 10 Buttons). Each Block gets a Cozy score from how happy they are. Ten rare species turn up only around particular builds (a Firefly where water, a tree and a lantern meet, a Mossling deep in a forest of 9, and so on). The Stitchbook has three pages, each paying a reward when it's complete. |
| Progress | Builder levels from XP, with Buttons on every level-up. The Button Shop opens at Level 3, founding Wonders at Level 5, and new roof styles at Levels 6 to 8. A 7-day calendar pauses rather than resets. There are 3 daily goals, each with a Go button that takes you straight to it (the nearest thirsty garden with its Water button, a neighbor's guest book, a Block you've never seen, an open square beside a neighbor). Pips on the calendar button show the day's progress, each goal done rises from the dock with its Buttons, and the welcome-back card lists what's left. Plus outfits for your Stitchlings. |
| Your quilt square | Every home is a square of fabric, so a Neighborhood looks like a patchwork quilt. Six everyday fabrics to switch between any time, two more at Levels 4 and 9, and four in the Button Shop (80 to 150 Buttons). |
| Wonders | Typed slots, 3 per player per hour, and invite links that land a friend on a matching slot. When a Wonder finishes, everyone online gets a show: a gold thread stitches all the way around it, fireworks and music, then its own Stitchling steps out for the first time. Builders always see it (placing stops for it, and level-ups wait until it's over). Every builder gets 200 XP, 50 Buttons, that Stitchling, and their name on the plaque. The plaque is a postcard (1080 by 1350) of the finished Wonder with the builders' names, yours first: phones share the picture itself, and elsewhere it saves and the news is copied. Level 5 builders can found a new Wonder on a Commons lot (4 blueprints); anyone can sign as a founder, and building opens at 10. There's always a next Wonder: when every one is finished, the town proposes another (the blueprint built least so far, on the first free Commons lot) for anyone to sign. A finished Wonder's plaque points to whatever is next, one tap away, and "Help build" with nothing going up opens the Wonder gathering founders. |
| Kindness | Stickers on homes and Wonders (one per target per day), a guest book, one gift a day to a friend or neighbor, friends (automatic through invites), friend arrows, and a "while you were away" feed. |
| Growth | When every home is taken, the quilt grows a new Block, landscape and all. Every fourth new Block is a Commons. |
| And | Nations Cup (points per active builder, top three celebrated, can be switched off), a time-lapse replay you can record, day and night by your clock, Report with preset reasons, and moderator tools. |

**Safety:** names come only from word lists, every piece of text is preset (there's no free typing), and nothing anyone builds can be removed by another player. Online players can delete their account in Settings; the [Privacy](privacy.html) and [Terms](terms.html) pages explain what that removes.

**Paying, fairly:** the design doc's rule is "never building power", and the game keeps to it. Buttons, earned only by playing, buy decorations, outfits and quilt fabrics in the Button Shop. From Level 8 your profile quietly offers **the Quiltopia Club** at $2.99 a month (set in `js/config.js`). It's looks only: a new gold-thread quilt fabric every month to keep, a gold ★ by your name on your home, profile and Wonder plaques, and your name in the season credits. The price is shown up front, there's no paid randomness and no countdowns, and the page says "Under 13? Ask a grown-up". In the demo world, joining is a clearly labeled pretend checkout.

**Not built yet** (later in the doc): Home Blocks for groups, season keepsakes, private worlds and opt-in reward ads, seasons, the Festival and Heirlooms, the daily tour, patch requests, Build Nights and rallies, automatic image scanning, the once-per-season nation switch, and the 3-day wait before new accounts build in the Commons.

## Choices I made for you

- **Tech:** the doc suggests TypeScript, PixiJS and Vite. This PC has no Node.js, so the game is plain JavaScript and Canvas, with no build step and nothing to install. The rules (`js/rules.js`, `js/stitchlings.js`), servers and drawing code are kept apart, so moving to TypeScript and PixiJS later is a straight port.
- **Art:** top-down appliqué fabric with stitched edges, drawn in code.
- **The Commons doesn't require sign-in** during the test (`commonsRequiresSignIn: false`), so an invited friend's very first action can be filling a Wonder slot.
- **The nation list is a placeholder** of 47 nations in `js/config.js`. Which official list to follow is still your decision.
- **Capacity online:** the seed plans 48 Blocks ahead, enough for about 1,400 homes. To go bigger, raise "Blocks to plan ahead" in `tools/seed-sql.html` and run the new SQL. Past the plan, newcomers still join; they just don't get a home.

## Make it a live shared world with Supabase (about 30 minutes)

1. **Create a project.** Sign up at supabase.com, choose **New project**, pick a region near your testers, and wait for it to finish setting up. The free plan is enough for the test.
2. **Create the database.** Open **SQL Editor → New query**, paste all of [supabase/schema.sql](supabase/schema.sql), and click **Run**. Then do the same with [supabase/seed.sql](supabase/seed.sql). The first creates the tables and every rule as a database function. The second adds the rule numbers, the Blocks (and the ones planned ahead), the Wonder, the name and nation lists, and the starting landscape. Both are safe to run again.
3. **Allow guest players.** Go to **Authentication → Sign In / Providers** and turn on **Anonymous sign-ins**. Players start without an account, as the doc asks.
4. **Connect the game.** Under **Project Settings → API**, copy the **Project URL** and the **anon public** key into `supabaseUrl` and `supabaseAnonKey` in [js/config.js](js/config.js). The anon key is meant to be public; the database rules protect everything else.
5. **Fill in the launch settings.** In `js/config.js`, set `contactEmail` (shown on the Privacy and Terms pages, where players and parents write about their data) and `governingLaw` (for example `'the State of California, USA'`). Until they're set, those pages show a red placeholder.
6. **Put it online with Netlify (free).** Either:
   - **From GitHub (recommended):** in Netlify, **Add new site → Import an existing project → GitHub**, pick this repo, and deploy. `netlify.toml` copies only what players need into the site, so the tests, tools, database files and design doc stay private, and every `git push` updates the live game.
   - **By hand:** run `powershell -File tools/make-site.ps1`, then drag the `dist` folder onto app.netlify.com/drop.

   Then set `siteUrl` in `js/config.js` to the new address so invite links point to it, and deploy again. In Supabase, set **Authentication → URL Configuration → Site URL** to the same address. Shared links show `og-image.png`; remake it with `tools/og-image.ps1` when the game's look changes.
7. **Make yourself a moderator.** Play once, then run this in the SQL Editor with your builder name:
   ```sql
   insert into admins (id) select id from players where name = 'Brave Otter';
   ```
   **Moderator tools** then appears in Settings.
8. **Google sign-in (optional).** In **Authentication → Sign In / Providers → Google**, add a client ID and secret from the Google Cloud console, and turn on **manual linking** so a guest keeps their progress when they sign in.

If something is off, the game shows the error on its loading screen. Clear the two Supabase settings to fall back to the demo world.

### The Quiltopia Club with Stripe (optional)

Until you set this up, the Club stays closed online ("The Club opens soon").

1. **Create the product.** In your Stripe dashboard (start in **Test mode**), add a product "Quiltopia Club" with a recurring price of $2.99 a month. Then create a **Payment Link** for it, and under its confirmation page choose **Don't show a confirmation page** → redirect to your site.
2. **Point the game at it.** Put the Payment Link's address in `clubCheckoutUrl` in `js/config.js`. The Join button opens it with the player's id as `client_reference_id`, so Stripe knows who paid.
3. **Record payments.** Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then from this folder run `supabase functions deploy club-webhook --no-verify-jwt`, and `supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_...`.
4. **Tell Stripe where to send them.** In Stripe, **Developers → Webhooks → Add endpoint**: your function's address (`https://<project>.supabase.co/functions/v1/club-webhook`), with the events `checkout.session.completed` and `invoice.paid`. Its signing secret is the `STRIPE_WEBHOOK_SECRET` above.

Each payment sets the member's `club_until` to the end of the paid month; a cancelled membership simply runs out. The function ([supabase/functions/club-webhook/index.ts](supabase/functions/club-webhook/index.ts)) **hasn't been run against Stripe yet**: try a test-mode payment first, check the member gets their ★, then switch to live keys.

**Changing rules:** the numbers live in `js/rules.js`, `js/stitchlings.js` and `js/config.js`. After changing them, open [tools/seed-sql.html](tools/seed-sql.html) in a browser, copy the SQL, run it in Supabase (or save it over `supabase/seed.sql`), so the server enforces the same rules. Re-running it never removes anything players built.

**What's tested and what isn't:** the database runs in a real Postgres 16 in the tests (below), with Supabase's guest and signed-in roles stood in. The tests cover every rule and what the browser can and can't touch. It hasn't yet run against a real Supabase project, so Realtime and sign-in are the likeliest places to need a fix on first connection.

## Running the two-week test

The doc's target: 100–200 people from a Discord server, a school club or friends, with **players recruiting others to finish the Wonder without being asked** as the key signal. Run these in the SQL Editor:

**Did people come back?**
```sql
with first_day as (select player, min(at)::date as d0 from events where name = 'app_open' group by player),
     played as (select distinct player, at::date as d from events where name = 'app_open')
select count(*) as players,
  count(*) filter (where exists (select 1 from played p where p.player = f.player and p.d = f.d0 + 1)) as came_back_next_day,
  count(*) filter (where exists (select 1 from played p where p.player = f.player and p.d = f.d0 + 7)) as came_back_a_week_later
from first_day f;
```

**Did the first minute work?** How many joined, finished the welcome kit, and put a patch on a Wonder:
```sql
select name, count(distinct player) from events where name in ('joined', 'kit_done', 'onboarded', 'wonder_slot') group by name;
```

**Are they recruiting?** `invite_accepted` means a friend opened an invite link and then filled a Wonder slot.
```sql
select name, count(*) from events where name in ('invite_sent', 'invite_opened', 'invite_accepted') group by name;
```

**How are the Wonders going?**
```sql
select b.name, w.status, w.filled, w.slots, w.completed_at, count(distinct p.owner) as builders
from wonders w join blueprints b on b.id = w.blueprint left join patches p on p.wonder_id = w.id
group by b.name, w.status, w.filled, w.slots, w.completed_at;
```

**Does national pride drive invites?**
```sql
select pl.nation, count(*) as invites_sent from events e join players pl on pl.id = e.player
where e.name = 'invite_sent' group by pl.nation order by 2 desc;
```

## Tests and tools

Run all three test suites in headless Microsoft Edge:
```powershell
powershell -File tools/run-tests.ps1
```
- [tests/rules-test.html](tests/rules-test.html): plots, zones, every placement rule, the allowance, levels, goals, Stitchlings and growth. It also checks that the landscape and every demo patch obey the rules.
- [tests/smoke-test.html](tests/smoke-test.html): plays the real game through its UI, from a first visit through daily rewards, kindness, the shop, founding, growth, a finished Wonder (the show, its Stitchling, the plaque and its postcard), the time-lapse, an invited friend arriving live, and a reload.
- [tests/sql-test.html](tests/sql-test.html): runs `supabase/schema.sql` and the seed in PGlite (Postgres in WebAssembly, loaded from a CDN, so it needs the internet). It then plays every rule through as a dozen players and checks what the browser can and can't read or write.

`powershell -File tools/shots.ps1` takes phone-size screenshots of real play, three phones per set: the first visit (sets 1 to 4), the daily sheet, Stitchbook and shop (5), founding, a home and a Wonder (6), wishes (7), the neighborhood (8), quilt fabrics (9), visiting (10), coming back (11), the Club (12), a Wonder being finished: the show, the plaque and its postcard (13 to 15), what comes next: the plaque's next Wonder and the town proposing one (16), and daily goals: Go buttons, a goal done, all three done (17). `-Sets 13,14` picks sets and `-Night` takes them at night. It prints where the PNGs went.

## The kicker

`tools/kicker/` keeps Claude Code improving the game round after round, using [tools/kicker/prompt.md](tools/kicker/prompt.md). It's switched on by `.claude/settings.local.json`:
- A Stop hook hands Claude the prompt each time it finishes.
- If a turn ends on a usage limit, a background waiter checks every 15 minutes and resumes the session once your quota is back.

```powershell
powershell -File tools/kicker/kicker.ps1 status   # on or off, waiting or not, recent activity
powershell -File tools/kicker/kicker.ps1 off      # stop it (Esc in Claude Code also interrupts any time)
powershell -File tools/kicker/kicker.ps1 on
```
Its log and run output are in `tools/kicker/logs/`, along with `baseline-2026-10-11.zip`, a copy of the game from before the kicker first ran.

## Files

| File | What it does |
|---|---|
| `index.html`, `css/style.css` | The page and its look |
| `privacy.html`, `terms.html`, `css/legal.css`, `js/legal.js`, `404.html` | The Privacy and Terms pages (filled in from `js/config.js`) and the not-found page |
| `netlify.toml`, `tools/make-site.ps1` | What goes on the live site, and how |
| `og-image.png`, `tools/og-image.ps1` | The picture shown when a link is shared, and how to remake it |
| `js/config.js` | Settings you'd change before a test |
| `js/rules.js` | The game rules, shared by everything below |
| `js/stitchlings.js` | Who lives where, what they need, Cozy scores, and where rare Stitchlings turn up |
| `js/seed.js` | Every Block's starting landscape, and the demo's simulated neighbors |
| `js/local-server.js` | The demo world, stored in the browser |
| `js/supabase-server.js` | The online world through Supabase |
| `js/render.js` | Draws the quilt, patches, Stitchlings and effects |
| `js/input.js` | Touch, mouse and keyboard gestures |
| `js/app.js` | The core: camera, placing, the dock, sheets, coach bubbles, invites |
| `js/ui-sheets.js`, `js/ui-progress.js`, `js/ui-social.js` | Cards and sheets: Wonders and settings; the Stitchbook, levels, shop and daily rewards; players, stickers, gifts, friends and founding |
| `js/onboarding.js` | The first visit |
| `js/timelapse.js` | The time-lapse replay |
| `supabase/schema.sql`, `supabase/seed.sql` | The online database and its rules |
| `supabase/functions/club-webhook/` | Records Quiltopia Club payments from Stripe |
| `tools/seed-sql.html`, `tools/seed-sql.js` | Regenerate `seed.sql` from the JavaScript rules |
| `tools/run-tests.ps1`, `tools/shots.ps1`, `tools/shots.html` | Run the tests; take screenshots |
| `tools/kicker/` | The kicker (above) |
