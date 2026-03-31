import type { SiteConfig } from "@application/contracts";
import { searchPlayers } from "@application/search-players";
import type { Game, Round, Standing } from "@domain/models";
import type { WebsiteState } from "@application/load-tournament-website";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");

const formatPoints = (points: number): string =>
  Number.isInteger(points) ? String(points) : points.toFixed(1);

const formatRating = (rating?: number): string => (rating ? String(rating) : "NA");

const applyTheme = (config: SiteConfig): void => {
  document.documentElement.style.setProperty("--color-primary", config.branding.primaryColor);
  document.documentElement.style.setProperty("--color-accent", config.branding.accentColor);
};

const renderHeader = (
  config: SiteConfig,
  metadata: { name: string; site?: string; date?: string }
): string => `
  <header class="hero">
    <div class="hero-copy">
      <p class="eyebrow">Static tournament website</p>
      <h1>${escapeHtml(metadata.name || config.branding.siteTitle)}</h1>
      <p class="hero-meta">
        ${escapeHtml(metadata.site ?? "Location coming soon")}
        <span aria-hidden="true">•</span>
        ${escapeHtml(metadata.date ?? "Date unavailable")}
      </p>
    </div>
    ${
      config.branding.logoPath
        ? `<img class="hero-logo" src="${escapeHtml(config.branding.logoPath)}" alt="${escapeHtml(
            config.branding.siteTitle
          )} logo" />`
        : ""
    }
  </header>
`;

const renderStandingRow = (standing: Standing, showRatings: boolean): string => `
  <tr>
    <td>${standing.rank}</td>
    <td>${escapeHtml(standing.player.name)}</td>
    ${showRatings ? `<td>${escapeHtml(formatRating(standing.player.rating))}</td>` : ""}
    <td>${standing.wins}-${standing.losses}</td>
    <td>${formatPoints(standing.points)}</td>
    <td>${standing.gamesPlayed}</td>
  </tr>
`;

const renderStandingsBody = (
  standings: Standing[],
  showRatings: boolean
): string => {
  if (standings.length === 0) {
    return `<tr><td colspan="${showRatings ? 6 : 5}">No matching players found.</td></tr>`;
  }

  return standings
    .map((standing) => renderStandingRow(standing, showRatings))
    .join("");
};

const renderGame = (game: Game): string => {
  const resultSummary = (() => {
    switch (game.resultType) {
      case "white-win":
        return `Winner: ${game.white.name}`;
      case "black-win":
        return `Winner: ${game.black.name}`;
      case "draw":
        return "Draw";
      case "bye":
        return `Bye: ${game.white.name}`;
      case "forfeit-white-win":
        return `Winner by forfeit: ${game.white.name}`;
      case "forfeit-black-win":
        return `Winner by forfeit: ${game.black.name}`;
      case "incomplete":
        return "In progress";
      case "unknown":
        return "Result unavailable";
    }
  })();

  return `
    <article class="game-card">
      <div class="player-row">
        <span class="player player-white">White: ${escapeHtml(game.white.name)}</span>
      </div>
      <div class="player-row">
        <span class="player player-black">Black: ${escapeHtml(game.black.name)}</span>
      </div>
      <p class="result-summary">${escapeHtml(resultSummary)}</p>
    </article>
  `;
};

const renderRound = (round: Round): string => `
  <section class="panel">
    <div class="panel-header">
      <h3>Round ${round.number}</h3>
      <p>${round.games.length} game${round.games.length === 1 ? "" : "s"}</p>
    </div>
    <div class="round-grid">
      ${round.games.map((game) => renderGame(game)).join("")}
    </div>
  </section>
`;

const renderReadyState = (
  root: HTMLElement,
  config: SiteConfig,
  data: Extract<WebsiteState, { status: "ready" }>
): void => {
  root.innerHTML = `
    <div class="page-shell">
      ${renderHeader(config, data.tournament.metadata)}
      <main class="content-grid">
        <section class="panel">
          <div class="panel-header">
            <h2>Standings</h2>
            <label class="search-field">
              <span>Search players</span>
              <input id="player-search" type="search" placeholder="Find a player" />
            </label>
          </div>
          <div class="table-wrap">
            <table class="standings-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  ${config.display.showRatings ? "<th>Rating</th>" : ""}
                  <th>W-L</th>
                  <th>Points</th>
                  <th>Games</th>
                </tr>
              </thead>
              <tbody id="standings-body">
                ${renderStandingsBody(data.standings, config.display.showRatings)}
              </tbody>
            </table>
          </div>
        </section>
        <section class="rounds-stack">
          <div class="panel">
            <div class="panel-header">
              <h2>Rounds</h2>
              <p>${data.tournament.rounds.length} loaded</p>
            </div>
            <p class="panel-copy">
              Future rounds stay hidden until a hosted PGN file is available.
            </p>
          </div>
          ${data.tournament.rounds.map((round) => renderRound(round)).join("")}
        </section>
      </main>
    </div>
  `;

  const searchInput = root.querySelector<HTMLInputElement>("#player-search");
  const standingsBody = root.querySelector<HTMLTableSectionElement>("#standings-body");

  if (!searchInput || !standingsBody) {
    return;
  }

  searchInput.addEventListener("input", (event) => {
    const query = (event.target as HTMLInputElement).value;
    const filteredStandings = searchPlayers(data.standings, query);
    standingsBody.innerHTML = renderStandingsBody(filteredStandings, config.display.showRatings);
  });
};

export const renderWebsite = (root: HTMLElement, state: WebsiteState, config?: SiteConfig): void => {
  if (config) {
    applyTheme(config);
  }

  if (state.status === "loading") {
    root.innerHTML = `<div class="center-state"><p>Loading tournament website...</p></div>`;
    return;
  }

  if (state.status === "unavailable" || state.status === "malformed") {
    root.innerHTML = `<div class="center-state"><h1>Unable to load tournament</h1><p>${escapeHtml(
      state.message
    )}</p></div>`;
    return;
  }

  if (state.status === "empty") {
    applyTheme(state.config);
    root.innerHTML = `
      <div class="center-state">
        <h1>${escapeHtml(state.config.branding.siteTitle)}</h1>
        <p>No round PGN files are available yet. Add hosted files to ${escapeHtml(
          state.config.dataSource.pgnBasePath
        )} and refresh the page.</p>
      </div>
    `;
    return;
  }

  applyTheme(state.config);
  renderReadyState(root, state.config, state);
};
