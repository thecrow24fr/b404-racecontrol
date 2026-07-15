/**
 * Données simulées pour le Live Timing Premium — B404 RaceControl
 *
 * Toutes les données de ce fichier sont FICTIVES et servent uniquement
 * à alimenter l'interface durant le développement.
 *
 * 🔁 Remplacement futur : ce fichier sera remplacé par une connexion
 *    au Live Timing R2LA qui fournira les données réelles via un service.
 *    Les types dans _types/live-timing.ts sont conçus pour être compatibles.
 *
 * @module live-timing-data
 */

import type { LiveTimingData } from "../_types/live-timing";

/**
 * Données simulées pour le serveur GT3 — session Practice à Spa.
 * Représente un snapshot complet du Live Timing à un instant T.
 */
export const mockLiveTimingData: LiveTimingData = {
  server: {
    id: "gt3-live",
    name: "B404 GT3 Championship — S1",
    circuit: "Spa-Francorchamps",
    category: "GT3",
    weather: {
      condition: "Couvert",
      temperature: 18,
      windSpeed: 12,
      rainPercent: 30,
      trackCondition: "damp",
    },
    driversCount: 26,
    maxDrivers: 32,
    currentSession: "Course",
    timeRemaining: "38:24",
    totalSessionTime: "60:00",
    lapsCompleted: 8,
    totalLaps: 25,
    status: "online",
  },
  session: {
    phase: "race",
    serverTime: "15:42:18",
    trackTemp: 22,
    airTemp: 18,
    flags: [
      { type: "green", sector: 0 },
      { type: "yellow", sector: 2, reason: "Incident — sortie de piste virage 11" },
    ],
    elapsedTime: "21:36",
  },
  standings: [
    {
      position: 1, prevPosition: 1, driverName: "L. Vanthoor", team: "WRT Team", car: "Ferrari 296 GT3", carClass: "GT3",
      laps: 8, gapToLeader: "Leader", gapToNext: "+1.234", bestLap: "2:18.456", lastLap: "2:19.102",
      sector1: "42.123", sector2: "55.678", sector3: "40.655", inPit: false, status: "running", pitStops: 0,
    },
    {
      position: 2, prevPosition: 2, driverName: "K. Estre", team: "Porsche Manthey", car: "Porsche 911 GT3 R", carClass: "GT3",
      laps: 8, gapToLeader: "+1.234", gapToNext: "+0.876", bestLap: "2:18.789", lastLap: "2:19.456",
      sector1: "42.345", sector2: "55.890", sector3: "40.821", inPit: false, status: "running", pitStops: 0,
    },
    {
      position: 3, prevPosition: 3, driverName: "M. Engel", team: "Mercedes-AMG", car: "Mercedes-AMG GT3", carClass: "GT3",
      laps: 8, gapToLeader: "+2.110", gapToNext: "+0.654", bestLap: "2:18.923", lastLap: "2:19.789",
      sector1: "42.456", sector2: "55.456", sector3: "41.001", inPit: false, status: "running", pitStops: 0,
    },
    {
      position: 4, prevPosition: 5, driverName: "D. Olsen", team: "Emil Frey Racing", car: "Lamborghini Huracán GT3", carClass: "GT3",
      laps: 8, gapToLeader: "+2.764", gapToNext: "+0.312", bestLap: "2:19.012", lastLap: "2:18.999",
      sector1: "42.567", sector2: "55.234", sector3: "41.198", inPit: false, status: "running", pitStops: 0,
    },
    {
      position: 5, prevPosition: 4, driverName: "S. Van der Linde", team: "Abt Sportsline", car: "Audi R8 LMS GT3", carClass: "GT3",
      laps: 8, gapToLeader: "+3.076", gapToNext: "+0.445", bestLap: "2:19.156", lastLap: "2:19.567",
      sector1: "42.678", sector2: "55.123", sector3: "41.275", inPit: false, status: "running", pitStops: 0,
    },
    {
      position: 6, prevPosition: 6, driverName: "R. Marciello", team: "Racing Team Italia", car: "BMW M4 GT3", carClass: "GT3",
      laps: 8, gapToLeader: "+3.521", gapToNext: "+0.589", bestLap: "2:19.234", lastLap: "2:20.012",
      sector1: "42.789", sector2: "55.567", sector3: "41.165", inPit: false, status: "running", pitStops: 0,
    },
    {
      position: 7, prevPosition: 7, driverName: "J. Calado", team: "AF Corse", car: "Ferrari 296 GT3", carClass: "GT3",
      laps: 8, gapToLeader: "+4.110", gapToNext: "+0.234", bestLap: "2:19.345", lastLap: "2:20.345",
      sector1: "42.890", sector2: "55.678", sector3: "41.442", inPit: false, status: "running", pitStops: 0,
    },
    {
      position: 8, prevPosition: 8, driverName: "T. Gamble", team: "McLaren GT3 Pro", car: "McLaren 720S GT3", carClass: "GT3",
      laps: 8, gapToLeader: "+4.344", gapToNext: "+0.876", bestLap: "2:19.456", lastLap: "2:20.567",
      sector1: "43.001", sector2: "55.789", sector3: "41.554", inPit: false, status: "running", pitStops: 0,
    },
    {
      position: 9, prevPosition: 10, driverName: "N. Nielsen", team: "Dragon Racing", car: "Aston Martin Vantage GT3", carClass: "GT3",
      laps: 8, gapToLeader: "+5.220", gapToNext: "+0.123", bestLap: "2:19.567", lastLap: "2:19.890",
      sector1: "43.112", sector2: "55.890", sector3: "41.218", inPit: false, status: "running", pitStops: 0,
    },
    {
      position: 10, prevPosition: 9, driverName: "F. Schiller", team: "Rutronik Racing", car: "Porsche 911 GT3 R", carClass: "GT3",
      laps: 8, gapToLeader: "+5.343", gapToNext: "+0.567", bestLap: "2:19.678", lastLap: "2:20.789",
      sector1: "43.223", sector2: "56.001", sector3: "42.119", inPit: false, status: "running", pitStops: 0,
    },
    {
      position: 11, prevPosition: 11, driverName: "A. Picariello", team: "Huber Racing", car: "Porsche 911 GT3 R", carClass: "GT3",
      laps: 8, gapToLeader: "+5.910", gapToNext: "+0.345", bestLap: "2:19.789", lastLap: "2:21.012",
      sector1: "43.334", sector2: "56.112", sector3: "42.464", inPit: false, status: "running", pitStops: 0,
    },
    {
      position: 12, prevPosition: 12, driverName: "M. Bortolotti", team: "Grasser Racing", car: "Lamborghini Huracán GT3", carClass: "GT3",
      laps: 8, gapToLeader: "+6.255", gapToNext: "+0.789", bestLap: "2:19.890", lastLap: "2:21.234",
      sector1: "43.445", sector2: "56.223", sector3: "42.587", inPit: false, status: "running", pitStops: 0,
    },
    {
      position: 13, prevPosition: 14, driverName: "J. Dennis", team: "Red Bull Racing", car: "McLaren 720S GT3", carClass: "GT3",
      laps: 8, gapToLeader: "+7.044", gapToNext: "+0.211", bestLap: "2:20.012", lastLap: "2:21.345",
      sector1: "43.556", sector2: "56.334", sector3: "43.154", inPit: false, status: "running", pitStops: 1,
    },
    {
      position: 14, prevPosition: 13, driverName: "C. Klien", team: "JP Motorsport", car: "BMW M4 GT3", carClass: "GT3",
      laps: 8, gapToLeader: "+7.255", gapToNext: "+0.434", bestLap: "2:20.156", lastLap: "2:21.567",
      sector1: "43.667", sector2: "56.445", sector3: "43.143", inPit: false, status: "running", pitStops: 1,
    },
    {
      position: 15, prevPosition: 15, driverName: "H. Newey", team: "SPS Automotive", car: "Mercedes-AMG GT3", carClass: "GT3",
      laps: 7, gapToLeader: "+1 tour", gapToNext: "+0.789", bestLap: "2:20.234", lastLap: "2:22.012",
      sector1: "43.778", sector2: "56.556", sector3: "43.678", inPit: true, status: "pit", pitStops: 1,
    },
    {
      position: 16, prevPosition: 16, driverName: "P. Eng", team: "Rinaldi Racing", car: "Ferrari 296 GT3", carClass: "GT3",
      laps: 7, gapToLeader: "+1 tour", gapToNext: "+1.234", bestLap: "2:20.345", lastLap: "2:22.345",
      sector1: "43.889", sector2: "56.667", sector3: "43.789", inPit: false, status: "running", pitStops: 1,
    },
  ],
};

/**
 * Données simulées pour le classement Qualifying (au cas où)
 */
export const mockQualifyingData: LiveTimingData = {
  server: {
    id: "gt3-quali",
    name: "B404 GT3 Championship — S1",
    circuit: "Spa-Francorchamps",
    category: "GT3",
    weather: {
      condition: "Dégagé",
      temperature: 22,
      windSpeed: 8,
      rainPercent: 5,
      trackCondition: "dry",
    },
    driversCount: 26,
    maxDrivers: 32,
    currentSession: "Qualifications",
    timeRemaining: "12:00",
    totalSessionTime: "20:00",
    lapsCompleted: 3,
    totalLaps: 25,
    status: "online",
  },
  session: {
    phase: "qualifying",
    serverTime: "14:30:00",
    trackTemp: 28,
    airTemp: 22,
    flags: [{ type: "green", sector: 0 }],
    elapsedTime: "08:00",
  },
  standings: mockLiveTimingData.standings
    .map((entry, index) => ({
      ...entry,
      position: index + 1,
      prevPosition: index + 1,
      laps: 3,
      status: "running" as const,
      inPit: false,
      gapToLeader: index === 0 ? "Leader" : `+${(Math.random() * 3 + 0.5).toFixed(3)}`,
      gapToNext: index === 0 ? "" : `+${(Math.random() * 0.8 + 0.1).toFixed(3)}`,
    })),
};

/**
 * Données simulées pour quand le serveur est hors ligne
 */
export const mockOfflineData: LiveTimingData = {
  server: {
    id: "gt3-offline",
    name: "B404 GT3 Championship — S1",
    circuit: "Spa-Francorchamps",
    category: "GT3",
    weather: {
      condition: "—",
      temperature: 0,
      windSpeed: 0,
      rainPercent: 0,
      trackCondition: "dry",
    },
    driversCount: 0,
    maxDrivers: 32,
    currentSession: "—",
    timeRemaining: "—",
    totalSessionTime: "—",
    lapsCompleted: 0,
    totalLaps: 0,
    status: "offline",
  },
  session: {
    phase: "waiting",
    serverTime: "—",
    trackTemp: 0,
    airTemp: 0,
    flags: [],
    elapsedTime: "—",
  },
  standings: [],
};
