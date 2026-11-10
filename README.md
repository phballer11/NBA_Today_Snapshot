# NBA Today Snapshot

A mobile-first NBA scoreboard in vanilla HTML, CSS and JavaScript. No framework, build step, runtime dependencies, API key or server-side proxy.

Repository: https://github.com/phballer11/NBA_Today_Snapshot

## Deploy

1. In repository **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**. The workflow is already provided; skip suggested templates.
2. Push `main` or manually run **Actions → Verify, snapshot and deploy Pages**.
3. Open https://phballer11.github.io/NBA_Today_Snapshot/ after deployment succeeds.
4. On iPhone Safari: **Share → Add to Home Screen**. First open online to cache the app and viewed scores.

Pages is available for public repositories on GitHub Free; private repositories require an eligible paid plan. The website is normally public even if its source repository is private. No personal access token is required by this workflow.

All asset paths, the PWA manifest and service-worker scope support a GitHub Pages repository subpath. The workflow deploys only public website files, not tests or local Git metadata.

## Optional snapshot fallback

Set repository **Settings → Secrets and variables → Actions → Variables → ENABLE_SNAPSHOTS** to `true` for background data collection and deployment every 15 minutes. Leave it unset to skip scheduled runs. Pushes and manual runs still fetch snapshots.

The open app fetches ESPN directly every 30 seconds while games are live, every two minutes otherwise, and pauses polling while hidden. The setting controls only fallback data. GitHub schedules can be delayed, and Actions usage depends on your plan. Snapshot data is explicitly labeled with its age; Refresh does not trigger a privileged workflow.

The collector captures yesterday/current/next NBA dates, retains up to seven date files, and uses the Actions cache to preserve previous snapshots across feed failures. The site remains fully static; no running backend or CORS proxy is needed.

## Interface

- Every game on the selected NBA date, live first. There are no game filters, pinning controls or scores-only mode.
- Tap a matchup in the game navigation to jump to its card. The destination receives keyboard focus.
- Bigger game clocks and tip-off times. The title, current time, tip-offs and last-update time use the device's time zone and locale. Each tip-off includes its date and zone abbreviation. No fixed Auckland zone is used in the interface.
- The NBA date selector remains a US Eastern game date. **Today** opens the current NBA slate, retaining the previous Eastern date until 06:00 ET so late games remain visible. Returning to the app follows the new slate if you were viewing Today.
- Team abbreviations, full team names, scores, season records and conference positions.
- Tables are labeled **Box Score**. Five played athletes per team are ranked by Hollinger Game Score. Full names and jerseys; PTS, REB, AST, STL, BLK, TO, FG, 3PT and FT. Shooting is made/attempted. Names sit above evenly spaced numeric columns on phone screens so numbers can be larger. Desktop rows place names alongside their statistics.
- Stat highlights use number colour only, with no background: PTS ≥20; REB/AST ≥10; STL/BLK ≥4. TO ≥5 is highlighted in red, also without a background. Other values retain normal styling. Missing values show `—`.
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

## Local use and verification

```sh
python3 -m http.server 8080
```

Open http://localhost:8080/ (not `file://`). HTTPS or localhost is needed for service workers.

Optional developer tools need Node 22+, with no installation step:

```sh
npm test
node scripts/snapshot.mjs
node scripts/snapshot.mjs 2026-11-09 2026-11-10
```

Tests cover captured ESPN schemas, shooting and turnover parsing, Game Score ranking, DNP exclusion, missing fields, clocks/OT, device time zones/DST, standings ties, scoring runs, highlight boundaries, safe rendering, partial failures, fetch concurrency and PWA subpath/offline handling. Browser checks cover phone and desktop layouts and game navigation.

The service-worker cache is versioned. Reload an open page to obtain an update; close/reopen the installed app if an older document remains visible. The revision changes the offline cache and viewed-slate cache version so old notes and old layout settings do not carry over.

## Files

`index.html`, `styles.css`, `js/app.mjs`: interface and behavior. `js/view.mjs`: player tables and device-time formatting. `js/data.mjs`: shared parsing, ranking, notes and data orchestration. `manifest.webmanifest`, `sw.js`, `icons/`: install/offline support. `scripts/snapshot.mjs`: collector. `.github/workflows/pages.yml`: tests, collection and deployment. `tests/`: dependency-free tests and small captured fixtures. `data/`: dated fallback snapshots.

## References

- [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub schedule limitations](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [Game Score formula](https://www.basketball-reference.com/about/glossary.html)
