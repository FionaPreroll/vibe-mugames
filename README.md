# Spielekiste

[![CI](https://github.com/FionaPreroll/vibe-mugames/actions/workflows/ci.yml/badge.svg)](https://github.com/FionaPreroll/vibe-mugames/actions/workflows/ci.yml)
[![Android](https://github.com/FionaPreroll/vibe-mugames/actions/workflows/android.yml/badge.svg)](https://github.com/FionaPreroll/vibe-mugames/actions/workflows/android.yml)

Board games for phones side by side, in the browser and as an Android app. The phones connect directly to each other by QR code, over Wi-Fi or a hotspot one of them opens: no internet, no server, no accounts. The connection comes from [`@fionapreroll/p2p`](https://github.com/FionaPreroll/vibe-p2pgame/tree/main/packages/p2p), the library behind [Spark Hunt](https://github.com/FionaPreroll/vibe-p2pgame).

## Playing

One phone opens a table; everyone else sits down at it:

1. **Open a table** on the first phone, then **Add player**: it shows a QR code.
2. On the new player's phone, **Join a table** and scan that code. The phone then shows a code of its own, which the first phone scans. Without a camera, both codes can be copied and pasted as text.
3. The host chooses a game. Up to eight phones sit at a table: two play, the others watch and take turns. After a game, the winner stays and the loser goes to the back of the queue; with just two players, they take turns in starting.

The games:

| Game                                  | Players |
| ------------------------------------- | ------- |
| Tic Tac Toe                           | 2       |
| Four in a Row (_Vier in einer Reihe_) | 2       |

English and German, as the browser's language says, or chosen on the start screen.

**Android app:** download [`spielekiste.apk`](https://github.com/FionaPreroll/vibe-mugames/releases/latest/download/spielekiste.apk) from the release _Spielekiste for Android_ and open it on the phone; Android asks once to allow installing apps from that source. These are debug builds, for playing with friends, not for the Play Store.

## How it works

- **The host decides everything.** The host's phone keeps the table (`src/core/table.ts`): who sits there, the game, the board and the scores, and sends it to every phone ten times a second as the room's state. Players send their moves as events, which arrive once each, in order; each move names the move number it is meant to be, so a move sent twice counts once. The host takes a move only from the player whose turn it is, and only if the rules allow it.
- **Rules are pure TypeScript** in `src/core`: no DOM, no network. Each game is a `BoardGame` (`src/core/board.ts`): a board of cells, which moves are legal, what a move does, and how a game ends.
- **Everything from another phone is checked** before use (`src/net/protocol.ts`), as is everything read from storage (`src/storage.ts`).

```
src/
  core/       the rules: board.ts, tictactoe.ts, fourInARow.ts, games.ts, table.ts
  net/        protocol.ts: the messages and their parsers; session.ts: the host's and players' seats
  ui/         the screens: home.ts, table.ts, boards.ts, codes.ts (QR codes and text codes)
  i18n.ts     every text players see, in English and German
  storage.ts  name, language and the player's token, in local storage
  native.ts   the Android app's back button
android/      the Android app's project (Capacitor)
tests/e2e/    Playwright: phones in separate browser profiles pair through the text codes and play
```

### Adding a game

1. Write its rules as a `BoardGame` in `src/core`, with tests beside them, and add its id to `GAME_IDS` and `GAMES`.
2. Give it a name in `src/i18n.ts`, in English and German.
3. If it needs more than a board of cells, such as dice or hidden cards, extend the table and the protocol, and raise `PROTOCOL` in `src/net/protocol.ts`. `@fionapreroll/p2p` gives each player a state of their own with `stateFor`, for cards only one player may see.

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

**The library** is installed from the file on its release, [`p2p-v0.4.0`](https://github.com/FionaPreroll/vibe-p2pgame/releases/tag/p2p-v0.4.0), so no login to GitHub's npm registry is needed. To use a newer version, change the address in `package.json` to that version's release, run `pnpm install`, and read its changelog.

**The Android app** is built by CI (`.github/workflows/android.yml`). Locally, with the Android SDK: `pnpm android:sync`, then build in `android/` with `./gradlew assembleDebug`.

### Workflows

| Workflow      | Runs on                            | Does                                                                                                     |
| ------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `ci.yml`      | Pull requests and pushes to `main` | Type check, Biome, unit tests with coverage, build, browser tests                                        |
| `deploy.yml`  | Pushes to `main`, by hand          | Publishes the website on GitHub Pages                                                                    |
| `android.yml` | Pull requests and pushes to `main` | Builds the APK; from `main`, replaces it in the release _Spielekiste for Android_ (tag `android-latest`) |

### Branches and pull requests

Every feature or fix gets its own branch off `main`, named `feature/<name_in_snake_case>` or `fix/<name_in_snake_case>`. While the Spielekiste is young, a finished branch may be merged into `main` directly, once `pnpm check` and `pnpm test:e2e` pass on the merged result.

### Changelog and versions

`CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/): changes players can see go under `## [Unreleased]`. A version is made only when asked: the entries move to a new `## [x.y.z] - YYYY-MM-DD` section, and `package.json` gets the same version.

## Known limits

- **Tested end to end in Chromium only.** Real phones still need trying on a hotspot.
- **Some Wi-Fi networks** isolate their clients, so the phones cannot see each other there; a phone's own hotspot does not.
- **The app has Capacitor's default icon** for now.
- **A host who closes the page ends the table:** players cannot sit down again until the host opens a new one. A player who drops out gets their place and score back by pairing again.
