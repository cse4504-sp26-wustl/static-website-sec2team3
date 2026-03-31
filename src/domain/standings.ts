import type { Game, PlayerIdentity, Round, ScoringRules, Standing } from "@domain/models";

interface ScoreDelta {
  white: number;
  black: number;
  countWhiteGame: boolean;
  countBlackGame: boolean;
}

const normalizeName = (name: string): string => name.trim().toLocaleLowerCase();

const sortByStanding = (left: Standing, right: Standing): number => {
  if (right.points !== left.points) {
    return right.points - left.points;
  }

  return left.player.name.localeCompare(right.player.name);
};

const scoreGame = (game: Game, scoring: ScoringRules): ScoreDelta | null => {
  switch (game.resultType) {
    case "white-win":
      return {
        white: scoring.win,
        black: scoring.loss,
        countWhiteGame: true,
        countBlackGame: true
      };
    case "black-win":
      return {
        white: scoring.loss,
        black: scoring.win,
        countWhiteGame: true,
        countBlackGame: true
      };
    case "draw":
      return {
        white: scoring.draw,
        black: scoring.draw,
        countWhiteGame: true,
        countBlackGame: true
      };
    case "bye":
      return {
        white: scoring.bye,
        black: 0,
        countWhiteGame: false,
        countBlackGame: false
      };
    case "forfeit-white-win":
      return {
        white: scoring.forfeitWin,
        black: scoring.forfeitLoss,
        countWhiteGame: true,
        countBlackGame: true
      };
    case "forfeit-black-win":
      return {
        white: scoring.forfeitLoss,
        black: scoring.forfeitWin,
        countWhiteGame: true,
        countBlackGame: true
      };
    case "incomplete":
    case "unknown":
      return null;
  }
};

const mergeIdentity = (
  current: PlayerIdentity | undefined,
  incoming: PlayerIdentity
): PlayerIdentity => ({
  name: current?.name ?? incoming.name,
  rating: current?.rating ?? incoming.rating,
  federationId: current?.federationId ?? incoming.federationId
});

export const computeStandings = (
  rounds: Round[],
  scoring: ScoringRules
): Standing[] => {
  const records = new Map<
    string,
    {
      player: PlayerIdentity;
      points: number;
      gamesPlayed: number;
      wins: number;
      losses: number;
      draws: number;
    }
  >();

  const ensureRecord = (player: PlayerIdentity) => {
    const key = normalizeName(player.name);
    const existing = records.get(key);

    if (existing) {
      existing.player = mergeIdentity(existing.player, player);
      return existing;
    }

    const created = {
      player,
      points: 0,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0
    };
    records.set(key, created);
    return created;
  };

  for (const round of rounds) {
    for (const game of round.games) {
      const white = ensureRecord(game.white);

      if (game.resultType !== "bye") {
        ensureRecord(game.black);
      }

      const delta = scoreGame(game, scoring);
      if (!delta) {
        continue;
      }

      white.points += delta.white;
      if (delta.countWhiteGame) {
        white.gamesPlayed += 1;
      }

      if (game.resultType !== "bye") {
        const black = ensureRecord(game.black);
        black.points += delta.black;
        if (delta.countBlackGame) {
          black.gamesPlayed += 1;
        }

        switch (game.resultType) {
          case "white-win":
          case "forfeit-white-win":
            white.wins += 1;
            black.losses += 1;
            break;
          case "black-win":
          case "forfeit-black-win":
            white.losses += 1;
            black.wins += 1;
            break;
          case "draw":
            white.draws += 1;
            black.draws += 1;
            break;
          case "incomplete":
          case "unknown":
            break;
        }
      } else {
        white.wins += 1;
      }
    }
  }

  const ordered = Array.from(records.values())
    .map((record) => ({
      rank: 0,
      player: record.player,
      points: record.points,
      gamesPlayed: record.gamesPlayed,
      wins: record.wins,
      losses: record.losses,
      draws: record.draws
    }))
    .sort(sortByStanding);

  return ordered.map((standing, index) => ({
    ...standing,
    rank: index + 1
  }));
};
