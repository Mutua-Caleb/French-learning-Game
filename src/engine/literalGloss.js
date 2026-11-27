/**
 * French Literal Translation & Word-by-Word Gloss Engine
 *
 * Shows the literal word-for-word structure of French (noun-before-adjective,
 * possession with "de", age with "avoir", reflexive "self", negative "ne...pas", etc.)
 * so learners can form intuitive structural associations (e.g. similar to Swahili).
 */

// Multi-word patterns matched greedily before single-word lookup (longest first)
const PHRASE_GLOSSES = [
  ["qu'est-ce qu'il y a", 'what is-it that it there has'],
  ["qu'est-ce que c'est", 'what is-it that this is'],
  ["qu'est-ce que", 'what is-it that'],
  ["n'est-ce pas", 'not is-it not'],
  ["s'il vous plaît", 'if it to-you pleases'],
  ["s'il te plaît", 'if it to-you pleases'],
  ['il y a', 'it there has'],
  ['tout le monde', 'all the world'],
  ['tout de suite', 'all of following'],
  ['tous les jours', 'all the days'],
  ['tous les lundis', 'all the Mondays'],
  ['pommes de terre', 'apples of earth'],
  ['à côté du', 'at side of-the'],
  ['à côté de', 'at side of'],
  ['moins le quart', 'minus the quarter'],
  ['et quart', 'and quarter'],
  ['et demie', 'and half'],
  ['salle de classe', 'room of class'],
  ['salle de bains', 'room of baths'],
  ['salle à manger', 'room to eat'],
  ['en retard', 'in delay (late)'],
  ['parce que', 'by-this that (because)'],
  ["parce qu'", 'by-this that (because)'],
  ['pendant que', 'during that (while)'],
  ["pendant qu'", 'during that (while)'],
  ['quelque chose', 'some thing'],
  ['chez moi', 'at-home-of me'],
  ['au rez-de-chaussée', 'at-the level-of-road'],
  ["à l'étage", 'at the floor (upstairs)'],
  ['à gauche', 'at left'],
  ['à droite', 'at right'],
  ['à pied', 'by foot'],
  ['à vélo', 'by bike'],
  ['en voiture', 'in car'],
  ['en train', 'in train'],
  ['en bateau', 'in boat'],
  ['en avion', 'in plane'],
  ['en car', 'in coach'],
  ['en taxi', 'in taxi'],
  ['en métro', 'in metro'],
  ['du matin', 'of-the morning'],
  ["de l'après-midi", 'of the after-noon'],
  ['du soir', 'of-the evening'],
  ['le soir', 'the evening'],
  ['il faut', 'it is-necessary'],
  ['ça dépend', 'that depends'],
  ['je veux bien', 'I want well'],
  ['beaucoup de', 'a-lot of'],
  ["beaucoup d'", 'a-lot of'],
  ['un kilo de', 'a kilo of'],
  ['deux kilos de', 'two kilos of'],
  ['par accident', 'by accident'],
  ['plus tard', 'more late'],
  ["plus d'eau", 'more of water'],
  ["pas assez d'argent", 'not enough of money'],
  ["n'a pas d'argent", 'not has not of money'],
  ['je ne peux pas', 'I not can not'],
  ['elle ne peut pas', 'she not can not'],
  ['il ne peut pas', 'he not can not'],
  ['je ne sais pas', 'I not know not'],
  ['ne ... pas', 'not ... not'],
  ['vingt et un', 'twenty and one'],
  ['vingt-trois', 'twenty-three'],
  ['soixante-dix', 'sixty-ten (70)'],
  ['quatre-vingt-dix', 'four-twenty-ten (90)'],
  ['quatre-vingts', 'four-twenties (80)'],
  ['dix-huit', 'ten-eight (18)'],
  ['dix-sept', 'ten-seven (17)'],
  ['dix-neuf', 'ten-nine (19)'],
  ['petit-déjeuner', 'little-breakfast'],
  ['grand-mère', 'grand-mother'],
  ['rez-de-chaussée', 'level-of-road'],
  ['histoire-géo', 'history-geo'],
  ['anne-marie', 'Anne-Marie'],
  ['marie-claire', 'Marie-Claire'],
  ['marie-yvonne', 'Marie-Yvonne'],
  ["aujourd'hui", 'today'],
  ["d'habitude", 'of habit (usually)'],
  ['asseyez-vous', 'sit-yourselves'],
  ['levez-vous', 'raise-yourselves'],
  ['mettez-vous', 'put-yourselves'],
  ['est-il', 'is-it'],
  ['as-tu', 'have-you'],
  ['peux-tu', 'can-you'],
  ['aimes-tu', 'like-you'],
  ['voulez-vous', 'want-you'],
  ['avez-vous', 'have-you'],
  ['pensez-vous', 'think-you'],
];

// Leading elision prefixes (e.g. j'ai -> j' + ai, l'école -> l' + école)
const ELISION_MAP = {
  "j'": 'I',
  "l'": 'the',
  "d'": 'of',
  "n'": 'not',
  "c'": 'it',
  "s'": 'self',
  "m'": 'myself',
  "t'": 'yourself',
  "qu'": 'that',
};

// Complete dictionary covering every single French word across Chapters 2–6, Top 20 Verbs & Paragraphs
const WORD_GLOSS = {
  // Pronouns & determiners
  je: 'I',
  tu: 'you',
  il: 'he/it',
  elle: 'she/it',
  on: 'one/we',
  nous: 'we',
  vous: 'you(pl.)',
  ils: 'they(m.)',
  elles: 'they(f.)',
  moi: 'me',
  lui: 'to-him/her',
  me: 'myself',
  te: 'yourself',
  se: 'self',
  ce: 'this/it',
  cet: 'this',
  cela: 'that',
  ça: 'that',
  y: 'there/about-it',
  le: 'the(m.)',
  la: 'the(f.)',
  les: 'the(pl.)',
  un: 'a(m.)',
  une: 'a(f.)',
  des: 'some/of-the',
  du: 'of-the',
  au: 'at-the/to-the',
  mon: 'my',
  ma: 'my',
  mes: 'my(pl.)',
  ton: 'your',
  ta: 'your',
  tes: 'your(pl.)',
  son: 'his/her',
  sa: 'his/her',
  ses: 'his/her(pl.)',
  notre: 'our',
  nos: 'our(pl.)',
  votre: 'your(pl.)',
  vos: 'your(pl.)',
  quel: 'which',
  quelle: 'which',

  // Prepositions, conjunctions & adverbs
  à: 'to/at',
  de: 'of',
  dans: 'in',
  sur: 'on',
  sous: 'under',
  devant: 'in-front-of',
  derrière: 'behind',
  entre: 'between',
  avec: 'with',
  pour: 'for',
  par: 'by',
  chez: 'at-home-of',
  en: 'in/by',
  avant: 'before',
  après: 'after',
  pendant: 'during',
  et: 'and',
  mais: 'but',
  si: 'if/so',
  alors: 'so/then',
  ensuite: 'next',
  que: 'that',
  quand: 'when',
  comment: 'how',
  où: 'where',
  combien: 'how-much',
  comme: 'like',
  ne: 'not',
  pas: 'not',
  non: 'no',
  ah: 'ah',
  bonjour: 'good-day',
  voici: 'see-here',
  voilà: 'see-there',
  aussi: 'also',
  très: 'very',
  bien: 'well',
  beaucoup: 'much/many',
  assez: 'enough',
  encore: 'again/more',
  déjà: 'already',
  vraiment: 'truly',
  ici: 'here',
  loin: 'far',
  vite: 'fast',
  tôt: 'early',
  tard: 'late',
  hier: 'yesterday',
  demain: 'tomorrow',
  ensemble: 'together',
  tout: 'all/everything',
  tous: 'all',
  plus: 'more',

  // Numbers & time
  premier: 'first',
  deux: 'two',
  trois: 'three',
  quatre: 'four',
  cinq: 'five',
  sept: 'seven',
  huit: 'eight',
  dix: 'ten',
  onze: 'eleven',
  douze: 'twelve',
  treize: 'thirteen',
  quatorze: 'fourteen',
  quinze: 'fifteen',
  seize: 'sixteen',
  vingt: 'twenty',
  trente: 'thirty',
  quarante: 'forty',
  cinquante: 'fifty',
  cent: 'hundred',
  mille: 'thousand',
  an: 'year',
  ans: 'years',
  année: 'year',
  heure: 'hour',
  heures: 'hours',
  midi: 'noon',
  minuit: 'midnight',
  jour: 'day',
  jours: 'days',
  date: 'date',
  lundi: 'Monday',
  lundis: 'Mondays',
  mardi: 'Tuesday',
  mercredi: 'Wednesday',
  jeudi: 'Thursday',
  vendredi: 'Friday',
  samedi: 'Saturday',
  dimanche: 'Sunday',
  janvier: 'January',
  février: 'February',
  avril: 'April',
  juillet: 'July',
  août: 'August',
  décembre: 'December',
  quart: 'quarter',
  demie: 'half',
  moins: 'minus',
  soir: 'evening',
  suite: 'following',

  // Classroom, home, food, school & daily nouns
  table: 'table',
  trousse: 'pencil-case',
  trousses: 'pencil-cases',
  gomme: 'eraser',
  règle: 'ruler',
  fenêtre: 'window',
  lampe: 'lamp',
  télévision: 'television',
  télé: 'TV',
  ordinateur: 'computer',
  sac: 'bag',
  stylo: 'pen',
  stylos: 'pens',
  crayon: 'pencil',
  crayons: 'pencils',
  carte: 'map/card',
  cartes: 'maps',
  tableau: 'board',
  cahier: 'exercise-book',
  livre: 'book',
  livres: 'books',
  porte: 'door',
  pupitre: 'desk',
  fille: 'girl',
  filles: 'girls',
  garçon: 'boy',
  garçons: 'boys',
  professeur: 'teacher',
  prof: 'teacher',
  chaise: 'chair',
  calculatrice: 'calculator',
  dictionnaire: 'dictionary',
  poubelle: 'bin',
  poubelles: 'bins',
  devoir: 'homework',
  devoirs: 'homeworks',
  étagère: 'shelf',
  placard: 'cupboard',
  ballon: 'ball',
  école: 'school',
  classe: 'class',
  salle: 'room',
  élèves: 'pupils',
  ami: 'friend(m.)',
  amie: 'friend(f.)',
  amis: 'friends',
  monsieur: 'sir',
  travail: 'work',
  chose: 'thing',
  maison: 'house',
  cuisine: 'kitchen/food',
  chambre: 'bedroom',
  bains: 'baths',
  salon: 'living-room',
  jardin: 'garden',
  garage: 'garage',
  cave: 'cellar',
  entrée: 'entrance',
  étage: 'upper-floor',
  croissant: 'croissant',
  croissants: 'croissants',
  tartine: 'bread-slice',
  café: 'coffee',
  thé: 'tea',
  chocolat: 'chocolate',
  jus: 'juice',
  orange: 'orange',
  beurre: 'butter',
  confiture: 'jam',
  bol: 'bowl',
  assiette: 'plate',
  cuillère: 'spoon',
  couteau: 'knife',
  journal: 'newspaper',
  musique: 'music',
  radio: 'radio',
  chien: 'dog',
  chat: 'cat',
  photo: 'photo',
  parents: 'parents',
  maman: 'Mum',
  papa: 'Dad',
  père: 'father',
  mère: 'mother',
  frère: 'brother',
  famille: 'family',
  enfants: 'children',
  lit: 'bed',
  vaisselle: 'dishes',
  ménage: 'housework',
  courses: 'errands/shopping',
  promenade: 'walk',
  aspirateur: 'vacuum',
  déjeuner: 'lunch',
  dîner: 'dinner',
  repas: 'meal',
  salade: 'salad',
  gâteau: 'cake',
  eau: 'water',
  ski: 'ski',
  cheval: 'horse',
  forêt: 'forest',
  parc: 'park',
  musée: 'museum',
  oiseaux: 'birds',
  voiture: 'car',
  vélo: 'bike',
  train: 'train',
  bateau: 'boat',
  pied: 'foot',
  avion: 'plane',
  car: 'coach',
  taxi: 'taxi',
  métro: 'metro',
  bagages: 'luggages',
  accident: 'accident',
  réunions: 'meetings',
  anniversaire: 'birthday',
  cadeau: 'present',
  argent: 'money',
  euro: 'euro',
  kilo: 'kilo',
  kilos: 'kilos',
  marché: 'market',
  bananes: 'bananas',
  carottes: 'carrots',
  melon: 'melon',
  pommes: 'apples',
  terre: 'earth',
  tomates: 'tomatoes',
  part: 'slice/share',
  vérité: 'truth',
  monde: 'world',
  astronaute: 'astronaut',
  maths: 'maths',
  sciences: 'sciences',
  informatique: 'computing(IT)',
  dessin: 'drawing',
  matière: 'subject',
  cour: 'playground',
  pause: 'break',
  cantine: 'canteen',
  exercices: 'exercises',
  idées: 'ideas',
  français: 'French',
  française: 'French(f.)',
  anglais: 'English',
  anglaise: 'English(f.)',
  allemand: 'German',
  côté: 'side',
  droite: 'right',
  gauche: 'left',
  retard: 'delay',

  // Names & places
  georges: 'Georges',
  martine: 'Martine',
  nicolas: 'Nicolas',
  marc: 'Marc',
  pierre: 'Pierre',
  sophie: 'Sophie',
  jean: 'Jean',
  charles: 'Charles',
  philippe: 'Philippe',
  robert: 'Robert',
  paul: 'Paul',
  marie: 'Marie',
  claire: 'Claire',
  anne: 'Anne',
  linda: 'Linda',
  mélanie: 'Mélanie',
  patrick: 'Patrick',
  éric: 'Éric',
  amélie: 'Amélie',
  paris: 'Paris',
  calais: 'Calais',
  alpes: 'Alps',
  france: 'France',
  allemagne: 'Germany',

  // Adjectives
  blanc: 'white',
  blanche: 'white(f.)',
  bleue: 'blue(f.)',
  jaune: 'yellow',
  noire: 'black(f.)',
  rose: 'pink',
  rouge: 'red',
  bon: 'good',
  bonne: 'good(f.)',
  bons: 'good(pl.)',
  bonnes: 'good(f.pl.)',
  délicieux: 'delicious',
  grand: 'tall/big',
  petite: 'small(f.)',
  intelligente: 'intelligent(f.)',
  sévère: 'strict',
  paresseux: 'lazy',
  heureux: 'happy',
  heureuse: 'happy(f.)',
  neuve: 'brand-new(f.)',
  sportive: 'sporty(f.)',
  active: 'active(f.)',
  beau: 'handsome',
  belle: 'beautiful(f.)',
  vieille: 'old(f.)',
  nouveau: 'new',
  fou: 'crazy',
  froid: 'cold',
  fort: 'strong/good',
  préférée: 'favourite(f.)',
  prochaine: 'next(f.)',
  prêt: 'ready',
  désolé: 'sorry',
  vrais: 'true/real',

  // Verbs (infinitives, present, past participles, imperfect, future, imperatives)
  // être
  suis: 'am',
  es: 'are',
  est: 'is',
  sommes: 'are',
  êtes: 'are',
  sont: 'are',
  été: 'been',
  étais: 'was',
  était: 'was',
  étions: 'were',
  étaient: 'were',
  serai: 'will-be',
  âge: 'age',

  // avoir
  ai: 'have',
  as: 'have',
  a: 'has',
  avons: 'have',
  avez: 'have',
  ont: 'have',
  eu: 'had',
  avais: 'had(imp.)',
  aurai: 'will-have',

  // aller
  aller: 'to-go',
  vais: 'go',
  vas: 'go',
  va: 'goes',
  allons: 'go',
  allez: 'go!',
  vont: 'go',
  allé: 'gone',
  allais: 'used-to-go',
  allions: 'used-to-go',
  allaient: 'used-to-go',
  irai: 'will-go',

  // faire
  faire: 'to-do/make',
  fais: 'do/make',
  fait: 'does/makes',
  faisons: 'do/make',
  faites: 'do/make',
  font: 'do/make',
  faisais: 'was-doing',
  ferai: 'will-do',
  ferons: 'will-do',

  // prendre
  prendre: 'to-take',
  prends: 'take',
  prend: 'takes',
  prenons: 'take',
  prenez: 'take',
  prennent: 'take',
  pris: 'taken',
  prenais: 'was-taking',
  prendrai: 'will-take',

  // vouloir
  vouloir: 'to-want',
  veux: 'want',
  veut: 'wants',
  voulons: 'want',
  voulez: 'want',
  veulent: 'want',
  voulu: 'wanted',
  voulais: 'wanted(imp.)',
  voudrai: 'will-want',

  // savoir
  savoir: 'to-know',
  sais: 'know',
  sait: 'knows',
  savons: 'know',
  savez: 'know',
  savent: 'know',
  su: 'known',
  savais: 'knew(imp.)',
  savions: 'knew(imp.)',
  saurai: 'will-know',

  // pouvoir
  pouvoir: 'to-be-able',
  peux: 'can',
  peut: 'can',
  pouvons: 'can',
  pouvez: 'can',
  peuvent: 'can',
  pu: 'been-able',
  pouvais: 'could(imp.)',
  pourrai: 'will-be-able',
  pourrons: 'will-be-able',

  // venir
  venir: 'to-come',
  viens: 'come',
  vient: 'comes',
  venons: 'come',
  venez: 'come',
  viennent: 'come',
  venu: 'come(past)',
  venais: 'was-coming',
  viendrai: 'will-come',

  // dire
  dire: 'to-say',
  dis: 'say',
  dit: 'says/said',
  disons: 'say',
  dites: 'say',
  disent: 'say',
  disais: 'was-saying',
  dirai: 'will-say',

  // devoir
  devoir: 'to-must',
  dois: 'must',
  doit: 'must',
  devons: 'must',
  devez: 'must',
  doivent: 'must',
  dû: 'had-to',
  devais: 'had-to(imp.)',
  devrai: 'will-have-to',

  // parler
  parler: 'to-speak',
  parle: 'speak',
  parles: 'speak',
  parlons: 'speak',
  parlez: 'speak!',
  parlent: 'speak',
  parlé: 'spoken',
  parlais: 'was-speaking',
  parlerai: 'will-speak',
  parlerons: 'will-speak',

  // donner
  donner: 'to-give',
  donne: 'give',
  donnes: 'give',
  donnons: 'give',
  donnez: 'give',
  donnent: 'give',
  donné: 'given',
  donnais: 'was-giving',
  donnerai: 'will-give',

  // penser
  penser: 'to-think',
  pense: 'think',
  penses: 'think',
  pensons: 'think',
  pensez: 'think',
  pensent: 'think',
  pensé: 'thought',
  pensais: 'was-thinking',
  penserai: 'will-think',
  penseront: 'will-think',

  // aider
  aider: 'to-help',
  aide: 'help',
  aides: 'help',
  aidons: 'help',
  aidez: 'help',
  aident: 'help',
  aidé: 'helped',
  aidais: 'was-helping',
  aiderai: 'will-help',
  aidera: 'will-help',

  // aimer / adorer
  aimer: 'to-like/love',
  aime: 'like/love',
  aimes: 'like/love',
  aimons: 'like/love',
  aimez: 'like/love',
  aiment: 'like/love',
  aimé: 'liked/loved',
  aimais: 'used-to-like',
  aimaient: 'used-to-like',
  aimerai: 'will-like',
  adore: 'adore',
  adorez: 'adore',
  adorent: 'adore',

  // habiter
  habiter: 'to-live',
  habite: 'live',
  habites: 'live',
  habitons: 'live',
  habitez: 'live',
  habitent: 'live',
  habité: 'lived',
  habitais: 'used-to-live',
  habiterai: 'will-live',
  habitera: 'will-live',

  // regarder
  regarder: 'to-watch',
  regarde: 'watch',
  regardes: 'watch',
  regardons: 'watch',
  regardez: 'watch',
  regardent: 'watch',
  regardé: 'watched',
  regardais: 'was-watching',
  regarderai: 'will-watch',

  // utiliser
  utiliser: 'to-use',
  utilise: 'use',
  utilises: 'use',
  utilisons: 'use',
  utilisez: 'use',
  utilisent: 'use',
  utilisé: 'used',
  utilisais: 'was-using',
  utiliserai: 'will-use',

  // essayer
  essayer: 'to-try',
  essaie: 'try',
  essaies: 'try',
  essayons: 'try',
  essayez: 'try',
  essaient: 'try',
  essayé: 'tried',
  essayais: 'was-trying',
  essaierai: 'will-try',

  // Other textbook verbs
  manger: 'to-eat',
  mange: 'eat',
  manges: 'eat',
  mangerai: 'will-eat',
  préparer: 'to-prepare',
  prépare: 'prepares',
  chanter: 'to-sing',
  chante: 'sings',
  jouer: 'to-play',
  écouter: 'to-listen',
  écoute: 'listen',
  écoutes: 'listen',
  écoutons: 'listen',
  écoutez: 'listen!',
  écoutent: 'listen',
  écrivez: 'write!',
  copiez: 'copy!',
  ouvrez: 'open!',
  ferme: 'close!',
  fermez: 'close!',
  arrive: 'arrive',
  arrives: 'arrive',
  arrivons: 'arrive',
  arrivent: 'arrive',
  arriverait: 'would-happen',
  cherche: 'searches-for',
  appelle: 'call(s)',
  réveiller: 'to-wake',
  réveille: 'wakes',
  lever: 'to-raise(get-up)',
  lève: 'raises(gets-up)',
  laver: 'to-wash',
  lave: 'wash(es)',
  lavez: 'wash',
  lavent: 'wash',
  habiller: 'to-dress',
  habille: 'dresses',
  habilles: 'dress',
  habillons: 'dress',
  descendent: 'go-down',
  met: 'puts/lays',
  mettons: 'put',
  sortir: 'to-take-out',
  sors: 'take-out',
  ranger: 'to-tidy',
  range: 'tidy',
  passer: 'to-pass',
  passe: 'passes',
  promener: 'to-walk',
  nage: 'swims',
  voyager: 'to-travel',
  déteste: 'hates',
  discutent: 'chat',
  trouve: 'find',
  acheter: 'to-buy',
  achète: 'buy',
  achetons: 'buy',
  achètent: 'buy',
  boire: 'to-drink',
  devenir: 'to-become',
  mentir: 'to-lie',
  déménager: 'to-move-house',
  terminer: 'to-finish',
  rester: 'to-stay',
  plaît: 'pleases',
  faut: 'is-necessary',
  dépend: 'depends',
};

function glossSingleWord(rawWord) {
  const lower = rawWord.toLowerCase();

  // Direct hit
  if (WORD_GLOSS[lower]) {
    return [{ fr: rawWord, lit: WORD_GLOSS[lower] }];
  }

  // Handle French apostrophe elisions (j'ai, l'ordinateur, d'Amélie, n'écoute, m'appelle, s'habille, c'est...)
  const apoIdx = rawWord.indexOf("'");
  if (apoIdx > 0 && apoIdx < rawWord.length - 1) {
    const prefix = rawWord.slice(0, apoIdx + 1);
    const rest = rawWord.slice(apoIdx + 1);
    const prefixLower = prefix.toLowerCase();
    const restLower = rest.toLowerCase();

    if (ELISION_MAP[prefixLower]) {
      // Special contextual elisions: m'aide = me helps, l'aiderai = her/him will-help
      let pLit = ELISION_MAP[prefixLower];
      if (prefixLower === "l'" && (restLower === 'aider' || restLower === 'aiderai')) {
        pLit = 'him/her';
      } else if (prefixLower === "m'" && restLower === 'aide') {
        pLit = 'me';
      } else if (prefixLower === "c'" && restLower === 'était') {
        pLit = 'it';
      }
      const restLit = WORD_GLOSS[restLower] || rest;
      return [
        { fr: prefix, lit: pLit },
        { fr: rest, lit: restLit },
      ];
    }
  }

  // Fallback keeps original token cleanly
  return [{ fr: rawWord, lit: rawWord }];
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Produce both:
 *  - sentence: Literal English string preserving French word order (safe to show in Translate mode!)
 *  - pairs:    Array of { fr, lit } chips for visual word-by-word association (shown in Guided / after completion)
 */
export function getLiteralGloss(frenchText) {
  if (!frenchText) return { sentence: '', pairs: [] };

  const text = frenchText.trim();
  const lower = text.toLowerCase();
  const pairs = [];
  const outParts = [];

  let i = 0;
  while (i < text.length) {
    // Skip whitespace
    if (/\s/.test(text[i])) {
      i += 1;
      continue;
    }

    // Preserve sentence punctuation in the literal sentence output
    if (/^[?!.,;:]$/.test(text[i])) {
      if (outParts.length > 0) {
        outParts[outParts.length - 1] += text[i];
      }
      i += 1;
      continue;
    }

    // Try matching multi-word phrases greedily at current position
    let matchedPhrase = null;
    for (const [phrase, gloss] of PHRASE_GLOSSES) {
      if (lower.startsWith(phrase, i)) {
        const end = i + phrase.length;
        const nextCh = text[end];
        const boundaryOk =
          end === text.length ||
          phrase.endsWith("'") ||
          /[\s?!.,;:]/.test(nextCh);
        if (boundaryOk) {
          matchedPhrase = { fr: text.slice(i, end), lit: gloss, end };
          break;
        }
      }
    }

    if (matchedPhrase) {
      pairs.push({ fr: matchedPhrase.fr, lit: matchedPhrase.lit });
      outParts.push(matchedPhrase.lit);
      i = matchedPhrase.end;
      continue;
    }

    // Read a single word (letters, accents, internal apostrophes & hyphens)
    let end = i;
    while (end < text.length && !/[\s?!.,;:]/.test(text[end])) {
      end += 1;
    }
    const word = text.slice(i, end);
    const pieces = glossSingleWord(word);
    for (const p of pieces) {
      pairs.push(p);
      outParts.push(p.lit);
    }
    i = end;
  }

  let sentence = outParts.join(' ');
  // Capitalize start of sentence if original French starts with a capital letter
  if (text[0] && text[0] === text[0].toUpperCase() && text[0] !== text[0].toLowerCase()) {
    sentence = capitalizeFirst(sentence);
  }

  return { sentence, pairs };
}
