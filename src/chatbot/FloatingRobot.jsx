import React, { useState } from 'react';
import ChatWindow from './ChatWindow.jsx';
import './chatbot.css';

export default function FloatingRobot() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="symbot-shell" aria-live="polite">
      <ChatWindow isOpen={isOpen} onClose={() => setIsOpen(false)} />

      <button
        className="symbot-robot-button"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? 'Minimize symposium assistant' : 'Open symposium assistant'}
      >
        <span className="symbot-help-bubble">Need help?</span>
        <svg
          className="symbot-robot-svg symbot-spider-svg"
          viewBox="0 0 180 240"
          role="img"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <radialGradient id="spiderMask" cx="36%" cy="24%" r="78%">
              <stop offset="0%" stopColor="#ff8a8a" />
              <stop offset="42%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#450a0a" />
            </radialGradient>
            <linearGradient id="spiderSuit" x1="20%" x2="82%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="46%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="spiderLimb" x1="0%" x2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="55%" stopColor="#111827" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <filter id="spiderGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <ellipse cx="90" cy="228" rx="54" ry="10" fill="rgba(0,0,0,0.45)" />

          <g className="symbot-svg-arm-left">
            <path d="M55 102 C36 92 25 76 22 57" fill="none" stroke="url(#spiderLimb)" strokeWidth="16" strokeLinecap="round" />
            <circle cx="22" cy="57" r="10" fill="#dc2626" stroke="#fecaca" strokeWidth="2" />
            <path d="M18 51 L13 39 M22 49 L22 35 M27 51 L35 41" stroke="#fecaca" strokeWidth="3.5" strokeLinecap="round" />
          </g>

          <g>
            <path d="M125 104 C145 116 153 136 155 157" fill="none" stroke="url(#spiderLimb)" strokeWidth="16" strokeLinecap="round" />
            <circle cx="155" cy="157" r="10" fill="#1d4ed8" stroke="#bfdbfe" strokeWidth="2" />
          </g>

          <path d="M55 91 Q90 74 125 91 L117 165 Q90 190 63 165 Z" fill="url(#spiderSuit)" stroke="#fecaca" strokeWidth="3" />
          <path d="M90 90 V172 M63 118 H117 M67 143 H113" stroke="#fecaca" strokeOpacity="0.34" strokeWidth="1.5" />
          <path d="M90 106 C78 115 72 130 70 157 M90 106 C102 115 108 130 110 157" fill="none" stroke="#fecaca" strokeOpacity="0.34" strokeWidth="1.5" />
          <path d="M90 149 C82 140 82 127 90 120 C98 127 98 140 90 149 Z" fill="#ef4444" stroke="#fecaca" strokeWidth="2" filter="url(#spiderGlow)" />

          <path d="M71 169 L58 209" stroke="url(#spiderLimb)" strokeWidth="16" strokeLinecap="round" />
          <path d="M109 169 L123 209" stroke="url(#spiderLimb)" strokeWidth="16" strokeLinecap="round" />
          <path d="M42 222 Q59 202 84 214 Q78 232 43 230 Z" fill="#020617" stroke="#93c5fd" strokeWidth="3" />
          <path d="M96 214 Q121 202 138 222 Q137 230 101 230 Z" fill="#020617" stroke="#93c5fd" strokeWidth="3" />

          <path d="M53 29 Q90 4 127 29 Q141 47 134 70 Q122 99 90 101 Q58 99 46 70 Q39 47 53 29 Z" fill="url(#spiderMask)" stroke="#fecaca" strokeWidth="3" />
          <path d="M58 45 L90 25 L122 45 M51 60 H129 M61 78 C78 68 102 68 119 78" stroke="#fecaca" strokeOpacity="0.35" strokeWidth="1.5" fill="none" />
          <path d="M63 56 Q76 46 87 59 Q76 76 61 68 Q59 62 63 56 Z" fill="#f8fafc" stroke="#020617" strokeWidth="3" />
          <path d="M117 56 Q104 46 93 59 Q104 76 119 68 Q121 62 117 56 Z" fill="#f8fafc" stroke="#020617" strokeWidth="3" />
          <path d="M90 31 V93 M70 37 C78 49 81 67 78 91 M110 37 C102 49 99 67 102 91" stroke="#fecaca" strokeOpacity="0.38" strokeWidth="1.4" fill="none" />
          <path d="M36 37 C22 22 17 11 16 2" stroke="#e0f2fe" strokeWidth="3" strokeLinecap="round" fill="none" />
          <circle cx="16" cy="2" r="4" fill="#e0f2fe" filter="url(#spiderGlow)" />
        </svg>
        <span className="symbot-shadow" />
      </button>
    </div>
  );
}
