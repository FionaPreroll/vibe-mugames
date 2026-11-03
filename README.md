# Spielekiste

[![CI](https://github.com/FionaPreroll/vibe-mugames/actions/workflows/ci.yml/badge.svg)](https://github.com/FionaPreroll/vibe-mugames/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/FionaPreroll/vibe-mugames/branch/main/graph/badge.svg)](https://codecov.io/gh/FionaPreroll/vibe-mugames)
[![Android](https://github.com/FionaPreroll/vibe-mugames/actions/workflows/android.yml/badge.svg)](https://github.com/FionaPreroll/vibe-mugames/actions/workflows/android.yml)

Board games for phones side by side, in the browser and as an Android app, or for everyone around one laptop or tablet. The phones connect directly to each other by QR code, over Wi-Fi or a hotspot one of them opens: no internet, no server, no accounts. The connection comes from [`@fionapreroll/p2p`](https://github.com/FionaPreroll/vibe-p2pgame/tree/main/packages/p2p), the library behind [Spark Hunt](https://github.com/FionaPreroll/vibe-p2pgame).

## Playing

Play in the browser at **[fionapreroll.github.io/vibe-mugames](https://fionapreroll.github.io/vibe-mugames/)**, or in the Android app (below). One phone opens a table; everyone else sits down at it:

1. **Open a table** on the first phone, then **Add player**: it shows a QR code.
2. On the new player's phone, **Join a table** and scan that code. The phone then shows a code of its own, which the first phone scans. Without a camera, both codes can be copied and pasted as text. If the camera will not focus on the screen, tap the picture to focus, zoom out and hold the phone further away, switch cameras, or take a photo of the code instead. Sending a code over may take its time: the joining phone waits up to 10 minutes for the host to take its code. If a connection fails, both phones say so and offer **Try again**.
3. The host chooses a game. Up to eight phones sit at a table: two play the board games, Sea Battle and Air Hockey, up to four Ludo, up to six Miau-Miau, Light Racers and Chinese Checkers, and the others watch and take turns. After a game, the winner stays and the others who played go to the back of the queue; when nobody waits, the next player in turn starts.

**On one device:** on a laptop or a tablet, **Play on this device** on the start screen seats two to six players at the device, with their names, and no network at all. They either take turns on one screen, which names whose turn it is and keeps the board the same way round for everyone, or, from two to four, split the screen into a part for each player, with their own view: their own cards, and in Draughts their own pieces at the bottom. A part turns round with **⟲**, for a player sitting across the table. Games with hidden cards, such as Miau-Miau, are played with open cards there: everyone can see every hand, and the lobby and the game say so. Sea Battle keeps its fleets hidden instead: taking turns, the device asks to be handed over after each player's turn and shows nothing until the next player says they hold it; on a split screen, a player's own fleet shows only while they ask to see it. In the games in real time, everyone steers at once: on one screen, each player has their own keys and buttons (W A S D, the arrow keys, I J K L and the number pad's 8 4 5 6), and in Air Hockey a finger on either half of the rink moves that half's mallet; on a split screen, each part has its own field, and Air Hockey shows each player their own half, with their goal at the bottom. The device remembers who played and how.

The games:

| Game                                  | Players |
| ------------------------------------- | ------- |
| Tic Tac Toe                           | 2       |
| Four in a Row (_Vier in einer Reihe_) | 2       |
| Nine Men's Morris (_Mühle_)           | 2       |
| Draughts (_Dame_)                     | 2       |
| Ludo (dice)                           | 2–4     |
| Miau-Miau (Mau-Mau, cards)            | 2–6     |
| Sea Battle (_Schiffe versenken_)      | 2       |
| Light Racers (_Lichtrenner_), live    | 2–6     |
| Air Hockey (_Airhockey_), live        | 2       |
| Dots and Boxes (_Käsekästchen_)       | 2       |
| Reversi                               | 2       |
| Chinese Checkers (_Sternhalma_)       | 2–6     |

**Nine Men's Morris:** each player places nine pieces, one a turn, then moves them along a line to a free neighbouring point; with only three left, they jump to any free point. Three in a row on a line make a mill, which takes one of the other player's pieces, one outside a mill if there is any. Fewer than three pieces, or none that can move, lose; fifty moves without a mill are a draw.

**Draughts:** twelve pieces each on the dark squares of 8 by 8. Pieces step diagonally forward and take by jumping, forward and backward, on and on while they can. Taking is a must, but any way to take may be chosen. A piece that ends its move on the far row is crowned and then moves and takes at any distance. A player who cannot move loses; fifty moves of crowned pieces without taking are a draw.

**Ludo:** four pieces each, in a corner of the board, and a track of 40 squares round it. On their turn, a player rolls the die and moves one of their pieces that many squares on; a six brings a piece out of the corner onto its start square, and rolls again. A piece that lands on another player's piece sends it back to its corner; two pieces of one player never share a square. After a round, a piece goes into its four home squares, by the exact number. A player with no piece on the track rolls up to three times for a six; when no piece can move, the turn passes on. Whoever has all four pieces home first wins. Tap a piece to see where it goes, then tap there. Each phone shows its own corner at the bottom left; two players sit in opposite corners.

**Miau-Miau:** five cards each, from 32 cards (seven to ace) for up to four players, or 52 for five and six. A card goes on the pile if it has the suit or the rank of the top card; otherwise, or by choice, the player draws one, and may play it at once if it fits. A seven makes the next player draw two, unless they answer with a seven, which passes four on, and so on. An eight makes the next player miss their turn. A jack goes on any card and wishes for a suit. The first to play their last card wins. Each phone sees only its own hand; a card help on the screen explains the cards.

**Sea Battle:** each player places a fleet on a sea of 10 by 10: one ship of five squares, one of four, two of three and one of two, across or down, none touching another, not even at a corner. The fleet starts shuffled; tap a ship to pick it, tap it again to turn it, tap the sea to move it there, or shuffle again, then **Ready**. Both place at the same time, then they shoot at each other's sea in turns, a square a shot: a hit shoots again, a miss passes the turn. Once every square of a ship is hit, it is sunk, and the squares around it are marked as water. Whoever sinks the whole other fleet first wins. Each phone sees only its own fleet, and every fleet once the game is over.

**Light Racers:** a game in real time. Every rider races across a grid of 40 by 40, ten squares a second, and leaves a wall of light behind. Riding into a wall, the edge or another rider puts a rider out; the last one riding wins, and riders who crash at the same moment as the last others make a draw. Turn by swiping on the field, or with **⟲** and **⟳**, or the arrow keys; riders cannot turn straight back. A ring shows each phone its rider during the countdown.

**Air Hockey:** a game in real time, for two. Lay both phones on the table, top edge to top edge: each screen is its player's half of the rink, with their goal at the bottom, and the puck slides from one screen to the other. A finger moves the mallet, which follows it quickly but not at once. A puck in a goal is a point for the other player, who gets the puck back on their side; the first to seven goals wins. Anyone watching sees the whole rink. _Pong_ is a trademark, so the Spielekiste plays air hockey, a game anyone may make.

**Dots and Boxes:** 6 by 6 dots, which make 5 by 5 boxes. In turn, each player draws a line between two neighbouring dots, across or down. Whoever draws the fourth side of a box wins it and draws again; a line that closes no box passes the turn. Once every line is drawn, whoever holds more boxes wins.

**Reversi:** 8 by 8 squares, two pieces each crosswise in the middle to start. A piece goes where it encloses one or more lines of the other's pieces, across, down or diagonally, between it and one of the player's own: those all turn. A player who cannot enclose anything passes; once neither can, whoever has more pieces wins. The board marks where a piece may go. _Othello_ is a trademark, so the Spielekiste plays Reversi, its older name.

**Chinese Checkers:** a star of 121 holes, for two to six, each with ten pieces in a triangle of the star, across from another player's or from an empty one. A move is a step to a free neighbouring hole, or jumps, each over one neighbouring piece, anyone's, to the free hole behind it, as many in a row as the player likes; nothing is taken. The first to fill the triangle across with their pieces wins; a piece of another player that never left its own triangle there does not spoil it. A player who cannot move passes, and thirty rounds in which no piece reaches its triangle are a draw. Tap a piece, then where it goes: the board finds the way there. Each phone turns the star so that its own triangle is at the bottom, and rings each player's goal in their colour.

To make a move of several steps, tap the piece, then where it goes, and every square a jump lands on.

English and German, as the browser's language says, or chosen on the start screen.

**Android app:** download [`spielekiste.apk`](https://github.com/FionaPreroll/vibe-mugames/releases/latest/download/spielekiste.apk) from the release _Spielekiste for Android_ and open it on the phone; Android asks once to allow installing apps from that source. A newer APK installs over the older one and keeps the settings. These are debug builds, for playing with friends, not for the Play Store.

**Updates:**

- **In the app,** if you agree at its first start or switch it on under _Updates_ on the start screen: at every start, the app looks for a newer build and offers to install it; _Look for a new version now_ looks at once. The dialog says how large the download is, and warns when the phone is on mobile data or another metered connection. While downloading, it shows the progress; **Pause** stops, and the download goes on where it stopped, also after the app was closed. Android asks before installing; the first time, it wants you to allow the app to install apps: the app opens that setting, and goes on installing by itself when you come back, without downloading again. The app hands the update to Android as an installer session, which reports back: the dialog says when Android waits for your confirmation, and if Android's installer does not open, or the update was not installed, it says so and offers to try again. The start screen shows the app's build number.
- **On the website,** an open page looks for a newer build when it starts, every quarter of an hour and when it comes back to the front. The start screen then says so, and _Load it_ loads the new version. It does not say so at a table, as loading the page anew there would end the table.

## How it works

- **The host decides everything.** The host's phone keeps the table (`src/core/table.ts`): who sits there, the game, the board and the scores, and sends it to every phone ten times a second as the room's state, 30 times in a game in real time. Players send their moves as events, which arrive once each, in order; each move names the move number it is meant to be, so a move sent twice counts once. The host takes a move only from the player whose turn it is, and only if the rules allow it.
- **Rules are pure TypeScript** in `src/core`: no DOM, no network. Each game is a `BoardGame` (`src/core/board.ts`): where a game starts, for how many players (`seats`, and `minSeats` for games such as Sternhalma that take from two to six), every move legal now, what a move does, and how a game ends. A game's `Position` is its board of cells (each empty or a piece: its seat, plus `KIND` once crowned), whose turn it is, which the rules decide, the pieces still in hand, the phase (such as taking a piece after a mill) and a count of quiet moves for draws. A move is a path of cells: a cell or column, from and to, or every square of a jump. Käsekästchen's cells are its lines and then its boxes, each empty or the seat that drew or holds it. Sternhalma knows how many play from the pieces on its board, as none is ever taken, and lists one way of jumps to each hole a piece can reach, so its board sends a piece straight to the hole tapped.
- **Dice are the host's.** Ludo (`src/core/ludo.ts`) is a game of its own too, with nothing hidden: the table sends all of it, `TableState.ludo`, to everyone. A player's move is a number: 4 to roll, or the piece (0 to 3) to move by the number rolled. The host rolls with the same cryptographic randomness as the cards, and passes the turn on by itself when no piece can move. Each piece is a step of its own way (in the corner, 0 to 39 round the track from its start square, 40 to 43 at home), so the board (`src/ui/ludo.ts`) only places it, turned to each viewer.
- **Cards stay hidden.** Miau-Miau (`src/core/miaumiau.ts`) is a game of its own, not a `BoardGame`: the host alone knows every hand, and the library's `stateFor` sends each phone the table with only its own cards (`MiauView`), and how many the others hold. Its moves travel as numbers too: a card (with a jack's wished suit), 52 to draw, 53 to pass. The host shuffles with the browser's cryptographic randomness.
- **Games in real time** (Lichtrenner, `src/core/lichtrenner.ts`, and air hockey, `src/core/airhockey.ts`) have no turns. Each player's phone sends what they want now as the room's input, 30 times a second, of which only the newest counts: a heading, or where the mallet should go in their own half as they see it, after the number of the game it is meant for (`round`), so last game's input never steers the next. The host runs the game by the time that passed, 30 times a second (`Table.tick`), and sends the table that often while one is on, and every third tick otherwise. Lichtrenner moves a cell a step on a grid and sends each rider's wall as the cells where it turns, never more than fits in one message; air hockey runs its puck in steps of 1/240 s, so that nothing slides through a mallet, and phones draw the puck gliding on between two states. The fields are canvases (`src/ui/race.ts`, `src/ui/rink.ts`) that stay while the screen around them is drawn anew, through `LiveSlot` (`src/ui/live.ts`).
- **Fleets stay hidden.** Sea Battle (`src/core/seeschlacht.ts`) works the same way: the host alone knows both fleets, and each phone gets `SeaView`, with its own fleet, every shot, the hits and the ships sunk. A move is a shot (a square, 0 to 99) or a whole fleet (a number for each ship: its first square, plus 100 if it lies down). Both players place at the same time, so the table takes a fleet whatever move number it comes with, as each player places once, and never shows it as the last move.
- **One device keeps its own table.** `LocalTable` (`src/local.ts`) is the table of `src/core/table.ts` with every player on the device and nothing sent anywhere; each move is taken from whoever's turn it is. Taking turns, the screen (`src/ui/local.ts`) shows the game as the player to move sees it; a split screen shows each player's own view of it side by side. Both draw the game with the same views as a phone's table (`src/ui/game.ts`). `hasHiddenCards` (`src/core/games.ts`) names the games that are played with open cards there, and `handsOver` those that are hidden there instead: taking turns, the screen asks for the device to be handed over between players; on a split screen, it hides each player's own until they ask.
- **Everything from another phone is checked** before use (`src/net/protocol.ts`), as is everything read from storage (`src/storage.ts`).
- **App updates** (`src/updates.ts`, `src/ui/updates.ts`, `AppUpdaterPlugin.java`): the release _Spielekiste for Android_ holds `version.json` beside the APK, naming its build and size. The app compares it with its own build number, the APK's `versionCode`; CI sets both to the Android workflow's run number. The plugin reads and downloads only from this repository's releases, over HTTPS, and its decisions are in plain Java (`UpdateRules`), with JUnit tests beside them. Android installs an update only if it is signed with the same key as the app installed: every build is signed with `android/app/debug.keystore`, in the repository on purpose. It is public, so it proves only that an update comes from a build of this project.
- **Website updates** (`src/webUpdates.ts`, `src/ui/webUpdates.ts`): every build writes `version.json` beside the page (`vite.config.ts`), with its version, commit and time. The page reads the deployed one, past every cache, and calls it newer if it is another commit, built later. The app does not look there, as its files are inside it.

```
src/
  core/       the rules: board.ts, tictactoe.ts, fourInARow.ts, muehle.ts, dame.ts, kaesekaestchen.ts,
              reversi.ts, sternhalma.ts, ludo.ts, miaumiau.ts, seeschlacht.ts, lichtrenner.ts, airhockey.ts,
              games.ts, table.ts
  net/        protocol.ts: the messages and their parsers; session.ts: the host's and players' seats
  ui/         the screens: home.ts, table.ts, local.ts (playing on one device), game.ts (what every
              table shows), boards.ts, ludo.ts (Ludo's board and die), cards.ts, sea.ts (Sea
              Battle's seas), live.ts, canvas.ts, race.ts and rink.ts (the fields of the games in
              real time), codes.ts (QR codes and text codes), updates.ts and webUpdates.ts (the
              update dialogs and notes)
  i18n.ts     every text players see, in English and German
  local.ts    the table on one device
  storage.ts  name, language, the update switch, the camera last used, who last played on this device
              and the player's token, in local storage
  native.ts   the Android app's back button
  updates.ts  the app's updates from its release; webUpdates.ts: the website's
android/      the Android app's project (Capacitor), with AppUpdaterPlugin and UpdateRules
tools/        icons.ts: draws the icon, for the app and the website
tests/e2e/    Playwright: phones in separate browser profiles pair through the text codes and play;
              the website offers a newer build; pairing.spec.ts: slow, wrong and failed codes, and copying;
              local.spec.ts: playing on one device, taking turns (Sea Battle handed over) and on a split screen;
              live.spec.ts: the games in real time between phones and on one device
```

### Adding a game

1. Write its rules as a `BoardGame` in `src/core`, with tests beside them, and add its id to `GAME_IDS` and `GAMES`.
2. Give it a name in `src/i18n.ts`, in English and German, and a board in `src/ui/boards.ts`. Moves of several cells are picked there one cell at a time from the rules' `moves()`, so a board only needs to draw its cells.
3. If it needs more than a board of cells, such as dice or hidden cards, extend the table and the protocol, and raise `PROTOCOL` in `src/net/protocol.ts`. Miau-Miau shows how: its own state on the table, a view per player sent through `stateFor`, its seat range in `seatRange` (`src/core/games.ts`), and a parser for its view. A game that hides something from some players also goes into `hasHiddenCards` there, so that on one device it says it is played open, or, like Sea Battle, into `handsOver`, if one device can keep it hidden by being handed over.
4. A game in real time goes into `LIVE_GAME_IDS` (`src/core/board.ts`): its rules run by time and by what each seat wants (`Table.input` and `Table.tick`), and its field is a canvas made by `LiveSlot` (`src/ui/live.ts`), as Lichtrenner and air hockey show.

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

**The icon**, an open games box with a card, a draughts piece and a pawn, is drawn in `tools/icons.ts`. `pnpm icons` writes everything made from it: the app's adaptive icon as vector drawables in `android/app/src/main/res/drawable/` (a background of squares, the box, and a one-colour layer for themed icons), its PNGs for Android 7 in `mipmap-*/`, and the website's `public/icon.svg`. The app's start screen shows the same box on the same dark blue.

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
- **A game on one device is not saved:** closing the page or the app ends it, scores and all.
- **A host who closes the page ends the table:** players cannot sit down again until the host opens a new one. A player who drops out gets their place and score back by pairing again.
