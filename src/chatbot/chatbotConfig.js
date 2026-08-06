const configuredChatbotUrl = import.meta.env.VITE_CHATBOT_API_URL || 'http://localhost:5050';

export const CHATBOT_API_URL = configuredChatbotUrl.startsWith('http')
  ? configuredChatbotUrl
  : `https://${configuredChatbotUrl}`;

export const INITIAL_BOT_MESSAGE =
  "Hi! I'm the Technovanza Symposium Assistant. Ask me about events, rules, registration, coordinators, timings, venue, or contact details.";
