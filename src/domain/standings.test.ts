import { describe, expect, it } from "vitest";
import { computeStandings } from "@domain/standings";
import type { Round, ScoringRules } from "@domain/models";

const scoring: ScoringRules = {
  win: 1,
  draw: 0.5,
  loss: 0,
  bye: 1,
  forfeitWin: 1,
  forfeitLoss: 0
};

describe("computeStandings", () => {
  it("accumulates multi-round records, points, and games correctly", () => {
    const rounds: Round[] = [
      {
        number: 1,
        games: [
          {
            id: "r1-g1",
            roundNumber: 1,
            white: { name: "Alice" },
            black: { name: "Ben" },
            resultType: "white-win",
            rawResult: "1-0",
            statusLabel: "1-0"
          },
          {
            id: "r1-g2",
            roundNumber: 1,
            white: { name: "Carla" },
            black: { name: "Dan" },
            resultType: "draw",
            rawResult: "1/2-1/2",
            statusLabel: "1/2-1/2"
          }
        ]
      },
      {
        number: 2,
        games: [
          {
            id: "r2-g1",
            roundNumber: 2,
            white: { name: "Alice" },
            black: { name: "Carla" },
            resultType: "draw",
            rawResult: "1/2-1/2",
            statusLabel: "1/2-1/2"
          },
          {
            id: "r2-g2",
            roundNumber: 2,
            white: { name: "Ben" },
            black: { name: "Dan" },
            resultType: "forfeit-white-win",
            rawResult: "1-0",
            statusLabel: "White wins by forfeit"
          }
        ]
      }
    ];

    const standings = computeStandings(rounds, scoring);
    expect(standings.map((standing) => ({
      player: standing.player.name,
      points: standing.points,
      record: `${standing.wins}-${standing.losses}-${standing.draws}`,
      games: standing.gamesPlayed
    }))).toEqual([
      { player: "Alice", points: 1.5, record: "1-0-1", games: 2 },
      { player: "Ben", points: 1, record: "1-1-0", games: 2 },
      { player: "Carla", points: 1, record: "0-0-2", games: 2 },
      { player: "Dan", points: 0.5, record: "0-1-1", games: 2 }
    ]);
  });

  it("scores wins, draws, byes, and forfeits", () => {
    const rounds: Round[] = [
      {
        number: 1,
        games: [
          {
            id: "g1",
            roundNumber: 1,
            white: { name: "Alice" },
            black: { name: "Ben" },
            resultType: "white-win",
            rawResult: "1-0",
            statusLabel: "1-0"
          },
          {
            id: "g2",
            roundNumber: 1,
            white: { name: "Carla" },
            black: { name: "Dan" },
            resultType: "draw",
            rawResult: "1/2-1/2",
            statusLabel: "1/2-1/2"
          },
          {
            id: "g3",
            roundNumber: 1,
            white: { name: "Eva" },
            black: { name: "BYE" },
            resultType: "bye",
            rawResult: "1-0",
            statusLabel: "Bye"
          },
          {
            id: "g4",
            roundNumber: 1,
            white: { name: "Finn" },
            black: { name: "Gray" },
            resultType: "forfeit-black-win",
            rawResult: "0-1",
            statusLabel: "Black wins by forfeit"
          }
        ]
      }
    ];

    const standings = computeStandings(rounds, scoring);
    expect(standings.map((standing) => [standing.player.name, standing.points])).toEqual([
      ["Alice", 1],
      ["Eva", 1],
      ["Gray", 1],
      ["Carla", 0.5],
      ["Dan", 0.5],
      ["Ben", 0],
      ["Finn", 0]
    ]);
    expect(standings.map((standing) => [standing.player.name, `${standing.wins}-${standing.losses}-${standing.draws}`])).toEqual([
      ["Alice", "1-0-0"],
      ["Eva", "0-0-0"],
      ["Gray", "1-0-0"],
      ["Carla", "0-0-1"],
      ["Dan", "0-0-1"],
      ["Ben", "0-1-0"],
      ["Finn", "0-1-0"]
    ]);
    expect(standings.find((standing) => standing.player.name === "Eva")?.gamesPlayed).toBe(0);
  });

  it("awards bye points without changing wins, losses, draws, or games played", () => {
    const standings = computeStandings(
      [
        {
          number: 1,
          games: [
            {
              id: "g1",
              roundNumber: 1,
              white: { name: "Alice" },
              black: { name: "BYE" },
              resultType: "bye",
              rawResult: "1-0",
              statusLabel: "Bye"
            }
          ]
        }
      ],
      scoring
    );

    expect(standings).toEqual([
      expect.objectContaining({
        player: expect.objectContaining({ name: "Alice" }),
        points: 1,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0
      })
    ]);
  });

  it("tracks draws in the record without adding wins or losses", () => {
    const standings = computeStandings(
      [
        {
          number: 1,
          games: [
            {
              id: "g1",
              roundNumber: 1,
              white: { name: "Alice" },
              black: { name: "Ben" },
              resultType: "draw",
              rawResult: "1/2-1/2",
              statusLabel: "1/2-1/2"
            }
          ]
        }
      ],
      scoring
    );

    expect(standings.map((standing) => ({
      player: standing.player.name,
      record: `${standing.wins}-${standing.losses}-${standing.draws}`,
      points: standing.points,
      games: standing.gamesPlayed
    }))).toEqual([
      { player: "Alice", record: "0-0-1", points: 0.5, games: 1 },
      { player: "Ben", record: "0-0-1", points: 0.5, games: 1 }
    ]);
  });

  it("orders tied players deterministically by player name", () => {
    const standings = computeStandings(
      [
        {
          number: 1,
          games: [
            {
              id: "g1",
              roundNumber: 1,
              white: { name: "Zoe" },
              black: { name: "Alice" },
              resultType: "incomplete",
              rawResult: "*",
              statusLabel: "In progress"
            }
          ]
        }
      ],
      scoring
    );

    expect(standings.map((standing) => standing.player.name)).toEqual(["Alice", "Zoe"]);
  });

  it("counts forfeit results as points and played results in the record", () => {
    const standings = computeStandings(
      [
        {
          number: 1,
          games: [
            {
              id: "g1",
              roundNumber: 1,
              white: { name: "Alice" },
              black: { name: "Ben" },
              resultType: "forfeit-black-win",
              rawResult: "0-1",
              statusLabel: "Black wins by forfeit"
            }
          ]
        }
      ],
      scoring
    );

    expect(standings.map((standing) => ({
      player: standing.player.name,
      record: `${standing.wins}-${standing.losses}-${standing.draws}`,
      points: standing.points,
      games: standing.gamesPlayed
    }))).toEqual([
      { player: "Ben", record: "1-0-0", points: 1, games: 1 },
      { player: "Alice", record: "0-1-0", points: 0, games: 1 }
    ]);
  });

  it("ignores incomplete games when calculating points", () => {
    const standings = computeStandings(
      [
        {
          number: 1,
          games: [
            {
              id: "g1",
              roundNumber: 1,
              white: { name: "Alice" },
              black: { name: "Ben" },
              resultType: "incomplete",
              rawResult: "*",
              statusLabel: "In progress"
            }
          ]
        }
      ],
      scoring
    );

    expect(standings.map((standing) => standing.points)).toEqual([0, 0]);
    expect(standings.map((standing) => standing.gamesPlayed)).toEqual([0, 0]);
    expect(standings.map((standing) => `${standing.wins}-${standing.losses}-${standing.draws}`)).toEqual(["0-0-0", "0-0-0"]);
  });
});
