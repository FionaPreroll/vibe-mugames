# Changelog

All changes players can notice are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- The Spielekiste: board games for phones side by side, connected directly by QR code, without internet or a server. One phone opens a table, the others sit down at it.
- Tic Tac Toe and Four in a Row (_Vier in einer Reihe_), for two players. Everyone else at the table watches, and after a game the winner stays and the loser goes to the back of the queue. Two players take turns in starting.
- Scores for every player at the table, kept while a player drops out and comes back.
- Text codes for phones without a camera.
- English and German.
- Nine Men's Morris (_Mühle_): place nine pieces each, then move them along the lines; a mill takes one of the other player's pieces, and with three left a player's pieces jump.
- Draughts (_Dame_) on 8 by 8 squares: taking is a must, pieces jump on while they can, forward and backward, and crowned pieces fly across the board. Each player sees their own pieces at the bottom.
- Moves of several steps are picked on the board a cell at a time: the piece, then where it goes. The board shows which pieces can move, where they can go, and the move made last.
- Miau-Miau, the card game Mau-Mau, for two to six players, each holding cards only they see. Play a card of the same suit or rank; a seven makes the next player draw two (or answer with a seven), an eight makes them miss a turn, and a jack goes on anything and wishes for a suit. The first to play their last card wins. Up to four players use 32 cards, five and six a full deck of 52.
- Hints for learning Miau-Miau: sevens, eights and jacks carry a mark, a card help explains what each card does, and a line says what the last card does now, such as who must draw or who misses a turn.
- After a game of more than two, the winner stays and the others go to the back of the queue; when nobody waits, the next player in turn starts.
- An Android app, whose newest build is always on the repository's releases page.
- Updates in the Android app, if you agree at its first start or switch them on under _Updates_ on the start screen: at every start, the app looks for a newer build and offers to install it, and _Look for a new version now_ looks at once. The dialog says how large the download is, and warns on mobile data or another metered connection. The download can be paused and goes on where it stopped, also after the app was closed. Android asks before installing; the first time, it wants you to allow the app to install apps, and installing goes on by itself when you come back. If Android's installer does not open, or the update was not installed, the dialog says so and offers to try again.
- The website tells you on the start screen when a newer version is out, and loads it with a tap.

### Changed

- Every build of the Android app is now signed with the same key, so a new one installs over the one before and keeps the app's settings. An app installed before this change has to be uninstalled once.

[Unreleased]: https://github.com/FionaPreroll/vibe-mugames/commits/main
