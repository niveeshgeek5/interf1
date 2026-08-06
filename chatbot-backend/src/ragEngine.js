import fs from 'node:fs/promises';
import path from 'node:path';
import pdfParse from 'pdf-parse';

const unavailableMessage =
  'That information is not available in the provided symposium data.';

let openAIDisabledReason = '';

const stopWords = new Set([
  'a', 'an', 'and', 'are', 'about', 'as', 'at', 'be', 'by', 'for', 'from',
  'how', 'i', 'in', 'is', 'it', 'me', 'of', 'on', 'or', 'the', 'to', 'what',
  'when', 'where', 'which', 'who', 'with', 'tell', 'please',
]);

export async function loadKnowledgeBase() {
  const pdfPath = path.resolve(process.env.SYMPOSIUM_PDF_PATH || './data/symposium.pdf');
  const textPath = path.resolve(process.env.SYMPOSIUM_TEXT_PATH || './data/symposium-info.txt');

  let rawText = '';
  let source = '';

  try {
    rawText = await fs.readFile(textPath, 'utf8');
    source = textPath;
  } catch (textError) {
    try {
      const pdfBuffer = await fs.readFile(pdfPath);
      const parsedPdf = await pdfParse(pdfBuffer);
      rawText = parsedPdf.text;
      source = pdfPath;
    } catch (pdfError) {
      rawText = '';
      source = 'No symposium text or PDF data found.';
    }
  }

  const chunks = chunkText(normalizeText(rawText));
  return { chunks, source, rawText: normalizeText(rawText) };
}

export async function loadKnowledgeBaseFromPdfFirst() {
  const pdfPath = path.resolve(process.env.SYMPOSIUM_PDF_PATH || './data/symposium.pdf');
  const textPath = path.resolve(process.env.SYMPOSIUM_TEXT_PATH || './data/symposium-info.txt');

  let rawText = '';
  let source = '';

  try {
    const pdfBuffer = await fs.readFile(pdfPath);
    const parsedPdf = await pdfParse(pdfBuffer);
    rawText = parsedPdf.text;
    source = pdfPath;
  } catch (pdfError) {
    try {
      rawText = await fs.readFile(textPath, 'utf8');
      source = textPath;
    } catch (textError) {
      rawText = '';
      source = 'No symposium PDF or text data found.';
    }
  }

  const chunks = chunkText(normalizeText(rawText));
  return { chunks, source, rawText: normalizeText(rawText) };
}

export async function answerQuestion(question, knowledgeBase) {
  if (!knowledgeBase.chunks.length) {
    return {
      answer: 'No symposium data has been loaded yet. Please add the symposium PDF or text file and restart the chatbot backend.',
      sources: [],
    };
  }

  const queryTerms = tokenize(question);
  if (!queryTerms.length) {
    return { answer: unavailableMessage, sources: [] };
  }

  const directAnswer = answerDirectly(question, knowledgeBase.rawText || '');
  if (directAnswer) {
    if (directAnswer === unavailableMessage) {
      return { answer: directAnswer, sources: [] };
    }

    const aiAnswer = await answerWithOpenAI(question, directAnswer);
    return {
      answer: aiAnswer || directAnswer,
      sources: [{ id: 'rulebook', score: 100 }],
    };
  }

  if (queryTerms.length <= 2) {
    return { answer: unavailableMessage, sources: [] };
  }

  const rankedChunks = retrieveRelevantChunks(queryTerms, knowledgeBase);

  const hasStrongMatch = rankedChunks[0]?.score >= Math.max(1, Math.ceil(queryTerms.length * 0.25));
  if (!hasStrongMatch) {
    return { answer: unavailableMessage, sources: [] };
  }

  const context = rankedChunks.map((chunk) => chunk.content).join('\n\n');
  const aiAnswer = await answerWithOpenAI(question, context);

  return {
    answer: aiAnswer || formatAnswer(rankedChunks),
    sources: rankedChunks.map((chunk) => ({ id: chunk.id, score: chunk.score })),
  };
}

function normalizeText(text) {
  return text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function chunkText(text) {
  if (!text) return [];

  let sections = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (sections.length < 6) {
    sections = text
      .split(/\n(?=(?:[IVX]+\.\s|[0-9]+\.\s|[A-Z][A-Za-z ]{3,}:|Event|Round|Rules|Fee|Contact|Venue|Coordinator))/)
      .map((section) => section.trim())
      .filter(Boolean);
  }

  if (sections.length < 6) {
    const words = text.split(/\s+/).filter(Boolean);
    sections = [];
    for (let i = 0; i < words.length; i += 120) {
      sections.push(words.slice(i, i + 150).join(' '));
    }
  }

  const chunks = [];
  let current = '';

  for (const section of sections) {
    if ((current + '\n' + section).length > 900 && current) {
      chunks.push(current.trim());
      current = section;
    } else {
      current = current ? `${current}\n${section}` : section;
    }
  }

  if (current) chunks.push(current.trim());

  return chunks.map((content, index) => ({
    id: index + 1,
    content,
    terms: tokenize(content),
  }));
}

function answerDirectly(question, rawText) {
  const lowerQuestion = question.toLowerCase();
  const compactQuestion = lowerQuestion.replace(/[^a-z0-9]/g, '');
  const structuredText = rawText.trim();
  const text = structuredText.replace(/\s+/g, ' ').trim();

  if (!text) return '';

  const asksForEvents =
    /\bevents?\b/.test(lowerQuestion) ||
    compactQuestion.includes('event') ||
    compactQuestion.includes('ebent') ||
    compactQuestion.includes('evebt') ||
    compactQuestion.includes('evnts') ||
    compactQuestion.includes('evets') ||
    compactQuestion.includes('evnt');

  const asksHowMany =
    /how\s*many|count|total|number/.test(lowerQuestion) ||
    compactQuestion.includes('howmany');

  const asksForNonTechnical =
    /non\s*[- ]?\s*tech/.test(lowerQuestion) ||
    /non\s*[- ]?\s*technical/.test(lowerQuestion) ||
    compactQuestion.includes('nontech') ||
    compactQuestion.includes('nontechnical') ||
    compactQuestion.includes('nontechebent') ||
    compactQuestion.includes('nontechevent');

  const asksForTechnical =
    !asksForNonTechnical &&
    (/technical|tech/.test(lowerQuestion) || compactQuestion.includes('technical'));

  if (asksForNonTechnical && (asksForEvents || compactQuestion.includes('nontech'))) {
    const events = [
      'Fun Feast',
      'Brain Battle',
      'Nexus',
      'Checkmate Challenge',
    ].filter((eventName) => new RegExp(eventName, 'i').test(text));

    if (events.length) return `The non-technical events listed in the official rulebook are:\n${events.map((event) => `- ${event}`).join('\n')}`;
  }

  if (asksForTechnical && (asksForEvents || compactQuestion === 'tech')) {
    const events = [
      'WebNova',
      'TechTalks',
      'Prompt Maestro',
      'CodeFusion',
    ].filter((eventName) => new RegExp(eventName, 'i').test(text));

    if (events.length) return `The technical events listed in the official rulebook are:\n${events.map((event) => `- ${event}`).join('\n')}`;
  }

  if (
    asksForEvents ||
    asksHowMany ||
    /(all|list|available).*(event|events)|events.*(available|conducted|there)/.test(lowerQuestion)
  ) {
    const events = [
      'WebNova',
      'TechTalks',
      'Prompt Maestro',
      'CodeFusion',
      'Fun Feast',
      'Brain Battle',
      'Nexus',
      'Checkmate Challenge',
    ].filter((eventName) => new RegExp(eventName, 'i').test(text));

    if (events.length) {
      const prefix = asksHowMany
        ? `There are ${events.length} events listed in the official rulebook:`
        : 'The events listed in the official rulebook are:';
      return `${prefix}\n${events.map((event) => `- ${event}`).join('\n')}`;
    }
  }

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

  if (/code of conduct|conduct|malpractice|discipline|disqualif/.test(lowerQuestion)) {
    const conductMatch = text.match(/IV\.\s*Code of Conduct[\s\S]*$/i);
    if (conductMatch?.[0]) return cleanOfficialAnswer(conductMatch[0], 1400);
  }

  const requestedEvent = eventNames.find((eventName) =>
    lowerQuestion.includes(eventName.toLowerCase()) ||
    compactQuestion.includes(eventName.toLowerCase().replace(/[^a-z0-9]/g, ''))
  );

  if (requestedEvent) {
    const section = extractEventSection(structuredText, requestedEvent);
    if (section) return section;
  }

  if (/paper|presentation|ppt/.test(lowerQuestion)) {
    const section = extractEventSection(structuredText, 'TechTalks');
    if (section) return section;
  }

  if (/prompt/.test(lowerQuestion)) {
    const section = extractEventSection(structuredText, 'Prompt Maestro');
    if (section) return section;
  }

  if (/coding|code|debug/.test(lowerQuestion)) {
    const section = extractEventSection(structuredText, 'CodeFusion');
    if (section) return section;
  }

  if (/chess|checkmate/.test(lowerQuestion)) {
    const section = extractEventSection(structuredText, 'Checkmate Challenge');
    if (section) return section;
  }

  if (/meme/.test(lowerQuestion)) {
    const section = extractEventSection(structuredText, 'Nexus');
    if (section) return section;
  }

  if (/fun|game/.test(lowerQuestion)) {
    const section = extractEventSection(structuredText, 'Fun Feast');
    if (section) return section;
  }

  if (/brain|battle|quiz/.test(lowerQuestion)) {
    const section = extractEventSection(structuredText, 'Brain Battle');
    if (section) return section;
  }

  if (/connection/.test(lowerQuestion)) {
    const section = extractEventSection(structuredText, 'Nexus');
    if (section) return section;
  }

  if (asksForTechnical || /technical.*event|event.*technical/.test(lowerQuestion)) {
    const events = [
      'WebNova',
      'TechTalks',
      'Prompt Maestro',
      'CodeFusion',
    ].filter((eventName) => new RegExp(eventName, 'i').test(text));

    if (events.length) return `The technical events listed in the official rulebook are:\n${events.map((event) => `- ${event}`).join('\n')}`;
  }

  if (asksForNonTechnical || /non.?technical.*event|event.*non.?technical/.test(lowerQuestion)) {
    const events = [
      'Fun Feast',
      'Brain Battle',
      'Nexus',
      'Checkmate Challenge',
    ].filter((eventName) => new RegExp(eventName, 'i').test(text));

    if (events.length) return `The non-technical events listed in the official rulebook are:\n${events.map((event) => `- ${event}`).join('\n')}`;
  }

  if (/date|time|timing|schedule/.test(lowerQuestion)) {
    const dateMatches = [
      ...text.matchAll(/(?:\d{1,2}(?:st|nd|rd|th)?\s+[A-Z][a-z]+\s+\d{4}|[A-Z][a-z]+\s+\d{1,2},\s+\d{4}|\d{1,2}:\d{2}\s*(?:AM|PM)|\d{1,2}\s*(?:AM|PM))/g),
    ].map((match) => match[0]);

    if (dateMatches.length) return `The date/time details found in the official rulebook are:\n${[...new Set(dateMatches)].map((item) => `- ${item}`).join('\n')}`;
  }

  if (/fee|fees|amount|cost|payment/.test(lowerQuestion)) {
    const amountMatches = [...text.matchAll(/(?:₹\s?\d+|Rs\.?\s?\d+|INR\s?\d+|\d+\s?rupees)/gi)].map((match) => match[0]);
    if (amountMatches.length) return `The fee information found in the official rulebook includes:\n${[...new Set(amountMatches)].map((item) => `- ${item}`).join('\n')}`;
    return unavailableMessage;
  }

  if (/venue|place|location|where/.test(lowerQuestion)) {
    const venueMatch = text.match(/Anjalai Ammal Mahalingam Engineering College\s+Kovilvenni,\s*near Needamangalam,\s*Thiruvarur/i);
    if (venueMatch) return venueMatch[0].replace(/\s+/g, ' ').trim();
    const fallbackVenue = text.match(/(?:Anjalai Ammal Mahalingam Engineering College[^.]{0,180}|Kovilvenni[^.]{0,180}|Thiruvarur[^.]{0,180})/i);
    if (fallbackVenue) return fallbackVenue[0].trim();
  }

  if (/coordinator|contact|phone|mobile|number/.test(lowerQuestion)) {
    const phoneMatches = [...text.matchAll(/(?:\+91\s*)?[6-9]\d{9}/g)].map((match) => match[0]);
    if (phoneMatches.length) return `The contact numbers found in the official rulebook are:\n${[...new Set(phoneMatches)].map((item) => `- ${item}`).join('\n')}`;
  }

  return '';
}

function retrieveRelevantChunks(queryTerms, knowledgeBase) {
  return knowledgeBase.chunks
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(queryTerms, chunk),
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

async function answerWithOpenAI(question, context) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (openAIDisabledReason) {
    return '';
  }

  if (!apiKey || apiKey === 'replace_with_your_new_key') {
    return '';
  }

  const prompt = [
    {
      role: 'system',
      content:
        'You are the Technovanza symposium assistant. Answer only using the provided official rulebook context. Do not invent names, fees, phone numbers, dates, rules, venues, or registration details. If the context does not contain the answer, say: "That information is not available in the provided symposium data." Keep answers clear and helpful for college symposium visitors.',
    },
    {
      role: 'user',
      content: `Official rulebook context:\n${context}\n\nQuestion: ${question}`,
    },
  ];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: prompt,
        temperature: 0.1,
        max_tokens: 450,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429 || /insufficient_quota|credit_balance_exhausted/i.test(errorText)) {
        openAIDisabledReason = 'OpenAI quota exhausted';
        console.error('OpenAI API disabled for this server run: quota exhausted.');
        return '';
      }

      console.error(`OpenAI API error ${response.status}: ${errorText.slice(0, 300)}`);
      return '';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('OpenAI request failed:', error.name === 'AbortError' ? 'Request timed out' : error.message);
    return '';
  }
}

function extractEventSection(text, eventName) {
  const pattern = new RegExp(
    `(?:^|\\n)\\s*(?:\\d+\\.\\s*)?${eventName}\\s*[\\s\\S]*?(?=\\n\\s*(?:\\d+\\.\\s*)?(?:WebNova|TechTalks|Prompt Maestro|CodeFusion|Fun Feast|Brain Battle|Nexus|Checkmate Challenge)\\s*(?:\\n|$)|\\n\\s*IV\\.\\s|$)`,
    'i'
  );
  const match = text.match(pattern);
  if (!match?.[0]) return '';

  return match[0]
    ? cleanOfficialAnswer(match[0], 2600)
    : '';
}

function cleanOfficialAnswer(value, maxLength = 2200) {
  const cleaned = value
    .replace(/\r/g, '\n')
    .replace(/\s*•\s*/g, '\n- ')
    .replace(/^\s*(Rules|Evaluation Criteria|Competition Details|General Rules|Eligibility|Presentation Submission & Selection|PowerPoint Guidelines|Prototype Requirement|Overview|Technologies Allowed|Event Flow|Participant Distribution|Slot \d|Section [AB]|Topics)\s*$/gim, '\n$1\n')
    .replace(/Round\s+(\d)\s*\n\s*:\s*/gi, 'Round $1: ')
    .replace(/-\s*\n\s*Time Limit\s*\n\s*:/gi, '- Time Limit:')
    .replace(/\bMode:\s*\n\s*/gi, 'Mode: ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return trimAtBoundary(cleaned, maxLength);
}

function trimAtBoundary(value, maxLength) {
  if (value.length <= maxLength) return value;

  const truncated = value.slice(0, maxLength);
  const lastBoundary = Math.max(
    truncated.lastIndexOf('\n- '),
    truncated.lastIndexOf('\n\n'),
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('\n')
  );

  if (lastBoundary > maxLength * 0.72) {
    return `${truncated.slice(0, lastBoundary).trim()}\n\nMore details are available in the official rulebook.`;
  }

  return `${truncated.trim()}...\n\nMore details are available in the official rulebook.`;
}

function tokenize(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9+@.]+/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length > 1 && !stopWords.has(term));
}

function scoreChunk(queryTerms, chunk) {
  const chunkTermSet = new Set(chunk.terms);
  let score = 0;

  for (const term of queryTerms) {
    if (chunkTermSet.has(term)) score += term.length >= 6 ? 2 : 1;
  }

  return score;
}

function formatAnswer(chunks) {
  const answerText = chunks
    .map((chunk) => chunk.content)
    .join('\n\n')
    .trim();

  return answerText ? trimAtBoundary(answerText, 1800) : unavailableMessage;
}
