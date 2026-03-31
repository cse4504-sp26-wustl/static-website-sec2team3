import type { RoundSource, SiteDataSourceConfig } from "@application/contracts";

const toRoundFileName = (pattern: string, roundNumber: number): string =>
  pattern.replace("{n}", String(roundNumber));

const looksLikeHtmlFallback = (body: string): boolean => {
  const trimmed = body.trim().toLocaleLowerCase();
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html");
};

export class HttpRoundSource implements RoundSource {
  constructor(private readonly config: SiteDataSourceConfig) {}

  async loadRound(roundNumber: number): Promise<string | null> {
    const fileName = toRoundFileName(this.config.roundFilePattern, roundNumber);
    const basePath = this.config.pgnBasePath.replace(/\/$/, "");
    const response = await fetch(`${basePath}/${fileName}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Round ${roundNumber} could not be loaded.`);
    }

    const body = await response.text();

    // Some static hosts and dev servers return the app shell HTML for missing files
    // instead of a 404. Treat that fallback page as "round missing" so discovery stops cleanly.
    if (looksLikeHtmlFallback(body)) {
      return null;
    }

    return body;
  }
}
