/* ==================== CONTENT: languages, lessons, question banks ==================== */
const LANGS = {
  es: {
    name: "Spanish", native: "Español", flag: "🇪🇸",
    units: [
      { title: "First steps", lessons: [
        { id: "es-greet",  title: "Greetings",     icon: "👋", blurb: "hola, gracias, por favor" },
        { id: "es-num",    title: "Numbers",       icon: "🔢", blurb: "uno – diez" },
        { id: "es-family", title: "Family",        icon: "👪", blurb: "madre, hermano, hijo" },
        { id: "es-food",   title: "Food & drink",  icon: "🥐", blurb: "pan, café, manzana" },
      ]},
      { title: "Daily life", lessons: [
        { id: "es-color",  title: "Colors",        icon: "🎨", blurb: "rojo, azul, verde" },
        { id: "es-time",   title: "Time words",    icon: "⏰", blurb: "hoy, mañana, ahora" },
        { id: "es-place",  title: "Places",        icon: "🏙️", blurb: "ciudad, tienda, baño" },
        { id: "es-quest",  title: "Questions",     icon: "❓", blurb: "dónde, quién, por qué" },
      ]},
      { title: "Power verbs", lessons: [
        { id: "es-yo",     title: "Present “yo”",  icon: "⚡", blurb: "tengo, puedo, quiero" },
        { id: "es-past",   title: "Past essentials", icon: "⏪", blurb: "fui, hice, tuve" },
      ]},
    ],
  },
};

/* Five questions per lesson. q = prompt, o = options, a = index of correct option. */
const BANKS = {
  /* ---------- Spanish ---------- */
  "es-greet": [
    { q: "“hola” means…", o: ["hello", "goodbye", "please", "thanks"], a: 0 },
    { q: "How do you say “thank you”?", o: ["por favor", "gracias", "de nada", "lo siento"], a: 1 },
    { q: "Complete: “___, ¿cómo estás?”", o: ["Adiós", "Gracias", "Hola", "No"], a: 2 },
    { q: "“de nada” means…", o: ["good night", "I'm sorry", "please", "you're welcome"], a: 3 },
    { q: "How do you say “please”?", o: ["gracias", "de nada", "por favor", "adiós"], a: 2 },
  ],
  "es-num": [
    { q: "“siete” is…", o: ["six", "seven", "eight", "nine"], a: 1 },
    { q: "How do you say “ten”?", o: ["dos", "seis", "diez", "nueve"], a: 2 },
    { q: "“Dos cafés, por favor” asks for how many coffees?", o: ["two", "three", "four", "five"], a: 0 },
    { q: "Which is “five”?", o: ["cuatro", "seis", "ocho", "cinco"], a: 3 },
    { q: "“tres” + “uno” = …", o: ["tres", "cinco", "cuatro", "dos"], a: 2 },
  ],
  "es-family": [
    { q: "“la madre” is…", o: ["the mother", "the sister", "the aunt", "the daughter"], a: 0 },
    { q: "How do you say “brother”?", o: ["hermana", "hermano", "hijo", "padre"], a: 1 },
    { q: "“Mi hermana es alta” means my sister is…", o: ["small", "smart", "tall", "tired"], a: 2 },
    { q: "“el hijo” is…", o: ["the father", "the uncle", "the man", "the son"], a: 3 },
    { q: "Complete: “Mi ___ cocina bien.” (my mother cooks well)", o: ["madre", "calle", "mesa", "ciudad"], a: 0 },
  ],
  "es-food": [
    { q: "“el pan” is…", o: ["the milk", "the bread", "the cheese", "the rice"], a: 1 },
    { q: "How do you say “the apple”?", o: ["la carne", "el huevo", "la manzana", "el queso"], a: 2 },
    { q: "“Quiero un vaso de agua” — you asked for…", o: ["coffee", "milk", "wine", "water"], a: 3 },
    { q: "Which is “the coffee”?", o: ["el café", "la leche", "el agua", "el arroz"], a: 0 },
    { q: "“No como carne” means I don't eat…", o: ["cheese", "meat", "eggs", "bread"], a: 1 },
  ],
  "es-color": [
    { q: "“rojo” is…", o: ["red", "blue", "green", "black"], a: 0 },
    { q: "“El cielo es azul” — the sky is…", o: ["grey", "blue", "yellow", "white"], a: 1 },
    { q: "How do you say “green”?", o: ["negro", "blanco", "verde", "rosa"], a: 2 },
    { q: "“amarillo” is…", o: ["orange", "pink", "purple", "yellow"], a: 3 },
    { q: "“El gato es negro” — the cat is…", o: ["black", "white", "brown", "orange"], a: 0 },
  ],
  "es-time": [
    { q: "“hoy” means…", o: ["tomorrow", "today", "yesterday", "now"], a: 1 },
    { q: "“¿Qué hora es?” asks…", o: ["Where are you?", "How are you?", "What time is it?", "What day is it?"], a: 2 },
    { q: "“mañana” can mean tomorrow or…", o: ["evening", "night", "noon", "morning"], a: 3 },
    { q: "How do you say “now”?", o: ["ahora", "ayer", "siempre", "hora"], a: 0 },
    { q: "“Ayer llovió” — when did it rain?", o: ["today", "yesterday", "tomorrow", "always"], a: 1 },
  ],
  "es-place": [
    { q: "“la ciudad” is…", o: ["the street", "the store", "the city", "the school"], a: 2 },
    { q: "“¿Dónde está el baño?” asks for the…", o: ["hotel", "train", "kitchen", "bathroom"], a: 3 },
    { q: "How do you say “the store”?", o: ["la tienda", "la calle", "la casa", "la mesa"], a: 0 },
    { q: "“Voy al aeropuerto” — where are you going?", o: ["the hotel", "the airport", "the school", "the city"], a: 1 },
    { q: "“el tren” is…", o: ["the car", "the plane", "the train", "the bus"], a: 2 },
  ],
  "es-quest": [
    { q: "“¿dónde?” asks…", o: ["where?", "when?", "why?", "who?"], a: 0 },
    { q: "“¿Cuánto cuesta?” means…", o: ["Which one?", "How much does it cost?", "Who is it?", "What time?"], a: 1 },
    { q: "How do you ask “why?”", o: ["¿cómo?", "¿cuál?", "¿por qué?", "¿quién?"], a: 2 },
    { q: "“¿quién?” asks…", o: ["what?", "how?", "where?", "who?"], a: 3 },
    { q: "“¿Cuándo llegas?” asks ___ you arrive.", o: ["when", "where", "how", "why"], a: 0 },
  ],
  "es-yo": [
    { q: "“I want” = …", o: ["puedo", "quiero", "tengo", "voy"], a: 1 },
    { q: "“I can” = …", o: ["quiero", "sé", "puedo", "hago"], a: 2 },
    { q: "“tengo” means…", o: ["I go", "I say", "I see", "I have"], a: 3 },
    { q: "“I know (facts)” = …", o: ["sé", "soy", "veo", "doy"], a: 0 },
    { q: "Complete: “___ al mercado.” (I go to the market)", o: ["Hago", "Voy", "Digo", "Pongo"], a: 1 },
  ],
  "es-past": [
    { q: "“I went / I was” = …", o: ["fui", "voy", "iré", "vas"], a: 0 },
    { q: "“hice” means…", o: ["I said", "I did / made", "I put", "I saw"], a: 1 },
    { q: "“I had (at one moment)” = …", o: ["tengo", "tendré", "tuve", "hubo"], a: 2 },
    { q: "“Dije la verdad” — I ___ the truth.", o: ["heard", "wrote", "knew", "said"], a: 3 },
    { q: "“No pude ir” means I ___ go.", o: ["couldn't", "didn't want to", "shouldn't", "won't"], a: 0 },
  ],
};

/* Mock leaderboard cohort (weekly XP baselines; deterministic daily gains are added in code) */
const RIVALS = [
  { id: "r1", name: "Lucía M.",  flag: "🇪🇸", base: 410 },
  { id: "r2", name: "Tom K.",    flag: "🇩🇪", base: 355 },
  { id: "r3", name: "Amara O.",  flag: "🇰🇪", base: 300 },
  { id: "r4", name: "Jean-P. R.",flag: "🇫🇷", base: 210 },
  { id: "r5", name: "Sofia B.",  flag: "🇮🇹", base: 160 },
  { id: "r6", name: "Mateo V.",  flag: "🇲🇽", base: 120 },
  { id: "r7", name: "Hana S.",   flag: "🇯🇵", base: 75 },
];

const BADGES = [
  { id: "first",   icon: "🌱", name: "First steps",   desc: "Complete your first lesson" },
  { id: "perfect", icon: "💯", name: "Flawless",      desc: "Finish a lesson with 100% accuracy" },
  { id: "flame7",  icon: "🔥", name: "Week of fire",  desc: "Reach a 7-day streak" },
  { id: "flame30", icon: "🌋", name: "Unstoppable",   desc: "Reach a 30-day streak" },
  { id: "xp1k",    icon: "⚡", name: "Kilowatt",      desc: "Earn 1,000 total XP" },
  { id: "goal",    icon: "🎯", name: "Goal getter",   desc: "Hit your weekly XP goal" },
  { id: "owl",     icon: "🦉", name: "Night owl",     desc: "Finish a lesson after 10pm" },
];
