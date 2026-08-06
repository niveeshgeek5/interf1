import React, { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Send, X } from 'lucide-react';
import ChatMessage from './ChatMessage.jsx';
import ChatInput from './ChatInput.jsx';
import { CHATBOT_API_URL, INITIAL_BOT_MESSAGE } from './chatbotConfig.js';

const createMessageId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function ChatWindow({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    { id: createMessageId(), role: 'bot', text: INITIAL_BOT_MESSAGE },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isOpen]);

  const sendMessage = async (question) => {
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    setMessages((current) => [
      ...current,
      { id: createMessageId(), role: 'user', text: trimmed },
    ]);
    setIsLoading(true);

    try {
      const response = await fetch(`${CHATBOT_API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      });

      if (!response.ok) {
        throw new Error('The assistant server returned an error.');
      }

      const data = await response.json();
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: 'bot',
          text: data.answer || 'That information is not available in the provided symposium data.',
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: 'bot',
          text: 'I cannot reach the symposium assistant server right now. Please make sure the chatbot backend is running.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className={`symbot-window ${isOpen ? 'symbot-window-open' : ''}`} aria-hidden={!isOpen}>
      <header className="symbot-window-header">
        <div className="symbot-window-title">
          <span className="symbot-title-icon"><Bot size={18} /></span>
          <div>
            <h2>Symposium Assistant</h2>
            <p>Answers only from official symposium data</p>
          </div>
        </div>
        <button className="symbot-icon-button" type="button" onClick={onClose} aria-label="Close chatbot">
          <X size={18} />
        </button>
      </header>

      <div className="symbot-messages" ref={scrollRef}>
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="symbot-typing">
            <Loader2 size={16} />
            Checking symposium data...
          </div>
        )}
      </div>

      <ChatInput onSend={sendMessage} disabled={isLoading} icon={<Send size={17} />} />
    </section>
  );
}
