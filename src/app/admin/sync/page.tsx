"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SyncResult {
  unmatched_id?: number;
  index?: number;
  lead_id: number | null;
  lead_name: string | null;
  status?: string;
  method?: string;
}

interface UnmatchedSub {
  id: number;
  phone_digits: string | null;
  name_candidates: string[];
  matched: boolean;
  matched_lead_id: number | null;
  created_at: string;
}

interface ParsedSubmission {
  answers: { title: string; value: string }[];
  createdAt?: string;
  submissionId?: string;
  [key: string]: unknown;
}

// ─── FIELD NAMES from Forms.app ───
const FORMSAPP_FIELDS = [
  "Nome Completo",
  "Principal E-mail",
  "Telefone",
  "Nome de sua empresa",
  "Quantos Funcionários",
  "Faturamento mensal",
  "Seu site",
  "Instagram",
  "Ramo de atuação",
  "Problemas ou desafios",
  "Urgência",
  "Marketing",
  "Fator X",
  "Inteligência Artificial",
  "Algo importante",
];

// ─── PARSERS ───

function parseCSV(text: string): ParsedSubmission[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Detect separator
  const sep = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";

  function splitRow(line: string): string[] {
    const cols: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === sep && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());
    return cols;
  }

  const headers = splitRow(lines[0]);
  const results: ParsedSubmission[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitRow(lines[i]);
    if (cols.length < 3) continue;
    const answers: { title: string; value: string }[] = [];
    let createdAt = "";
    let submissionId = "";
    for (let j = 0; j < headers.length; j++) {
      const h = headers[j].toLowerCase();
      const v = cols[j] || "";
      if (h.includes("data") && h.includes("envio")) {
        createdAt = v;
      } else if (h.includes("id") && h.includes("envio")) {
        submissionId = v;
      } else if (v) {
        answers.push({ title: headers[j], value: v });
      }
    }
    results.push({ answers, createdAt, submissionId });
  }
  return results;
}

// Known Forms.app field labels (used to detect label:value format)
const KNOWN_LABELS = [
  "nome completo", "principal e-mail", "telefone", "nome de sua empresa",
  "quantos funcionários", "quantos funcionarios", "qual é faturamento", "qual e faturamento",
  "faturamento mensal", "seu site", "instagram", "ramo de atuação", "ramo de atuacao",
  "problemas ou desafios", "nível de urgência", "nivel de urgencia",
  "como você faz o marketing", "como voce faz o marketing", "marketing",
  "fator x", "inteligência artificial", "inteligencia artificial",
  "algo importante", "data de envio", "id de envio",
];

function isKnownLabel(line: string): boolean {
  const lower = line.toLowerCase().replace(/:$/, "").trim();
  return KNOWN_LABELS.some((l) => lower.includes(l));
}

function parseFormsAppText(text: string): ParsedSubmission[] {
  // Clean up: remove page markers, header repetitions
  const cleaned = text
    .replace(/\d+\s*-\s*\d+\s+of\s+\d+/g, "")
    .replace(/^Aprovados:.*$/gm, "")
    .replace(/^Contagem de registros:.*$/gm, "")
    .replace(/^\( Os dados podem demorar.*$/gm, "");

  // Strategy: split by submission ID pattern (hex at end of each record)
  const dateIdPattern = /(\d{1,2}\/\d{1,2}\/\d{4},\s*\d{1,2}:\d{2}:\d{2}\s*[AP]M)\s*\n\s*([a-f0-9]{10,})/g;

  const records: { text: string; date: string; id: string }[] = [];
  let lastEnd = 0;
  let match;

  while ((match = dateIdPattern.exec(cleaned)) !== null) {
    const recordText = cleaned.slice(lastEnd, match.index).trim();
    if (recordText.length > 10) {
      records.push({ text: recordText, date: match[1], id: match[2] });
    }
    lastEnd = match.index + match[0].length;
  }

  // If no date+ID pattern found, try single record (just labels+values, no ID)
  if (records.length === 0) {
    // Check if text has known labels — treat entire text as one record
    const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.some((l) => isKnownLabel(l))) {
      records.push({ text: cleaned, date: "", id: "" });
    }
  }

  if (records.length === 0) return [];

  const results: ParsedSubmission[] = [];

  for (const rec of records) {
    const lines = rec.text.split("\n").map((l) => l.trim()).filter(Boolean);
    // Remove standalone page numbers
    const cleanLines = lines.filter((l) => !(/^\d{1,2}$/.test(l)));

    const answers: { title: string; value: string }[] = [];

    // Detect format: does it have labeled lines ("Label:" followed by value)?
    const hasLabels = cleanLines.some((l) => l.endsWith(":") && isKnownLabel(l));

    if (hasLabels) {
      // LABELED FORMAT: "Label:\nValue" (possibly multi-line values)
      let currentLabel = "";
      let currentValue: string[] = [];

      for (const line of cleanLines) {
        if (line.endsWith(":") && isKnownLabel(line)) {
          // Save previous pair
          if (currentLabel && currentValue.length > 0) {
            const val = currentValue.join("\n").trim();
            if (val) answers.push({ title: currentLabel.replace(/:$/, ""), value: val });
          }
          currentLabel = line;
          currentValue = [];
        } else {
          currentValue.push(line);
        }
      }
      // Save last pair
      if (currentLabel && currentValue.length > 0) {
        const val = currentValue.join("\n").trim();
        if (val) answers.push({ title: currentLabel.replace(/:$/, ""), value: val });
      }
    } else {
      // FLAT FORMAT: values in order, no labels (original first paste format)
      for (let i = 0; i < Math.min(cleanLines.length, FORMSAPP_FIELDS.length); i++) {
        if (cleanLines[i]) {
          answers.push({ title: FORMSAPP_FIELDS[i], value: cleanLines[i] });
        }
      }
    }

    if (answers.length > 0) {
      results.push({ answers, createdAt: rec.date, submissionId: rec.id });
    }
  }

  return results;
}

function parseJSON(text: string): ParsedSubmission[] {
  const parsed = JSON.parse(text);
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  return arr.map((item) => {
    if (item.answers && Array.isArray(item.answers)) return item;
    // Wrap raw object as a submission
    const answers: { title: string; value: string }[] = [];
    for (const [k, v] of Object.entries(item)) {
      if (v && typeof v === "string") answers.push({ title: k, value: v });
    }
    return { answers, createdAt: item.createdAt || item.created_at };
  });
}

function detectAndParse(text: string): { submissions: ParsedSubmission[]; format: string } {
  const trimmed = text.trim();

  // Try JSON first
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      return { submissions: parseJSON(trimmed), format: "JSON" };
    } catch { /* not JSON */ }
  }

  // Try Forms.app text format FIRST (has date+ID pattern OR known labels)
  const hasFormsPattern = /\d{1,2}\/\d{1,2}\/\d{4},\s*\d{1,2}:\d{2}:\d{2}\s*[AP]M/.test(trimmed);
  const hasLabels = trimmed.split("\n").some((l) => l.trim().endsWith(":") && isKnownLabel(l.trim()));
  if (hasFormsPattern || hasLabels) {
    const parsed = parseFormsAppText(trimmed);
    if (parsed.length > 0) return { submissions: parsed, format: "Texto Forms.app" };
  }

  // Then check for CSV (has header line with commas/tabs/semicolons + consistent columns)
  const firstLine = trimmed.split("\n")[0];
  const hasCsvHeader = firstLine.includes(",") || firstLine.includes("\t") || firstLine.includes(";");
  const looksLikeCsv = hasCsvHeader && (
    firstLine.toLowerCase().includes("nome") ||
    firstLine.toLowerCase().includes("email") ||
    firstLine.toLowerCase().includes("telefone")
  );

  if (looksLikeCsv) {
    const parsed = parseCSV(trimmed);
    if (parsed.length > 0) return { submissions: parsed, format: "CSV" };
  }

  // Last resort: try CSV anyway
  const csvAttempt = parseCSV(trimmed);
  if (csvAttempt.length > 0) return { submissions: csvAttempt, format: "CSV" };

  return { submissions: [], format: "desconhecido" };
}

// ─── COMPONENT ───

export default function SyncPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [textInput, setTextInput] = useState("");
  const [parsed, setParsed] = useState<ParsedSubmission[]>([]);
  const [detectedFormat, setDetectedFormat] = useState("");
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupSql, setSetupSql] = useState("");
  const [importResult, setImportResult] = useState<{ total: number; matched: number; already_matched: number; unmatched_stored: number; results: SyncResult[] } | null>(null);
  const [syncResult, setSyncResult] = useState<{ total_unmatched: number; synced: number; still_unmatched: number; results: SyncResult[] } | null>(null);
  const [unmatched, setUnmatched] = useState<UnmatchedSub[]>([]);
  const [leads, setLeads] = useState<{ id: number; nome: string; whatsapp: string; formsapp_completed: boolean }[]>([]);
  const [linking, setLinking] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("adm_auth") === "true") {
      setAuthed(true);
    }
  }, []);

  const handleLogin = () => {
    if (pw === "visor2026") {
      sessionStorage.setItem("adm_auth", "true");
      setAuthed(true);
    }
  };

  const runSetup = async () => {
    setSetupLoading(true);
    setSetupSql("");
    try {
      const res = await fetch("/api/admin/formsapp-setup", { method: "POST" });
      const data = await res.json();
      if (data.sql) {
        setSetupSql(data.sql);
      } else {
        setSetupDone(true);
      }
    } catch {
      setSetupSql("Erro ao criar tabela. Verifique o Supabase.");
    } finally {
      setSetupLoading(false);
    }
  };

  const fetchUnmatched = async () => {
    try {
      const res = await fetch("/api/admin/formsapp-unmatched");
      if (res.ok) {
        const data = await res.json();
        setUnmatched(data.unmatched || []);
        setLeads(data.leads || []);
      }
    } catch (e) {
      console.error("Fetch unmatched error:", e);
    }
  };

  useEffect(() => {
    if (authed) {
      runSetup();
      fetchUnmatched();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  // Parse input whenever text changes
  const handleTextChange = useCallback((text: string) => {
    setTextInput(text);
    setImportResult(null);
    if (text.trim().length < 20) {
      setParsed([]);
      setDetectedFormat("");
      return;
    }
    const { submissions, format } = detectAndParse(text);
    setParsed(submissions);
    setDetectedFormat(format);
  }, []);

  // Handle file upload
  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) handleTextChange(text);
    };
    reader.readAsText(file);
  }, [handleTextChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/formsapp-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissions: parsed }),
      });
      const data = await res.json();
      if (data.error) {
        alert("Erro: " + data.error);
      } else {
        setImportResult(data);
      }
      fetchUnmatched();
    } catch (e) {
      alert("Erro ao importar: " + String(e));
    } finally {
      setImporting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/formsapp-sync", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        alert("Erro: " + data.error);
      } else {
        setSyncResult(data);
      }
      fetchUnmatched();
    } catch (e) {
      console.error("Sync error:", e);
    } finally {
      setSyncing(false);
    }
  };

  const handleManualLink = async (unmatchedId: number, leadId: number) => {
    setLinking(unmatchedId);
    try {
      const res = await fetch("/api/admin/formsapp-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unmatched_id: unmatchedId, lead_id: leadId }),
      });
      if (res.ok) fetchUnmatched();
    } catch (e) {
      console.error("Link error:", e);
    } finally {
      setLinking(null);
    }
  };

  if (!authed) {
    return (
      <div className="adm-login">
        <div className="adm-login-box">
          <h1 className="adm-login-title">SYNC FORMS.APP</h1>
          <input className="adm-login-input" type="password" placeholder="Senha" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          <button className="adm-login-btn" onClick={handleLogin}>Entrar</button>
        </div>
      </div>
    );
  }

  const availableLeads = leads.filter((l) => !l.formsapp_completed);

  // Get name + phone from parsed submission for preview
  function getPreview(sub: ParsedSubmission): { name: string; phone: string } {
    const nameField = sub.answers?.find((a) =>
      a.title.toLowerCase().includes("nome") && !a.title.toLowerCase().includes("empresa")
    );
    const phoneField = sub.answers?.find((a) =>
      a.title.toLowerCase().includes("telefone") || a.title.toLowerCase().includes("whatsapp")
    );
    return {
      name: nameField?.value || sub.answers?.[0]?.value || "—",
      phone: phoneField?.value || "—",
    };
  }

  return (
    <div className="adm-ficha">
      <div className="adm-ficha-topbar">
        <a href="/admin" className="adm-ficha-back">&larr; Admin</a>
        <span className="adm-ficha-topbar-name">Sincronizar Forms.app</span>
      </div>
      <div className="adm-ficha-content">

        {/* Setup status */}
        {setupSql && (
          <section className="adm-ficha-section">
            <h2 className="adm-ficha-section-title">Setup Necessario</h2>
            <p style={{ color: "#F97316", fontSize: 14, marginBottom: 12 }}>
              A tabela <code>formsapp_unmatched</code> precisa ser criada. Execute este SQL no Supabase:
            </p>
            <pre style={{ background: "rgba(255,255,255,.04)", padding: 16, borderRadius: 4, fontSize: 12, overflow: "auto", color: "#E2DDD4" }}>{setupSql}</pre>
            <button className="adm-btn-insights" onClick={runSetup} disabled={setupLoading} style={{ marginTop: 12 }}>
              {setupLoading ? "Verificando..." : "Verificar novamente"}
            </button>
          </section>
        )}

        {(setupDone || !setupSql) && (
          <>
            {/* ─── IMPORT SECTION ─── */}
            <section className="adm-ficha-section">
              <h2 className="adm-ficha-section-title">1. Importar Respostas</h2>
              <p style={{ color: "rgba(226,221,212,.5)", fontSize: 13, marginBottom: 12 }}>
                Cole os dados do Forms.app ou arraste um arquivo. Aceita <strong>CSV</strong>, <strong>JSON</strong>, <strong>TXT</strong>, ou <strong>texto copiado</strong> direto da tela de respostas.
              </p>

              {/* Drop zone / file upload */}
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{
                  padding: 20,
                  border: `2px dashed ${dragOver ? "#C9A84C" : "rgba(255,255,255,.1)"}`,
                  borderRadius: 6,
                  textAlign: "center",
                  cursor: "pointer",
                  marginBottom: 12,
                  background: dragOver ? "rgba(201,168,76,.05)" : "transparent",
                  transition: "all .2s",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>📁</div>
                <div style={{ fontSize: 13, color: "rgba(226,221,212,.5)" }}>
                  Arraste um arquivo aqui ou <span style={{ color: "#C9A84C", textDecoration: "underline" }}>clique para selecionar</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(226,221,212,.25)", marginTop: 4 }}>.csv, .json, .txt, .xlsx</div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.json,.txt,.tsv,.xlsx,.xls"
                  style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>

              {/* Or paste */}
              <div style={{ fontSize: 12, color: "rgba(226,221,212,.3)", textAlign: "center", margin: "8px 0" }}>ou cole diretamente:</div>
              <textarea
                className="adm-notes"
                rows={6}
                placeholder="Cole aqui os dados do Forms.app (qualquer formato)..."
                value={textInput}
                onChange={(e) => handleTextChange(e.target.value)}
                style={{ fontFamily: "monospace", fontSize: 11 }}
              />

              {/* Detection result */}
              {detectedFormat && (
                <div style={{ marginTop: 12, padding: 12, background: "rgba(255,255,255,.03)", borderRadius: 4, border: "1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ color: "#22C55E", fontSize: 16 }}>&#10003;</span>
                    <span style={{ fontSize: 13 }}>
                      Formato detectado: <strong style={{ color: "#C9A84C" }}>{detectedFormat}</strong>
                      {" — "}
                      <strong style={{ color: "#22C55E" }}>{parsed.length}</strong> submissoes encontradas
                    </span>
                  </div>

                  {/* Preview table */}
                  {parsed.length > 0 && (
                    <div style={{ maxHeight: 200, overflow: "auto" }}>
                      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                            <th style={{ textAlign: "left", padding: "4px 8px", color: "rgba(226,221,212,.4)" }}>#</th>
                            <th style={{ textAlign: "left", padding: "4px 8px", color: "rgba(226,221,212,.4)" }}>Nome</th>
                            <th style={{ textAlign: "left", padding: "4px 8px", color: "rgba(226,221,212,.4)" }}>Telefone</th>
                            <th style={{ textAlign: "left", padding: "4px 8px", color: "rgba(226,221,212,.4)" }}>Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsed.map((sub, i) => {
                            const p = getPreview(sub);
                            return (
                              <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                                <td style={{ padding: "4px 8px", color: "rgba(226,221,212,.3)" }}>{i + 1}</td>
                                <td style={{ padding: "4px 8px" }}>{p.name}</td>
                                <td style={{ padding: "4px 8px", color: "rgba(226,221,212,.5)" }}>{p.phone}</td>
                                <td style={{ padding: "4px 8px", color: "rgba(226,221,212,.3)", fontSize: 11 }}>{sub.createdAt || "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {parsed.length === 0 && textInput.trim().length > 20 && (
                <div style={{ marginTop: 8, color: "#EF4444", fontSize: 13 }}>
                  Nao foi possivel detectar o formato. Tente exportar como CSV ou copiar diretamente da pagina de respostas.
                </div>
              )}

              <button
                className="adm-btn-insights"
                onClick={handleImport}
                disabled={importing || parsed.length === 0}
                style={{ marginTop: 12, opacity: parsed.length === 0 ? 0.4 : 1 }}
              >
                {importing ? "Importando..." : `📥 Importar ${parsed.length} submissoes e vincular`}
              </button>

              {importResult && (
                <div style={{ marginTop: 16, padding: 16, background: "rgba(255,255,255,.03)", borderRadius: 4, fontSize: 13 }}>
                  <p>Total: <strong>{importResult.total}</strong></p>
                  <p style={{ color: "#22C55E" }}>Vinculados: <strong>{importResult.matched}</strong></p>
                  <p style={{ color: "#EAB308" }}>Ja vinculados antes: <strong>{importResult.already_matched}</strong></p>
                  <p style={{ color: "#EF4444" }}>Nao encontrados (salvos): <strong>{importResult.unmatched_stored}</strong></p>
                  {(importResult.results || []).filter((r) => r.status === "matched").length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <strong>Matches:</strong>
                      {(importResult.results || []).filter((r) => r.status === "matched").map((r, i) => (
                        <div key={i} style={{ color: "#22C55E", marginLeft: 12 }}>#{r.index} &rarr; {r.lead_name} (ID {r.lead_id})</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ─── RE-SYNC SECTION ─── */}
            <section className="adm-ficha-section">
              <h2 className="adm-ficha-section-title">2. Re-sincronizar Pendentes</h2>
              <p style={{ color: "rgba(226,221,212,.5)", fontSize: 13, marginBottom: 12 }}>
                Tenta re-vincular submissoes pendentes com leads existentes (matching por telefone + nome).
              </p>
              <button className="adm-btn-insights" onClick={handleSync} disabled={syncing}>
                {syncing ? "Sincronizando..." : "🔄 Re-sincronizar Agora"}
              </button>

              {syncResult && (
                <div style={{ marginTop: 16, padding: 16, background: "rgba(255,255,255,.03)", borderRadius: 4, fontSize: 13 }}>
                  <p>Total pendentes: <strong>{syncResult.total_unmatched}</strong></p>
                  <p style={{ color: "#22C55E" }}>Sincronizados agora: <strong>{syncResult.synced}</strong></p>
                  <p style={{ color: "#EF4444" }}>Ainda sem match: <strong>{syncResult.still_unmatched}</strong></p>
                  {(syncResult.results || []).filter((r) => r.method !== "no_match").length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <strong>Matches:</strong>
                      {(syncResult.results || []).filter((r) => r.method !== "no_match").map((r, i) => (
                        <div key={i} style={{ color: "#22C55E", marginLeft: 12 }}>{r.lead_name} (ID {r.lead_id}) &mdash; via {r.method}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ─── UNMATCHED ─── */}
            <section className="adm-ficha-section">
              <h2 className="adm-ficha-section-title">3. Vincular Manualmente ({unmatched.filter((u) => !u.matched).length})</h2>
              {unmatched.filter((u) => !u.matched).length === 0 ? (
                <p style={{ color: "rgba(226,221,212,.3)", fontSize: 14 }}>Nenhuma submissao pendente. Tudo vinculado!</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {unmatched.filter((u) => !u.matched).map((sub) => (
                    <div key={sub.id} style={{ padding: 14, background: "rgba(255,255,255,.03)", borderRadius: 4, border: "1px solid rgba(255,255,255,.06)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#E2DDD4" }}>
                            {sub.name_candidates?.[0] || "Sem nome"}
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(226,221,212,.4)", marginTop: 4 }}>
                            Tel: {sub.phone_digits || "—"} &middot; {new Date(sub.created_at).toLocaleString("pt-BR")}
                          </div>
                          {sub.name_candidates?.length > 1 && (
                            <div style={{ fontSize: 11, color: "rgba(226,221,212,.25)", marginTop: 2 }}>
                              Nomes: {sub.name_candidates.join(", ")}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <select
                            id={`link-select-${sub.id}`}
                            style={{ padding: "6px 8px", background: "#0D1117", color: "#E2DDD4", border: "1px solid rgba(255,255,255,.1)", borderRadius: 4, fontSize: 12, maxWidth: 200 }}
                            defaultValue=""
                          >
                            <option value="" disabled>Vincular a...</option>
                            {availableLeads.map((l) => (
                              <option key={l.id} value={l.id}>{l.nome} ({l.whatsapp})</option>
                            ))}
                          </select>
                          <button
                            className="adm-btn-insights"
                            style={{ padding: "6px 12px", fontSize: 12 }}
                            disabled={linking === sub.id}
                            onClick={() => {
                              const sel = document.getElementById(`link-select-${sub.id}`) as HTMLSelectElement;
                              if (sel?.value) handleManualLink(sub.id, parseInt(sel.value, 10));
                            }}
                          >
                            {linking === sub.id ? "..." : "Vincular"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
