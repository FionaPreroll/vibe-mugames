# How it works

The Spielekiste's design, for developers: who decides what, how each kind of game travels between phones, and where everything lives. [NETWORKING.md](NETWORKING.md) describes the network from the bottom up: pairing codes, WebRTC and Bluetooth, the room, the table and each game's messages, and air hockey's Kalman filter with its benchmark and plots.

## The host decides everything

The host's phone keeps the table (`src/core/table.ts`): who sits there, the game, the board and the scores, and sends it to every phone ten times a second as the room's state, 30 times in a game in real time. Players send their moves as events, which arrive once each, in order; each move names the move number it is meant to be, so a move sent twice counts once. The host takes a move only from the player whose turn it is, and only if the rules allow it.

## Rules are pure TypeScript

Rules are pure TypeScript in `src/core`: no DOM, no network. Each game is a `BoardGame` (`src/core/board.ts`): where a game starts, for how many players (`seats`, and `minSeats` for games such as Sternhalma that take from two to six), every move legal now, what a move does, and how a game ends. A game's `Position` is its board of cells (each empty or a piece: its seat, plus `KIND` once crowned), whose turn it is, which the rules decide, the pieces still in hand, the phase (such as taking a piece after a mill) and a count of quiet moves for draws. A move is a path of cells: a cell or column, from and to, or every square of a jump. Käsekästchen's cells are its lines and then its boxes, each empty or the seat that drew or holds it. Sternhalma knows how many play from the pieces on its board, as none is ever taken, and lists one way of jumps to each hole a piece can reach, so its board sends a piece straight to the hole tapped.

## Dice are the host's

Ludo (`src/core/ludo.ts`) is a game of its own too, with nothing hidden: the table sends all of it, `TableState.ludo`, to everyone. A player's move is a number: 4 to roll, or the piece (0 to 3) to move by the number rolled. The host rolls with the same cryptographic randomness as the cards, and passes the turn on by itself when no piece can move. Each piece is a step of its own way (in the corner, 0 to 39 round the track from its start square, 40 to 43 at home), so the board (`src/ui/ludo.ts`) only places it, turned to each viewer.

## Cards stay hidden

Miau-Miau (`src/core/miaumiau.ts`) is a game of its own, not a `BoardGame`: the host alone knows every hand, and the library's `stateFor` sends each phone the table with only its own cards (`MiauView`), and how many the others hold. Its moves travel as numbers too: a card (with a jack's wished suit), 52 to draw, 53 to pass. The host shuffles with the browser's cryptographic randomness.

## Fleets stay hidden

Sea Battle (`src/core/seeschlacht.ts`) works the same way: the host alone knows both fleets, and each phone gets `SeaView`, with its own fleet, every shot, the hits and the ships sunk. A move is a shot (a square, 0 to 99) or a whole fleet (a number for each ship: its first square, plus 100 if it lies down). Both players place at the same time, so the table takes a fleet whatever move number it comes with, as each player places once, and never shows it as the last move.

## Dice and roles stay hidden

Dice and roles stay hidden the same way. In Mäxchen (`src/core/maexchen.ts`), the host rolls with the browser's cryptographic randomness, and only the roller's `MaexView` holds the dice, until a doubt lifts the cup for everyone. A move is a number: 1 rolls, 2 doubts, 3 gives up, and a throw such as 53 says it. In Werwolf (`src/core/werwolf.ts`), each phone's `WolfView` holds its own role, the other wolves' for a wolf, what the seer learned, and the roles of those out. Everyone chooses at once, at night and by day, so a choice (the seat chosen) may come with an older move number, but none from before the night or day began, and none ever shows as the last move. A won game counts for every player of the winning team.

## Games in real time

Games in real time (Lichtrenner, `src/core/lichtrenner.ts`, and air hockey, `src/core/airhockey.ts`) have no turns. Each player's phone sends what they want now as the room's input, 30 times a second, of which only the newest counts: a heading, or where the mallet should go in their own half as they see it, after the number of the game it is meant for (`round`), so last game's input never steers the next. The host runs the game by the time that passed, 30 times a second (`Table.tick`), and sends the table that often while one is on, and every third tick otherwise. Lichtrenner moves a cell a step on a grid and sends each rider's wall as the cells where it turns, never more than fits in one message; air hockey runs its puck in steps of 1/240 s, so that nothing slides through a mallet, and phones draw the puck gliding on between two states.

Each state carries the host's game time (`HockeyState.clock`). With _Smooth out the network_, a phone draws by that clock as a Kalman filter reads it (`HostClock`, `src/net/clock.ts`): it estimates one number, the offset from the phone's clock to the host's as states arrive here, which holds the clocks' difference and the mean delay; each state measures it, their scatter is the jitter, which the filter learns as it goes, and the offset may drift slowly, as a connection's delay does. Positions are not filtered, as each state has them exactly: only when a state arrives is noisy. The puck and the other mallet glide on from the newest state to the filtered time, a correction from a new state fades in within a tenth of a second (`Eased`), and a mallet steered on the phone moves to the finger at once, by the host's own rule (`slide`), instead of a round trip later. Without it, phones draw each state from when it arrived.

Both ways of drawing are in `src/net/smooth.ts`, which the benchmark runs too: see [docs/NETWORKING.md](NETWORKING.md#smoothing-air-hockey). The fields are canvases (`src/ui/race.ts`, `src/ui/rink.ts`) that stay while the screen around them is drawn anew, through `LiveSlot` (`src/ui/live.ts`).

## One device keeps its own table

`LocalTable` (`src/local.ts`) is the table of `src/core/table.ts` with every player on the device and nothing sent anywhere; each move is taken from whoever's turn it is. Taking turns, the screen (`src/ui/local.ts`) shows the game as the player to move sees it; a split screen shows each player's own view of it side by side. Both draw the game with the same views as a phone's table (`src/ui/game.ts`). `hasHiddenCards` (`src/core/games.ts`) names the games that are played with open cards there, and `handsOver` those that are hidden there instead: taking turns, the screen asks for the device to be handed over between players; on a split screen, it hides each player's own until they ask.

## Everything from another phone is checked

Everything from another phone is checked before use (`src/net/protocol.ts`), as is everything read from storage (`src/storage.ts`).

## Bluetooth

Bluetooth comes from [`@fionapreroll/p2p-nearby`](https://github.com/FionaPreroll/vibe-p2pgame/tree/main/packages/p2p-nearby), Google's Nearby Connections as a connection of the library, installed like `@fionapreroll/p2p` from the file on its release; `cap sync` adds its native plugin and permissions to the app. Its flow is the library's too: `NearbyHosting` for the host's list of players who ask, with their codes, and `NearbySearch` for the tables nearby. `src/bluetooth.ts` gives it the Spielekiste's own Nearby service, so that only Spielekiste phones find each other, and `src/ui/bluetooth.ts` draws it, with the choice between QR code and Bluetooth. A table takes players over Bluetooth into the same room as those over Wi-Fi.

## The connection and the debug report

The connection and the debug report come from the library's `@fionapreroll/p2p/debug`, shared with Spark Hunt: every room samples its connections once a second (`HostRoom.net`, `GuestRoom.net`), `Connection.details()` tells what carries one, `HostRoom.testConnections` runs the test, and `connectionView` draws it all, with the Spielekiste's texts (`src/ui/connection.ts`) and look. The table's top line draws the small graph (`src/ui/table.ts`). `src/log.ts` keeps the log, the library's `DebugLog`, which masks codes, addresses and tokens; `src/net/netlog.ts` remembers the connections of the last table; `src/report.ts` writes the report, and `src/ui/report.ts` shows it.

## Themes and stickers

The themes live in `src/theme.ts`, `src/ui/theme.ts` and `src/themes.css`, and [THEMES.md](THEMES.md) describes them. Every colour of the style sheet is a token on `:root` in `src/style.css`, the classic look's, such as `--bg`, `--accent`, `--seat-0` to `--seat-5`, `--wood`, `--paper` or `--sea`, and nothing else in it names a colour of its own. Each other theme gives the tokens its own values in `src/themes.css`, on `<html data-theme>`, set by `applyTheme` from the settings; the tokens are set on `[data-theme]` alone, so that each swatch in the settings, with its own `data-theme`, shows its theme. The rules' drawings use the tokens as `var(--…)` (`INK` in `src/ui/rules/draw.ts`), and the canvases of the games in real time read them with `themeColour` (`src/ui/canvas.ts`), until the theme changes. A theme's decorations go into `.decor`, a layer behind every screen. Chinese New Year's dates are a table (`CHINESE_NEW_YEAR`), as they follow the moon, up to 2040; Easter is worked out. The README's screenshots show the classic look, except those of the themes. A new colour on a board is a new token, with a value in each theme that needs another.

The stickers on the start screen's box come from `stickersOn` (`src/awareness.ts`), and `hero()` (`src/ui/hero.ts`) draws them; [STICKERS.md](STICKERS.md) describes them.

## App updates

App updates come from the library [`@fionapreroll/app-updates`](https://github.com/FionaPreroll/vibe-p2pgame/tree/main/packages/app-updates), which Spark Hunt uses too (`src/updates.ts` names the release, `src/ui/updates.ts` gives its dialogs the Spielekiste's texts): the release _Spielekiste for Android_ holds `version.json` beside the APK, naming its build and size. The app compares it with its own build number, the APK's `versionCode`; CI sets both to the Android workflow's run number. The library's plugin reads and downloads only from the releases named in `capacitor.config.ts`, this repository's, over HTTPS, and brings its permissions with it, so a build for the Play Store, which forbids apps updating themselves, can leave the package out. Android installs an update only if it is signed with the same key as the app installed: every build is signed with `android/app/debug.keystore`, in the repository on purpose. It is public, so it proves only that an update comes from a build of this project.

## Website updates

Website updates live in `src/webUpdates.ts` and `src/ui/webUpdates.ts`, switched in `src/ui/settings.ts`. Every build writes `version.json` beside the page (`vite.config.ts`), with its version, commit and time. The page reads the deployed one, past every cache, and calls it newer if it is another commit, built later. The app does not look there, as its files are inside it.

## Offline and installing

Offline use and installing live in `src/offline.ts` and `tools/serviceWorker.ts`. `public/manifest.webmanifest` names the website, its colours and icons for installing; it fixes no orientation, for the games on a phone on its side and split screens.

After every build, `tools/serviceWorker.ts` writes `sw.js`, a service worker with the list of every file built and a version hashed from their contents, so each change is a new worker. It keeps them all in a cache of its own scope, serves the page and its files from there, and always leaves `version.json` to the network. `src/main.ts` registers it on the website in production builds only, never in the app; a new worker takes over as soon as it has kept its files, which leaves an open page running the build it started with (the website loads all its code at the start), so the next start runs the new one. _Load it_ (`loadNewer`) asks the browser to look for a new worker, waits for it to take over, and only then loads the page anew. Spark Hunt has the same worker.

## About

About (`src/ui/about.ts`, `src/ui/privacy.ts`) reads `CHANGELOG.md` and the privacy policy as Markdown (`src/markdown.ts`), into elements built from text, so nothing in them is taken as HTML. Every build writes `licenses.json` beside the page (`tools/licenses.ts`): the packages of other people's code in the bundle, found from the bundle's own modules, with their license and NOTICE files; `@fionapreroll/p2p` is left out, as it is the same developer's. The Android app's native parts are listed by hand in `NATIVE` (`src/ui/about.ts`), from its Gradle files. `tools/privacyPage.ts` writes `privacy.html`.

## Layout

```
src/
  core/       the rules: board.ts, tictactoe.ts, ultimate.ts, fourInARow.ts, muehle.ts, dame.ts, kaesekaestchen.ts,
              reversi.ts, sternhalma.ts, ludo.ts, miaumiau.ts, seeschlacht.ts, maexchen.ts, werwolf.ts,
              lichtrenner.ts, airhockey.ts, games.ts, table.ts
  net/        protocol.ts: the messages and their parsers; session.ts: the host's and players' seats;
              clock.ts and smooth.ts: air hockey's drawing between states, with the Kalman filter;
              netlog.ts: the connections of the last table, for the connection view and the report
  ui/         the screens: home.ts, table.ts, local.ts (playing on one device), game.ts (what every
              table shows), boards.ts, ludo.ts (Ludo's board and die), cards.ts, sea.ts (Sea
              Battle's seas), dice.ts (Mäxchen), village.ts (Werwolf), live.ts, canvas.ts, race.ts
              and rink.ts (the fields of the games in real time), codes.ts (QR codes and text
              codes), rules/ (each game's thumbnail and rules with drawings), hero.ts (the start
              screen's picture, made of those thumbnails), updates.ts and webUpdates.ts (the
              update dialogs and notes), settings.ts, about.ts, privacy.ts and markdownView.ts
              (About and the privacy policy), connection.ts and report.ts (the connection
              details and the debug report)
  log.ts      the log for the debug report; report.ts writes the report
  markdown.ts the little Markdown of the changelog and the privacy policy
  i18n.ts     every text players see, in English and German
  local.ts    the table on one device
  offline.ts  the website's service worker: registering it, and loading a newer build
  theme.ts    the themes, and the one the calendar suggests; ui/theme.ts applies them, themes.css colours them
  awareness.ts the days of the stickers on the start screen's box; ui/hero.ts draws them
  storage.ts  name, language, the theme, the update switches, the buzz switch, the games chosen lately, the camera
              last used, who last played on this device and the player's token, in local storage
  native.ts   the Android app's back button, keeping the screen on, and the buzz on a turn
  bluetooth.ts the Spielekiste's Nearby service for @fionapreroll/p2p-nearby; ui/bluetooth.ts draws it
  updates.ts  the app's updates from its release; webUpdates.ts: the website's
PRIVACY.md    the privacy policy, PRIVACY.de.md in German
public/       icon.svg, icons/ (made by tools/icons.ts) and manifest.webmanifest, for installing the website
android/      the Android app's project (Capacitor), with KeepAwakePlugin, which keeps the screen on
tools/        icons.ts: draws the icon, for the app and the website; licenses.ts, privacyPage.ts and
              serviceWorker.ts: licenses.json, privacy.html and sw.js in every build; smoothing.ts
              and charts.ts: the benchmark of air hockey's smoothing, and its plots
docs/         PLAYING.md and GAMES.md: playing in detail, and every game's rules; ARCHITECTURE.md
              (this page) and DEVELOPMENT.md: how it works, and how to work on it; THEMES.md and
              STICKERS.md: every theme, and the stickers on the start screen's box; NETWORKING.md:
              the network's layers, each game's messages and the Kalman filter; networking/: the
              benchmark's numbers and plots, made by `pnpm bench:smoothing`; screenshots/: the
              README's pictures, made by `pnpm screenshots`
tests/e2e/    Playwright: phones in separate browser profiles pair through the text codes and play;
              the website offers a newer build; pairing.spec.ts: slow, wrong and failed codes, and copying;
              local.spec.ts: playing on one device, taking turns (Sea Battle handed over) and on a split screen;
              live.spec.ts: the games in real time between phones and on one device;
              party.spec.ts: Mäxchen and Werwolf between phones, and Werwolf handed round one device
              about.spec.ts: About, its licenses, and the privacy policy in it and as privacy.html;
              connection.spec.ts: the connection details, the connection test and the debug report;
              offline.spec.ts: the built website installs, opens offline, and takes a new build
```
