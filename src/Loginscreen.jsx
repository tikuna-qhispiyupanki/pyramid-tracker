import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus, Sparkles, Check, X } from 'lucide-react';
import { supabase } from './supabaseClient';

function PyramidLogoBig({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="80" fill="#0a0a0a"/>
      <g fill="#ff6b35">
        <rect x="80" y="360" width="352" height="50"/>
        <rect x="120" y="310" width="272" height="50"/>
        <rect x="160" y="260" width="192" height="50"/>
        <rect x="200" y="210" width="112" height="50"/>
        <rect x="226" y="170" width="60" height="40"/>
      </g>
      <g fill="#cc5528" opacity="0.6">
        <rect x="392" y="360" width="40" height="50"/>
        <rect x="352" y="310" width="40" height="50"/>
        <rect x="312" y="260" width="40" height="50"/>
        <rect x="272" y="210" width="40" height="50"/>
      </g>
      <g fill="#ffc94d">
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

export default function LoginScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'magiclink'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });
      if (error) throw error;
      onAuthenticated(data.user);
    } catch (err) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères');
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password
      });
      if (error) throw error;
      if (data.user) {
        onAuthenticated(data.user);
      } else {
        setSuccess('Compte créé ! Vérifie ton email pour confirmer.');
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: window.location.origin }
      });
      if (error) throw error;
      setSuccess(`Lien envoyé à ${email}. Vérifie ta boîte mail et clique sur le lien pour te connecter.`);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'envoi du lien');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <PyramidLogoBig size={80} />
        </div>
        <h1 style={styles.title}>PYRAMID</h1>
        <p style={styles.subtitle}>training analytics</p>

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(mode === 'signin' ? styles.tabActive : {}) }}
            onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
          >
            Se connecter
          </button>
          <button
            style={{ ...styles.tab, ...(mode === 'signup' ? styles.tabActive : {}) }}
            onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
          >
            Créer un compte
          </button>
          <button
            style={{ ...styles.tab, ...(mode === 'magiclink' ? styles.tabActive : {}) }}
            onClick={() => { setMode('magiclink'); setError(null); setSuccess(null); }}
          >
            Magic link
          </button>
        </div>

        {success ? (
          <div style={styles.successBox}>
            <Check size={20} style={{ color: '#7dd87d' }} />
            <p style={styles.successText}>{success}</p>
            <button
              style={styles.linkBtn}
              onClick={() => { setSuccess(null); setError(null); setEmail(''); setPassword(''); }}
            >Retour</button>
          </div>
        ) : (
          <form onSubmit={mode === 'signin' ? handleSignIn : mode === 'signup' ? handleSignUp : handleMagicLink}>
            <div style={styles.field}>
              <label style={styles.label}><Mail size={12} /> Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="ton@email.com"
                style={styles.input}
              />
            </div>

            {mode !== 'magiclink' && (
              <div style={styles.field}>
                <label style={styles.label}><Lock size={12} /> Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'signup' ? 'min. 6 caractères' : ''}
                  style={styles.input}
                />
              </div>
            )}

            {error && (
              <div style={styles.errorBox}>
                <X size={14} style={{ color: '#e88a8a' }} />
                <span style={styles.errorText}>{error}</span>
              </div>
            )}

            <button type="submit" style={styles.submitBtn} disabled={loading}>
              {loading ? '...' : (
                mode === 'signin' ? (<><LogIn size={16} /> Se connecter</>) :
                mode === 'signup' ? (<><UserPlus size={16} /> Créer mon compte</>) :
                (<><Sparkles size={16} /> Envoyer le lien magique</>)
              )}
            </button>
          </form>
        )}

        <div style={styles.footerNote}>
          <p>Tes données sont stockées sur un serveur sécurisé et te suivent sur tous tes appareils.</p>
        </div>
      </div>

      <div style={styles.footer}>MANNEK · 2026</div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#e8e8e8',
    fontFamily: "'Inconsolata', monospace",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    paddingTop: 'max(16px, env(safe-area-inset-top))',
    paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
    boxSizing: 'border-box'
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#141414',
    border: '1px solid #2a2a2a',
    borderRadius: 8,
    padding: 32,
    boxSizing: 'border-box'
  },
  logoWrap: { display: 'flex', justifyContent: 'center', marginBottom: 16 },
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, margin: '0 0 4px 0', letterSpacing: 4, fontWeight: 400, color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 3, margin: '0 0 24px 0', textAlign: 'center' },
  tabs: { display: 'flex', gap: 4, background: '#0a0a0a', padding: 4, borderRadius: 4, marginBottom: 20 },
  tab: { flex: 1, background: 'transparent', color: '#888', border: 'none', padding: '8px 6px', fontSize: 10, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: 1, borderRadius: 3, fontWeight: 600 },
  tabActive: { background: '#ff6b35', color: '#0a0a0a', fontWeight: 700 },
  field: { marginBottom: 16 },
  label: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" },
  input: { width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', color: '#fff', padding: '10px 12px', fontSize: 14, fontFamily: "'Inconsolata', monospace", borderRadius: 3, boxSizing: 'border-box' },
  errorBox: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(232,138,138,0.1)', border: '1px solid rgba(232,138,138,0.3)', borderRadius: 3, marginBottom: 12 },
  errorText: { fontSize: 12, color: '#e88a8a' },
  successBox: { padding: 20, background: 'rgba(125,216,125,0.08)', border: '1px solid rgba(125,216,125,0.3)', borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' },
  successText: { fontSize: 13, color: '#ccc', margin: 0, lineHeight: 1.6 },
  linkBtn: { background: 'transparent', color: '#3da9d9', border: 'none', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', fontFamily: "'JetBrains Mono', monospace" },
  submitBtn: { width: '100%', background: '#ff6b35', color: '#0a0a0a', border: 'none', padding: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: 2, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  footerNote: { marginTop: 20, paddingTop: 20, borderTop: '1px solid #2a2a2a', fontSize: 11, color: '#666', textAlign: 'center', lineHeight: 1.6 },
  footer: { textAlign: 'center', padding: '24px 16px 0 16px', color: '#444', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, textTransform: 'uppercase' }
};
