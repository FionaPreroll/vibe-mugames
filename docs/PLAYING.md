# Playing

How to play the Spielekiste, in more detail than the README: pairing phones, playing on one device, the screens, the settings and what the Spielekiste does when something goes wrong.

## At a table of phones

Play in the browser at **[fionapreroll.github.io/vibe-mugames](https://fionapreroll.github.io/vibe-mugames/)**, or in the [Android app](#android-app). One phone opens a table; everyone else sits down at it:

1. **Open a table** on the first phone, then **Add player**: it shows a QR code. In the app, both phones can connect by Bluetooth instead ([below](#by-bluetooth-in-the-app)).
2. On the new player's phone, **Join a table** and scan that code. The phone then shows a code of its own, which the first phone scans.
   Without a camera, both codes can be copied and pasted as text. If the camera will not focus on the screen, tap the picture to focus, zoom out and hold the phone further away, switch cameras, or take a photo of the code instead. Sending a code over may take its time: the joining phone waits up to 10 minutes for the host to take its code. If a connection fails, both phones say so and offer **Try again**.
3. The host chooses a game. Up to eight phones sit at a table: two play the board games, Sea Battle and Air Hockey, up to four Ludo, up to six Miau-Miau, Light Racers and Chinese Checkers, up to eight Mäxchen and City, Country, River, four to eight Werewolf, and the others watch and take turns. After a game, the winner stays and the others who played go to the back of the queue; when nobody waits, the next player in turn starts.

## By Bluetooth, in the app

When joining a table or adding a player, the app asks how the phones connect: **QR code**, over the same Wi-Fi or a hotspot, or **Bluetooth**, without any Wi-Fi, if both phones have the app. With Bluetooth, the host's **Add player** makes the table visible to phones nearby; the player's phone lists the tables it finds, and the player taps the host's. Both phones show the same four-digit code: the host lets the player in only if it matches, and the dialog stays open for more players. One table can mix both ways. The first time, Android asks to allow nearby devices, and location, which it needs to find phones nearby over Bluetooth.

## On one device

On a laptop or a tablet, **Play on this device** on the start screen seats two to six players at the device, with their names, and no network at all. They either take turns on one screen, which names whose turn it is and keeps the board the same way round for everyone, or, from two to four, split the screen into a part for each player, with their own view: their own cards, and in Draughts their own pieces at the bottom. A part turns round with **⟲**, for a player sitting across the table.

Games with hidden cards, such as Miau-Miau, are played with open cards there: everyone can see every hand, and the lobby and the game say so. Sea Battle keeps its fleets hidden instead, Mäxchen the dice under the cup and Werewolf the roles: taking turns, the device asks to be handed over after each player's turn and shows nothing until the next player says they hold it; on a split screen, a player's own fleet, dice or role shows only while they ask to see it. In City, Country, River, everyone writes in turn, while the others look away, and the answers are then checked together.

In the games in real time, everyone steers at once: on one screen, each player has their own keys and buttons (W A S D, the arrow keys, I J K L and the number pad's 8 4 5 6), and in Air Hockey a finger on either half of the rink moves that half's mallet; on a split screen, each part has its own field, and Air Hockey shows each player the rink from their end, with their goal at the bottom (or only their half, as the settings say). The device remembers who played and how.

## Screens

On a phone held upright, a game shows its board under whose turn it is. On a laptop, a tablet on its side or a phone on its side, the board stands on the left, as large as the screen is high, and whose turn it is, the help and the players on the right; a tablet held upright shows larger boards. The page does not stop two fingers from zooming in the browser, but the boards fit the screen by themselves, so that two players' fingers on one screen, a swipe in Light Racers or a mallet in Air Hockey are never taken for a zoom. **⛶** gives the game the whole screen, where the browser can (not on iPhones, and not needed in the app).

While a player sits at a table, the screen stays on, in the app (`KeepAwakePlugin.java`) and in browsers with a wake lock, as a phone that goes dark drops out; a short buzz says it is their turn, unless switched off in the settings. The chooser shows the three games chosen last on the device on top, under _Played lately_.

## Themes and stickers

Under _Settings_ → _Theme_, the Spielekiste takes on other colours, and by default it follows the seasons. [THEMES.md](THEMES.md) lists every theme. On queer and trans days, weeks and months, a sticker on the box on the start screen says so; [STICKERS.md](STICKERS.md) shows them all.

## Languages

English and German, as the browser's language says, or chosen on the start screen.

## About the Spielekiste

At the bottom of the start screen, shows the version, build and date, the contact address (fipreroll+app@gmail.com), the source code, the changelog, the open-source libraries inside with their license texts (in the app, also its native parts), and the privacy policy.

## Privacy

No accounts, no server, no advertising, no tracking. The policy is [`PRIVACY.md`](../PRIVACY.md), in German [`PRIVACY.de.md`](../PRIVACY.de.md); the Spielekiste shows it in the player's language, and every build puts both on one page of its own, [`privacy.html`](https://fionapreroll.github.io/vibe-mugames/privacy.html), the address for an app store.

A change to what the Spielekiste keeps, shows other phones, sends anywhere or asks permission for changes both files, with the same sections (`src/privacy.test.ts` checks that), and the changelog says so.

## Installing the website

In Chrome, on Android or a computer, _Install app_ or _Add to home screen_ puts the Spielekiste beside the other apps, where it opens in a window of its own, without the browser's bars, in any orientation. Once opened, the website keeps itself for offline use, installed or not, and starts without internet, such as on a hotspot where the phones pair anyway. Each time it opens with internet, the browser fetches a newer version, if there is one, in the background, and runs it from the next start on; a page that is open, at a table or not, goes on with the version it started with.

## Android app

Download [`spielekiste.apk`](https://github.com/FionaPreroll/vibe-mugames/releases/latest/download/spielekiste.apk) from the release _Spielekiste for Android_ and open it on the phone; Android asks once to allow installing apps from that source. The website links there too, on its start screen and in the settings. A newer APK installs over the older one and keeps the settings. These are debug builds, for playing with friends, not for the Play Store.

## Updates

Updates are opt-in, in the settings (⚙ on the start screen):

- **In the app,** if you agree at its first start or switch it on in the settings: at every start, the app looks for a newer build and offers to install it; _Look for a new version now_ looks at once. The dialog says how large the download is, and warns when the phone is on mobile data or another metered connection. While downloading, it shows the progress; **Pause** stops, and the download goes on where it stopped, also after the app was closed. Android asks before installing; the first time, it wants you to allow the app to install apps: the app opens that setting, and goes on installing by itself when you come back, without downloading again. The app hands the update to Android as an installer session, which reports back: the dialog says when Android waits for your confirmation, and if Android's installer does not open, or the update was not installed, it says so and offers to try again. The start screen shows the app's build number.
- **On the website,** once switched on in the settings, an open page looks for a newer build when it starts, every quarter of an hour and when it comes back to the front; _Look for a new version now_ in the settings looks at once, whatever the switch says. The start screen then says so, and _Load it_ loads the new version. It does not say so at a table, as loading the page anew there would end the table. Without the switch, a newer version still comes at the next start (above).

## The connection

At a table with other phones, the top line shows a small graph of the ping, and its newest value, green, yellow or red; on the host's phone, the worst of the players'. In Air Hockey, whose rink covers the screen, they show beside the score. Tapping it opens _Connection details_: the last minute's pings, and for each connection its ping, pings lost, stalls, messages and data, and how it is carried (Wi-Fi or Bluetooth, both ends' addresses and protocols, round trip, packets, bytes, encryption, channels). Addresses show hidden until _Show addresses_.

The host can _Test connections_: for five seconds the phones send as much as the connections take, beside the game, and every player's ping under load and kilobytes a second each way appear on both phones.

## When something does not work

_Create debug report_ in the settings, or _Debug report_ under _Connection details_, makes a report to read, copy, download or send as a new issue on GitHub: device, versions, settings, the last table's connections second by second, the last connection test and the log, with no names, codes or addresses.
