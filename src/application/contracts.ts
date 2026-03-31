import type { PlayerIdentity, ResultType, ScoringRules, TournamentMetadata } from "@domain/models";

export interface SiteBrandingConfig {
  siteTitle: string;
  primaryColor: string;
  accentColor: string;
  logoPath?: string;
}

export interface SiteDataSourceConfig {
  pgnBasePath: string;
  roundFilePattern: string;
  maxRounds: number;
}

export interface SiteDisplayConfig {
  showRatings: boolean;
}

export interface SiteConfig {
  branding: SiteBrandingConfig;
  dataSource: SiteDataSourceConfig;
  scoring: ScoringRules;
  display: SiteDisplayConfig;
}

export interface ParsedPgnGame {
  roundNumber: number;
  white: PlayerIdentity;
  black: PlayerIdentity;
  resultType: ResultType;
  rawResult: string;
  statusLabel: string;
}

export interface ParsedRound {
  roundNumber: number;
  metadata: TournamentMetadata;
  games: ParsedPgnGame[];
}

export interface SiteConfigRepository {
  load(): Promise<SiteConfig>;
}

export interface RoundSource {
  loadRound(roundNumber: number): Promise<string | null>;
}

export interface PgnParser {
  parseRound(pgnText: string, fallbackRoundNumber: number): ParsedRound;
}
