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
