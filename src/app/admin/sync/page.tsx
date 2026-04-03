"use client";

import { useState, useEffect } from "react";

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

export default function SyncPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [jsonInput, setJsonInput] = useState("");
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

  const handleImport = async () => {
    if (!jsonInput.trim()) return;
    setImporting(true);
    setImportResult(null);
    try {
      let parsed = JSON.parse(jsonInput);
      // Accept both array and single object
      if (!Array.isArray(parsed)) parsed = [parsed];
      const res = await fetch("/api/admin/formsapp-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissions: parsed }),
      });
      const data = await res.json();
      setImportResult(data);
      fetchUnmatched();
    } catch (e) {
      alert("JSON inválido: " + String(e));
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
      setSyncResult(data);
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

  return (
    <div className="adm-ficha">
      <div className="adm-ficha-topbar">
        <a href="/admin" className="adm-ficha-back">← Admin</a>
        <span className="adm-ficha-topbar-name">Sincronização Forms.app</span>
      </div>
      <div className="adm-ficha-content">

        {/* Setup status */}
        {setupSql && (
          <section className="adm-ficha-section">
            <h2 className="adm-ficha-section-title">Setup Necessário</h2>
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
            {/* Import section */}
            <section className="adm-ficha-section">
              <h2 className="adm-ficha-section-title">1. Importar Submissões do Forms.app</h2>
              <p style={{ color: "rgba(226,221,212,.5)", fontSize: 13, marginBottom: 12 }}>
                Exporte as respostas do Forms.app (JSON) e cole aqui. Aceita array de submissões ou uma única.
              </p>
              <textarea
                className="adm-notes"
                rows={8}
                placeholder='[{"answers": [...], ...}, ...]'
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                style={{ fontFamily: "monospace", fontSize: 12 }}
              />
              <button className="adm-btn-insights" onClick={handleImport} disabled={importing} style={{ marginTop: 8 }}>
                {importing ? "Importando..." : "📥 Importar e Tentar Vincular"}
              </button>

              {importResult && (
                <div style={{ marginTop: 16, padding: 16, background: "rgba(255,255,255,.03)", borderRadius: 4, fontSize: 13 }}>
                  <p>Total: <strong>{importResult.total}</strong></p>
                  <p style={{ color: "#22C55E" }}>Vinculados: <strong>{importResult.matched}</strong></p>
                  <p style={{ color: "#EAB308" }}>Já vinculados antes: <strong>{importResult.already_matched}</strong></p>
                  <p style={{ color: "#EF4444" }}>Não encontrados (salvos): <strong>{importResult.unmatched_stored}</strong></p>
                  {importResult.results.filter((r) => r.status === "matched").length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <strong>Matches:</strong>
                      {importResult.results.filter((r) => r.status === "matched").map((r, i) => (
                        <div key={i} style={{ color: "#22C55E", marginLeft: 12 }}>#{r.index} → {r.lead_name} (ID {r.lead_id})</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Re-sync section */}
            <section className="adm-ficha-section">
              <h2 className="adm-ficha-section-title">2. Re-sincronizar Pendentes</h2>
              <p style={{ color: "rgba(226,221,212,.5)", fontSize: 13, marginBottom: 12 }}>
                Tenta re-casar submissões não-vinculadas com leads existentes (matching melhorado: últimos 8 dígitos do telefone + normalização de nome).
              </p>
              <button className="adm-btn-insights" onClick={handleSync} disabled={syncing}>
                {syncing ? "Sincronizando..." : "🔄 Re-sincronizar Agora"}
              </button>

              {syncResult && (
                <div style={{ marginTop: 16, padding: 16, background: "rgba(255,255,255,.03)", borderRadius: 4, fontSize: 13 }}>
                  <p>Total pendentes: <strong>{syncResult.total_unmatched}</strong></p>
                  <p style={{ color: "#22C55E" }}>Sincronizados agora: <strong>{syncResult.synced}</strong></p>
                  <p style={{ color: "#EF4444" }}>Ainda sem match: <strong>{syncResult.still_unmatched}</strong></p>
                  {syncResult.results.filter((r) => r.method !== "no_match").length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <strong>Matches:</strong>
                      {syncResult.results.filter((r) => r.method !== "no_match").map((r, i) => (
                        <div key={i} style={{ color: "#22C55E", marginLeft: 12 }}>{r.lead_name} (ID {r.lead_id}) — via {r.method}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Unmatched submissions */}
            <section className="adm-ficha-section">
              <h2 className="adm-ficha-section-title">3. Submissões Sem Vínculo ({unmatched.filter((u) => !u.matched).length})</h2>
              {unmatched.filter((u) => !u.matched).length === 0 ? (
                <p style={{ color: "rgba(226,221,212,.3)", fontSize: 14 }}>Nenhuma submissão pendente. Tudo vinculado!</p>
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
                            Tel: {sub.phone_digits || "—"} · {new Date(sub.created_at).toLocaleString("pt-BR")}
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
