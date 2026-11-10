# NBA Quick Glance

A fast, mobile-first NBA dashboard in vanilla HTML, CSS and JavaScript. No framework, build step, runtime dependencies, account, API key or server-side proxy. Ready for a GitHub Pages project URL and an iPhone Home Screen icon.

## Open locally

From this folder:

```sh
python3 -m http.server 8080
```

Visit http://localhost:8080/ in a browser. Use HTTP, not a `file://` URL: JavaScript modules and service workers need an origin. An HTTPS deployment enables the installed app; localhost also supports service-worker testing.

Optional development/collector checks require Node 22 or newer, with nothing to install:

```sh
npm test
node scripts/snapshot.mjs
# Or collect specific NBA dates:
node scripts/snapshot.mjs 2026-11-09 2026-11-10
```

## Deploy to GitHub Pages

1. Create an empty GitHub repository, e.g. `nba_snapshot`. The local Git repository is already initialized with a `main` branch and initial commit.
2. From this folder, connect it and push (replace `YOUR_USERNAME`):

   ```sh
   git remote add origin https://github.com/YOUR_USERNAME/nba_snapshot.git
   git push -u origin main
   ```

3. In GitHub **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**.
4. Open **Actions → Verify, snapshot and deploy Pages → Run workflow** if the initial push ran before Pages was enabled. The workflow tests behavior, fetches recent JSON snapshots and deploys only public website files. No personal token or secret is needed.
5. Open the deployment URL, normally `https://YOUR_USERNAME.github.io/nba_snapshot/`. All assets, manifest paths and service-worker scope are relative to that subpath. A user-site root or custom domain works too.
6. In Safari on iPhone, open that URL → **Share → Add to Home Screen** → Add. First open online, then launch from the icon for the standalone view.

The site has not been pushed or published for you. There is no remote configured.

### Optional scheduled fallback snapshots

The browser fetches ESPN directly. For a fallback that still works if ESPN later blocks browser cross-origin requests, enable the included collector:

- GitHub **Settings → Secrets and variables → Actions → Variables → New repository variable**: `ENABLE_SNAPSHOTS` = `true`.
- The workflow then fetches yesterday/current/next NBA slates and republishes every 15 minutes (at minutes 7, 22, 37, 52 UTC). It uses GitHub Actions as a scheduled data collector; the deployed website remains fully static.
- Leave the variable unset to skip scheduled publishing. Pushes and manual runs still collect and deploy snapshots. The initial captured fallback files otherwise age until the next deployment.
- Scheduled snapshots are delayed fallback data, not a 30-second live feed. GitHub schedules can be late, skipped under load, disabled after inactivity in public repositories, and run only from the default branch. Check workflow history if data stops advancing. Actions usage depends on repository/plan limits; reduce the cron frequency if needed.
- A failed request preserves the previous snapshot where available. Up to seven date files are kept. Actions cache carries recent files between deployments; it is a best-effort cache, not a durable database. A complete feed outage emits a workflow warning while publishing the available site and retained data.

No open proxy or third-party CORS relay is used. A Refresh tap refetches available data; it cannot trigger a privileged GitHub workflow from the browser.

## Delivered behavior

- Dark responsive layout, local system fonts, tiny local app icons, no analytics, ads or remote image requests.
- The title is `NBA <Auckland date>`. NBA date selection is explicitly US Eastern; each game shows an Auckland tip-off **date and time**, including the following local day.
- Latest slate stays on the previous Eastern date until 06:00 ET, so late games are still available overnight. Choose previous/next, a date, or **Latest**. Returning to the app follows the new latest slate when you were viewing Latest.
- All games on a slate. Live games first, then final, then scheduled; pinning a team moves its games ahead of the rest. Stars and Scores only persist on that browser.
- Scores, Q1–Q4, OT1/OT2 clocks including seconds/tenths **when supplied**, halftime, delayed/postponed status, final overtime labels and scheduled times. Clocks are observed values; the app never invents a running countdown between fetches.
- Season records and conference positions when available. ESPN’s inspected `playoffSeed` metadata says “Projected … according to BPI”; that is not silently treated as an official seed. Instead, positions are derived from conference win percentage when necessary. `#2=` indicates a shared position. NBA tie-breaks are not guessed. Historical games show the latest fetched standings, not reconstructed historical seeds.
- Five played athletes per team, full feed-provided name and jersey, PTS REB AST STL BLK FG 3PT FT. Shooting uses made/attempted. Names wrap; at very narrow widths only the statistics region can scroll. All five players and categories fit at 390px.
- Hollinger Game Score ordering penalizes misses, turnovers and fouls while rewarding other contributions. The exact GmSc is available on the player-name tooltip. Incomplete boxes show missing values as `—` and explicitly rank the whole team by points instead.
- One or two data-grounded notes: notable points/rebounds/assists/threes/steals/blocks, triple-doubles or a leading Game Score performance. Uninterrupted scoring runs of at least 10 points are detected from sequence-ordered score deltas where play-by-play supports them. Notes distinguish a current trailing run from a past run and include quarter/clock. Corrections cause run notes to be suppressed. Notes are computed facts, not editorial news.
- All games, Live, Close games (live margin ≤5), Pinned; Scores only hides tables for a compact slate.
- Skeleton loading, score-first progressive rendering, manual refresh, last-fetch time/age, stale labels, clear empty/error states. Saved in-progress games say **LAST SEEN**, not LIVE.
- Three concurrent detail fetches maximum; final boxes reused for ten minutes; standings held for one hour in session. A failing game box does not hide other games.
- While visible: 30-second live polling, two-minute polling otherwise. No polling while hidden. Resume/reconnect refreshes. A Refresh already in progress is not duplicated.
- Latest five viewed slates cached for up to seven days in local storage; offline app shell and bounded same-origin JSON cache through the service worker. Private mode/storage denial still permits normal fetching. No background-sync or push-notification promise on iOS.
- Semantic headings and tables, row/column headers, keyboard controls, visible focus, status announcements, reduced-motion support, accessible pin labels, skip link and safe-area spacing.

## Data verification and trade-offs

Checked on **10 November 2026 (Auckland)** against actual responses:

| Endpoint | Result from this environment |
| --- | --- |
| `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20261109&limit=100` | HTTP 200; `events[].competitions[].competitors`, status clock/period/type, records |
| `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=401909952` | HTTP 200; `boxscore.players[].statistics[].labels/athletes/stats`, jerseys, `plays[]` |
| `https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=2027` | HTTP 200; conference children with entries/stats |
| `https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json` | HTTP 403 here; not used by the app |

The three ESPN responses included `Access-Control-Allow-Origin: *` when requested with a GitHub Pages-style Origin. The local browser subsequently loaded the app on `/project/`, fetched ESPN cross-origin successfully, and displayed all eight games with 16 five-player tables. This verifies current browser behavior on a non-root path; it does not guarantee future ESPN behavior or availability from every network.

ESPN’s public endpoints are unofficial and can change or stop working. No endpoint key is required today. The snapshot pipeline avoids reliance on browser CORS during an outage, but cannot solve an outage/block affecting GitHub runners too. Saved data remains clearly labeled. Scores and individual box scores can be captured at slightly different instants; ESPN itself may be delayed.

Player names/jerseys are used exactly as returned. They may omit accents or lack a jersey. No fabricated biography data is added. Conference positions are intentionally conservative, not official playoff seed tie-breaks. Headlines are computed notes; no news scraping or AI-invented claims.

## Verification

`npm test` covers captured ESPN schemas, shooting parsing, DNP exclusion, top-five ranking and a known Game Score; missing fields; live/OT/halftime/final status; Auckland and Eastern DST/rollover; projected seeds/ties; scoring-run ordering/corrections; partial/retried feed failures; bounded concurrency; PWA subpath URLs, offline navigation, snapshot failure fallback and isolation from other sites.

Real collection succeeded for three NBA dates: 7 games / 8 games / 6 scheduled games, with all played boxes available. Local HTTP preview returned 200. Browser checks include real ESPN fetches, 390px mobile layout, five rows on each of 16 tables, no horizontal page/table overflow at that width, pinned filtering, scores-only and next-day scheduled games. Actual iPhone installation and the GitHub-hosted workflow require the deployment above and have not been run here.

If editing the app shell, increment `VERSION` in `sw.js` to replace its offline cache. The worker also fetches shell files network-first, so normal online reloads pick up changes. Close and reopen the installed app if an old document stays open.

## Files

- `index.html`, `styles.css`, `js/app.mjs`: interface and browser behavior.
- `js/data.mjs`: shared parsing, ranking, notes and fetch orchestration.
- `manifest.webmanifest`, `sw.js`, `icons/`: install/offline behavior.
- `scripts/snapshot.mjs`: optional serverless-at-runtime collector.
- `.github/workflows/pages.yml`: tests, collector and static deployment.
- `tests/`: dependency-free Node tests and a small captured ESPN fixture.
- `data/`: dated snapshots with source and capture time.

## References

- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub schedule semantics and limitations](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [Game Score formula](https://www.basketball-reference.com/about/glossary.html)
- [ESPN NBA scoreboard](https://www.espn.com/nba/scoreboard)
