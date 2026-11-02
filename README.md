# Spielekiste

[![CI](https://github.com/FionaPreroll/vibe-mugames/actions/workflows/ci.yml/badge.svg)](https://github.com/FionaPreroll/vibe-mugames/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/FionaPreroll/vibe-mugames/branch/main/graph/badge.svg)](https://codecov.io/gh/FionaPreroll/vibe-mugames)
[![Android](https://github.com/FionaPreroll/vibe-mugames/actions/workflows/android.yml/badge.svg)](https://github.com/FionaPreroll/vibe-mugames/actions/workflows/android.yml)

Board games for phones side by side, in the browser and as an Android app, or for everyone around one laptop or tablet. The phones connect directly to each other by QR code, over Wi-Fi or a hotspot one of them opens: no internet, no server, no accounts. The connection comes from [`@fionapreroll/p2p`](https://github.com/FionaPreroll/vibe-p2pgame/tree/main/packages/p2p), the library behind [Spark Hunt](https://github.com/FionaPreroll/vibe-p2pgame).

## Playing

Play in the browser at **[fionapreroll.github.io/vibe-mugames](https://fionapreroll.github.io/vibe-mugames/)**, or in the Android app (below). One phone opens a table; everyone else sits down at it:

1. **Open a table** on the first phone, then **Add player**: it shows a QR code.
2. On the new player's phone, **Join a table** and scan that code. The phone then shows a code of its own, which the first phone scans. Without a camera, both codes can be copied and pasted as text. If the camera will not focus on the screen, tap the picture to focus, zoom out and hold the phone further away, switch cameras, or take a photo of the code instead. Sending a code over may take its time: the joining phone waits up to 10 minutes for the host to take its code. If a connection fails, both phones say so and offer **Try again**.
3. The host chooses a game. Up to eight phones sit at a table: two play the board games, up to six Miau-Miau, and the others watch and take turns. After a game, the winner stays and the others who played go to the back of the queue; when nobody waits, the next player in turn starts.

**On one device:** on a laptop or a tablet, **Play on this device** on the start screen seats two to six players at the device, with their names, and no network at all. They either take turns on one screen, which names whose turn it is and keeps the board the same way round for everyone, or, from two to four, split the screen into a part for each player, with their own view: their own cards, and in Draughts their own pieces at the bottom. A part turns round with **⟲**, for a player sitting across the table. Games with hidden cards, such as Miau-Miau, are played with open cards there: everyone can see every hand, and the lobby and the game say so. The device remembers who played and how.

The games:

| Game                                  | Players |
| ------------------------------------- | ------- |
| Tic Tac Toe                           | 2       |
| Four in a Row (_Vier in einer Reihe_) | 2       |
| Nine Men's Morris (_Mühle_)           | 2       |
| Draughts (_Dame_)                     | 2       |
| Miau-Miau (Mau-Mau, cards)            | 2–6     |

**Nine Men's Morris:** each player places nine pieces, one a turn, then moves them along a line to a free neighbouring point; with only three left, they jump to any free point. Three in a row on a line make a mill, which takes one of the other player's pieces, one outside a mill if there is any. Fewer than three pieces, or none that can move, lose; fifty moves without a mill are a draw.

**Draughts:** twelve pieces each on the dark squares of 8 by 8. Pieces step diagonally forward and take by jumping, forward and backward, on and on while they can. Taking is a must, but any way to take may be chosen. A piece that ends its move on the far row is crowned and then moves and takes at any distance. A player who cannot move loses; fifty moves of crowned pieces without taking are a draw.

**Miau-Miau:** five cards each, from 32 cards (seven to ace) for up to four players, or 52 for five and six. A card goes on the pile if it has the suit or the rank of the top card; otherwise, or by choice, the player draws one, and may play it at once if it fits. A seven makes the next player draw two, unless they answer with a seven, which passes four on, and so on. An eight makes the next player miss their turn. A jack goes on any card and wishes for a suit. The first to play their last card wins. Each phone sees only its own hand; a card help on the screen explains the cards.

To make a move of several steps, tap the piece, then where it goes, and every square a jump lands on.

English and German, as the browser's language says, or chosen on the start screen.

**Android app:** download [`spielekiste.apk`](https://github.com/FionaPreroll/vibe-mugames/releases/latest/download/spielekiste.apk) from the release _Spielekiste for Android_ and open it on the phone; Android asks once to allow installing apps from that source. A newer APK installs over the older one and keeps the settings. These are debug builds, for playing with friends, not for the Play Store.

**Updates:**

- **In the app,** if you agree at its first start or switch it on under _Updates_ on the start screen: at every start, the app looks for a newer build and offers to install it; _Look for a new version now_ looks at once. The dialog says how large the download is, and warns when the phone is on mobile data or another metered connection. While downloading, it shows the progress; **Pause** stops, and the download goes on where it stopped, also after the app was closed. Android asks before installing; the first time, it wants you to allow the app to install apps: the app opens that setting, and goes on installing by itself when you come back, without downloading again. The app hands the update to Android as an installer session, which reports back: the dialog says when Android waits for your confirmation, and if Android's installer does not open, or the update was not installed, it says so and offers to try again. The start screen shows the app's build number.
- **On the website,** an open page looks for a newer build when it starts, every quarter of an hour and when it comes back to the front. The start screen then says so, and _Load it_ loads the new version. It does not say so at a table, as loading the page anew there would end the table.

## How it works

- **The host decides everything.** The host's phone keeps the table (`src/core/table.ts`): who sits there, the game, the board and the scores, and sends it to every phone ten times a second as the room's state. Players send their moves as events, which arrive once each, in order; each move names the move number it is meant to be, so a move sent twice counts once. The host takes a move only from the player whose turn it is, and only if the rules allow it.
- **Rules are pure TypeScript** in `src/core`: no DOM, no network. Each game is a `BoardGame` (`src/core/board.ts`): where a game starts, every move legal now, what a move does, and how a game ends. A game's `Position` is its board of cells (each empty or a piece: its seat, plus `KIND` once crowned), whose turn it is, which the rules decide, the pieces still in hand, the phase (such as taking a piece after a mill) and a count of quiet moves for draws. A move is a path of cells: a cell or column, from and to, or every square of a jump.
- **Cards stay hidden.** Miau-Miau (`src/core/miaumiau.ts`) is a game of its own, not a `BoardGame`: the host alone knows every hand, and the library's `stateFor` sends each phone the table with only its own cards (`MiauView`), and how many the others hold. Its moves travel as numbers too: a card (with a jack's wished suit), 52 to draw, 53 to pass. The host shuffles with the browser's cryptographic randomness.
- **One device keeps its own table.** `LocalTable` (`src/local.ts`) is the table of `src/core/table.ts` with every player on the device and nothing sent anywhere; each move is taken from whoever's turn it is. Taking turns, the screen (`src/ui/local.ts`) shows the game as the player to move sees it; a split screen shows each player's own view of it side by side. Both draw the game with the same views as a phone's table (`src/ui/game.ts`). `hasHiddenCards` (`src/core/games.ts`) names the games that are played with open cards there.
- **Everything from another phone is checked** before use (`src/net/protocol.ts`), as is everything read from storage (`src/storage.ts`).
- **App updates** (`src/updates.ts`, `src/ui/updates.ts`, `AppUpdaterPlugin.java`): the release _Spielekiste for Android_ holds `version.json` beside the APK, naming its build and size. The app compares it with its own build number, the APK's `versionCode`; CI sets both to the Android workflow's run number. The plugin reads and downloads only from this repository's releases, over HTTPS, and its decisions are in plain Java (`UpdateRules`), with JUnit tests beside them. Android installs an update only if it is signed with the same key as the app installed: every build is signed with `android/app/debug.keystore`, in the repository on purpose. It is public, so it proves only that an update comes from a build of this project.
- **Website updates** (`src/webUpdates.ts`, `src/ui/webUpdates.ts`): every build writes `version.json` beside the page (`vite.config.ts`), with its version, commit and time. The page reads the deployed one, past every cache, and calls it newer if it is another commit, built later. The app does not look there, as its files are inside it.

```
src/
  core/       the rules: board.ts, tictactoe.ts, fourInARow.ts, muehle.ts, dame.ts, miaumiau.ts, games.ts, table.ts
  net/        protocol.ts: the messages and their parsers; session.ts: the host's and players' seats
  ui/         the screens: home.ts, table.ts, local.ts (playing on one device), game.ts (what every
              table shows), boards.ts, cards.ts, codes.ts (QR codes and text codes),
              updates.ts and webUpdates.ts (the update dialogs and notes)
  i18n.ts     every text players see, in English and German
  local.ts    the table on one device
  storage.ts  name, language, the update switch, the camera last used, who last played on this device
              and the player's token, in local storage
  native.ts   the Android app's back button
  updates.ts  the app's updates from its release; webUpdates.ts: the website's
android/      the Android app's project (Capacitor), with AppUpdaterPlugin and UpdateRules
tests/e2e/    Playwright: phones in separate browser profiles pair through the text codes and play;
              the website offers a newer build; pairing.spec.ts: slow, wrong and failed codes, and copying;
              local.spec.ts: playing on one device, taking turns and on a split screen
```

### Adding a game

1. Write its rules as a `BoardGame` in `src/core`, with tests beside them, and add its id to `GAME_IDS` and `GAMES`.
2. Give it a name in `src/i18n.ts`, in English and German, and a board in `src/ui/boards.ts`. Moves of several cells are picked there one cell at a time from the rules' `moves()`, so a board only needs to draw its cells.
3. If it needs more than a board of cells, such as dice or hidden cards, extend the table and the protocol, and raise `PROTOCOL` in `src/net/protocol.ts`. Miau-Miau shows how: its own state on the table, a view per player sent through `stateFor`, its seat range in `seatRange` (`src/core/games.ts`), and a parser for its view. A game that hides something from some players also goes into `hasHiddenCards` there, so that on one device it says it is played open.

## Development

Use pnpm.

```bash
pnpm install
```

```bash
pnpm dev
```

```bash
pnpm check
```

`pnpm check` runs the type check, Biome and the unit tests: the rules, the table, and whole games between a host and players over the library's connections in memory (`src/net/session.test.ts`). `pnpm test:e2e` builds the app and plays in Chromium over real WebRTC. On phones, `pnpm dev:phone` serves over HTTPS with a self-signed certificate, as phones open the camera only on HTTPS pages.

**Coverage** comes from two kinds of tests, which CI uploads to [Codecov](https://codecov.io/gh/FionaPreroll/vibe-mugames) separately, each with its flag, and Codecov puts together:

| Flag   | Tests                                             | Measures                                                                                                 | Locally                                             |
| ------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `unit` | Vitest, in Node, and happy-dom for the screens    | `src/`                                                                                                   | `pnpm test:coverage` → `coverage/lcov.info`         |
| `e2e`  | Playwright, in Chromium (`tests/e2e/coverage.ts`) | the same TypeScript as the browser runs it, through the build's source maps: the screens, WebRTC, camera | `pnpm test:e2e:coverage` → `coverage/e2e/lcov.info` |

Browser tests import `test` and `expect` from `tests/e2e/coverage.ts` instead of `@playwright/test`, so every page they open is measured. Coverage never fails a pull request (`codecov.yml`).

**The library** is installed from the file on its release, [`p2p-v0.5.0`](https://github.com/FionaPreroll/vibe-p2pgame/releases/tag/p2p-v0.5.0), so no login to GitHub's npm registry is needed. To use a newer version, change the address in `package.json` to that version's release, run `pnpm install`, and read its changelog.

**The Android app** is built by CI (`.github/workflows/android.yml`). Locally, with the Android SDK: `pnpm android:sync`, then build in `android/` with `./gradlew assembleDebug`, and run the Java tests with `./gradlew testDebugUnitTest`. Without the SDK, `UpdateRulesTest` compiles and runs with plain `javac` and JUnit. The update dialogs are tested in happy-dom against a fake `AppUpdaterPlugin` (`src/ui/updates.test.ts`).

### Workflows

| Workflow      | Runs on                            | Does                                                                                                                                                         |
| ------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ci.yml`      | Pull requests and pushes to `main` | Type check, Biome, unit tests, build, browser tests; coverage of the unit and browser tests to Codecov                                                       |
| `deploy.yml`  | Pushes to `main`, by hand          | Publishes the website on GitHub Pages                                                                                                                        |
| `android.yml` | Pull requests and pushes to `main` | Builds the APK and runs the Java tests; from `main`, replaces the APK and its `version.json` in the release _Spielekiste for Android_ (tag `android-latest`) |

### Branches and pull requests

Every feature or fix gets its own branch off `main`, named `feature/<name_in_snake_case>` or `fix/<name_in_snake_case>`. While the Spielekiste is young, a finished branch may be merged into `main` directly, once `pnpm check` and `pnpm test:e2e` pass on the merged result.

### Changelog and versions

`CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/): changes players can see go under `## [Unreleased]`. A version is made only when asked: the entries move to a new `## [x.y.z] - YYYY-MM-DD` section, and `package.json` gets the same version.

## Known limits

- **Tested end to end in Chromium only.** Real phones still need trying on a hotspot.
- **The app's updates are unit-tested, but not yet tried on phones.** An app installed before builds were signed with the same key has to be uninstalled once.
- **Some Wi-Fi networks** isolate their clients, so the phones cannot see each other there; a phone's own hotspot does not.
- **The app has Capacitor's default icon** for now.
- **A game on one device is not saved:** closing the page or the app ends it, scores and all.
- **A host who closes the page ends the table:** players cannot sit down again until the host opens a new one. A player who drops out gets their place and score back by pairing again.
