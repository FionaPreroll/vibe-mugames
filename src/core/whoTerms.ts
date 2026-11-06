/**
 * The terms of Wer bin ich?, each in German and English, with what kind of thing it is: animals,
 * jobs, figures of fairy tales and legends, and things. A term may have other names that count
 * as guessed too, after a `|`: the first is the one shown. The host deals terms by their number
 * here, so every phone shows each term in its own language.
 */

export type TermKind = 'animal' | 'job' | 'figure' | 'thing'

export interface Term {
  readonly de: string
  readonly en: string
  readonly kind: TermKind
}

const animals: readonly [string, string][] = [
  ['Hund', 'dog'],
  ['Katze', 'cat'],
  ['Pferd', 'horse'],
  ['Kuh', 'cow'],
  ['Schwein', 'pig'],
  ['Schaf', 'sheep'],
  ['Huhn|Henne', 'chicken|hen'],
  ['Ente', 'duck'],
  ['Hase|Kaninchen', 'rabbit|hare|bunny'],
  ['Maus', 'mouse'],
  ['Elefant', 'elephant'],
  ['Giraffe', 'giraffe'],
  ['Löwe', 'lion'],
  ['Tiger', 'tiger'],
  ['Zebra', 'zebra'],
  ['Affe', 'monkey|ape'],
  ['Bär', 'bear'],
  ['Wolf', 'wolf'],
  ['Fuchs', 'fox'],
  ['Igel', 'hedgehog'],
  ['Eichhörnchen', 'squirrel'],
  ['Pinguin', 'penguin'],
  ['Eule', 'owl'],
  ['Adler', 'eagle'],
  ['Papagei', 'parrot'],
  ['Hai', 'shark'],
  ['Wal', 'whale'],
  ['Delfin', 'dolphin'],
  ['Krokodil', 'crocodile'],
  ['Schlange', 'snake'],
  ['Frosch', 'frog'],
  ['Schildkröte', 'turtle|tortoise'],
  ['Schnecke', 'snail'],
  ['Biene', 'bee'],
  ['Spinne', 'spider'],
  ['Schmetterling', 'butterfly'],
  ['Känguru', 'kangaroo'],
  ['Kamel', 'camel'],
  ['Nashorn', 'rhinoceros|rhino'],
  ['Oktopus|Krake', 'octopus'],
]

const jobs: readonly [string, string][] = [
  ['Ärztin|Arzt', 'doctor'],
  ['Lehrerin|Lehrer', 'teacher'],
  ['Feuerwehrfrau|Feuerwehrmann', 'firefighter|fireman'],
  ['Polizistin|Polizist', 'police officer|policeman|policewoman'],
  ['Köchin|Koch', 'cook|chef'],
  ['Bäckerin|Bäcker', 'baker'],
  ['Pilotin|Pilot', 'pilot'],
  ['Astronautin|Astronaut', 'astronaut'],
  ['Friseurin|Friseur', 'hairdresser'],
  ['Gärtnerin|Gärtner', 'gardener'],
  ['Bäuerin|Bauer|Landwirt', 'farmer'],
  ['Malerin|Maler', 'painter'],
  ['Briefträgerin|Briefträger', 'postman|postwoman|mail carrier'],
  ['Zahnärztin|Zahnarzt', 'dentist'],
  ['Tierärztin|Tierarzt', 'vet|veterinarian'],
  ['Musikerin|Musiker', 'musician'],
  ['Sängerin|Sänger', 'singer'],
  ['Fußballerin|Fußballer|Fußballspieler', 'footballer|football player|soccer player'],
  ['Clown', 'clown'],
  ['Zauberin|Zauberer|Magier', 'magician'],
]

const figures: readonly [string, string][] = [
  ['Rotkäppchen', 'Little Red Riding Hood'],
  ['Schneewittchen', 'Snow White'],
  ['Aschenputtel', 'Cinderella'],
  ['Dornröschen', 'Sleeping Beauty'],
  ['Rumpelstilzchen', 'Rumpelstiltskin'],
  ['Froschkönig', 'Frog Prince'],
  ['Rapunzel', 'Rapunzel'],
  ['Hänsel', 'Hansel'],
  ['Gretel', 'Gretel'],
  ['Frau Holle', 'Mother Hulda'],
  ['Der gestiefelte Kater', 'Puss in Boots'],
  ['Pinocchio', 'Pinocchio'],
  ['Robin Hood', 'Robin Hood'],
  ['Weihnachtsmann|Nikolaus', 'Father Christmas|Santa Claus|Santa'],
  ['Osterhase', 'Easter Bunny'],
  ['Zahnfee', 'Tooth Fairy'],
  ['Hexe', 'witch'],
  ['Drache', 'dragon'],
  ['Einhorn', 'unicorn'],
  ['Meerjungfrau', 'mermaid'],
  ['Vampir', 'vampire'],
  ['Gespenst|Geist', 'ghost'],
  ['Riese', 'giant'],
  ['Zwerg', 'dwarf'],
  ['Pirat|Piratin', 'pirate'],
  ['Ritter', 'knight'],
  ['Prinzessin', 'princess'],
  ['König', 'king'],
  ['Königin', 'queen'],
  ['Roboter', 'robot'],
  ['Schneemann', 'snowman'],
  ['Cowboy', 'cowboy'],
]

const things: readonly [string, string][] = [
  ['Regenschirm', 'umbrella'],
  ['Zahnbürste', 'toothbrush'],
  ['Kühlschrank', 'fridge|refrigerator'],
  ['Fahrrad', 'bicycle|bike'],
  ['Flugzeug', 'aeroplane|airplane|plane'],
  ['Handy|Smartphone', 'phone|mobile phone|smartphone'],
  ['Brille', 'glasses|spectacles'],
  ['Kerze', 'candle'],
  ['Gitarre', 'guitar'],
  ['Klavier', 'piano'],
  ['Pizza', 'pizza'],
  ['Banane', 'banana'],
  ['Kaktus', 'cactus'],
  ['Sonne', 'sun'],
  ['Mond', 'moon'],
  ['Regenbogen', 'rainbow'],
  ['Vulkan', 'volcano'],
  ['Leuchtturm', 'lighthouse'],
  ['Schere', 'scissors'],
  ['Teddybär', 'teddy bear|teddy'],
]

const ofKind = (list: readonly [string, string][], kind: TermKind): Term[] =>
  list.map(([de, en]) => ({ de, en, kind }))

export const TERMS: readonly Term[] = [
  ...ofKind(animals, 'animal'),
  ...ofKind(jobs, 'job'),
  ...ofKind(figures, 'figure'),
  ...ofKind(things, 'thing'),
]
