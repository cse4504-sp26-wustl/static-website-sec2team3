import type { RoundSource, SiteDataSourceConfig } from "@application/contracts";

const toRoundFileName = (pattern: string, roundNumber: number): string =>
  pattern.replace("{n}", String(roundNumber));

const buildRoundUrl = (basePath: string, fileName: string): string => {
  const normalizedBasePath = basePath.replace(/\/$/, "");
  const origin = typeof window !== "undefined" ? window.location.href : "https://example.com";
  const url = new URL(`${normalizedBasePath}/${fileName}`, origin);

  // Bypass browser and intermediary caches so a refresh picks up newly uploaded PGNs quickly.
  url.searchParams.set("ts", String(Date.now()));
  url.searchParams.set("time", String(new Date().getTime()));

  return url.toString();
};

const looksLikeHtmlFallback = (body: string): boolean => {
  const trimmed = body.trim().toLocaleLowerCase();
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html");
};

export class HttpRoundSource implements RoundSource {
  constructor(private readonly config: SiteDataSourceConfig) {}

  async loadRound(roundNumber: number): Promise<string | null> {
    const fileName = toRoundFileName(this.config.roundFilePattern, roundNumber);
    const response = await fetch(buildRoundUrl(this.config.pgnBasePath, fileName), {
      cache: "no-store"
    });

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
