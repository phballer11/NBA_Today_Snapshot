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

Set repository **Settings → Secrets and variables → Actions → Variables → ENABLE_SNAPSHOTS** to `true` for background data collection and deployment every 15 minutes. Leave it unset to skip scheduled runs. Pushes and manual runs still fetch snapshots.

The open app fetches ESPN directly approximately every 30 seconds only while the selected NBA date has a live game, and pauses polling while hidden. There is no automatic polling when all games are scheduled or final. Opening/reloading the app, choosing a date and tapping Refresh still fetch data; tap Refresh or reopen to discover that a scheduled game has started. Returning to the same date or reconnecting does not refresh a non-live slate. Final player boxes may be reused for ten minutes. The setting controls only fallback data. GitHub schedules can be delayed, and Actions usage depends on your plan. Snapshot data is explicitly labeled with its age; Refresh does not trigger a privileged workflow.

The collector captures yesterday/current/next NBA dates, retains up to seven date files, and uses the Actions cache to preserve previous snapshots across feed failures. The site remains fully static; no running backend or CORS proxy is needed.

## Interface

- Every game on the selected NBA date, live first. There are no game filters, pinning controls or scores-only mode.
- Tap a matchup in the game navigation to jump to its card. The destination receives keyboard focus.
- Portrait phones use one column. Landscape screens from 640px wide use two game-card columns, with compact scoreboards and player names above the stats; wide desktop screens also use two columns. Landscape spacing respects the iPhone notch and safe areas.
- Bigger game clocks and tip-off times. The title, current time, tip-offs and last-update time use the device's time zone and locale. Each tip-off includes its date and zone abbreviation. No fixed Auckland zone is used in the interface.
- The NBA date selector remains a US Eastern game date. **Today** opens the current NBA slate, retaining the previous Eastern date until 06:00 ET so late games remain visible. Returning to the app follows the new slate if you were viewing Today.
- Team abbreviations, full team names, scores, season records and conference positions. A compact scoring table shows Q1–Q4, each applicable overtime period (OT1, OT2, etc.) and the total. Live quarters show their score so far; future or missing quarters show a dash.
- Tables are labeled **Box Score**. Five played athletes per team are ranked by Hollinger Game Score. Full names and jerseys; PTS, REB, AST, STL, BLK, TO, FG, 3PT and FT. Shooting is made/attempted. Names sit above evenly spaced numeric columns on phone screens so numbers can be larger. Desktop rows place names alongside their statistics.
- Stat highlights use number colour only, with no background: Strong performances use bold bright lime: PTS ≥20; REB/AST ≥10; STL/BLK ≥4. PTS from 10–19 and REB/AST from 5–9 use leaf green to signal rising performance, with less brightness and weight than the lime tier. TO ≥5 is highlighted in red, also without a background. Other values retain normal styling. Missing values show `—`.
- One or two notes drawn from matching player thresholds, triple-doubles or supported scoring runs. Notes are computed from feed data, not editorial news. Scoring runs use ordered score changes; corrected play-by-play suppresses run detection.
- No footer logo, slogan or website explanation. Data/ranking details are documented here rather than taking space on the scoreboard.
- Loading skeletons, score-first rendering, manual refresh, last-fetch age, stale/empty/error states, reduced-motion support, accessible tables and keyboard navigation.
- Latest five viewed slates cached for seven days; offline shell and bounded snapshot cache. Saved in-progress games say **LAST SEEN**. The clock is observed feed data; it is never advanced by an invented countdown.

## Data limitations

ESPN's public feeds are unofficial and may change or fail. Actual scoreboard, summary and conference standings responses were checked on 10 November 2026. All three returned HTTP 200 with `Access-Control-Allow-Origin: *`; browser cross-origin fetching succeeded. NBA's CDN scoreboard returned 403 here, so it is not used.

Endpoints:

- `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=YYYYMMDD&limit=100`
- `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=GAME_ID`
- `https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=SEASON_YEAR`

The snapshot collector avoids browser CORS dependence but cannot fix an outage affecting GitHub runners too. Score and player feeds can update at different times; delayed boxes are marked. No API key is embedded or required.

ESPN's inspected `playoffSeed` description calls it a BPI projection. When no reliable conference rank is supplied, positions are calculated from conference win percentage; `=` marks ties. NBA tie-breaks are not guessed. Historical games show latest fetched standings. Player names and jerseys are used as returned, without invented biography data.

Game Score penalizes missed shots, turnovers and fouls while rewarding points, rebounds, assists, steals and blocks. Its numeric value is on each name's tooltip. If required fields are absent, the whole team explicitly falls back to points ranking.

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

`index.html`, `styles.css`, `js/app.mjs`: interface and behavior. `js/view.mjs`: player tables and device-time formatting. `js/data.mjs`: shared parsing, ranking, notes and data orchestration. `manifest.webmanifest`, `sw.js`, `icons/`: install/offline support. `scripts/snapshot.mjs`: collector. `.github/workflows/pages.yml`: collection and deployment. `scripts/highlights.mjs`: YouTube collection. `js/highlights.mjs`: link rendering. `data/`: dated fallback snapshots.

## References

- [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub schedule limitations](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [Game Score formula](https://www.basketball-reference.com/about/glossary.html)

## YouTube game highlights (key-free)

Each card ends with direct YouTube links, grouped into **Full game** and **Player highlights**. Every accepted match is shown; links are not limited to the five displayed players. NBA Japan player links show the matched player names in English before the original video title. Only FreeDawkins (`@FreeDawkins`), NBA (`@NBA`) and NBA Japan (`@NBAJPN`) are included. There are no embeds, thumbnails, videos downloaded to the site, API keys, logins, cookies, proxy services, or new dependencies.

The collector runs with the existing GitHub Actions deployment. It tries public channel RSS first and falls back to the public uploads page if RSS is unavailable. It reads only data already included in public HTML, without executing YouTube code or calling its internal APIs. Matching uses two passes:

- **Direct match:** an explicit game date plus both teams (full game) or a named player and their opponent (player highlights). Uploads must fall between tip-off and 72 hours later. Japanese dates explicitly marked 日本時間 are compared in Japan time; name/team aliases support Japanese metadata.
- **Corroborated player match:** covers milestone titles that omit the opponent or date. Require one named player, highlight wording, publication 90 minutes to 18 hours after tip-off, and a separate, directly matched player video from another approved channel for the same game. With an explicit game date, at least one title statistic must match. Without a date, require at least three distinct matching title statistics, including points, plus current-game wording such as “tonight.” Corroborated matches never validate other corroborated matches.

For both paths, stated final scores and single-player title statistics must agree with the final box score. Supported claims are PTS, REB, AST, STL and BLK; `30+ PTS` means at least 30, while `43 PTS` means exactly 43. Conflicting title dates, named third teams in titles or explicit opponent clauses, mismatched statistics, and videos matching multiple games are rejected. Whole-slate recaps, previews, interviews and historical compilations are excluded. The JSON records the match method, checked statistics and corroborating video IDs for inspection. No video IDs are hard-coded into matching rules.

This is conservative metadata matching, not verification of the footage itself. Discovery covers the recent videos exposed by the three public pages/feeds and retains previously matched links. It cannot guarantee every related upload or arbitrary historical backfill. Unknown Japanese player aliases may reduce coverage; they must be added explicitly rather than guessed. Initial discovery is for completed games only.

Enable repository variable `ENABLE_HIGHLIGHTS=true` to run the existing 15-minute schedule even when `ENABLE_SNAPSHOTS` is unset. Either variable enables the scheduled job; pushes/manual deployments collect links too. The workflow refreshes score snapshots before highlights and continues deployment if highlight discovery fails. The browser cannot trigger collection: selecting a date reads the already-published JSON immediately, independently of live ESPN score refreshes. During live-game polling it checks for updated published links at most every five minutes; opening the app, choosing a date or manual Refresh can also load them. No background link polling runs for a non-live slate. It retains the last viewed link files offline.

Run locally after collecting score snapshots:

```sh
node scripts/snapshot.mjs
node scripts/highlights.mjs
# Optional: only match a particular NBA date already present in data/
node scripts/highlights.mjs 2026-11-09
```

Dated public files are saved under `data/highlights/YYYY-MM-DD.json`, keyed by ESPN game ID. Up to 60 dated files are retained. The 30-day recent metadata catalog is cached by Actions but excluded from the deployed website. Feed or lookup failures preserve prior accepted links; the card shows when lookup was partial and when the data was checked. Actions cache is best effort rather than durable storage, so older deployed archives are not guaranteed to survive a cache eviction. A deleted/region-blocked YouTube video may still have a saved link.

YouTube can alter/block its feeds or public pages, including from GitHub runner networks. Failed discovery must leave scores usable. Actual GitHub-hosted collection is only confirmed after the workflow is deployed and run. No unit tests or test packages are included; validation uses syntax checks, actual collection and browser review.
