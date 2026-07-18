"use client";

import { useEffect, useState } from "react";

interface ProxyResult {
  url: string;
  method: string;
  httpCode: number;
  success: boolean;
  elapsedMs: number;
  data: unknown;
  error?: string;
}

export default function TestApiPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<ProxyResult[]>([]);
  const [proxyUrl, setProxyUrl] = useState("/api/rf2");

  function addLog(msg: string) {
    setLogs((prev) => [...prev, msg]);
  }

  async function testViaProxy(label: string, targetUrl: string) {
    addLog(`\n📍 ${label}`);
    addLog(`   API cible : ${targetUrl}`);
    addLog(`   Via proxy : POST ${proxyUrl}`);

    try {
      const res = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl, method: "GET" }),
      });

      const result: ProxyResult = await res.json();
      setResults((prev) => [...prev, result]);

      addLog(`   ⏱  ${result.elapsedMs}ms`);
      addLog(`   Statut HTTP rF2 : ${result.httpCode}`);
      if (result.success) {
        addLog(`   ✅ SUCCÈS`);
        if (typeof result.data === "object" && result.data !== null) {
          const d = result.data as Record<string, unknown>;
          addLog(`   Serveur : ${d.serverName ?? "?"}`);
          addLog(`   Circuit : ${d.trackName ?? "?"}`);
          addLog(`   Session : ${d.session ?? "?"}`);
          addLog(`   Véhicules : ${d.numberOfVehicles ?? "?"}`);
        }
      } else {
        addLog(`   ❌ ÉCHEC : ${result.error ?? "inconnu"}`);
        if (result.httpCode === 0) {
          addLog(`   ℹ️  Le proxy n'est pas disponible.`);
          addLog(`   ℹ️  En local : lance 'node local-proxy.mjs'`);
          addLog(`   ℹ️  En prod : Cloudflare Tunnel doit pointer sur api.b404ldc.fr`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`   ❌ ERREUR : ${msg}`);
    }
  }

  useEffect(() => {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const mode = isLocal ? "🖥️ Local" : "☁️ Public (production)";

    // Détecter l'URL du proxy utilisée
    addLog("=== TEST DE L'ARCHITECTURE DE PRODUCTION ===");
    addLog(`Heure : ${new Date().toLocaleString("fr-FR")}`);
    addLog(`Page servie depuis : ${window.location.origin}`);
    addLog(`Mode : ${mode}`);
    addLog("");

    // Tester le proxy local d'abord
    addLog("═══ 1. Test du proxy local (/api/rf2) ═══");
    testViaProxy(
      "Proxy relatif (local)",
      "http://localhost:5300/rest/watch/sessionInfo",
    );
  }, []);

  useEffect(() => {
    // Une fois le premier test fini, montrer le schéma
    if (results.length > 0) {
      addLog("\n═══ 2. Schéma de l'architecture finale ═══");

      if (results[0].success) {
        addLog("");
        addLog("   ✅ Le proxy LOCAL fonctionne.");
        addLog("   Voici comment cela fonctionnera en production :");
        addLog("");
        addLog("   Visiteur sur racecontrol.b404ldc.fr");
        addLog("        │");
        addLog("        │  fetch('https://api.b404ldc.fr/api/rf2')");
        addLog("        ▼");
        addLog("   Cloudflare Tunnel (api.b404ldc.fr) — gratuit");
        addLog("        │");
        addLog("        │  tunnel chiffré");
        addLog("        ▼");
        addLog("   VM B404 — cloudflared → localhost:3001");
        addLog("        │");
        addLog("        │  local-proxy.mjs");
        addLog("        ▼");
        addLog("   localhost:5300 — rF2 API ✅");
      } else {
        addLog("");
        addLog("   ❌ Le proxy local n'est pas disponible.");
        addLog("");
        addLog("   Pour tester en local, lance :");
        addLog("     node local-proxy.mjs");
        addLog("   puis ouvre http://localhost:3001/test-api");
        addLog("");
        addLog("   Pour la production :");
        addLog("   - 1. Installer cloudflared sur la VM");
        addLog("   - 2. Créer un tunnel api.b404ldc.fr → localhost:3001");
        addLog("   - 3. Builder avec :");
        addLog("     NEXT_PUBLIC_API_URL=https://api.b404ldc.fr/api/rf2 npm run build");
        addLog("   - 4. Déployer out/ sur OVH");
      }
    }
  }, [results]);

  return (
    <div
      style={{
        background: "#0a0f1a",
        color: "#e0e0e0",
        minHeight: "100vh",
        padding: "24px",
        fontFamily: "monospace",
        fontSize: "13px",
        lineHeight: "1.6",
      }}
    >
      <h1
        style={{
          color: "#f97316",
          fontSize: "18px",
          fontWeight: 800,
          marginBottom: "8px",
        }}
      >
        🧪 Architecture de production — Test
      </h1>
      <p style={{ color: "#9ca3af", fontSize: "11px", marginBottom: "16px" }}>
        Vérifie que le flux Navigateur → Proxy → rF2 API fonctionne dans les
        deux modes (local et public)
      </p>

      <div
        style={{
          background: "#0d1b2e",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "8px",
          padding: "16px",
        }}
      >
        {logs.map((line, i) => {
          const isHeader = line.startsWith("═══");
          const isUrl = line.startsWith("📍");
          const isError =
            line.includes("❌") || line.includes("ÉCHEC");
          const isSuccess = line.includes("✅");
          const isArrow = line.includes("│") || line.includes("▼");
          const style: React.CSSProperties = {
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            color: isError
              ? "#ef4444"
              : isSuccess
                ? "#34d399"
                : isHeader
                  ? "#f97316"
                  : isUrl
                    ? "#f97316"
                    : isArrow
                      ? "#6b7280"
                      : "#d1d5db",
            fontWeight: isHeader || isUrl || isError || isSuccess ? 700 : 400,
            margin: 0,
            padding: 0,
            fontFamily: "monospace",
            fontSize: "13px",
          };
          return (
            <p key={i} style={style}>
              {line}
            </p>
          );
        })}
      </div>
    </div>
  );
}
