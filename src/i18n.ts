/** Every text players see, in English and German: `t('key', { name })`. */

const en = {
  title: 'Spielekiste',
  tagline: 'Board games for phones side by side: no internet, no server, no accounts.',
  yourName: 'Your name',
  host: 'Open a table',
  join: 'Join a table',
  language: 'Language',
  languageAuto: 'As the browser',
  back: 'Back',
  close: 'Close',
  cancel: 'Cancel',
  leaveTable: 'Leave the table',
  closeTable: 'Close the table for everyone',
  addPlayer: 'Add player',
  players: 'At the table',
  away: 'away',
  you: 'you',
  chooseGame: 'Choose a game',
  hostChooses: '{host} chooses a game.',
  needPlayers: 'Add a player to start a game.',
  tictactoe: 'Tic Tac Toe',
  fourinarow: 'Four in a Row',
  muehle: 'Nine Men’s Morris',
  dame: 'Draughts',
  yourTurn: 'Your turn',
  theirTurn: '{name}’s turn',
  youWin: 'You win!',
  theyWin: '{name} wins.',
  draw: 'A draw.',
  youTake: 'A mill! Take one of {name}’s pieces.',
  theyTake: '{name} closed a mill and takes a piece.',
  placeHint: 'Place a piece on a free point.',
  moveHint: 'Pick a piece, then the free point next to it where it goes.',
  jumpHint: 'With three pieces left, yours jump to any free point.',
  mustTake: 'You must take: pick a piece that can jump.',
  jumpOn: 'Jump on: pick the next square.',
  toPlace: '{name}: {count} to place',
  crowned: 'crowned',
  watching: 'You are watching: {a} against {b}.',
  rematch: 'Play again',
  otherGame: 'Other game',
  waitForHost: '{host} decides what comes next.',
  scanHost: 'Scan the QR code on the host’s phone.',
  showHost: 'Show this code to the host: they scan it to let you in.',
  showPlayer: 'The new player scans this code, then shows theirs to scan here.',
  scanPlayer: 'Now scan the code on the player’s phone.',
  textCodes: 'No camera? Use text codes',
  ownCode: 'This phone’s code: copy it and send it over',
  pasteCode: 'The other phone’s code',
  useCode: 'Use code',
  copy: 'Copy',
  copied: 'Copied.',
  notACode: 'That is not a Spielekiste code.',
  cameraOff: 'The camera did not start: use the text codes instead.',
  connecting: 'Connecting…',
  joined: '{name} joined.',
  rejoined: '{name} is back.',
  connectFailed: 'The connection failed. Are both phones on the same Wi-Fi or hotspot?',
  versionMismatch: 'The phones run different versions of the Spielekiste: update both.',
  full: 'The table is full.',
  hostLeft: 'The connection to the host is gone.',
  hostClosed: 'The host closed the table.',
  build: 'Version {version}, build {commit}.',
}

type Texts = Record<keyof typeof en, string>

const de: Texts = {
  title: 'Spielekiste',
  tagline: 'Brettspiele für Handys nebeneinander: ohne Internet, ohne Server, ohne Konten.',
  yourName: 'Dein Name',
  host: 'Tisch eröffnen',
  join: 'An einen Tisch setzen',
  language: 'Sprache',
  languageAuto: 'Wie der Browser',
  back: 'Zurück',
  close: 'Schließen',
  cancel: 'Abbrechen',
  leaveTable: 'Tisch verlassen',
  closeTable: 'Tisch für alle schließen',
  addPlayer: 'Mitspieler hinzufügen',
  players: 'Am Tisch',
  away: 'weg',
  you: 'du',
  chooseGame: 'Spiel wählen',
  hostChooses: '{host} wählt ein Spiel.',
  needPlayers: 'Füge einen Mitspieler hinzu, um ein Spiel zu starten.',
  tictactoe: 'Tic Tac Toe',
  fourinarow: 'Vier in einer Reihe',
  muehle: 'Mühle',
  dame: 'Dame',
  yourTurn: 'Du bist dran',
  theirTurn: '{name} ist dran',
  youWin: 'Du gewinnst!',
  theyWin: '{name} gewinnt.',
  draw: 'Unentschieden.',
  youTake: 'Eine Mühle! Nimm {name} einen Stein weg.',
  theyTake: '{name} hat eine Mühle und nimmt einen Stein weg.',
  placeHint: 'Setze einen Stein auf einen freien Punkt.',
  moveHint: 'Wähle einen Stein, dann den freien Nachbarpunkt, auf den er zieht.',
  jumpHint: 'Mit nur drei Steinen springen deine auf jeden freien Punkt.',
  mustTake: 'Du musst schlagen: Wähle einen Stein, der springen kann.',
  jumpOn: 'Spring weiter: Wähle das nächste Feld.',
  toPlace: '{name}: noch {count} zu setzen',
  crowned: 'Dame',
  watching: 'Du schaust zu: {a} gegen {b}.',
  rematch: 'Nochmal',
  otherGame: 'Anderes Spiel',
  waitForHost: '{host} entscheidet, wie es weitergeht.',
  scanHost: 'Scanne den QR-Code auf dem Handy des Gastgebers.',
  showHost: 'Zeig diesen Code dem Gastgeber: Er scannt ihn, um dich reinzulassen.',
  showPlayer: 'Der neue Mitspieler scannt diesen Code und zeigt dann seinen zum Scannen hier.',
  scanPlayer: 'Scanne jetzt den Code auf dem Handy des Mitspielers.',
  textCodes: 'Keine Kamera? Textcodes verwenden',
  ownCode: 'Code dieses Handys: kopieren und hinüberschicken',
  pasteCode: 'Code des anderen Handys',
  useCode: 'Code verwenden',
  copy: 'Kopieren',
  copied: 'Kopiert.',
  notACode: 'Das ist kein Code der Spielekiste.',
  cameraOff: 'Die Kamera ist nicht angegangen: Nimm stattdessen die Textcodes.',
  connecting: 'Verbinde…',
  joined: '{name} spielt mit.',
  rejoined: '{name} ist zurück.',
  connectFailed:
    'Die Verbindung hat nicht geklappt. Sind beide Handys im selben WLAN oder Hotspot?',
  versionMismatch: 'Die Handys haben verschiedene Versionen der Spielekiste: Aktualisiere beide.',
  full: 'Der Tisch ist voll.',
  hostLeft: 'Die Verbindung zum Gastgeber ist weg.',
  hostClosed: 'Der Gastgeber hat den Tisch geschlossen.',
  build: 'Version {version}, Build {commit}.',
}

export type TextKey = keyof typeof en
export type Language = 'en' | 'de'
const TEXTS: Record<Language, Texts> = { en, de }

function browserLanguage(): Language {
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('de')
    ? 'de'
    : 'en'
}

let language: Language = browserLanguage()

export function currentLanguage(): Language {
  return language
}

/** Switches the language for every text made from now on: screens show it once rebuilt. */
export function setLanguage(choice: Language | 'auto'): void {
  language = choice === 'auto' ? browserLanguage() : choice
  if (typeof document !== 'undefined') document.documentElement.lang = language
}

/** The text for a key in the player's language, with `{name}` placeholders filled in. */
export function t(key: TextKey, params: Record<string, string | number> = {}): string {
  return TEXTS[language][key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''))
}
