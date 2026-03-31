import { HttpRoundSource } from "@adapters/http-round-source";
import { RuntimeConfigRepository } from "@adapters/runtime-config-repository";
import { SimplePgnParser } from "@adapters/simple-pgn-parser";
import { loadTournamentWebsite } from "@application/load-tournament-website";
import { renderWebsite } from "@ui/render";
import "./styles.css";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Application root element was not found.");
}

const bootstrap = async (): Promise<void> => {
  renderWebsite(root, { status: "loading" });

  try {
    const configRepository = new RuntimeConfigRepository();
    const config = await configRepository.load();

    const state = await loadTournamentWebsite({
      configRepository: {
        load: async () => config
      },
      roundSource: new HttpRoundSource(config.dataSource),
      parser: new SimplePgnParser()
    });

    renderWebsite(root, state, config);
  } catch (error) {
    renderWebsite(root, {
      status: "unavailable",
      message: error instanceof Error ? error.message : "The website could not be initialized."
    });
  }
};

void bootstrap();
