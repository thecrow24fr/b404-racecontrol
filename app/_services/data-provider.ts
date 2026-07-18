/**
 * Interface DataProvider — Couche d'abstraction des sources de données
 *
 * B404 RaceControl
 *
 * Architecture modulaire permettant de changer de source de données
 * (rF2 native API, R2LA, Steam, mock) sans modifier les composants React.
 *
 * @module data-provider
 */

import type { LiveTimingData } from "../_types/live-timing";

// ─── Résultat d'un fetch ──────────────────────────────────────────────

/** Résultat unifié retourné par un DataProvider */
export interface ProviderResult {
  /** Les données Live Timing */
  data: LiveTimingData;
  /** Source ayant fourni les données (pour affichage / debug) */
  source: string;
  /** Horodatage ISO de la récupération */
  fetchedAt: string;
}

// ─── Interface du fournisseur ─────────────────────────────────────────

/**
 * Interface commune à tous les fournisseurs de données Live Timing.
 *
 * Chaque implémentation encapsule :
 * - La détection de disponibilité (isAvailable)
 * - La récupération et le mapping des données (fetch)
 * - Un nom lisible pour l'UI / le debug
 */
export interface IDataProvider {
  /** Nom lisible du fournisseur (affiché dans l'interface) */
  readonly name: string;

  /**
   * Vérifie si la source de données est actuellement disponible.
   * Exemple : l'API rF2 répond sur localhost:5397
   */
  isAvailable(): Promise<boolean>;

  /**
   * Récupère les données Live Timing complètes.
   * À n'appeler qu'après avoir vérifié isAvailable() === true.
   *
   * @throws Error si la source est injoignable
   */
  fetch(): Promise<ProviderResult>;
}

// ─── Utilitaires ──────────────────────────────────────────────────────

const BASE_MS = 3000;

/**
 * Délai exponentiel pour le polling, avec plafond.
 * Réduit la charge réseau quand rF2 est temporairement indisponible.
 */
export function getPollDelay(attempt: number): number {
  return Math.min(BASE_MS * Math.pow(1.5, attempt), 30_000);
}

/**
 * Temporise entre deux tentatives de polling.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
