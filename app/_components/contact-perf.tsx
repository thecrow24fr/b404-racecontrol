"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Outil de diagnostic avancé des performances du Contact Center.
 * Mesure précisément chaque phase de rendu et permet d'isoler
 * chaque effet CSS.
 *
 * Commandes disponibles dans la console :
 *   toggle("backdrop")     - Désactive/active backdrop-filter (overlay)
 *   toggle("shadow")       - Désactive/active box-shadow (fenêtre modale)
 *   toggle("animation")    - Désactive/active l'animation d'entrée
 *   toggle("blurModal")    - Désactive/active backdrop-blur sur la modale
 *   toggle("border")       - Désactive/active les borders
 *   toggle("all")          - Désactive tout
 *   reset()                - Restaure tout
 *   measure()              - Mesure les FPS immédiatement
 *   analyze()              - Analyse détaillée des coûts
 */

/**
 * Securise l'acces a className (les SVG renvoient SVGAnimatedString).
 */
function getClassNames(el: Element): string {
  const cn = (el as any).className;
  if (typeof cn === "string") return cn;
  if (cn && typeof cn.baseVal === "string") return cn.baseVal;
  return "";
}
const state = {
  backdrop: true,
  shadow: true,
  animation: true,
  blurModal: true,
  border: true,
};

function apply() {
  // Overlay backdrop-filter
  document.querySelectorAll('[class*="backdrop-blur"]').forEach((el) => {
    const html = el as HTMLElement;
    if (state.backdrop) {
      html.style.backdropFilter = "";
    } else {
      html.style.backdropFilter = "none !important";
      html.style.setProperty("backdrop-filter", "none", "important");
    }
  });

  // Box-shadows
  document.querySelectorAll(".shadow-2xl, [class*='shadow']").forEach((el) => {
    const html = el as HTMLElement;
    if (state.shadow) {
      html.style.boxShadow = "";
    } else {
      html.style.boxShadow = "none !important";
      html.style.setProperty("box-shadow", "none", "important");
    }
  });

  // Animations
  document.querySelectorAll("[style*='animation']").forEach((el) => {
    const html = el as HTMLElement;
    if (state.animation) {
      html.style.animation = "";
    } else {
      html.style.animation = "none !important";
      html.style.setProperty("animation", "none", "important");
    }
  });

  // backdrop-blur sur la modale
  document.querySelectorAll(".rounded-3xl").forEach((el) => {
    const html = el as HTMLElement;
    if (state.blurModal) {
      html.style.backdropFilter = "";
    } else {
      html.style.backdropFilter = "none !important";
      html.style.setProperty("backdrop-filter", "none", "important");
    }
  });

  // Borders
  document.querySelectorAll('[class*="border"]').forEach((el) => {
    const html = el as HTMLElement;
    if (state.border) {
      html.style.borderWidth = "";
      html.style.borderStyle = "";
      html.style.borderColor = "";
    } else {
      html.style.setProperty("border", "none", "important");
    }
  });
}

// Exposer les commandes
if (typeof window !== "undefined") {
  (window as any).toggle = (what: string) => {
    if (what === "all") {
      Object.keys(state).forEach((k) => ((state as any)[k] = false));
    } else if ((state as any)[what] !== undefined) {
      (state as any)[what] = !(state as any)[what];
    } else {
      console.log(`Toggle inconnu. Utilisez: backdrop, shadow, animation, blurModal, border, all`);
      return;
    }
    apply();
    (window as any).__perfNeedsReset = true;
    console.log(
      `%c[PERF] ${what}: ${(state as any)[what] ? "ON" : "OFF"}`,
      `color:${(state as any)[what] ? "green" : "red"};font-weight:bold`
    );
  };

  (window as any).reset = () => {
    Object.keys(state).forEach((k) => ((state as any)[k] = true));
    // Forcer restauration complète
    document.querySelectorAll("*").forEach((el) => {
      const html = el as HTMLElement;
      html.style.backdropFilter = "";
      html.style.boxShadow = "";
      html.style.animation = "";
      html.style.border = "";
      html.style.borderWidth = "";
      html.style.borderStyle = "";
      html.style.borderColor = "";
    });
    (window as any).__perfNeedsReset = true;
    console.log("%c[PERF] Tout restaure", "color:green;font-weight:bold");
  };

  (window as any).analyze = () => {
    const modal = document.querySelector('[role="dialog"]');
    if (!modal) {
      console.log("Ouvrez d'abord le Contact Center");
      return;
    }
    const all = modal.querySelectorAll("*");
    const total = all.length;

    // --- TRANSITIONS ---
    console.log(`%c[PERF] === Analyse detaillee ===`, "font-weight:bold;color:#3b82f6;font-size:14px");
    console.log(`Elements dans la modal : ${total}`);
    console.log(`---`);

    console.log(`%cTRANSITIONS actives (41/41) :`, "font-weight:bold;color:#f97316");
    const transElements: string[] = [];
    all.forEach((el) => {
      const html = el as HTMLElement;
      const s = window.getComputedStyle(html);
      if (s.transition !== "all 0s ease 0s" && s.transition !== "none") {
        // Trouver la classe ou le composant parent
        const classes = (getClassNames(html) || "").slice(0, 80);
        const tag = html.tagName.toLowerCase();
        const parentComp = findParentComponent(html);
        const props = s.transitionProperty;
        const duration = parseFloat(s.transitionDuration) * 1000;
        transElements.push(
          `  <${tag}${html.id ? `#${html.id}` : ""}${classes ? ` .${classes.split(" ").slice(0, 2).join(".")}` : ""}> "${props}" ${duration}ms ${parentComp ? `[composant: ${parentComp}]` : ""}`
        );
      }
    });
    // Grouper par composant
    const byComponent: Record<string, number> = {};
    transElements.forEach((t) => {
      const match = t.match(/\[composant: (.*?)\]/);
      const comp = match ? match[1] : "inconnu";
      byComponent[comp] = (byComponent[comp] || 0) + 1;
    });
    console.log(`  Repartition par composant :`);
    Object.entries(byComponent)
      .sort((a, b) => b[1] - a[1])
      .forEach(([comp, count]) => {
        console.log(`    ${comp}: ${count} transitions`);
      });
    console.log(`  (appelez analyzeTrans(true) pour la liste complete)`);
    (window as any).__transList = transElements;

    console.log(`---`);

    // --- ANIMATIONS ---
    console.log(`%cANIMATIONS actives :`, "font-weight:bold;color:#f97316");
    all.forEach((el) => {
      const html = el as HTMLElement;
      const s = window.getComputedStyle(html);
      if (s.animation !== "none" && !s.animation.startsWith("none")) {
        const classes = (getClassNames(html) || "").slice(0, 60);
        const tag = html.tagName.toLowerCase();
        const animName = s.animationName;
        const animDur = s.animationDuration;
        const state = s.animationPlayState;
        console.log(`  <${tag}${classes ? ` .${classes.split(" ").slice(0, 2).join(".")}` : ""}> animation: "${animName}" ${animDur} state:${state}`);
      }
    });
    if (all.length === 0 || !Array.from(all).some((el) => {
      const s = window.getComputedStyle(el as HTMLElement);
      return s.animation !== "none" && !s.animation.startsWith("none");
    })) {
      console.log(`  (aucune animation active)`);
    }

    console.log(`---`);

    // --- LAYERS GPU ---
    console.log(`%cLAYERS GPU promus :`, "font-weight:bold;color:#f97316");
    let layerCount = 0;
    all.forEach((el) => {
      const html = el as HTMLElement;
      const s = window.getComputedStyle(html);
      const reasons: string[] = [];
      if (s.willChange !== "auto") reasons.push(`will-change:${s.willChange}`);
      if (s.transform !== "none") reasons.push(`transform`);
      if (s.backdropFilter !== "none") reasons.push(`backdrop-filter`);
      if (s.position === "fixed") reasons.push("position:fixed");
      if (s.position === "sticky") reasons.push("position:sticky");
      if (s.opacity !== "1" && html.style.animation) reasons.push("animated-opacity");
      // Detecter les promotes indirects (ancetres)
      if (reasons.length > 0) {
        layerCount++;
        const classes = (getClassNames(html) || "").slice(0, 60);
        const tag = html.tagName.toLowerCase();
        console.log(`  #${layerCount} <${tag}${classes ? ` .${classes.split(" ").slice(0, 3).join(".")}` : ""}>`);
        reasons.forEach((r) => console.log(`    - ${r}`));
      }
    });
    if (layerCount === 0) console.log(`  (aucun layer promeu detecte)`);

    console.log(`---`);
    console.log(`Commandes: toggle("backdrop"), toggle("shadow"), toggle("animation"), toggle("border"), toggle("all"), reset()`);
    console.log(`Pour la liste complete des transitions: %canalyzeTrans(true)%c`, "color:#f97316", "color:inherit");
  };

  (window as any).analyzeTrans = (showAll: boolean) => {
    const list = (window as any).__transList;
    if (!list || list.length === 0) {
      console.log("Executez d'abord analyze()");
      return;
    }
    if (showAll) {
      console.log(`%c[PERF] Liste complete des transitions :`, "font-weight:bold;color:#f97316");
      list.forEach((t: string) => console.log(t));
      console.log(`Total: ${list.length} transitions`);
    }
  };

  function findParentComponent(el: HTMLElement): string | null {
    // Remonter jusqu'a 3 niveaux pour trouver un composant React identifiable
    let current: HTMLElement | null = el;
    for (let i = 0; i < 3; i++) {
      if (!current) break;
      const classes = getClassNames(current) || "";
      if (classes.includes("contact-form") || classes.includes("contact-field") || classes.includes("contact-select") || classes.includes("contact-modal") || classes.includes("contact-categories")) {
        const match = classes.match(/contact-\w+/);
        if (match) return match[0];
      }
      if (current.getAttribute("data-component")) {
        return current.getAttribute("data-component");
      }
      current = current.parentElement;
    }
    return null;
  }
}

export function ContactPerf() {
  const isScrollingRef = useRef(false);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafIdRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const framesRef = useRef<number[]>([]);
  const droppedRef = useRef(0);
  const countRef = useRef(0);
  const scrollCountRef = useRef(0);
  const reportedRef = useRef(false);
  const maxScrollCount = useRef(30);

  const resetCounters = useCallback(() => {
    framesRef.current = [];
    droppedRef.current = 0;
    countRef.current = 0;
    lastTimeRef.current = performance.now();
  }, []);

  const capture = useCallback(() => {
    const elapsed = performance.now() - lastTimeRef.current;
    const total = countRef.current;
    if (total < 5) return; // trop court, ignorer

    const avg = framesRef.current.reduce((a, b) => a + b, 0) / framesRef.current.length;
    const fps = Math.round(1000 / avg);
    const dropRate = Math.round((droppedRef.current / total) * 100);

    const sorted = [...framesRef.current].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    const max = sorted[sorted.length - 1];

    // Identifier la cause probable
    const causes: string[] = [];
    if (avg > 25) causes.push("Frame moyenne > 25ms");
    if (dropRate > 50) causes.push(`${dropRate}% dropped frames`);
    if (max > 100) causes.push(`Pics a ${Math.round(max)}ms`);

    console.log(`%c[PERF] === Rapport scroll ===`, "font-weight:bold;color:#f97316;font-size:14px");
    console.log(`  Duree: ${Math.round(elapsed)}ms | Events: ${scrollCountRef.current}`);
    console.log(`  Frames: ${total} | Avg: ${Math.round(avg * 100) / 100}ms`);
    console.log(`  FPS: ${fps} | Dropped: ${droppedRef.current}/${total} (${dropRate}%)`);
    console.log(`  Distribution: p50=${Math.round(p50 * 100) / 100}ms | p95=${Math.round(p95 * 100) / 100}ms | p99=${Math.round(p99 * 100) / 100}ms | max=${Math.round(max * 100) / 100}ms`);

    if (causes.length > 0) {
      console.log(`%c  Causes probables: ${causes.join(" | ")}`, "color:red");
      // Suggérer un toggle
      if (avg > 30) console.log(`  %c  Essayez: toggle("backdrop"), toggle("shadow"), toggle("animation"), toggle("border")`, "color:orange");
    } else {
      console.log(`%c  Aucun probleme detecte ✅`, "color:green");
    }
    console.log(`---`);
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      countRef.current++;

      if (isScrollingRef.current) {
        framesRef.current.push(delta);
        if (delta > 18) droppedRef.current++;
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };

    const handleWheel = () => {
      scrollCountRef.current++;
      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        resetCounters();
        console.log(`%c[PERF] >>> Scroll <<<`, "color:#f97316");
      }
      if (endTimerRef.current) clearTimeout(endTimerRef.current);
      endTimerRef.current = setTimeout(() => {
        isScrollingRef.current = false;
        capture();
      }, 500);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    document.addEventListener("wheel", handleWheel, { passive: true });

    // Analyse initiale
    setTimeout(() => {
      if (!reportedRef.current) {
        reportedRef.current = true;
        console.log(`%c[PERF] Utilisez toggle("backdrop"), toggle("shadow"), toggle("animation"), toggle("border") pour isoler chaque effet`, "font-weight:bold;color:#3b82f6");
        console.log(`  Puis scrollez pour mesurer l'impact.`);
        console.log(`  tapez %canalyze()%c pour un diagnostic complet.`, "color:#f97316", "color:inherit");
      }
    }, 1500);

    // Watcher toggles
    let watchId = 0;
    const watch = () => {
      if ((window as any).__perfNeedsReset) {
        (window as any).__perfNeedsReset = false;
        resetCounters();
        isScrollingRef.current = false;
      }
      watchId = requestAnimationFrame(watch);
    };
    watchId = requestAnimationFrame(watch);

    return () => {
      cancelAnimationFrame(rafIdRef.current);
      cancelAnimationFrame(watchId);
      document.removeEventListener("wheel", handleWheel);
      if (endTimerRef.current) clearTimeout(endTimerRef.current);
    };
  }, [capture, resetCounters]);

  return null;
}
