import type {
  ParsedPgnGame,
  PgnParser,
  RoundSource,
  SiteConfig,
  SiteConfigRepository
} from "@application/contracts";
import { computeStandings } from "@application/compute-standings";
import type { Game, Round, TournamentMetadata, Tournament } from "@domain/models";

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

const toGame = (parsedGame: ParsedPgnGame, fallbackRoundNumber: number, index: number): Game => {
  const roundNumber = parsedGame.roundNumber || fallbackRoundNumber;

  return {
    id: `${roundNumber}-${index}-${parsedGame.white.name}-${parsedGame.black.name}`
      .toLocaleLowerCase()
      .replace(/\s+/g, "-"),
    roundNumber,
    white: parsedGame.white,
    black: parsedGame.black,
    resultType: parsedGame.resultType,
    rawResult: parsedGame.rawResult,
    statusLabel: parsedGame.statusLabel
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
