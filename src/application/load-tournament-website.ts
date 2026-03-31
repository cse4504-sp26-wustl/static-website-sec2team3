import type {
  ParsedPgnGame,
  PgnParser,
  RoundSource,
  SiteConfig,
  SiteConfigRepository
} from "@application/contracts";
import { computeStandings } from "@application/compute-standings";
import type { Game, ResultType, Round, TournamentMetadata, Tournament } from "@domain/models";

export type WebsiteState =
  | { status: "loading" }
  | { status: "unavailable"; message: string }
  | { status: "malformed"; message: string }
  | { status: "empty"; config: SiteConfig }
  | { status: "ready"; config: SiteConfig; tournament: Tournament; standings: ReturnType<typeof computeStandings> };

interface Dependencies {
  configRepository: SiteConfigRepository;
  roundSource: RoundSource;
  parser: PgnParser;
}

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

const toGame = (parsedGame: ParsedPgnGame, fallbackRoundNumber: number, index: number): Game => {
  const headers = parsedGame.headers;
  const resultType = deriveResultType(headers);
  const roundNumber = Number(headers.Round) || fallbackRoundNumber;
  const whiteName = sanitizePlayerName(headers.White, "Unknown White");
  const blackName = resultType === "bye"
    ? sanitizePlayerName(headers.Black, "BYE")
    : sanitizePlayerName(headers.Black, "Unknown Black");

  return {
    id: `${roundNumber}-${index}-${whiteName}-${blackName}`.toLocaleLowerCase().replace(/\s+/g, "-"),
    roundNumber,
    white: {
      name: whiteName,
      rating: parseOptionalNumber(headers.WhiteElo),
      federationId: headers.WhiteUSCF
    },
    black: {
      name: blackName,
      rating: parseOptionalNumber(headers.BlackElo),
      federationId: headers.BlackUSCF
    },
    resultType,
    rawResult: headers.Result ?? "*",
    statusLabel: statusLabelForGame(resultType)
  };
};

const mergeMetadata = (
  current: TournamentMetadata | undefined,
  next: TournamentMetadata
): TournamentMetadata => ({
  name: current?.name ?? next.name,
  site: current?.site ?? next.site,
  date: current?.date ?? next.date
});

export const loadTournamentWebsite = async ({
  configRepository,
  roundSource,
  parser
}: Dependencies): Promise<WebsiteState> => {
  const config = await configRepository.load();
  let metadata: TournamentMetadata | undefined;
  const rounds: Round[] = [];

  try {
    for (let roundNumber = 1; roundNumber <= config.dataSource.maxRounds; roundNumber += 1) {
      const roundText = await roundSource.loadRound(roundNumber);
      if (roundText === null) {
        break;
      }

      const parsedRound = parser.parseRound(roundText, roundNumber);
      metadata = mergeMetadata(metadata, parsedRound.metadata);
      rounds.push({
        number: parsedRound.roundNumber,
        games: parsedRound.games.map((game, index) => toGame(game, parsedRound.roundNumber, index))
      });
    }
  } catch (error) {
    return {
      status: "malformed",
      message: error instanceof Error ? error.message : "The tournament data could not be parsed."
    };
  }

  if (rounds.length === 0) {
    return {
      status: "empty",
      config
    };
  }

  const tournament: Tournament = {
    metadata: metadata ?? {
      name: config.branding.siteTitle
    },
    rounds
  };

  return {
    status: "ready",
    config,
    tournament,
    standings: computeStandings(rounds, config.scoring)
  };
};
