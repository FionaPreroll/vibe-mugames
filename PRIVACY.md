# Privacy policy

The Spielekiste, as a website and as an Android app. In force from 4 November 2026.

## In short

The Spielekiste has no accounts, no server of its own, no advertising, no analytics and no tracking. Phones play directly with each other, over a Wi-Fi or a hotspot, or everyone plays on one device. What the Spielekiste keeps stays on your device, and nothing reaches the developer unless you send it yourself.

## Who is responsible

The Spielekiste is made by FionaPreroll on GitHub. Write to fipreroll+app@gmail.com with any question about this policy or your data.

## What stays on your device

The Spielekiste keeps these in your browser's storage, or in the app's own storage:

- your name and language, and whether to look for updates: in the app, and whether it has asked you about that, and on the website;
- the colour theme you chose, whether to buzz when it is your turn, and the three games chosen last on this device, which the game chooser shows on top;
- the names of the players who last played on this device, and whether they took turns or split the screen;
- the camera you last scanned with, with its zoom and brightness;
- a random token that lets a host recognise you when you sit down at their table again.

A table, its games and its scores are kept in memory only, and are gone when you close the Spielekiste. So are, for the debug report, a log of what the Spielekiste did since it started, without names, codes or addresses, and how well the connections of the last table kept up. In the app, an update you download stays in the app's storage until it is installed or replaced by a newer one. On the website, your browser keeps a copy of the Spielekiste's own files once you opened it, so that it starts without internet, also when you installed it from the browser; nothing of yours is in that copy.

None of this leaves your device by itself. Uninstalling the app deletes it, as does clearing the app's storage in Android's settings, or the site's data in your browser.

## What other phones see

You play with phones you pair with yourself, and they exchange data directly, without a server in between:

- **While pairing by QR code,** the codes on the screens carry what the phones need to connect: their addresses in the local network, and keys for the encrypted connection. Only phones that scan a code, or are given it as text, can use it. A code you copy goes wherever you paste it.
- **While pairing by Bluetooth,** in the app, your name is visible to phones nearby that look for or open tables in the Spielekiste, while the host's table is visible or you look for one, and both phones show a four-digit code to compare.
- **At a table,** every phone sees every player's name, the moves, the games played and the scores. The host's phone receives your name, your moves and your token; the token never goes to other players. In games with something hidden, such as cards, fleets, dice or roles, the host's phone keeps them, and sends each phone only what its player may see.
- **How the connection goes:** your phone and the host's measure the ping and the data between them, and the host's phone learns your ping. The host can test the connections: for five seconds the phones send each other filler data, and the host's phone tells each player how their connection did. Under _Connection details_, the addresses of a connection show hidden until you tap _Show addresses_, as what is on a screen may end up in a screenshot.

The connection is encrypted. A player who leaves keeps nothing but what they saw on their screen.

## Permissions of the app

- **Camera:** to scan the other phone's QR code. Pictures are read on the device, and neither stored nor sent. A photo taken instead with the phone's own camera app is read the same way.
- **Nearby devices, Bluetooth and Wi-Fi:** to play over Bluetooth, through Google's Nearby Connections.
- **Location:** Android requires it to find phones nearby over Bluetooth. The Spielekiste never reads where you are.
- **Internet:** to connect phones over the local Wi-Fi or hotspot, and for updates.
- **Network state:** to warn before an update would download over mobile data.
- **Installing apps:** to install updates you agreed to. Android asks you before every installation.
- **Vibration:** for a short buzz when it is your turn, which you can switch off in the settings.

While you sit at a table, the Spielekiste keeps the screen on, in the app and in browsers that can, as a phone whose screen goes dark drops out of the table. This needs no permission, and ends when you leave the table.

## Services of others

- **GitHub** hosts the website and the app's releases. When you open the website, when it looks for a newer version of itself, and when the app looks for or downloads an update, GitHub receives your IP address and the usual details of a web request. Each time you open the website with internet, your browser asks GitHub whether its copy of the Spielekiste is still the newest, and fetches a newer one for the next start, as every website you open is fetched anew; without internet, it asks nothing. Beyond that, the website and the app look for updates only if you switched that on in the settings, or tap _Look for a new version now_. See the [GitHub privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
- **Google Play services,** in the app, provide Nearby Connections for playing over Bluetooth. Google may handle data for this under the [Google privacy policy](https://policies.google.com/privacy).
- **Google Play,** if you install the app from there, handles the download and its updates under the [Google privacy policy](https://policies.google.com/privacy).
- **Links** in the Spielekiste, such as to GitHub, open in your browser, under the policy of the site you open.
- **A debug report** is made only when you tap _Create debug report_ in the settings, or _Debug report_ under _Connection details_, and shown to you to read first. It says what device, browser and versions this is, the settings except your name, how well the connections of the last table kept up, what kind of address each used but not the address, and the log; no name, token or code. It leaves your device only if you copy it, download it or tap _Report on GitHub_, which opens a new issue on GitHub with it: issues there are public, under GitHub's privacy statement.

## Security

The phones talk over encrypted WebRTC connections, which only the phones paired can open. Everything another phone sends is checked before it is used. Updates come only from the Spielekiste's own releases, over HTTPS, and Android installs one only if it is signed with the same key as the app installed.

## Mail

If you write to the developer, your address and your message are used to answer you, kept only as long as that takes, and not passed on.

## Children

The Spielekiste collects nothing by itself, from anyone, children included.

## Your rights

Data protection law, such as the GDPR, gives you rights over your data: to know what is kept, and to have it corrected or deleted. As the developer keeps no data about you, there is nothing on any server to ask for; what the Spielekiste keeps is on your device, and in your hands. For a mail you sent, write to the address above. You may also complain to a data protection authority.

## Changes

A new version of this policy comes with the Spielekiste, and the changelog in _About the Spielekiste_ says so. This policy is also at [fionapreroll.github.io/vibe-mugames/privacy.html](https://fionapreroll.github.io/vibe-mugames/privacy.html).
