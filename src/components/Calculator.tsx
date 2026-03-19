"use client";

import { useState, useCallback } from "react";
import type { FormData, DiagnosticoResult, Screen } from "@/lib/types";
import FormScreen from "./screens/FormScreen";
import LoadingScreen from "./screens/LoadingScreen";
import MilaoScreen from "./screens/MilaoScreen";
import MilhaoScreen from "./screens/MilhaoScreen";
import BilhaoScreen from "./screens/BilhaoScreen";
import ResumoScreen from "./screens/ResumoScreen";
import CTAScreen from "./screens/CTAScreen";

const CALENDLY_URL =
  process.env.NEXT_PUBLIC_CALENDLY_URL ||
  "https://calendly.com/ignition-visionarios";

export default function Calculator() {
  const [screen, setScreen] = useState<Screen>("form");
  const [result, setResult] = useState<DiagnosticoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = useCallback(async (data: FormData) => {
    setScreen("loading");
    setError(null);

    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Erro ao processar diagnóstico");
      }

      const diagnostico: DiagnosticoResult = await res.json();
      setResult(diagnostico);

      // Delay mínimo para a experiência de loading
      setTimeout(() => setScreen("milao"), 2000);
    } catch {
      setError("Ocorreu um erro ao gerar seu diagnóstico. Tente novamente.");
      setScreen("form");
    }
  }, []);

  const goTo = useCallback((s: Screen) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setScreen(s);
  }, []);

  if (error && screen === "form") {
    return (
      <div className="calculator">
        <div className="error-toast fade-in">
          <p>{error}</p>
          <button onClick={() => setError(null)} className="btn-retry">
            Tentar novamente
          </button>
        </div>
        <FormScreen onSubmit={handleFormSubmit} />
      </div>
    );
  }

  return (
    <div className="calculator">
      {screen === "form" && <FormScreen onSubmit={handleFormSubmit} />}
      {screen === "loading" && <LoadingScreen />}
      {screen === "milao" && result && (
        <MilaoScreen
          ideias={result.ideiasDoMilao}
          onNext={() => goTo("milhao")}
        />
      )}
      {screen === "milhao" && result && (
        <MilhaoScreen
          ideias={result.ideiasDoMilhao}
          onNext={() => goTo("bilhao")}
        />
      )}
      {screen === "bilhao" && result && (
        <BilhaoScreen
          ideia={result.ideiaDoBlihao}
          onNext={() => goTo("resumo")}
        />
      )}
      {screen === "resumo" && result && (
        <ResumoScreen result={result} onNext={() => goTo("cta")} />
      )}
      {screen === "cta" && <CTAScreen calendlyUrl={CALENDLY_URL} />}
    </div>
  );
}
