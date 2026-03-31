import type { SiteConfig, SiteConfigRepository } from "@application/contracts";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid config: ${fieldName} must be a non-empty string.`);
  }
  return value;
};

const asNumber = (value: unknown, fieldName: string): number => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Invalid config: ${fieldName} must be a number.`);
  }
  return value;
};

export class RuntimeConfigRepository implements SiteConfigRepository {
  constructor(private readonly configPath: string = "/config/site.config.json") {}

  async load(): Promise<SiteConfig> {
    const response = await fetch(this.configPath);
    if (!response.ok) {
      throw new Error("The site configuration could not be loaded.");
    }

    const raw = (await response.json()) as unknown;
    if (!isObject(raw)) {
      throw new Error("Invalid config: root must be an object.");
    }

    const branding = raw.branding;
    const dataSource = raw.dataSource;
    const scoring = raw.scoring;
    const display = raw.display;

    if (!isObject(branding) || !isObject(dataSource) || !isObject(scoring) || !isObject(display)) {
      throw new Error("Invalid config: missing required sections.");
    }

    return {
      branding: {
        siteTitle: asString(branding.siteTitle, "branding.siteTitle"),
        primaryColor: asString(branding.primaryColor, "branding.primaryColor"),
        accentColor: asString(branding.accentColor, "branding.accentColor"),
        logoPath: typeof branding.logoPath === "string" ? branding.logoPath : undefined
      },
      dataSource: {
        pgnBasePath: asString(dataSource.pgnBasePath, "dataSource.pgnBasePath"),
        roundFilePattern: asString(dataSource.roundFilePattern, "dataSource.roundFilePattern"),
        maxRounds: asNumber(dataSource.maxRounds, "dataSource.maxRounds")
      },
      scoring: {
        win: asNumber(scoring.win, "scoring.win"),
        draw: asNumber(scoring.draw, "scoring.draw"),
        loss: asNumber(scoring.loss, "scoring.loss"),
        bye: asNumber(scoring.bye, "scoring.bye"),
        forfeitWin: asNumber(scoring.forfeitWin, "scoring.forfeitWin"),
        forfeitLoss: asNumber(scoring.forfeitLoss, "scoring.forfeitLoss")
      },
      display: {
        showRatings: Boolean(display.showRatings)
      }
    };
  }
}
