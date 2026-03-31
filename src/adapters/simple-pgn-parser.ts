import type { ParsedPgnGame, ParsedRound, PgnParser } from "@application/contracts";
import type { ResultType } from "@domain/models";

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

const sanitizePlayerName = (name: string | undefined, fallback: string): string =>
  name?.trim() ? name.trim() : fallback;

const parseOptionalNumber = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const looksLikeBye = (name: string): boolean => name.trim().toLocaleLowerCase() === "bye";

const deriveResultType = (headers: Record<string, string>): ResultType => {
  const result = headers.Result?.trim();
  const whiteName = headers.White ?? "";
  const blackName = headers.Black ?? "";
  const termination = headers.Termination?.toLocaleLowerCase() ?? "";

  if (looksLikeBye(whiteName) || looksLikeBye(blackName) || termination.includes("bye")) {
    return "bye";
  }

  if (result === "*") {
    return "incomplete";
  }

  if (termination.includes("forfeit")) {
    if (result === "1-0") {
      return "forfeit-white-win";
    }
    if (result === "0-1") {
      return "forfeit-black-win";
    }
  }

  if (result === "1-0") {
    return "white-win";
  }
  if (result === "0-1") {
    return "black-win";
  }
  if (result === "1/2-1/2") {
    return "draw";
  }

  return "unknown";
};

const statusLabelForGame = (resultType: ResultType): string => {
  switch (resultType) {
    case "white-win":
      return "1-0";
    case "black-win":
      return "0-1";
    case "draw":
      return "1/2-1/2";
    case "bye":
      return "Bye";
    case "forfeit-white-win":
      return "White wins by forfeit";
    case "forfeit-black-win":
      return "Black wins by forfeit";
    case "incomplete":
      return "In progress";
    case "unknown":
      return "Unknown";
  }
};

const toParsedGame = (headers: Record<string, string>, fallbackRoundNumber: number): ParsedPgnGame => {
  const resultType = deriveResultType(headers);
  return {
    roundNumber: Number(headers.Round) || fallbackRoundNumber,
    white: {
      name: sanitizePlayerName(headers.White, "Unknown White"),
      rating: parseOptionalNumber(headers.WhiteElo),
      federationId: headers.WhiteUSCF
    },
    black: {
      name: resultType === "bye"
        ? sanitizePlayerName(headers.Black, "BYE")
        : sanitizePlayerName(headers.Black, "Unknown Black"),
      rating: parseOptionalNumber(headers.BlackElo),
      federationId: headers.BlackUSCF
    },
    resultType,
    rawResult: headers.Result ?? "*",
    statusLabel: statusLabelForGame(resultType)
  };
};

export class SimplePgnParser implements PgnParser {
  parseRound(pgnText: string, fallbackRoundNumber: number): ParsedRound {
    const games = splitGames(pgnText).map((gameText): ParsedPgnGame => {
      const headers = parseHeaders(gameText);
      validateRequiredHeaders(headers);
      return toParsedGame(headers, fallbackRoundNumber);
    });

    if (games.length === 0) {
      throw new Error("PGN round file contained no games.");
    }

    const firstHeaders = parseHeaders(splitGames(pgnText)[0]);

    return {
      roundNumber: games[0].roundNumber || fallbackRoundNumber,
      metadata: {
        name: firstHeaders.Event,
        site: firstHeaders.Site,
        date: firstHeaders.Date
      },
      games
    };
  }
}
