import React from 'react';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`symbot-message-row ${isUser ? 'symbot-message-user' : 'symbot-message-bot'}`}>
      <div className="symbot-message-bubble">{message.text}</div>
    </div>
  );
}
