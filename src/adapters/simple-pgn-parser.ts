import type { ParsedPgnGame, ParsedRound, PgnParser } from "@application/contracts";

const HEADER_PATTERN = /^\[(\w+)\s+"(.*)"\]$/;

const splitGames = (pgnText: string): string[] =>
  pgnText
    .trim()
    .split(/\n\s*\n(?=\[Event|\[Site|\[Date|\[Round|\[White|\[Black|\[Result)/)
    .map((game) => game.trim())
    .filter(Boolean);

const parseHeaders = (gameText: string): Record<string, string> => {
  const headers: Record<string, string> = {};

  for (const line of gameText.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("[")) {
      break;
    }

    const match = HEADER_PATTERN.exec(trimmed);
    if (!match) {
      throw new Error(`Malformed PGN header: ${trimmed}`);
    }

    headers[match[1]] = match[2];
  }

  return headers;
};

const validateRequiredHeaders = (headers: Record<string, string>): void => {
  const required = ["Event", "Site", "Date", "Round", "White", "Black", "Result"];
  for (const key of required) {
    if (!headers[key]) {
      throw new Error(`PGN game is missing required header: ${key}`);
    }
  }
};

export class SimplePgnParser implements PgnParser {
  parseRound(pgnText: string, fallbackRoundNumber: number): ParsedRound {
    const games = splitGames(pgnText).map((gameText): ParsedPgnGame => {
      const headers = parseHeaders(gameText);
      validateRequiredHeaders(headers);
      return { headers };
    });

    if (games.length === 0) {
      throw new Error("PGN round file contained no games.");
    }

    const firstHeaders = games[0].headers;

    return {
      roundNumber: Number(firstHeaders.Round) || fallbackRoundNumber,
      metadata: {
        name: firstHeaders.Event,
        site: firstHeaders.Site,
        date: firstHeaders.Date
      },
      games
    };
  }
}
