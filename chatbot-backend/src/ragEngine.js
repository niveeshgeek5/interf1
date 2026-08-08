import fs from 'node:fs/promises';
import path from 'node:path';

const unavailableMessage =
  "I couldn't find that information in the official TECHNOVANZA '26 Rulebook.";

let openAIDisabledReason = '';

const stopWords = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'how',
  'i',
  'in',
  'is',
  'it',
  'me',
  'of',
  'on',
  'or',
  'the',
  'to',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'with',
  'do',
  'does',
  'can',
  'could',
  'would',
  'should',
  'please',
  'tell',
  'about',
]);

const eventAliases = {
  webnova: 'WebNova',
  web: 'WebNova',
  frontend: 'WebNova',
  website: 'WebNova',

  techtalks: 'TechTalks',
  techtalk: 'TechTalks',
  techtak: 'TechTalks',
  techtaks: 'TechTalks',
  paper: 'TechTalks',
  presentation: 'TechTalks',
  ppt: 'TechTalks',

  promptmaestro: 'Prompt Maestro',
  prompt: 'Prompt Maestro',
  ai: 'Prompt Maestro',

  codefusion: 'CodeFusion',
  coding: 'CodeFusion',
  debugging: 'CodeFusion',

  funfeast: 'Fun Feast',
  fun: 'Fun Feast',
  games: 'Fun Feast',
  game: 'Fun Feast',

  brainbattle: 'Brain Battle',
  brain: 'Brain Battle',
  quiz: 'Brain Battle',

  nexus: 'Nexus',
  image: 'Nexus',
  connection: 'Nexus',

  checkmate: 'Checkmate Challenge',
  chess: 'Checkmate Challenge',
};

const eventNames = [
  'WebNova',
  'TechTalks',
  'Prompt Maestro',
  'CodeFusion',
  'Fun Feast',
  'Brain Battle',
  'Nexus',
  'Checkmate Challenge',
];

/* =========================================================
   LOAD KNOWLEDGE BASE
========================================================= */

export async function loadKnowledgeBase() {
  const pdfPath = path.resolve(
    process.env.SYMPOSIUM_PDF_PATH || './data/symposium.pdf'
  );

  const textPath = path.resolve(
    process.env.SYMPOSIUM_TEXT_PATH || './data/symposium-info.txt'
  );

  let rawText = '';
  let source = '';

  /*
   * We use the existing symposium-info.txt first.
   * This keeps the current project working without requiring
   * pdf-parse if the PDF is not available.
   */

  try {
    rawText = await fs.readFile(textPath, 'utf8');
    source = textPath;
  } catch (textError) {
    try {
      const pdfModule = await import('pdf-parse');
      const pdfParse = pdfModule.default || pdfModule;

      const pdfBuffer = await fs.readFile(pdfPath);
      const parsed = await pdfParse(pdfBuffer);

      rawText = parsed.text || '';
      source = pdfPath;
    } catch (pdfError) {
      console.error('Could not load symposium knowledge base.');
      console.error(pdfError.message);

      rawText = '';
      source = 'No symposium knowledge base found.';
    }
  }

  rawText = normalizeText(rawText);

  const chunks = chunkText(rawText);

  console.log(`Knowledge base loaded: ${chunks.length} chunks`);

  return {
    chunks,
    source,
    rawText,
    vocabulary: buildVocabulary(chunks),
  };
}

/* =========================================================
   MAIN QUESTION HANDLER
========================================================= */

export async function answerQuestion(question, knowledgeBase) {
  const userQuestion = String(question || '').trim();

  if (!userQuestion) {
    return {
      answer: 'Please ask me something.',
      sources: [],
    };
  }

  /*
   * IMPORTANT:
   *
   * We do NOT hardcode answers for:
   * events
   * registration
   * bye
   * capacity
   * venue
   * etc.
   *
   * Everything goes through:
   *
   * USER
   *   ↓
   * RAG SEARCH
   *   ↓
   * GPT
   */

  if (!knowledgeBase || !knowledgeBase.chunks?.length) {
    console.log('⚠️ No RAG context available.');

    const fallbackAnswer = await answerWithOpenAI(
      userQuestion,
      '',
      false
    );

    return {
      answer:
        fallbackAnswer ||
        "I'm unable to access the TECHNOVANZA knowledge base right now.",
      sources: [],
    };
  }

  /* ---------------------------------------------------------
     STEP 1: Search RAG
  --------------------------------------------------------- */

  const queryTerms = expandQueryTerms(
    userQuestion,
    knowledgeBase
  );

  const rankedChunks = retrieveRelevantChunks(
    queryTerms,
    knowledgeBase
  );

  const relevantChunks = rankedChunks.filter(
    (chunk) => chunk.score >= 1.2
  );

  console.log('\n--------------------------------');
  console.log('USER QUESTION:', userQuestion);
  console.log('QUERY TERMS:', queryTerms);
  console.log(
    'RAG RESULTS:',
    rankedChunks.map((item) => ({
      id: item.id,
      score: item.score,
    }))
  );
  console.log(
    'RAG MATCH:',
    relevantChunks.length > 0
  );
  console.log('--------------------------------');

  /* ---------------------------------------------------------
     STEP 2: RAG FOUND
     
     Send question + retrieved rulebook context to GPT.
  --------------------------------------------------------- */

  if (relevantChunks.length > 0) {
    const context = relevantChunks
      .map(
        (chunk) =>
          `RULEBOOK SECTION ${chunk.id}:\n${chunk.content}`
      )
      .join('\n\n');

    const aiAnswer = await answerWithOpenAI(
      userQuestion,
      context,
      true
    );

    if (aiAnswer) {
      return {
        answer: aiAnswer,
        sources: relevantChunks.map((chunk) => ({
          id: chunk.id,
          score: chunk.score,
        })),
      };
    }

    /*
     * If GPT fails, return retrieved rulebook content
     * instead of a generic "could not generate" message.
     */

    return {
      answer: formatRagFallback(relevantChunks),
      sources: relevantChunks.map((chunk) => ({
        id: chunk.id,
        score: chunk.score,
      })),
    };
  }

  /* ---------------------------------------------------------
     STEP 3: RAG DID NOT FIND INFORMATION
     
     Now send the question directly to GPT.
  --------------------------------------------------------- */

  console.log(
    'No strong RAG match. Sending question to GPT fallback.'
  );

  const fallbackAnswer = await answerWithOpenAI(
    userQuestion,
    '',
    false
  );

  if (fallbackAnswer) {
    return {
      answer: fallbackAnswer,
      sources: [],
    };
  }

  return {
    answer: unavailableMessage,
    sources: [],
  };
}

/* =========================================================
   OPENAI
========================================================= */

async function answerWithOpenAI(
  question,
  context = '',
  hasRulebookContext = false
) {
  const apiKey = process.env.OPENAI_API_KEY;

  const model =
    process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (openAIDisabledReason) {
    console.error(
      'OpenAI disabled:',
      openAIDisabledReason
    );

    return '';
  }

  if (!apiKey) {
    console.error(
      '❌ OPENAI_API_KEY is missing from backend environment.'
    );

    return '';
  }

  const systemPrompt = hasRulebookContext
    ? `
You are the TECHNOVANZA '26 Symposium Assistant.

You are answering a user question using the official
TECHNOVANZA '26 Rulebook information retrieved by RAG.

IMPORTANT RULES:

1. Use the retrieved rulebook context as the source of truth
   for TECHNOVANZA-specific information.

2. Answer naturally like a real AI assistant.

3. Do NOT copy the rulebook blindly.
   Understand the retrieved information and explain it naturally.

4. You may summarize, combine, and reorganize information
   from the retrieved context.

5. NEVER invent TECHNOVANZA-specific:
   - event rules
   - dates
   - times
   - fees
   - phone numbers
   - coordinator names
   - capacities
   - eligibility requirements
   - venue information

6. If the retrieved context does not actually answer
   the TECHNOVANZA-specific question, say that the
   information is not available in the official rulebook.

7. For greetings, thanks, goodbye, and casual conversation,
   respond naturally.

8. Keep the response concise and friendly.

9. Never mention RAG, embeddings, vector search,
   retrieved chunks, prompts, API keys, or internal systems
   to the user.

OFFICIAL RULEBOOK CONTEXT:

${context}
`
    : `
You are the TECHNOVANZA '26 Symposium Assistant.

The user asked a question, but the RAG search did not find
relevant information in the TECHNOVANZA official rulebook.

You should still behave like a normal helpful GPT assistant.

IMPORTANT:

1. For general knowledge questions, answer normally.

2. For greetings, thanks, goodbye, casual conversation,
   answer naturally.

3. If the user asks about TECHNOVANZA-specific information
   that is not available in the provided rulebook context,
   DO NOT invent an answer.

4. For unavailable TECHNOVANZA-specific information,
   politely say that the official rulebook does not provide
   that information.

5. Never invent names, dates, phone numbers, fees, rules,
   event details, timings, capacities, or venue details.

6. Do not mention RAG, embeddings, vector search,
   API keys, prompts, or internal systems.

7. Be conversational and concise.
`;

  try {
    console.log('🤖 Calling OpenAI...');
    console.log('Model:', model);
    console.log(
      'Using RAG context:',
      hasRulebookContext
    );

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000);

    /*
     * IMPORTANT:
     * This MUST be the real OpenAI URL.
     */

    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          model,

          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: question,
            },
          ],

          temperature: 0.3,

          max_tokens: 500,
        }),

        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        `❌ OpenAI API Error ${response.status}:`
      );

      console.error(
        responseText.slice(0, 1000)
      );

      /*
       * Do NOT permanently disable OpenAI for 429.
       * A temporary rate limit should not break the
       * chatbot forever.
       */

      if (response.status === 401) {
        openAIDisabledReason =
          'Invalid OpenAI API key';

        console.error(
          '❌ Your OpenAI API key is invalid.'
        );
      }

      if (response.status === 403) {
        console.error(
          '❌ OpenAI API access was rejected.'
        );
      }

      if (response.status === 429) {
        console.error(
          '❌ OpenAI rate limit / quota problem.'
        );
      }

      return '';
    }

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error(
        '❌ OpenAI returned invalid JSON.'
      );

      return '';
    }

    const answer =
      data?.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      console.error(
        '❌ OpenAI returned an empty response.'
      );

      return '';
    }

    console.log('✅ GPT response received.');

    return answer;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(
        '❌ OpenAI request timed out.'
      );
    } else {
      console.error(
        '❌ OpenAI request failed:',
        error.message
      );
    }

    return '';
  }
}

/* =========================================================
   RAG SEARCH
========================================================= */

function retrieveRelevantChunks(
  queryTerms,
  knowledgeBase
) {
  return knowledgeBase.chunks
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(
        queryTerms,
        chunk
      ),
    }))
    .filter(
      (chunk) => chunk.score > 0
    )
    .sort(
      (a, b) => b.score - a.score
    )
    .slice(0, 5);
}

function scoreChunk(
  queryTerms,
  chunk
) {
  const chunkTerms = new Set(
    chunk.terms
  );

  let score = 0;

  for (const term of queryTerms) {
    if (chunkTerms.has(term)) {
      /*
       * Important terms receive more weight.
       */

      if (term.length >= 7) {
        score += 2.5;
      } else if (term.length >= 5) {
        score += 1.5;
      } else {
        score += 0.75;
      }
    } else if (
      term.length >= 4 &&
      hasFuzzyTerm(
        term,
        chunkTerms
      )
    ) {
      score += 0.5;
    }
  }

  return score;
}

/* =========================================================
   QUERY PROCESSING
========================================================= */

function expandQueryTerms(
  question,
  knowledgeBase
) {
  const terms = tokenize(question);

  const expanded = new Set(
    terms
  );

  const compactQuestion =
    String(question)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  /*
   * Event detection.
   */

  for (const [
    alias,
    eventName,
  ] of Object.entries(eventAliases)) {
    if (
      compactQuestion.includes(alias)
    ) {
      tokenize(eventName).forEach(
        (term) =>
          expanded.add(term)
      );
    }
  }

  /*
   * Event names directly mentioned.
   */

  for (const eventName of eventNames) {
    const compactName =
      eventName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    if (
      compactQuestion.includes(
        compactName
      )
    ) {
      tokenize(eventName).forEach(
        (term) =>
          expanded.add(term)
      );
    }
  }

  /*
   * Correct simple spelling mistakes
   * using the rulebook vocabulary.
   */

  const vocabulary =
    knowledgeBase.vocabulary || [];

  for (const term of terms) {
    const corrected =
      correctTermFromVocabulary(
        term,
        vocabulary
      );

    if (
      corrected &&
      corrected !== term
    ) {
      expanded.add(corrected);
    }
  }

  return [...expanded];
}

/* =========================================================
   TEXT CHUNKING
========================================================= */

function chunkText(text) {
  if (!text) return [];

  /*
   * First split by paragraphs.
   */

  let sections = text
    .split(/\n\s*\n/)
    .map(
      (section) =>
        section.trim()
    )
    .filter(Boolean);

  /*
   * If PDF/text extraction produced
   * very large paragraphs, split them.
   */

  const chunks = [];

  let current = '';

  for (const section of sections) {
    const candidate =
      current
        ? `${current}\n${section}`
        : section;

    if (
      candidate.length > 1200 &&
      current
    ) {
      chunks.push(
        current.trim()
      );

      current = section;
    } else {
      current = candidate;
    }
  }

  if (current) {
    chunks.push(
      current.trim()
    );
  }

  /*
   * If there are no paragraph boundaries,
   * split by words.
   */

  if (chunks.length === 0) {
    const words =
      text
        .split(/\s+/)
        .filter(Boolean);

    for (
      let i = 0;
      i < words.length;
      i += 180
    ) {
      chunks.push(
        words
          .slice(
            i,
            i + 220
          )
          .join(' ')
      );
    }
  }

  return chunks.map(
    (content, index) => ({
      id: index + 1,

      content,

      terms: tokenize(
        content
      ),
    })
  );
}

/* =========================================================
   VOCABULARY
========================================================= */

function buildVocabulary(
  chunks
) {
  const vocabulary =
    new Map();

  for (const chunk of chunks) {
    for (const term of chunk.terms) {
      if (term.length < 3)
        continue;

      vocabulary.set(
        term,
        (vocabulary.get(term) || 0) +
          1
      );
    }
  }

  return [...vocabulary.entries()]
    .sort(
      (a, b) =>
        b[1] - a[1]
    )
    .map(
      ([term]) => term
    );
}

/* =========================================================
   TOKENIZER
========================================================= */

function tokenize(value) {
  return String(value)
    .toLowerCase()
    .replace(
      /[^a-z0-9@+.]+/g,
      ' '
    )
    .split(/\s+/)
    .filter(
      (term) =>
        term.length > 1 &&
        !stopWords.has(term)
    );
}

/* =========================================================
   SPELLING CORRECTION
========================================================= */

function correctTermFromVocabulary(
  term,
  vocabulary
) {
  if (
    term.length < 4 ||
    !vocabulary.length
  ) {
    return '';
  }

  if (
    vocabulary.includes(term)
  ) {
    return term;
  }

  let best = {
    term: '',
    score: 0,
  };

  const candidates =
    vocabulary.filter(
      (candidate) =>
        Math.abs(
          candidate.length -
            term.length
        ) <= 2
    );

  for (
    const candidate of candidates
  ) {
    const score =
      similarity(
        term,
        candidate
      );

    if (
      score > best.score
    ) {
      best = {
        term: candidate,
        score,
      };
    }
  }

  return best.score >= 0.78
    ? best.term
    : '';
}

/* =========================================================
   FUZZY MATCH
========================================================= */

function hasFuzzyTerm(
  term,
  chunkTerms
) {
  for (
    const chunkTerm of chunkTerms
  ) {
    if (
      Math.abs(
        chunkTerm.length -
          term.length
      ) > 2
    ) {
      continue;
    }

    if (
      chunkTerm.includes(term) ||
      term.includes(chunkTerm)
    ) {
      return true;
    }

    if (
      similarity(
        term,
        chunkTerm
      ) >= 0.82
    ) {
      return true;
    }
  }

  return false;
}

/* =========================================================
   SIMILARITY
========================================================= */

function similarity(a, b) {
  if (!a || !b)
    return 0;

  if (a === b)
    return 1;

  const maxLength =
    Math.max(
      a.length,
      b.length
    );

  return (
    (maxLength -
      levenshteinDistance(
        a,
        b
      )) /
    maxLength
  );
}

function levenshteinDistance(
  a,
  b
) {
  const previous =
    Array.from(
      {
        length:
          b.length + 1,
      },
      (_, index) =>
        index
    );

  for (
    let i = 1;
    i <= a.length;
    i++
  ) {
    let left = i;
    let diagonal = i - 1;

    for (
      let j = 1;
      j <= b.length;
      j++
    ) {
      const up =
        previous[j] + 1;

      const insert =
        left + 1;

      const replace =
        diagonal +
        (a[i - 1] ===
        b[j - 1]
          ? 0
          : 1);

      diagonal =
        previous[j];

      left = Math.min(
        up,
        insert,
        replace
      );

      previous[j] =
        left;
    }
  }

  return previous[
    b.length
  ];
}

/* =========================================================
   RAG FALLBACK
========================================================= */

function formatRagFallback(
  chunks
) {
  const content =
    chunks
      .slice(0, 2)
      .map(
        (chunk) =>
          chunk.content
      )
      .join('\n\n');

  if (!content) {
    return unavailableMessage;
  }

  return `According to the official TECHNOVANZA '26 Rulebook:\n\n${content}`;
}

/* =========================================================
   TEXT NORMALIZATION
========================================================= */

function normalizeText(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(
      /[ \t]+/g,
      ' '
    )
    .replace(
      /\n{3,}/g,
      '\n\n'
    )
    .trim();
}
