# Chess Tournament Presentation Website

Static website template for publishing chess tournament standings, pairings, and round results from hosted PGN files.

## Stack

- TypeScript
- Vite
- Vanilla UI composition
- Vitest

## Project structure

- `src/domain`: pure entities and standings rules
- `src/application`: use cases, search logic, and ports
- `src/adapters`: fetch/config/PGN parsing implementations
- `src/ui`: rendering and browser wiring
- `public/config/site.config.json`: organizer-editable runtime config
- `public/data`: hosted sample PGN files

## Local development

1. Install dependencies with `npm install`.
2. Start the dev server with `npm run dev`.
3. Edit `public/config/site.config.json` to change branding, data paths, scoring, and display toggles.
4. Place tournament assets in `public/assets/`.
5. Place round files in `public/data/` or point `pgnBasePath` to another hosted location.

## Runtime config

Organizers should customize the website by editing `public/config/site.config.json`:

- `branding.siteTitle`: page title and hero title fallback
- `branding.primaryColor` / `branding.accentColor`: theme colors
- `branding.logoPath`: main logo path
- `dataSource.pgnBasePath`: hosted PGN directory
- `dataSource.roundFilePattern`: round filename pattern such as `round{n}.pgn`
- `dataSource.maxRounds`: discovery limit before the app stops checking
- `scoring`: scoring rules used by client-side standings
- `display.showRatings`: toggles rating column

## PGN contract

- The site attempts to load `round1.pgn`, `round2.pgn`, and so on using the configured pattern.
- A missing round file ends discovery gracefully.
- Each game must include these headers: `Event`, `Site`, `Date`, `Round`, `White`, `Black`, `Result`.
- Byes and forfeits are interpreted from PGN headers:
  - `Black "BYE"` or a termination containing `bye` counts as a bye.
  - a `Termination` containing `forfeit` maps `1-0` or `0-1` to forfeit results.
  - `Result "*"` is treated as incomplete and is rendered without affecting standings.

## Architecture notes

- The parser adapter is responsible for turning raw PGN headers into typed game data.
- The application layer orchestrates loading and standings, but does not inspect raw PGN headers directly.
- The domain layer remains pure and contains scoring and standings rules only.

## GitHub Pages deployment

1. Fork this repository.
2. Update `public/config/site.config.json` and static assets.
3. Upload hosted PGN files to `public/data/` or another static location referenced by the config.
4. Push to `main` to use the included GitHub Pages workflow in [`.github/workflows/deploy.yml`](/Users/jaredallen/static-website-sec2team3/.github/workflows/deploy.yml).
5. Or run `npm run build` and deploy the generated `dist/` directory manually.

Before the workflow can publish, enable GitHub Pages in the repository settings and choose **GitHub Actions** as the source.
