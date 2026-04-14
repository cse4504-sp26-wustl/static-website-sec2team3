import type { ParsedPgnGame, ParsedRound, PgnParser } from "@application/contracts";
import type { ResultType } from "@domain/models";

const HEADER_PATTERN = /^\[(\w+)\s+"((?:\\.|[^"\\])*)"\]$/;

const splitGames = (pgnText: string): string[] =>
  pgnText
    .trim()
    .split(/\n\s*\n(?=\[)/)
    .map((game) => game.trim())
    .filter(Boolean);

const unescapeTagValue = (value: string): string => value.replace(/\\(["\\])/g, "$1");

const parseGameSections = (gameText: string): { headers: Record<string, string>; body: string } => {
  const headers: Record<string, string> = {};
  const lines = gameText.split("\n");
  let bodyStartIndex = lines.length;

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("[")) {
      bodyStartIndex = index;
      break;
    }

    const match = HEADER_PATTERN.exec(trimmed);
    if (!match) {
      throw new Error(`Malformed PGN header: ${trimmed}`);
    }

    headers[match[1]] = unescapeTagValue(match[2]);
  }

  return {
    headers,
    body: lines
      .slice(bodyStartIndex)
      .join("\n")
      .trim()
  };
};

const hasBodyContent = (gameText: string): boolean =>
  gameText.split("\n").some((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith("[");
  });

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

const sanitizeOptionalText = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "?" ? trimmed : undefined;
};

const parseOptionalNumber = (value: string | undefined): number | undefined => {
  const sanitized = sanitizeOptionalText(value);
  if (!sanitized) {
    return undefined;
  }

  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const looksLikeBye = (name: string): boolean => name.trim().toLocaleLowerCase() === "bye";

const extractLeadingComment = (body: string): string | undefined => {
  const match = /^\s*\{([^}]*)\}/s.exec(body);
  return match?.[1].trim() || undefined;
};

const deriveResultType = (headers: Record<string, string>, leadingComment: string | undefined): ResultType => {
  const result = headers.Result?.trim();
  const whiteName = headers.White ?? "";
  const blackName = headers.Black ?? "";
  const termination = headers.Termination?.toLocaleLowerCase() ?? "";
  const normalizedComment = leadingComment?.toLocaleLowerCase() ?? "";

  if (looksLikeBye(whiteName) || looksLikeBye(blackName) || termination.includes("bye")) {
    return "bye";
  }

  if (termination.includes("forfeit") || normalizedComment.includes("forfeit")) {
    if (result === "1-0") {
      return "forfeit-white-win";
    }
    if (result === "0-1") {
      return "forfeit-black-win";
    }
    if (result === "*" || normalizedComment.includes("double forfeit")) {
      return "double-forfeit";
    }
  }

  if (result === "*") {
    return "incomplete";
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

const statusLabelForGame = (resultType: ResultType, leadingComment: string | undefined): string => {
  if (leadingComment) {
    return leadingComment;
  }

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
    case "double-forfeit":
      return "Game declared double forfeit";
    case "incomplete":
      return "In progress";
    case "unknown":
      return "Unknown";
  }
};

const toParsedGame = (
  headers: Record<string, string>,
  body: string,
  fallbackRoundNumber: number
): ParsedPgnGame => {
  const leadingComment = extractLeadingComment(body);
  const resultType = deriveResultType(headers, leadingComment);
  return {
    roundNumber: Number(headers.Round) || fallbackRoundNumber,
    boardNumber: parseOptionalNumber(headers.Board),
    white: {
      name: sanitizePlayerName(headers.White, "Unknown White"),
      rating: parseOptionalNumber(headers.WhiteElo),
      federationId: sanitizeOptionalText(headers.WhiteUSCF),
      externalId: sanitizeOptionalText(headers.WhiteExternalId)
    },
    black: {
      name: resultType === "bye"
        ? sanitizePlayerName(headers.Black, "BYE")
        : sanitizePlayerName(headers.Black, "Unknown Black"),
      rating: parseOptionalNumber(headers.BlackElo),
      federationId: sanitizeOptionalText(headers.BlackUSCF),
      externalId: sanitizeOptionalText(headers.BlackExternalId)
    },
    resultType,
    rawResult: headers.Result ?? "*",
    statusLabel: statusLabelForGame(resultType, leadingComment),
    termination: sanitizeOptionalText(headers.Termination),
    leadingComment
  };
};

export class SimplePgnParser implements PgnParser {
  parseRound(pgnText: string, fallbackRoundNumber: number): ParsedRound {
    const sharedHeaders: Record<string, string> = {};
    const gameRecords = splitGames(pgnText)
      .map((gameText) => ({
        gameText,
        ...parseGameSections(gameText)
      }))
      .filter(({ gameText, headers }) => {
        const hasGameIdentity = Boolean(headers.White || headers.Black || headers.Result);

        if (!hasGameIdentity && !hasBodyContent(gameText)) {
          Object.assign(sharedHeaders, headers);
          return false;
        }

        return true;
      });

    const games = gameRecords.map(({ headers, body }): ParsedPgnGame => {
      const mergedHeaders = { ...sharedHeaders, ...headers };
      validateRequiredHeaders(mergedHeaders);
      return toParsedGame(mergedHeaders, body, fallbackRoundNumber);
    });

    if (games.length === 0) {
      throw new Error("PGN round file contained no games.");
    }

    const firstHeaders = { ...sharedHeaders, ...gameRecords[0].headers };

    return {
      roundNumber: games[0].roundNumber || fallbackRoundNumber,
      metadata: {
        name: firstHeaders.Event,
        site: firstHeaders.Site,
        date: firstHeaders.Date,
        eventDate: firstHeaders.EventDate
      },
      games
    };
  }
}
