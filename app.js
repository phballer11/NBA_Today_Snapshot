const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

const dateInput = document.querySelector("#game-date");
const previousButton = document.querySelector("#previous-day");
const nextButton = document.querySelector("#next-day");
const refreshButton = document.querySelector("#refresh");
const selectedDate = document.querySelector("#selected-date");
const gameCount = document.querySelector("#game-count");
const statusMessage = document.querySelector("#status-message");
const gameList = document.querySelector("#game-list");

let activeRequest;

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromInput(value) {
  return new Date(`${value}T12:00:00`);
}

function formatSelectedDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(dateFromInput(value));
}

function setMessage(message) {
  statusMessage.textContent = message;
  statusMessage.hidden = false;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function displayScore(competitor) {
  return competitor.score === undefined ? "—" : competitor.score;
}

function recordFor(competitor) {
  const record = competitor.records?.[0]?.summary;
  return record ? `Record ${record}` : "";
}

function makeTeamRow(competitor, isWinner) {
  const row = createElement("div", `team-row${isWinner ? " is-winner" : ""}`);
  const info = createElement("div", "team-info");
  const abbreviation = competitor.team?.abbreviation || competitor.team?.shortDisplayName?.slice(0, 3) || "NBA";
  const mark = createElement("span", "team-mark", abbreviation);
  mark.setAttribute("aria-hidden", "true");

  const details = createElement("div", "team-details");
  details.append(createElement("div", "team-name", competitor.team?.displayName || competitor.team?.name || "Team"));
  const record = recordFor(competitor);
  if (record) details.append(createElement("div", "team-record", record));

  info.append(mark, details);
  row.append(info, createElement("span", "team-score", displayScore(competitor)));
  return row;
}

function makeGameCard(event) {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors || [];
  const home = competitors.find((competitor) => competitor.homeAway === "home") || competitors[0];
  const away = competitors.find((competitor) => competitor.homeAway === "away") || competitors[1];
  if (!home || !away) return null;

  const completed = event.status?.type?.completed === true;
  const homeScore = Number(home.score);
  const awayScore = Number(away.score);
  const header = createElement("div", "game-header");
  const date = new Date(event.date);
  const time = Number.isNaN(date.getTime())
    ? "Time TBD"
    : new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
  header.append(createElement("span", "game-time", time));

  const statusText = event.status?.type?.shortDetail || event.status?.type?.detail || "Scheduled";
  const status = createElement("span", "game-status", statusText);
  if (event.status?.type?.state === "in") status.classList.add("is-live");
  if (completed) status.classList.add("is-final");
  header.append(status);

  const card = createElement("article", "game-card");
  card.setAttribute("aria-label", `${away.team?.displayName || "Away team"} at ${home.team?.displayName || "Home team"}`);
  card.append(
    header,
    makeTeamRow(away, completed && Number.isFinite(awayScore) && awayScore > homeScore),
    makeTeamRow(home, completed && Number.isFinite(homeScore) && homeScore > awayScore),
  );

  const venue = competition.venue?.fullName;
  const broadcast = competition.broadcasts?.[0]?.names?.[0];
  const footer = createElement("div", "game-footer");
  footer.append(createElement("span", "", venue || "NBA"));
  footer.append(createElement("span", "", broadcast || ""));
  card.append(footer);
  return card;
}

function renderGames(events) {
  gameList.replaceChildren();
  const cards = events.map(makeGameCard).filter(Boolean);
  gameCount.textContent = `(${cards.length})`;
  if (cards.length === 0) {
    setMessage("No games scheduled for this date.");
    return;
  }
  statusMessage.hidden = true;
  gameList.append(...cards);
}

async function loadGames() {
  const date = dateInput.value;
  if (!date) return;

  activeRequest?.abort();
  const controller = new AbortController();
  activeRequest = controller;
  refreshButton.disabled = true;
  gameList.replaceChildren();
  gameCount.textContent = "";
  selectedDate.textContent = formatSelectedDate(date);
  setMessage("Loading games…");

  try {
    const response = await fetch(`${SCOREBOARD_URL}?dates=${date.replaceAll("-", "")}`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`ESPN returned ${response.status}`);
    const scoreboard = await response.json();
    if (!Array.isArray(scoreboard.events)) throw new Error("ESPN returned an unexpected scoreboard.");
    renderGames(scoreboard.events);
  } catch (error) {
    if (error.name === "AbortError") return;
    gameCount.textContent = "";
    setMessage("Couldn't load the scoreboard. Check your connection and try again.");
  } finally {
    if (activeRequest === controller) {
      activeRequest = undefined;
      refreshButton.disabled = false;
    }
  }
}

function shiftDate(days) {
  const date = dateFromInput(dateInput.value);
  date.setDate(date.getDate() + days);
  dateInput.value = localDateString(date);
  loadGames();
}

dateInput.value = localDateString(new Date());
dateInput.addEventListener("change", loadGames);
previousButton.addEventListener("click", () => shiftDate(-1));
nextButton.addEventListener("click", () => shiftDate(1));
refreshButton.addEventListener("click", loadGames);
loadGames();
