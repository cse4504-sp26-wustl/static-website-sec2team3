import type { SiteConfig } from "@application/contracts";
import type { WebsiteState } from "@application/load-tournament-website";
import { searchPlayers } from "@application/search-players";
import type { Game, Round, Standing } from "@domain/models";

type ViewName = "home" | "standings" | "rounds";

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
  <header class="site-brand">
    ${
      config.branding.logoPath
        ? `<div class="site-brand-logo-wrap"><img class="site-brand-logo" src="${escapeHtml(
            config.branding.logoPath
          )}" alt="${escapeHtml(config.branding.siteTitle)} logo" /></div>`
        : ""
    }
    <div class="site-brand-copy">
      <p class="hero-badge">Live Tournament Hub</p>
      <h1>${escapeHtml(metadata.name || config.branding.siteTitle)}</h1>
      <p class="hero-meta">
        <span>${escapeHtml(metadata.site ?? "Location coming soon")}</span>
        <span class="meta-dot" aria-hidden="true"></span>
        <span>${escapeHtml(metadata.date ?? "Date unavailable")}</span>
      </p>
    </div>
  </header>
`;

const renderNav = (activeView: ViewName): string => `
  <nav class="nav-shell" aria-label="Tournament pages">
    <div class="nav-pills">
      <button class="nav-pill ${activeView === "home" ? "is-active" : ""}" data-view="home" type="button">Home</button>
      <button class="nav-pill ${activeView === "standings" ? "is-active" : ""}" data-view="standings" type="button">Standings</button>
      <button class="nav-pill ${activeView === "rounds" ? "is-active" : ""}" data-view="rounds" type="button">Rounds</button>
    </div>
  </nav>
`;

const renderStandingRow = (standing: Standing, showRatings: boolean): string => `
  <tr>
    <td>${standing.rank}</td>
    <td>${escapeHtml(standing.player.name)}</td>
    ${showRatings ? `<td>${escapeHtml(formatRating(standing.player.rating))}</td>` : ""}
    <td>${standing.wins}-${standing.losses}-${standing.draws}</td>
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

  return standings.map((standing) => renderStandingRow(standing, showRatings)).join("");
};

const summarizeGameResult = (game: Game): string => {
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
};

const renderGame = (game: Game): string => `
  <article class="game-card">
    <div class="game-card-head">
      <span class="game-tag">Round ${game.roundNumber}</span>
    </div>
    <div class="player-stack">
      <div class="player-line">
        <span class="player-label">White</span>
        <span class="player-name">${escapeHtml(game.white.name)}</span>
      </div>
      <div class="player-line">
        <span class="player-label">Black</span>
        <span class="player-name player-name-dark">${escapeHtml(game.black.name)}</span>
      </div>
    </div>
    <p class="result-summary">${escapeHtml(summarizeGameResult(game))}</p>
  </article>
`;

const renderRound = (round: Round): string => `
  <section class="surface-card round-card">
    <div class="section-header">
      <div>
        <p class="section-kicker">Tournament Round</p>
        <h3>Round ${round.number}</h3>
      </div>
      <span class="section-chip">${round.games.length} game${round.games.length === 1 ? "" : "s"}</span>
    </div>
    <div class="round-grid">
      ${round.games.map((game) => renderGame(game)).join("")}
    </div>
  </section>
`;

const renderHomeView = (
  data: Extract<WebsiteState, { status: "ready" }>,
  config: SiteConfig
): string => {
  const leader = data.standings[0];
  const totalPlayers = data.standings.length;
  const totalRounds = data.tournament.rounds.length;
  const allGames = data.tournament.rounds.flatMap((round) => round.games);
  const liveGames = allGames.filter((game) => game.resultType === "incomplete" || game.resultType === "unknown").length;
  const completedGames = allGames.length - liveGames;
  const latestRound = data.tournament.rounds[data.tournament.rounds.length - 1];
  const previewStandings = data.standings.slice(0, 5);
  const previewGames = latestRound ? latestRound.games.slice(0, 3) : [];

  return `
    <section class="home-stack">
      <div class="summary-hero surface-card">
        <div>
          <p class="section-kicker">Tournament Summary</p>
          <h2>Everything important at a glance</h2>
          <p class="panel-copy">
            Track leaders, live boards, and completed rounds from one place. Organizer theme colors are applied throughout the interface.
          </p>
        </div>
        <div class="theme-callout">
          <span class="theme-pill">Primary</span>
          <span class="theme-pill theme-pill-accent">Accent</span>
          <p>${escapeHtml(config.branding.primaryColor)} · ${escapeHtml(config.branding.accentColor)}</p>
        </div>
      </div>

      <div class="stat-grid">
        <article class="stat-card surface-card">
          <p class="stat-label">Leader</p>
          <p class="stat-value">${leader ? escapeHtml(leader.player.name) : "Unavailable"}</p>
          <p class="stat-meta">${leader ? `${formatPoints(leader.points)} points` : "No standings yet"}</p>
        </article>
        <article class="stat-card surface-card">
          <p class="stat-label">Players</p>
          <p class="stat-value">${totalPlayers}</p>
          <p class="stat-meta">Currently in standings</p>
        </article>
        <article class="stat-card surface-card">
          <p class="stat-label">Rounds Loaded</p>
          <p class="stat-value">${totalRounds}</p>
          <p class="stat-meta">Visible in this site</p>
        </article>
        <article class="stat-card surface-card">
          <p class="stat-label">Boards</p>
          <p class="stat-value">${completedGames}/${allGames.length}</p>
          <p class="stat-meta">${liveGames} still in progress</p>
        </article>
      </div>

      <div class="home-grid">
        <section class="surface-card">
          <div class="section-header">
            <div>
              <p class="section-kicker">Standings Snapshot</p>
              <h3>Top players</h3>
            </div>
            <span class="section-chip">Top ${previewStandings.length}</span>
          </div>
          <div class="table-wrap">
            <table class="standings-table compact-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>W-L-D</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                ${previewStandings
                  .map(
                    (standing) => `
                      <tr>
                        <td>${standing.rank}</td>
                        <td>${escapeHtml(standing.player.name)}</td>
                        <td>${standing.wins}-${standing.losses}-${standing.draws}</td>
                        <td>${formatPoints(standing.points)}</td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </section>

        <section class="surface-card">
          <div class="section-header">
            <div>
              <p class="section-kicker">Latest Activity</p>
              <h3>${latestRound ? `Round ${latestRound.number}` : "No rounds yet"}</h3>
            </div>
            ${latestRound ? `<span class="section-chip">${latestRound.games.length} games</span>` : ""}
          </div>
          ${
            previewGames.length > 0
              ? `<div class="preview-stack">${previewGames.map((game) => renderGame(game)).join("")}</div>`
              : `<p class="panel-copy">Round data will appear here once PGN files are available.</p>`
          }
        </section>
      </div>
    </section>
  `;
};

const renderStandingsView = (
  data: Extract<WebsiteState, { status: "ready" }>,
  config: SiteConfig,
  query: string
): string => `
  <section class="surface-card">
    <div class="section-header">
      <div>
        <p class="section-kicker">Tournament Standings</p>
        <h2>Leaderboard</h2>
      </div>
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
            <th>W-L-D</th>
            <th>Points</th>
            <th>Games</th>
          </tr>
        </thead>
        <tbody id="standings-body">
          ${renderStandingsBody(searchPlayers(data.standings, query), config.display.showRatings)}
        </tbody>
      </table>
    </div>
  </section>
`;

const renderRoundsView = (data: Extract<WebsiteState, { status: "ready" }>): string => `
  <section class="rounds-stack">
    <div class="surface-card intro-card">
      <div class="section-header">
        <div>
          <p class="section-kicker">Round Browser</p>
          <h2>All available rounds</h2>
        </div>
        <span class="section-chip">${data.tournament.rounds.length} loaded</span>
      </div>
      <p class="panel-copy">
        Only successfully hosted round files appear here. Future rounds remain hidden until their PGN files exist.
      </p>
    </div>
    ${data.tournament.rounds.map((round) => renderRound(round)).join("")}
  </section>
`;

const renderReadyState = (
  root: HTMLElement,
  config: SiteConfig,
  data: Extract<WebsiteState, { status: "ready" }>
): void => {
  let activeView: ViewName = "home";
  let standingsQuery = "";

  root.innerHTML = `
    <div class="page-shell">
      <div class="topbar surface-card">
        ${renderHeader(config, data.tournament.metadata)}
        <div id="nav-container" class="topbar-nav"></div>
      </div>
      <main id="page-content" class="page-content"></main>
    </div>
  `;

  const navContainer = root.querySelector<HTMLElement>("#nav-container");
  const pageContent = root.querySelector<HTMLElement>("#page-content");

  if (!navContainer || !pageContent) {
    return;
  }

  const bindNavEvents = (): void => {
    root.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextView = button.dataset.view as ViewName | undefined;
        if (!nextView || nextView === activeView) {
          return;
        }

        activeView = nextView;
        renderCurrentView();
      });
    });
  };

  const bindStandingsEvents = (): void => {
    const searchInput = root.querySelector<HTMLInputElement>("#player-search");
    const standingsBody = root.querySelector<HTMLTableSectionElement>("#standings-body");

    if (!searchInput || !standingsBody) {
      return;
    }

    searchInput.addEventListener("input", (event) => {
      standingsQuery = (event.target as HTMLInputElement).value;
      standingsBody.innerHTML = renderStandingsBody(
        searchPlayers(data.standings, standingsQuery),
        config.display.showRatings
      );
    });
  };

  const renderCurrentView = (): void => {
    navContainer.innerHTML = renderNav(activeView);

    switch (activeView) {
      case "home":
        pageContent.innerHTML = renderHomeView(data, config);
        break;
      case "standings":
        pageContent.innerHTML = renderStandingsView(data, config, standingsQuery);
        break;
      case "rounds":
        pageContent.innerHTML = renderRoundsView(data);
        break;
    }

    bindNavEvents();

    if (activeView === "standings") {
      bindStandingsEvents();
    }
  };

  renderCurrentView();
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
