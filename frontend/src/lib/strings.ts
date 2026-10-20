// All user-facing Cebuano text lives here so a native speaker can review it in one place.
// NOTE: this is first-draft Cebuano and MUST be reviewed by a native speaker before submission.

export const t = {
  appName: "AyaSib",
  tagline: "Tabang sa pagsabot sa mga serbisyo sa gobyerno, sa Bisaya.",
  back: "Balik",
  home: {
    ask: { title: "Pangutana", desc: "Pangutana bahin sa permit, clearance, ug uban pa." },
    explain: { title: "Ipasabot ang dokumento", desc: "I-paste ang sulat o porma ug ipasabot sa Bisaya." },
    translate: { title: "Hubad", desc: "Hubara ang teksto tali sa English, Filipino, ug Bisaya." },
  },
  ask: {
    title: "Pangutana",
    welcome: "Kumusta! Pangutana ko bahin sa mga serbisyo sa gobyerno.",
    placeholder: "Isulat ang imong pangutana...",
    send: "Ipadala",
    loading: "Gihuna-huna pa...",
    examples: [
      "Unsaon pag-apply ug barangay clearance?",
      "Unsa ang kinahanglan para sa NBI clearance?",
      "Asa ko mangayo ug birth certificate?",
    ],
  },
  card: {
    requirements: "Mga kinahanglanon",
    office: "Asa moadto",
    fee: "Bayad",
    time: "Kadugayon",
    source: "Gigikanan",
    verified: "Kataposang gi-verify",
  },
  notSure: "Dili ko sigurado niini. Palihug kumpirmaha sa opisina.",
  errors: {
    generic: "Naay problema. Palihug sulayi pag-usab.",
    rateLimited: "Daghan kaayo nga pangutana. Palihug paabot ug gamay unya sulayi pag-usab.",
    tooLong: "Taas ra kaayo ang teksto. Palihug paiklia.",
    retry: "Sulayi pag-usab",
  },
  explain: {
    title: "Ipasabot ang dokumento",
    placeholder: "I-paste dinhi ang teksto sa sulat, notice, o porma...",
    button: "Ipasabot",
    whatItIs: "Unsa kini",
    whatAsked: "Unsay gipangayo",
    nextSteps: "Unsay buhaton",
    disclaimer:
      "Kini nga pagpasabot tabang lang ug dili legal nga tambag. Palihug pangutana sa opisina o abogado kung dili ka sigurado.",
  },
  translate: {
    title: "Hubad",
    from: "Gikan sa",
    to: "Ngadto sa",
    placeholder: "Isulat o i-paste ang teksto...",
    button: "Hubara",
    swap: "Ilisan ang pinulongan",
    copy: "Kopyaha",
    copied: "Nakopya",
    glossary: "Mga termino gikan sa glossary",
    result: "Hubad",
    langs: { en: "English", fil: "Filipino", ceb: "Bisaya" },
  },
} as const;

// Text the API itself returns (kept separate because the server must not import UI code).
export const serverText = {
  notSure: t.notSure,
  explainDisclaimer: t.explain.disclaimer,
};
