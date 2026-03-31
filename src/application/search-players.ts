import type { Standing } from "@domain/models";

const normalize = (value: string): string => value.trim().toLocaleLowerCase();

export const searchPlayers = (
  standings: Standing[],
  query: string
): Standing[] => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return standings;
  }

  return standings.filter((standing) =>
    normalize(standing.player.name).includes(normalizedQuery)
  );
};
