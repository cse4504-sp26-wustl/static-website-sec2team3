export interface PlayerIdentity {
  name: string;
  rating?: number;
  federationId?: string;
  externalId?: string;
}

export type ResultType =
  | "white-win"
  | "black-win"
  | "draw"
  | "bye"
  | "forfeit-white-win"
  | "forfeit-black-win"
  | "double-forfeit"
  | "incomplete"
  | "unknown";

export interface Game {
  id: string;
  roundNumber: number;
  boardNumber?: number;
  white: PlayerIdentity;
  black: PlayerIdentity;
  resultType: ResultType;
  rawResult: string;
  statusLabel: string;
  termination?: string;
  leadingComment?: string;
}

export interface Round {
  number: number;
  games: Game[];
}

export interface TournamentMetadata {
  name: string;
  site?: string;
  date?: string;
  eventDate?: string;
}

export interface Tournament {
  metadata: TournamentMetadata;
  rounds: Round[];
}

export interface ScoringRules {
  win: number;
  draw: number;
  loss: number;
  bye: number;
  forfeitWin: number;
  forfeitLoss: number;
}

export interface PlayerRecord {
  player: PlayerIdentity;
  points: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface Standing extends PlayerRecord {
  rank: number;
}
