# Product Requirements Document
## Chess Tournament Presentation Website

## 1. Overview

This project is a standalone static website template for displaying chess tournament information online. It is a separate system from the Python tournament-management application.

The Python application is responsible for:
- creating/managing tournament data
- generating round PGN files
- optionally uploading PGN files in live mode

This website is responsible for:
- reading PGN files from a configured hosted location
- parsing tournament round information in the browser
- calculating standings client-side
- displaying pairings, round results, and standings
- allowing tournament organizers to customize branding and deploy a tournament site independently

The website must be deployable as a static site, ideally on GitHub Pages, with no backend server.

## 2. Architectural Direction

This repo must follow clean architecture principles with strict inward dependencies.

Dependency rule:
- outer layers may depend on inner layers
- inner layers may not depend on outer layers

Allowed dependency flow:
- `ui -> adapters -> application -> domain`

Not allowed:
- `domain -> application`
- `domain -> adapters`
- `domain -> ui`
- `application -> adapters`
- `application -> ui`
- `application -> browser APIs`
- `domain -> parser libraries`
- `domain -> DOM or fetch`

This website repo must remain independent from the Python repo. The only shared contract between the systems is the PGN file format and a documented naming/location convention.

## 3. Product Goal

Provide a reusable tournament website template that a tournament director can:
- fork into a new repo
- customize with tournament colors and logos
- deploy as a GitHub Pages site
- point at hosted PGN files
- use to display pairings, results, and standings without depending on Python code in the website repo

## 4. Users

### 4.1 Tournament Organizers
Need to:
- customize website branding
- configure where PGN files are loaded from
- deploy and maintain a tournament website
- avoid editing complex code for normal setup

### 4.2 Players
Need to:
- view pairings
- view round results
- search for themselves
- see current standings

### 4.3 Spectators
Need to:
- follow the tournament remotely
- see standings and pairings clearly
- use the website on desktop or mobile

### 4.4 Developers
Need to:
- maintain a clean, testable codebase
- keep business logic separate from UI concerns
- support future extension without breaking architecture

## 5. Scope

## In Scope
- static website template
- configurable branding
- configurable hosted PGN source location
- client-side PGN loading and parsing
- client-side standings calculation
- round listing and game display
- case-insensitive player search
- responsive layout for mobile and desktop
- GitHub Pages deployment support
- organizer documentation

## Out of Scope
- generating pairings
- editing pairings or results
- uploading/storing PGN files through the public website
- requiring a backend server
- coupling website code to the Python application codebase
- making the website the source of truth for tournament data

## 6. Core Architecture Context

The intended system architecture is:

1. Python application generates `roundN.pgn` files
2. Tournament organizers upload those PGN files manually, or the Python app uploads them automatically in live mode
3. Hosted PGN files are stored in a repository or static hosting location
4. The website reads those hosted PGN files and renders the tournament state

Important architectural rule:
- the website does not generate HTML from the Python app
- the Python app does not write the website UI
- the website does not persist uploaded PGN files for public use
- PGN files are the integration boundary between the two systems

## 7. Functional Requirements

## 7.1 Configuration

The website must load a static configuration file at runtime.

The configuration must support:
- tournament site title override
- logo path
- sponsor logo paths
- primary color
- accent color
- PGN base path
- round file naming pattern
- maximum round count or discovery limit
- scoring configuration
- optional display toggles

Example responsibilities of config:
- point the site at `/data/`
- define round file pattern like `round{n}.pgn`
- define theme values without requiring code edits

Configuration should be editable by tournament organizers without touching application logic.

## 7.2 PGN Source Loading

The website must load PGN files from a configured hosted location.

Requirements:
- attempt to load round files named `round1.pgn`, `round2.pgn`, etc.
- support configurable base path and file pattern
- gracefully stop when no more rounds are available, or respect configured max rounds
- handle missing files without crashing
- display useful error states when files are malformed or unavailable

Primary mode:
- hosted PGN files fetched over HTTP from the static site or another configured hosted path

Optional extra mode:
- local preview/import mode using browser file attachment may be implemented later, but it is not the primary architecture and must not replace hosted PGN loading

## 7.3 PGN Parsing

The website must parse required PGN headers client-side.

At minimum it must support:
- `Event`
- `Site`
- `Date`
- `Round`
- `White`
- `Black`
- `Result`

If available, it should also support:
- `WhiteElo`
- `BlackElo`
- `WhiteUSCF`
- `BlackUSCF`
- IDs or metadata defined by the Python exporter

PGN parsing requirements:
- support one file per round
- support multiple games per round file
- ignore movetext for MVP if needed
- support byes and forfeits according to agreed exporter conventions
- support partially completed rounds if PGN encoding makes that visible

The parser should be isolated behind adapters/ports so the inner layers do not depend directly on parsing library details.

## 7.4 Tournament Display

The website must display tournament information clearly.

At minimum the UI must show:
- tournament name
- site/location
- date if available
- organizer branding/logo
- available rounds
- games for each round
- white player
- black player
- game result/status

The UI must hide future rounds that do not yet have PGN files.

## 7.5 Standings

The website must calculate standings client-side based on parsed PGN data.

At minimum standings must include:
- rank
- player name
- rating if available and enabled
- total points

Sorting:
- descending by total points

Scoring:
- configurable
- default support for:
  - win = 1.0
  - draw = 0.5
  - loss = 0
  - bye = 1.0
  - forfeit win = 1.0
  - forfeit loss = 0.0

Standings logic belongs in the inner layers, not in UI rendering code.

## 7.6 Search

The website must support case-insensitive player search.

Search behavior:
- filter standings by player name
- optionally highlight matching games in round displays
- update interactively in the browser

Search logic should not be tightly coupled to a specific UI component.

## 7.7 Responsiveness

The website must be usable on:
- desktop
- tablet
- phone

Responsive behavior must include:
- readable standings on small screens
- usable search input
- navigable round lists/cards
- no horizontal overflow that makes the site unusable

## 7.8 Branding and Customization

Tournament organizers must be able to customize:
- site title
- primary color
- accent color
- logo
- sponsor logos
- PGN location
- scoring configuration

This customization should happen through config and static assets, not through changes to business logic.

## 7.9 Deployment

The website must be deployable as a static site on GitHub Pages.

The repo should support a workflow where a tournament director can:
1. fork the repo
2. update config/assets
3. upload or host PGN files in the configured location
4. deploy the site
5. refresh the site when new PGN files become available

## 8. Non-Functional Requirements

The site must:
- load quickly on reasonable networks
- work without a backend server
- use open-source friendly dependencies
- be maintainable by students
- keep core logic testable outside the browser
- separate business rules from rendering concerns
- degrade gracefully when PGN files are missing or broken

## 9. Architecture Requirements

## 9.1 Domain Layer

Purpose:
- hold pure business entities and rules

May include:
- `Tournament`
- `Round`
- `Game`
- `Standing`
- `ResultType`
- scoring models
- standings calculation

Rules:
- no DOM
- no fetch
- no framework APIs
- no direct parsing libraries
- no file loading logic

## 9.2 Application Layer

Purpose:
- orchestrate use cases
- coordinate domain logic
- depend only on domain

May include:
- `LoadTournamentWebsite`
- `ComputeStandings`
- `SearchPlayers`
- ports/interfaces for config repository and round source

Rules:
- no DOM
- no fetch
- no rendering logic
- no direct dependency on concrete adapters

## 9.3 Adapters Layer

Purpose:
- implement ports using browser/static infrastructure

May include:
- config loader from static JSON
- fetch-based PGN file loader
- PGN parser adapter
- DTO-to-domain mappers

Rules:
- may depend on application and domain
- should isolate third-party parser behavior or browser file retrieval concerns

## 9.4 UI Layer

Purpose:
- render the website and wire browser events

May include:
- bootstrap entrypoint
- theme application
- DOM components
- search input listeners
- error/loading rendering
- responsive layout styling

Rules:
- keep business logic thin
- consume outputs from use cases/application services
- do not embed scoring or PGN parsing logic directly in the UI

## 10. Suggested Technical Stack

Recommended:
- TypeScript
- Vite
- static asset deployment
- vanilla TypeScript or lightweight UI composition

Rationale:
- strong typing helps maintain clean architecture boundaries
- Vite supports fast development and static output
- static deploy remains simple for GitHub Pages
- avoids overcomplicating the project with server infrastructure

A framework is not required. If one is used, it must not violate the clean architecture boundary rules.

## 11. Configuration Contract

The project must use a static config file, for example:

public/config/site.config.json

Example:
{
  "branding": {
    "siteTitle": "Spring Open 2026",
    "primaryColor": "#1f3a5f",
    "accentColor": "#d97706",
    "logoPath": "/assets/logo.png",
    "sponsorLogoPaths": ["/assets/sponsors/sponsor1.png"]
  },
  "dataSource": {
    "pgnBasePath": "/data",
    "roundFilePattern": "round{n}.pgn",
    "maxRounds": 9
  },
  "scoring": {
    "win": 1.0,
    "draw": 0.5,
    "loss": 0.0,
    "bye": 1.0,
    "forfeitWin": 1.0,
    "forfeitLoss": 0.0
  },
  "display": {
    "showRatings": true
  }
}


