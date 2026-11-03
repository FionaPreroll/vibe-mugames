/** Every text players see, in English and German: `t('key', { name })`. */

const en = {
  title: 'Spielekiste',
  tagline:
    'Games for everyone at one table: on phones side by side, or together around one tablet or laptop. No internet, no server, no accounts.',
  heroLabel: 'An open box of games: boards, cards, dice and pieces.',
  groupTactics: 'Tactics',
  groupTacticsNote: 'Think ahead: no luck, only moves.',
  groupLuck: 'Luck and bluff',
  groupLuckNote: 'Dice, cards and secrets.',
  groupSkill: 'Skill',
  groupSkillNote: 'In real time: everyone at once.',
  yourName: 'Your name',
  host: 'Open a table',
  join: 'Join a table',
  local: 'Play on this device',
  localIntro:
    'Everyone plays on this device: take turns on one screen, or split the screen so each player has a part of their own.',
  localPlayers: 'Players',
  playerN: 'Player {n}',
  nameOf: 'Name of player {n}',
  layout: 'How you play',
  layoutTurns: 'One screen, taking turns',
  layoutTurnsNote: 'The screen shows whose turn it is.',
  layoutSplit: 'Split screen',
  layoutSplitNote:
    'Each player gets a part of the screen and turns it their way. Two to four players.',
  start: 'Start',
  stopPlaying: 'Stop playing',
  turnAround: 'Turn {name}’s side around',
  openCards:
    'Open cards: on one device, everyone can see every hand. Look away when it is not your turn.',
  openCardsShort: 'open cards',
  theyTakeFrom: 'A mill! {name} takes one of {other}’s pieces.',
  yourTurnName: '{name}, your turn',
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
  ludo: 'Ludo',
  ludoRollButton: 'Roll the die',
  ludoDie: 'Die: {n}',
  ludoRolled: '{name} rolled a {n}.',
  ludoPick: 'You rolled a {n}: tap a piece to see where it goes.',
  ludoPickSix: 'A six! Bring a piece out, or move one on. Then you roll again.',
  ludoPicked: 'Tap the marked square to move there, or pick another piece.',
  ludoRollHint: 'Tap the die to roll.',
  ludoNeedSix: 'Roll a six to bring a piece out: you have three tries.',
  ludoTriesLeft: 'No six. Roll again: {n} tries left.',
  ludoTryLeft: 'No six. Roll again: one try left.',
  ludoSixAgain: 'A six: roll again.',
  ludoStuck: '{name} rolled a {n}: no piece could move.',
  ludoYouStuck: 'You rolled a {n}: no piece could move.',
  ludoHit: '{name} sent {other}’s piece back to its corner.',
  ludoHitYou: '{name} sent your piece back to its corner.',
  ludoYouHit: 'You sent {other}’s piece back to its corner.',
  ludoHelp: 'How Ludo goes',
  helpLudoGoal:
    'Bring all four pieces once round the board and into your home squares in the middle.',
  helpLudoSix:
    'A six brings a piece out of your corner onto your start square, and you roll again.',
  helpLudoTries: 'With no piece on the track, you have three tries to roll a six.',
  helpLudoHit:
    'Land on another player’s piece to send it back to its corner. Two of your own pieces never share a square.',
  helpLudoHome: 'Home takes the exact number: no piece goes past the last home square.',
  ludoCorner: '{name}’s corner',
  ludoHome: '{name}’s home',
  ludoStart: '{name}’s start',
  ludoSquare: 'Square',
  ludoFreeCorner: 'Free corner',
  miaumiau: 'Miau-Miau',
  seeschlacht: 'Sea Battle',
  placeFleet: 'Place your fleet',
  placeFleetName: '{name}, place your fleet',
  placeHelp:
    'Tap a ship to pick it, then the square where its top or left end goes. Ships may not touch, not even at a corner.',
  shipsTouch: 'It does not fit there: ships may not touch, not even at a corner.',
  turnShip: 'Turn the ship',
  shuffleFleet: 'Shuffle',
  fleetReady: 'Ready',
  waitPlacing: 'Waiting for {name} to place their fleet.',
  watchPlacing: 'The fleets are being placed.',
  seaOf: '{name}’s sea',
  yourFleet: 'Your fleet',
  fleetOf: '{name}’s fleet',
  shootHelp: 'Tap a square of {name}’s sea to shoot. A hit lets you shoot again.',
  youHit: 'Hit! Shoot again.',
  theyHit: '{name} hit and shoots again.',
  youSank:
    'Sunk: a ship of {size}! The squares around it are water, as ships never touch. Shoot again.',
  theySank: '{name} sank a ship of {size} and shoots again.',
  youMissed: 'Water. Now {name} shoots.',
  theyMissed: '{name} hit water.',
  afloat: 'Still afloat:',
  shipOf: 'ship of {size}',
  seaWater: 'water',
  seaHit: 'hit',
  seaSunk: 'sunk',
  seaShip: 'ship',
  seaPicked: 'picked',
  showFleet: 'Show my fleet',
  hideFleet: 'Hide my fleet',
  handOver: 'Done: hand over to {name}',
  takeOver: 'I am {name}: show my sea',
  passTo: 'Pass the device to {name}. Only {name} looks now.',
  handOverNotice:
    'Sea Battle on one device: hand the device over when it asks, and look only while it is your turn.',
  hiddenFleetNotice:
    'Each fleet stays hidden until its player taps “Show my fleet”: look away while someone does.',
  maexchen: 'Mäxchen',
  maexchenName: 'Mäxchen',
  doubleName: 'Double {n}',
  diceRolls: '{name} rolls.',
  diceLooks: '{name} looks under the cup.',
  diceDecides: '{name} decides: believe {other}, or doubt?',
  diceRollFirst: 'Roll the dice: only you see them. Then say what they show, or bluff.',
  diceSayAny: 'Say what the cup holds. Nobody has said anything yet, so any throw will do.',
  diceSayOwn: 'Your dice show {own}. Say it, or bluff: nobody has said anything yet.',
  diceSayMore: 'Say what the cup holds: it must beat {claim}.',
  diceSayTrue: 'Your dice show {own}, which beats {claim}: say it, or bluff higher.',
  diceMustBluff:
    'Your dice show {own}, which does not beat {claim}: you must bluff, and say more than {claim}.',
  diceOdds:
    '{name} says {claim}. Two dice show {claim} or more in {n} of 36 throws. Believe it and roll, or doubt it and lift the cup.',
  diceAgainstMaexchen:
    '{name} says Mäxchen, which nothing beats. Give up a life, or doubt: if it is true, doubting costs two.',
  diceSaid: '{name} says: {claim}',
  diceRoll: 'Roll',
  diceBelieve: 'Believe it and roll',
  diceDoubt: 'Doubt it: lift the cup',
  diceYield: 'Give up a life',
  diceSay: 'Say what the cup holds',
  diceTrue: 'your dice',
  diceOut: 'out',
  diceLives: '{n} lives',
  diceUnder: 'Under your cup: {dice}, that is {value}',
  diceCupShut: 'The cup, closed',
  diceCupEmpty: 'The cup, not rolled yet',
  diceWasTrue:
    '{doubter} doubted {claimer}’s {claim}: the cup held {dice}, {held}. That is enough.',
  diceWasBluff: '{doubter} doubted {claimer}’s {claim}: the cup held {dice}, only {held}. A bluff!',
  diceGaveUp: '{doubter} believed {claimer}’s Mäxchen.',
  diceLosesOne: '{name} loses a life.',
  diceLosesTwo: '{name} loses two lives.',
  showDice: 'Show my dice',
  hideDice: 'Hide my dice',
  diceHelp: 'How Mäxchen works',
  diceHelpRead: 'Two dice are read with the higher one first: a 3 and a 5 are 53.',
  diceHelpRank:
    'Doubles beat every other throw, and the Mäxchen, a 2 and a 1, beats everything. From the highest down:',
  diceHelpSay:
    'Roll under the cup, look, and say what it holds: the truth or a bluff, but always more than the player before you said.',
  diceHelpDoubt:
    'Doubt the player before you, and the cup is lifted: if it holds less than they said, they lose a life; if it holds as much or more, you do. Whoever loses a life starts the next round.',
  diceHelpMaexchen:
    'Against a Mäxchen, give up a life, or doubt it: a true Mäxchen costs whoever doubted two. Everyone starts with {lives} lives; the last one with a life left wins.',
  handOverDice:
    'Mäxchen on one device: hand the device over when it asks, and look only while it is your turn.',
  hiddenDiceNotice:
    'Your dice stay hidden until you tap “Show my dice”: the others look away while you do.',
  takeOverDice: 'I am {name}: show my turn',
  werwolf: 'Werewolf',
  roleWolf: 'werewolf',
  roleSeer: 'seer',
  roleHealer: 'healer',
  roleVillager: 'villager',
  youAre: 'You are a {role}.',
  youAreName: '{name}, you are a {role}.',
  helpWolf:
    'Every night, the werewolves choose a villager to take. By day, pretend to be a villager.',
  helpSeer: 'Every night, you learn of one player whether they are a werewolf.',
  helpHealer:
    'Every night, you protect one player, yourself too, from the werewolves; not the same one two nights in a row.',
  helpVillager:
    'Find the werewolves, and vote them out by day. At night, you choose someone too, so nobody can tell your role by who taps.',
  askWolf: 'whom do the werewolves take?',
  askSeer: 'whose role do you look at?',
  askHealer: 'whom do you protect tonight?',
  askVillager: 'whom do you suspect? It changes nothing, but everyone taps.',
  askVote: 'talk it over, then vote whom to banish.',
  askHidden: 'show your role to choose.',
  nightN: 'Night {n}',
  dayN: 'Day {n}',
  villageWatching: 'you are watching the village.',
  youAreOut: 'you are out. Watch, and give nothing away.',
  waitingOne: 'waiting for one more.',
  waitingMore: 'waiting for {n} more.',
  youChose: 'You chose {name}.',
  youVoted: 'You voted for {name}.',
  pickedBy: '{names} picked them',
  otherWolves: 'The other werewolves: {names}.',
  seerKnows: 'You know:',
  seenWolf: '{name} is a werewolf.',
  seenNotWolf: '{name} is not.',
  roleHidden: 'Your role is hidden.',
  showRole: 'Show my role',
  hideRole: 'Hide my role',
  out: 'out',
  storyNobody: 'Night {n}: nobody was taken.',
  storyTaken: 'Night {n}: the werewolves took {name}, a {role}.',
  storyTie: 'Day {n}: the votes were tied, and nobody was banished.',
  storyBanished: 'Day {n}: the village banished {name}, with {votes} votes: a {role}.',
  storySoFar: 'What happened so far',
  villageWins: 'The village wins: every werewolf is out.',
  wolvesWin: 'The werewolves win: they are as many as the others.',
  villageHelp: 'How Werewolf works',
  helpNight:
    'At night, everyone chooses someone on their own phone, secretly: the werewolves a victim, the seer whom to look at, the healer whom to protect.',
  helpDay:
    'By day, the village learns who was taken and what they were. Talk, then everyone votes: whoever gets the most votes is banished, and their role shown. A tie banishes nobody.',
  helpWinning:
    'The village wins once every werewolf is out; the werewolves win once they are as many as the others.',
  handOverRoles:
    'Werewolf on one device: everyone takes the device in turn, at night and to vote, and looks only while they hold it.',
  hiddenRoleNotice:
    'Your role stays hidden until you tap “Show my role”: the others look away while you do.',
  takeOverRole: 'I am {name}: show my role',
  lichtrenner: 'Light Racers',
  airhockey: 'Air Hockey',
  rules: 'Rules',
  rulesOf: 'Rules of {game}',
  playersExactly: '{n} players',
  playersFromTo: '{min} to {max} players',
  rulesTictactoe1:
    'Two players take turns putting their mark in a free square: one plays ✕, the other ◯.',
  rulesTictactoe2: 'Three of your marks in a row, across, down or diagonally, win the game.',
  rulesTictactoe3:
    'A full board without three in a row is a draw. The players take turns in starting.',
  rulesFourinarow1:
    'Take turns dropping a disc into a column of the upright board: it falls down to the lowest free hole.',
  rulesFourinarow2:
    'Four of your discs in a row, across, down or diagonally, win. A full board without four in a row is a draw.',
  rulesMuehle1:
    'Each player has nine pieces. First, you take turns placing them, one a turn, on any free point.',
  rulesMuehle2:
    'Once all are placed, a turn moves one of your pieces along a line to the free point next to it.',
  rulesMuehle3:
    'Three of your pieces in a row on one line make a mill. Then take one of the other player’s pieces off the board: one that is not in a mill, if there is any.',
  rulesMuehle4: 'With only three pieces left, your pieces may jump to any free point.',
  rulesMuehle5:
    'A player with fewer than three pieces, or none that can move, loses. Fifty moves without a mill are a draw.',
  rulesDame1:
    'Each player starts with twelve pieces on the dark squares. A piece steps diagonally forward to a free dark square.',
  rulesDame2:
    'Take a piece of the other player by jumping over it to the free square behind it, forward or backward. If you can jump again from there, jump on: every piece jumped over leaves the board.',
  rulesDame3: 'Taking is a must: if you can take a piece, you have to, but you choose which way.',
  rulesDame4:
    'A piece that ends its move on the far row is crowned ♛. A crowned piece moves and takes along a diagonal as far as it likes, forward and backward.',
  rulesDame5:
    'A player who cannot move loses. Fifty moves of crowned pieces without taking are a draw.',
  rulesMiaumiau1:
    'Everyone gets five cards. On your turn, play a card of the same suit or the same rank as the top card of the pile.',
  rulesMiaumiau2:
    'If you cannot or do not want to play, draw a card from the stock. If it fits, you may play it at once; otherwise the turn moves on.',
  rulesMiaumiau3:
    'A seven makes the next player draw two cards, unless they answer with a seven: then the player after them draws four, and so on.',
  rulesMiaumiau4:
    'An eight makes the next player miss their turn. With two players, you play again.',
  rulesMiaumiau5:
    'A jack goes on any card, and you wish for a suit: the next card must have that suit, or be a jack.',
  rulesMiaumiau6:
    'The first to play their last card wins. Up to four players play with 32 cards, seven to ace; five and six with all 52.',
  rulesSeeschlacht1:
    'Each player hides a fleet on a sea of 10 by 10: one ship of five squares, one of four, two of three and one of two, across or down. Ships may not touch, not even at a corner.',
  rulesSeeschlacht2:
    'Then take turns shooting at a square of the other player’s sea. A hit lets you shoot again; a shot into the water passes the turn.',
  rulesSeeschlacht3:
    'A ship is sunk once every square of it is hit. As ships never touch, the squares around it are water.',
  rulesSeeschlacht4: 'Whoever sinks the whole fleet of the other player first wins.',
  rulesLichtrenner1:
    'A game in real time: every rider races on by itself and leaves a wall of light behind.',
  rulesLichtrenner2:
    'Turn left or right by swiping on the field, with ⟲ and ⟳, or with the arrow keys. A rider cannot turn straight back.',
  rulesLichtrenner3:
    'Riding into a wall, the edge or another rider puts a rider out. The last one riding wins; riders who crash at the same moment as the last others make a draw.',
  rulesAirhockey1:
    'A game in real time, for two. Lay both phones on the table, top edge to top edge: each screen is its player’s half of the rink, with their own goal at the bottom.',
  rulesAirhockey2:
    'Your mallet follows your finger. Hit the puck, off the sides if you like, into the other player’s goal.',
  rulesAirhockey3:
    'A goal is a point, and the player who let it in gets the puck. The first to seven goals wins.',
  rulesKaesekaestchen1:
    'In turn, draw a line between two neighbouring dots, across or down. A line that closes no box passes the turn.',
  rulesKaesekaestchen2: 'Draw the fourth side of a box, and the box is yours: then you draw again.',
  rulesKaesekaestchen3: 'Once every line is drawn, whoever holds more of the 25 boxes wins.',
  rulesReversi1:
    'Reversi starts with two pieces each, crosswise in the middle of the board. Red places first.',
  rulesReversi2:
    'Place a piece so that it encloses a line of the other player’s pieces between it and one of your own: all the pieces enclosed turn to your colour.',
  rulesReversi3:
    'Lines count across, down and diagonally, and one piece may enclose several lines at once: they all turn.',
  rulesReversi4:
    'If you cannot enclose anything, you pass. Once neither player can, whoever has more pieces on the board wins.',
  rulesSternhalma1:
    'Each player starts with ten pieces in a triangle of the star, and brings them all into the triangle across, ringed in their colour.',
  rulesSternhalma2:
    'A move is a step to a free hole next to the piece, or jumps over a neighbouring piece, anyone’s, to the free hole straight behind it, as many jumps in a row as you like. Nothing is taken.',
  rulesSternhalma3:
    'The first to fill the triangle across with their pieces wins. A player who cannot move passes; thirty rounds in which no piece reaches its triangle are a draw.',
  rulesLudo1:
    'Each player has four pieces in their corner. On your turn, roll the die and move one of your pieces that many squares on round the board.',
  rulesLudo2: 'A six brings a piece out of your corner onto your start square, and you roll again.',
  rulesLudo3:
    'Land on another player’s piece, and it goes back to its corner. Two of your own pieces never share a square.',
  rulesLudo4:
    'With no piece out on the track, you get three tries to roll a six. If no piece can move, the turn passes on.',
  rulesLudo5:
    'After a round of the board, a piece goes into your home squares, by the exact number. The first with all four pieces home wins.',
  rulesMaexchen1:
    'In turn, roll the two dice under the cup and look at them alone. The higher die is read first: a five and a three are 53.',
  rulesMaexchen2:
    'Say what the dice show, the truth or a bluff, but always more than the player before you said.',
  rulesMaexchen3:
    'From the lowest up: 31, 32, 41 and so on to 65; then the doubles, 11 to 66; and highest of all 21, the Mäxchen.',
  rulesMaexchen4:
    'The next player believes it and rolls in turn, or doubts it and lifts the cup. If the dice show less than was said, the one who said it loses a life; otherwise the one who doubted does.',
  rulesMaexchen5:
    'Told “Mäxchen”, you may give up one life without looking, or doubt it: if it is the Mäxchen, doubting costs two lives. Everyone has three lives; the last with a life left wins.',
  rulesWerwolf1:
    'For four to eight. Everyone gets a role in secret, on their own phone: a werewolf, the seer, the healer or a villager. The werewolves know each other.',
  rulesWerwolf2:
    'At night, everyone taps someone in secret. The werewolves choose a villager to take, the seer learns whether a player is a werewolf, and the healer protects a player, not the same one two nights in a row.',
  rulesWerwolf3:
    'In the morning, the village learns who was taken. By day, talk, then everyone votes: whoever gets the most votes is banished, and their role shown. A tie banishes nobody.',
  rulesWerwolf4:
    'The village wins once every werewolf is out; the werewolves win once they are as many as the others.',
  lichtHint:
    'Turn before you hit a wall: swipe on the field, or tap ⟲ and ⟳. The last one riding wins.',
  lichtHintLocal:
    'Turn before you hit a wall, with your keys or your ⟲ and ⟳. The last one riding wins.',
  lichtOut: 'You crashed. The others ride on.',
  lichtGetReady: 'Your racer is the one in the ring.',
  turnLeft: 'Turn left',
  turnRight: 'Turn right',
  turnLeftOf: '{name}: turn left',
  turnRightOf: '{name}: turn right',
  keysOf: '{name}: {keys}',
  arrowKeys: 'arrow keys',
  hockeyHint:
    'Lay both phones on the table, top edge to top edge: each screen is one half of the rink, with your goal at the bottom. Move your mallet with a finger.',
  hockeyHintLocal: 'Move your mallet with a finger on your half, or with your keys.',
  hockeyFirstTo: 'First to {n} goals wins.',
  hockeyGoal: 'Goal for {name}!',
  hockeyScore: '{a} {goalsA} : {goalsB} {b}',
  stopGame: 'Stop the game',
  clubs: 'clubs',
  spades: 'spades',
  hearts: 'hearts',
  diamonds: 'diamonds',
  jack: 'Jack',
  queen: 'Queen',
  king: 'King',
  ace: 'Ace',
  jackMark: 'J',
  queenMark: 'Q',
  kingMark: 'K',
  aceMark: 'A',
  cardName: '{rank} of {suit}',
  cards: '{n} cards',
  oneCard: '1 card',
  miau: 'Miau!',
  drawOne: 'Draw a card',
  drawMany: 'Draw {n} cards',
  pass: 'Pass',
  keep: 'Keep it',
  yourCards: 'Your cards',
  wishSuit: 'Which suit do you wish for?',
  wished: 'Wished: {suit}',
  mustDraw: 'Answer with a seven, or draw {n} cards.',
  playDrawn: 'You drew the {card}: play it, or keep it.',
  stuck: 'Nobody can play or draw: a draw.',
  watchingAll: 'You are watching: {names}.',
  theyMustDraw: '{name} must draw {n} cards, or answer with a seven.',
  youMiss: 'An eight: you miss this turn.',
  theyMiss: 'An eight: {name} misses a turn.',
  followWish: 'A jack wished for {suit}: play a {suit} card or a jack.',
  cardHelp: 'What the cards do',
  helpMatch:
    'Play a card of the same suit or rank as the top card. If you cannot or will not, draw one.',
  helpSeven:
    'The next player draws two cards, unless they play a seven too: then the player after them draws four.',
  helpEight: 'The next player misses their turn.',
  helpJack: 'Goes on any card. You wish for a suit: the next card must be of that suit, or a jack.',
  helpStart: 'The first card turned up counts only for its suit and rank.',
  helpWin: 'Whoever plays their last card first wins. “Miau!” shows who has one card left.',
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
  kaesekaestchen: 'Dots and Boxes',
  reversi: 'Reversi',
  sternhalma: 'Chinese Checkers',
  lineAcross: 'Line across, row {row}, column {column}',
  lineDown: 'Line down, row {row}, column {column}',
  boxAt: 'Box, row {row}, column {column}',
  holeAt: 'Hole, row {row}, place {column}',
  reversiHint:
    'Place a piece so that it encloses a line of the other’s pieces with one of yours: they turn to your colour.',
  reversiYouAgain: '{name} cannot move: your turn again.',
  reversiAgain: '{name} cannot move: {mover} plays again.',
  piecesHeld: 'Pieces:',
  countOf: '{name} {count}',
  kaeseHint:
    'Tap between two dots to draw a line. Draw the fourth side of a box to win it, then draw again.',
  kaeseYouAgain: 'You closed a box: draw another line.',
  kaeseAgain: '{name} closed a box and draws again.',
  boxesHeld: 'Boxes:',
  sternHint:
    'Bring all ten pieces to the triangle across, ringed in your colour. Pick a piece to see where it can go.',
  sternWhere:
    'Tap where it goes: a free hole next to it, or as far as it can jump over pieces, one after another.',
  arrived: 'Arrived:',
  arrivedOf: '{name} {count}/10',
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
  copyByHand: 'Copying did not work: the code is selected, copy it by hand.',
  codeTaken: 'Code read.',
  waitingForHost:
    'Waiting for the host to take this phone’s code. That may take a while if you send it over.',
  tryAgain: 'Try again',
  timedOut: 'The other phone did not answer in time.',
  notACode: 'That is not a Spielekiste code.',
  cameraOff: 'The camera did not start: take a photo of the code, or use the text codes.',
  scanHelp:
    'Blurry? Tap the picture to focus. Hold the phone a little further away and zoom in, or turn the brightness down if the code glares.',
  scanHelpBasic:
    'Blurry? Tap the picture to focus, hold the phone a little further away, or take a photo instead.',
  zoom: 'Zoom',
  brightness: 'Brightness',
  switchCamera: 'Switch camera',
  takePhoto: 'Take a photo instead',
  liveCamera: 'Back to the live camera',
  readingPhoto: 'Reading the photo…',
  photoNoCode:
    'No code found in the photo. Try again from a little further away, with the code in the middle of the picture.',
  connecting: 'Connecting…',
  chooseConnection: 'How do the phones connect?',
  viaQr: 'QR code',
  viaQrNote: 'Over the same Wi-Fi or a hotspot. Works with the website too.',
  viaBluetooth: 'Bluetooth',
  viaBluetoothNote: 'Without Wi-Fi. Both phones need the app.',
  viaQrInstead: 'Use a QR code instead',
  btHostWaiting: 'Your table is visible to phones nearby. Players who ask to sit down appear here.',
  btCheckCode: 'Let a player in only if their phone shows the same code.',
  btRequest: '{name} wants to sit down. Code: {digits}',
  btAccept: 'Let in',
  btReject: 'Turn down',
  btSearching: 'Looking for tables nearby… Tap the host’s name.',
  btNoneYet: 'No table found yet. The host opens one and adds a player by Bluetooth.',
  btWaitHost: 'Code: {digits}. {host} compares it and lets you in.',
  btRejected: 'The host did not let you in, or the connection broke.',
  btPermission:
    'The Spielekiste may not use Bluetooth. Allow nearby devices, and location if Android asks, in the app’s settings.',
  btUnavailable: 'Bluetooth needs Google Play services, which this phone does not have.',
  btOff: 'Bluetooth did not start.',
  btBluetoothOff: 'Bluetooth is off. Turn it on, then try again.',
  btLocationOff:
    'Location is off. Android needs it to find phones nearby: turn it on, then try again.',
  joined: '{name} joined.',
  rejoined: '{name} is back.',
  connectFailed: 'The connection failed. Are both phones on the same Wi-Fi or hotspot?',
  versionMismatch: 'The phones run different versions of the Spielekiste: update both.',
  full: 'The table is full.',
  hostLeft: 'The connection to the host is gone.',
  hostClosed: 'The host closed the table.',
  build: 'Version {version}, build {commit}.',
  appBuild: 'Version {version}, build {commit}, app build {build}.',
  about: 'About the Spielekiste',
  aboutTitle: 'About the Spielekiste',
  aboutBuild: 'Version {version}, build {commit}, from {date}.',
  aboutAppBuild: 'Version {version}, build {commit}, from {date}, app build {build}.',
  aboutSource: 'Source code and issues on GitHub',
  aboutWebsite: 'Play in the browser',
  aboutContact: 'Contact:',
  aboutLibrary:
    'The phones connect through @fionapreroll/p2p, a library by the same developer, made for Spark Hunt.',
  privacyTitle: 'Privacy policy',
  privacyShort:
    'No accounts, no server, no advertising, no tracking: what the Spielekiste keeps stays on this device.',
  changelogTitle: 'What’s new',
  changelogNote: '',
  changelogUnreleased: 'This version',
  licensesTitle: 'Other people’s code',
  licensesNote:
    'The Spielekiste is built with these open-source libraries, under their licenses. Tap one for its license text.',
  licensesNative: 'The Android app also contains:',
  licensesMissing: 'The list is part of the built Spielekiste, not of the development server.',
  webUpdateReady: 'A new version of the Spielekiste is out.',
  webUpdateReload: 'Load it',
  settings: 'Settings',
  appTitle: 'Android app',
  getApp: 'Get the Spielekiste as an Android app',
  webUpdatesSetting: 'Tell me on the start screen when a new version is out',
  webUpdatesNote:
    'The page then looks now and then at the version on GitHub Pages, where it comes from.',
  webUpdatesCurrent: 'This is the newest version.',
  updatesTitle: 'Updates',
  updatesAsk:
    'Should the Spielekiste look for a new version on GitHub whenever it starts? That needs internet at the start; without it, the app starts as usual. You can change this in the settings (⚙).',
  updatesYes: 'Yes, look',
  updatesNo: 'No',
  updatesSetting: 'Look for a new version when the app starts',
  updatesNote:
    'New versions come from the Spielekiste’s releases on GitHub. Android asks before it installs one.',
  updateReady: 'A new version of the Spielekiste is ready (build {build}).',
  updateInstall: 'Install',
  updateLater: 'Later',
  updatesCheckNow: 'Look for a new version now',
  updatesChecking: 'Looking…',
  updatesCurrent: 'This is the newest version (build {build}).',
  updatesCheckFailed: 'Could not look for a new version. Is there internet?',
  updateDownload: 'Download',
  updateDownloadAnyway: 'Download anyway',
  updateSize: 'The download is {size}.',
  updateContinues: 'An earlier download stopped at {percent} % of {size}: it goes on from there.',
  updateMobileData:
    'You are on mobile data, which the download would use. On Wi-Fi it costs nothing.',
  updateMetered:
    'This connection is metered, as a phone’s hotspot often is: the download may cost. On another Wi-Fi it may not.',
  updateProgress: '{done} of {total} · {percent} %',
  updatePause: 'Pause',
  updateResume: 'Resume',
  updatePaused: 'Paused at {percent} %. It goes on from there, also after closing the app.',
  updateInstalling: 'Opening Android’s installer…',
  updateConfirm: 'Confirm the update in Android’s dialog.',
  updateInstalled: 'Installed. The app starts again in its new version.',
  updateAborted: 'The update was not installed. Tap Install to try again.',
  updateInstallFailed: 'Android could not install the update: {message}',
  updateNoInstaller: 'Android’s installer did not open. Tap Install to try again.',
  updatePermission:
    'Allow the Spielekiste to install apps in the settings that have just opened, then come back: installing goes on by itself.',
  updateFailed: 'The download stopped. Try again: it goes on where it stopped.',
}

type Texts = Record<keyof typeof en, string>

const de: Texts = {
  title: 'Spielekiste',
  tagline:
    'Spiele für alle an einem Tisch: auf Handys nebeneinander oder gemeinsam an einem Tablet oder Laptop. Ohne Internet, ohne Server, ohne Konten.',
  heroLabel: 'Eine offene Kiste voller Spiele: Bretter, Karten, Würfel und Steine.',
  groupTactics: 'Taktik',
  groupTacticsNote: 'Vorausdenken: kein Glück, nur Züge.',
  groupLuck: 'Glück und Bluff',
  groupLuckNote: 'Würfel, Karten und Geheimnisse.',
  groupSkill: 'Geschicklichkeit',
  groupSkillNote: 'In Echtzeit: alle gleichzeitig.',
  yourName: 'Dein Name',
  host: 'Tisch eröffnen',
  join: 'An einen Tisch setzen',
  local: 'Auf diesem Gerät spielen',
  localIntro:
    'Alle spielen auf diesem Gerät: abwechselnd auf einem Bildschirm, oder auf einem geteilten, auf dem jeder einen Teil für sich hat.',
  localPlayers: 'Spieler',
  playerN: 'Spieler {n}',
  nameOf: 'Name von Spieler {n}',
  layout: 'Wie ihr spielt',
  layoutTurns: 'Ein Bildschirm, abwechselnd',
  layoutTurnsNote: 'Der Bildschirm zeigt, wer dran ist.',
  layoutSplit: 'Geteilter Bildschirm',
  layoutSplitNote:
    'Jeder bekommt einen Teil des Bildschirms und dreht ihn zu sich. Zwei bis vier Spieler.',
  start: 'Los',
  stopPlaying: 'Aufhören',
  turnAround: 'Seite von {name} umdrehen',
  openCards:
    'Offene Karten: Auf einem Gerät sieht jeder alle Hände. Schau weg, wenn du nicht dran bist.',
  openCardsShort: 'offene Karten',
  theyTakeFrom: 'Eine Mühle! {name} nimmt {other} einen Stein weg.',
  yourTurnName: '{name}, du bist dran',
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
  ludo: 'Ludo',
  ludoRollButton: 'Würfeln',
  ludoDie: 'Würfel: {n}',
  ludoRolled: '{name} hat eine {n} gewürfelt.',
  ludoPick: 'Du hast eine {n} gewürfelt: Tippe auf eine Figur, um zu sehen, wohin sie zieht.',
  ludoPickSix:
    'Eine Sechs! Bring eine Figur heraus oder zieh eine weiter. Dann würfelst du noch einmal.',
  ludoPicked: 'Tippe auf das markierte Feld, um dorthin zu ziehen, oder wähle eine andere Figur.',
  ludoRollHint: 'Tippe auf den Würfel, um zu würfeln.',
  ludoNeedSix: 'Würfle eine Sechs, um eine Figur herauszubringen: Du hast drei Versuche.',
  ludoTriesLeft: 'Keine Sechs. Würfle noch einmal: noch {n} Versuche.',
  ludoTryLeft: 'Keine Sechs. Würfle noch einmal: ein letzter Versuch.',
  ludoSixAgain: 'Eine Sechs: Würfle noch einmal.',
  ludoStuck: '{name} hat eine {n} gewürfelt: Keine Figur konnte ziehen.',
  ludoYouStuck: 'Du hast eine {n} gewürfelt: Keine Figur konnte ziehen.',
  ludoHit: '{name} hat eine Figur von {other} zurück in ihre Ecke geschickt.',
  ludoHitYou: '{name} hat eine deiner Figuren zurück in ihre Ecke geschickt.',
  ludoYouHit: 'Du hast eine Figur von {other} zurück in ihre Ecke geschickt.',
  ludoHelp: 'So geht Ludo',
  helpLudoGoal: 'Bring alle vier Figuren einmal um das Brett und in deine Zielfelder in der Mitte.',
  helpLudoSix:
    'Eine Sechs bringt eine Figur aus deiner Ecke auf dein Startfeld, und du würfelst noch einmal.',
  helpLudoTries: 'Ohne Figur auf der Bahn hast du drei Versuche für eine Sechs.',
  helpLudoHit:
    'Landest du auf der Figur eines anderen, muss sie zurück in ihre Ecke. Zwei deiner eigenen Figuren stehen nie auf demselben Feld.',
  helpLudoHome:
    'Ins Ziel geht es nur mit der genauen Zahl: Keine Figur zieht über das letzte Zielfeld hinaus.',
  ludoCorner: 'Ecke von {name}',
  ludoHome: 'Ziel von {name}',
  ludoStart: 'Start von {name}',
  ludoSquare: 'Feld',
  ludoFreeCorner: 'Freie Ecke',
  miaumiau: 'Miau-Miau',
  seeschlacht: 'Schiffe versenken',
  placeFleet: 'Stell deine Flotte auf',
  placeFleetName: '{name}, stell deine Flotte auf',
  placeHelp:
    'Tippe auf ein Schiff, dann auf das Feld, wo sein oberes oder linkes Ende hin soll. Schiffe dürfen sich nicht berühren, auch nicht an einer Ecke.',
  shipsTouch:
    'Da passt es nicht hin: Schiffe dürfen sich nicht berühren, auch nicht an einer Ecke.',
  turnShip: 'Schiff drehen',
  shuffleFleet: 'Mischen',
  fleetReady: 'Fertig',
  waitPlacing: 'Warte, bis {name} die Flotte aufgestellt hat.',
  watchPlacing: 'Die Flotten werden aufgestellt.',
  seaOf: 'Meer von {name}',
  yourFleet: 'Deine Flotte',
  fleetOf: 'Flotte von {name}',
  shootHelp:
    'Tippe auf ein Feld im Meer von {name}, um zu schießen. Nach einem Treffer schießt du noch einmal.',
  youHit: 'Treffer! Schieß noch einmal.',
  theyHit: '{name} trifft und schießt noch einmal.',
  youSank:
    'Versenkt: ein Schiff mit {size} Feldern! Die Felder darum sind Wasser, denn Schiffe berühren sich nie. Schieß noch einmal.',
  theySank: '{name} versenkt ein Schiff mit {size} Feldern und schießt noch einmal.',
  youMissed: 'Wasser. Jetzt schießt {name}.',
  theyMissed: '{name} trifft nur Wasser.',
  afloat: 'Schwimmen noch:',
  shipOf: 'Schiff mit {size} Feldern',
  seaWater: 'Wasser',
  seaHit: 'Treffer',
  seaSunk: 'versenkt',
  seaShip: 'Schiff',
  seaPicked: 'gewählt',
  showFleet: 'Meine Flotte zeigen',
  hideFleet: 'Meine Flotte verbergen',
  handOver: 'Fertig: an {name} weitergeben',
  takeOver: 'Ich bin {name}: mein Meer zeigen',
  passTo: 'Gib das Gerät an {name} weiter. Nur {name} schaut jetzt hin.',
  handOverNotice:
    'Schiffe versenken auf einem Gerät: Gib das Gerät weiter, wenn es danach fragt, und schau nur hin, wenn du dran bist.',
  hiddenFleetNotice:
    'Jede Flotte bleibt verborgen, bis ihr Spieler auf „Meine Flotte zeigen“ tippt: Die anderen schauen dann weg.',
  maexchen: 'Mäxchen',
  maexchenName: 'Mäxchen',
  doubleName: '{n}er-Pasch',
  diceRolls: '{name} würfelt.',
  diceLooks: '{name} schaut unter den Becher.',
  diceDecides: '{name} entscheidet: {other} glauben, oder anzweifeln?',
  diceRollFirst: 'Würfle: Nur du siehst die Würfel. Dann sag, was sie zeigen, oder bluffe.',
  diceSayAny: 'Sag, was unter dem Becher liegt. Noch hat niemand etwas gesagt, jeder Wurf geht.',
  diceSayOwn: 'Deine Würfel zeigen {own}. Sag es, oder bluffe: Noch hat niemand etwas gesagt.',
  diceSayMore: 'Sag, was unter dem Becher liegt: Es muss {claim} schlagen.',
  diceSayTrue: 'Deine Würfel zeigen {own}, das schlägt {claim}: Sag es, oder bluffe höher.',
  diceMustBluff:
    'Deine Würfel zeigen {own}, das schlägt {claim} nicht: Du musst bluffen und mehr als {claim} sagen.',
  diceOdds:
    '{name} sagt {claim}. Zwei Würfel zeigen {claim} oder mehr in {n} von 36 Würfen. Glaub es und würfle, oder zweifle es an und heb den Becher.',
  diceAgainstMaexchen:
    '{name} sagt Mäxchen, das schlägt nichts. Gib ein Leben ab, oder zweifle: Stimmt es, kostet Zweifeln zwei.',
  diceSaid: '{name} sagt: {claim}',
  diceRoll: 'Würfeln',
  diceBelieve: 'Glauben und würfeln',
  diceDoubt: 'Anzweifeln: Becher heben',
  diceYield: 'Ein Leben abgeben',
  diceSay: 'Sag, was unter dem Becher liegt',
  diceTrue: 'deine Würfel',
  diceOut: 'raus',
  diceLives: '{n} Leben',
  diceUnder: 'Unter deinem Becher: {dice}, also {value}',
  diceCupShut: 'Der Becher, geschlossen',
  diceCupEmpty: 'Der Becher, noch nicht gewürfelt',
  diceWasTrue:
    '{doubter} hat {claimer}s {claim} angezweifelt: Unter dem Becher lag {dice}, {held}. Das reicht.',
  diceWasBluff:
    '{doubter} hat {claimer}s {claim} angezweifelt: Unter dem Becher lag {dice}, nur {held}. Ein Bluff!',
  diceGaveUp: '{doubter} hat {claimer}s Mäxchen geglaubt.',
  diceLosesOne: '{name} verliert ein Leben.',
  diceLosesTwo: '{name} verliert zwei Leben.',
  showDice: 'Meine Würfel zeigen',
  hideDice: 'Meine Würfel verbergen',
  diceHelp: 'So geht Mäxchen',
  diceHelpRead: 'Zwei Würfel liest man mit dem höheren zuerst: eine 3 und eine 5 sind 53.',
  diceHelpRank:
    'Ein Pasch schlägt jeden anderen Wurf, und das Mäxchen, eine 2 und eine 1, schlägt alles. Vom höchsten abwärts:',
  diceHelpSay:
    'Würfle unter dem Becher, schau und sag, was er hält: die Wahrheit oder einen Bluff, aber immer mehr, als dein Vorgänger gesagt hat.',
  diceHelpDoubt:
    'Zweifelst du deinen Vorgänger an, wird der Becher gehoben: Liegt weniger darunter, als er gesagt hat, verliert er ein Leben; liegt so viel oder mehr darunter, verlierst du eins. Wer ein Leben verliert, beginnt die nächste Runde.',
  diceHelpMaexchen:
    'Gegen ein Mäxchen gibst du ein Leben ab, oder zweifelst: Ein echtes Mäxchen kostet den Zweifler zwei. Jeder beginnt mit {lives} Leben; wer als Letzter noch eins hat, gewinnt.',
  handOverDice:
    'Mäxchen auf einem Gerät: Gib das Gerät weiter, wenn es danach fragt, und schau nur hin, wenn du dran bist.',
  hiddenDiceNotice:
    'Deine Würfel bleiben verborgen, bis du auf „Meine Würfel zeigen“ tippst: Die anderen schauen dann weg.',
  takeOverDice: 'Ich bin {name}: meinen Zug zeigen',
  werwolf: 'Werwolf',
  roleWolf: 'Werwolf',
  roleSeer: 'Seherin',
  roleHealer: 'Heiler',
  roleVillager: 'Dorfbewohner',
  youAre: 'Du bist: {role}.',
  youAreName: '{name}, du bist: {role}.',
  helpWolf:
    'Jede Nacht wählen die Werwölfe einen Dorfbewohner, den sie holen. Tagsüber tust du, als wärst du ein Dorfbewohner.',
  helpSeer: 'Jede Nacht erfährst du von einem Spieler, ob er ein Werwolf ist.',
  helpHealer:
    'Jede Nacht schützt du einen Spieler vor den Werwölfen, auch dich selbst; nicht zwei Nächte hintereinander denselben.',
  helpVillager:
    'Findet die Werwölfe und wählt sie tagsüber hinaus. Nachts wählst du auch jemanden, damit keiner an deinem Tippen deine Rolle erkennt.',
  askWolf: 'Wen holen die Werwölfe?',
  askSeer: 'Wessen Rolle schaust du dir an?',
  askHealer: 'Wen schützt du heute Nacht?',
  askVillager: 'Wen verdächtigst du? Es ändert nichts, aber alle tippen.',
  askVote: 'Beratet euch, dann stimmt ab, wer das Dorf verlassen muss.',
  askHidden: 'Zeig deine Rolle, um zu wählen.',
  nightN: 'Nacht {n}',
  dayN: 'Tag {n}',
  villageWatching: 'Du schaust dem Dorf zu.',
  youAreOut: 'Du bist raus. Schau zu und verrate nichts.',
  waitingOne: 'Es fehlt noch einer.',
  waitingMore: 'Es fehlen noch {n}.',
  youChose: 'Du hast {name} gewählt.',
  youVoted: 'Du hast für {name} gestimmt.',
  pickedBy: 'gewählt von {names}',
  otherWolves: 'Die anderen Werwölfe: {names}.',
  seerKnows: 'Du weißt:',
  seenWolf: '{name} ist ein Werwolf.',
  seenNotWolf: '{name} ist keiner.',
  roleHidden: 'Deine Rolle ist verborgen.',
  showRole: 'Meine Rolle zeigen',
  hideRole: 'Meine Rolle verbergen',
  out: 'raus',
  storyNobody: 'Nacht {n}: Niemand wurde geholt.',
  storyTaken: 'Nacht {n}: Die Werwölfe haben {name} geholt: {role}.',
  storyTie: 'Tag {n}: Gleich viele Stimmen, niemand muss gehen.',
  storyBanished: 'Tag {n}: Das Dorf schickt {name} fort, mit {votes} Stimmen: {role}.',
  storySoFar: 'Was bisher geschah',
  villageWins: 'Das Dorf gewinnt: Alle Werwölfe sind raus.',
  wolvesWin: 'Die Werwölfe gewinnen: Sie sind so viele wie die anderen.',
  villageHelp: 'So geht Werwolf',
  helpNight:
    'Nachts wählt jeder auf seinem Handy heimlich jemanden: die Werwölfe ein Opfer, die Seherin, wen sie anschaut, der Heiler, wen er schützt.',
  helpDay:
    'Am Tag erfährt das Dorf, wer geholt wurde und was er war. Beratet euch, dann stimmen alle ab: Wer die meisten Stimmen hat, muss gehen, und seine Rolle wird gezeigt. Bei Gleichstand geht niemand.',
  helpWinning:
    'Das Dorf gewinnt, sobald alle Werwölfe raus sind; die Werwölfe gewinnen, sobald sie so viele sind wie die anderen.',
  handOverRoles:
    'Werwolf auf einem Gerät: Jeder nimmt das Gerät der Reihe nach, nachts und zum Abstimmen, und schaut nur hin, solange er es hält.',
  hiddenRoleNotice:
    'Deine Rolle bleibt verborgen, bis du auf „Meine Rolle zeigen“ tippst: Die anderen schauen dann weg.',
  takeOverRole: 'Ich bin {name}: meine Rolle zeigen',
  lichtrenner: 'Lichtrenner',
  airhockey: 'Airhockey',
  rules: 'Regeln',
  rulesOf: 'Regeln: {game}',
  playersExactly: '{n} Spieler',
  playersFromTo: '{min} bis {max} Spieler',
  rulesTictactoe1:
    'Zwei Spieler setzen abwechselnd ihr Zeichen in ein freies Feld: einer spielt ✕, der andere ◯.',
  rulesTictactoe2:
    'Drei deiner Zeichen in einer Reihe, waagrecht, senkrecht oder schräg, gewinnen.',
  rulesTictactoe3:
    'Ist das Brett voll und hat niemand drei in einer Reihe, ist es unentschieden. Wer anfängt, wechselt sich ab.',
  rulesFourinarow1:
    'Werft abwechselnd eine Scheibe in eine Spalte des stehenden Bretts: Sie fällt bis ins unterste freie Loch.',
  rulesFourinarow2:
    'Vier deiner Scheiben in einer Reihe, waagrecht, senkrecht oder schräg, gewinnen. Ist das Brett ohne vier in einer Reihe voll, ist es unentschieden.',
  rulesMuehle1:
    'Jeder Spieler hat neun Steine. Zuerst setzt ihr sie abwechselnd, einen pro Zug, auf einen freien Punkt.',
  rulesMuehle2:
    'Sind alle gesetzt, zieht ein Zug einen deiner Steine entlang einer Linie auf den freien Punkt daneben.',
  rulesMuehle3:
    'Drei deiner Steine in einer Reihe auf einer Linie sind eine Mühle. Dann nimmst du einen Stein des anderen vom Brett: einen, der in keiner Mühle steht, wenn es einen gibt.',
  rulesMuehle4: 'Hast du nur noch drei Steine, dürfen sie auf jeden freien Punkt springen.',
  rulesMuehle5:
    'Wer weniger als drei Steine hat oder keinen ziehen kann, verliert. Fünfzig Züge ohne Mühle sind unentschieden.',
  rulesDame1:
    'Jeder Spieler beginnt mit zwölf Steinen auf den dunklen Feldern. Ein Stein zieht schräg nach vorn auf ein freies dunkles Feld.',
  rulesDame2:
    'Du schlägst einen Stein des anderen, indem du über ihn auf das freie Feld dahinter springst, vorwärts oder rückwärts. Kannst du von dort weiter springen, springst du weiter: Jeder übersprungene Stein verlässt das Brett.',
  rulesDame3:
    'Schlagen ist Pflicht: Kannst du einen Stein schlagen, musst du es, aber du wählst, auf welchem Weg.',
  rulesDame4:
    'Ein Stein, der seinen Zug in der hintersten Reihe beendet, wird zur Dame ♛. Eine Dame zieht und schlägt entlang einer Schrägen beliebig weit, vorwärts und rückwärts.',
  rulesDame5:
    'Wer nicht mehr ziehen kann, verliert. Fünfzig Züge mit Damen ohne Schlagen sind unentschieden.',
  rulesMiaumiau1:
    'Jeder bekommt fünf Karten. Bist du dran, legst du eine Karte mit derselben Farbe oder demselben Wert wie die oberste Karte des Stapels.',
  rulesMiaumiau2:
    'Kannst oder willst du nicht legen, ziehst du eine Karte vom Talon. Passt sie, darfst du sie gleich legen; sonst ist der Nächste dran.',
  rulesMiaumiau3:
    'Eine Sieben lässt den nächsten Spieler zwei Karten ziehen, außer er antwortet mit einer Sieben: Dann zieht der Spieler danach vier, und so weiter.',
  rulesMiaumiau4:
    'Eine Acht lässt den nächsten Spieler aussetzen. Zu zweit bist du gleich noch einmal dran.',
  rulesMiaumiau5:
    'Ein Bube passt auf jede Karte, und du wünschst dir eine Farbe: Die nächste Karte muss diese Farbe haben oder wieder ein Bube sein.',
  rulesMiaumiau6:
    'Wer zuerst seine letzte Karte legt, gewinnt. Bis zu vier Spieler spielen mit 32 Karten, Sieben bis Ass; fünf und sechs mit allen 52.',
  rulesSeeschlacht1:
    'Jeder Spieler versteckt eine Flotte auf einem Meer von 10 mal 10: ein Schiff aus fünf Feldern, eines aus vier, zwei aus drei und eines aus zwei, waagrecht oder senkrecht. Schiffe dürfen sich nicht berühren, auch nicht an einer Ecke.',
  rulesSeeschlacht2:
    'Dann schießt ihr abwechselnd auf ein Feld im Meer des anderen. Ein Treffer lässt dich noch einmal schießen; ein Schuss ins Wasser gibt den Zug weiter.',
  rulesSeeschlacht3:
    'Ein Schiff ist versenkt, sobald jedes seiner Felder getroffen ist. Da sich Schiffe nie berühren, sind die Felder darum herum Wasser.',
  rulesSeeschlacht4: 'Wer zuerst die ganze Flotte des anderen versenkt, gewinnt.',
  rulesLichtrenner1:
    'Ein Spiel in Echtzeit: Jeder Renner fährt von selbst immer weiter und zieht eine Wand aus Licht hinter sich her.',
  rulesLichtrenner2:
    'Biege nach links oder rechts ab, indem du über das Feld wischst, mit ⟲ und ⟳ oder mit den Pfeiltasten. Umdrehen geht nicht.',
  rulesLichtrenner3:
    'Wer in eine Wand, gegen den Rand oder in einen anderen Renner fährt, scheidet aus. Wer als Letzter fährt, gewinnt; krachen die Letzten im selben Moment, ist es unentschieden.',
  rulesAirhockey1:
    'Ein Spiel in Echtzeit, zu zweit. Legt beide Handys auf den Tisch, Oberkante an Oberkante: Jeder Bildschirm ist die Hälfte seines Spielers, mit dem eigenen Tor unten.',
  rulesAirhockey2:
    'Dein Schläger folgt deinem Finger. Schlag den Puck, gern auch über die Banden, ins Tor des anderen.',
  rulesAirhockey3:
    'Ein Tor ist ein Punkt, und wer es kassiert hat, bekommt den Puck. Wer zuerst sieben Tore schießt, gewinnt.',
  rulesKaesekaestchen1:
    'Zieht abwechselnd einen Strich zwischen zwei benachbarten Punkten, waagrecht oder senkrecht. Ein Strich, der kein Kästchen schließt, gibt den Zug weiter.',
  rulesKaesekaestchen2:
    'Ziehst du die vierte Seite eines Kästchens, gehört es dir: Dann ziehst du gleich noch einen Strich.',
  rulesKaesekaestchen3: 'Sind alle Striche gezogen, gewinnt, wer mehr der 25 Kästchen hat.',
  rulesReversi1:
    'Reversi beginnt mit je zwei Steinen über Kreuz in der Mitte des Bretts. Rot setzt zuerst.',
  rulesReversi2:
    'Setze einen Stein so, dass er eine Reihe von Steinen des anderen zwischen sich und einem deiner Steine einschließt: Alle eingeschlossenen Steine wechseln zu deiner Farbe.',
  rulesReversi3:
    'Reihen zählen waagrecht, senkrecht und schräg, und ein Stein kann mehrere Reihen auf einmal einschließen: Sie wechseln alle.',
  rulesReversi4:
    'Kannst du nichts einschließen, setzt du aus. Kann keiner mehr, gewinnt, wer mehr Steine auf dem Brett hat.',
  rulesSternhalma1:
    'Jeder Spieler beginnt mit zehn Steinen in einer Spitze des Sterns und bringt sie alle in die gegenüberliegende Spitze, die in seiner Farbe umringt ist.',
  rulesSternhalma2:
    'Ein Zug ist ein Schritt in ein freies Loch neben dem Stein, oder Sprünge über einen benachbarten Stein, egal wessen, in das freie Loch direkt dahinter, so viele hintereinander, wie du willst. Geschlagen wird nichts.',
  rulesSternhalma3:
    'Wer zuerst die gegenüberliegende Spitze mit seinen Steinen füllt, gewinnt. Wer nicht ziehen kann, setzt aus; dreißig Runden, in denen kein Stein seine Spitze erreicht, sind unentschieden.',
  rulesLudo1:
    'Jeder Spieler hat vier Steine in seiner Ecke. Bist du dran, würfelst du und ziehst einen deiner Steine so viele Felder weiter, rund um das Brett.',
  rulesLudo2:
    'Eine Sechs bringt einen Stein aus deiner Ecke auf dein Startfeld, und du würfelst noch einmal.',
  rulesLudo3:
    'Kommst du auf das Feld eines Steins eines anderen, muss er zurück in seine Ecke. Zwei eigene Steine stehen nie auf einem Feld.',
  rulesLudo4:
    'Hast du keinen Stein draußen, hast du drei Versuche für eine Sechs. Kann kein Stein ziehen, ist der Nächste dran.',
  rulesLudo5:
    'Nach einer Runde um das Brett kommt ein Stein in deine Zielfelder, mit genau passender Zahl. Wer zuerst alle vier Steine im Ziel hat, gewinnt.',
  rulesMaexchen1:
    'Reihum würfelst du mit den zwei Würfeln unter dem Becher und schaust allein nach. Der höhere Würfel zählt zuerst: eine Fünf und eine Drei sind 53.',
  rulesMaexchen2:
    'Sag an, was die Würfel zeigen, die Wahrheit oder geblufft, aber immer mehr als der Spieler vor dir.',
  rulesMaexchen3:
    'Vom niedrigsten an: 31, 32, 41 und so weiter bis 65; dann die Pasche, 11 bis 66; und am höchsten 21, das Mäxchen.',
  rulesMaexchen4:
    'Der Nächste glaubt es und würfelt selbst, oder er zweifelt und hebt den Becher. Zeigen die Würfel weniger als angesagt, verliert der Ansager ein Leben; sonst der Zweifler.',
  rulesMaexchen5:
    'Wird dir „Mäxchen“ angesagt, kannst du ohne Nachschauen ein Leben abgeben oder zweifeln: Ist es das Mäxchen, kostet Zweifeln zwei Leben. Jeder hat drei Leben; wer als Letzter noch eines hat, gewinnt.',
  rulesWerwolf1:
    'Für vier bis acht. Jeder bekommt geheim eine Rolle auf seinem eigenen Handy: Werwolf, Seherin, Heiler oder Dorfbewohner. Die Werwölfe kennen sich.',
  rulesWerwolf2:
    'Nachts tippt jeder geheim jemanden an. Die Werwölfe wählen einen Dorfbewohner, den sie holen, die Seherin erfährt, ob ein Spieler ein Werwolf ist, und der Heiler schützt einen Spieler, nicht zwei Nächte hintereinander denselben.',
  rulesWerwolf3:
    'Am Morgen erfährt das Dorf, wen es getroffen hat. Tagsüber wird geredet, dann stimmen alle ab: Wer die meisten Stimmen bekommt, wird verbannt, und seine Rolle gezeigt. Bei Gleichstand wird niemand verbannt.',
  rulesWerwolf4:
    'Das Dorf gewinnt, sobald alle Werwölfe draußen sind; die Werwölfe gewinnen, sobald sie so viele sind wie die anderen.',
  lichtHint:
    'Biege ab, bevor du gegen eine Wand fährst: wische über das Feld, oder tippe auf ⟲ und ⟳. Wer als Letzter fährt, gewinnt.',
  lichtHintLocal:
    'Biege ab, bevor du gegen eine Wand fährst: mit deinen Tasten oder deinen ⟲ und ⟳. Wer als Letzter fährt, gewinnt.',
  lichtOut: 'Du bist raus. Die anderen fahren weiter.',
  lichtGetReady: 'Dein Renner ist der im Ring.',
  turnLeft: 'Links abbiegen',
  turnRight: 'Rechts abbiegen',
  turnLeftOf: '{name}: links abbiegen',
  turnRightOf: '{name}: rechts abbiegen',
  keysOf: '{name}: {keys}',
  arrowKeys: 'Pfeiltasten',
  hockeyHint:
    'Legt beide Handys auf den Tisch, oberer Rand an oberem Rand: Jeder Bildschirm ist eine Hälfte des Felds, mit deinem Tor unten. Bewege deinen Schläger mit dem Finger.',
  hockeyHintLocal:
    'Bewege deinen Schläger mit dem Finger auf deiner Hälfte, oder mit deinen Tasten.',
  hockeyFirstTo: 'Wer zuerst {n} Tore schießt, gewinnt.',
  hockeyGoal: 'Tor für {name}!',
  hockeyScore: '{a} {goalsA} : {goalsB} {b}',
  stopGame: 'Spiel abbrechen',
  clubs: 'Kreuz',
  spades: 'Pik',
  hearts: 'Herz',
  diamonds: 'Karo',
  jack: 'Bube',
  queen: 'Dame',
  king: 'König',
  ace: 'Ass',
  jackMark: 'B',
  queenMark: 'D',
  kingMark: 'K',
  aceMark: 'A',
  cardName: '{suit} {rank}',
  cards: '{n} Karten',
  oneCard: '1 Karte',
  miau: 'Miau!',
  drawOne: 'Karte ziehen',
  drawMany: '{n} Karten ziehen',
  pass: 'Passen',
  keep: 'Behalten',
  yourCards: 'Deine Karten',
  wishSuit: 'Welche Farbe wünschst du dir?',
  wished: 'Gewünscht: {suit}',
  mustDraw: 'Leg eine Sieben drauf oder zieh {n} Karten.',
  playDrawn: 'Du hast {card} gezogen: Spiel sie aus oder behalte sie.',
  stuck: 'Keiner kann spielen oder ziehen: unentschieden.',
  watchingAll: 'Du schaust zu: {names}.',
  theyMustDraw: '{name} muss {n} Karten ziehen oder eine Sieben drauflegen.',
  youMiss: 'Eine Acht: Du setzt diese Runde aus.',
  theyMiss: 'Eine Acht: {name} setzt aus.',
  followWish: 'Ein Bube wünscht sich {suit}: Spiel eine {suit}-Karte oder einen Buben.',
  cardHelp: 'Was die Karten bedeuten',
  helpMatch:
    'Leg eine Karte mit derselben Farbe oder demselben Wert wie die oberste. Wenn du nicht kannst oder willst, zieh eine.',
  helpSeven:
    'Der Nächste zieht zwei Karten, außer er legt auch eine Sieben: Dann zieht der danach vier.',
  helpEight: 'Der Nächste setzt aus.',
  helpJack:
    'Passt auf jede Karte. Du wünschst dir eine Farbe: Die nächste Karte muss diese Farbe haben oder ein Bube sein.',
  helpStart: 'Die erste aufgedeckte Karte zählt nur mit Farbe und Wert.',
  helpWin:
    'Wer zuerst seine letzte Karte ablegt, gewinnt. „Miau!“ zeigt, wer nur noch eine Karte hat.',
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
  kaesekaestchen: 'Käsekästchen',
  reversi: 'Reversi',
  sternhalma: 'Sternhalma',
  lineAcross: 'Strich waagrecht, Reihe {row}, Spalte {column}',
  lineDown: 'Strich senkrecht, Reihe {row}, Spalte {column}',
  boxAt: 'Kästchen, Reihe {row}, Spalte {column}',
  holeAt: 'Loch, Reihe {row}, Platz {column}',
  reversiHint:
    'Setze einen Stein so, dass er mit einem deiner Steine eine Reihe gegnerischer einschließt: Sie wechseln zu deiner Farbe.',
  reversiYouAgain: '{name} kann nicht ziehen: Du bist noch mal dran.',
  reversiAgain: '{name} kann nicht ziehen: {mover} ist noch mal dran.',
  piecesHeld: 'Pieces:',
  countOf: '{name} {count}',
  kaeseHint:
    'Tippe zwischen zwei Punkte, um einen Strich zu ziehen. Wer die vierte Seite eines Kästchens zieht, bekommt es und zieht noch mal.',
  kaeseYouAgain: 'Du hast ein Kästchen geschlossen: Zieh noch einen Strich.',
  kaeseAgain: '{name} hat ein Kästchen geschlossen und zieht noch mal.',
  boxesHeld: 'Kästchen:',
  sternHint:
    'Bring alle zehn Steine in das gegenüberliegende Dreieck, das in deiner Farbe umrandet ist. Wähle einen Stein, um zu sehen, wohin er kann.',
  sternWhere:
    'Tippe, wohin er zieht: ein freies Nachbarloch, oder so weit er über Steine springen kann, einen nach dem anderen.',
  arrived: 'Angekommen:',
  arrivedOf: '{name} {count}/10',
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
  copyByHand: 'Kopieren hat nicht geklappt: Der Code ist markiert, kopiere ihn von Hand.',
  codeTaken: 'Code gelesen.',
  waitingForHost:
    'Warte, bis der Gastgeber den Code dieses Handys nimmt. Wenn du ihn hinüberschickst, darf das dauern.',
  tryAgain: 'Nochmal versuchen',
  timedOut: 'Das andere Handy hat nicht rechtzeitig geantwortet.',
  notACode: 'Das ist kein Code der Spielekiste.',
  cameraOff: 'Die Kamera ist nicht angegangen: Mach ein Foto vom Code, oder nimm die Textcodes.',
  scanHelp:
    'Unscharf? Tippe ins Bild, um scharfzustellen. Halte das Handy etwas weiter weg und zoome heran, oder dreh die Helligkeit herunter, wenn der Code blendet.',
  scanHelpBasic:
    'Unscharf? Tippe ins Bild, um scharfzustellen, halte das Handy etwas weiter weg, oder mach stattdessen ein Foto.',
  zoom: 'Zoom',
  brightness: 'Helligkeit',
  switchCamera: 'Kamera wechseln',
  takePhoto: 'Stattdessen ein Foto machen',
  liveCamera: 'Zurück zur Live-Kamera',
  readingPhoto: 'Lese das Foto…',
  photoNoCode:
    'Im Foto wurde kein Code gefunden. Versuch es etwas weiter weg, mit dem Code in der Bildmitte.',
  connecting: 'Verbinde…',
  chooseConnection: 'Wie verbinden sich die Handys?',
  viaQr: 'QR-Code',
  viaQrNote: 'Über dasselbe WLAN oder einen Hotspot. Geht auch mit der Website.',
  viaBluetooth: 'Bluetooth',
  viaBluetoothNote: 'Ohne WLAN. Beide Handys brauchen die App.',
  viaQrInstead: 'Stattdessen QR-Code verwenden',
  btHostWaiting:
    'Dein Tisch ist für Handys in der Nähe sichtbar. Wer sich setzen möchte, erscheint hier.',
  btCheckCode: 'Lass jemanden nur herein, wenn sein Handy denselben Code zeigt.',
  btRequest: '{name} möchte sich setzen. Code: {digits}',
  btAccept: 'Hereinlassen',
  btReject: 'Ablehnen',
  btSearching: 'Suche Tische in der Nähe… Tippe auf den Namen des Gastgebers.',
  btNoneYet:
    'Noch kein Tisch gefunden. Der Gastgeber eröffnet einen und fügt einen Mitspieler per Bluetooth hinzu.',
  btWaitHost: 'Code: {digits}. {host} vergleicht ihn und lässt dich herein.',
  btRejected: 'Der Gastgeber hat dich nicht hereingelassen, oder die Verbindung ist abgebrochen.',
  btPermission:
    'Die Spielekiste darf Bluetooth nicht verwenden. Erlaube Geräte in der Nähe, und den Standort, wenn Android fragt, in den Einstellungen der App.',
  btUnavailable: 'Bluetooth braucht die Google Play-Dienste, die dieses Handy nicht hat.',
  btOff: 'Bluetooth ist nicht angegangen.',
  btBluetoothOff: 'Bluetooth ist aus. Schalte es ein und versuch es noch einmal.',
  btLocationOff:
    'Der Standort ist aus. Android braucht ihn, um Handys in der Nähe zu finden: Schalte ihn ein und versuch es noch einmal.',
  joined: '{name} spielt mit.',
  rejoined: '{name} ist zurück.',
  connectFailed:
    'Die Verbindung hat nicht geklappt. Sind beide Handys im selben WLAN oder Hotspot?',
  versionMismatch: 'Die Handys haben verschiedene Versionen der Spielekiste: Aktualisiere beide.',
  full: 'Der Tisch ist voll.',
  hostLeft: 'Die Verbindung zum Gastgeber ist weg.',
  hostClosed: 'Der Gastgeber hat den Tisch geschlossen.',
  build: 'Version {version}, Build {commit}.',
  appBuild: 'Version {version}, Build {commit}, App-Build {build}.',
  about: 'Über die Spielekiste',
  aboutTitle: 'Über die Spielekiste',
  aboutBuild: 'Version {version}, Build {commit} vom {date}.',
  aboutAppBuild: 'Version {version}, Build {commit} vom {date}, App-Build {build}.',
  aboutSource: 'Quellcode und Fehlermeldungen auf GitHub',
  aboutWebsite: 'Im Browser spielen',
  aboutContact: 'Kontakt:',
  aboutLibrary:
    'Die Handys verbinden sich über @fionapreroll/p2p, eine Bibliothek derselben Entwicklerin, gemacht für Funkenjagd.',
  privacyTitle: 'Datenschutzerklärung',
  privacyShort:
    'Keine Konten, kein Server, keine Werbung, kein Tracking: Was die Spielekiste speichert, bleibt auf diesem Gerät.',
  changelogTitle: 'Was ist neu',
  changelogNote: 'Die Liste der Änderungen ist auf Englisch.',
  changelogUnreleased: 'Diese Version',
  licensesTitle: 'Code von anderen',
  licensesNote:
    'Die Spielekiste ist mit diesen Open-Source-Bibliotheken gebaut, unter ihren Lizenzen. Tippe eine an, um ihren Lizenztext zu sehen.',
  licensesNative: 'Die Android-App enthält außerdem:',
  licensesMissing: 'Die Liste gehört zur gebauten Spielekiste, nicht zum Entwicklungsserver.',
  webUpdateReady: 'Eine neue Version der Spielekiste ist da.',
  webUpdateReload: 'Laden',
  settings: 'Einstellungen',
  appTitle: 'Android-App',
  getApp: 'Die Spielekiste als Android-App holen',
  webUpdatesSetting: 'Auf dem Startbildschirm sagen, wenn eine neue Version da ist',
  webUpdatesNote:
    'Die Seite schaut dann ab und zu nach der Version auf GitHub Pages, von wo sie kommt.',
  webUpdatesCurrent: 'Das ist die neueste Version.',
  updatesTitle: 'Aktualisierungen',
  updatesAsk:
    'Soll die Spielekiste bei jedem Start auf GitHub nach einer neuen Version suchen? Dafür braucht es beim Start Internet; ohne startet die App wie gewohnt. In den Einstellungen (⚙) lässt sich das ändern.',
  updatesYes: 'Ja, suchen',
  updatesNo: 'Nein',
  updatesSetting: 'Beim Start nach einer neuen Version suchen',
  updatesNote:
    'Neue Versionen kommen von den Releases der Spielekiste auf GitHub. Android fragt, bevor es eine installiert.',
  updateReady: 'Eine neue Version der Spielekiste ist da (Build {build}).',
  updateInstall: 'Installieren',
  updateLater: 'Später',
  updatesCheckNow: 'Jetzt nach einer neuen Version suchen',
  updatesChecking: 'Suche…',
  updatesCurrent: 'Das ist die neueste Version (Build {build}).',
  updatesCheckFailed: 'Konnte nicht nach einer neuen Version suchen. Gibt es Internet?',
  updateDownload: 'Herunterladen',
  updateDownloadAnyway: 'Trotzdem herunterladen',
  updateSize: 'Der Download ist {size} groß.',
  updateContinues:
    'Ein früherer Download hielt bei {percent} % von {size} an: Er geht dort weiter.',
  updateMobileData:
    'Du bist im Mobilfunknetz, das der Download nutzen würde. Im WLAN kostet er nichts.',
  updateMetered:
    'Diese Verbindung wird nach Menge abgerechnet, wie oft beim Hotspot eines Handys: Der Download kann kosten. In einem anderen WLAN vielleicht nicht.',
  updateProgress: '{done} von {total} · {percent} %',
  updatePause: 'Pausieren',
  updateResume: 'Fortsetzen',
  updatePaused: 'Angehalten bei {percent} %. Es geht dort weiter, auch nach dem Schließen der App.',
  updateInstalling: 'Androids Installer öffnet sich…',
  updateConfirm: 'Bestätige die Aktualisierung in Androids Dialog.',
  updateInstalled: 'Installiert. Die App startet in ihrer neuen Version neu.',
  updateAborted:
    'Die Aktualisierung wurde nicht installiert. Tippe auf Installieren, um es noch einmal zu versuchen.',
  updateInstallFailed: 'Android konnte die Aktualisierung nicht installieren: {message}',
  updateNoInstaller:
    'Androids Installer hat sich nicht geöffnet. Tippe auf Installieren, um es noch einmal zu versuchen.',
  updatePermission:
    'Erlaube der Spielekiste in den eben geöffneten Einstellungen, Apps zu installieren, und komm dann zurück: Die Installation geht von selbst weiter.',
  updateFailed:
    'Der Download hat aufgehört. Versuch es noch einmal: Er geht dort weiter, wo er aufhörte.',
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
