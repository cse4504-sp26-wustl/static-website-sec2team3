import { describe, expect, it } from "vitest";
import { loadTournamentWebsite } from "@application/load-tournament-website";
import type { PgnParser, RoundSource, SiteConfigRepository } from "@application/contracts";

const configRepository: SiteConfigRepository = {
  load: async () => ({
    branding: {
      siteTitle: "Test Event",
      primaryColor: "#111111",
      accentColor: "#222222"
    },
    dataSource: {
      pgnBasePath: "/data",
      roundFilePattern: "round{n}.pgn",
      maxRounds: 4
    },
    scoring: {
      win: 1,
      draw: 0.5,
      loss: 0,
      bye: 1,
      forfeitWin: 1,
      forfeitLoss: 0
    },
    display: {
      showRatings: true
    }
  })
};

describe("loadTournamentWebsite", () => {
  it("returns ready state when rounds are available", async () => {
    const roundSource: RoundSource = {
      loadRound: async (roundNumber) => (roundNumber === 1 ? "round-1" : null)
    };

    const parser: PgnParser = {
      parseRound: () => ({
        roundNumber: 1,
        metadata: {
          name: "Test Event",
          site: "St. Louis",
          date: "2026.03.30"
        },
        games: [
          {
            roundNumber: 1,
            white: { name: "Alice" },
            black: { name: "Ben" },
            resultType: "white-win",
            rawResult: "1-0",
            statusLabel: "1-0"
          }
        ]
      })
    };

    const state = await loadTournamentWebsite({ configRepository, roundSource, parser });
    expect(state.status).toBe("ready");
    if (state.status === "ready") {
      expect(state.tournament.rounds).toHaveLength(1);
      expect(state.standings[0].player.name).toBe("Alice");
    }
  });

  it("returns empty state when no rounds are present", async () => {
    const roundSource: RoundSource = {
      loadRound: async () => null
    };

    const parser: PgnParser = {
      parseRound: () => {
        throw new Error("should not be called");
      }
    };

    const state = await loadTournamentWebsite({ configRepository, roundSource, parser });
    expect(state.status).toBe("empty");
  });
});
