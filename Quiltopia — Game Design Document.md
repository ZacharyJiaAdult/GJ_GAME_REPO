# Quiltopia — Game Design Document

Oct 11, 2026 · @Zachary

## At a glance

Quiltopia is a free online world that everyone builds together, a few patches a day, and that nobody can wreck. Each season's world grows outward like a giant quilt stitched by millions of players, then becomes a keepsake when the season ends.

**Core fantasy:** "I helped build that." Your home sits beside your friends' homes, your name is stitched into a Wonder thousands of people finished together, tiny Stitchlings live in the streets you made, and your nation climbs the Nations Cup medal table.

**One-line pitch:** Like a quilting bee for the whole planet. Everyone adds a few patches each day, nothing anyone builds can be ruined, and together the world grows into something no one could make alone.

**Design pillars**

1. **Nobody can wreck it.** Patches can't be overwritten or removed by other players, so building feels safe and griefing is impossible.
2. **Better together.** The biggest goals, the Wonders, need hundreds of builders, so recruiting friends is part of play, and every Wonder also earns points for your nation.
3. **A few minutes a day, every day.** A daily patch allowance makes each visit meaningful and stops binge burnout.
4. **Kind and safe for every age.** No open chat, no free drawing, no real-world map, and no way to pay for building power.
5. **Always worth looking at.** Patches shape themselves into a charming town automatically, and the world changes live in front of you.

## Why this space is open

Shared-world experiences go viral again and again, but every big one so far has been an open canvas that people can wreck, so none of them is safe for kids, built to last, or set up to earn money fairly.

| Example | How big it got | What went wrong |
| --- | --- | --- |
| [r/place](https://www.malaymail.com/amp/news/tech-gadgets/2022/12/10/with-100000-active-communities-and-430-million-posts-reddit-boosted-its-reach-in-2022/44596) (Reddit, 2022) | More than 10.4 million participants, each placing one pixel every five minutes | Ran for only a few days; communities fought over space by painting over each other |
| [Wplace](https://www.clickondetroit.com/business/2025/09/03/welcome-to-wplace-a-chaotic-collaborative-digital-canvas-where-users-paint-the-world/) (2025) | Over 10.6 million users within weeks of its July 2025 launch | Users complained of slow moderation, hate speech, doxing and repeated griefing; its real-world map drew fights over identity and ideology ([Axios](https://www.axios.com/local/salt-lake-city/2025/08/13/wplace-utah-salt-lake-gamers-deltarune)) |
| [One Million Checkboxes](https://eieio.games/essays/the-secret-in-one-million-checkboxes/) (2024) | 500,000 players checked over 650 million boxes in two weeks | Shut down after two weeks; the developer paid for emergency servers out of his own pocket ([futurezone](https://futurezone.at/games/viral-spiel-multiplayer-game-online-haekchen-one-million-checkboxes-eieino-nolan/402918932)) |

What made them spread is the same every time: one world everyone shares, tiny actions that add up to something huge, and groups recruiting their members to help. In 2022, organizations, streamers and communities called on their supporters to claim parts of the r/place canvas ([Brandwatch](https://www.brandwatch.com/email/brandwatch-bulletin-0114-r-place-2022/)).

**What Quiltopia keeps:** one shared world, small daily actions, group goals that make people recruit, and national pride.

**What Quiltopia removes:** griefing (nothing can be overwritten), offensive drawings (no free pixels), real-world border fights (a made-up world where nations compete only by building), and one-off events (seasons that end and restart).

As far as I could find, no major game offers this kid-safe, grief-proof version yet. Wplace proves the demand, which also means others may move into the space, so speed matters.

## How it plays

Each day you get a handful of patches to add to the world; where you place them, and with whom, is the whole game.

**The world:** Each season's world is a giant quilt made of Blocks, each 64 by 64 squares. New Blocks are stitched onto the edges as players join, so the world visibly grows outward.

- **Home Blocks** belong to a group: friends, a class, a club or a streamer's community.
- **Neighborhood Blocks** hold solo players, filled in the order they arrive.
- **Commons Blocks** sit between groups and hold the Wonders everyone builds together.

**Your home:** Every player gets a small home plot of 8 by 8 squares inside a Block. Only you can build or rearrange things there. Outside your plot, you build on your Block's shared space and in Wonder slots.

**Daily patches:** You get 5 patches a day: 3 chosen from the basic set and 2 surprise patches, which might be seasonal or rare. Helping others earns up to 3 more. Unused patches carry over up to 15, so missing a day never wastes anything.

| Patch | What it does |
| --- | --- |
| House | Stitchlings move in |
| Garden | Feeds nearby Stitchlings; visitors can water it |
| Tree | Gives shade; forests attract forest Stitchlings |
| Water | Ponds and rivers join up automatically |
| Path and bridge | Lets Stitchlings travel between homes and Blocks |
| Park | Makes nearby Stitchlings happier |
| Market | Gets busy when paths connect it to many homes |
| Lantern | Glows at night and draws festival crowds |

**Placement rules**

- An empty square belongs to whoever patches it first.
- No one can remove or replace another player's patch.
- A 10-second undo protects against mis-taps; after that, patches in shared spaces are permanent for the season.
- Patches join their neighbors automatically: walls connect, roofs merge, rivers flow and paths link up. Anything anyone builds looks charming, and it's hard to arrange patches into letters or symbols.

**Stitchlings:** Little stitched creatures move into whatever gets built. They need homes, food from gardens and fun from parks, and they walk along paths to visit other Blocks. Each Block has a Cozy score based on how happy its Stitchlings are. Rare Stitchlings appear only when certain patches sit together; for example, a pond, a willow and a lantern attract a Firefly Stitchling. Players collect them in a Stitchbook, and their funny moments, like napping on benches or crowding a fountain, are clipped automatically for sharing.

**Seasons:** Each season lasts about 10 weeks with its own theme and colors, such as Spring Meadow, Ocean Isles or Snow Festival. The last week is a Festival where every finished Wonder performs. Then the world is saved as an Heirloom, a museum anyone can visit forever, along with a time-lapse video, and a fresh world begins. Players keep their cosmetics, Stitchbook and badges, and newcomers always find room.

## Wonders: the shared goal

Wonders are giant group builds that need hundreds or thousands of players, and they are the main reason players invite each other.

**How a Wonder works**

1. **Pick a blueprint.** Wonders are built from approved blueprints, such as a dragon, a castle, a sky bridge or a giant teapot. The blueprint shows glowing empty slots, each needing a particular patch type.
2. **Gather founders.** Any player can start a Wonder in a Commons Block once 10 founders sign on.
3. **Fill the slots.** Each player can fill at most 3 slots per Wonder per day, so no single person or bot farm can finish one alone. A progress bar and a "builders needed" counter show how close it is.
4. **Invite help.** An "Invite to this Wonder" link drops a friend straight onto an empty slot, so their very first action helps you.
5. **Watch it come alive.** On completion the Wonder performs: the dragon flies a lap around the world, the castle lights fireworks, and music plays for everyone online. A 15-second video is made automatically for sharing.
6. **Get credit forever.** Every builder's name is stitched into the Wonder's plaque, and tapping any patch shows who placed it. Builders also get the Wonder's unique Stitchling for their Stitchbook.

| Size | Slots | Typical builders | Examples |
| --- | --- | --- | --- |
| Small | 200 | A friend group or class over a few days | Treehouse, fountain |
| Large | 2,000 | A club or school over a week or two | Castle, lighthouse |
| Legendary | 20,000 | A streamer's community, or several groups together | Dragon, sky bridge |

**Why Wonders can't be wrecked:** Slots accept only the patch type the blueprint asks for, so nobody can draw anything else inside a Wonder.

**Player-made blueprints (later):** Players design blueprints in a simple editor and submit them. Each one is reviewed before anyone can build it, which keeps everything safe and on theme while letting the community invent new Wonders.

**Festival week:** At the end of each season, every finished Wonder performs in one parade across the world, which makes a natural live event and a season-ending video.

## Nations Cup: friendly national competition

Nations compete the way they do at the Olympics or the World Cup: for medals, pride and bragging rights, earned by building rather than tearing anything down.

National pride is one of the strongest recruiting forces in shared worlds. On r/place, communities organized to fill the canvas with their countries' flags and landmarks ([Entrepreneur](https://www.entrepreneur.com/article/423849)), and Wplace shows a leaderboard of which country is winning, with especially large crowds from Brazil and Germany ([Know Your Meme](https://amp.knowyourmeme.com/editorials/guides/what-is-wplace-the-viral-reddit-place-copycat-that-lets-you-draw-on-the-world-map-explained)). It can also turn ugly: on Wplace, some users drew battle lines over identity and ideology ([Axios](https://www.axios.com/local/salt-lake-city/2025/08/13/wplace-utah-salt-lake-gamers-deltarune)). Quiltopia keeps the pride and designs out the fights.

**Joining a nation**

- New players pick a nation to represent, suggested from their device's language and region settings, with no location tracking. They can switch once per season, or play without a nation.
- The list of nations is fixed and follows an established list used in international sport, so the game never decides borders. Nation names and flags appear only from that list.

**National Pavilions**

- Every nation gets a Pavilion in the World Fair, a ring of Blocks around the center of each season's world. The world stays imaginary, so there are no real borders to fight over.
- Each Pavilion hosts national Wonders built from blueprints inspired by that nation's nature, food, festivals and famous buildings, proposed by its players and reviewed before use.
- Flags appear only as approved Banner patches and as stitching on national Wonders; nobody can draw one freehand.

**How nations score**

| Points for | Why it counts |
| --- | --- |
| Finishing national Wonders | The main goal, and the most visible |
| The Cozy score of the nation's Blocks | Rewards caring for Stitchlings, not just building fast |
| The share of members who played this week | Lets small nations compete with giants |
| Helping other nations through gifts and Friendship Bridges | Makes cooperation part of the winning strategy |

Scores are measured per active player wherever it matters, so a small nation that plays well can beat a huge one.

&#91;embedded content: Nations Cup divisions · promotion and relegation each season\]

Divisions start from each nation's number of active players. After that, promotion and relegation at the end of every season keep every nation in a race it can win.

**Weekly Cup challenges:** Short themed contests within each division, such as the most lanterns lit, the fastest Small Wonder, or the most gifts to other nations. Each winning nation gets an automatic highlight video to share.

**Season medals:** At the Festival, nations win gold, silver and bronze in each category. Medals are displayed in the Pavilion and on a medal table, and players can order their nation's medal poster as a keepsake.

**Friendship Bridges:** Two nations can build a bridge Wonder between their Pavilions. Both earn points and a shared Stitchling, so making friends is worth more than beating rivals.

**Rules that keep it friendly**

- No one can damage, cover or block another nation's builds.
- Reactions are positive only; there is no thumbs-down.
- No real-world maps, borders, politicians, political symbols or anthems.
- Rankings celebrate the top three in each division and your own nation's progress; there are no "worst nation" lists.
- Weekly head-to-head matchups pair nations of similar size at random, never historical rivals.
- Players, or their parents, can switch national features off in settings.

## Getting around on a phone

The rule is to bring the map to players instead of making them travel across it: almost everything a player does takes one or two taps from wherever they are.

**Zoom levels that change what you see**

| Zoom level | What you see | What you do there |
| --- | --- | --- |
| World | The whole quilt as a simple map with Block names and Wonder icons | Tap a region to dive in |
| Region | Blocks with names, Cozy scores and glowing spots where people are building | Tap a Block to visit |
| Block | Homes, shared spaces and Wonder progress | Browse, react, help |
| Street | Individual patches and Stitchlings up close | Place patches |

Far zoom levels never draw millions of patches; they show simplified pictures, the way Google Maps does.

**Getting places**

- **Open at home.** The game always opens on your own home plot, and a Home button flies you back from anywhere.
- **Go To menu.** One tap lists your friends' homes, the Wonders you're helping, live events, and places that need builders. Choosing one flies the camera there in about a second, so you still sense where it is.
- **Swipe to explore.** The highlights feed shows live windows into the world's best spots. Swipe through and tap "Go there." The feed ends each day with "You're all caught up."
- **Help build.** On any Wonder, a Help Build button takes you straight to an empty slot that matches a patch you hold. One more tap places it, so most building needs no navigation at all.
- **Daily tour.** A short automatic fly-through of the day's highlights for players who just want to watch.

**Placing patches precisely with a thumb**

- Choosing a patch zooms in to street level automatically.
- Patches snap to the grid, and good spots glow, such as next to your home or in a matching Wonder slot.
- A magnifier appears under your finger, and a preview waits for you to tap Confirm.
- A 10-second undo catches mis-taps before a patch becomes permanent.

**One-handed controls**

- Drag to pan, with momentum.
- Double-tap to zoom in; double-tap then drag to zoom with one finger, like Google Maps.
- Pinch also works for two-handed play.
- Buttons sit along the bottom, within thumb reach.

**Never get lost**

- Arrows at the screen edge point toward nearby friends who are off-screen.
- Bookmarks save up to 10 favorite places.
- A Back button returns to the last place you visited.

**Keeping phones fast:** The world loads in chunks, only what's on screen. Zoomed-out views use pre-made images served from a content delivery network (CDN), which saves battery, data and server costs. On a computer, the same world supports free roaming with mouse and keyboard.

## Daily rewards and progression

Rewards are things players can see and show off, earned by playing. Nothing gives anyone more building power than every other player can get.

**The daily patches are the main reward.** Five fresh patches a day, plus up to three more for helping others, give every visit a purpose.

**7-day calendar**

| Day | Reward |
| --- | --- |
| 1, 2, 4, 6 | Buttons, the currency earned by playing |
| 3 | A home decoration |
| 5 | An outfit for your Stitchlings |
| 7 | A rare landmark patch, such as a lighthouse, windmill or cherry tree, that everyone can see |

Missing a day pauses the calendar; it never resets.

**Three daily goals**, such as "Water two neighbors' gardens," "Fill a Wonder slot" or "Visit a Block you've never seen." Finishing all three pays bonus Buttons.

**Builder level:** Placing patches, helping and finishing Wonders earn experience. Levels unlock:

- Level 3: start or join a Home Block for your group
- Level 5: found a Wonder
- Higher levels: new patch looks (same function, different style), home decorations and Stitchling outfits

**Stitchbook:** Every Stitchling you meet is recorded. Rare ones come from special patch combinations and finished Wonders, and completing a page unlocks a decoration.

**Monthly reward:** An exclusive decoration for playing on 20 days in a month, so a few missed days still count.

**Season badges:** Founder, Wonder Builder (with a count), Festival Guest and more, shown on your profile across seasons.

**Free season keepsake:** When a season ends, every player gets a digital card showing the finished Heirloom with their own patches highlighted, ready to share.

## Playing together

Every interaction is built to be kind: players can help, gift, react and build together, but never attack, insult or overwrite each other.

- **Home Blocks:** Friends, classes, clubs and streamer communities share a Block. Group names are assembled from word lists, such as "Brave Teapot Club," so no one can type anything offensive.
- **Neighbors:** Connecting your Block to a neighbor's with a path or bridge lets Stitchlings visit both, which raises both Cozy scores. Cooperating across groups pays off.
- **Helping:** Water a neighbor's garden or light their lanterns. They get a growth boost, and you earn a bonus patch, up to three a day.
- **Gifting:** Give one of your daily patches to a friend. When they place it, it carries your name.
- **Patch requests:** A group posts what it needs, such as "12 water patches for our river," and members see it in the Go To menu.
- **Reactions:** Preset stickers (heart, wow, laugh, clap) on homes, Wonders and clips. There's no typing anywhere.
- **Live presence:** Friends' avatars move around the map, and patches pop in with a small animation as people place them nearby, so the world always feels alive.
- **Build Nights:** Weekly one-hour themed events where everyone's patch allowance doubles (still capped) and people build side by side in real time.
- **Rallies:** A streamer or group leader shares a rally link. People who join land at the rally's Wonder with a slot ready, while the normal daily limits still apply.
- **Visiting:** Anyone can visit anyone's home unless it's set to friends-only. A guest book collects visitors' stickers.

## Safety for all ages

Safety is what separates Quiltopia from the open canvases, so it is built in from the first prototype rather than added after launch.

**Grief-proof by design**

- No one can overwrite or remove another player's patches.
- Wonder slots accept only the patch type the blueprint asks for.
- Daily limits per player and per Wonder cap how much any one person, or bot, can do.

**Keeping content clean**

- There are no free pixels or free colors. Patches shape themselves and use each season's palette, which makes letters and symbols hard to build.
- Every Block is rendered as an image each hour and scanned automatically for symbols and text. Anything flagged goes to a review queue.
- Every patch and Block has a Report button. Moderators can roll back an area in one action, and repeat offenders lose the right to build.
- New accounts can build only in their home and Neighborhood Blocks for their first three days, not in the Commons.

**No chat, no personal details**

- Player names, group names and Wonder names are built from word lists.
- There is no free text, no photos and no voice.
- The world is imaginary rather than a real map, so no one can pin homes to real places. That avoids the doxing and real-world political fights seen on Wplace.

**Children's privacy**

- Players can start without an account, with progress saved on the device. Accounts come later through Apple or Google sign-in, with parent approval for players under 13.
- Collect as little data as possible and show no personalized ads to children. Follow children's privacy rules such as COPPA in the US and GDPR-K in Europe, and get legal advice before adding accounts or ads.

**Bots and cheating**

- The server checks every placement against limits, ownership and slot rules.
- Building in the Commons requires sign-in, with rate limits per account and per device.
- Unusual patterns, such as many accounts on one device or perfectly timed placements, are flagged automatically.
- Because each account can only do a little each day, botting a Wonder costs more effort than it's worth.

**Moderation as the game grows:** Start with automated checks and volunteer community moderators, then budget for paid moderators as the player base grows. A time-machine view of any Block's history helps them see who did what and undo it quickly.

**National competition:** Nations bring the most heat, so nation names and flags come only from a fixed list, every reaction is positive, and the rules in the Nations Cup section keep rivalry friendly.

## Feel-good design without burnout

Quiltopia aims for small daily good feelings that build toward big shared moments, with clear stopping points so players leave refreshed rather than drained.

Brain chemistry is more complex than "feature X releases chemical Y," so treat this as a design guide, not a medical claim. The evidence is strongest for dopamine and surprise, dopamine and musical build-up, and opioids released by laughing together; the oxytocin and serotonin rows are common associations rather than proven game effects.

| Feeling and brain system | What tends to trigger it | Where it shows up | Guardrail |
| --- | --- | --- | --- |
| Surprise (dopamine) | Outcomes better than expected; a fully predicted reward draws little response ([Schultz](https://pmc.ncbi.nlm.nih.gov/articles/PMC3866681)) | Daily surprise patches, rare Stitchlings appearing, a Wonder finishing sooner than expected | Surprises are earned by playing, never sold as random rewards |
| Build-up to a peak (dopamine) | Both anticipating a musical peak and the peak itself ([Salimpoor et al., 2011](https://www.zlab.mcgill.ca/publications/docs/salimpoor_2011_nn.pdf)) | A Wonder's progress bar nearing the end, then its show with music; the Festival parade | One big peak per Wonder, then the moment ends |
| Laughing together (endorphins) | Social laughter triggered opioid release in a PET study ([Manninen et al., 2017](https://www.jneurosci.org/node/623288)) | Stitchlings' silly moments, Build Nights with friends | Humor is gentle and never at anyone's expense |
| Belonging (oxytocin, commonly linked) | Cooperating and giving | Group Blocks, gifting, helping, Wonders | No way for anyone to harm another player's work |
| Pride and legacy (serotonin, commonly linked) | Mastery and recognition | Names on Wonder plaques, badges, Heirloom keepsakes | Rankings compare groups' Cozy scores, not individuals, and are opt-in |

These map onto the three needs that best predicted game enjoyment and well-being in four studies: autonomy, competence and relatedness ([Ryan, Rigby & Przybylski, 2006](https://www.sciencedaily.com/releases/2006/12/061226134706.htm)). In Quiltopia that means choosing where to build, seeing your Block's Cozy score rise, and building with people you know.

**Burnout safeguards**

- **A few meaningful minutes a day.** The daily allowance gives every visit a purpose with nothing to grind.
- **No fear of missing out.** Unused patches carry over up to 15, the calendar pauses instead of resetting, and every live show has a replay.
- **Quiet notifications.** Opt-in only, at most one a day, and only for good news, such as "Your Wonder is finished" or "A friend sent you a patch."
- **A feed that ends.** The highlights feed stops each day with "You're all caught up."
- **Clean endings.** Each season closes with a Festival and an Heirloom, then a fresh start.
- **No paid randomness.** No loot boxes. Belgium has treated paid loot boxes as illegal gambling since 2018 ([Taylor Wessing](https://www.taylorwessing.com/en/insights-and-events/insights/2025/03/an-iphone-a-gambling-problem-and-the-loot-box-debate)), and they don't belong in a game for children.

## How it spreads with minimal marketing

Quiltopia's growth comes from its goals: a Wonder can't be finished without more builders, so players do the recruiting.

&#91;embedded content: Quiltopia growth loop · 6 steps\]

The highlighted step is the engine. Every Wonder needs more builders than one group has, so groups invite friends, and every finished Wonder produces a video that brings in the next wave.

**Launch channels that cost little or nothing**

- **Season launches and Festivals:** Each new season and each season finale is a natural news moment.
- **Time-lapses:** Daily and season-long videos of the world filling up, made automatically in vertical format for TikTok, Reels and Shorts.
- **Wonder completion clips:** 15-second videos with the builders' names, which builders naturally share.
- **Streamer rallies:** Streamers build Legendary Wonders with their communities, using rally links and a streamer page.
- **Schools:** A free class world with teacher controls; kids carry the game home.
- **Devlogs:** Short build-in-public videos on TikTok while you develop it.

**National pride:** Weekly Cup results and the season medal table give players, streamers and local media a reason to rally behind their nation, the same pull that filled r/place with flags.

**Where it lives:** Start on your own website, since accounts, invites and rally links all depend on it. Add mobile apps once players return day after day. Web game portals are optional later; Poki, for example, usually asks for web exclusivity.

## Making money

Money comes from things people love to keep and show off, never from building power, and nothing is for sale until players are hooked.

**What players can buy**

- **Cosmetics:** Home decorations, Stitchling outfits, patch styles (same function, different look), name plaques, profile frames, and national outfits for Stitchlings. Everything can also be earned with Buttons.
- **Quiltopia Club (about $2.99 a month):** One exclusive cosmetic a month, extra decoration slots at home, a Club badge, and your name in the season credits. No building advantages.
- **Season keepsakes:** Posters of the finished Heirloom with your patches highlighted, framed prints, 3D-printed models of your Block, and your nation's medal poster, made by print-on-demand partners so there's no stock to hold. People get deeply attached to shared creations: after r/place, dozens of participants said they planned to get tattoos of the final canvas ([Minter Dial](https://www.minterdial.com/2022/04/reddit-r-place/)).
- **Private worlds:** Class worlds with teacher controls, team-building worlds for companies, and private worlds for creators' communities, sold as yearly or monthly subscriptions.
- **Opt-in reward ads:** Watch one for Buttons, never for patches. Turned off for players under 13.

**Never for sale:** Patches, extra daily building, placement priority, or random paid rewards.

**When it unlocks**

| When | What appears |
| --- | --- |
| First week | Nothing for sale, no ads |
| Builder level 5 | Opt-in reward ads (players 13 and over) |
| Builder level 8 | Cosmetic shop |
| End of a player's first season | Keepsake shop, plus a one-time Club offer |
| Any time, on a separate page | Private worlds for schools and companies |

**Biggest profit lever:** Sell on your own website wherever you can. Web payments cost a few percent in processing fees, while app stores typically take 15–30%.

**Illustrative monthly estimate** (assumptions, not a forecast; replace them with real numbers after the soft launch): 100,000 daily players and 300,000 monthly players.

| Source | Assumption | Per month |
| --- | --- | --- |
| Club membership | 1.5% of monthly players at $2.99 | About $13,500 |
| Cosmetics | 2% of monthly players spend $3 on average | $18,000 |
| Opt-in reward ads | 0.5 ads per daily player per day (1.5 million views) at an assumed $8 per 1,000 views | $12,000 |
| Season keepsakes | 0.5% of players buy a $25 poster each season at a 40% margin, spread across the season | About $6,000 |
| Private worlds | 200 classrooms at $60 a year, plus 20 companies at $50 a month | About $2,000 |
| **Total** | Before store fees, payment fees, taxes and running costs | **About $51,500** |

The biggest costs will be servers, moderation and store fees. Daily patch limits keep server work small, which is covered in the technical plan.

## Technical plan

Quiltopia is a web game backed by one database and a light live-update service. Because each player places only a handful of patches a day, it costs far less to run than a real-time action game.

| Component | What it does | Suggested tools |
| --- | --- | --- |
| Game client | Draws the world and handles touch controls in any browser | TypeScript, PixiJS or Phaser 3, Vite |
| Accounts and database | Players, patches, Blocks, Wonders and daily allowances | Supabase (Postgres and Auth) |
| Placement service | Checks every placement against limits, ownership and slot rules | Supabase Edge Functions or a small Node.js API |
| Live updates | Sends new patches and friends' positions to people viewing that area | Supabase Realtime or a Node.js WebSocket server |
| Map images | Renders each Block as an image for zoomed-out views, cached worldwide | A scheduled job plus Cloudflare R2 and its CDN |
| Safety pipeline | Scans Block images for symbols and text, with a review queue and rollback tool | An AI image-moderation service and an admin page |
| Time-lapses | Turns daily snapshots into share videos | A scheduled job using ffmpeg |
| Mobile apps (later) | Wraps the web game for the app stores | Capacitor |
| Analytics | Tracks returns, invites and Wonder completion | PostHog or similar |

**Core records**

- **Patch:** Block, position, patch type, style, owner, time placed.
- **Wonder:** blueprint, location, filled slots, builders, and the nation it scores for.
- **Player:** name words, nation, level, Buttons, today's allowance, carried-over patches.

**How a placement works:** The patch appears on your screen instantly and waits through the 10-second undo. Then the server checks it and makes it permanent, and everyone viewing that Block sees it pop in.

**Scale and cost**

- **Writes are tiny.** Even 100,000 daily players placing 8 patches each is 800,000 small writes a day, about 9 per second on average, which one database handles easily.
- **Reads are mostly cached images.** Zoomed-out views come from the CDN, and live updates go only to people looking at that Block.
- **Plan for spikes.** Viral traffic arrives all at once, so queue placements, show a friendly "the world is busy" message instead of crashing, and use services that scale automatically.

**World layout:** New Blocks are added in a spiral around the center, and groups can ask to be placed next to friends' Blocks.

## Build plan

Build the smallest version that proves people will recruit each other, then grow it in phases; each phase starts only after the previous one passes its test.

&#91;embedded content: Quiltopia roadmap · 4 phases, 3 test gates\]

The gate targets under each diamond are suggestions; adjust them once you see real numbers.

**Prototype checklist (weeks 1–3)**

- [ ] A shared world of 4 Blocks, with live updates for everyone viewing
- [ ] 6 patch types (house, garden, tree, water, path, lantern) that shape themselves to their neighbors
- [ ] A daily patch allowance, sped up for testing, such as 5 patches every hour
- [ ] The 10-second undo, then a server check and permanent placement
- [ ] Home plots and the Home button
- [ ] One Wonder blueprint with slots, a progress bar, and an invite link that drops a friend onto an empty slot
- [ ] Zoom levels, the Go To menu, and precise placement (auto-zoom, snapping, magnifier, Confirm)
- [ ] Google or Apple sign-in, a Report button and a basic rollback tool
- [ ] Tracking for daily returns, invites sent, invites accepted and Wonder progress
- [ ] A nation picker and a simple nation leaderboard, to test whether national pride drives invites

**What the test must show:** Run the prototype for two weeks with 100–200 people from a Discord server, a school club or your friends. The key signal is whether players recruit others to finish the Wonder without being asked. Also watch how many come back the next day and the next week.

**First prompt for Claude Code**

Export this doc as Markdown, save it in your project folder as DESIGN.md, run `claude` there, and paste:

> Read DESIGN.md. Build the Quiltopia prototype from the "Prototype checklist" in the Build plan: a TypeScript + PixiJS + Vite web game with a Supabase backend. Start with a shared world of 4 Blocks where signed-in players place patches that appear live for everyone, with the daily allowance, the 10-second undo and server-side checks. Use simple placeholder art. Explain each step and tell me exactly what to set up in Supabase. Then we'll add patch auto-shaping, home plots, navigation and the first Wonder one at a time.

## Risks and open questions

The biggest risks are an empty-feeling world at launch, offensive content slipping through, and national rivalry turning hostile; all three are designed for from the start.

| Risk | Why it matters | Plan |
| --- | --- | --- |
| Empty world at launch | A huge, empty world feels dead | Start with small worlds of 2,000–5,000 players, seed them with pre-built villages and Stitchlings, and link worlds as numbers grow |
| Offensive content gets through | One bad screenshot can define the game | Hourly image scans, Report buttons, one-tap rollback, limits on new accounts, and a budget for moderators |
| National rivalry turns hostile | Pride can spill into insults and political fights, as seen on Wplace | Positive-only scoring and reactions, a fixed list of nations and flags, points for helping other nations, and a setting to hide national features |
| Country names and flags | A wrong label can get the game pulled from a country's store | Follow an established international sports list and its naming, and review each launch market before release |
| Short sessions earn less from ads | A few minutes a day means few ad views | Lean on Club membership, keepsakes and private worlds |
| Viral spike crashes the servers | Players arriving to a broken game rarely return | Queued placements, a friendly busy mode, and services that scale automatically |
| Bots and multiple accounts | Cheaters could finish Wonders unfairly or inflate a nation's score | Daily caps, sign-in for the Commons, per-device limits, automatic flags, and scoring per active player |
| Big streamer groups dominate | Small groups feel left out | Per-player limits, Wonders in three sizes, and Cozy rankings that compare groups of similar size |
| Copycats | Wplace showed the demand, so others may build similar games | Launch fast, build community, and own the safe-for-kids position |
| Children's privacy rules | Breaking them can mean fines or store removal | Minimal data, parent approval for under-13 accounts, legal advice before accounts or ads |
| Name already taken | A rename after launch is costly | Check trademarks, app stores, Steam and domains before announcing |

**Decisions for you**

- [ ] Season length: 6, 8 or 10 weeks
- [ ] Art style: 2D isometric (cheaper, faster) or simple 3D
- [ ] One worldwide quilt, or separate regional quilts at first
- [ ] Launch languages and regions
- [ ] Web first and mobile apps later (recommended), or both at once
- [ ] Which international list of nations to follow, and whether national features start switched on

## Sources

**Shared-world precedents**

- [Malay Mail: Reddit's 2022 figures, including r/place](https://www.malaymail.com/amp/news/tech-gadgets/2022/12/10/with-100000-active-communities-and-430-million-posts-reddit-boosted-its-reach-in-2022/44596)
- [Brandwatch: There's no r/place like Reddit](https://www.brandwatch.com/email/brandwatch-bulletin-0114-r-place-2022/)
- [Minter Dial: Reddit r/place](https://www.minterdial.com/2022/04/reddit-r-place/)
- [Entrepreneur: Millions of users created the world's largest digital canvas](https://www.entrepreneur.com/article/423849)
- [Associated Press via ClickOnDetroit: Welcome to Wplace](https://www.clickondetroit.com/business/2025/09/03/welcome-to-wplace-a-chaotic-collaborative-digital-canvas-where-users-paint-the-world/)
- [Axios: Wplace takes Utah by storm](https://www.axios.com/local/salt-lake-city/2025/08/13/wplace-utah-salt-lake-gamers-deltarune)
- [Know Your Meme: What is Wplace?](https://amp.knowyourmeme.com/editorials/guides/what-is-wplace-the-viral-reddit-place-copycat-that-lets-you-draw-on-the-world-map-explained)
- [eieio.games: The secret inside One Million Checkboxes](https://eieio.games/essays/the-secret-in-one-million-checkboxes/)
- [futurezone (German): One Million Checkboxes goes viral](https://futurezone.at/games/viral-spiel-multiplayer-game-online-haekchen-one-million-checkboxes-eieino-nolan/402918932)

**Brain and motivation research**

- [Schultz: Updating dopamine reward signals](https://pmc.ncbi.nlm.nih.gov/articles/PMC3866681)
- [Salimpoor et al. (2011): Dopamine release during anticipation and experience of peak emotion to music](https://www.zlab.mcgill.ca/publications/docs/salimpoor_2011_nn.pdf)
- [Manninen et al. (2017): Social laughter triggers endogenous opioid release](https://www.jneurosci.org/node/623288)
- [ScienceDaily on Ryan, Rigby & Przybylski (2006): The motivational pull of video games](https://www.sciencedaily.com/releases/2006/12/061226134706.htm)

**Rules**

- [Taylor Wessing: Belgium and loot boxes](https://www.taylorwessing.com/en/insights-and-events/insights/2025/03/an-iphone-a-gambling-problem-and-the-loot-box-debate)
