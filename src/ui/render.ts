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

const normalize = (value: string): string => value.trim().toLocaleLowerCase();

const formatPoints = (points: number): string =>
  Number.isInteger(points) ? String(points) : points.toFixed(1);

const formatRating = (rating?: number): string => (rating ? String(rating) : "NA");

const applyTheme = (config: SiteConfig): void => {
  document.documentElement.style.setProperty("--color-primary", config.branding.primaryColor);
  document.documentElement.style.setProperty("--color-accent", config.branding.accentColor);
};

const renderSponsors = (paths: string[]): string => {
  if (paths.length === 0) {
    return "";
  }

  return `
    <div class="sponsor-strip">
      ${paths
        .map(
          (path) => `<img class="sponsor-logo" src="${escapeHtml(path)}" alt="Sponsor logo" loading="lazy" />`
        )
        .join("")}
    </div>
  `;
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
  ${renderSponsors(config.branding.sponsorLogoPaths)}
`;

const renderStandingRow = (standing: Standing, showRatings: boolean): string => `
  <tr>
    <td>${standing.rank}</td>
    <td>${escapeHtml(standing.player.name)}</td>
    ${showRatings ? `<td>${escapeHtml(formatRating(standing.player.rating))}</td>` : ""}
    <td>${formatPoints(standing.points)}</td>
    <td>${standing.gamesPlayed}</td>
  </tr>
`;

const highlightMatch = (playerName: string, query: string): string => {
  if (!query) {
    return escapeHtml(playerName);
  }

  const normalizedName = normalize(playerName);
  const normalizedQuery = normalize(query);
  const index = normalizedName.indexOf(normalizedQuery);

  if (index === -1) {
    return escapeHtml(playerName);
  }

  const before = escapeHtml(playerName.slice(0, index));
  const match = escapeHtml(playerName.slice(index, index + query.length));
  const after = escapeHtml(playerName.slice(index + query.length));
  return `${before}<mark>${match}</mark>${after}`;
};

const renderGame = (game: Game, query: string, highlightMatchingGames: boolean): string => {
  const whiteName = highlightMatchingGames ? highlightMatch(game.white.name, query) : escapeHtml(game.white.name);
  const blackName = highlightMatchingGames ? highlightMatch(game.black.name, query) : escapeHtml(game.black.name);
  const isMatch =
    query &&
    (normalize(game.white.name).includes(normalize(query)) || normalize(game.black.name).includes(normalize(query)));

  return `
    <article class="game-card ${isMatch ? "is-highlighted" : ""}">
      <div class="player-row">
        <span class="player player-white">${whiteName}</span>
        <span class="result-badge">${escapeHtml(game.statusLabel)}</span>
      </div>
      <div class="player-row">
        <span class="player player-black">${blackName}</span>
        <span class="result-raw">${escapeHtml(game.rawResult)}</span>
      </div>
    </article>
  `;
};

const renderRound = (round: Round, query: string, highlightMatchingGames: boolean): string => `
  <section class="panel">
    <div class="panel-header">
      <h3>Round ${round.number}</h3>
      <p>${round.games.length} game${round.games.length === 1 ? "" : "s"}</p>
    </div>
    <div class="round-grid">
      ${round.games.map((game) => renderGame(game, query, highlightMatchingGames)).join("")}
    </div>
  </section>
`;

const renderReadyState = (
  root: HTMLElement,
  config: SiteConfig,
  data: Extract<WebsiteState, { status: "ready" }>
): void => {
  let query = "";

  const rerender = (): void => {
    const filteredStandings = searchPlayers(data.standings, query);
    root.innerHTML = `
      <div class="page-shell">
        ${renderHeader(config, data.tournament.metadata)}
        <main class="content-grid">
          <section class="panel">
            <div class="panel-header">
              <h2>Standings</h2>
              <label class="search-field">
                <span>Search players</span>
                <input id="player-search" type="search" placeholder="Find a player" value="${escapeHtml(query)}" />
              </label>
            </div>
            <div class="table-wrap">
              <table class="standings-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    ${config.display.showRatings ? "<th>Rating</th>" : ""}
                    <th>Points</th>
                    <th>Games</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    filteredStandings.length > 0
                      ? filteredStandings
                          .map((standing) => renderStandingRow(standing, config.display.showRatings))
                          .join("")
                      : `<tr><td colspan="${config.display.showRatings ? 5 : 4}">No matching players found.</td></tr>`
                  }
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
            ${data.tournament.rounds
              .map((round) => renderRound(round, query, config.display.highlightMatchingGames))
              .join("")}
          </section>
        </main>
      </div>
    `;

    const searchInput = root.querySelector<HTMLInputElement>("#player-search");
    if (searchInput) {
      searchInput.addEventListener("input", (event) => {
        query = (event.target as HTMLInputElement).value;
        rerender();
      });
    }
  };

  rerender();
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
