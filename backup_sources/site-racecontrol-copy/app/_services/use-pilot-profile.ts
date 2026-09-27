/**
 * usePilotProfile — Hook React pour le profil pilote.
 *
 * B404 RaceControl
 * Gère les 3 états : chargement, données, erreur.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  PilotDetailResponse,
  PilotCareerStats,
  RatingPoint,
  PilotBadge,
} from "../_types/pilot";
import {
  fetchPilotProfile,
  fetchPilotStats,
  fetchPilotRatings,
} from "../_services/pilot-service";

export interface PilotProfileState {
  profile: PilotDetailResponse["pilot"];
  recentResults: PilotDetailResponse["recentResults"];
  badges: PilotBadge[];
  stats: PilotCareerStats | null;
  ratingHistory: RatingPoint[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePilotProfile(pilotId: string): PilotProfileState {
  const [profile, setProfile] = useState<PilotDetailResponse["pilot"]>(null);
  const [recentResults, setRecentResults] = useState<
    PilotDetailResponse["recentResults"]
  >([]);
  const [badges, setBadges] = useState<PilotBadge[]>([]);
  const [stats, setStats] = useState<PilotCareerStats | null>(null);
  const [ratingHistory, setRatingHistory] = useState<RatingPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!pilotId) return;
    setIsLoading(true);
    setError(null);

    try {
      const [profileRes, statsRes, ratingsRes] = await Promise.all([
        fetchPilotProfile(pilotId),
        fetchPilotStats(pilotId).catch(() => null),
        fetchPilotRatings(pilotId, 20).catch(() => null),
      ]);

      if (!profileRes.success || !profileRes.pilot) {
        setError(profileRes.error ?? "Pilote introuvable");
        setProfile(null);
        setRecentResults([]);
        setBadges([]);
        setStats(null);
        setRatingHistory([]);
      } else {
        setProfile(profileRes.pilot);
        setRecentResults(profileRes.recentResults ?? []);
        setBadges(profileRes.badges ?? []);
        setStats(statsRes?.stats ?? null);
        setRatingHistory(ratingsRes?.history ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de connexion");
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [pilotId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    profile,
    recentResults,
    badges,
    stats,
    ratingHistory,
    isLoading,
    error,
    refresh: fetchAll,
  };
}
