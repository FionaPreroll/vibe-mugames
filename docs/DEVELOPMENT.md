# Development

Setting up, testing, the libraries, the screenshots, the Android app and the conventions of this repository. [ARCHITECTURE.md](ARCHITECTURE.md) describes how the code works.

## Setting up

Use pnpm, never npm or yarn.

```bash
pnpm install      # once, and after the dependencies change
pnpm dev          # serves the Spielekiste at localhost, anew on every change
pnpm dev:phone    # the same over HTTPS, for phones, which open the camera only there
pnpm check        # type check, Biome and the unit tests: before every push
pnpm test:e2e     # builds, and plays in Chromium over real WebRTC
```

## Tests

`pnpm check` runs the type check, Biome and the unit tests (Vitest), among them:

- **Whole games** between a host and players over the library's connections in memory (`src/net/session.test.ts`).
- **A hostile phone at the table** (`src/net/table.fuzz.test.ts`, with [fast-check](https://fast-check.dev/)): watching or holding a seat, it sends moves for any game and number, out of turn and against the rules, aimed from the table as it is, and anything else, while honest players play. The host takes only legal moves from the player whose turn it is, and every phone keeps a table it can read.
- **A weak connection** (`src/net/loss.test.ts`): every game is played over the library's connections in memory, which lose 10, 30 or 50 % of the `fast` channel's messages, and delay and reorder them, by seeds fast-check picks. Every move still arrives once, every phone ends with the table the host keeps for it, and the games in real time keep going, each phone a few ticks behind at most.
- **The benchmark of air hockey's smoothing** (`tools/smoothing.test.ts`): it fails if the Kalman filter draws less smoothly than its bounds allow, or if the numbers and plots in `docs/networking/` are not what the code gives now; `pnpm bench:smoothing` writes them anew, for review in the diff.

Attacks on the connection itself, over Wi-Fi and Bluetooth, are fuzzed in the library.

`pnpm test:e2e` builds the app and plays it in Chromium over real WebRTC (`tests/e2e/`, listed in [ARCHITECTURE.md](ARCHITECTURE.md#layout)). On real phones, `pnpm dev:phone` serves over HTTPS with a self-signed certificate, as phones open the camera only on HTTPS pages.

## Coverage

Coverage comes from two kinds of tests, which CI uploads to [Codecov](https://codecov.io/gh/FionaPreroll/vibe-mugames) separately, each with its flag, and Codecov puts together:

| Flag   | Tests                                             | Measures                                                                                                 | Locally                                             |
| ------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `unit` | Vitest, in Node, and happy-dom for the screens    | `src/`                                                                                                   | `pnpm test:coverage` → `coverage/lcov.info`         |
| `e2e`  | Playwright, in Chromium (`tests/e2e/coverage.ts`) | the same TypeScript as the browser runs it, through the build's source maps: the screens, WebRTC, camera | `pnpm test:e2e:coverage` → `coverage/e2e/lcov.info` |

Browser tests import `test` and `expect` from `tests/e2e/coverage.ts` instead of `@playwright/test`, so every page they open is measured. Coverage never fails a pull request (`codecov.yml`).

## The libraries

`@fionapreroll/p2p`, `@fionapreroll/p2p-nearby` and `@fionapreroll/app-updates` are developed in [vibe-p2pgame](https://github.com/FionaPreroll/vibe-p2pgame), and installed here from the files on their releases, [`p2p-v0.6.2`](https://github.com/FionaPreroll/vibe-p2pgame/releases/tag/p2p-v0.6.2), [`p2p-nearby-v0.5.0`](https://github.com/FionaPreroll/vibe-p2pgame/releases/tag/p2p-nearby-v0.5.0) and [`app-updates-v0.1.0`](https://github.com/FionaPreroll/vibe-p2pgame/releases/tag/app-updates-v0.1.0), so no login to GitHub's npm registry is needed. To use a newer version, change the address in `package.json` to that version's release, run `pnpm install`, and read its changelog.

## Screenshots

The README's pictures live in `docs/screenshots/`. `tests/screenshots/screenshots.spec.ts` takes them: it plays each game in Chromium, on a phone (412 by 915) or a laptop (1280 by 800), with the luck seeded and the clock fixed, so the same code gives the same pictures. The games in real time are played between phones over WebRTC, with every phone's clock standing still between the host's steps, and are shown in a generic phone's frame; the two halves of the rink lie top edge to top edge, the upper phone turned round. `pnpm screenshots` writes only the pictures that look different from those there (more than 1 % of their pixels), so fonts and antialiasing alone change nothing; `pnpm screenshots --update-snapshots=all` writes them all.

The pairing code is a sample, as a real one holds new keys every time, and the connection's numbers are those of the moment.

To take them anew on GitHub, run the **Screenshots** workflow by hand (_Actions_ → _Screenshots_ → _Run workflow_): it opens a pull request against `main`, from the branch `feature/update_screenshots`, with the pictures that changed, for review. It runs with Inter as the system font (`tools/screenshots/fonts.conf`), as they were first taken.

GitHub runs no other workflows on a pull request a workflow opened, so CI does not check it; it changes nothing but pictures. The repository has to allow it once: _Settings_ → _Actions_ → _General_ → _Workflow permissions_ → _Allow GitHub Actions to create and approve pull requests_.

## The Android app

The APK is built by CI (`.github/workflows/android.yml`). Locally, with the Android SDK: `pnpm android:sync`, then build in `android/` with `./gradlew assembleDebug`. The update plugin's Java and its tests live with the library; here, `src/ui/updates.test.ts` plays the Spielekiste's dialogs in happy-dom against the library's `FakeUpdater`.

## The icon

The icon, an open games box with a card, a draughts piece and a pawn, is drawn in `tools/icons.ts`. `pnpm icons` writes everything made from it: the app's adaptive icon as vector drawables in `android/app/src/main/res/drawable/` (a background of squares, the box, and a one-colour layer for themed icons), its PNGs for Android 7 in `mipmap-*/`, and the website's `public/icon.svg`, with the PNGs in `public/icons/` for installing it: rounded ones, maskable ones that show the whole board for phones to cut to their own shape, and Apple's. The app's start screen shows the same box on the same dark blue.

## Adding a game

1. Write its rules as a `BoardGame` in `src/core`, with tests beside them, and add its id to `GAME_IDS` and `GAMES`, and to its kind in `GAME_GROUPS` (`src/core/games.ts`), which the chooser shows it under; a test checks that every game is in one.
2. Give it a name in `src/i18n.ts`, in English and German, and a board in `src/ui/boards.ts`. Moves of several cells are picked there one cell at a time from the rules' `moves()`, so a board only needs to draw its cells.
3. If it needs more than a board of cells, such as dice or hidden cards, extend the table and the protocol, and raise `PROTOCOL` in `src/net/protocol.ts`. Miau-Miau shows how: its own state on the table, a view per player sent through `stateFor`, its seat range in `seatRange` (`src/core/games.ts`), and a parser for its view. A game that hides something from some players also goes into `hasHiddenCards` there, so that on one device it says it is played open, or, like Sea Battle, into `handsOver`, if one device can keep it hidden by being handed over.
4. Give it a guide in `src/ui/rules/` (`GUIDES` in `index.ts`; the type check fails without one): a thumbnail for the game chooser and its rules, a step at a time, each a text in `src/i18n.ts` (`rules<Game>1`, …) with a drawing made with the helpers in `src/ui/rules/draw.ts`, as small inline SVG.
5. A game where players type, such as Stadt, Land, Fluss, keeps its text fields between redraws with `Picker.keep` and `keptPlace` (`src/ui/keep.ts`), and sends its words as numbers (`src/core/text.ts`). A game whose time runs out runs it in `Table.tick`.
6. A game in real time goes into `LIVE_GAME_IDS` (`src/core/board.ts`): its rules run by time and by what each seat wants (`Table.input` and `Table.tick`), and its field is a canvas made by `LiveSlot` (`src/ui/live.ts`), as Lichtrenner and air hockey show.
7. Give it a screenshot: a test in `tests/screenshots/screenshots.spec.ts`, then `pnpm screenshots`, and the picture in the README's gallery.

## Workflows

| Workflow          | Runs on                            | Does                                                                                                                                 |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `ci.yml`          | Pull requests and pushes to `main` | Type check, Biome, unit tests, build, browser tests; coverage of the unit and browser tests to Codecov                               |
| `deploy.yml`      | Pushes to `main`, by hand          | Publishes the website on GitHub Pages                                                                                                |
| `android.yml`     | Pull requests and pushes to `main` | Builds the APK; from `main`, replaces the APK and its `version.json` in the release _Spielekiste for Android_ (tag `android-latest`) |
| `screenshots.yml` | By hand                            | Takes the README's screenshots anew and opens a pull request against `main` with those that changed                                  |

## Branches and pull requests

Every feature or fix gets its own branch off `main`, named `feature/<name_in_snake_case>` or `fix/<name_in_snake_case>`. While the Spielekiste is young, a finished branch may be merged into `main` directly, once `pnpm check` and `pnpm test:e2e` pass on the merged result.

## Changelog and versions

`CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/): changes players can see go under `## [Unreleased]`. A version is made only when asked: the entries move to a new `## [x.y.z] - YYYY-MM-DD` section, and `package.json` gets the same version.
