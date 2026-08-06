import dotenv from 'dotenv';
import { loadKnowledgeBase } from '../src/ragEngine.js';

dotenv.config();

const knowledgeBase = await loadKnowledgeBase();

console.log(`Source: ${knowledgeBase.source}`);
console.log(`Chunks created: ${knowledgeBase.chunks.length}`);

if (!knowledgeBase.chunks.length) {
  console.log('Add a PDF at data/symposium.pdf or text at data/symposium-info.txt, then run npm run index again.');
}
