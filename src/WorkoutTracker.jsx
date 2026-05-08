import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter } from 'recharts';
import { Activity, TrendingUp, Calendar, Dumbbell, Plus, Trash2, Download, Upload, BarChart3, Flame, Target, Database, Trophy, Zap, Award, Timer, Play, Pause, RotateCcw, Save, X } from 'lucide-react';

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

// PR detection: check if a session set new PRs vs all previous sessions
const computePRs = (sessions) => {
  const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const prsBySession = {};

  // Track best by weight bucket
  const bestTotalByWeight = {};
  const bestLevelByWeightLevel = {};

  for (const s of sorted) {
    if (s.type !== 'A') continue;
    const prs = [];
    const total = getTotal(s);
    const w = s.dumbbellWeight;

    // Total time PR (per weight)
    if (total != null && w != null) {
      const key = `${w}`;
      if (bestTotalByWeight[key] == null || total < bestTotalByWeight[key]) {
        if (bestTotalByWeight[key] != null) {
          prs.push({ type: 'total', label: `Record temps total ${w}kg`, value: total, prev: bestTotalByWeight[key] });
        }
        bestTotalByWeight[key] = total;
      }
    }

    // Level splits PRs (per weight + level)
    if (s.levelTimes && w != null) {
      s.levelTimes.forEach((t, idx) => {
        if (t == null) return;
        const key = `${w}_${idx}`;
        if (bestLevelByWeightLevel[key] == null || t < bestLevelByWeightLevel[key]) {
          if (bestLevelByWeightLevel[key] != null) {
            prs.push({ type: 'level', label: `Record ${LEVEL_LABELS[idx]} (${w}kg)`, value: t, prev: bestLevelByWeightLevel[key] });
          }
          bestLevelByWeightLevel[key] = t;
        }
      });
    }

    if (prs.length > 0) prsBySession[s.id] = prs;
  }

  return { prsBySession, bestTotalByWeight, bestLevelByWeightLevel };
};

// Get level records (best split per level per weight)
const computeLevelRecords = (sessions) => {
  const records = {}; // {weight: {levelIdx: {time, date, code}}}
  for (const s of sessions) {
    if (s.type !== 'A' || !s.levelTimes || s.dumbbellWeight == null) continue;
    const w = s.dumbbellWeight;
    if (!records[w]) records[w] = {};
    s.levelTimes.forEach((t, idx) => {
      if (t == null) return;
      if (!records[w][idx] || t < records[w][idx].time) {
        records[w][idx] = { time: t, date: s.date, code: s.code };
      }
    });
  }
  return records;
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
  const sortedA = [...sessions]
    .filter(s => s.type === 'A' && getTotal(s) != null)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const scores = {};
  for (let i = 0; i < sortedA.length; i++) {
    const s = sortedA[i];
    const total = getTotal(s);
    const w = s.dumbbellWeight;

    // Get last 5 sessions of same weight before this one
    const prevSame = sortedA.slice(0, i).filter(p => p.dumbbellWeight === w).slice(-5);
    if (prevSame.length < 2 || w == null) {
      scores[s.id] = { score: null, label: 'Première', expected: null, deltaPct: null };
      continue;
    }

    const expected = prevSame.reduce((sum, p) => sum + getTotal(p), 0) / prevSame.length;
    const deltaPct = ((expected - total) / expected) * 100; // positive = better

    // Map delta to 0-10: +3% = +1 point, centered on 5
    let scoreRaw = 5 + deltaPct / 3;
    scoreRaw = Math.max(0, Math.min(10, scoreRaw));

    // Days since last session
    const prevSession = sortedA[i - 1];
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

  useEffect(() => {
    const load = async () => {
      try {
        const result = await window.storage.get('sessions');
        if (result && result.value) {
          const parsed = JSON.parse(result.value);
          setSessions(parsed);
          if (parsed.length === 0) setShowSeedPrompt(true);
        } else {
          setShowSeedPrompt(true);
        }
      } catch (err) {
        setShowSeedPrompt(true);
      }
      setLoading(false);
    };
    load();
  }, []);

  const saveSessions = async (newSessions) => {
    setSessions(newSessions);
    try {
      await window.storage.set('sessions', JSON.stringify(newSessions));
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

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
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
          <div style={styles.logo}><Flame size={20} strokeWidth={2.5} /></div>
          <div>
            <h1 style={styles.title}>PYRAMID</h1>
            <p style={styles.subtitle}>training analytics v2</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.iconBtn} onClick={resetAll} title="Reset"><Trash2 size={14} /></button>
          <button style={styles.iconBtn} onClick={exportCSV} title="Export CSV"><Download size={16} /></button>
          <button style={styles.iconBtn} onClick={exportJSON} title="Export JSON" aria-label="Export JSON">
            <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>JSON</span>
          </button>
          <button style={styles.stopwatchBtn} onClick={() => setShowStopwatch(true)} title="Démarrer chrono">
            <Timer size={16} /> Chrono
          </button>
          <button style={styles.primaryBtn} onClick={() => { setEditingId(null); setShowForm(true); }}>
            <Plus size={16} /> Séance
          </button>
        </div>
      </header>

      <nav style={styles.nav}>
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
        />
      )}
    </div>
  );
}

// =============== DASHBOARD ===============
function Dashboard({ sessions, prsBySession, fitnessScores }) {
  const setASessions = sessions.filter(s => s.type === 'A');
  const setBSessions = sessions.filter(s => s.type === 'B');

  if (sessions.length === 0) {
    return (
      <div style={styles.emptyState}>
        <Dumbbell size={48} strokeWidth={1.5} style={{ opacity: 0.3 }} />
        <h2 style={styles.emptyTitle}>Aucune séance</h2>
        <p style={styles.emptyText}>Ajoute ta première séance.</p>
      </div>
    );
  }

  const lastA = setASessions[setASessions.length - 1];
  const prevA = setASessions[setASessions.length - 2];
  const lastTotal = lastA ? getTotal(lastA) : null;
  const prevTotal = prevA ? getTotal(prevA) : null;
  const timeDelta = lastTotal != null && prevTotal != null ? lastTotal - prevTotal : null;

  const allTotals = setASessions.map(getTotal).filter(t => t != null);
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

  // Evolution data with moving average
  const rawEvolution = setASessions
    .map(s => ({
      date: new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      total: getTotal(s),
      code: s.code,
      weight: s.dumbbellWeight
    }))
    .filter(d => d.total != null);
  const evolutionData = movingAverage(rawEvolution, 'total', 4);

  // Last session PRs and fitness score
  const lastPRs = lastA ? prsBySession[lastA.id] || [] : [];
  const lastScore = lastA ? fitnessScores?.[lastA.id] : null;

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
      {/* PR celebration banner */}
      {lastPRs.length > 0 && (
        <div style={styles.prBanner}>
          <div style={styles.prBannerLeft}>
            <Trophy size={20} style={{ color: '#ffc94d' }} />
            <div>
              <div style={styles.prBannerTitle}>
                {lastPRs.length} record{lastPRs.length > 1 ? 's' : ''} sur ta dernière séance
              </div>
              <div style={styles.prBannerSub}>{lastA.code || new Date(lastA.date).toLocaleDateString('fr-FR')}</div>
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
          sub="Set A"
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
            <h3 style={styles.cardTitle}>Évolution Set A</h3>
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
                stroke="#ff6b35"
                strokeWidth={2}
                dot={{ fill: '#ff6b35', r: 3 }}
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

      {setASessions.some(s => s.levelTimes) && <LevelHeatmap sessions={setASessions} />}
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

function LevelHeatmap({ sessions }) {
  const withSplits = sessions.filter(s => s.levelTimes && s.levelTimes.some(t => t != null));
  const recent = withSplits.slice(-10);

  const levelStats = PYRAMID_LEVELS.map((_, levelIdx) => {
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
        <h3 style={styles.cardTitle}>Heatmap par niveau</h3>
        <span style={styles.cardSubtitle}>10 dernières · vert rapide · rouge lent</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.heatmap}>
          <thead>
            <tr>
              <th style={styles.heatmapDateHeader}>Séance</th>
              {PYRAMID_LEVELS.map((lvl, i) => (
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
                  {PYRAMID_LEVELS.map((_, levelIdx) => {
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
  const weights = Object.keys(levelRecords).map(w => parseFloat(w)).sort();

  if (weights.length === 0) {
    return (
      <div style={styles.emptyState}>
        <Trophy size={48} strokeWidth={1.5} style={{ opacity: 0.3 }} />
        <h2 style={styles.emptyTitle}>Pas encore de records</h2>
        <p style={styles.emptyText}>Ajoute des séances avec splits pour voir tes records.</p>
      </div>
    );
  }

  return (
    <div style={styles.dashboard}>
      {/* Total time records */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Records temps total</h3>
          <span style={styles.cardSubtitle}>par charge</span>
        </div>
        <div style={styles.recordsGrid}>
          {weights.map(w => {
            const best = bestTotalByWeight[w];
            const session = sessions.find(s => s.dumbbellWeight === w && getTotal(s) === best);
            return (
              <div key={w} style={styles.recordCard}>
                <div style={styles.recordCardLabel}>2 × {w} kg</div>
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
          <h3 style={styles.cardTitle}>👻 Temps fantôme</h3>
          <span style={styles.cardSubtitle}>somme de tes meilleurs splits par niveau</span>
        </div>
        <p style={{ fontSize: 11, color: '#888', margin: '0 0 16px 0', lineHeight: 1.6 }}>
          Le temps que tu réaliserais si tu enchaînais tous tes meilleurs splits dans une même séance. C'est ton objectif théorique — il diminue à chaque fois que tu bats un record sur un niveau.
        </p>
        <div style={styles.recordsGrid}>
          {weights.map(w => {
            const recs = levelRecords[w];
            const splitsAvailable = PYRAMID_LEVELS.filter((_, idx) => recs[idx]).length;
            const ghostTotal = PYRAMID_LEVELS.reduce((sum, _, idx) => {
              return sum + (recs[idx]?.time || 0);
            }, 0);
            const realRecord = bestTotalByWeight[w];
            const gain = realRecord != null && ghostTotal > 0 ? realRecord - ghostTotal : null;
            const gainPct = gain != null && realRecord ? (gain / realRecord) * 100 : null;
            const isComplete = splitsAvailable === 19;

            return (
              <div key={w} style={styles.ghostCard}>
                <div style={styles.recordCardLabel}>2 × {w} kg</div>
                <div style={styles.ghostValue}>
                  {ghostTotal > 0 ? formatTime(ghostTotal) : '—'}
                </div>
                <div style={styles.ghostMeta}>
                  {splitsAvailable}/19 niveaux records
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
        const recs = levelRecords[w];
        return (
          <div key={w} style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Records par niveau · {w}kg</h3>
              <span style={styles.cardSubtitle}>meilleur temps pour chaque tour</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.recordTable}>
                <thead>
                  <tr>
                    <th style={styles.recordTh}>Niveau</th>
                    {PYRAMID_LEVELS.map((lvl, i) => (
                      <th key={i} style={styles.recordThSmall}>{lvl}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={styles.recordTd}>Temps</td>
                    {PYRAMID_LEVELS.map((_, idx) => {
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
                    {PYRAMID_LEVELS.map((_, idx) => {
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
          <span style={styles.cardSubtitle}>orange = Set A · bleu = Set B · jaune = PR</span>
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
                    const hasA = daySessions.some(s => s.type === 'A');
                    const hasB = daySessions.some(s => s.type === 'B');
                    const hasPR = daySessions.some(s => prsBySession[s.id]?.length > 0);
                    let bg = '#1a1a1a';
                    if (hasPR) bg = '#ffc94d';
                    else if (hasA && hasB) bg = '#9b6dff';
                    else if (hasA) bg = '#ff6b35';
                    else if (hasB) bg = '#3da9d9';
                    const titleParts = daySessions.map(s => `${s.type}${s.code ? ' ' + s.code : ''}: ${formatTime(getTotal(s))}`);
                    return (
                      <div
                        key={day}
                        style={{
                          ...styles.calDay,
                          background: bg,
                          color: bg === '#1a1a1a' ? '#444' : (bg === '#ffc94d' ? '#0a0a0a' : '#fff')
                        }}
                        title={titleParts.length > 0 ? titleParts.join('\n') : `${day} ${monthNames[month]}`}
                      >
                        {day}
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
                <div style={styles.sessionType}>{s.type}</div>
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
  const setASessions = sessions.filter(s => s.type === 'A');
  const withTotals = setASessions.filter(s => getTotal(s) != null);

  if (withTotals.length < 2) {
    return (
      <div style={styles.emptyState}>
        <TrendingUp size={48} strokeWidth={1.5} style={{ opacity: 0.3 }} />
        <h2 style={styles.emptyTitle}>Pas assez de données</h2>
      </div>
    );
  }

  const withSplits = setASessions.filter(s => s.levelTimes && s.levelTimes.some(t => t != null));

  const avgPerLevel = PYRAMID_LEVELS.map((lvl, idx) => {
    const times = withSplits.map(s => s.levelTimes?.[idx]).filter(t => t != null);
    const avg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    return { level: LEVEL_LABELS[idx], avg: Math.round(avg * 10) / 10, count: times.length };
  }).filter(d => d.count > 0);

  // RELATIVE SPLITS: percentage of total time per level
  // Use only sessions with full splits (or near full)
  const fullSplitSessions = withSplits.filter(s => s.levelTimes.filter(t => t != null).length >= 15);
  const avgPercentPerLevel = PYRAMID_LEVELS.map((lvl, idx) => {
    const percentages = fullSplitSessions.map(s => {
      const t = s.levelTimes[idx];
      const total = s.levelTimes.reduce((a, b) => a + (b || 0), 0);
      if (t == null || total === 0) return null;
      return (t / total) * 100;
    }).filter(p => p != null);
    const avg = percentages.length > 0 ? percentages.reduce((a, b) => a + b, 0) / percentages.length : 0;
    return { level: LEVEL_LABELS[idx], pct: Math.round(avg * 10) / 10, count: percentages.length, reps: PYRAMID_LEVELS[idx] };
  }).filter(d => d.count > 0);

  // Reps "fairness": each level should ideally take its share of time proportional to its rep count
  // Total reps = 100, so level with N reps should be ~N% of time
  // We can flag if a level takes more % than its rep share
  const totalReps = PYRAMID_LEVELS.reduce((a, b) => a + b, 0); // 100
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

  const by7kg = withTotals.filter(s => s.dumbbellWeight === 7);
  const by8kg = withTotals.filter(s => s.dumbbellWeight === 8);
  const avg7 = by7kg.length > 0 ? by7kg.reduce((sum, s) => sum + getTotal(s), 0) / by7kg.length : null;
  const avg8 = by8kg.length > 0 ? by8kg.reduce((sum, s) => sum + getTotal(s), 0) / by8kg.length : null;

  return (
    <div style={styles.dashboard}>
      {/* ERAS */}
      {eras && eras.length > 1 && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Ères d'entraînement</h3>
            <span style={styles.cardSubtitle}>périodes séparées par 14+ jours sans séance</span>
          </div>
          <div style={styles.eraGrid}>
            {eras.map((era) => {
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
            <h3 style={styles.cardTitle}>Temps moyen par niveau</h3>
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
              <Bar dataKey="avg" fill="#ff6b35" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* RELATIVE SPLITS */}
      {avgPercentWithFair.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Splits relatifs (% du total)</h3>
            <span style={styles.cardSubtitle}>orange = part réelle · gris = part équitable selon les reps</span>
          </div>
          <p style={{ fontSize: 11, color: '#888', margin: '0 0 12px 0' }}>
            Si tous les niveaux te coûtaient le même temps par rep, chaque niveau prendrait une part proportionnelle à ses reps. L'écart entre les deux barres révèle où tu craques (vert = tu vas plus vite que la moyenne par rep, rouge = tu ralentis).
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
              <Bar dataKey="pct" fill="#ff6b35" radius={[2, 2, 0, 0]} name="Part réelle" />
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

      {(avg7 || avg8) && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>2×7kg vs 2×8kg</h3>
          </div>
          <div style={styles.compareGrid}>
            <div style={styles.compareCard}>
              <div style={styles.compareLabel}>2 × 7 kg</div>
              <div style={styles.compareValue}>{avg7 ? formatTime(avg7) : '—'}</div>
              <div style={styles.compareSub}>{by7kg.length} séance{by7kg.length > 1 ? 's' : ''}</div>
            </div>
            <div style={styles.compareCard}>
              <div style={styles.compareLabel}>2 × 8 kg</div>
              <div style={styles.compareValue}>{avg8 ? formatTime(avg8) : '—'}</div>
              <div style={styles.compareSub}>{by8kg.length} séance{by8kg.length > 1 ? 's' : ''}</div>
            </div>
            {avg7 && avg8 && (
              <div style={styles.compareCard}>
                <div style={styles.compareLabel}>Différence</div>
                <div style={{ ...styles.compareValue, color: avg8 > avg7 ? '#e88a8a' : '#7dd87d' }}>
                  {avg8 > avg7 ? '+' : ''}{formatTime(Math.abs(avg8 - avg7))}
                </div>
                <div style={styles.compareSub}>impact +1kg</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============== PROGRAM ===============
function Program() {
  const [activeSet, setActiveSet] = useState('A');

  const setA = {
    name: 'Set A',
    color: '#ff6b35',
    pyramid: '1 → 10 → 1',
    levels: 19,
    repsPerExo: 100,
    totalReps: 400,
    exerciseCount: 4,
    targetTime: '22-25 min',
    weight: '2×7 kg (objectif 2×8 kg)',
    description: 'Pyramide complète, format chronométré. C\'est le set principal — celui que tu fais 2 fois par semaine.',
    exercises: [
      {
        name: 'Balancier du buste',
        equipment: '2 haltères',
        cues: [
          'Départ haltères entre les jambes',
          'Mouvement fessier + dos, bras tendus',
          'Remontée jusqu\'au niveau des yeux'
        ]
      },
      {
        name: 'Squat haltères clavicule',
        equipment: '2 haltères',
        cues: [
          'Haltères en position rack sur les clavicules',
          'Descente complète',
          'Buste droit, talons au sol'
        ]
      },
      {
        name: 'Développé Arnold assis',
        equipment: '2 haltères',
        cues: [
          'Assis, départ haltères devant le visage paumes vers soi',
          'Rotation + poussée verticale',
          'Bras tendus paumes vers l\'avant en haut'
        ]
      },
      {
        name: 'Burpees',
        equipment: 'Aucun',
        cues: [
          'Burpees complets (full burpees)',
          'Pompage en bas, saut vertical en haut',
          'Pas d\'allègement par défaut'
        ]
      }
    ],
    finishers: null
  };

  const setB = {
    name: 'Set B',
    color: '#3da9d9',
    pyramid: '1 → 8 → 1',
    levels: 15,
    repsPerExo: 64,
    totalReps: 320,
    exerciseCount: 5,
    targetTime: '22-25 min',
    weight: '1×7 kg (squat) + 2×7 kg (fentes)',
    description: 'Pyramide complémentaire au Set A. Travaille tirage, postérieure et gainage — ce que le A ne sollicite pas. À faire 1 fois par semaine, idéalement entre 2 séances Set A.',
    exercises: [
      {
        name: 'Tirage anneaux',
        equipment: 'Anneaux',
        cues: [
          'Corps gainé, pas de balancement',
          'Si tu craques en descente : descends les pieds (anneaux plus hauts par rapport au sol)',
          'Tire jusqu\'à ce que les anneaux soient au niveau de la poitrine'
        ]
      },
      {
        name: 'Squat goblet 1×7 kg',
        equipment: '1 haltère',
        cues: [
          'Un seul haltère tenu verticalement contre la poitrine, à deux mains',
          'Descente complète, buste droit',
          'Talons au sol'
        ]
      },
      {
        name: 'Pompages',
        equipment: 'Aucun',
        cues: [
          'Mains largeur d\'épaules',
          'Si tu craques : passe sur les genoux pour finir, c\'est OK',
          'Corps gainé, pas de creux dans le dos'
        ]
      },
      {
        name: 'Mountain climbers ×4',
        equipment: 'Aucun',
        cues: [
          'Position planche, genoux ramenés vers la poitrine en alternance',
          '1 unité = 4 mouvements (2 par jambe)',
          'Niveau 5 = 20 mouvements au total',
          'Rythme rapide mais bassin stable'
        ]
      },
      {
        name: 'Fentes arrières alternées',
        equipment: '2 haltères 7 kg',
        cues: [
          'Un haltère dans chaque main, le long du corps',
          '1 unité = 1 fente sur chaque jambe (niveau 5 = 5 + 5)',
          'Mouvement contrôlé, pas en sautant'
        ]
      }
    ],
    finishers: [
      {
        name: 'Planche',
        details: '3 × 30 secondes',
        cues: [
          '30 secondes de pause entre chaque tenue',
          'Avant-bras au sol, fesses alignées avec le dos',
          'Progression : 30s → 45s → 60s au fil des semaines'
        ]
      }
    ]
  };

  const current = activeSet === 'A' ? setA : setB;

  return (
    <div style={styles.dashboard}>
      {/* Set selector */}
      <div style={styles.programToggle}>
        <button
          style={{ ...styles.programToggleBtn, ...(activeSet === 'A' ? { ...styles.programToggleBtnActive, background: setA.color } : {}) }}
          onClick={() => setActiveSet('A')}
        >
          Set A
        </button>
        <button
          style={{ ...styles.programToggleBtn, ...(activeSet === 'B' ? { ...styles.programToggleBtnActive, background: setB.color } : {}) }}
          onClick={() => setActiveSet('B')}
        >
          Set B
        </button>
      </div>

      {/* Header card with key info */}
      <div style={{ ...styles.programHeader, borderLeft: `4px solid ${current.color}` }}>
        <h2 style={{ ...styles.programTitle, color: current.color }}>{current.name}</h2>
        <p style={styles.programDescription}>{current.description}</p>
        <div style={styles.programStats}>
          <div style={styles.programStat}>
            <span style={styles.programStatLabel}>Pyramide</span>
            <span style={styles.programStatValue}>{current.pyramid}</span>
          </div>
          <div style={styles.programStat}>
            <span style={styles.programStatLabel}>Niveaux</span>
            <span style={styles.programStatValue}>{current.levels}</span>
          </div>
          <div style={styles.programStat}>
            <span style={styles.programStatLabel}>Reps/exo</span>
            <span style={styles.programStatValue}>{current.repsPerExo}</span>
          </div>
          <div style={styles.programStat}>
            <span style={styles.programStatLabel}>Total reps</span>
            <span style={styles.programStatValue}>{current.totalReps}</span>
          </div>
          <div style={styles.programStat}>
            <span style={styles.programStatLabel}>Exercices</span>
            <span style={styles.programStatValue}>{current.exerciseCount}</span>
          </div>
          <div style={styles.programStat}>
            <span style={styles.programStatLabel}>Temps cible</span>
            <span style={styles.programStatValue}>{current.targetTime}</span>
          </div>
        </div>
        <div style={styles.programWeight}>
          <Dumbbell size={14} style={{ color: current.color }} />
          <span><strong>Charge :</strong> {current.weight}</span>
        </div>
      </div>

      {/* Exercises */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Exercices · ordre d'enchaînement</h3>
          <span style={styles.cardSubtitle}>chaque exo : reps = niveau actuel</span>
        </div>
        <div style={styles.exerciseList}>
          {current.exercises.map((exo, idx) => (
            <div key={idx} style={styles.exerciseItem}>
              <div style={{ ...styles.exerciseNumber, background: current.color }}>{idx + 1}</div>
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

      {/* Finishers (Set B only) */}
      {current.finishers && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Finition · hors pyramide</h3>
            <span style={styles.cardSubtitle}>après les 5 exercices</span>
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

      {/* Weekly plan */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Plan hebdomadaire type</h3>
          <span style={styles.cardSubtitle}>2 × Set A + 1 × Set B</span>
        </div>
        <div style={styles.weekPlan}>
          {[
            { day: 'Lundi', activity: 'Set A', color: setA.color },
            { day: 'Mardi', activity: 'Repos', color: '#333' },
            { day: 'Mercredi', activity: 'Set B', color: setB.color },
            { day: 'Jeudi', activity: 'Repos', color: '#333' },
            { day: 'Vendredi', activity: 'Set A', color: setA.color },
            { day: 'Samedi', activity: 'Repos / Set A', color: '#666' },
            { day: 'Dimanche', activity: 'Repos', color: '#333' }
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
          <strong>Repos minimum :</strong> 48h entre 2 Set A. 72h conseillés entre Set A et Set B si les épaules tirent.
        </div>
      </div>

      {/* Complementarity grid (visible on both sets) */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Complémentarité A & B</h3>
          <span style={styles.cardSubtitle}>ce que chaque set sollicite</span>
        </div>
        <table style={styles.compTable}>
          <thead>
            <tr>
              <th style={styles.compTh}>Sollicitation</th>
              <th style={{ ...styles.compTh, color: setA.color }}>Set A</th>
              <th style={{ ...styles.compTh, color: setB.color }}>Set B</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Tirer (dos)', '—', '✓ tirage anneaux'],
              ['Pousser vertical', '✓ Arnold', '—'],
              ['Pousser horizontal', '—', '✓ pompages'],
              ['Quadriceps', '✓ squat clavicule', '✓ squat goblet'],
              ['Postérieure (fessiers/ischios)', '~ balancier', '✓ fentes'],
              ['Cardio explosif', '✓ burpees', '✓ mountain climbers'],
              ['Gainage', 'indirect', '✓ planche']
            ].map((row, i) => (
              <tr key={i}>
                <td style={styles.compTd}>{row[0]}</td>
                <td style={{ ...styles.compTd, textAlign: 'center' }}>{row[1]}</td>
                <td style={{ ...styles.compTd, textAlign: 'center' }}>{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// =============== STOPWATCH ===============
function Stopwatch({ onClose, onSave, suggestedCode }) {
  const [setType, setSetType] = useState('A'); // A = 19 levels, B = 15 levels
  const [phase, setPhase] = useState('setup'); // setup | running | paused | finished
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0); // total ms
  const [pausedAt, setPausedAt] = useState(0); // ms paused so far
  const [pauseStart, setPauseStart] = useState(null);
  const [splits, setSplits] = useState([]); // Array of {level, time_ms, duration_ms}
  const [currentLevel, setCurrentLevel] = useState(0); // index in pyramid
  const [showSummary, setShowSummary] = useState(false);

  // Form fields for save - code is pre-filled with suggestion
  const [code, setCode] = useState(suggestedCode || '');
  const [dumbbellWeight, setDumbbellWeight] = useState(7);
  const [bodyweight, setBodyweight] = useState('');
  const [preNotes, setPreNotes] = useState('');
  const [notes, setNotes] = useState('');

  const pyramidA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const pyramidB = [1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1];
  const pyramid = setType === 'A' ? pyramidA : pyramidB;
  const labels = pyramid.map((lvl, idx) => `${idx < pyramid.length / 2 - 0.5 ? '↑' : idx === Math.floor(pyramid.length / 2) ? '◆' : '↓'}${lvl}`);
  const totalLevels = pyramid.length;

  // Exercise lists for display during workout
  const exercisesA = ['Balancier', 'Squat clavicule', 'Arnold', 'Burpees'];
  const exercisesB = ['Tirage anneaux', 'Squat goblet', 'Pompages', 'Mountain climbers', 'Fentes'];
  const currentExercises = setType === 'A' ? exercisesA : exercisesB;

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
      // Finished
      setPhase('finished');
      setShowSummary(true);
    } else {
      setCurrentLevel(currentLevel + 1);
    }
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
    // Build levelTimes array (Set A = 19 levels)
    const levelTimes = setType === 'A'
      ? splits.map(s => s.duration_ms / 1000)
      : null; // Set B not yet supported in main schema

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
              <button
                style={{ ...styles.toggleBtn, ...(setType === 'A' ? styles.toggleBtnActive : {}) }}
                onClick={() => setSetType('A')}
              >Set A · 19 niveaux</button>
              <button
                style={{ ...styles.toggleBtn, ...(setType === 'B' ? styles.toggleBtnActive : {}) }}
                onClick={() => setSetType('B')}
              >Set B · 15 niveaux</button>
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
            <div style={styles.summaryTotalValue}>{formatStopwatch(elapsed).replace(/\.\d$/, '')}</div>
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
                <span style={{ color: '#ff6b35', fontWeight: 700 }}>{labels[s.level]}</span>
                <span style={{ color: '#888' }}>{pyramid[s.level]}</span>
                <span style={{ color: '#fff' }}>{formatStopwatch(s.duration_ms).replace(/\.\d$/, '')}</span>
                <span style={{ color: '#666' }}>{formatStopwatch(s.time_ms).replace(/\.\d$/, '')}</span>
              </div>
            ))}
          </div>

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

  // RUNNING / PAUSED screen
  const progressPct = (currentLevel / totalLevels) * 100;
  const isPaused = phase === 'paused';

  return (
    <div style={styles.stopwatchModal}>
      <div style={styles.stopwatchRunning}>
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
          <div style={{ ...styles.swProgressFill, width: `${progressPct}%` }} />
        </div>

        {/* Level indicator (BIG) */}
        <div style={styles.swLevelDisplay}>
          <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 3 }}>Niveau actuel</div>
          <div style={styles.swLevelBig}>{labels[currentLevel]}</div>
          <div style={styles.swLevelReps}>{pyramid[currentLevel]} rep{pyramid[currentLevel] > 1 ? 's' : ''} × {currentExercises.length} exos</div>
          <div style={styles.swExerciseList}>
            {currentExercises.map((exo, i) => (
              <span key={i} style={styles.swExerciseBadge}>
                <span style={{ color: '#ff6b35', fontWeight: 700, marginRight: 4 }}>{i + 1}</span>
                {exo}
              </span>
            ))}
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
            <div style={{ ...styles.swTimeBig, color: '#ff6b35' }}>{formatStopwatch(currentSplitMs)}</div>
          </div>
        </div>

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
            background: isPaused ? '#3da9d9' : '#ff6b35',
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
                  <button style={{ ...styles.toggleBtn, ...(type === 'A' ? styles.toggleBtnActive : {}) }} onClick={() => setType('A')}>Set A</button>
                  <button style={{ ...styles.toggleBtn, ...(type === 'B' ? styles.toggleBtnActive : {}) }} onClick={() => setType('B')}>Set B</button>
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
  app: { minHeight: '100vh', background: '#0a0a0a', color: '#e8e8e8', fontFamily: "'Inconsolata', monospace", padding: '24px', maxWidth: 1400, margin: '0 auto' },
  loading: { minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingDot: { width: 12, height: 12, background: '#ff6b35', borderRadius: '50%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 24, borderBottom: '1px solid #1f1f1f', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  logo: { width: 40, height: 40, background: '#ff6b35', color: '#0a0a0a', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, margin: 0, letterSpacing: 3, fontWeight: 400 },
  subtitle: { fontSize: 10, color: '#666', margin: 0, textTransform: 'uppercase', letterSpacing: 2 },
  headerRight: { display: 'flex', gap: 8, alignItems: 'center' },
  nav: { display: 'flex', gap: 4, marginBottom: 24, background: '#141414', padding: 4, borderRadius: 4, width: 'fit-content', flexWrap: 'wrap' },
  navBtn: { background: 'transparent', color: '#888', border: 'none', padding: '8px 14px', fontSize: 11, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: 1.5, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' },
  navBtnActive: { background: '#ff6b35', color: '#0a0a0a', fontWeight: 700 },
  main: { minHeight: 400 },
  primaryBtn: { background: '#ff6b35', color: '#0a0a0a', border: 'none', padding: '10px 16px', fontSize: 12, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 6 },
  secondaryBtn: { background: 'transparent', color: '#888', border: '1px solid #333', padding: '10px 16px', fontSize: 12, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: 1.5, borderRadius: 3 },
  iconBtn: { background: '#141414', color: '#888', border: '1px solid #1f1f1f', width: 36, height: 36, borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 },
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
  card: { background: '#141414', border: '1px solid #1f1f1f', borderRadius: 4, padding: 20 },
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
  stopwatchBtn: { background: '#3da9d9', color: '#0a0a0a', border: 'none', padding: '10px 14px', fontSize: 12, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 6 },
  stopwatchModal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 200, overflowY: 'auto' },
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
  swExerciseList: { display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginTop: 4 },
  swExerciseBadge: { padding: '4px 10px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 3, fontSize: 11, color: '#ccc', fontFamily: "'JetBrains Mono', monospace", display: 'inline-flex', alignItems: 'center' },
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
  summarySplitsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr 1.2fr', gap: 8, padding: '6px 8px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", borderBottom: '1px solid #141414' }
};
