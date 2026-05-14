// Supabase client initialization
// Uses environment variables for production, falls back to hardcoded values for dev

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sryljdxfiqnnyigoujmg.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyeWxqZHhmaXFubnlpZ291am1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDk3NDYsImV4cCI6MjA5NDI4NTc0Nn0.l9c8Y7E_l3QO6CTxuaGgvPmNaWIFkbEQuHdVe66JRDc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Helper: convert DB row (snake_case) to JS session (camelCase)
export function rowToSession(row) {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    code: row.code,
    dumbbellWeight: row.dumbbell_weight != null ? parseFloat(row.dumbbell_weight) : null,
    bodyweight: row.bodyweight != null ? parseFloat(row.bodyweight) : null,
    totalTime: row.total_time != null ? parseFloat(row.total_time) : null,
    levelTimes: row.level_times,
    preNotes: row.pre_notes || '',
    notes: row.notes || '',
    plank: row.plank,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// Helper: convert JS session (camelCase) to DB row (snake_case)
export function sessionToRow(session, userId) {
  return {
    user_id: userId,
    date: session.date,
    type: session.type,
    code: session.code || null,
    dumbbell_weight: session.dumbbellWeight != null ? parseFloat(session.dumbbellWeight) : null,
    bodyweight: session.bodyweight != null ? parseFloat(session.bodyweight) : null,
    total_time: session.totalTime != null ? parseFloat(session.totalTime) : null,
    level_times: session.levelTimes || null,
    pre_notes: session.preNotes || '',
    notes: session.notes || '',
    plank: session.plank || null
  };
}

// Sessions API
export const sessionsAPI = {
  async list(userId) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });
    if (error) throw error;
    return (data || []).map(rowToSession);
  },

  async create(session, userId) {
    const row = sessionToRow(session, userId);
    const { data, error } = await supabase
      .from('sessions')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return rowToSession(data);
  },

  async update(id, session, userId) {
    const row = sessionToRow(session, userId);
    const { data, error } = await supabase
      .from('sessions')
      .update(row)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return rowToSession(data);
  },

  async delete(id, userId) {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async bulkInsert(sessions, userId) {
    const rows = sessions.map(s => sessionToRow(s, userId));
    const { data, error } = await supabase
      .from('sessions')
      .insert(rows)
      .select();
    if (error) throw error;
    return (data || []).map(rowToSession);
  },

  async deleteAll(userId) {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  }
};
