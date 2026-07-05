import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, ReferenceLine } from 'recharts';
import { Activity, TrendingUp, Calendar, Dumbbell, Plus, Trash2, Download, Upload, BarChart3, Flame, Target, Database, Trophy, Zap, Award, Timer, Play, Pause, RotateCcw, Save, X, Info, Mail, Check, AlertTriangle } from 'lucide-react';

// localStorage-based storage shim (replaces Claude's window.storage in standalone mode)
if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    get: async (key) => {
      const value = localStorage.getItem(`pyramid:${key}`);
      return value !== null ? { key, value } : null;
    },
    set: async (key, value) => {
      localStorage.setItem(`pyramid:${key}`, value);
      return { key, value };
    },
    delete: async (key) => {
      localStorage.removeItem(`pyramid:${key}`);
      return { key, deleted: true };
    },
    list: async (prefix = '') => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('pyramid:')) {
          const cleanKey = k.slice('pyramid:'.length);
          if (cleanKey.startsWith(prefix)) keys.push(cleanKey);
        }
      }
      return { keys, prefix };
    }
  };
}

const PYRAMID_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const LEVEL_LABELS = PYRAMID_LEVELS.map((lvl, idx) => `${idx < 10 ? '↑' : idx === 9 ? '◆' : '↓'}${lvl}`);

// Set B & C pyramid: 1->8->1 = 15 levels
const PYRAMID_LEVELS_B = [1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1];
const LEVEL_LABELS_B = PYRAMID_LEVELS_B.map((lvl, idx) => `${idx < 7 ? '↑' : idx === 7 ? '◆' : '↓'}${lvl}`);

// Set colors used everywhere
const SET_COLORS = { A: '#ff6b35', B: '#3da9d9', C: '#4ecca3' };
const getSetColor = (type) => SET_COLORS[type] || '#ff6b35';
const SET_TYPES = ['A', 'B', 'C'];

// Program v3 era boundary: analytics compare only within the same program era
const PROGRAM_V3_DATE = '2026-05-15';
const isV3 = (s) => s.date >= PROGRAM_V3_DATE;
const sameEra = (a, b) => isV3(a) === isV3(b);

// Helper to get pyramid config based on session type
const getPyramidConfig = (type) => {
  if (type === 'B' || type === 'C') {
    return { levels: PYRAMID_LEVELS_B, labels: LEVEL_LABELS_B, count: 15 };
  }
  return { levels: PYRAMID_LEVELS, labels: LEVEL_LABELS, count: 19 };
};

// Exercise lists for each set type (programme v3 — 15 mai 2026)
const EXERCISES_A = [
  { name: 'Balancier', repMultiplier: 1, repUnit: 'rep' },
  { name: 'Squat goblet sac 10kg', repMultiplier: 1, repUnit: 'rep' },
  { name: 'Fentes arrière alt.', repMultiplier: 1, repUnit: 'fente' },
  { name: 'Burpees (sans pompe)', repMultiplier: 1, repUnit: 'rep' }
];
const EXERCISES_B = [
  { name: 'Tirage anneaux serré', repMultiplier: 1, repUnit: 'rep' },
  { name: 'Tirage anneaux large', repMultiplier: 1, repUnit: 'rep' },
  { name: 'Arnold press', repMultiplier: 1, repUnit: 'rep' },
  { name: 'Face pulls élastique', repMultiplier: 1, repUnit: 'rep' },
  { name: 'Mountain climbers', repMultiplier: 4, repUnit: 'mvt' }
];
const EXERCISES_C = [
  { name: 'Pompes', repMultiplier: 1, repUnit: 'rep' },
  { name: 'Dips (chaises)', repMultiplier: 1, repUnit: 'rep' },
  { name: 'Élévations latérales', repMultiplier: 1, repUnit: 'rep' },
  { name: 'Hollow rocks', repMultiplier: 1, repUnit: 'rep' }
];
const getExercises = (type) => type === 'B' ? EXERCISES_B : type === 'C' ? EXERCISES_C : EXERCISES_A;

// Finisher options — available after any set. mode: 'time' (countdown) or 'reps' (manual validation)
const FINISHERS = [
  { id: 'calf-ecc', name: 'Mollets excentriques', short: 'Mollets', desc: 'Sur la marche : monte à 2 jambes, descends sur 1 jambe en 3-5s, talon sous le niveau. 12-15 reps/jambe.', sets: 4, unilateral: true, mode: 'reps', repsHint: '12-15 reps', repsDefault: 12 },
  { id: 'ab-wheel', name: 'Ab wheel skateboard', short: 'Ab wheel', desc: 'À genoux, roule contrôlé, bassin rétroversé. Amplitude 50% → complète sur 6-8 semaines. Si le dos creuse : réduis.', sets: 3, unilateral: false, mode: 'reps', repsHint: '5-8 reps', repsDefault: 6 },
  { id: 'dips-neg', name: 'Négatives dips anneaux', short: 'Nég. dips', desc: 'Saute en position haute, descends en 3-5s contrôlées. Quand 8 négatives propres → dips complets.', sets: 3, unilateral: false, mode: 'reps', repsHint: '3-5 reps', repsDefault: 4 },
  { id: 'ring-support', name: 'Support hold anneaux', short: 'Support', desc: 'Tiens en haut bras tendus, anneaux légèrement tournés vers l\'extérieur.', sets: 3, unilateral: false, mode: 'time' },
  { id: 'plank', name: 'Planche frontale', short: 'Planche', desc: 'Avant-bras au sol, fesses alignées avec le dos.', sets: 3, unilateral: false, mode: 'time' },
  { id: 'side-plank', name: 'Planche latérale', short: 'Side plank', desc: 'Sur un coude, hanches levées. Travaille les obliques.', sets: 3, unilateral: true, mode: 'time' },
  { id: 'plank-up-down', name: 'Planche dynamique', short: 'Up-down', desc: 'Passages avant-bras → mains en alternance. Engage les épaules.', sets: 3, unilateral: false, mode: 'time' },
  { id: 'hollow', name: 'Hollow hold', short: 'Hollow', desc: 'Dos au sol, jambes et torse en l\'air (position de gymnaste).', sets: 3, unilateral: false, mode: 'time' },
  { id: 'mc-slow', name: 'Mountain climbers lents', short: 'MC lents', desc: 'Version contrôlée, focus stabilité du bassin, pas de cardio.', sets: 3, unilateral: false, mode: 'time' },
  { id: 'glute-bridge', name: 'Pont fessier (hold)', short: 'Pont', desc: 'Sur le dos, fesses contractées en l\'air. Chaîne postérieure.', sets: 3, unilateral: false, mode: 'time' }
];
const getFinisherById = (id) => FINISHERS.find(f => f.id === id) || FINISHERS[0];
// Default finisher per set type
const DEFAULT_FINISHERS = { A: ['calf-ecc'], B: ['plank'], C: ['ab-wheel'] };

const SEED_DATA = [
  { date: "2025-11-06", type: "A", code: "S5s2", dumbbellWeight: null, bodyweight: 78.7, totalTime: 1830.08, levelTimes: null, notes: "Var. Développé Arnold" },
  { date: "2025-11-08", type: "A", code: "S5s3", dumbbellWeight: null, bodyweight: 78.1, totalTime: 1646.93, levelTimes: null, notes: "" },
  { date: "2025-11-10", type: "A", code: "S6s1", dumbbellWeight: null, bodyweight: 78.7, totalTime: 1510.76, levelTimes: null, notes: "" },
  { date: "2025-11-11", type: "A", code: "S6s2", dumbbellWeight: null, bodyweight: null, totalTime: 1485.82, levelTimes: null, notes: "" },
  { date: "2025-11-14", type: "A", code: "S6s3", dumbbellWeight: null, bodyweight: null, totalTime: 1488.03, levelTimes: null, notes: "" },
  { date: "2025-11-16", type: "A", code: "S6s4", dumbbellWeight: null, bodyweight: 76.4, totalTime: 1415.65, levelTimes: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 59.15, 47.05, 31.66, 22.53], notes: "" },
  { date: "2025-11-18", type: "A", code: "S7s1", dumbbellWeight: 7, bodyweight: 76.4, totalTime: 1533.73, levelTimes: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 59.07, 46.98, 37.88, 23.21], notes: "" },
  { date: "2025-11-20", type: "A", code: "S7s2", dumbbellWeight: null, bodyweight: 75.6, totalTime: 1487.22, levelTimes: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 70.65, 42.83, 33.06, 16.16], notes: "" },
  { date: "2025-11-22", type: "A", code: "S7s3", dumbbellWeight: null, bodyweight: 76, totalTime: 1503.20, levelTimes: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 68.17, 49.51, 29.10, 17.98], notes: "Poids approximatif" },
  { date: "2025-11-24", type: "A", code: "S8s1", dumbbellWeight: null, bodyweight: 77, totalTime: 1412.56, levelTimes: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 63.02, 44.18, 30.45, 19.56], notes: "" },
  { date: "2025-11-25", type: "A", code: "S8s2", dumbbellWeight: 8, bodyweight: 76.4, totalTime: 1679.17, levelTimes: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 69.00, 54.10, 38.48, 19.94], notes: "" },
  { date: "2025-11-27", type: "A", code: "S8s3", dumbbellWeight: 7, bodyweight: 75.4, totalTime: 1583.88, levelTimes: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 70.73, 71.82, 33.33, 21.08], notes: "Full burpees" },
  { date: "2025-12-02", type: "A", code: "S9s1", dumbbellWeight: 7, bodyweight: 76, totalTime: 1336.35, levelTimes: [null, null, null, null, null, null, null, null, null, null, 114.37, 98.53, 81.65, 75.53, 57.36, 41.68, 31.31, 18.32, null], notes: "Splits partiels (tours 11-18)" },
  { date: "2025-12-08", type: "A", code: "S10s1", dumbbellWeight: 7, bodyweight: 75.4, totalTime: 1293.50, levelTimes: [null, null, null, null, null, null, null, null, null, null, 109.05, 89.05, 80.41, 74.69, 56.11, 43.99, 32.48, 18.68, null], notes: "Splits partiels (tours 11-18)" },
  { date: "2025-12-11", type: "A", code: "S10s3", dumbbellWeight: 8, bodyweight: 74, totalTime: 1652.68, levelTimes: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, 91.92, 76.87, 55.13, 45.66, 24.24], notes: "Splits partiels (tours 15-19)" },
  { date: "2025-12-15", type: "A", code: "S11s1", dumbbellWeight: 7, bodyweight: 74.6, totalTime: 1318.57, levelTimes: [20.61, 33.54, 43.03, 53.77, 70.34, 77.26, 87.03, 99.12, 109.14, 116.52, 114.70, 102.62, 93.69, 78.51, 74.19, 55.69, 40.43, 28.96, 19.33], notes: "19 splits complets" },
  { date: "2025-12-18", type: "A", code: "S11s2", dumbbellWeight: 8, bodyweight: 74.2, totalTime: 1441.04, levelTimes: [21.57, 32.41, 43.25, 51.72, 62.44, 80.14, 86.89, 95.63, 108.11, 121.31, 126.13, 114.93, 116.12, 115.42, 95.65, 70.29, 45.45, 33.63, 19.86], notes: "19 splits complets - 2x8kg" },
  { date: "2026-01-12", type: "A", code: "Restart2026", dumbbellWeight: 7, bodyweight: 74, totalTime: 1340.64, levelTimes: null, notes: "Chrono à 20 tours, splits non utilisés" },
  { date: "2026-01-14", type: "A", code: "S1s2-2026", dumbbellWeight: 7, bodyweight: 73, totalTime: 1486.06, levelTimes: [21.71, 31.34, 39.28, 58.59, 67.09, 78.14, 94.26, 104.60, 105.72, 117.44, 111.64, 130.53, 130.12, 102.10, 89.24, 75.17, 52.77, 51.17, 25.07], notes: "19 splits - reprise 2026" },
  { date: "2026-01-19", type: "A", code: "S3s1-2026", dumbbellWeight: 7, bodyweight: 72.5, totalTime: 1344.01, levelTimes: [null, null, null, null, null, null, null, null, null, null, null, null, 91.36, 86.81, 74.47, 60.42, 47.81, 32.70, 20.59], notes: "Splits partiels (tours 13-19)" },
  { date: "2026-01-21", type: "A", code: "S3s2-2026", dumbbellWeight: 8, bodyweight: 72.5, totalTime: 1855.91, levelTimes: [null, null, null, null, null, null, null, null, null, null, null, null, 145.29, 155.83, 133.89, 90.72, 68.61, 72.11, 33.13], notes: "Splits partiels (tours 13-19) - 2x8kg" },
  { date: "2026-01-30", type: "A", code: "S5s1-2026", dumbbellWeight: 7, bodyweight: 72.5, totalTime: 1598.23, levelTimes: [null, null, null, null, null, null, null, null, null, null, null, null, 161.17, 230.05, 87.69, 90.76, 55.73, 38.61, 24.23], notes: "Tour 14 long (3:50) - pause/interruption" },
  { date: "2026-02-01", type: "A", code: "S5s2-2026", dumbbellWeight: 8, bodyweight: 72, totalTime: 1506.79, levelTimes: [21.53, 32.18, 43.78, 57.84, 70.37, 84.82, 99.13, 117.77, 129.47, 146.10, 125.69, 113.12, 113.36, 96.19, 73.69, 68.84, 52.16, 37.36, 23.29], notes: "19 splits complets - 2x8kg" },
  { date: "2026-02-04", type: "A", code: "S6s1-2026", dumbbellWeight: 7, bodyweight: 73, totalTime: 1350.36, levelTimes: [18.25, 30.74, 37.53, 56.64, 60.89, 81.36, 88.21, 110.95, 103.01, 116.89, 114.42, 105.77, 97.32, 86.66, 77.07, 59.41, 47.11, 34.11, 23.94], notes: "19 splits complets" },
  { date: "2026-02-16", type: "A", code: "S8s1-2026", dumbbellWeight: 8, bodyweight: 72, totalTime: 1596.68, levelTimes: [20.11, 32.99, 45.23, 54.49, 64.79, 82.17, 93.37, 112.64, 116.12, 145.24, 120.74, 129.87, 144.80, 106.20, 102.88, 66.20, 88.16, 41.81, 28.63], notes: "19 splits complets - 2x8kg" },
  { date: "2026-04-29", type: "A", code: "S17s1-2026", dumbbellWeight: 7, bodyweight: 73.9, totalTime: 1487.22, levelTimes: [null, null, null, null, null, null, null, null, null, 142.07, 125.13, 116.80, 93.31, 56.07, 22.46, 51.16, 44.89, 22.09, null], notes: "Reprise après 2 mois - splits partiels" },
  { date: "2026-05-06", type: "A", code: "S18s1-2026", dumbbellWeight: 7, bodyweight: 74, totalTime: 1967.84, levelTimes: [20.18, 27.46, 37.60, 54.06, 62.36, 73.26, 96.66, 100.57, 141.20, 174.85, 214.62, 225.73, 214.73, 133.34, 139.57, 74.01, 107.89, 37.41, 32.28], notes: "19 splits - séance très difficile" }
];

const formatTime = (seconds) => {
  if (seconds == null || isNaN(seconds)) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const parseTime = (str) => {
  if (!str) return null;
  const cleaned = str.toString().trim().replace(',', '.');
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':');
    if (parts.length !== 2) return null;
    const m = parseInt(parts[0], 10);
    const s = parseFloat(parts[1]);
    if (isNaN(m) || isNaN(s)) return null;
    return m * 60 + s;
  }
  const v = parseFloat(cleaned);
  return isNaN(v) ? null : v;
};

const getTotal = (s) => {
  if (s.totalTime != null) return s.totalTime;
  if (s.levelTimes && s.levelTimes.length > 0) {
    const sum = s.levelTimes.reduce((a, b) => a + (b || 0), 0);
    return sum > 0 ? sum : null;
  }
  return null;
};

// =============== PYRAMID LOGO ===============
// Rocky-inspired logo: stairs/pyramid with silhouette at the top, arms raised in V
function PyramidLogo({ size = 40, color = '#ff6b35', accentColor = '#ffc94d', background = null }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      {background && <rect width="512" height="512" rx="80" fill={background}/>}
      {/* Pyramid steps (5 levels) - centered, going up */}
      <g fill={color}>
        <rect x="80" y="360" width="352" height="50"/>
        <rect x="120" y="310" width="272" height="50"/>
        <rect x="160" y="260" width="192" height="50"/>
        <rect x="200" y="210" width="112" height="50"/>
        <rect x="226" y="170" width="60" height="40"/>
      </g>
      {/* Step shading on right side for 3D effect */}
      <g fill={color} opacity="0.55">
        <rect x="392" y="360" width="40" height="50"/>
        <rect x="352" y="310" width="40" height="50"/>
        <rect x="312" y="260" width="40" height="50"/>
        <rect x="272" y="210" width="40" height="50"/>
      </g>
      {/* Rocky silhouette at the top, arms raised in V */}
      <g fill={accentColor}>
        <circle cx="256" cy="125" r="20"/>
        <rect x="252" y="143" width="8" height="6"/>
        <path d="M 240 149 L 272 149 L 268 170 L 244 170 Z"/>
        <path d="M 240 152 L 215 100 L 222 92 L 248 145 Z"/>
        <path d="M 272 152 L 297 100 L 290 92 L 264 145 Z"/>
        <circle cx="218" cy="96" r="6"/>
        <circle cx="294" cy="96" r="6"/>
      </g>
    </svg>
  );
}

// PR detection: check if a session set new PRs vs all previous sessions of same type
const computePRs = (sessions) => {
  const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const prsBySession = {};

  // Track best by type+weight bucket
  const bestTotalByWeight = { A: {}, B: {}, C: {} };
  const bestLevelByWeightLevel = { A: {}, B: {}, C: {} };
  let v3ResetDone = false;

  for (const s of sorted) {
    if (!SET_TYPES.includes(s.type)) continue;
    // Program v3 boundary: records restart from scratch (old program is incomparable)
    if (!v3ResetDone && isV3(s)) {
      for (const t of SET_TYPES) {
        bestTotalByWeight[t] = {};
        bestLevelByWeightLevel[t] = {};
      }
      v3ResetDone = true;
    }
    const t = s.type;
    const labels = getPyramidConfig(t).labels;
    const prs = [];
    const total = getTotal(s);
    const w = s.dumbbellWeight;

    // Total time PR (per type + weight)
    if (total != null && w != null) {
      const key = `${w}`;
      if (bestTotalByWeight[t][key] == null || total < bestTotalByWeight[t][key]) {
        if (bestTotalByWeight[t][key] != null) {
          prs.push({ type: 'total', label: `Record Set ${t} ${w}kg`, value: total, prev: bestTotalByWeight[t][key] });
        }
        bestTotalByWeight[t][key] = total;
      }
    }

    // Level splits PRs (per type + weight + level)
    if (s.levelTimes && w != null) {
      s.levelTimes.forEach((time, idx) => {
        if (time == null) return;
        const key = `${w}_${idx}`;
        if (bestLevelByWeightLevel[t][key] == null || time < bestLevelByWeightLevel[t][key]) {
          if (bestLevelByWeightLevel[t][key] != null) {
            prs.push({ type: 'level', label: `Record ${labels[idx]} Set ${t} (${w}kg)`, value: time, prev: bestLevelByWeightLevel[t][key] });
          }
          bestLevelByWeightLevel[t][key] = time;
        }
      });
    }

    if (prs.length > 0) prsBySession[s.id] = prs;
  }

  // If no v3 session exists yet, current records must still be empty (v3-only view)
  if (!v3ResetDone) {
    for (const t of SET_TYPES) {
      bestTotalByWeight[t] = {};
      bestLevelByWeightLevel[t] = {};
    }
  }

  return { prsBySession, bestTotalByWeight, bestLevelByWeightLevel };
};

// Get level records (best split per level per type+weight) — program v3 only
const computeLevelRecords = (sessions) => {
  const records = { A: {}, B: {}, C: {} }; // {type: {weight: {levelIdx: {time, date, code}}}}
  for (const s of sessions) {
    if (!SET_TYPES.includes(s.type) || !isV3(s) || !s.levelTimes || s.dumbbellWeight == null) continue;
    const t = s.type;
    const w = s.dumbbellWeight;
    if (!records[t][w]) records[t][w] = {};
    s.levelTimes.forEach((time, idx) => {
      if (time == null) return;
      if (!records[t][w][idx] || time < records[t][w][idx].time) {
        records[t][w][idx] = { time: time, date: s.date, code: s.code };
      }
    });
  }
  return records;
};

// Baseline: median split per level over the last 3 COMPLETE v3 sessions (same type+weight).
// This is the "normal rhythm" reference — friendlier than all-time records.
const computeLevelBaselines = (sessions) => {
  const baselines = { A: {}, B: {}, C: {} }; // {type: {weight: {levelIdx: {time}}, _n: sessionsUsed}}
  for (const t of SET_TYPES) {
    const count = getPyramidConfig(t).count;
    const complete = sessions
      .filter(s => s.type === t && isV3(s) && s.dumbbellWeight != null
        && Array.isArray(s.levelTimes) && s.levelTimes.length === count && s.levelTimes.every(x => x != null))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    const byWeight = {};
    for (const s of complete) {
      if (!byWeight[s.dumbbellWeight]) byWeight[s.dumbbellWeight] = [];
      byWeight[s.dumbbellWeight].push(s);
    }
    for (const w of Object.keys(byWeight)) {
      const last3 = byWeight[w].slice(-3);
      const levels = {};
      for (let idx = 0; idx < count; idx++) {
        const vals = last3.map(s => s.levelTimes[idx]).sort((a, b) => a - b);
        const med = vals.length % 2 === 1
          ? vals[(vals.length - 1) / 2]
          : (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2;
        levels[idx] = { time: med };
      }
      baselines[t][w] = levels;
      baselines[t][w]._n = last3.length;
    }
  }
  return baselines;
};

// Weekly adherence: ISO weeks (Mon-Sun). Complete week = at least one A + one B + one C.
const computeWeeklyAdherence = (sessions, numWeeks = 8) => {
  const now = new Date();
  const dayOffset = (now.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - dayOffset);
  const weeks = [];
  for (let i = numWeeks - 1; i >= 0; i--) {
    const start = new Date(monday);
    start.setDate(monday.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const inWeek = sessions.filter(s => {
      const d = new Date(s.date + 'T12:00:00');
      return d >= start && d < end;
    });
    const types = SET_TYPES.filter(t => inWeek.some(s => s.type === t));
    weeks.push({
      label: `${start.getDate()}/${start.getMonth() + 1}`,
      types,
      complete: types.length === 3,
      isCurrent: i === 0
    });
  }
  // Streak of consecutive complete weeks (current in-progress week doesn't break it)
  let streak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    const wk = weeks[i];
    if (wk.isCurrent && !wk.complete) continue;
    if (wk.complete) streak++;
    else break;
  }
  return { weeks, streak };
};

// Fatigue index: mean(descent split / ascent split) over paired levels of a complete session.
// 1.00 = same speed on the way down; higher = slowing in the 2nd half (endurance marker).
const computeFatigueIndex = (s) => {
  const count = getPyramidConfig(s.type).count;
  if (!Array.isArray(s.levelTimes) || s.levelTimes.length !== count || s.levelTimes.some(x => x == null)) return null;
  const ratios = [];
  for (let i = 0; i < Math.floor(count / 2); i++) {
    const asc = s.levelTimes[i];
    const desc = s.levelTimes[count - 1 - i];
    if (asc > 0) ratios.push(desc / asc);
  }
  if (ratios.length === 0) return null;
  return ratios.reduce((a, b) => a + b, 0) / ratios.length;
};

// Suggest next session code based on last session
const suggestNextCode = (sessions) => {
  // Find most recent session with a code
  const sorted = [...sessions]
    .filter(s => s.code)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  if (sorted.length === 0) return '';
  const lastCode = sorted[0].code;

  // Special case: Restart2026 -> S1s1-2026
  const restartMatch = lastCode.match(/^Restart(\d{4})$/);
  if (restartMatch) return `S1s1-${restartMatch[1]}`;

  // General pattern: S{week}s{session}(-{year})?
  const match = lastCode.match(/^S(\d+)s(\d+)(-\d{4})?$/);
  if (match) {
    const week = parseInt(match[1], 10);
    const session = parseInt(match[2], 10);
    const yearSuffix = match[3] || '';
    return `S${week}s${session + 1}${yearSuffix}`;
  }
  return '';
};


const movingAverage = (data, key, window = 4) => {
  return data.map((d, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    const values = slice.map(x => x[key]).filter(v => v != null);
    if (values.length === 0) return { ...d, ma: null };
    return { ...d, ma: values.reduce((a, b) => a + b, 0) / values.length };
  });
};

// Compute fitness score (0-10) for each session based on context
const computeFitnessScores = (sessions) => {
  const sorted = [...sessions]
    .filter(s => SET_TYPES.includes(s.type) && getTotal(s) != null)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const scores = {};
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const total = getTotal(s);
    const w = s.dumbbellWeight;

    // Last 5 sessions: same type, same weight, same PROGRAM ERA (v2/v3 never mixed)
    const prevSame = sorted.slice(0, i)
      .filter(p => p.type === s.type && p.dumbbellWeight === w && sameEra(p, s))
      .slice(-5);
    if (prevSame.length < 2 || w == null) {
      scores[s.id] = { score: null, label: 'Première', expected: null, deltaPct: null };
      continue;
    }

    const expected = prevSame.reduce((sum, p) => sum + getTotal(p), 0) / prevSame.length;
    const deltaPct = ((expected - total) / expected) * 100; // positive = better

    // Map delta to 0-10: +3% = +1 point, centered on 5
    let scoreRaw = 5 + deltaPct / 3;
    scoreRaw = Math.max(0, Math.min(10, scoreRaw));

    // Days since last session of ANY type (recovery context)
    const prevSession = sorted[i - 1];
    const daysSince = prevSession ? Math.round((new Date(s.date) - new Date(prevSession.date)) / (1000 * 60 * 60 * 24)) : null;
    let context = '';
    if (daysSince != null) {
      if (daysSince > 21) {
        scoreRaw *= 0.85;
        context = 'reprise';
      } else if (daysSince < 2) {
        scoreRaw *= 0.95;
        context = 'rapproché';
      }
    }

    const score = Math.round(scoreRaw * 10) / 10;
    let label = 'Normal';
    if (score >= 7.5) label = 'Excellent';
    else if (score >= 6) label = 'Bonne forme';
    else if (score >= 4) label = 'Normal';
    else if (score >= 2.5) label = 'Difficile';
    else label = 'Très difficile';

    scores[s.id] = { score, label, expected, deltaPct, daysSince, context };
  }
  return scores;
};

// Detect "eras" (periods separated by gaps of 14+ days)
const computeEras = (sessions) => {
  const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sorted.length === 0) return [];

  const eras = [];
  let currentEra = { start: sorted[0].date, end: sorted[0].date, sessions: [sorted[0]] };

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const days = (new Date(curr.date) - new Date(prev.date)) / (1000 * 60 * 60 * 24);

    if (days >= 14) {
      // End current era, start new one
      currentEra.end = prev.date;
      eras.push(currentEra);
      currentEra = { start: curr.date, end: curr.date, sessions: [curr] };
    } else {
      currentEra.sessions.push(curr);
      currentEra.end = curr.date;
    }
  }
  eras.push(currentEra);

  // Compute stats per era
  return eras.map((era, idx) => {
    const totalsA = era.sessions.filter(s => s.type === 'A').map(getTotal).filter(t => t != null);
    const avgTotal = totalsA.length > 0 ? totalsA.reduce((a, b) => a + b, 0) / totalsA.length : null;
    const bestTotal = totalsA.length > 0 ? Math.min(...totalsA) : null;
    const startDate = new Date(era.start);
    const endDate = new Date(era.end);
    const durationDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    return {
      ...era,
      index: idx + 1,
      avgTotal,
      bestTotal,
      sessionCount: era.sessions.length,
      durationDays,
      sessionsPerWeek: durationDays > 0 ? (era.sessions.length / durationDays * 7) : 0
    };
  });
};

export default function WorkoutTracker() {
  const [tab, setTab] = useState('dashboard');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showSeedPrompt, setShowSeedPrompt] = useState(false);
  const [showStopwatch, setShowStopwatch] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showExportReminder, setShowExportReminder] = useState(false);

  // Fix horizontal overflow on iPhone Safari globally
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflowX = 'hidden';
      document.body.style.maxWidth = '100vw';
      document.documentElement.style.overflowX = 'hidden';
      document.documentElement.style.maxWidth = '100vw';

      // Inject CSS to hide webkit scrollbars on scrollable button rows
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        [data-scroll-row]::-webkit-scrollbar { display: none; }
        [data-scroll-row] { -ms-overflow-style: none; scrollbar-width: none; }
      `;
      document.head.appendChild(styleEl);
      return () => { document.head.removeChild(styleEl); };
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await window.storage.get('sessions');
        if (result && result.value) {
          const parsed = JSON.parse(result.value);
          setSessions(parsed);
          // Check if export reminder should show
          checkExportReminder(parsed);
          // Auto-seed disabled for clean public experience
          if (parsed.length === 0 && typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('seed') === 'mannek') {
              setShowSeedPrompt(true);
            }
          }
        } else {
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('seed') === 'mannek') {
              setShowSeedPrompt(true);
            }
          }
        }
      } catch (err) {
        // Silent fail
      }
      setLoading(false);
    };
    load();
  }, []);

  // Export reminder logic: show banner if 5+ sessions since last export
  const checkExportReminder = async (sessionsList) => {
    try {
      const lastExportData = await window.storage.get('lastExportCount');
      const lastCount = lastExportData ? parseInt(lastExportData.value, 10) : 0;
      const currentCount = sessionsList.length;
      const sessionsSinceExport = currentCount - lastCount;
      if (sessionsSinceExport >= 5) {
        setShowExportReminder(true);
      }
    } catch (e) { /* silent */ }
  };

  const saveSessions = async (newSessions) => {
    setSessions(newSessions);
    try {
      await window.storage.set('sessions', JSON.stringify(newSessions));
      // Check export reminder after each save
      checkExportReminder(newSessions);
    } catch (err) {
      console.error('Save failed', err);
    }
  };

  const loadSeed = () => {
    const seeded = SEED_DATA.map((s, i) => ({ ...s, id: `seed-${i}-${Date.now()}` }));
    saveSessions(seeded);
    setShowSeedPrompt(false);
  };

  const skipSeed = () => setShowSeedPrompt(false);

  const addSession = (session) => {
    const newSessions = [...sessions, { ...session, id: Date.now().toString() }];
    newSessions.sort((a, b) => new Date(a.date) - new Date(b.date));
    saveSessions(newSessions);
    setShowForm(false);
    setEditingId(null);
  };

  const updateSession = (id, updated) => {
    const newSessions = sessions.map(s => s.id === id ? { ...updated, id } : s);
    newSessions.sort((a, b) => new Date(a.date) - new Date(b.date));
    saveSessions(newSessions);
    setShowForm(false);
    setEditingId(null);
  };

  const deleteSession = (id) => {
    if (!confirm('Supprimer cette séance ?')) return;
    saveSessions(sessions.filter(s => s.id !== id));
  };

  const exportJSON = async () => {
    const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    // Mark this count as the last exported count
    try {
      await window.storage.set('lastExportCount', String(sessions.length));
      setShowExportReminder(false);
    } catch (e) { /* silent */ }
  };

  const exportCSV = () => {
    const headers = ['date', 'code', 'type', 'dumbbellWeight', 'bodyweight', 'totalTime',
      ...PYRAMID_LEVELS.map((l, i) => `lvl_${i + 1}_${LEVEL_LABELS[i]}`),
      'preNotes', 'notes'];
    const rows = sessions.map(s => [
      s.date,
      s.code || '',
      s.type,
      s.dumbbellWeight ?? '',
      s.bodyweight ?? '',
      s.totalTime != null ? formatTime(s.totalTime) : '',
      ...PYRAMID_LEVELS.map((_, i) => s.levelTimes?.[i] != null ? s.levelTimes[i].toFixed(2) : ''),
      (s.preNotes || '').replace(/"/g, '""'),
      (s.notes || '').replace(/"/g, '""')
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const importJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          alert('Format invalide : le fichier doit contenir un tableau de séances.');
          return;
        }
        // Validate structure
        const valid = parsed.every(s => s && typeof s === 'object' && s.date && s.type);
        if (!valid) {
          alert('Format invalide : chaque séance doit avoir au minimum une date et un type.');
          return;
        }
        const merge = sessions.length > 0 && confirm(
          `Tu as déjà ${sessions.length} séance${sessions.length > 1 ? 's' : ''} dans l'app.\n\n` +
          `OK = Fusionner avec les ${parsed.length} séances importées (doublons écrasés par date+code)\n` +
          `Annuler = Remplacer entièrement par les ${parsed.length} séances importées`
        );
        let newSessions;
        if (merge) {
          // Merge: keep existing unless imported has same date+code
          const importedKeys = new Set(parsed.map(s => `${s.date}_${s.code || ''}`));
          const existingKept = sessions.filter(s => !importedKeys.has(`${s.date}_${s.code || ''}`));
          newSessions = [...existingKept, ...parsed.map((s, i) => ({ ...s, id: s.id || `import-${Date.now()}-${i}` }))];
        } else {
          newSessions = parsed.map((s, i) => ({ ...s, id: s.id || `import-${Date.now()}-${i}` }));
        }
        newSessions.sort((a, b) => new Date(a.date) - new Date(b.date));
        await saveSessions(newSessions);
        // Reset export reminder counter since we just imported
        try {
          await window.storage.set('lastExportCount', String(newSessions.length));
          setShowExportReminder(false);
        } catch (e) { /* silent */ }
        alert(`Import réussi : ${newSessions.length} séances en base.`);
      } catch (err) {
        alert('Erreur lors de l\'import : ' + err.message);
      }
    };
    input.click();
  };

  const resetAll = () => {
    if (!confirm('Effacer toutes les données ?')) return;
    saveSessions([]);
    setShowSeedPrompt(true);
  };

  // Compute PRs once for all views
  const { prsBySession, bestTotalByWeight, bestLevelByWeightLevel } = useMemo(
    () => computePRs(sessions),
    [sessions]
  );

  const levelRecords = useMemo(() => computeLevelRecords(sessions), [sessions]);
  const levelBaselines = useMemo(() => computeLevelBaselines(sessions), [sessions]);
  const fitnessScores = useMemo(() => computeFitnessScores(sessions), [sessions]);
  const eras = useMemo(() => computeEras(sessions), [sessions]);

  // Get last session for "compare to previous" hint in form
  const getLastSimilarSession = (type, weight) => {
    return [...sessions]
      .filter(s => s.type === type && s.dumbbellWeight === weight)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  };

  if (loading) {
    return <div style={styles.loading}><div style={styles.loadingDot}></div></div>;
  }

  const editingSession = editingId ? sessions.find(s => s.id === editingId) : null;

  return (
    <div style={styles.app}>
      <style>{globalCSS}</style>

      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}><PyramidLogo size={24} color="#0a0a0a" accentColor="#ffc94d" /></div>
          <div>
            <h1 style={styles.title}>PYRAMID</h1>
            <p style={styles.subtitle}>training analytics v2</p>
          </div>
        </div>
        <div style={styles.headerRight} data-scroll-row>
          <button style={styles.iconBtn} onClick={resetAll} title="Reset"><Trash2 size={14} /></button>
          <button style={styles.iconBtn} onClick={importJSON} title="Importer JSON"><Upload size={14} /></button>
          <button style={styles.iconBtn} onClick={exportCSV} title="Export CSV"><Download size={16} /></button>
          <button style={styles.iconBtn} onClick={exportJSON} title="Export JSON" aria-label="Export JSON">
            <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>JSON</span>
          </button>
          <button style={styles.iconBtn} onClick={() => setShowAbout(true)} title="À propos">
            <Info size={14} />
          </button>
          <button style={styles.stopwatchBtn} onClick={() => setShowStopwatch(true)} title="Démarrer chrono">
            <Timer size={16} /> Chrono
          </button>
          <button style={styles.primaryBtn} onClick={() => { setEditingId(null); setShowForm(true); }}>
            <Plus size={16} /> Séance
          </button>
        </div>
      </header>

      <nav style={styles.nav} data-scroll-row>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'records', label: 'Records', icon: Trophy },
          { id: 'calendar', label: 'Calendrier', icon: Calendar },
          { id: 'history', label: 'Historique', icon: Activity },
          { id: 'analysis', label: 'Analyse', icon: TrendingUp },
          { id: 'program', label: 'Programme', icon: Dumbbell }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              style={{ ...styles.navBtn, ...(tab === t.id ? styles.navBtnActive : {}) }}
              onClick={() => setTab(t.id)}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </nav>

      <main style={styles.main}>
        {tab === 'dashboard' && <Dashboard sessions={sessions} prsBySession={prsBySession} fitnessScores={fitnessScores} />}
        {tab === 'records' && <Records sessions={sessions} levelRecords={levelRecords} bestTotalByWeight={bestTotalByWeight} />}
        {tab === 'calendar' && <CalendarView sessions={sessions} prsBySession={prsBySession} />}
        {tab === 'history' && (
          <History
            sessions={sessions}
            prsBySession={prsBySession}
            fitnessScores={fitnessScores}
            onEdit={(id) => { setEditingId(id); setShowForm(true); }}
            onDelete={deleteSession}
          />
        )}
        {tab === 'analysis' && <Analysis sessions={sessions} eras={eras} fitnessScores={fitnessScores} />}
        {tab === 'program' && <Program />}
      </main>

      {showSeedPrompt && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, maxWidth: 480 }}>
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Database size={36} style={{ color: '#ff6b35', margin: '0 auto 16px' }} />
              <h2 style={styles.modalTitle}>Charger 27 séances ?</h2>
              <p style={{ color: '#888', fontSize: 13, lineHeight: 1.6, marginTop: 16 }}>
                Tout l'historique de novembre 2025 à mai 2026.
              </p>
              <div style={{ ...styles.formActions, justifyContent: 'center', marginTop: 24 }}>
                <button style={styles.secondaryBtn} onClick={skipSeed}>Plus tard</button>
                <button style={styles.primaryBtn} onClick={loadSeed}>Charger</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <SessionForm
          session={editingSession}
          onSave={editingSession ? (data) => updateSession(editingSession.id, data) : addSession}
          onCancel={() => { setShowForm(false); setEditingId(null); }}
          getLastSimilar={getLastSimilarSession}
        />
      )}

      {showStopwatch && (
        <Stopwatch
          onClose={() => setShowStopwatch(false)}
          onSave={(data) => {
            addSession(data);
            setShowStopwatch(false);
          }}
          suggestedCode={suggestNextCode(sessions)}
          setCountsSoFar={{ A: sessions.filter(s => s.type === 'A').length, B: sessions.filter(s => s.type === 'B').length, C: sessions.filter(s => s.type === 'C').length }}
          levelRecords={levelRecords}
          levelBaselines={levelBaselines}
        />
      )}

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      {showExportReminder && (
        <div style={styles.exportReminder} onClick={(e) => { if (e.target === e.currentTarget) setShowExportReminder(false); }}>
          <div style={styles.exportReminderInner}>
            <AlertTriangle size={20} style={{ color: '#ffc94d', flexShrink: 0 }} />
            <div style={styles.exportReminderText}>
              <strong>Pense à sauvegarder tes données</strong>
              <div style={styles.exportReminderSub}>
                Tu as fait plusieurs séances depuis ton dernier export JSON.
              </div>
            </div>
            <div style={styles.exportReminderActions}>
              <button
                style={{ ...styles.iconBtnSmall, borderColor: '#ffc94d', color: '#ffc94d', background: 'rgba(255,201,77,0.1)' }}
                onClick={() => { exportJSON(); }}
              >
                <Download size={12} /> Export
              </button>
              <button
                style={styles.iconBtnSmall}
                onClick={() => setShowExportReminder(false)}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      <footer style={styles.footer}>
        <span>Mannek · 2026</span>
      </footer>
    </div>
  );
}

// =============== DASHBOARD ===============
function Dashboard({ sessions, prsBySession, fitnessScores }) {
  const [activeSet, setActiveSet] = useState('A');
  const filteredSessions = sessions.filter(s => s.type === activeSet);
  const setColor = getSetColor(activeSet);
  const config = getPyramidConfig(activeSet);
  const adherence = useMemo(() => computeWeeklyAdherence(sessions), [sessions]);

  if (sessions.length === 0) {
    return (
      <div style={styles.emptyState}>
        <Dumbbell size={48} strokeWidth={1.5} style={{ opacity: 0.3 }} />
        <h2 style={styles.emptyTitle}>Aucune séance</h2>
        <p style={styles.emptyText}>Ajoute ta première séance.</p>
      </div>
    );
  }

  const lastSession = filteredSessions[filteredSessions.length - 1];
  const prevSession = filteredSessions[filteredSessions.length - 2];
  const lastTotal = lastSession ? getTotal(lastSession) : null;
  const prevTotal = prevSession ? getTotal(prevSession) : null;
  const timeDelta = lastTotal != null && prevTotal != null ? lastTotal - prevTotal : null;

  const allTotals = filteredSessions.map(getTotal).filter(t => t != null);
  const bestTime = allTotals.length > 0 ? Math.min(...allTotals) : null;

  // Streak: count consecutive weeks with at least one session
  const computeStreak = () => {
    if (sessions.length === 0) return 0;
    const dates = [...new Set(sessions.map(s => s.date))].sort();
    const lastDate = new Date(dates[dates.length - 1]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastDate.setHours(0, 0, 0, 0);
    const daysSinceLast = (today - lastDate) / (1000 * 60 * 60 * 24);
    if (daysSinceLast > 14) return 0; // streak broken if no session in 2 weeks
    // Count consecutive weeks with at least one session
    let weeks = 0;
    let cursor = new Date(lastDate);
    let weekHasSession = true;
    while (weekHasSession) {
      weeks++;
      const weekStart = new Date(cursor);
      weekStart.setDate(weekStart.getDate() - 7);
      weekHasSession = sessions.some(s => {
        const d = new Date(s.date);
        return d > weekStart && d <= cursor;
      });
      cursor = weekStart;
    }
    return weeks;
  };
  const streakWeeks = computeStreak();

  // Evolution data with moving average (uses active set)
  const rawEvolution = filteredSessions
    .map(s => ({
      date: new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      total: getTotal(s),
      code: s.code,
      weight: s.dumbbellWeight
    }))
    .filter(d => d.total != null);
  const evolutionData = movingAverage(rawEvolution, 'total', 4);

  // Last session PRs and fitness score (active set)
  const lastPRs = lastSession ? prsBySession[lastSession.id] || [] : [];
  const lastScore = lastSession ? fitnessScores?.[lastSession.id] : null;

  // Get score color and emoji
  const getScoreColor = (score) => {
    if (score == null) return '#666';
    if (score >= 7.5) return '#7dd87d';
    if (score >= 6) return '#a4d87d';
    if (score >= 4) return '#ffc94d';
    if (score >= 2.5) return '#e8a87a';
    return '#e88a8a';
  };

  return (
    <div style={styles.dashboard}>
      {/* Weekly adherence — global, independent of set toggle */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Adhérence hebdo</h3>
          <span style={styles.cardSubtitle}>objectif : A + B + C chaque semaine</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, color: adherence.streak > 0 ? '#7dd87d' : '#555', lineHeight: 1 }}>
            {adherence.streak}
          </div>
          <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4 }}>
            semaine{adherence.streak > 1 ? 's' : ''} complète{adherence.streak > 1 ? 's' : ''} d'affilée
            <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>Ta régularité est ton 1er levier de perf.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
          {adherence.weeks.map((wk, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                {SET_TYPES.map(t => (
                  <div key={t} style={{
                    width: 14, height: 14, borderRadius: 3,
                    background: wk.types.includes(t) ? getSetColor(t) : '#1a1a1a',
                    border: wk.types.includes(t) ? 'none' : '1px solid #252525',
                    opacity: wk.isCurrent && !wk.types.includes(t) ? 0.6 : 1
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 8, color: wk.isCurrent ? '#aaa' : '#555', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                {wk.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Set A/B/C toggle */}
      <div style={styles.setToggle}>
        {SET_TYPES.map(t => (
          <button
            key={t}
            style={{ ...styles.setToggleBtn, ...(activeSet === t ? { ...styles.setToggleBtnActive, background: getSetColor(t), color: '#0a0a0a' } : {}) }}
            onClick={() => setActiveSet(t)}
          >
            Set {t} · {sessions.filter(s => s.type === t).length}
          </button>
        ))}
      </div>

      {filteredSessions.length === 0 ? (
        <div style={styles.emptyState}>
          <Dumbbell size={48} strokeWidth={1.5} style={{ opacity: 0.3 }} />
          <h2 style={styles.emptyTitle}>Aucune séance Set {activeSet}</h2>
          <p style={styles.emptyText}>Lance une séance Set {activeSet} avec le chrono.</p>
        </div>
      ) : (
        <>
      {/* PR celebration banner */}
      {lastPRs.length > 0 && (
        <div style={styles.prBanner}>
          <div style={styles.prBannerLeft}>
            <Trophy size={20} style={{ color: '#ffc94d' }} />
            <div>
              <div style={styles.prBannerTitle}>
                {lastPRs.length} record{lastPRs.length > 1 ? 's' : ''} sur ta dernière séance
              </div>
              <div style={styles.prBannerSub}>{lastSession.code || new Date(lastSession.date).toLocaleDateString('fr-FR')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Fitness score on last session */}
      {lastScore && lastScore.score != null && (
        <div style={{ ...styles.fitnessScoreBanner, borderColor: getScoreColor(lastScore.score) + '40' }}>
          <div style={styles.fitnessScoreLeft}>
            <div style={{ ...styles.fitnessScoreCircle, color: getScoreColor(lastScore.score), borderColor: getScoreColor(lastScore.score) }}>
              {lastScore.score}
            </div>
            <div>
              <div style={{ ...styles.fitnessScoreLabel, color: getScoreColor(lastScore.score) }}>
                {lastScore.label}{lastScore.context ? ` (${lastScore.context})` : ''}
              </div>
              <div style={styles.fitnessScoreSub}>
                Score de forme · dernière séance
                {lastScore.expected != null && (
                  <span style={{ color: '#666', marginLeft: 8 }}>
                    attendu : {formatTime(lastScore.expected)}
                    {lastScore.deltaPct != null && (
                      <span style={{ color: lastScore.deltaPct >= 0 ? '#7dd87d' : '#e88a8a' }}>
                        {' '}({lastScore.deltaPct >= 0 ? '+' : ''}{lastScore.deltaPct.toFixed(1)}%)
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={styles.kpiGrid}>
        <KPICard
          label="Séances"
          value={sessions.length}
          sub={`${setASessions.length} A · ${setBSessions.length} B`}
          icon={Activity}
        />
        <KPICard
          label="Dernier temps"
          value={lastTotal != null ? formatTime(lastTotal) : '—'}
          sub={timeDelta !== null ? `${timeDelta < 0 ? '↓' : '↑'} ${formatTime(Math.abs(timeDelta))}` : 'première'}
          subColor={timeDelta !== null ? (timeDelta < 0 ? '#7dd87d' : '#e88a8a') : null}
          icon={TrendingUp}
        />
        <KPICard
          label="Meilleur temps"
          value={bestTime != null ? formatTime(bestTime) : '—'}
          sub={`Set ${activeSet}`}
          icon={Target}
        />
        <KPICard
          label="Série active"
          value={streakWeeks > 0 ? `${streakWeeks}` : '—'}
          sub={streakWeeks > 0 ? `semaine${streakWeeks > 1 ? 's' : ''} consécutive${streakWeeks > 1 ? 's' : ''}` : 'pas active'}
          subColor={streakWeeks >= 4 ? '#7dd87d' : null}
          icon={Zap}
        />
      </div>

      {evolutionData.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Évolution Set {activeSet}</h3>
            <span style={styles.cardSubtitle}>brut + moyenne mobile (4)</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={evolutionData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#2a2a2a" />
              <XAxis dataKey="date" stroke="#888" style={{ fontSize: 11 }} />
              <YAxis stroke="#888" style={{ fontSize: 11 }} tickFormatter={formatTime} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 4, fontSize: 12 }}
                formatter={(v) => v != null ? formatTime(v) : '—'}
                labelStyle={{ color: '#aaa' }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke={setColor}
                strokeWidth={2}
                dot={{ fill: setColor, r: 3 }}
                activeDot={{ r: 5 }}
                name="Brut"
              />
              <Line
                type="monotone"
                dataKey="ma"
                stroke="#ffc94d"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                dot={false}
                name="Tendance (MA4)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {filteredSessions.some(s => s.levelTimes) && <LevelHeatmap sessions={filteredSessions} type={activeSet} />}
        </>
      )}
    </div>
  );
}

function KPICard({ label, value, sub, subColor, icon: Icon }) {
  return (
    <div style={styles.kpiCard}>
      <div style={styles.kpiHeader}>
        <span style={styles.kpiLabel}>{label}</span>
        <Icon size={14} style={{ opacity: 0.4 }} />
      </div>
      <div style={styles.kpiValue}>{value}</div>
      {sub && <div style={{ ...styles.kpiSub, color: subColor || '#666' }}>{sub}</div>}
    </div>
  );
}

function LevelHeatmap({ sessions, type = 'A' }) {
  const config = getPyramidConfig(type);
  const withSplits = sessions.filter(s => s.levelTimes && s.levelTimes.some(t => t != null));
  const recent = withSplits.slice(-10);

  const levelStats = config.levels.map((_, levelIdx) => {
    const times = recent.map(s => s.levelTimes?.[levelIdx]).filter(t => t != null);
    if (times.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...times), max: Math.max(...times) };
  });

  const getColor = (time, levelIdx) => {
    if (time == null) return '#0d0d0d';
    const { min, max } = levelStats[levelIdx];
    if (max === min) return '#3a3a3a';
    const ratio = (time - min) / (max - min);
    const r = Math.round(80 + ratio * 175);
    const g = Math.round(180 - ratio * 100);
    const b = 60;
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>Heatmap par niveau · Set {type}</h3>
        <span style={styles.cardSubtitle}>10 dernières · vert rapide · rouge lent</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.heatmap}>
          <thead>
            <tr>
              <th style={styles.heatmapDateHeader}>Séance</th>
              {config.levels.map((lvl, i) => (
                <th key={i} style={styles.heatmapHeader}>{lvl}</th>
              ))}
              <th style={styles.heatmapHeader}>Total</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((s) => {
              const total = getTotal(s);
              return (
                <tr key={s.id}>
                  <td style={styles.heatmapDate}>
                    <div>{new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</div>
                    <span style={styles.heatmapWeight}>
                      {s.code || ''} {s.dumbbellWeight ? `${s.dumbbellWeight}kg` : ''}
                    </span>
                  </td>
                  {config.levels.map((_, levelIdx) => {
                    const time = s.levelTimes?.[levelIdx];
                    return (
                      <td
                        key={levelIdx}
                        style={{ ...styles.heatmapCell, background: getColor(time, levelIdx) }}
                        title={time != null ? formatTime(time) : 'pas de donnée'}
                      >
                        {time != null ? formatTime(time) : '·'}
                      </td>
                    );
                  })}
                  <td style={styles.heatmapTotal}>{total != null ? formatTime(total) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============== RECORDS ===============
function Records({ sessions, levelRecords, bestTotalByWeight }) {
  const [activeSet, setActiveSet] = useState('A');

  const recordsForType = levelRecords[activeSet] || {};
  const bestForType = bestTotalByWeight[activeSet] || {};
  const weights = Object.keys(recordsForType).map(w => parseFloat(w)).sort();
  const config = getPyramidConfig(activeSet);
  const setColor = getSetColor(activeSet);

  const setACount = sessions.filter(s => s.type === 'A' && s.levelTimes).length;
  const setBCount = sessions.filter(s => s.type === 'B' && s.levelTimes).length;

  return (
    <div style={styles.dashboard}>
      {/* Set A/B/C toggle */}
      <div style={styles.setToggle}>
        {SET_TYPES.map(t => (
          <button
            key={t}
            style={{ ...styles.setToggleBtn, ...(activeSet === t ? { ...styles.setToggleBtnActive, background: getSetColor(t), color: '#0a0a0a' } : {}) }}
            onClick={() => setActiveSet(t)}
          >
            Set {t} · {sessions.filter(s => s.type === t && s.levelTimes).length}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 10, color: '#555', textAlign: 'center', marginTop: -8, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
        Records du programme v3 · depuis le 15 mai 2026
      </div>

      {weights.length === 0 ? (
        <div style={styles.emptyState}>
          <Trophy size={48} strokeWidth={1.5} style={{ opacity: 0.3 }} />
          <h2 style={styles.emptyTitle}>Pas encore de records Set {activeSet}</h2>
          <p style={styles.emptyText}>Ajoute des séances avec splits pour voir tes records.</p>
        </div>
      ) : (
        <>
      {/* Total time records */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Records temps total · Set {activeSet}</h3>
          <span style={styles.cardSubtitle}>par charge</span>
        </div>
        <div style={styles.recordsGrid}>
          {weights.map(w => {
            const best = bestForType[w];
            const session = sessions.find(s => s.type === activeSet && s.dumbbellWeight === w && getTotal(s) === best);
            return (
              <div key={w} style={styles.recordCard}>
                <div style={styles.recordCardLabel}>
                  {activeSet === 'A' ? `2 × ${w} kg` : `${w} kg (charge)`}
                </div>
                <div style={styles.recordCardValue}>{best != null ? formatTime(best) : '—'}</div>
                <div style={styles.recordCardMeta}>
                  {session?.code || ''} {session ? `· ${new Date(session.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ghost time = sum of best splits per level */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>👻 Temps fantôme · Set {activeSet}</h3>
          <span style={styles.cardSubtitle}>somme de tes meilleurs splits par niveau</span>
        </div>
        <p style={{ fontSize: 11, color: '#888', margin: '0 0 16px 0', lineHeight: 1.6 }}>
          Le temps que tu réaliserais si tu enchaînais tous tes meilleurs splits dans une même séance.
        </p>
        <div style={styles.recordsGrid}>
          {weights.map(w => {
            const recs = recordsForType[w];
            const splitsAvailable = config.levels.filter((_, idx) => recs[idx]).length;
            const ghostTotal = config.levels.reduce((sum, _, idx) => {
              return sum + (recs[idx]?.time || 0);
            }, 0);
            const realRecord = bestForType[w];
            const gain = realRecord != null && ghostTotal > 0 ? realRecord - ghostTotal : null;
            const gainPct = gain != null && realRecord ? (gain / realRecord) * 100 : null;
            const isComplete = splitsAvailable === config.count;

            return (
              <div key={w} style={styles.ghostCard}>
                <div style={styles.recordCardLabel}>
                  {activeSet === 'A' ? `2 × ${w} kg` : `${w} kg`}
                </div>
                <div style={styles.ghostValue}>
                  {ghostTotal > 0 ? formatTime(ghostTotal) : '—'}
                </div>
                <div style={styles.ghostMeta}>
                  {splitsAvailable}/{config.count} niveaux records
                  {!isComplete && <span style={{ color: '#e88a8a', marginLeft: 4 }}>· incomplet</span>}
                </div>
                {gain != null && gain > 0 && (
                  <div style={styles.ghostGain}>
                    <TrendingUp size={11} style={{ color: '#7dd87d' }} />
                    <span>
                      gain potentiel <strong>{formatTime(gain)}</strong>
                      {gainPct != null && <span style={{ color: '#666' }}> ({gainPct.toFixed(1)}%)</span>}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Level records per weight */}
      {weights.map(w => {
        const recs = recordsForType[w];
        return (
          <div key={w} style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Records par niveau · Set {activeSet} · {w}kg</h3>
              <span style={styles.cardSubtitle}>meilleur temps pour chaque tour</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.recordTable}>
                <thead>
                  <tr>
                    <th style={styles.recordTh}>Niveau</th>
                    {config.levels.map((lvl, i) => (
                      <th key={i} style={styles.recordThSmall}>{lvl}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={styles.recordTd}>Temps</td>
                    {config.levels.map((_, idx) => {
                      const r = recs[idx];
                      return (
                        <td key={idx} style={styles.recordTdSmall}>
                          {r ? <strong style={{ color: '#ffc94d' }}>{formatTime(r.time)}</strong> : <span style={{ color: '#444' }}>—</span>}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td style={{ ...styles.recordTd, fontSize: 9, color: '#666' }}>Date</td>
                    {config.levels.map((_, idx) => {
                      const r = recs[idx];
                      return (
                        <td key={idx} style={{ ...styles.recordTdSmall, fontSize: 8, color: '#666' }}>
                          {r ? new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : ''}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
        </>
      )}

      {/* Finisher progression (reps-based finishers, all sets) */}
      {(() => {
        const FINISHER_GOALS = {
          'ab-wheel': 'Palier : 6-8 séances par amplitude (50% → 75% → complète)',
          'dips-neg': 'Objectif : 8 négatives propres → dips complets aux anneaux',
          'calf-ecc': 'Objectif : 15 reps lentes et faciles par jambe'
        };
        const stats = {};
        sessions.filter(s => isV3(s) && s.plank?.sets).forEach(s => {
          const byFin = {};
          (s.plank.sets || []).forEach(r => {
            if (r.reps == null || !r.finisherId) return;
            if (!byFin[r.finisherId]) byFin[r.finisherId] = [];
            byFin[r.finisherId].push(r.reps);
          });
          Object.entries(byFin).forEach(([fid, arr]) => {
            if (!stats[fid]) stats[fid] = [];
            stats[fid].push({ date: s.date, avg: arr.reduce((a, b) => a + b, 0) / arr.length });
          });
        });
        const finisherIds = Object.keys(stats);
        if (finisherIds.length === 0) return null;
        return (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Progression finishers</h3>
              <span style={styles.cardSubtitle}>reps validées en fin de séance</span>
            </div>
            {finisherIds.map(fid => {
              const fin = getFinisherById(fid);
              const entries = stats[fid].sort((a, b) => new Date(a.date) - new Date(b.date));
              const last3 = entries.slice(-3);
              const avgLast3 = Math.round((last3.reduce((s, e) => s + e.avg, 0) / last3.length) * 10) / 10;
              return (
                <div key={fid} style={{ padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{fin.name}</span>
                    <span style={{ fontSize: 12, color: '#888', fontFamily: "'JetBrains Mono', monospace" }}>
                      {entries.length} séance{entries.length > 1 ? 's' : ''} · moy. {avgLast3} reps
                    </span>
                  </div>
                  {FINISHER_GOALS[fid] && (
                    <div style={{ fontSize: 10, color: '#666', marginTop: 3 }}>{FINISHER_GOALS[fid]}</div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

// =============== CALENDAR VIEW ===============
function CalendarView({ sessions, prsBySession }) {
  if (sessions.length === 0) {
    return (
      <div style={styles.emptyState}>
        <Calendar size={48} strokeWidth={1.5} style={{ opacity: 0.3 }} />
        <h2 style={styles.emptyTitle}>Pas encore de séances</h2>
      </div>
    );
  }

  // Group sessions by month
  const months = {};
  sessions.forEach(s => {
    const d = new Date(s.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!months[key]) months[key] = { year: d.getFullYear(), month: d.getMonth(), sessions: [] };
    months[key].sessions.push(s);
  });

  // Get range of months from first to last session
  const sortedKeys = Object.keys(months).sort();
  const firstDate = new Date(sessions[0].date);
  const lastDate = new Date();
  const allMonths = [];
  let cursor = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  while (cursor <= lastDate) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    allMonths.push({
      key,
      year: cursor.getFullYear(),
      month: cursor.getMonth(),
      sessions: months[key]?.sessions || []
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  return (
    <div style={styles.dashboard}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Calendrier d'activité</h3>
          <span style={styles.cardSubtitle}>orange = A · bleu = B · vert = C · violet = multi · ◣ jaune = PR</span>
        </div>
        <div style={styles.calendarGrid}>
          {allMonths.map(({ key, year, month, sessions: monthSessions }) => {
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Mon = 0
            const sessionsByDay = {};
            monthSessions.forEach(s => {
              const day = new Date(s.date).getDate();
              if (!sessionsByDay[day]) sessionsByDay[day] = [];
              sessionsByDay[day].push(s);
            });

            return (
              <div key={key} style={styles.calMonth}>
                <div style={styles.calMonthTitle}>
                  {monthNames[month]} {year}
                  <span style={styles.calMonthCount}>{monthSessions.length} séance{monthSessions.length > 1 ? 's' : ''}</span>
                </div>
                <div style={styles.calDayLabels}>
                  {dayLabels.map((d, i) => <div key={i} style={styles.calDayLabel}>{d}</div>)}
                </div>
                <div style={styles.calDays}>
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} style={styles.calEmpty} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const daySessions = sessionsByDay[day] || [];
                    const dayTypes = SET_TYPES.filter(t => daySessions.some(s => s.type === t));
                    const hasPR = daySessions.some(s => prsBySession[s.id]?.length > 0);
                    let bg = '#1a1a1a';
                    if (dayTypes.length > 1) bg = '#9b6dff';
                    else if (dayTypes.length === 1) bg = getSetColor(dayTypes[0]);
                    const titleParts = daySessions.map(s => `${s.type}${s.code ? ' ' + s.code : ''}: ${formatTime(getTotal(s))}${prsBySession[s.id]?.length ? ' 🏆' : ''}`);
                    return (
                      <div
                        key={day}
                        style={{
                          ...styles.calDay,
                          background: bg,
                          color: bg === '#1a1a1a' ? '#444' : '#fff',
                          position: 'relative'
                        }}
                        title={titleParts.length > 0 ? titleParts.join('\n') : `${day} ${monthNames[month]}`}
                      >
                        {day}
                        {hasPR && (
                          <div style={styles.calPRTriangle} title="Record battu ce jour-là" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============== HISTORY ===============
function History({ sessions, prsBySession, fitnessScores, onEdit, onDelete }) {
  if (sessions.length === 0) {
    return <div style={styles.emptyState}><p>Pas encore de séance.</p></div>;
  }

  const reversed = [...sessions].reverse();

  const getScoreColor = (score) => {
    if (score == null) return '#666';
    if (score >= 7.5) return '#7dd87d';
    if (score >= 6) return '#a4d87d';
    if (score >= 4) return '#ffc94d';
    if (score >= 2.5) return '#e8a87a';
    return '#e88a8a';
  };

  return (
    <div style={styles.dashboard}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Historique</h3>
          <span style={styles.cardSubtitle}>{sessions.length} séances · 🏆 = record · score de forme à droite</span>
        </div>
        <div style={styles.sessionList}>
          {reversed.map(s => {
            const total = getTotal(s);
            const prs = prsBySession[s.id] || [];
            const fScore = fitnessScores?.[s.id];
            return (
              <div key={s.id} style={styles.sessionRow}>
                <div style={{ ...styles.sessionType, color: getSetColor(s.type) }}>{s.type}</div>
                <div style={styles.sessionInfo}>
                  <div style={styles.sessionDate}>
                    {s.code && <span style={{ color: '#ff6b35', marginRight: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{s.code}</span>}
                    {new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}
                    {prs.length > 0 && (
                      <span title={prs.map(p => p.label).join('\n')} style={{ marginLeft: 8, color: '#ffc94d' }}>
                        🏆 {prs.length}
                      </span>
                    )}
                  </div>
                  <div style={styles.sessionMeta}>
                    {total != null && <span>⏱ {formatTime(total)}</span>}
                    {s.dumbbellWeight && <span>🏋 {s.dumbbellWeight}kg</span>}
                    {s.bodyweight && <span>⚖ {s.bodyweight}kg</span>}
                    {s.preNotes && <span style={{ opacity: 0.6 }} title={`Avant: ${s.preNotes}`}>📝</span>}
                    {s.notes && <span style={{ opacity: 0.6, fontStyle: 'italic' }}>· {s.notes}</span>}
                  </div>
                </div>
                {fScore && fScore.score != null && (
                  <div
                    style={{
                      ...styles.miniScore,
                      color: getScoreColor(fScore.score),
                      borderColor: getScoreColor(fScore.score) + '60'
                    }}
                    title={`${fScore.label}${fScore.context ? ' (' + fScore.context + ')' : ''} · attendu ${formatTime(fScore.expected)}`}
                  >
                    {fScore.score}
                  </div>
                )}
                <div style={styles.sessionActions}>
                  <button style={styles.iconBtnSmall} onClick={() => onEdit(s.id)}>Éditer</button>
                  <button style={styles.iconBtnSmallDanger} onClick={() => onDelete(s.id)}><Trash2 size={12} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============== ANALYSIS ===============
function Analysis({ sessions, eras, fitnessScores }) {
  const [activeSet, setActiveSet] = useState('A');
  const setColor = getSetColor(activeSet);
  const config = getPyramidConfig(activeSet);

  const filteredSessions = sessions.filter(s => s.type === activeSet);
  const withTotals = filteredSessions.filter(s => getTotal(s) != null);
  const setACount = sessions.filter(s => s.type === 'A').length;
  const setBCount = sessions.filter(s => s.type === 'B').length;

  const renderToggle = () => (
    <div style={styles.setToggle}>
      {SET_TYPES.map(t => (
        <button
          key={t}
          style={{ ...styles.setToggleBtn, ...(activeSet === t ? { ...styles.setToggleBtnActive, background: getSetColor(t), color: '#0a0a0a' } : {}) }}
          onClick={() => setActiveSet(t)}
        >
          Set {t} · {sessions.filter(s => s.type === t).length}
        </button>
      ))}
    </div>
  );

  if (withTotals.length < 2) {
    return (
      <div style={styles.dashboard}>
        {renderToggle()}
        <div style={styles.emptyState}>
          <TrendingUp size={48} strokeWidth={1.5} style={{ opacity: 0.3 }} />
          <h2 style={styles.emptyTitle}>Pas assez de données Set {activeSet}</h2>
          <p style={styles.emptyText}>Il faut au moins 2 séances avec un temps total.</p>
        </div>
      </div>
    );
  }

  const withSplits = filteredSessions.filter(s => s.levelTimes && s.levelTimes.some(t => t != null));

  const avgPerLevel = config.levels.map((lvl, idx) => {
    const times = withSplits.map(s => s.levelTimes?.[idx]).filter(t => t != null);
    const avg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    return { level: config.labels[idx], avg: Math.round(avg * 10) / 10, count: times.length };
  }).filter(d => d.count > 0);

  // RELATIVE SPLITS: percentage of total time per level
  const minSplitsRequired = Math.floor(config.count * 0.8); // 80% of levels for valid analysis
  const fullSplitSessions = withSplits.filter(s => s.levelTimes.filter(t => t != null).length >= minSplitsRequired);
  const avgPercentPerLevel = config.levels.map((lvl, idx) => {
    const percentages = fullSplitSessions.map(s => {
      const t = s.levelTimes[idx];
      const total = s.levelTimes.reduce((a, b) => a + (b || 0), 0);
      if (t == null || total === 0) return null;
      return (t / total) * 100;
    }).filter(p => p != null);
    const avg = percentages.length > 0 ? percentages.reduce((a, b) => a + b, 0) / percentages.length : 0;
    return { level: config.labels[idx], pct: Math.round(avg * 10) / 10, count: percentages.length, reps: config.levels[idx] };
  }).filter(d => d.count > 0);

  // Reps "fairness"
  const totalReps = config.levels.reduce((a, b) => a + b, 0);
  const avgPercentWithFair = avgPercentPerLevel.map(d => ({
    ...d,
    fairPct: (d.reps / totalReps) * 100,
    overhead: d.pct - (d.reps / totalReps) * 100
  }));

  const correlationData = withTotals
    .filter(s => s.bodyweight)
    .map(s => ({
      bodyweight: s.bodyweight,
      time: getTotal(s),
      weight: s.dumbbellWeight,
      code: s.code
    }));

  // Group by weight for comparison
  const weightGroups = {};
  for (const s of withTotals) {
    const w = s.dumbbellWeight;
    if (w == null) continue;
    if (!weightGroups[w]) weightGroups[w] = [];
    weightGroups[w].push(s);
  }
  const sortedWeights = Object.keys(weightGroups).map(w => parseFloat(w)).sort();

  // Filter eras to active set
  const filteredEras = eras ? eras.map(era => ({
    ...era,
    sessions: era.sessions.filter(s => s.type === activeSet)
  })).filter(era => era.sessions.length > 0).map((era, idx) => {
    const totals = era.sessions.map(getTotal).filter(t => t != null);
    return {
      ...era,
      index: idx + 1,
      avgTotal: totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : null,
      bestTotal: totals.length > 0 ? Math.min(...totals) : null,
      sessionCount: era.sessions.length
    };
  }) : [];

  return (
    <div style={styles.dashboard}>
      {renderToggle()}

      {/* ERAS */}
      {filteredEras.length > 1 && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Ères d'entraînement · Set {activeSet}</h3>
            <span style={styles.cardSubtitle}>périodes séparées par 14+ jours sans séance</span>
          </div>
          <div style={styles.eraGrid}>
            {filteredEras.map((era) => {
              const startStr = new Date(era.start).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
              const endStr = new Date(era.end).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
              return (
                <div key={era.index} style={styles.eraCard}>
                  <div style={styles.eraIndex}>Ère {era.index}</div>
                  <div style={styles.eraDates}>{startStr} → {endStr}</div>
                  <div style={styles.eraStats}>
                    <div style={styles.eraStat}>
                      <span style={styles.eraStatVal}>{era.sessionCount}</span>
                      <span style={styles.eraStatLabel}>séances</span>
                    </div>
                    <div style={styles.eraStat}>
                      <span style={styles.eraStatVal}>{era.durationDays}</span>
                      <span style={styles.eraStatLabel}>jours</span>
                    </div>
                    <div style={styles.eraStat}>
                      <span style={styles.eraStatVal}>{era.sessionsPerWeek.toFixed(1)}</span>
                      <span style={styles.eraStatLabel}>séances/sem</span>
                    </div>
                  </div>
                  <div style={styles.eraPerf}>
                    <div>
                      <span style={styles.eraStatLabel}>Moyenne · </span>
                      <strong style={{ color: '#fff' }}>{era.avgTotal ? formatTime(era.avgTotal) : '—'}</strong>
                    </div>
                    <div>
                      <span style={styles.eraStatLabel}>Meilleur · </span>
                      <strong style={{ color: '#ffc94d' }}>{era.bestTotal ? formatTime(era.bestTotal) : '—'}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AVG PER LEVEL */}
      {avgPerLevel.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Temps moyen par niveau · Set {activeSet}</h3>
            <span style={styles.cardSubtitle}>en secondes absolues</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={avgPerLevel} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#2a2a2a" />
              <XAxis dataKey="level" stroke="#888" style={{ fontSize: 10 }} />
              <YAxis stroke="#888" style={{ fontSize: 11 }} tickFormatter={formatTime} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 4, fontSize: 12 }}
                formatter={(v) => formatTime(v)}
                labelStyle={{ color: '#aaa' }}
              />
              <Bar dataKey="avg" fill={setColor} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* RELATIVE SPLITS */}
      {avgPercentWithFair.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Splits relatifs (% du total) · Set {activeSet}</h3>
            <span style={styles.cardSubtitle}>{activeSet === 'A' ? 'orange' : 'bleu'} = part réelle · gris = part équitable selon les reps</span>
          </div>
          <p style={{ fontSize: 11, color: '#888', margin: '0 0 12px 0' }}>
            Si tous les niveaux te coûtaient le même temps par rep, chaque niveau prendrait une part proportionnelle à ses reps. L'écart entre les deux barres révèle où tu craques.
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={avgPercentWithFair} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#2a2a2a" />
              <XAxis dataKey="level" stroke="#888" style={{ fontSize: 10 }} />
              <YAxis stroke="#888" style={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 4, fontSize: 12 }}
                formatter={(v, name) => name === 'pct' ? `${v.toFixed(1)}% (réel)` : `${v.toFixed(1)}% (équitable)`}
                labelStyle={{ color: '#aaa' }}
              />
              <Bar dataKey="fairPct" fill="#3a3a3a" radius={[2, 2, 0, 0]} name="Part équitable" />
              <Bar dataKey="pct" fill={setColor} radius={[2, 2, 0, 0]} name="Part réelle" />
            </BarChart>
          </ResponsiveContainer>
          <div style={styles.overheadList}>
            <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
              Top 3 niveaux où tu ralentis le plus :
            </div>
            {[...avgPercentWithFair]
              .sort((a, b) => b.overhead - a.overhead)
              .slice(0, 3)
              .map((d, i) => (
                <div key={i} style={styles.overheadItem}>
                  <span style={{ color: '#ffc94d', fontWeight: 700, marginRight: 8 }}>#{i + 1}</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{d.level}</span>
                  <span style={{ color: '#888', marginLeft: 8 }}>
                    {d.reps} reps → {d.pct.toFixed(1)}% du temps total
                  </span>
                  <span style={{ color: '#e88a8a', marginLeft: 'auto' }}>
                    +{d.overhead.toFixed(1)}% vs équitable
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {correlationData.length >= 3 && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Poids de corps × Temps</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#2a2a2a" />
              <XAxis type="number" dataKey="bodyweight" name="Poids corps" unit="kg" stroke="#888" style={{ fontSize: 11 }} domain={['dataMin - 1', 'dataMax + 1']} />
              <YAxis type="number" dataKey="time" name="Temps" stroke="#888" style={{ fontSize: 11 }} tickFormatter={formatTime} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 4, fontSize: 12 }}
                formatter={(value, name) => name === 'Temps' ? formatTime(value) : value}
                labelStyle={{ color: '#aaa' }}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Scatter data={correlationData} fill="#ff6b35" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {sortedWeights.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Comparaison par charge · Set {activeSet}</h3>
            <span style={styles.cardSubtitle}>moyenne des temps par charge utilisée</span>
          </div>
          <div style={styles.compareGrid}>
            {sortedWeights.map(w => {
              const sList = weightGroups[w];
              const avg = sList.reduce((sum, s) => sum + getTotal(s), 0) / sList.length;
              return (
                <div key={w} style={styles.compareCard}>
                  <div style={styles.compareLabel}>
                    {activeSet === 'A' ? `2 × ${w} kg` : `${w} kg`}
                  </div>
                  <div style={styles.compareValue}>{formatTime(avg)}</div>
                  <div style={styles.compareSub}>{sList.length} séance{sList.length > 1 ? 's' : ''}</div>
                </div>
              );
            })}
            {sortedWeights.length >= 2 && (() => {
              const w1 = sortedWeights[0];
              const w2 = sortedWeights[sortedWeights.length - 1];
              const avg1 = weightGroups[w1].reduce((s, x) => s + getTotal(x), 0) / weightGroups[w1].length;
              const avg2 = weightGroups[w2].reduce((s, x) => s + getTotal(x), 0) / weightGroups[w2].length;
              return (
                <div style={styles.compareCard}>
                  <div style={styles.compareLabel}>Différence</div>
                  <div style={{ ...styles.compareValue, color: avg2 > avg1 ? '#e88a8a' : '#7dd87d' }}>
                    {avg2 > avg1 ? '+' : ''}{formatTime(Math.abs(avg2 - avg1))}
                  </div>
                  <div style={styles.compareSub}>{w1}kg vs {w2}kg</div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Fatigue index: descent vs ascent (complete sessions only) */}
      {(() => {
        const fatigueData = sessions
          .filter(s => s.type === activeSet)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .map(s => ({ code: s.code || s.date, fi: computeFatigueIndex(s), v3: isV3(s) }))
          .filter(d => d.fi != null)
          .map(d => ({ ...d, fi: Math.round(d.fi * 100) / 100 }));
        if (fatigueData.length < 2) return null;
        return (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Indice de fatigue</h3>
              <span style={styles.cardSubtitle}>descente ÷ montée à niveau égal · 1.00 = même vitesse</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={fatigueData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey="code" tick={{ fill: '#666', fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis domain={['dataMin - 0.05', 'dataMax + 0.05']} tick={{ fill: '#666', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 4, fontSize: 11 }}
                  labelStyle={{ color: '#888' }}
                />
                <ReferenceLine y={1} stroke="#7dd87d" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="fi" name="Indice" stroke={setColor} strokeWidth={2} dot={{ r: 3, fill: setColor }} />
              </LineChart>
            </ResponsiveContainer>
            <p style={{ fontSize: 11, color: '#666', lineHeight: 1.5, margin: '10px 0 0 0' }}>
              Si l'indice grimpe sur plusieurs semaines alors que tes temps totaux stagnent, c'est l'<strong style={{ color: '#ccc' }}>endurance</strong> qui plafonne, pas la force. Sous 1.00 : tu accélères en descente (excellent pacing).
            </p>
          </div>
        );
      })()}
    </div>
  );
}

// =============== PROGRAM ===============
function Program() {
  const [activeSet, setActiveSet] = useState('A');

  const setA = {
    name: 'Set A',
    subtitle: 'Jambes & Chaîne postérieure',
    color: '#ff6b35',
    pyramid: '1 → 10 → 1',
    levels: 19,
    totalReps: 400,
    targetTime: '25-28 min',
    weight: '2×7 kg + sac 10 kg',
    description: 'Le set jambes : hinge, squat, unilatéral et cardio explosif. Un seul réglage d\'haltères du début à la fin.',
    exercises: [
      { name: 'Balancier du buste', equipment: '2 haltères', cues: ['Départ haltères entre les jambes', 'Poussée de hanches, dos plat, bras tendus', 'Remontée jusqu\'au niveau des yeux'] },
      { name: 'Squat goblet', equipment: 'Sac 10 kg', cues: ['Sac tenu contre la poitrine par les poignées', 'Descente complète, talons au sol', 'Buste droit, genoux dans l\'axe'] },
      { name: 'Fentes arrière alternées', equipment: '2 haltères', cues: ['1 rep = 1 fente (alterne G/D)', 'Genou arrière frôle le sol', 'Buste vertical, poussée sur le talon avant'] },
      { name: 'Burpees sans pompe', equipment: 'Aucun', cues: ['Descente en planche, pas de pompe', 'Saut vertical en haut', 'Version step-back si mollet sensible'] }
    ],
    finishers: [
      { name: 'Mollets excentriques', details: 'Marche · 4×12-15/jambe', cues: ['Monte à 2 jambes, descends sur 1 jambe en 3-5s', 'Talon qui passe sous le niveau de la marche', 'Prévention des contractures — à faire à chaque Set A'] }
    ]
  };

  const setB = {
    name: 'Set B',
    subtitle: 'Tirage & Épaules',
    color: '#3da9d9',
    pyramid: '1 → 8 → 1',
    levels: 15,
    totalReps: 320,
    targetTime: '22-25 min',
    weight: 'Anneaux (hauteur fixe) + 2×7 kg + élastique',
    description: 'Le set dos & épaules 3D. Deux tirages pour corriger le ratio poussée/tirage — la clé du physique recherché.',
    exercises: [
      { name: 'Tirage anneaux prise serrée', equipment: 'Anneaux', cues: ['Corps gainé en planche inversée', 'Coudes le long du corps', 'Poitrine jusqu\'aux anneaux'] },
      { name: 'Tirage anneaux prise large', equipment: 'Anneaux (même hauteur)', cues: ['Coudes hauts et écartés', 'Tire vers le haut de la poitrine', 'Cible : deltoïde postérieur + rhomboïdes'] },
      { name: 'Arnold press', equipment: '2 haltères', cues: ['Départ paumes vers soi devant le visage', 'Rotation + poussée verticale', 'Bras tendus paumes vers l\'avant en haut'] },
      { name: 'Face pulls', equipment: 'Élastique', cues: ['Tire vers le visage, coudes hauts', 'Écarte les mains en fin de mouvement', 'Épaules basses, sans élan'] },
      { name: 'Mountain climbers', equipment: 'Aucun · ×4', cues: ['Niveau 5 = 20 mouvements', 'Rythme soutenu, bassin stable', 'Le moteur cardio du set'] }
    ],
    finishers: [
      { name: 'Gainage au choix', details: 'Planche, hollow, side plank…', cues: ['3 séries chronométrées (30-90s)', 'Progression automatique par palier de 10 séances', 'Optionnel mais recommandé'] }
    ]
  };

  const setC = {
    name: 'Set C',
    subtitle: 'Poussée & Gainage',
    color: '#4ecca3',
    pyramid: '1 → 8 → 1',
    levels: 15,
    totalReps: 256,
    targetTime: '20-23 min',
    weight: 'Poids du corps + haltères légers (3-4 kg)',
    description: 'Le set poussée & abdos. Pompes, dips et le duo ab wheel / négatives anneaux en finisher.',
    exercises: [
      { name: 'Pompes', equipment: 'Tapis', cues: ['Corps gainé de la tête aux talons', 'Poitrine jusqu\'au sol', 'Coudes à ~45° du corps'] },
      { name: 'Dips', equipment: '2 chaises (anneaux si 8+ propres)', cues: ['Descente contrôlée, coudes vers l\'arrière', 'Épaules basses, loin des oreilles', 'Amplitude complète sans forcer'] },
      { name: 'Élévations latérales', equipment: 'Haltères légers 3-4 kg', cues: ['Bras quasi tendus', 'Monte à l\'horizontale, pas plus', 'Descente lente et contrôlée'] },
      { name: 'Hollow rocks', equipment: 'Tapis', cues: ['Lombaires plaquées au sol', 'Petites oscillations', 'Bras tendus derrière la tête si possible'] }
    ],
    finishers: [
      { name: 'Ab wheel skateboard', details: '3×5-8 reps · progression', cues: ['À genoux, bassin rétroversé', 'Amplitude 50% → 75% → complète sur 6-8 semaines', 'Si le dos creuse : réduis l\'amplitude'] },
      { name: 'Négatives dips anneaux', details: '3×3-5 reps', cues: ['Saute en position haute', 'Descente en 3-5 secondes contrôlées', 'Quand 8 négatives propres → dips complets anneaux'] },
      { name: 'Support hold anneaux', details: '3×20-30s', cues: ['Tiens en haut bras tendus', 'Anneaux légèrement tournés vers l\'extérieur', 'Construit la stabilité pour les dips'] }
    ]
  };

  const setX = {
    name: 'Set X',
    subtitle: 'Mobilité — inspiré LeoMoves',
    color: '#ffc94d',
    format: '~20-25 min · non chronométré',
    description: 'Séance qualité de mouvement. Pas de chrono, pas de performance — juste explorer les amplitudes et entretenir les articulations.',
    blocks: [
      { name: 'Cercles articulaires', duration: '3 min', desc: 'Cou, épaules, poignets, hanches, chevilles — dans les deux sens, amplitude progressive.' },
      { name: 'Squat profond maintenu', duration: '4 min', desc: 'Reste en bas, transitions talon-pointe, pousse les genoux vers l\'extérieur avec les coudes.' },
      { name: 'Hanches 90/90', duration: '4 min', desc: 'Assis jambes à 90°, passages d\'un côté à l\'autre — sans les mains si possible.' },
      { name: 'Rotations thoraciques', duration: '3 min', desc: 'En quadrupédie, main derrière la tête, ouvre vers le plafond + thread the needle.' },
      { name: 'Pont dorsal progressif', duration: '3 min', desc: 'Pont d\'épaules d\'abord, pont complet si accessible, sans forcer la nuque.' },
      { name: 'Jefferson curl', duration: '3 min', desc: 'Haltère léger 3-5 kg, déroule le dos vertèbre par vertèbre, remonte de même.' },
      { name: 'Assis-debout sans les mains', duration: '3 min', desc: 'Enchaîne les passages sol → debout sans appui des mains. Varie les jambes.' },
      { name: 'Mollets & chevilles', duration: '3 min', desc: 'Gastrocnémien (genou tendu) + soléaire (genou fléchi) + mobilité genou-au-mur.' }
    ]
  };

  const setsMap = { A: setA, B: setB, C: setC, X: setX };
  const current = setsMap[activeSet];
  const isX = activeSet === 'X';

  return (
    <div style={styles.dashboard}>
      {/* Set toggle */}
      <div style={styles.setToggle} data-scroll-row>
        {['A', 'B', 'C', 'X'].map(t => (
          <button
            key={t}
            style={{ ...styles.setToggleBtn, flexShrink: 0, ...(activeSet === t ? { ...styles.setToggleBtnActive, background: setsMap[t].color, color: '#0a0a0a' } : {}) }}
            onClick={() => setActiveSet(t)}
          >
            {t === 'X' ? 'X · Mobilité' : `Set ${t}`}
          </button>
        ))}
      </div>

      {/* Header card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={{ ...styles.cardTitle, color: current.color }}>{current.name} — {current.subtitle}</h3>
          <span style={styles.cardSubtitle}>{isX ? current.format : `${current.pyramid} · ${current.levels} niveaux · ${current.totalReps} reps · ${current.targetTime}`}</span>
        </div>
        <p style={{ fontSize: 13, color: '#aaa', lineHeight: 1.6, margin: '0 0 8px 0' }}>{current.description}</p>
        {!isX && (
          <div style={{ fontSize: 11, color: '#666', fontFamily: "'JetBrains Mono', monospace" }}>
            Matériel : {current.weight}
          </div>
        )}
      </div>

      {/* Exercises OR mobility blocks */}
      {isX ? (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Déroulé de la séance</h3>
            <span style={styles.cardSubtitle}>8 blocs · dans l'ordre</span>
          </div>
          <div style={styles.exerciseList}>
            {current.blocks.map((b, idx) => (
              <div key={idx} style={styles.exerciseItem}>
                <div style={{ ...styles.exerciseNumber, background: current.color, color: '#0a0a0a' }}>{idx + 1}</div>
                <div style={styles.exerciseContent}>
                  <div style={styles.exerciseHeader}>
                    <span style={styles.exerciseName}>{b.name}</span>
                    <span style={styles.exerciseEquipment}>{b.duration}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0 0', lineHeight: 1.5 }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Exercices · dans l'ordre</h3>
              <span style={styles.cardSubtitle}>{current.exercises.length} exercices par niveau</span>
            </div>
            <div style={styles.exerciseList}>
              {current.exercises.map((exo, idx) => (
                <div key={idx} style={styles.exerciseItem}>
                  <div style={{ ...styles.exerciseNumber, background: current.color, color: '#0a0a0a' }}>{idx + 1}</div>
                  <div style={styles.exerciseContent}>
                    <div style={styles.exerciseHeader}>
                      <span style={styles.exerciseName}>{exo.name}</span>
                      <span style={styles.exerciseEquipment}>{exo.equipment}</span>
                    </div>
                    <ul style={styles.exerciseCues}>
                      {exo.cues.map((cue, i) => (
                        <li key={i} style={styles.exerciseCue}>{cue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Finishers */}
          {current.finishers && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Finisher · hors pyramide</h3>
                <span style={styles.cardSubtitle}>après la pyramide · qualité avant tout</span>
              </div>
              <div style={styles.exerciseList}>
                {current.finishers.map((fin, idx) => (
                  <div key={idx} style={styles.exerciseItem}>
                    <div style={{ ...styles.exerciseNumber, background: '#666' }}>★</div>
                    <div style={styles.exerciseContent}>
                      <div style={styles.exerciseHeader}>
                        <span style={styles.exerciseName}>{fin.name}</span>
                        <span style={styles.exerciseEquipment}>{fin.details}</span>
                      </div>
                      <ul style={styles.exerciseCues}>
                        {fin.cues.map((cue, i) => (
                          <li key={i} style={styles.exerciseCue}>{cue}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pyramid visual */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Visualisation pyramide</h3>
              <span style={styles.cardSubtitle}>nombre de reps par niveau</span>
            </div>
            <div style={styles.pyramidVisual}>
              {(activeSet === 'A'
                ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
                : [1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1]
              ).map((reps, idx, arr) => {
                const max = Math.max(...arr);
                const isApex = idx === arr.findIndex(r => r === max);
                return (
                  <div key={idx} style={styles.pyramidLevel}>
                    <span style={styles.pyramidLevelLabel}>
                      {idx < (arr.length - 1) / 2 ? '↑' : isApex ? '◆' : '↓'}
                    </span>
                    <div
                      style={{
                        ...styles.pyramidBar,
                        width: `${(reps / max) * 100}%`,
                        background: isApex ? current.color : `${current.color}88`,
                        minWidth: 30
                      }}
                    >
                      {reps}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Weekly plan */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Plan hebdomadaire</h3>
          <span style={styles.cardSubtitle}>A · B · C + X mobilité</span>
        </div>
        <div style={styles.weekPlan}>
          {[
            { day: 'Lundi', activity: 'Set A', color: setA.color },
            { day: 'Mardi', activity: 'Repos', color: '#333' },
            { day: 'Mercredi', activity: 'Set B', color: setB.color },
            { day: 'Jeudi', activity: 'Repos', color: '#333' },
            { day: 'Vendredi', activity: 'Set C', color: setC.color },
            { day: 'Samedi', activity: 'Côtes (opt.)', color: '#666' },
            { day: 'Dimanche', activity: 'Set X', color: setX.color }
          ].map((d, i) => (
            <div key={i} style={styles.weekDay}>
              <div style={styles.weekDayName}>{d.day}</div>
              <div style={{ ...styles.weekDayActivity, background: d.color, color: d.color === '#333' || d.color === '#666' ? '#888' : '#0a0a0a' }}>
                {d.activity}
              </div>
            </div>
          ))}
        </div>
        <div style={styles.weekNote}>
          <strong>Côtes :</strong> 15-20 min de montées en marche rapide, le samedi ou après le Set X. <strong>Jamais</strong> deux séances lourdes consécutives.
        </div>
      </div>

      {/* Complementarity grid */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Équilibre A · B · C</h3>
          <span style={styles.cardSubtitle}>ratio poussée:tirage hebdo = 1:1 (192/192 reps)</span>
        </div>
        <table style={styles.compTable}>
          <thead>
            <tr>
              <th style={styles.compTh}>Sollicitation</th>
              <th style={{ ...styles.compTh, color: setA.color }}>A</th>
              <th style={{ ...styles.compTh, color: setB.color }}>B</th>
              <th style={{ ...styles.compTh, color: setC.color }}>C</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Tirer (dos)', '—', '✓✓', '—'],
              ['Pousser vertical', '—', '✓', '~'],
              ['Pousser horizontal', '—', '—', '✓✓'],
              ['Épaules 3D', '—', '✓', '✓'],
              ['Quadriceps', '✓✓', '—', '—'],
              ['Chaîne postérieure', '✓✓', '—', '—'],
              ['Cardio explosif', '✓', '✓', '—'],
              ['Gainage', '~', '~', '✓✓'],
              ['Mollets (prévention)', '✓', '—', '—']
            ].map((row, i) => (
              <tr key={i}>
                <td style={styles.compTd}>{row[0]}</td>
                <td style={{ ...styles.compTd, textAlign: 'center' }}>{row[1]}</td>
                <td style={{ ...styles.compTd, textAlign: 'center' }}>{row[2]}</td>
                <td style={{ ...styles.compTd, textAlign: 'center' }}>{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// =============== ABOUT MODAL ===============
function AboutModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  // Email encoded in base64 for basic anti-spam protection
  const encodedEmail = 'TWFuaWxrZW5ueTk3NEBnbWFpbC5jb20=';

  const handleCopyEmail = async () => {
    try {
      const email = atob(encodedEmail);
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback if clipboard API not available
      const email = atob(encodedEmail);
      const textArea = document.createElement('textarea');
      textArea.value = email;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        alert('Email : ' + email);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div style={styles.modal} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.aboutModal}>
        <div style={styles.aboutHeader}>
          <button style={styles.iconBtn} onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        <div style={styles.aboutContent}>
          <div style={styles.aboutLogo}>
            <PyramidLogo size={56} color="#0a0a0a" accentColor="#0a0a0a" />
          </div>

          <h1 style={styles.aboutTitle}>PYRAMID</h1>
          <p style={styles.aboutTagline}>training analytics</p>

          <div style={styles.aboutDivider} />

          <p style={styles.aboutText}>
            App perso de suivi d'entraînement en pyramide chronométrée. Set A (1→10→1), Sets B et C (1→8→1), mobilité en bonus.
          </p>

          <p style={styles.aboutText}>
            Conçue pour analyser ma progression : chrono spécifique aux programmes, splits par niveau, records automatiques, score de forme, temps fantôme, ères d'entraînement.
          </p>

          <p style={styles.aboutText}>
            Construite parce que je voulais un outil qui m'offre un large éventail d'analyses et d'enregistrement de mes entraînements, avec la possibilité de comparer les différentes séances afin de visualiser la progression.
          </p>

          <div style={styles.aboutDivider} />

          <div style={styles.aboutInfoBlock}>
            <div style={styles.aboutInfoLabel}>Stockage</div>
            <p style={styles.aboutInfoText}>
              Toutes tes données restent privées sur ton appareil — aucun serveur, aucun compte. Le revers : chaque appareil a son propre historique. Pour transférer tes séances ailleurs, exporte ton fichier JSON et importe-le sur l'autre appareil.
            </p>
          </div>

          <div style={styles.aboutDivider} />

          <div style={styles.aboutSignature}>
            <div style={styles.aboutAuthor}>Mannek</div>
            <div style={styles.aboutVersion}>2026 · v2.0</div>
          </div>

          <button
            style={{ ...styles.aboutEmailBtn, background: copied ? '#7dd87d' : '#1f1f1f', color: copied ? '#0a0a0a' : '#ccc' }}
            onClick={handleCopyEmail}
          >
            {copied ? <><Check size={14} /> Email copié</> : <><Mail size={14} /> Copier email</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============== STOPWATCH ===============
function Stopwatch({ onClose, onSave, suggestedCode, setCountsSoFar = { A: 0, B: 0, C: 0 }, levelRecords = { A: {}, B: {}, C: {} }, levelBaselines = { A: {}, B: {}, C: {} } }) {
  const [setType, setSetType] = useState('A'); // A = 19 levels, B/C = 15 levels
  const [phase, setPhase] = useState('setup'); // setup | running | paused | plank | finished
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0); // total ms (pyramid only)
  const [pausedAt, setPausedAt] = useState(0); // ms paused so far
  const [pauseStart, setPauseStart] = useState(null);
  const [splits, setSplits] = useState([]); // Array of {level, time_ms, duration_ms}
  const [currentLevel, setCurrentLevel] = useState(0); // index in pyramid
  const [showSummary, setShowSummary] = useState(false);

  // Finisher state
  const [plankSetIdx, setPlankSetIdx] = useState(0);
  const [plankDuration, setPlankDuration] = useState(30); // seconds per set (time-mode finishers)
  const [plankRunning, setPlankRunning] = useState(false);
  const [plankStartTime, setPlankStartTime] = useState(null);
  const [plankTimeLeft, setPlankTimeLeft] = useState(30);
  const [plankResults, setPlankResults] = useState([]); // [{ duration, completed, side?, finisherId }]
  const [showProgressionPrompt, setShowProgressionPrompt] = useState(false);
  const [selectedFinisherIds, setSelectedFinisherIds] = useState(['plank']);
  const [currentFinisherIdx, setCurrentFinisherIdx] = useState(0);
  const [showFinisherSelection, setShowFinisherSelection] = useState(false);
  const [repsInput, setRepsInput] = useState(null); // reps counter for reps-mode finishers

  // Current finisher being executed
  const currentFinisherId = selectedFinisherIds[currentFinisherIdx] || 'plank';
  const selectedFinisher = getFinisherById(currentFinisherId);
  const totalPlankSets = selectedFinisher.unilateral ? 4 : selectedFinisher.sets;

  // Build full session plan: array of { finisherId, setIdx, side? }
  const finisherPlan = selectedFinisherIds.flatMap(fid => {
    const fin = getFinisherById(fid);
    const sets = fin.unilateral ? 4 : fin.sets;
    return Array.from({ length: sets }, (_, i) => ({
      finisherId: fid,
      setIdx: i,
      side: fin.unilateral ? (i % 2 === 0 ? 'G' : 'D') : null
    }));
  });
  const totalAllPlankSets = finisherPlan.length;
  const overallPlankIdx = plankResults.length; // index in the full plan

  // Form fields for save - code is pre-filled with suggestion
  const [code, setCode] = useState(suggestedCode || '');
  const [dumbbellWeight, setDumbbellWeight] = useState(7);
  const [bodyweight, setBodyweight] = useState('');
  const [preNotes, setPreNotes] = useState('');
  const [notes, setNotes] = useState('');

  // Use global constants
  const config = getPyramidConfig(setType);
  const pyramid = config.levels;
  const labels = config.labels;
  const totalLevels = config.count;
  const setColor = getSetColor(setType);

  // Exercise definitions with rep multipliers
  const currentExercises = getExercises(setType);

  // Time-finisher progression: 0-9 sessions of this set → 30s, 10-19 → 45s, etc.
  const recommendedPlankDuration = (count) => {
    if (count >= 40) return 90;
    if (count >= 30) return 75;
    if (count >= 20) return 60;
    if (count >= 10) return 45;
    return 30;
  };

  // Tick the timer
  useEffect(() => {
    if (phase !== 'running') return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime - pausedAt);
    }, 50);
    return () => clearInterval(interval);
  }, [phase, startTime, pausedAt]);

  // Wake lock to keep screen on
  useEffect(() => {
    let wakeLock = null;
    const requestWake = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (e) {
        // Wake lock not supported or denied, that's ok
      }
    };
    if (phase === 'running') requestWake();
    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, [phase]);

  // Auto-save in progress to localStorage
  useEffect(() => {
    if (phase === 'running' || phase === 'paused') {
      const inProgress = {
        setType,
        startTime,
        elapsed,
        pausedAt,
        splits,
        currentLevel,
        savedAt: Date.now()
      };
      try {
        localStorage.setItem('stopwatch-in-progress', JSON.stringify(inProgress));
      } catch (e) {}
    } else if (phase === 'setup' || phase === 'finished') {
      try {
        localStorage.removeItem('stopwatch-in-progress');
      } catch (e) {}
    }
  }, [phase, setType, startTime, elapsed, pausedAt, splits, currentLevel]);

  // Restore in-progress on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('stopwatch-in-progress');
      if (stored) {
        const data = JSON.parse(stored);
        // Only restore if recent (< 6h)
        if (Date.now() - data.savedAt < 6 * 60 * 60 * 1000) {
          if (confirm('Une séance en cours a été détectée. Reprendre ?')) {
            setSetType(data.setType);
            setStartTime(data.startTime);
            setPausedAt(data.pausedAt + (Date.now() - data.savedAt));
            setSplits(data.splits);
            setCurrentLevel(data.currentLevel);
            setPhase('paused');
            setElapsed(Date.now() - data.startTime - (data.pausedAt + (Date.now() - data.savedAt)));
          }
        }
      }
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = () => {
    setStartTime(Date.now());
    setElapsed(0);
    setPausedAt(0);
    setSplits([]);
    setCurrentLevel(0);
    setPhase('running');
  };

  const handlePause = () => {
    setPauseStart(Date.now());
    setPhase('paused');
  };

  const handleResume = () => {
    if (pauseStart) {
      setPausedAt(prev => prev + (Date.now() - pauseStart));
      setPauseStart(null);
    }
    setPhase('running');
  };

  // Get current level start time (sum of previous splits)
  const previousSplitsSum = splits.reduce((sum, s) => sum + s.duration_ms, 0);
  const currentSplitMs = elapsed - previousSplitsSum;

  const handleNextLevel = () => {
    const splitDuration = currentSplitMs;
    const newSplits = [...splits, {
      level: currentLevel,
      time_ms: elapsed,
      duration_ms: splitDuration
    }];
    setSplits(newSplits);

    if (currentLevel + 1 >= totalLevels) {
      // Pyramid finished → finisher selection for every set type
      const recommendedDur = recommendedPlankDuration((setCountsSoFar[setType] || 0) + 1);
      if (recommendedDur > plankDuration) {
        setShowProgressionPrompt(true);
      }
      if (plankDuration === 30 && recommendedDur > 30) {
        setPlankDuration(recommendedDur);
        setPlankTimeLeft(recommendedDur);
      }
      // Load last used finishers for THIS set type, else defaults
      try {
        const lastFinishers = localStorage.getItem(`pyramid:lastFinisherIds_${setType}`);
        if (lastFinishers) {
          const parsed = JSON.parse(lastFinishers);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(id => getFinisherById(id))) {
            setSelectedFinisherIds(parsed);
          } else {
            setSelectedFinisherIds(DEFAULT_FINISHERS[setType] || ['plank']);
          }
        } else {
          setSelectedFinisherIds(DEFAULT_FINISHERS[setType] || ['plank']);
        }
      } catch (e) {
        setSelectedFinisherIds(DEFAULT_FINISHERS[setType] || ['plank']);
      }
      setShowFinisherSelection(true);
      setPhase('plank');
    } else {
      setCurrentLevel(currentLevel + 1);
    }
  };

  // Plank timer tick
  useEffect(() => {
    if (!plankRunning || !plankStartTime) return;
    const interval = setInterval(() => {
      const elapsedMs = Date.now() - plankStartTime;
      const remaining = Math.max(0, plankDuration - Math.floor(elapsedMs / 1000));
      setPlankTimeLeft(remaining);
      if (remaining <= 0) {
        // Plank set finished
        setPlankRunning(false);
        const planEntry = finisherPlan[plankResults.length];
        const newResults = [...plankResults, {
          duration: plankDuration,
          completed: true,
          side: planEntry?.side || null,
          finisherId: planEntry?.finisherId || currentFinisherId
        }];
        setPlankResults(newResults);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
        if (newResults.length >= totalAllPlankSets) {
          // All finishers done
          setPhase('finished');
          setShowSummary(true);
        } else {
          // Advance to next set or next finisher
          const nextEntry = finisherPlan[newResults.length];
          // Check if we moved to a new finisher
          const newFinisherIdx = selectedFinisherIds.indexOf(nextEntry.finisherId);
          if (newFinisherIdx !== currentFinisherIdx) {
            setCurrentFinisherIdx(newFinisherIdx);
          }
          setPlankSetIdx(nextEntry.setIdx);
          setPlankTimeLeft(plankDuration);
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [plankRunning, plankStartTime, plankDuration, plankResults, totalAllPlankSets, finisherPlan, selectedFinisherIds, currentFinisherIdx, currentFinisherId]);

  const advanceFinisher = (newResults) => {
    setPlankResults(newResults);
    setPlankRunning(false);
    if (newResults.length >= totalAllPlankSets) {
      setPhase('finished');
      setShowSummary(true);
    } else {
      const nextEntry = finisherPlan[newResults.length];
      const newFinisherIdx = selectedFinisherIds.indexOf(nextEntry.finisherId);
      if (newFinisherIdx !== currentFinisherIdx) {
        setCurrentFinisherIdx(newFinisherIdx);
        setRepsInput(null); // reset counter to the new finisher's default
      }
      setPlankSetIdx(nextEntry.setIdx);
      setPlankTimeLeft(plankDuration);
    }
  };

  const startPlankSet = () => {
    // Save finisher choices for next time (per set type)
    try { localStorage.setItem(`pyramid:lastFinisherIds_${setType}`, JSON.stringify(selectedFinisherIds)); } catch (e) {}
    setShowFinisherSelection(false);
    if (selectedFinisher.mode === 'reps') {
      // Reps mode: no countdown, user validates manually
      setPlankRunning(false);
      return;
    }
    setPlankStartTime(Date.now());
    setPlankTimeLeft(plankDuration);
    setPlankRunning(true);
  };

  // Reps-mode: user taps "Série terminée"
  const completeRepsSet = () => {
    const planEntry = finisherPlan[plankResults.length];
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([120]);
    }
    advanceFinisher([...plankResults, {
      duration: null,
      completed: true,
      reps: repsInput != null ? repsInput : (selectedFinisher.repsDefault || null),
      side: planEntry?.side || null,
      finisherId: planEntry?.finisherId || currentFinisherId
    }]);
  };

  const skipPlankSet = () => {
    const planEntry = finisherPlan[plankResults.length];
    advanceFinisher([...plankResults, {
      duration: selectedFinisher.mode === 'time' ? plankDuration : null,
      completed: false,
      side: planEntry?.side || null,
      finisherId: planEntry?.finisherId || currentFinisherId
    }]);
  };

  const skipAllPlank = () => {
    setPhase('finished');
    setShowSummary(true);
  };

  const handleUndo = () => {
    if (splits.length === 0) return;
    const newSplits = splits.slice(0, -1);
    setSplits(newSplits);
    setCurrentLevel(currentLevel - 1);
    if (phase === 'finished') {
      setPhase('running');
      setShowSummary(false);
    }
  };

  const handleReset = () => {
    if (!confirm('Annuler la séance en cours ? Les splits seront perdus.')) return;
    setPhase('setup');
    setStartTime(null);
    setElapsed(0);
    setPausedAt(0);
    setSplits([]);
    setCurrentLevel(0);
    setShowSummary(false);
    try { localStorage.removeItem('stopwatch-in-progress'); } catch(e) {}
  };

  const handleSaveSession = () => {
    // Build levelTimes array for both Set A (19 levels) and Set B (15 levels)
    const levelTimes = splits.length > 0 ? splits.map(s => s.duration_ms / 1000) : null;

    const totalSeconds = elapsed / 1000;

    const data = {
      type: setType,
      date: new Date().toISOString().split('T')[0],
      code: code.trim() || null,
      dumbbellWeight: dumbbellWeight === '' ? null : parseFloat(dumbbellWeight),
      bodyweight: bodyweight === '' ? null : parseFloat(bodyweight),
      preNotes: preNotes.trim(),
      notes: notes.trim(),
      totalTime: totalSeconds,
      levelTimes
    };

    // Add plank data for Set B
    if (plankResults.length > 0) {
      data.plank = {
        finisherIds: selectedFinisherIds,
        finisherNames: selectedFinisherIds.map(id => getFinisherById(id).name),
        targetDuration: plankDuration,
        sets: plankResults
      };
    }

    onSave(data);
  };

  const formatStopwatch = (ms) => {
    if (ms == null || isNaN(ms)) return '00:00.0';
    const totalMs = Math.max(0, Math.floor(ms));
    const m = Math.floor(totalMs / 60000);
    const s = Math.floor((totalMs % 60000) / 1000);
    const cs = Math.floor((totalMs % 1000) / 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs}`;
  };

  // SETUP screen
  if (phase === 'setup') {
    return (
      <div style={styles.stopwatchModal}>
        <div style={styles.stopwatchSetup}>
          <div style={styles.stopwatchSetupHeader}>
            <h2 style={styles.modalTitle}>Nouveau chrono</h2>
            <button style={styles.iconBtn} onClick={onClose}><X size={18} /></button>
          </div>

          <p style={{ fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 24 }}>
            Choisis le set, puis clique "Démarrer". Pendant la séance, un grand bouton te permet de marquer chaque tour.
          </p>

          <div style={{ marginBottom: 20 }}>
            <label style={styles.formLabel}>Type de set</label>
            <div style={styles.toggle}>
              {[
                { t: 'A', label: 'A · Jambes', lv: '19 niv.' },
                { t: 'B', label: 'B · Tirage', lv: '15 niv.' },
                { t: 'C', label: 'C · Poussée', lv: '15 niv.' }
              ].map(({ t, label, lv }) => (
                <button
                  key={t}
                  style={{
                    ...styles.toggleBtn,
                    ...(setType === t ? { background: getSetColor(t), color: '#0a0a0a', fontWeight: 700 } : {})
                  }}
                  onClick={() => setSetType(t)}
                >{label}<br /><span style={{ fontSize: 9, opacity: 0.7 }}>{lv}</span></button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16, padding: '10px 12px', background: '#0a0a0a', borderRadius: 4, border: '1px solid #1f1f1f' }}>
            <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>Exercices</div>
            <div style={{ fontSize: 11, color: '#ccc', lineHeight: 1.7 }}>
              {currentExercises.map((e, i) => (
                <span key={i}>
                  <span style={{ color: getSetColor(setType), fontWeight: 700 }}>{i + 1}</span> {e.name}{i < currentExercises.length - 1 ? ' · ' : ''}
                </span>
              ))}
            </div>
          </div>

          <div style={styles.pyramidPreview}>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Pyramide ({totalLevels} niveaux)
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {labels.map((lbl, i) => (
                <div key={i} style={styles.pyramidPreviewBadge}>{lbl}</div>
              ))}
            </div>
          </div>

          <button style={styles.stopwatchStartBtn} onClick={handleStart}>
            <Play size={24} />
            Démarrer
          </button>

          <p style={{ fontSize: 10, color: '#555', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
            L'écran restera allumé pendant la séance. Tu peux mettre en pause à tout moment.
          </p>
        </div>
      </div>
    );
  }

  // SUMMARY screen
  if (showSummary) {
    const totalSec = elapsed / 1000;
    return (
      <div style={styles.stopwatchModal}>
        <div style={styles.stopwatchSummary}>
          <div style={styles.stopwatchSetupHeader}>
            <h2 style={styles.modalTitle}>Séance terminée</h2>
            <button style={styles.iconBtn} onClick={() => {
              try { localStorage.removeItem('stopwatch-in-progress'); } catch(e) {}
              onClose();
            }}><X size={18} /></button>
          </div>

          <div style={styles.summaryTotal}>
            <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 2 }}>Temps total</div>
            <div style={{ ...styles.summaryTotalValue, color: getSetColor(setType) }}>{formatStopwatch(elapsed).replace(/\.\d$/, '')}</div>
          </div>

          <div style={styles.summarySplitsTable}>
            <div style={styles.summarySplitsHeader}>
              <span>Niveau</span>
              <span>Reps</span>
              <span>Durée</span>
              <span>Cumul</span>
            </div>
            {splits.map((s, i) => (
              <div key={i} style={styles.summarySplitsRow}>
                <span style={{ color: getSetColor(setType), fontWeight: 700 }}>{labels[s.level]}</span>
                <span style={{ color: '#888' }}>{pyramid[s.level]}</span>
                <span style={{ color: '#fff' }}>{formatStopwatch(s.duration_ms).replace(/\.\d$/, '')}</span>
                <span style={{ color: '#666' }}>{formatStopwatch(s.time_ms).replace(/\.\d$/, '')}</span>
              </div>
            ))}
          </div>

          {/* Plank summary for Set B - grouped by finisher */}
          {plankResults.length > 0 && (() => {
            // Group results by finisherId
            const grouped = {};
            plankResults.forEach((r) => {
              const fid = r.finisherId || 'plank';
              if (!grouped[fid]) grouped[fid] = [];
              grouped[fid].push(r);
            });

            return Object.entries(grouped).map(([fid, results]) => {
              const fin = getFinisherById(fid);
              return (
                <div key={fid} style={{ ...styles.summarySplitsTable, marginTop: 12 }}>
                  <div style={styles.summarySplitsHeader}>
                    <span>{fin.short}</span>
                    <span>Cible</span>
                    <span>Réalisé</span>
                    <span>Statut</span>
                  </div>
                  {results.map((r, i) => {
                    const isReps = fin.mode === 'reps';
                    return (
                      <div key={i} style={styles.summarySplitsRow}>
                        <span style={{ color: getSetColor(setType), fontWeight: 700 }}>
                          Série {i + 1}{r.side ? ` (${r.side})` : ''}
                        </span>
                        <span style={{ color: '#888' }}>{isReps ? fin.repsHint : `${plankDuration}s`}</span>
                        <span style={{ color: '#fff' }}>{isReps ? (r.completed ? 'fait' : '—') : `${r.duration}s`}</span>
                        <span style={{ color: r.completed ? '#7dd87d' : '#e88a8a' }}>
                          {r.completed ? '✓' : '✗'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}

          <div style={{ paddingTop: 16, borderTop: '1px solid #1f1f1f' }}>
            <div style={styles.formGrid2}>
              <div>
                <label style={styles.formLabel}>Code (optionnel)</label>
                <input type="text" style={styles.input} value={code} onChange={(e) => setCode(e.target.value)} placeholder="ex: S19s1" />
              </div>
              <div>
                <label style={styles.formLabel}>Haltères (kg/main)</label>
                <input type="number" step="0.5" style={styles.input} value={dumbbellWeight} onChange={(e) => setDumbbellWeight(e.target.value)} />
              </div>
            </div>
            <div style={styles.formGrid2}>
              <div>
                <label style={styles.formLabel}>Poids corps (kg)</label>
                <input type="number" step="0.1" style={styles.input} value={bodyweight} onChange={(e) => setBodyweight(e.target.value)} placeholder="ex: 74" />
              </div>
              <div>
                <label style={styles.formLabel}>Notes (optionnel)</label>
                <input type="text" style={styles.input} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ressenti..." />
              </div>
            </div>
          </div>

          <div style={styles.formActions}>
            <button style={styles.secondaryBtn} onClick={() => {
              try { localStorage.removeItem('stopwatch-in-progress'); } catch(e) {}
              onClose();
            }}>
              Ne pas sauver
            </button>
            <button style={styles.primaryBtn} onClick={handleSaveSession}>
              <Save size={14} /> Enregistrer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PLANK FINISHER screen (Set B only)
  if (phase === 'plank') {
    const setColorBlue = getSetColor(setType);
    const recommendedDur = recommendedPlankDuration((setCountsSoFar[setType] || 0) + 1);
    const isLastSet = plankSetIdx >= totalPlankSets - 1;
    const currentSide = selectedFinisher.unilateral ? (plankSetIdx % 2 === 0 ? 'gauche' : 'droite') : null;

    // FINISHER SELECTION sub-screen
    if (showFinisherSelection) {
      const toggleFinisher = (id) => {
        if (selectedFinisherIds.includes(id)) {
          // Don't allow deselecting if it's the only one
          if (selectedFinisherIds.length > 1) {
            setSelectedFinisherIds(selectedFinisherIds.filter(x => x !== id));
          }
        } else {
          setSelectedFinisherIds([...selectedFinisherIds, id]);
        }
      };

      const totalSetsCount = selectedFinisherIds.reduce((sum, id) => {
        const fin = getFinisherById(id);
        return sum + (fin.unilateral ? 4 : 3);
      }, 0);

      return (
        <div style={styles.stopwatchModal}>
          <div style={styles.stopwatchSetup}>
            <div style={styles.stopwatchSetupHeader}>
              <h2 style={styles.modalTitle}>Choisis ton finisher</h2>
              <button style={styles.iconBtn} onClick={skipAllPlank} title="Passer le finisher"><X size={18} /></button>
            </div>

            <p style={{ fontSize: 12, color: '#888', marginBottom: 16, lineHeight: 1.6 }}>
              Pyramide terminée en <strong style={{ color: setColorBlue }}>{formatStopwatch(elapsed).replace(/\.\d$/, '')}</strong>. Tu peux sélectionner un ou plusieurs finishers — ils s'enchaîneront dans l'ordre.
            </p>

            <div style={styles.finisherList}>
              {FINISHERS.map(fin => {
                const isSelected = selectedFinisherIds.includes(fin.id);
                const orderIdx = isSelected ? selectedFinisherIds.indexOf(fin.id) + 1 : null;
                return (
                  <button
                    key={fin.id}
                    style={{
                      ...styles.finisherOption,
                      borderColor: isSelected ? setColorBlue : '#2a2a2a',
                      background: isSelected ? 'rgba(61,169,217,0.08)' : '#0a0a0a',
                      position: 'relative'
                    }}
                    onClick={() => toggleFinisher(fin.id)}
                  >
                    <div style={styles.finisherOptionHeader}>
                      <span style={{ ...styles.finisherOptionName, color: isSelected ? setColorBlue : '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isSelected && (
                          <span style={{
                            background: setColorBlue,
                            color: '#0a0a0a',
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: "'JetBrains Mono', monospace"
                          }}>{orderIdx}</span>
                        )}
                        {fin.name}
                      </span>
                      <span style={styles.finisherOptionMeta}>
                        {fin.unilateral ? '2×2 séries' : `${fin.sets} séries`}{fin.mode === 'reps' ? ` · ${fin.repsHint}` : ''}
                      </span>
                    </div>
                    <div style={styles.finisherOptionDesc}>{fin.desc}</div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(61,169,217,0.08)', border: '1px solid rgba(61,169,217,0.2)', borderRadius: 4, textAlign: 'center' }}>
              <span style={{ fontSize: 11, color: '#888' }}>Total : </span>
              <strong style={{ fontSize: 14, color: setColorBlue, fontFamily: "'JetBrains Mono', monospace" }}>
                {selectedFinisherIds.length} finisher{selectedFinisherIds.length > 1 ? 's' : ''} · {totalSetsCount} séries
              </strong>
            </div>

            {selectedFinisherIds.some(id => getFinisherById(id).mode === 'time') && (
              <div style={{ marginTop: 20 }}>
                <label style={styles.formLabel}>Durée par série (finishers chronométrés)</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {[30, 45, 60, 75, 90].map(d => (
                    <button
                      key={d}
                      style={{
                        ...styles.iconBtnSmall,
                        borderColor: plankDuration === d ? setColorBlue : '#2a2a2a',
                        color: plankDuration === d ? setColorBlue : '#888',
                        background: plankDuration === d ? 'rgba(61,169,217,0.1)' : 'transparent'
                      }}
                      onClick={() => { setPlankDuration(d); setPlankTimeLeft(d); }}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showProgressionPrompt && selectedFinisherIds.some(id => getFinisherById(id).mode === 'time') && (
              <div style={{ ...styles.compareHint, background: 'rgba(61,169,217,0.1)', borderColor: 'rgba(61,169,217,0.3)', marginTop: 16 }}>
                <Award size={14} style={{ color: setColorBlue }} />
                <span style={{ fontSize: 12 }}>
                  <strong>Palier !</strong> Tu vas finir ton {(setCountsSoFar[setType] || 0) + 1}e Set {setType}. L'app suggère {recommendedDur}s.
                </span>
              </div>
            )}

            <button style={{ ...styles.stopwatchStartBtn, background: setColorBlue, marginTop: 20 }} onClick={startPlankSet}>
              <Play size={20} />
              Démarrer le finisher
            </button>

            <button style={{ ...styles.secondaryBtn, width: '100%', marginTop: 8 }} onClick={skipAllPlank}>
              Passer (aller au récap)
            </button>
          </div>
        </div>
      );
    }

    // PLANK ACTIVE screen
    const isLastOverall = overallPlankIdx + 1 >= totalAllPlankSets;
    const isTransitionToNew = overallPlankIdx > 0 && finisherPlan[overallPlankIdx - 1]?.finisherId !== currentFinisherId;
    return (
      <div style={styles.stopwatchModal}>
        <div style={styles.stopwatchRunning}>
          {/* Header */}
          <div style={styles.swTop}>
            <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace" }}>
              Finisher · {selectedFinisher.short}
              {selectedFinisherIds.length > 1 && (
                <span style={{ marginLeft: 8, color: setColorBlue }}>
                  ({currentFinisherIdx + 1}/{selectedFinisherIds.length})
                </span>
              )}
            </div>
            <button style={styles.swCloseBtn} onClick={skipAllPlank} title="Aller au récap">
              <X size={16} />
            </button>
          </div>

          {/* New finisher transition banner */}
          {isTransitionToNew && !plankRunning && (
            <div style={{ ...styles.compareHint, background: 'rgba(61,169,217,0.1)', borderColor: 'rgba(61,169,217,0.3)' }}>
              <Award size={14} style={{ color: setColorBlue }} />
              <span style={{ fontSize: 12 }}>
                <strong>Nouveau finisher :</strong> {selectedFinisher.name}
              </span>
            </div>
          )}

          {/* Set indicator */}
          <div style={styles.swLevelDisplay}>
            <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 3 }}>
              {selectedFinisher.name} · Série {plankSetIdx + 1}/{totalPlankSets}
              {currentSide && <span style={{ color: setColorBlue, marginLeft: 8 }}>· côté {currentSide}</span>}
            </div>
            {selectedFinisher.mode === 'reps' ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 12 }}>
                  <button
                    style={{ width: 52, height: 52, borderRadius: 26, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff', fontSize: 26, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}
                    onClick={() => setRepsInput(Math.max(1, (repsInput != null ? repsInput : selectedFinisher.repsDefault || 5) - 1))}
                  >−</button>
                  <div style={{ ...styles.swLevelBig, color: setColorBlue, fontSize: 84, minWidth: 110 }}>
                    {repsInput != null ? repsInput : (selectedFinisher.repsDefault || 5)}
                  </div>
                  <button
                    style={{ width: 52, height: 52, borderRadius: 26, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff', fontSize: 26, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}
                    onClick={() => setRepsInput((repsInput != null ? repsInput : selectedFinisher.repsDefault || 5) + 1)}
                  >+</button>
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>reps effectuées · cible {selectedFinisher.repsHint}</div>
                <div style={{ fontSize: 12, color: '#777', fontFamily: "'Inconsolata', monospace", marginTop: 10, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
                  {selectedFinisher.desc}
                </div>
              </div>
            ) : (
              <div style={{ ...styles.swLevelBig, color: setColorBlue, fontSize: 100 }}>
                {plankRunning ? plankTimeLeft : plankDuration}
                <span style={{ fontSize: 32, marginLeft: 8 }}>s</span>
              </div>
            )}
            <div style={{ fontSize: 11, color: '#666', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
              Total : {overallPlankIdx + 1}/{totalAllPlankSets} séries
            </div>
          </div>

          {/* Previous sets results */}
          {plankResults.length > 0 && (
            <div style={styles.swLastSplits}>
              <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                Séries précédentes
              </div>
              {plankResults.slice(-5).map((r, i) => {
                const realIdx = plankResults.length - 5 + i >= 0 ? plankResults.length - 5 + i : i;
                const fin = getFinisherById(r.finisherId || 'plank');
                return (
                  <div key={realIdx} style={styles.swSplitRow}>
                    <span style={{ color: '#888' }}>
                      {fin.short} #{realIdx + 1}{r.side ? ` (${r.side})` : ''}
                    </span>
                    <span style={{ color: r.completed ? '#7dd87d' : '#e88a8a', fontWeight: 600 }}>
                      {r.completed ? (r.duration != null ? `✓ ${r.duration}s` : (r.reps != null ? `✓ ${r.reps} reps` : '✓')) : 'passé'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Big action button */}
          {selectedFinisher.mode === 'reps' ? (
            <button
              style={{ ...styles.swMainBtn, background: setColorBlue }}
              onClick={completeRepsSet}
            >
              <Check size={28} />
              <span>SÉRIE TERMINÉE</span>
              <span style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                {(repsInput != null ? repsInput : selectedFinisher.repsDefault || 5)} reps{currentSide ? ` · côté ${currentSide}` : ''}
              </span>
            </button>
          ) : plankRunning ? (
            <button
              style={{ ...styles.swMainBtn, background: '#e88a8a' }}
              onClick={() => {
                const actualDuration = plankDuration - plankTimeLeft;
                const planEntry = finisherPlan[plankResults.length];
                advanceFinisher([...plankResults, {
                  duration: actualDuration,
                  completed: actualDuration >= plankDuration * 0.9,
                  side: planEntry?.side || null,
                  finisherId: planEntry?.finisherId || currentFinisherId
                }]);
              }}
            >
              <Pause size={28} />
              <span>ARRÊTER LA SÉRIE</span>
            </button>
          ) : (
            <button
              style={{ ...styles.swMainBtn, background: setColorBlue }}
              onClick={startPlankSet}
            >
              <Play size={28} />
              <span>DÉMARRER LA SÉRIE</span>
              <span style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                {plankDuration} secondes{currentSide ? ` · côté ${currentSide}` : ''}
              </span>
            </button>
          )}

          {/* Secondary buttons */}
          <div style={styles.swSecondaryBtns}>
            <button style={styles.swSecondaryBtn} onClick={skipPlankSet} disabled={plankRunning}>
              <X size={14} />
              {isLastOverall ? 'Passer (terminer)' : 'Passer cette série'}
            </button>
            <button style={styles.swSecondaryBtn} onClick={skipAllPlank}>
              <RotateCcw size={14} />
              Aller au récap
            </button>
          </div>
        </div>
      </div>
    );
  }

  // RUNNING / PAUSED screen
  const progressPct = (currentLevel / totalLevels) * 100;
  const isPaused = phase === 'paused';

  // Pace indicator: compare cumulative time vs reference splits.
  // Primary reference = median of last 3 complete sessions (normal rhythm).
  // Fallback = v3 records if no baseline yet.
  const w = parseFloat(dumbbellWeight);
  const baselineForWeight = !isNaN(w) ? (levelBaselines?.[setType]?.[w] || null) : null;
  const recordsForWeight = !isNaN(w) ? (levelRecords?.[setType]?.[w] || null) : null;
  const paceRef = baselineForWeight || recordsForWeight;
  const paceRefLabel = baselineForWeight ? '3 dern.' : 'records';

  let paceDeltaMs = null;
  let paceColor = null;
  let paceLabel = '';

  if (paceRef) {
    // Sum of reference times for levels already completed
    const completedSplitsSum = splits.reduce((sum, s) => sum + s.duration_ms, 0);
    const recordsSum = splits.reduce((sum, s) => {
      const rec = paceRef[s.level];
      return sum + (rec && rec.time != null ? rec.time * 1000 : s.duration_ms); // fallback to actual if missing
    }, 0);

    if (recordsSum > 0 && splits.length > 0) {
      paceDeltaMs = completedSplitsSum - recordsSum;
      // Color based on cumulative delta
      if (paceDeltaMs < -2000) { paceColor = '#7dd87d'; paceLabel = 'rapide'; }
      else if (paceDeltaMs < 2000) { paceColor = '#ffc94d'; paceLabel = 'sur rythme'; }
      else if (paceDeltaMs < 8000) { paceColor = '#e8a87a'; paceLabel = 'lent'; }
      else { paceColor = '#e88a8a'; paceLabel = 'très lent'; }
    }
  }

  return (
    <div style={styles.stopwatchModal}>
      <div style={{ ...styles.stopwatchRunning, border: paceColor ? `4px solid ${paceColor}` : 'none', borderRadius: paceColor ? 10 : 0, boxShadow: paceColor ? `0 0 20px ${paceColor}30` : 'none', transition: 'border-color 0.5s ease, box-shadow 0.5s ease' }}>
        {/* Top: meta */}
        <div style={styles.swTop}>
          <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace" }}>
            Set {setType} · {currentLevel + 1}/{totalLevels} niveaux
          </div>
          <button
            style={styles.swCloseBtn}
            onClick={() => { if (confirm('Annuler la séance en cours ?')) { handleReset(); onClose(); } }}
          ><X size={16} /></button>
        </div>

        {/* Progress bar */}
        <div style={styles.swProgressBg}>
          <div style={{ ...styles.swProgressFill, width: `${progressPct}%`, background: getSetColor(setType) }} />
        </div>

        {/* Level indicator (BIG) */}
        <div style={styles.swLevelDisplay}>
          <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 3 }}>Niveau actuel</div>
          <div style={{ ...styles.swLevelBig, color: getSetColor(setType) }}>{labels[currentLevel]}</div>
          <div style={styles.swLevelReps}>Niveau {pyramid[currentLevel]} · {currentExercises.length} exos</div>
          <div style={styles.swExerciseList}>
            {currentExercises.map((exo, i) => {
              const reps = pyramid[currentLevel] * exo.repMultiplier;
              const unitPlural = reps > 1 ? exo.repUnit + 's' : exo.repUnit;
              const setColor = getSetColor(setType);
              return (
                <span key={i} style={styles.swExerciseBadge}>
                  <span style={{ color: setColor, fontWeight: 700, marginRight: 6, fontSize: 13 }}>{i + 1}</span>
                  <span style={{ fontSize: 13 }}>{exo.name}</span>
                  <strong style={{ marginLeft: 8, color: '#fff', fontSize: 18, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>{reps}</strong>
                  <span style={{ marginLeft: 4, fontSize: 11, color: '#888' }}>{unitPlural}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Time displays */}
        <div style={styles.swTimes}>
          <div style={styles.swTimeBlock}>
            <div style={styles.swTimeLabel}>Total</div>
            <div style={styles.swTimeBig}>{formatStopwatch(elapsed)}</div>
          </div>
          <div style={styles.swTimeBlock}>
            <div style={styles.swTimeLabel}>Tour en cours</div>
            <div style={{ ...styles.swTimeBig, color: getSetColor(setType) }}>{formatStopwatch(currentSplitMs)}</div>
          </div>
        </div>

        {/* Pace indicator */}
        {paceColor && paceDeltaMs !== null && (
          <div style={{ ...styles.pacingBar, background: `${paceColor}15`, border: `1px solid ${paceColor}40` }}>
            <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: "'JetBrains Mono', monospace" }}>
              vs {paceRefLabel} {dumbbellWeight}kg
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: paceColor, fontFamily: "'JetBrains Mono', monospace" }}>
              {paceDeltaMs >= 0 ? '+' : ''}{(paceDeltaMs / 1000).toFixed(1)}s
            </span>
            <span style={{ fontSize: 10, color: paceColor, textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
              {paceLabel}
            </span>
          </div>
        )}

        {/* Last splits (compact) */}
        {splits.length > 0 && (
          <div style={styles.swLastSplits}>
            <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>3 derniers tours</div>
            {splits.slice(-3).reverse().map((s, i) => (
              <div key={i} style={styles.swSplitRow}>
                <span style={{ color: '#888' }}>{labels[s.level]}</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{formatStopwatch(s.duration_ms).replace(/\.\d$/, '')}</span>
              </div>
            ))}
          </div>
        )}

        {/* BIG action button */}
        <button
          style={{
            ...styles.swMainBtn,
            background: isPaused ? '#3da9d9' : (getSetColor(setType)),
            opacity: isPaused ? 0.7 : 1
          }}
          onClick={isPaused ? handleResume : handleNextLevel}
          disabled={false}
        >
          {isPaused ? (
            <>
              <Play size={28} />
              <span>Reprendre</span>
            </>
          ) : (
            <>
              <span>TOUR SUIVANT</span>
              <span style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                → {currentLevel + 1 < totalLevels ? labels[currentLevel + 1] : 'Terminer'}
              </span>
            </>
          )}
        </button>

        {/* Secondary controls */}
        <div style={styles.swSecondaryBtns}>
          <button style={styles.swSecondaryBtn} onClick={handleUndo} disabled={splits.length === 0}>
            <RotateCcw size={14} />
            Annuler dernier
          </button>
          {!isPaused ? (
            <button style={styles.swSecondaryBtn} onClick={handlePause}>
              <Pause size={14} />
              Pause
            </button>
          ) : (
            <button style={styles.swSecondaryBtn} onClick={handleReset}>
              <X size={14} />
              Tout effacer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


// =============== SESSION FORM ===============
function SessionForm({ session, onSave, onCancel, getLastSimilar }) {
  const [type, setType] = useState(session?.type || 'A');
  const [date, setDate] = useState(session?.date || new Date().toISOString().split('T')[0]);
  const [code, setCode] = useState(session?.code || '');
  const [dumbbellWeight, setDumbbellWeight] = useState(session?.dumbbellWeight ?? 7);
  const [bodyweight, setBodyweight] = useState(session?.bodyweight ?? '');
  const [preNotes, setPreNotes] = useState(session?.preNotes || '');
  const [notes, setNotes] = useState(session?.notes || '');
  const [totalTimeStr, setTotalTimeStr] = useState(session?.totalTime != null ? formatTime(session.totalTime) : '');
  const [levelInputs, setLevelInputs] = useState(
    session?.levelTimes ? session.levelTimes.map(t => t != null ? formatTime(t) : '') : Array(19).fill('')
  );
  const [importMode, setImportMode] = useState(false);
  const [importJson, setImportJson] = useState('');

  const handleLevelChange = (idx, value) => {
    const newInputs = [...levelInputs];
    newInputs[idx] = value;
    setLevelInputs(newInputs);
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importJson);
      if (data.levelTimes && Array.isArray(data.levelTimes)) {
        setLevelInputs(data.levelTimes.map(t => t == null ? '' : (typeof t === 'string' ? t : formatTime(t))));
      }
      if (data.totalTime != null) setTotalTimeStr(typeof data.totalTime === 'string' ? data.totalTime : formatTime(data.totalTime));
      if (data.date) setDate(data.date);
      if (data.code) setCode(data.code);
      if (data.dumbbellWeight != null) setDumbbellWeight(data.dumbbellWeight);
      if (data.bodyweight != null) setBodyweight(data.bodyweight);
      if (data.type) setType(data.type);
      if (data.preNotes) setPreNotes(data.preNotes);
      if (data.notes) setNotes(data.notes);
      setImportMode(false);
      setImportJson('');
    } catch (e) {
      alert('JSON invalide');
    }
  };

  const handleSubmit = () => {
    const data = {
      type,
      date,
      code: code.trim() || null,
      dumbbellWeight: dumbbellWeight === '' ? null : parseFloat(dumbbellWeight),
      bodyweight: bodyweight === '' ? null : parseFloat(bodyweight),
      preNotes: preNotes.trim(),
      notes: notes.trim()
    };
    if (type === 'A') {
      data.totalTime = parseTime(totalTimeStr);
      const parsedLevels = levelInputs.map(parseTime);
      data.levelTimes = parsedLevels.some(t => t != null) ? parsedLevels : null;
    }
    onSave(data);
  };

  // Compare to previous similar session
  const w = parseFloat(dumbbellWeight);
  const lastSimilar = !session && !isNaN(w) && getLastSimilar ? getLastSimilar(type, w) : null;
  const lastSimilarTotal = lastSimilar ? getTotal(lastSimilar) : null;

  return (
    <div style={styles.modal} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{session ? 'Éditer' : 'Nouvelle séance'}</h2>
          <button style={styles.iconBtn} onClick={onCancel}>×</button>
        </div>

        {importMode ? (
          <div style={styles.formSection}>
            <label style={styles.formLabel}>JSON depuis le chat</label>
            <textarea
              style={{ ...styles.input, minHeight: 180, fontFamily: 'monospace', fontSize: 11 }}
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='{"date":"2026-05-06","type":"A","dumbbellWeight":7,"bodyweight":74,"totalTime":"22:16","levelTimes":[20.18,...]}'
            />
            <div style={styles.formActions}>
              <button style={styles.secondaryBtn} onClick={() => setImportMode(false)}>Annuler</button>
              <button style={styles.primaryBtn} onClick={handleImport}>Importer</button>
            </div>
          </div>
        ) : (
          <>
            <div style={styles.formGrid2}>
              <div>
                <label style={styles.formLabel}>Type</label>
                <div style={styles.toggle}>
                  {SET_TYPES.map(t => (
                    <button key={t} style={{ ...styles.toggleBtn, ...(type === t ? { background: getSetColor(t), color: '#0a0a0a', fontWeight: 700 } : {}) }} onClick={() => setType(t)}>Set {t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={styles.formLabel}>Date</label>
                <input type="date" style={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div style={styles.formGrid2}>
              <div>
                <label style={styles.formLabel}>Code (optionnel)</label>
                <input type="text" style={styles.input} value={code} onChange={(e) => setCode(e.target.value)} placeholder="ex: S19s1" />
              </div>
              <div>
                <label style={styles.formLabel}>Poids corps (kg)</label>
                <input type="number" step="0.1" style={styles.input} value={bodyweight} onChange={(e) => setBodyweight(e.target.value)} placeholder="ex: 74" />
              </div>
            </div>

            <div style={styles.formGrid2}>
              <div>
                <label style={styles.formLabel}>Haltères (kg/main)</label>
                <input type="number" step="0.5" style={styles.input} value={dumbbellWeight} onChange={(e) => setDumbbellWeight(e.target.value)} />
              </div>
              {type === 'A' && (
                <div>
                  <label style={styles.formLabel}>Temps total (MM:SS)</label>
                  <input type="text" style={styles.input} value={totalTimeStr} onChange={(e) => setTotalTimeStr(e.target.value)} placeholder="ex: 22:16" />
                </div>
              )}
            </div>

            {/* Compare to last similar */}
            {lastSimilarTotal && (
              <div style={styles.compareHint}>
                <Award size={12} style={{ color: '#ffc94d' }} />
                <span>Dernière séance {type} à {dumbbellWeight}kg : <strong>{formatTime(lastSimilarTotal)}</strong> ({new Date(lastSimilar.date).toLocaleDateString('fr-FR')})</span>
              </div>
            )}

            {/* Pre-session notes */}
            <div style={styles.formSection}>
              <label style={styles.formLabel}>Avant séance (forme, sommeil, motivation)</label>
              <input type="text" style={styles.input} value={preNotes} onChange={(e) => setPreNotes(e.target.value)} placeholder="ex: forme 7/10, mal dormi" />
            </div>

            {type === 'A' && (
              <div style={styles.formSection}>
                <div style={styles.formSectionHeader}>
                  <label style={styles.formLabel}>Splits par niveau (optionnel)</label>
                  <button style={styles.linkBtn} onClick={() => setImportMode(true)}>
                    <Upload size={12} /> Importer JSON
                  </button>
                </div>
                <div style={styles.levelGrid}>
                  {PYRAMID_LEVELS.map((lvl, idx) => (
                    <div key={idx} style={styles.levelInput}>
                      <span style={styles.levelLabel}>{LEVEL_LABELS[idx]}</span>
                      <input type="text" style={styles.levelTimeInput} value={levelInputs[idx]} onChange={(e) => handleLevelChange(idx, e.target.value)} placeholder="—" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Post-session notes */}
            <div style={styles.formSection}>
              <label style={styles.formLabel}>Après séance (ressenti, douleurs, à retravailler)</label>
              <input type="text" style={styles.input} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ex: épaules tirent, content du temps" />
            </div>

            <div style={styles.formActions}>
              <button style={styles.secondaryBtn} onClick={onCancel}>Annuler</button>
              <button style={styles.primaryBtn} onClick={handleSubmit}>{session ? 'Mettre à jour' : 'Enregistrer'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// =============== STYLES ===============
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Bebas+Neue&family=Inconsolata:wght@400;600&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #0a0a0a; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #555; }
  input[type="date"] { color-scheme: dark; }
  button:hover { opacity: 0.9; }
  button:active { transform: scale(0.98); }
`;

const styles = {
  app: { minHeight: '100vh', background: '#0a0a0a', color: '#e8e8e8', fontFamily: "'Inconsolata', monospace", padding: '16px', maxWidth: '100vw', overflowX: 'hidden', boxSizing: 'border-box', paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))', paddingTop: 'max(16px, env(safe-area-inset-top))', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' },
  loading: { minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingDot: { width: 12, height: 12, background: '#ff6b35', borderRadius: '50%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 24, borderBottom: '1px solid #1f1f1f', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  logo: { width: 40, height: 40, background: '#ff6b35', color: '#0a0a0a', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, margin: 0, letterSpacing: 3, fontWeight: 400 },
  subtitle: { fontSize: 10, color: '#666', margin: 0, textTransform: 'uppercase', letterSpacing: 2 },
  headerRight: { display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none', paddingBottom: 4 },
  nav: { display: 'flex', gap: 4, marginBottom: 24, background: '#141414', padding: 4, borderRadius: 4, maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' },
  navBtn: { background: 'transparent', color: '#888', border: 'none', padding: '8px 14px', fontSize: 11, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: 1.5, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', flexShrink: 0, whiteSpace: 'nowrap' },
  navBtnActive: { background: '#ff6b35', color: '#0a0a0a', fontWeight: 700 },
  main: { minHeight: 400 },
  primaryBtn: { background: '#ff6b35', color: '#0a0a0a', border: 'none', padding: '10px 16px', fontSize: 12, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap' },
  secondaryBtn: { background: 'transparent', color: '#888', border: '1px solid #333', padding: '10px 16px', fontSize: 12, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: 1.5, borderRadius: 3 },
  iconBtn: { background: '#141414', color: '#888', border: '1px solid #1f1f1f', width: 36, height: 36, borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 },
  iconBtnSmall: { background: 'transparent', color: '#888', border: '1px solid #2a2a2a', padding: '4px 10px', fontSize: 10, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: 1, borderRadius: 2 },
  iconBtnSmallDanger: { background: 'transparent', color: '#e88a8a', border: '1px solid #2a2a2a', padding: '4px 8px', cursor: 'pointer', borderRadius: 2, display: 'flex', alignItems: 'center' },
  linkBtn: { background: 'transparent', color: '#ff6b35', border: 'none', padding: 0, fontSize: 11, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: 4 },
  dashboard: { display: 'flex', flexDirection: 'column', gap: 16 },
  prBanner: { background: 'linear-gradient(135deg, rgba(255,201,77,0.15), rgba(255,107,53,0.05))', border: '1px solid rgba(255,201,77,0.3)', borderRadius: 4, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  prBannerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  prBannerTitle: { color: '#ffc94d', fontSize: 14, fontWeight: 600 },
  prBannerSub: { color: '#888', fontSize: 11, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" },
  fitnessScoreBanner: { background: '#141414', border: '1px solid #1f1f1f', borderRadius: 4, padding: '14px 18px' },
  fitnessScoreLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  fitnessScoreCircle: { width: 50, height: 50, borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 0, fontWeight: 600, flexShrink: 0 },
  fitnessScoreLabel: { fontSize: 14, fontWeight: 600 },
  fitnessScoreSub: { color: '#888', fontSize: 11, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" },
  miniScore: { width: 32, height: 32, borderRadius: '50%', border: '1.5px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, flexShrink: 0, cursor: 'help' },
  eraGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 },
  eraCard: { background: '#0a0a0a', border: '1px solid #1f1f1f', padding: 16, borderRadius: 4 },
  eraIndex: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: '#ff6b35', letterSpacing: 1.5, marginBottom: 4 },
  eraDates: { fontSize: 11, color: '#aaa', fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 },
  eraStats: { display: 'flex', gap: 14, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #1a1a1a' },
  eraStat: { display: 'flex', flexDirection: 'column', gap: 2 },
  eraStatVal: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: '#fff', letterSpacing: 0.5, lineHeight: 1 },
  eraStatLabel: { fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace" },
  eraPerf: { fontSize: 11, color: '#aaa', fontFamily: "'JetBrains Mono', monospace", display: 'flex', flexDirection: 'column', gap: 4 },
  overheadList: { marginTop: 16, paddingTop: 16, borderTop: '1px solid #1f1f1f' },
  overheadItem: { display: 'flex', alignItems: 'center', padding: '8px 4px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", borderBottom: '1px solid #1a1a1a' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  kpiCard: { background: '#141414', border: '1px solid #1f1f1f', padding: 18, borderRadius: 4 },
  kpiHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  kpiLabel: { fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 2 },
  kpiValue: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: '#fff', letterSpacing: 1, lineHeight: 1 },
  kpiSub: { fontSize: 11, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" },
  card: { background: '#141414', border: '1px solid #1f1f1f', borderRadius: 4, padding: 20, maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #1f1f1f' },
  cardTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, margin: 0, letterSpacing: 2, color: '#fff', fontWeight: 400 },
  cardSubtitle: { fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1.5 },
  emptyState: { background: '#141414', border: '1px dashed #2a2a2a', borderRadius: 4, padding: 60, textAlign: 'center', color: '#666', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
  emptyTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, margin: 0, letterSpacing: 2, color: '#888' },
  emptyText: { fontSize: 12, margin: 0 },
  heatmap: { width: '100%', borderCollapse: 'separate', borderSpacing: 2, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 },
  heatmapHeader: { color: '#666', fontWeight: 400, padding: '6px 4px', textAlign: 'center', fontSize: 10, textTransform: 'uppercase' },
  heatmapDateHeader: { color: '#666', fontWeight: 400, padding: '6px 8px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', minWidth: 100 },
  heatmapCell: { padding: '8px 4px', textAlign: 'center', color: '#fff', fontSize: 9, fontWeight: 600, borderRadius: 2, minWidth: 36 },
  heatmapDate: { padding: '8px', color: '#aaa', fontSize: 11, whiteSpace: 'nowrap' },
  heatmapWeight: { display: 'block', fontSize: 9, color: '#666', marginTop: 2 },
  heatmapTotal: { padding: '8px', color: '#ff6b35', fontWeight: 700, fontSize: 11, textAlign: 'center' },
  recordsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  recordCard: { background: 'linear-gradient(135deg, rgba(255,201,77,0.08), rgba(255,107,53,0.03))', border: '1px solid rgba(255,201,77,0.2)', padding: 18, borderRadius: 4, textAlign: 'center' },
  recordCardLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 },
  recordCardValue: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: '#ffc94d', letterSpacing: 1, lineHeight: 1, marginBottom: 6 },
  recordCardMeta: { fontSize: 10, color: '#666', fontFamily: "'JetBrains Mono', monospace" },
  ghostCard: { background: 'linear-gradient(135deg, rgba(155,109,255,0.08), rgba(80,50,160,0.03))', border: '1px dashed rgba(155,109,255,0.3)', padding: 18, borderRadius: 4, textAlign: 'center' },
  ghostValue: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: '#c4a4ff', letterSpacing: 1, lineHeight: 1, marginBottom: 6 },
  ghostMeta: { fontSize: 10, color: '#666', fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 },
  ghostGain: { fontSize: 10, color: '#7dd87d', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 8, borderTop: '1px solid rgba(155,109,255,0.15)' },
  recordTable: { width: '100%', borderCollapse: 'collapse', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 },
  recordTh: { color: '#666', fontWeight: 400, padding: '8px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', minWidth: 60 },
  recordThSmall: { color: '#666', fontWeight: 400, padding: '6px 4px', textAlign: 'center', fontSize: 10 },
  recordTd: { padding: '8px', color: '#aaa', fontSize: 11 },
  recordTdSmall: { padding: '6px 4px', textAlign: 'center', color: '#fff', fontSize: 10, borderTop: '1px solid #1a1a1a' },
  calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 },
  calMonth: { padding: 12, background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 4 },
  calMonthTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: '#fff', letterSpacing: 1.5, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  calMonthCount: { fontSize: 9, color: '#666', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0 },
  calDayLabels: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 },
  calDayLabel: { fontSize: 9, color: '#444', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace" },
  calDays: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 },
  calEmpty: { aspectRatio: '1', background: 'transparent' },
  calDay: { aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontFamily: "'JetBrains Mono', monospace", borderRadius: 2, fontWeight: 500, cursor: 'default' },
  sessionList: { display: 'flex', flexDirection: 'column', gap: 4 },
  sessionRow: { display: 'flex', alignItems: 'center', gap: 16, padding: '14px 12px', borderBottom: '1px solid #1a1a1a' },
  sessionType: { width: 36, height: 36, background: '#1f1f1f', color: '#ff6b35', fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, letterSpacing: 1, flexShrink: 0 },
  sessionInfo: { flex: 1, minWidth: 0 },
  sessionDate: { fontSize: 13, color: '#fff', marginBottom: 4, textTransform: 'capitalize' },
  sessionMeta: { display: 'flex', gap: 14, fontSize: 11, color: '#888', flexWrap: 'wrap' },
  sessionActions: { display: 'flex', gap: 6 },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, zIndex: 100, overflowY: 'auto' },
  modalContent: { background: '#141414', border: '1px solid #2a2a2a', borderRadius: 6, width: '100%', maxWidth: 720, padding: 28, fontFamily: "'Inconsolata', monospace" },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #1f1f1f' },
  modalTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, margin: 0, letterSpacing: 2, color: '#fff', fontWeight: 400 },
  formSection: { marginBottom: 18 },
  formSectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  formGrid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 },
  formLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1.5, display: 'block', marginBottom: 6 },
  input: { width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', color: '#fff', padding: '10px 12px', fontSize: 13, borderRadius: 3, fontFamily: "'JetBrains Mono', monospace", outline: 'none' },
  toggle: { display: 'flex', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 3, padding: 2 },
  toggleBtn: { flex: 1, background: 'transparent', border: 'none', color: '#666', padding: '8px', fontSize: 11, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: 1.5, borderRadius: 2 },
  toggleBtnActive: { background: '#ff6b35', color: '#0a0a0a', fontWeight: 700 },
  levelGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 6 },
  levelInput: { display: 'flex', flexDirection: 'column', gap: 4 },
  levelLabel: { fontSize: 10, color: '#888', fontFamily: "'JetBrains Mono', monospace", textAlign: 'center' },
  levelTimeInput: { width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', color: '#fff', padding: '6px', fontSize: 11, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", outline: 'none', textAlign: 'center' },
  formActions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: '1px solid #1f1f1f' },
  compareGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 },
  compareCard: { background: '#0a0a0a', border: '1px solid #1f1f1f', padding: 18, borderRadius: 4, textAlign: 'center' },
  compareLabel: { fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 },
  compareValue: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: '#fff', letterSpacing: 1, marginBottom: 4 },
  compareSub: { fontSize: 10, color: '#666' },
  compareHint: { background: 'rgba(255,201,77,0.05)', border: '1px solid rgba(255,201,77,0.2)', borderRadius: 3, padding: '10px 12px', marginBottom: 18, fontSize: 11, color: '#ccc', display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'JetBrains Mono', monospace" },
  programToggle: { display: 'flex', background: '#141414', border: '1px solid #1f1f1f', borderRadius: 4, padding: 4, width: 'fit-content', gap: 4 },
  programToggleBtn: { background: 'transparent', color: '#888', border: 'none', padding: '10px 24px', fontSize: 12, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: 2, borderRadius: 3, fontWeight: 600 },
  programToggleBtnActive: { color: '#0a0a0a', fontWeight: 700 },
  programHeader: { background: '#141414', border: '1px solid #1f1f1f', borderRadius: 4, padding: 24 },
  programTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, margin: '0 0 8px 0', letterSpacing: 3, fontWeight: 400 },
  programDescription: { fontSize: 13, color: '#aaa', lineHeight: 1.6, margin: '0 0 20px 0' },
  programStats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, paddingTop: 16, borderTop: '1px solid #1f1f1f' },
  programStat: { display: 'flex', flexDirection: 'column', gap: 4 },
  programStatLabel: { fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: "'JetBrains Mono', monospace" },
  programStatValue: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#fff', letterSpacing: 1, lineHeight: 1 },
  programWeight: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid #1f1f1f', fontSize: 12, color: '#aaa', fontFamily: "'JetBrains Mono', monospace" },
  exerciseList: { display: 'flex', flexDirection: 'column', gap: 12 },
  exerciseItem: { display: 'flex', gap: 16, padding: 14, background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 4 },
  exerciseNumber: { width: 32, height: 32, borderRadius: 4, color: '#0a0a0a', fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 },
  exerciseContent: { flex: 1, minWidth: 0 },
  exerciseHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
  exerciseName: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: '#fff', letterSpacing: 1.5 },
  exerciseEquipment: { fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: "'JetBrains Mono', monospace" },
  exerciseCues: { margin: 0, paddingLeft: 18, listStyle: 'none' },
  exerciseCue: { fontSize: 12, color: '#aaa', lineHeight: 1.7, position: 'relative', paddingLeft: 14 },
  pyramidVisual: { display: 'flex', flexDirection: 'column', gap: 4, padding: 4 },
  pyramidLevel: { display: 'flex', alignItems: 'center', gap: 8 },
  pyramidLevelLabel: { fontSize: 11, color: '#666', fontFamily: "'JetBrains Mono', monospace", width: 18, textAlign: 'center' },
  pyramidBar: { padding: '4px 10px', color: '#0a0a0a', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, borderRadius: 2, transition: 'width 0.3s ease' },
  weekPlan: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 },
  weekDay: { display: 'flex', flexDirection: 'column', gap: 6 },
  weekDayName: { fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: "'JetBrains Mono', monospace" },
  weekDayActivity: { padding: '12px 8px', borderRadius: 3, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },
  weekNote: { marginTop: 16, paddingTop: 16, borderTop: '1px solid #1f1f1f', fontSize: 11, color: '#aaa', lineHeight: 1.6 },
  compTable: { width: '100%', borderCollapse: 'collapse', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 },
  compTh: { color: '#666', fontWeight: 400, padding: '10px 8px', textAlign: 'left', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, borderBottom: '1px solid #2a2a2a' },
  compTd: { padding: '10px 8px', color: '#ccc', borderBottom: '1px solid #1a1a1a' },
  stopwatchBtn: { background: '#3da9d9', color: '#0a0a0a', border: 'none', padding: '10px 14px', fontSize: 12, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap' },
  stopwatchModal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))', paddingTop: 'max(16px, env(safe-area-inset-top))', paddingBottom: 'max(16px, env(safe-area-inset-bottom))', zIndex: 200, overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box' },
  stopwatchSetup: { width: '100%', maxWidth: 480, padding: 24, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 6 },
  stopwatchSetupHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #1f1f1f' },
  pyramidPreview: { padding: 16, background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 4, marginBottom: 24 },
  pyramidPreviewBadge: { padding: '4px 8px', background: '#1f1f1f', color: '#aaa', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", borderRadius: 2, fontWeight: 600 },
  stopwatchStartBtn: { width: '100%', background: '#ff6b35', color: '#0a0a0a', border: 'none', padding: '20px', fontSize: 18, fontWeight: 700, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 3, cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 },
  stopwatchRunning: { width: '100%', maxWidth: 520, height: '100%', maxHeight: '100vh', display: 'flex', flexDirection: 'column', padding: 16, gap: 12 },
  swTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 },
  swCloseBtn: { background: 'transparent', color: '#666', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6 },
  swProgressBg: { height: 4, background: '#1f1f1f', borderRadius: 2, overflow: 'hidden' },
  swProgressFill: { height: '100%', background: '#ff6b35', transition: 'width 0.3s ease' },
  swLevelDisplay: { textAlign: 'center', padding: '20px 0' },
  swLevelBig: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 96, color: '#ff6b35', letterSpacing: 2, lineHeight: 1, marginTop: 8, marginBottom: 4 },
  swLevelReps: { fontSize: 13, color: '#888', fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 },
  swExerciseList: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 },
  swExerciseBadge: { padding: '8px 12px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 4, fontSize: 14, color: '#ccc', fontFamily: "'JetBrains Mono', monospace", display: 'inline-flex', alignItems: 'center', lineHeight: 1.2 },
  swTimes: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  swTimeBlock: { background: '#141414', border: '1px solid #1f1f1f', borderRadius: 4, padding: '14px 12px', textAlign: 'center' },
  swTimeLabel: { fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" },
  swTimeBig: { fontFamily: "'JetBrains Mono', monospace", fontSize: 28, color: '#fff', fontWeight: 700, letterSpacing: 0 },
  swLastSplits: { background: '#141414', border: '1px solid #1f1f1f', borderRadius: 4, padding: 12 },
  swSplitRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" },
  swMainBtn: { width: '100%', minHeight: 100, color: '#0a0a0a', border: 'none', borderRadius: 6, fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 3, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontWeight: 400, transition: 'all 0.15s', marginTop: 'auto' },
  swSecondaryBtns: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  swSecondaryBtn: { background: '#1a1a1a', color: '#888', border: '1px solid #2a2a2a', padding: '12px', fontSize: 11, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: 1.5, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  stopwatchSummary: { width: '100%', maxWidth: 600, padding: 24, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 6, maxHeight: '90vh', overflowY: 'auto' },
  summaryTotal: { textAlign: 'center', padding: '24px 0', borderBottom: '1px solid #1f1f1f', marginBottom: 20 },
  summaryTotalValue: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 64, color: '#ff6b35', letterSpacing: 2, lineHeight: 1, marginTop: 8 },
  summarySplitsTable: { background: '#0a0a0a', borderRadius: 4, padding: 12, marginBottom: 20 },
  summarySplitsHeader: { display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr 1.2fr', gap: 8, padding: '6px 8px', fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: 1.5, borderBottom: '1px solid #1f1f1f', fontFamily: "'JetBrains Mono', monospace" },
  summarySplitsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr 1.2fr', gap: 8, padding: '6px 8px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", borderBottom: '1px solid #141414' },
  setToggle: { display: 'flex', background: '#141414', border: '1px solid #1f1f1f', borderRadius: 4, padding: 4, width: 'fit-content', gap: 4, marginBottom: 8 },
  setToggleBtn: { background: 'transparent', color: '#888', border: 'none', padding: '8px 18px', fontSize: 11, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: 1.5, borderRadius: 3, fontWeight: 600 },
  setToggleBtnActive: { fontWeight: 700 },
  footer: { textAlign: 'center', padding: '32px 16px 16px 16px', color: '#444', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, textTransform: 'uppercase' },
  aboutModal: { background: '#141414', border: '1px solid #2a2a2a', borderRadius: 6, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', fontFamily: "'Inconsolata', monospace" },
  aboutHeader: { display: 'flex', justifyContent: 'flex-end', padding: 12 },
  aboutContent: { padding: '0 32px 32px 32px', textAlign: 'center' },
  aboutLogo: { width: 56, height: 56, background: '#ff6b35', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  aboutTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, margin: '0 0 4px 0', letterSpacing: 4, fontWeight: 400, color: '#fff' },
  aboutTagline: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 3, margin: 0 },
  aboutDivider: { height: 1, background: '#2a2a2a', margin: '24px 0' },
  aboutText: { fontSize: 13, color: '#ccc', lineHeight: 1.7, margin: '0 0 14px 0', textAlign: 'left' },
  aboutInfoBlock: { textAlign: 'left' },
  aboutInfoLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" },
  aboutInfoText: { fontSize: 12, color: '#999', lineHeight: 1.6, margin: 0 },
  aboutSignature: { marginBottom: 20 },
  aboutAuthor: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: '#fff', letterSpacing: 2 },
  aboutVersion: { fontSize: 10, color: '#666', fontFamily: "'JetBrains Mono', monospace", marginTop: 4, letterSpacing: 1.5 },
  aboutEmailBtn: { width: '100%', border: '1px solid #2a2a2a', padding: '12px', fontSize: 12, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: 1.5, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 600, transition: 'all 0.2s' },
  exportReminder: { position: 'fixed', bottom: 20, left: 16, right: 16, zIndex: 100, display: 'flex', justifyContent: 'center', pointerEvents: 'none' },
  exportReminderInner: { background: '#1a1a1a', border: '1px solid #ffc94d', borderRadius: 4, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, maxWidth: 480, width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', pointerEvents: 'auto', boxSizing: 'border-box' },
  exportReminderText: { flex: 1, fontSize: 12, color: '#e8e8e8', fontFamily: "'Inconsolata', monospace", lineHeight: 1.4 },
  exportReminderSub: { fontSize: 10, color: '#888', marginTop: 2 },
  exportReminderActions: { display: 'flex', gap: 6, flexShrink: 0 },
  calPRTriangle: { position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 10px 10px 0', borderColor: 'transparent #ffc94d transparent transparent', pointerEvents: 'none' },
  finisherList: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 },
  finisherOption: { padding: '12px 14px', border: '1px solid', borderRadius: 4, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', fontFamily: "'Inconsolata', monospace" },
  finisherOptionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  finisherOptionName: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 1.5 },
  finisherOptionMeta: { fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: "'JetBrains Mono', monospace" },
  finisherOptionDesc: { fontSize: 11, color: '#aaa', lineHeight: 1.5 },
  pacingBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderRadius: 4, gap: 12 }
};
