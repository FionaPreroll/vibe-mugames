# Notes for Claude

The README describes the Spielekiste in short; `docs/` holds the details, among them `docs/DEVELOPMENT.md` (its conventions) and `docs/ARCHITECTURE.md` (its layout). These rules hold in every session:

## Branches

- Every feature or fix gets its own branch off `origin/main`, named `feature/<name_in_snake_case>` or `fix/<name_in_snake_case>`, even when the session suggests another name, such as `claude/…`.
- While the Spielekiste is in development, a finished branch may be merged into `main` directly, without a pull request. Run `pnpm check` and `pnpm test:e2e` on the merged result first, push the branch too, and never rewrite the history of `main`.

## Changelog and README

- A change that players see adds that change to `CHANGELOG.md`, under `## [Unreleased]`, in the section it belongs to (`### Added`, `### Changed`, `### Fixed` or `### Removed`), in the same branch. Write it for players, in English. Changes only developers notice need no entry.
- A new version is made only when asked: see "Changelog and versions" in `docs/DEVELOPMENT.md`.
- A change that players or developers notice updates the README, or the page of `docs/` it belongs to, in the same branch. The README starts with its badges (CI, Coverage, Android) and keeps them.

## Privacy

- `PRIVACY.md` and `PRIVACY.de.md` are the privacy policy, shown under About and built into `privacy.html` for app stores. A change to what the Spielekiste keeps, shows other phones, sends anywhere or asks permission for updates both in the same branch, and the changelog says so.

## Games

- Only games that are free to make: traditional games (Tic Tac Toe, Mühle, Dame, Ludo, Mau-Mau, …) and games of our own. No copies of games that belong to someone, nor their names: "Vier in einer Reihe", not "4 gewinnt".
- The rules live in `src/core` as pure TypeScript: no DOM, no network, and no imports from other `src/` folders. Each game has tests beside it.
- The host decides everything; players only send moves and draw the table the host sends.

## The library

- `@fionapreroll/p2p`, `@fionapreroll/p2p-nearby` (Bluetooth) and `@fionapreroll/app-updates` (the app's updates) come from the files on their releases in `FionaPreroll/vibe-p2pgame` (see "The libraries" in `docs/DEVELOPMENT.md`). `src/ui/bluetooth.ts` only draws `p2p-nearby`'s flow (`NearbyHosting`, `NearbySearch`): what any game would do over Bluetooth belongs in the library. They are developed there, not here: what a game needs from them goes into that repository, with a new version.
- Use the newest version of the library: when it gets a new one, move `package.json` to it in a branch of its own.

## Code

- Use pnpm, never npm or yarn. Run `pnpm check` before every push, and `pnpm test:e2e` when a change touches pairing, the network or the screens.
- Raise `PROTOCOL` in `src/net/protocol.ts` whenever the table or the events change, so phones with different versions refuse to play together instead of misreading each other.
- Every value read from storage or from another phone is checked before use: storage through `parseSettings` and the like, messages by the parsers in `src/net/protocol.ts`.
- Every text players see goes through `t()` from `src/i18n.ts`, with an English and a German version.
- Native features go through `src/native.ts` and must also work in a browser, where they do nothing.
- `android/` is the Capacitor project, and committed; nothing of the web build is committed there. This container cannot reach Google's Android downloads: the APK is built by `.github/workflows/android.yml` only.
