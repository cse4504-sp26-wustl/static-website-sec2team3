import type { RoundSource, SiteDataSourceConfig } from "@application/contracts";

const toRoundFileName = (pattern: string, roundNumber: number): string =>
  pattern.replace("{n}", String(roundNumber));

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

    return response.text();
  }
}
