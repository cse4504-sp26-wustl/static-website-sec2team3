import { describe, expect, it } from "vitest";
import { SimplePgnParser } from "@adapters/simple-pgn-parser";

describe("SimplePgnParser", () => {
  it("parses a valid round file", () => {
    const parser = new SimplePgnParser();
    const parsed = parser.parseRound(
      `[Event "Test"]\n[Site "Somewhere"]\n[Date "2026.03.30"]\n[Round "1"]\n[White "Alice"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 1-0`,
      1
    );

    expect(parsed.roundNumber).toBe(1);
    expect(parsed.games).toHaveLength(1);
    expect(parsed.metadata.name).toBe("Test");
    expect(parsed.games[0].white.name).toBe("Alice");
    expect(parsed.games[0].resultType).toBe("white-win");
  });

  it("parses a round file with shared event headers and per-game pairings", () => {
    const parser = new SimplePgnParser();
    const parsed = parser.parseRound(
      `[Event "Feature 2 Swiss Tournament (GUI)"]\n[Site "Team Chess GUI"]\n[Date "2026-04-07"]\n[Round "1"]\n\n[White "Alice Carter"]\n[Black "Gabriela Silva"]\n[Result "1-0"]\n\n1-0\n\n[White "Daniel Kim"]\n[Black "Jonah Brooks"]\n[Result "*"]\n\n*`,
      1
    );

    expect(parsed.roundNumber).toBe(1);
    expect(parsed.metadata.name).toBe("Feature 2 Swiss Tournament (GUI)");
    expect(parsed.metadata.site).toBe("Team Chess GUI");
    expect(parsed.games).toHaveLength(2);
    expect(parsed.games[0].white.name).toBe("Alice Carter");
    expect(parsed.games[0].resultType).toBe("white-win");
    expect(parsed.games[1].black.name).toBe("Jonah Brooks");
    expect(parsed.games[1].resultType).toBe("incomplete");
  });

  it("parses richer PGN tags, escaped values, and comment-only result bodies", () => {
    const parser = new SimplePgnParser();
    const parsed = parser.parseRound(
      `[Event "St. Louis \\"Open\\""]\n[Site "Hall \\\\ A"]\n[Date "2026.04.14"]\n[EventDate "2026.04.14"]\n[Round "1"]\n\n[Board "4"]\n[White "Alice"]\n[Black "BYE"]\n[WhiteElo "1850"]\n[BlackElo "?"]\n[WhiteExternalId "W-1"]\n[BlackExternalId "?"]\n[Termination "bye"]\n[Result "1-0"]\n\n{White receives a bye} 1-0\n\n[Board "2"]\n[White "Bob"]\n[Black "Carol"]\n[WhiteElo "1700"]\n[BlackElo "1680"]\n[WhiteExternalId "W-2"]\n[BlackExternalId "B-2"]\n[Termination "forfeit"]\n[Result "*"]\n\n{Game declared double forfeit} *`,
      1
    );

    expect(parsed.metadata.name).toBe('St. Louis "Open"');
    expect(parsed.metadata.site).toBe("Hall \\ A");
    expect(parsed.metadata.eventDate).toBe("2026.04.14");
    expect(parsed.games).toHaveLength(2);
    expect(parsed.games[0].boardNumber).toBe(4);
    expect(parsed.games[0].white.externalId).toBe("W-1");
    expect(parsed.games[0].black.name).toBe("BYE");
    expect(parsed.games[0].black.rating).toBeUndefined();
    expect(parsed.games[0].resultType).toBe("bye");
    expect(parsed.games[0].statusLabel).toBe("White receives a bye");
    expect(parsed.games[1].boardNumber).toBe(2);
    expect(parsed.games[1].resultType).toBe("double-forfeit");
    expect(parsed.games[1].statusLabel).toBe("Game declared double forfeit");
    expect(parsed.games[1].leadingComment).toBe("Game declared double forfeit");
  });

  it("throws when required headers are missing", () => {
    const parser = new SimplePgnParser();
    expect(() =>
      parser.parseRound(`[Event "Test"]\n[White "Alice"]\n[Result "1-0"]`, 1)
    ).toThrow(/missing required header/i);
  });
});
