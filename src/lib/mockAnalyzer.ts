import type {
  AnalysisResult,
  SentenceResult,
  Suggestion,
  TokenResult,
} from "../types";

type Rule = {
  translation: string;
  suggestion?: Suggestion;
};

const RULES: Record<string, Rule> = {
  recieve: {
    translation: "menerima",
    suggestion: {
      replacement: "receive",
      reason: "The i comes before e after c: receive.",
      category: "spelling",
    },
  },
  teh: {
    translation: "itu / tersebut",
    suggestion: {
      replacement: "the",
      reason: "This looks like a small spelling slip.",
      category: "spelling",
    },
  },
  freind: {
    translation: "teman",
    suggestion: {
      replacement: "friend",
      reason: "The vowels are in the opposite order here.",
      category: "spelling",
    },
  },
  beutiful: {
    translation: "indah",
    suggestion: {
      replacement: "beautiful",
      reason: "The standard spelling is beautiful.",
      category: "spelling",
    },
  },
  definately: {
    translation: "pasti",
    suggestion: {
      replacement: "definitely",
      reason: "The middle sound is spelled -finite-.",
      category: "spelling",
    },
  },
  seperate: {
    translation: "terpisah",
    suggestion: {
      replacement: "separate",
      reason: "Separate uses an a in the middle.",
      category: "spelling",
    },
  },
  occured: {
    translation: "terjadi",
    suggestion: {
      replacement: "occurred",
      reason: "The past tense doubles the final r.",
      category: "spelling",
    },
  },
  untill: {
    translation: "sampai",
    suggestion: {
      replacement: "until",
      reason: "Until has one l at the end.",
      category: "spelling",
    },
  },
  becuase: {
    translation: "karena",
    suggestion: {
      replacement: "because",
      reason: "The letters are arranged as b-e-c-a-u-s-e.",
      category: "spelling",
    },
  },
  wich: {
    translation: "yang",
    suggestion: {
      replacement: "which",
      reason: "Which starts with wh.",
      category: "spelling",
    },
  },
  enought: {
    translation: "cukup",
    suggestion: {
      replacement: "enough",
      reason: "The final sound is spelled -ough.",
      category: "spelling",
    },
  },
};

const TRANSLATIONS: Record<string, string> = {
  i: "saya",
  im: "saya (aku)",
  dont: "jangan",
  doesnt: "tidak",
  cant: "tidak bisa",
  wont: "tidak akan",
  hello: "halo",
  world: "dunia",
  good: "bagus / baik",
  bad: "buruk",
  morning: "pagi",
  night: "malam",
  day: "hari",
  time: "waktu",
  year: "tahun",
  people: "orang-orang",
  friend: "teman",
  family: "keluarga",
  house: "rumah",
  work: "kerja / bekerja",
  school: "sekolah",
  book: "buku",
  food: "makanan",
  water: "air",
  love: "cinta",
  like: "suka",
  want: "ingin",
  need: "perlu",
  have: "memiliki",
  has: "memiliki",
  is: "adalah",
  are: "adalah",
  was: "adalah (lampau)",
  were: "adalah (lampau)",
  will: "akan",
  would: "akan (lampau)",
  can: "bisa",
  could: "bisa (lampau)",
  should: "seharusnya",
  must: "harus",
  know: "tahu",
  think: "berpikir",
  believe: "percaya",
  help: "bantuan / membantu",
  please: "tolong",
  thank: "terima kasih",
  sorry: "maaf",
  problem: "masalah",
  solution: "solusi",
  important: "penting",
  beautiful: "indah",
  very: "sangat",
  project: "proyek",
  language: "bahasa",
  english: "bahasa Inggris",
  learn: "belajar",
  study: "belajar",
  read: "membaca",
  write: "menulis",
  speak: "berbicara",
  listen: "mendengarkan",
  understand: "memahami",
  question: "pertanyaan",
  answer: "jawaban",
  today: "hari ini",
  tomorrow: "besok",
  yesterday: "kemarin",
  now: "sekarang",
  what: "apa",
  how: "bagaimana",
  why: "mengapa",
  where: "di mana",
  when: "kapan",
  who: "siapa",
  which: "yang mana",
  this: "ini",
  that: "itu",
  these: "ini (jamak)",
  those: "itu (jamak)",
  there: "di sana",
  here: "di sini",
  again: "lagi",
  always: "selalu",
  never: "tidak pernah",
  often: "sering",
  sometimes: "kadang-kadang",
  because: "karena",
  but: "tetapi",
  and: "dan",
  or: "atau",
  with: "dengan",
  without: "tanpa",
  from: "dari",
  to: "ke / untuk",
  for: "untuk",
  about: "tentang",
  in: "di dalam",
  on: "di atas",
  at: "di",
  of: "dari",
  by: "oleh / dengan",
  new: "baru",
  old: "lama",
  young: "muda",
  many: "banyak",
  much: "banyak",
  some: "beberapa",
  any: "apa saja",
  all: "semua",
  no: "tidak",
  yes: "ya",
};

const SENTENCE_TRANSLATIONS: Record<string, string> = {
  "i am a student": "Saya adalah seorang pelajar.",
  "i have a problem": "Saya punya masalah.",
  "please help me": "Tolong bantu saya.",
  "thank you very much": "Terima kasih banyak.",
  "i want to learn english": "Saya ingin belajar bahasa Inggris.",
  "how are you": "Apa kabar?",
  "good morning": "Selamat pagi.",
  "good night": "Selamat malam.",
  "i love you": "Saya cinta kamu.",
  "what is your name": "Siapa namamu?",
  "where are you from": "Dari mana asalmu?",
  "i think this is a good idea": "Saya pikir ini adalah ide yang bagus.",
  "can you help me": "Bisakah kamu membantu saya?",
  "i need to go now": "Saya harus pergi sekarang.",
  "the weather is beautiful today": "Cuacanya indah hari ini.",
  "i have been working on this project": "Saya telah mengerjakan proyek ini.",
  "i have receive the letter from my friend":
    "Saya sudah menerima surat dari teman saya.",
};

function cleanWord(value: string): string {
  return value.toLowerCase().replace(/^[^a-z']+|[^a-z']+$/gi, "");
}

function preserveCase(source: string, replacement: string): string {
  if (source === source.toUpperCase()) return replacement.toUpperCase();
  if (/^[A-Z]/.test(source)) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function replaceToken(token: string, replacement: string): string {
  const leading = token.match(/^[^a-z']*/i)?.[0] ?? "";
  const trailing = token.match(/[^a-z']*$/i)?.[0] ?? "";
  const core = cleanWord(token);
  return `${leading}${preserveCase(core || token, replacement)}${trailing}`;
}

function normalizeSentence(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9']+/g, " ").trim();
}

export function translateSentence(value: string): string {
  const normalized = normalizeSentence(value);
  if (SENTENCE_TRANSLATIONS[normalized]) return SENTENCE_TRANSLATIONS[normalized];

  const words = normalized.split(" ").filter(Boolean);
  const translated = words.map((word) => TRANSLATIONS[word]).filter(Boolean);
  if (translated.length >= Math.max(2, Math.ceil(words.length * 0.55))) {
    return `${translated.join(" ")}.`;
  }
  return "Terjemahan konteks kalimat akan muncul di sini.";
}

function sentenceParts(text: string): string[] {
  return text.match(/[^.!?]+[.!?]*/g)?.map((part) => part.trim()).filter(Boolean) ?? [];
}

function analyzeSentence(original: string): SentenceResult {
  const tokens: TokenResult[] = (original.match(/\S+/g) ?? []).map((text) => {
    const key = cleanWord(text);
    const rule = RULES[key];
    const tokenTranslation = rule?.translation ?? TRANSLATIONS[key];
    return {
      text,
      status: rule?.suggestion ? "error" : "correct",
      translationId: tokenTranslation,
      suggestions: rule?.suggestion ? [rule.suggestion] : undefined,
    };
  });

  const corrected = tokens
    .map((token) =>
      token.suggestions?.[0]
        ? replaceToken(token.text, token.suggestions[0].replacement)
        : token.text,
    )
    .join(" ");

  return {
    original,
    corrected,
    translationId: translateSentence(corrected),
    tokens,
  };
}

export function rebuildResult(result: AnalysisResult): AnalysisResult {
  const sentences = result.sentences.map((sentence) => {
    const corrected = sentence.tokens.map((token) => token.text).join(" ");
    return {
      ...sentence,
      corrected,
      translationId: translateSentence(corrected),
    };
  });

  return {
    ...result,
    sentences,
    correctedText: sentences.map((sentence) => sentence.corrected).join(" "),
  };
}

export const mockAnalyzer: import("../types").Analyzer = {
  async analyze(text) {
    const sentences = sentenceParts(text).map(analyzeSentence);
    return {
      originalText: text,
      correctedText: sentences.map((sentence) => sentence.corrected).join(" "),
      sentences,
      createdAt: Date.now(),
    };
  },
};
