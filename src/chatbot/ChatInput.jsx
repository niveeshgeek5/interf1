import React, { useState } from 'react';

export default function ChatInput({ onSend, disabled, icon }) {
  const [value, setValue] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const nextValue = value.trim();
    if (!nextValue) return;
    onSend(nextValue);
    setValue('');
  };

  return (
    <form className="symbot-input-area" onSubmit={submit}>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ask about events, venue, rules..."
        disabled={disabled}
        aria-label="Ask the symposium assistant"
      />
      <button type="submit" disabled={disabled || !value.trim()} aria-label="Send message">
        {icon}
      </button>
    </form>
  );
}
