"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Mapeando seu setor...",
  "Identificando oportunidades ocultas...",
  "Calculando potencial de crescimento...",
  "Analisando alavancas com IA...",
  "Preparando seu diagnóstico personalizado...",
];

export default function LoadingScreen() {
  const [currentMsg, setCurrentMsg] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMsg((prev) => {
        if (prev < MESSAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="screen loading-screen fade-in">
      <div className="loading-container">
        <div className="loading-spinner" />
        <div className="loading-messages">
          {MESSAGES.map((msg, i) => (
            <p
              key={msg}
              className={`loading-msg ${
                i < currentMsg ? "msg-done" : i === currentMsg ? "msg-active" : "msg-pending"
              }`}
            >
              {i < currentMsg && <span className="check">&#10003;</span>}
              {i === currentMsg && <span className="dot-pulse" />}
              {msg}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
