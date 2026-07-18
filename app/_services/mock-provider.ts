/**
 * MockDataProvider — Fournisseur de données simulées
 *
 * B404 RaceControl
 *
 * Toujours disponible. Utilisé comme fallback quand l'API rF2
 * est injoignable, ou en développement sans serveur de jeu.
 *
 * Ce provider encapsule les données mock existantes dans l'interface
 * IDataProvider pour une intégration transparente dans le système.
 *
 * @module mock-provider
 */

import type { IDataProvider, ProviderResult } from "./data-provider";
import { mockLiveTimingData } from "../_data/live-timing-data";

/**
 * Fournisseur de données simulées pour le développement.
 *
 * - Toujours disponible (isAvailable → true)
 * - Retourne les données du fichier _data/live-timing-data.ts
 * - Source label : "mock"
 */
export class MockDataProvider implements IDataProvider {
  readonly name = "mock";

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async fetch(): Promise<ProviderResult> {
    return {
      data: mockLiveTimingData,
      source: "mock",
      fetchedAt: new Date().toISOString(),
    };
  }
}
