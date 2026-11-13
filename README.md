# NBA Today Snapshot

A mobile-first NBA scoreboard in vanilla HTML, CSS and JavaScript. No framework, build step, runtime dependencies, API key or server-side proxy.

Repository: https://github.com/phballer11/NBA_Today_Snapshot

## Deploy

1. In repository **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**. The workflow is already provided; skip suggested templates.
2. Push `main` or manually run **Actions → Snapshot and deploy Pages**.
3. Open https://phballer11.github.io/NBA_Today_Snapshot/ after deployment succeeds.
4. On iPhone Safari: **Share → Add to Home Screen**. First open online to cache the app and viewed scores.

Pages is available for public repositories on GitHub Free; private repositories require an eligible paid plan. The website is normally public even if its source repository is private. No personal access token is required by this workflow.

All asset paths, the PWA manifest and service-worker scope support a GitHub Pages repository subpath. The workflow deploys only public website files, not local Git metadata.

## Optional snapshot fallback

Set repository **Settings → Secrets and variables → Actions → Variables → ENABLE_SNAPSHOTS** to `true` to enable the noon–10 PM Auckland game watcher (GitHub may delay or drop its scheduled starts). Leave it unset to skip scheduled runs. Pushes and manual runs still fetch snapshots.

The open app fetches ESPN directly approximately every 60 seconds only while the selected NBA date has a live game, and pauses polling while hidden. There is no automatic polling when all games are scheduled or final. Opening/reloading the app, choosing a date and tapping Refresh still fetch data; tap Refresh or reopen to discover that a scheduled game has started. Returning to the same date or reconnecting does not refresh a non-live slate. Final player boxes may be reused for ten minutes. The setting controls only fallback data. GitHub schedules can be delayed, and Actions usage depends on your plan. Snapshot data is explicitly labeled with its age; Refresh does not trigger a privileged workflow.

The collector captures yesterday/current/next NBA dates, retains up to seven date files, and uses the Actions cache to preserve previous snapshots across feed failures. The site remains fully static; no running backend or CORS proxy is needed.

## Interface

- Every game on the selected NBA date, live first. There are no game filters, pinning controls or scores-only mode.
- Tap a matchup in the game navigation to jump to its card. The destination receives keyboard focus.
- Games always use one card per row. At 540px of card content width, the two teams’ box scores sit side by side; narrower cards stack them. Each table adapts to its own available width. The game-tag navigation stays at the top while scrolling, with a horizontally scrollable row and space above jumped-to cards. System safe areas remain respected.
- Bigger game clocks and tip-off times. The title, current time, tip-offs and last-update time use the device's time zone and locale. Each tip-off includes its date and zone abbreviation. No fixed Auckland zone is used in the interface.
- The NBA date selector remains a US Eastern game date. **Today** opens the current NBA slate, retaining the previous Eastern date until 06:00 ET so late games remain visible. Returning to the app follows the new slate if you were viewing Today.
- Team abbreviations, full team names, scores, season records and conference positions. A compact scoring table shows Q1–Q4, each applicable overtime period (OT1, OT2, etc.) and the total. Live quarters show their score so far; future or missing quarters show a dash.
- Tables are labeled **Box Score**. All played athletes are shown, starters first and then bench, in a fixed-height scroll area. Full names and jerseys; PTS, REB, AST, STL, BLK, TO, FG, 3PT and FT. Shooting is made/attempted. Names sit above evenly spaced numeric columns on phone screens so numbers can be larger. Desktop rows place names alongside their statistics.
- Stat highlights use number colour only, with no background: Strong performances use bold bright lime: PTS ≥20; REB/AST ≥10; STL/BLK ≥4. PTS from 10–19 and REB/AST from 5–9 use leaf green to signal rising performance, with less brightness and weight than the lime tier. TO ≥5 is highlighted in red, also without a background. Other values retain normal styling. Missing values show `—`.
- No footer logo, slogan or website explanation. Data/ranking details are documented here rather than taking space on the scoreboard.
- Score and highlight refreshes preserve the visible game/player row, keyboard focus and horizontal table/navigation position. Cards sort by live, finished, then upcoming. Live games use newest tip-off first; finished games use newest recorded finish first (tip-off if unavailable); upcoming games use earliest tip-off first. Viewing position is anchored when refreshed ordering changes.
- A non-blocking “Game stat updated.” toast appears at the top right for three seconds after a successful score refresh.
- Loading skeletons, score-first rendering, manual refresh, last-fetch age, stale/empty/error states, reduced-motion support, accessible tables and keyboard navigation.
- Latest five viewed slates cached for seven days; offline shell and bounded snapshot cache. Saved in-progress games say **LAST SEEN**. The clock is observed feed data; it is never advanced by an invented countdown.


### iPhone Duo viewport notes

[Apple’s specs](https://www.apple.com/iphone-duo/specs/) list the inner panel as 2670 × 1878 physical pixels and the outer panel as 2034 × 1398 in landscape. Physical pixels do not determine the browser’s usable CSS viewport. [Direct measurements on a Duo](https://chadworks.co/iphone-duo-viewport-sizes/) report folded Safari landscape at 594 × 368 CSS pixels (84 pixels narrower than the 678-wide panel viewport), folded Home Screen landscape at 678 × 445, open Home Screen landscape at 951 × 648, open Safari landscape at 951 × 589, and open Chrome landscape at 871 × 553. Those measurements are from one iOS version; the site uses the actual available space and `env(safe-area-inset-*)`, rather than hard-coding a rail width. The card stays full width, while the two team tables adapt to the space remaining after these insets.

Validation covers those reduced viewports, folded portrait at 382/466 pixels, open upright at 669 pixels, split view at 385 pixels, and a simulated 84px right safe-area inset. These are browser layout checks; a current Duo/iOS simulator is not installed here, so native Safari/Home Screen behavior on the user’s phone still needs device confirmation.

## Data limitations

ESPN's public feeds are unofficial and may change or fail. Actual scoreboard, summary and conference standings responses were checked on 10 November 2026. All three returned HTTP 200 with `Access-Control-Allow-Origin: *`; browser cross-origin fetching succeeded. NBA's CDN scoreboard returned 403 here, so it is not used.

Endpoints:

- `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=YYYYMMDD&limit=100`
- `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=GAME_ID`
- `https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=SEASON_YEAR`

The snapshot collector avoids browser CORS dependence but cannot fix an outage affecting GitHub runners too. Score and player feeds can update at different times; delayed boxes are marked. No API key is embedded or required.

ESPN's inspected `playoffSeed` description calls it a BPI projection. When no reliable conference rank is supplied, positions are calculated from conference win percentage; `=` marks ties. NBA tie-breaks are not guessed. Historical games show latest fetched standings. Player names and jerseys are used as returned, without invented biography data.


## Local use

```sh
python3 -m http.server 8080
```

Open http://localhost:8080/ (not `file://`). HTTPS or localhost is needed for service workers.

Optional developer tools need Node 22+, with no installation step:

```sh
node scripts/snapshot.mjs
node scripts/snapshot.mjs 2026-11-09 2026-11-10
```


The service-worker cache is versioned. Reload an open page to obtain an update; close/reopen the installed app if an older document remains visible. The revision changes the offline cache and viewed-slate cache version so old notes and old layout settings do not carry over.

## Files

`index.html`, `styles.css`, `js/app.mjs`: interface and behavior. `js/view.mjs`: player tables and device-time formatting. `js/data.mjs`: shared roster parsing and data orchestration. `manifest.webmanifest`, `sw.js`, `icons/`: install/offline support. `scripts/snapshot.mjs`: collector. `.github/workflows/pages.yml`: collection and deployment. `scripts/highlights.mjs`: YouTube collection. `js/highlights.mjs`: link rendering. `data/`: dated fallback snapshots.

## References

- [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub schedule limitations](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

## YouTube game highlights (key-free)

Each card ends with direct YouTube links, grouped into **Full game** and **Player highlights**. Every accepted match is shown; links are not limited to the five displayed players. NBA Japan player links show the matched player names in English before the original video title. Only FreeDawkins (`@FreeDawkins`), NBA (`@NBA`) and NBA Japan (`@NBAJPN`) are included. There are no embeds, thumbnails, videos downloaded to the site, API keys, logins, cookies, proxy services, or new dependencies.

The collector merges public RSS, public uploads pages and retained metadata for NBA, FreeDawkins and NBA Japan. It uses one relaxed rule only: the game is live or finished, the video title/description mentions a recognized roster player or either team, and publication falls from tip-off through 15 hours after tip-off. Videos matching one game appear on that card. Videos matching multiple games appear once in a separate Highlights section, with a quick-navigation link. Explicit title dates must agree with the NBA game date (NBA Japan also accepts the Tokyo date). No statistics, opponent confirmation, content-type restriction, play-by-play or corroboration is required. Full-game titles are grouped as full games; other qualifying videos go in player highlights. Interviews, compilations and unrelated videos may appear intentionally, favoring coverage over precision.

Player matching retains full names, suffix-free names, distinctive unambiguous surnames, Japanese aliases and common English nicknames/initials. Team names, nicknames, city aliases and standard uppercase abbreviations are recognized. Initialisms are case-sensitive; Ant still needs team context because Edwards and Simons both use it. Exact upload timestamps must be within the 15-hour window; a rounded upload-age interval must fit entirely inside it. Overlap alone is insufficient, so day-old estimates cannot leak into another slate. Missing publication time cannot establish eligibility. Saved links are revalidated on every collection, and the browser rejects old highlight schemas and invalid time windows. Public feeds/pages expose limited uploads, so complete historical discovery is not guaranteed. No video IDs are hard-coded and no new dependencies or credentials are used.

Enable repository variable `ENABLE_HIGHLIGHTS=true` to enable the scheduled game watcher even when `ENABLE_SNAPSHOTS` is unset. Either variable enables the scheduled job; pushes/manual deployments collect links too. The workflow refreshes score snapshots before highlights and continues deployment if highlight discovery fails. The browser cannot trigger collection: selecting a date reads the already-published JSON immediately, independently of live ESPN score refreshes. During live-game polling it checks for updated published links at most every five minutes; opening the app, choosing a date or manual Refresh can also load them. No background link polling runs for a non-live slate. It retains the last viewed link files offline.

Run locally after collecting score snapshots:

```sh
node scripts/snapshot.mjs
node scripts/highlights.mjs
# Optional: only match a particular NBA date already present in data/
node scripts/highlights.mjs 2026-11-09
```

Dated public files are saved under `data/highlights/YYYY-MM-DD.json`, keyed by ESPN game ID. Up to 60 dated files are retained. The 30-day recent metadata catalog is cached by Actions but excluded from the deployed website. Feed or lookup failures preserve prior accepted links; the card shows when lookup was partial and when the data was checked. Actions cache is best effort rather than durable storage, so older deployed archives are not guaranteed to survive a cache eviction. A deleted/region-blocked YouTube video may still have a saved link.

YouTube can alter/block its feeds or public pages, including from GitHub runner networks. Failed discovery must leave scores usable. Actual GitHub-hosted collection is only confirmed after the workflow is deployed and run. No unit tests or test packages are included; validation uses syntax checks, actual collection and browser review.

### Collection reliability

The watcher requests collections when completed games become eligible, instead of collecting at every cron tick. Pushes and direct manual runs always collect. Each collector retries up to three times, with 10- and 20-second waits after failures. Individual metadata lookups that retain saved matches and allow a successful collector exit do not trigger whole-collector retries. See the watcher section below for timing and limits.

Cards display only the video fetch age (“Video links fetched …”). This age updates while the page is open, independently of score polling. After deployment, tap the site's Refresh to read the new links. Score refreshes alone do not collect videos.

## Automatic game watcher and manual fallback

The automatic controller is `.github/workflows/watch-games.yml`, separate from deployment concurrency. GitHub is asked to start it at 11:37/11:52 and every 15 minutes during noon–10 PM in `Pacific/Auckland`. It waits until noon, checks scores every 15 minutes, and uses two sequential jobs with a state artifact to hand off at 5 PM. Each job stays below the six-hour runner limit. Duplicate scheduled workflows share a concurrency group; a pending duplicate checks the local window before doing work. Either existing ENABLE_HIGHLIGHTS or ENABLE_SNAPSHOTS variable enables scheduled watcher starts. Manual watcher starts work only on main and in the startup/daytime window.

Final games become eligible at 90 minutes, with a catch-up/follow-up pass at 120 minutes. Games with both full-game and player links after the first pass skip the follow-up. Completion time uses the final period-end play timestamp when available; otherwise it conservatively uses the first observed Final status. Eligible games are batched. The watcher targets at most five successful automatic deployments per Auckland day, with up to three dispatch attempts per game/pass. Failed runs do not count as successes. It checks existing collector runs before dispatching and uses GitHub's automatically issued token with Actions write permission, never a personal token. The collector receipt is published only with fresh target-game data, and becomes visible only if deployment succeeds. Public receipts contain game IDs, dates and run IDs only. Push/manual collection remains available at any time.

GitHub can still delay/drop the initial scheduled watcher start. Once running, collections no longer require another cron event. Runner provisioning, service outages, exhausted retries, cache/artifact loss, partial ESPN/YouTube availability and the five-success target can still delay coverage. The watcher occupies a runner while waiting. Late games that are not eligible before 10 PM are considered on the next day; a late start may collect older eligible games immediately. This cannot guarantee every game's 1–2-hour target.

The unlisted `/admin.html` page shows the last published collection receipt and GitHub watcher status, and links to the watcher and direct-collection workflows. It is public, not an access-controlled admin server. GitHub sign-in and repository write permissions protect workflow launch; no tokens/passwords are embedded in the site. It is not linked from the public scoreboard and requests no indexing. Open GitHub controls, choose Run workflow, keep main selected, leave the internal batch field empty for direct collection, then confirm. The page never calls the dispatch endpoint itself.

## Box score roster

Every team shows its full played roster in a fixed 330px scroll area, with starters first and a Bench divider before reserves. DNP entries are excluded. There is no top-performer mode, view selector, bench collapse control or Game Notes section. Sticky stat headers and preserved scroll positions keep the complete roster easy to scan without enlarging a game card. Older snapshots without roster data show a loading message until refreshed. Game sorting remains live (latest tip-off), finished (latest recorded finish, or tip-off when unavailable), then upcoming (earliest tip-off).
