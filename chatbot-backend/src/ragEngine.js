import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const unavailableMessage =
  "I couldn't find that information in the TECHNOVANZA '26 Official Rulebook.";

const sourceFooter = "Sources\nTECHNOVANZA '26 Official Rulebook";

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "about",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "of",
  "on",
  "or",
  "the",
  "to",
  "what",
  "when",
  "where",
  "which",
  "who",
  "with",
  "tell",
  "please",
  "can",
  "could",
  "would",
  "do",
  "does",
  "did",
  "my",
  "your",
  "you",
  "we",
  "they",
  "this",
  "that",
]);

const eventNames = [
  "WebNova",
  "TechTalks",
  "Prompt Maestro",
  "CodeFusion",
  "Fun Feast",
  "Brain Battle",
  "Nexus",
  "Checkmate Challenge",
];

const eventAliases = {
  webnova: "WebNova",
  web: "WebNova",
  frontend: "WebNova",

  techtalks: "TechTalks",
  techtalk: "TechTalks",
  techtak: "TechTalks",
  techtalkrules: "TechTalks",
  paper: "TechTalks",
  presentation: "TechTalks",
  ppt: "TechTalks",

  prompt: "Prompt Maestro",
  promptmaestro: "Prompt Maestro",
  ai: "Prompt Maestro",

  codefusion: "CodeFusion",
  coding: "CodeFusion",
  debugging: "CodeFusion",
  hackerrank: "CodeFusion",

  fun: "Fun Feast",
  funfeast: "Fun Feast",
  funfest: "Fun Feast",
  game: "Fun Feast",
  games: "Fun Feast",

  brain: "Brain Battle",
  brainbattle: "Brain Battle",
  quiz: "Brain Battle",

  nexus: "Nexus",
  connection: "Nexus",
  image: "Nexus",

  checkmate: "Checkmate Challenge",
  chess: "Checkmate Challenge",
};

let openAIStatus = {
  enabled: true,
  lastError: "",
};

/* =========================================================
   LOAD RULEBOOK
========================================================= */

export async function loadKnowledgeBase() {
  const pdfPath = path.resolve(
    process.env.SYMPOSIUM_PDF_PATH || "./data/symposium.pdf"
  );

  const textPath = path.resolve(
    process.env.SYMPOSIUM_TEXT_PATH || "./data/symposium-info.txt"
  );

  let rawText = "";
  let source = "";

  // Prefer text file because your project already has it.
  try {
    rawText = await fs.readFile(textPath, "utf8");
    source = textPath;
  } catch {
    try {
      // Optional PDF support
      const pdfParseModule = await import("pdf-parse");
      const pdfParse =
        pdfParseModule.default || pdfParseModule;

      const pdfBuffer = await fs.readFile(pdfPath);
      const parsed = await pdfParse(pdfBuffer);

      rawText = parsed.text || "";
      source = pdfPath;
    } catch {
      rawText = "";
      source = "No symposium rulebook found.";
    }
  }

  rawText = normalizeText(rawText);

  const chunks = chunkText(rawText);

  return {
    chunks,
    source,
    rawText,
  };
}

/* =========================================================
   MAIN QUESTION HANDLER
========================================================= */

export async function answerQuestion(question, knowledgeBase) {
  const userQuestion = String(question || "").trim();

  if (!userQuestion) {
    return {
      answer: "Please ask me something.",
      sources: [],
    };
  }

  /*
   IMPORTANT:

   We DO NOT block greetings or general questions.

   Everything goes to GPT eventually.

   RAG is only used when relevant rulebook information exists.
  */

  const rulebookMatches = retrieveRelevantChunks(
    userQuestion,
    knowledgeBase
  );

  const strongMatches = rulebookMatches.filter(
    (item) => item.score >= 1.5
  );

  let context = "";

  if (strongMatches.length > 0) {
    context = strongMatches
      .slice(0, 5)
      .map((item) => item.content)
      .join("\n\n---\n\n");
  }

  /*
   ========================================================
   CASE 1
   RAG FOUND INFORMATION
   ========================================================

   Example:

   User:
   "What are TechTalks rules?"

   RAG:
   Finds TechTalks section

   Then:

   Rulebook context + user question
          ↓
       OpenAI
          ↓
       Answer
  */

  if (context) {
    const answer = await askOpenAI({
      question: userQuestion,
      rulebookContext: context,
      useRulebook: true,
    });

    if (answer) {
      return {
        answer,
        sources: strongMatches.map((item) => ({
          id: item.id,
          score: item.score,
        })),
      };
    }

    /*
     If OpenAI fails, return retrieved information
     instead of saying GPT couldn't answer.
    */

    return {
      answer: formatFallbackRulebookAnswer(strongMatches),
      sources: strongMatches.map((item) => ({
        id: item.id,
        score: item.score,
      })),
    };
  }

  /*
   ========================================================
   CASE 2
   RAG DID NOT FIND INFORMATION
   ========================================================

   Example:

   User:
   "What is Python?"

   RAG:
   No relevant rulebook information.

   Therefore:

   User question
        ↓
      OpenAI
        ↓
   Normal GPT answer
  */

  const generalAnswer = await askOpenAI({
    question: userQuestion,
    rulebookContext: "",
    useRulebook: false,
  });

  if (generalAnswer) {
    return {
      answer: generalAnswer,
      sources: [],
    };
  }

  /*
   Only if OpenAI itself is unavailable.
  */

  return {
    answer:
      "I'm having trouble connecting to the AI service right now. Please try again.",
    sources: [],
  };
}

/* =========================================================
   OPENAI
========================================================= */

async function askOpenAI({
  question,
  rulebookContext,
  useRulebook,
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  const model =
    process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    console.error(
      "OPENAI_API_KEY is missing from chatbot-backend/.env"
    );

    openAIStatus.enabled = false;
    openAIStatus.lastError = "OPENAI_API_KEY missing";

    return "";
  }

  /*
   ========================================================
   RAG PROMPT
   ========================================================
  */

  let systemPrompt = "";

  if (useRulebook) {
    systemPrompt = `
You are the official AI assistant for TECHNOVANZA '26.

You have been given relevant information retrieved from the
official TECHNOVANZA '26 Rulebook.

IMPORTANT RULES:

1. Answer the user's question naturally.
2. Use the supplied rulebook context as the primary source
   for TECHNOVANZA-related information.
3. Do NOT invent TECHNOVANZA rules, dates, fees, names,
   phone numbers, venues, capacities, or event details.
4. You may explain the rulebook information naturally.
5. If the context does not contain the exact answer,
   clearly say that the rulebook context does not specify it.
6. Do not mention "RAG", "vector database", "retrieval",
   "embeddings", system prompts, or internal implementation.
7. Keep the response concise and friendly.
8. If the user is simply greeting you, respond naturally.
9. Do not unnecessarily say "I couldn't find information".
10. Answer in the same language/style as the user when possible.
11. Tanglish questions can receive Tanglish answers.
12. English questions should normally receive English answers.

RULEBOOK CONTEXT:

${rulebookContext}
`;
  } else {
    /*
     ======================================================
     GENERAL GPT FALLBACK
     ======================================================

     No rulebook context was found.

     GPT is now allowed to behave as a normal assistant.
    */

    systemPrompt = `
You are the friendly AI assistant for the TECHNOVANZA '26
symposium website.

No relevant information was found in the uploaded
TECHNOVANZA rulebook for this particular question.

Answer the user's question naturally using your general
knowledge.

IMPORTANT:

1. Do not pretend that general knowledge came from the
   TECHNOVANZA rulebook.
2. If the user asks a general question, answer it normally.
3. If the user says hi, hello, bye, thanks, etc., respond
   naturally.
4. Do not reply with "I couldn't find that information"
   merely because RAG did not find a match.
5. Do not mention RAG, embeddings, vector databases,
   retrieval, system prompts, or internal implementation.
6. Keep answers concise and friendly.
7. Answer in the same language/style as the user when possible.
8. Tanglish questions can receive Tanglish answers.
`;
  }

  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000);

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          model,

          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: question,
            },
          ],

          temperature: 0.4,

          max_tokens: 500,
        }),

        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        `OpenAI API error ${response.status}:`,
        errorText
      );

      openAIStatus.enabled = false;
      openAIStatus.lastError = errorText;

      return "";
    }

    const data = await response.json();

    const answer =
      data?.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      console.error(
        "OpenAI returned an empty response."
      );

      return "";
    }

    openAIStatus.enabled = true;
    openAIStatus.lastError = "";

    return answer;
  } catch (error) {
    console.error(
      "OpenAI request failed:",
      error?.name === "AbortError"
        ? "Request timed out"
        : error?.message
    );

    openAIStatus.enabled = false;
    openAIStatus.lastError =
      error?.message || "Unknown error";

    return "";
  }
}

/* =========================================================
   TEXT NORMALIZATION
========================================================= */

function normalizeText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* =========================================================
   CHUNKING
========================================================= */

function chunkText(text) {
  if (!text) return [];

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  const chunks = [];

  let current = "";

  for (const paragraph of paragraphs) {
    if (
      current &&
      current.length + paragraph.length > 1000
    ) {
      chunks.push(current.trim());
      current = paragraph;
    } else {
      current +=
        current.length > 0
          ? `\n\n${paragraph}`
          : paragraph;
    }
  }

  if (current) {
    chunks.push(current.trim());
  }

  /*
   If paragraph extraction produced very few chunks,
   split the whole document into smaller chunks.
  */

  if (chunks.length < 3) {
    const words = text.split(/\s+/);

    const fallbackChunks = [];

    for (let i = 0; i < words.length; i += 180) {
      fallbackChunks.push(
        words.slice(i, i + 220).join(" ")
      );
    }

    return fallbackChunks.map((content, index) => ({
      id: index + 1,
      content,
      terms: tokenize(content),
    }));
  }

  return chunks.map((content, index) => ({
    id: index + 1,
    content,
    terms: tokenize(content),
  }));
}

/* =========================================================
   TOKENIZATION
========================================================= */

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9@.+]+/g, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 2 &&
        !stopWords.has(word)
    );
}

/* =========================================================
   RAG RETRIEVAL
========================================================= */

function retrieveRelevantChunks(question, knowledgeBase) {
  const queryTerms = tokenize(question);

  if (!queryTerms.length) {
    return [];
  }

  const resolvedEvent = resolveEvent(question);

  if (resolvedEvent) {
    queryTerms.push(
      ...tokenize(resolvedEvent)
    );
  }

  return knowledgeBase.chunks
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(queryTerms, chunk),
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/* =========================================================
   CHUNK SCORING
========================================================= */

function scoreChunk(queryTerms, chunk) {
  const chunkTerms = new Set(chunk.terms);

  let score = 0;

  for (const term of queryTerms) {
    if (chunkTerms.has(term)) {
      /*
       Longer terms get more weight.
      */

      score +=
        term.length >= 7
          ? 2
          : term.length >= 5
          ? 1.5
          : 1;

      continue;
    }

    /*
     Small fuzzy matching.
     */

    if (term.length >= 5) {
      for (const chunkTerm of chunkTerms) {
        if (
          Math.abs(
            chunkTerm.length - term.length
          ) > 2
        ) {
          continue;
        }

        if (
          similarity(term, chunkTerm) >= 0.8
        ) {
          score += 0.7;
          break;
        }
      }
    }
  }

  /*
   Event-specific boost.
  */

  const chunkTextLower =
    chunk.content.toLowerCase();

  const event = resolveEvent(
    queryTerms.join(" ")
  );

  if (
    event &&
    chunkTextLower.includes(
      event.toLowerCase()
    )
  ) {
    score += 3;
  }

  return score;
}

/* =========================================================
   EVENT RESOLUTION
========================================================= */

function resolveEvent(question) {
  const text = String(question)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  for (const event of eventNames) {
    const compact = event
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    if (text.includes(compact)) {
      return event;
    }
  }

  for (const [alias, event] of Object.entries(
    eventAliases
  )) {
    if (text.includes(alias)) {
      return event;
    }
  }

  return "";
}

/* =========================================================
   FALLBACK RULEBOOK ANSWER
========================================================= */

function formatFallbackRulebookAnswer(chunks) {
  const best = chunks
    .slice(0, 2)
    .map((item) => item.content)
    .join("\n\n");

  if (!best) {
    return unavailableMessage;
  }

  const shortened =
    best.length > 1800
      ? `${best.slice(0, 1800)}...`
      : best;

  return [
    shortened,
    "",
    sourceFooter,
  ].join("\n");
}

/* =========================================================
   SIMILARITY
========================================================= */

function similarity(a, b) {
  if (!a || !b) return 0;

  if (a === b) return 1;

  const maxLength = Math.max(
    a.length,
    b.length
  );

  return (
    (maxLength -
      levenshteinDistance(a, b)) /
    maxLength
  );
}

function levenshteinDistance(a, b) {
  const previous = Array.from(
    { length: b.length + 1 },
    (_, index) => index
  );

  for (let i = 1; i <= a.length; i++) {
    let left = i;
    let diagonal = i - 1;

    for (let j = 1; j <= b.length; j++) {
      const up = previous[j] + 1;

      const insert = left + 1;

      const replace =
        diagonal +
        (a[i - 1] === b[j - 1] ? 0 : 1);

      diagonal = previous[j];

      left = Math.min(
        up,
        insert,
        replace
      );

      previous[j] = left;
    }
  }

  return previous[b.length];
}
