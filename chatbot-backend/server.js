import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { answerQuestion, loadKnowledgeBase } from './src/ragEngine.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5050);
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const normalizeOrigin = (origin) => {
  if (!origin) return origin;
  return origin.startsWith('http') ? origin : `https://${origin}`;
};
const allowedOrigins = new Set([
  normalizeOrigin(frontendOrigin),
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  },
}));
app.use(express.json({ limit: '1mb' }));

let knowledgeBase = await loadKnowledgeBase();

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    chunks: knowledgeBase.chunks.length,
    source: knowledgeBase.source,
    openAIConfigured: Boolean(process.env.OPENAI_API_KEY),
  });
});

app.get('/', (req, res) => {
  res.type('text').send('Symposium chatbot backend is running. Open the React website at http://localhost:5173 and test this API at /api/health.');
});

app.post('/api/reload', async (req, res) => {
  knowledgeBase = await loadKnowledgeBase();
  res.json({ ok: true, chunks: knowledgeBase.chunks.length, source: knowledgeBase.source });
});

app.post('/api/chat', async (req, res) => {
  const question = String(req.body?.question || '').trim();

  if (!question) {
    return res.status(400).json({ error: 'Question is required.' });
  }

  try {
    const answer = await answerQuestion(question, knowledgeBase);
    res.json(answer);
  } catch (error) {
    console.error('Chatbot request failed:', error);
    res.status(500).json({
      answer: 'I had trouble reading the symposium data. Please restart the chatbot backend and try again.',
      sources: [],
    });
  }
});

app.listen(port, () => {
  console.log(`Symposium chatbot backend running at http://localhost:${port}`);
  console.log(`Loaded ${knowledgeBase.chunks.length} knowledge chunks from ${knowledgeBase.source}`);
});
