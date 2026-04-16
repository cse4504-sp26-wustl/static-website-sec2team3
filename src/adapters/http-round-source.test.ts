import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpRoundSource } from "@adapters/http-round-source";

const source = new HttpRoundSource({
  pgnBasePath: "/data",
  roundFilePattern: "round{n}.pgn",
  maxRounds: 9
});

describe("HttpRoundSource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null for a missing round with 404", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      status: 404,
      ok: false
    });

    vi.stubGlobal(
      "fetch",
      fetchSpy
    );

    await expect(source.loadRound(4)).resolves.toBeNull();
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/data/round4.pgn?ts="), {
      cache: "no-store"
    });
  });

  it("returns null when a host sends HTML fallback for a missing round", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        text: async () => "<!doctype html><html><body>fallback</body></html>"
      })
    );

    await expect(source.loadRound(4)).resolves.toBeNull();
  });

  it("returns PGN text for a real round file", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        text: async () => `[Event "Test"]\n[Site "Somewhere"]\n[Date "2026.03.30"]\n[Round "1"]\n[White "A"]\n[Black "B"]\n[Result "1-0"]`
      })
    );

    await expect(source.loadRound(1)).resolves.toContain('[Event "Test"]');
  });
});
