import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Figtree:wght@300;400;500;600&display=swap');

  :root {
    --bg-left: #08080b;
    --bg-right: #0d0d11;
    --bg-card: #13131a;
    --bg-input: #0f0f15;
    --accent: #7c5cfc;
    --accent-light: #a78bfa;
    --text-primary: #eeeaf8;
    --text-secondary: #6b6880;
    --text-muted: #35333f;
    --border: #1a1a24;
    --border-focus: rgba(124,92,252,0.45);
    --font-display: 'Syne', sans-serif;
    --font-body: 'Figtree', sans-serif;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg-right); color: var(--text-primary); font-family: var(--font-body); }

  /* ─── Layout ─────────────────────────────────────── */
  .ln-wrap { display: flex; min-height: 100vh; width: 100%; }

  /* ─── Left Panel ─────────────────────────────────── */
  .ln-left {
    width: 44%;
    background: var(--bg-left);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 3rem 3.5rem;
    border-right: 1px solid var(--border);
    position: relative;
    overflow: hidden;
  }
  .ln-left::after {
    content: '';
    position: absolute;
    top: -180px; left: -120px;
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(124,92,252,0.07) 0%, transparent 65%);
    pointer-events: none;
  }

  .ln-logo {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
  }
  .ln-logo-box {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #7c5cfc 0%, #a78bfa 100%);
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .ln-logo-box svg { display: block; }
  .ln-logo-name {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: 0.03em;
  }

  .ln-hero { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 3rem 0 2rem; }
  .ln-headline {
    font-family: var(--font-display);
    font-size: clamp(2rem, 3.8vw, 3.2rem);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.025em;
    color: var(--text-primary);
  }
  .ln-headline .acc {
    display: block;
    background: linear-gradient(120deg, #7c5cfc, #c4b5fd);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .ln-tagline {
    margin-top: 1.1rem;
    font-size: 0.88rem;
    color: var(--text-secondary);
    line-height: 1.75;
    max-width: 320px;
  }
  .ln-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 2rem;
  }
  .ln-pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 100px;
    padding: 6px 14px;
    font-size: 0.73rem;
    color: var(--text-secondary);
    font-weight: 500;
  }
  .pill-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .dot-green { background: #10b981; box-shadow: 0 0 7px #10b981; }
  .dot-purple { background: #7c5cfc; box-shadow: 0 0 7px #7c5cfc; }
  .dot-amber { background: #f59e0b; box-shadow: 0 0 7px #f59e0b; }

  .ln-left-foot { font-size: 0.7rem; color: var(--text-muted); }

  /* ─── Right Panel ────────────────────────────────── */
  .ln-right {
    flex: 1;
    background: var(--bg-right);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 2rem 5rem;
    overflow-y: auto;
    position: relative;
  }

  .ln-form-box { width: 100%; max-width: 420px; }

  /* Pill toggle tabs */
  .ln-toggle-tabs {
    display: inline-flex;
    align-items: center;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 100px;
    padding: 4px;
    gap: 3px;
    margin-bottom: 2.5rem;
  }
  .ln-toggle-tab {
    background: transparent;
    border: none;
    border-radius: 100px;
    padding: 8px 24px;
    font-family: var(--font-body);
    font-size: 0.83rem;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
    white-space: nowrap;
  }
  .ln-toggle-tab.on {
    background: var(--text-primary);
    color: #0a0a0d;
    font-weight: 600;
  }

  .ln-title {
    font-family: var(--font-display);
    font-size: 1.85rem;
    font-weight: 700;
    letter-spacing: -0.025em;
    color: var(--text-primary);
    margin-bottom: 0.35rem;
  }
  .ln-subtitle {
    font-size: 0.84rem;
    color: var(--text-secondary);
    margin-bottom: 2rem;
    line-height: 1.5;
  }

  /* Sub-tabs (admin / user) */
  .ln-sub-tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 1.6rem;
  }
  .ln-sub-tab {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 7px 20px;
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--text-secondary);
    cursor: pointer;
    font-family: var(--font-body);
    transition: all 0.2s;
  }
  .ln-sub-tab.on {
    background: rgba(124,92,252,0.1);
    border-color: rgba(124,92,252,0.3);
    color: var(--accent-light);
  }

  /* Fields */
  .ln-field { margin-bottom: 1.1rem; }
  .ln-field-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.45rem;
  }
  .ln-label {
    font-size: 0.68rem;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: var(--text-secondary);
    font-weight: 600;
  }
  .ln-forgot {
    background: none; border: none;
    font-size: 0.72rem;
    color: var(--accent);
    cursor: pointer;
    font-family: var(--font-body);
    transition: color 0.2s;
  }
  .ln-forgot:hover { color: var(--accent-light); }

  .ln-input, .ln-select {
    width: 100%;
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.85rem 1rem;
    color: var(--text-primary);
    font-size: 0.88rem;
    font-family: var(--font-body);
    transition: border-color 0.2s, background 0.2s;
  }
  .ln-input::placeholder { color: var(--text-muted); }
  .ln-input:focus, .ln-select:focus {
    outline: none;
    border-color: var(--border-focus);
    background: #111118;
  }
  .ln-select { appearance: none; cursor: pointer; color: var(--text-primary); }
  option { background: #1a1a24; }

  /* Submit */
  .ln-btn {
    width: 100%;
    background: linear-gradient(135deg, #7c5cfc 0%, #9f7dfc 100%);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 1rem 1.5rem;
    font-size: 0.88rem;
    font-weight: 600;
    font-family: var(--font-body);
    cursor: pointer;
    margin-top: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    letter-spacing: 0.01em;
    position: relative;
    overflow: hidden;
    transition: transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 4px 24px rgba(124,92,252,0.25);
  }
  .ln-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 32px rgba(124,92,252,0.35);
  }
  .ln-btn:active:not(:disabled) { transform: translateY(0); }
  .ln-btn:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
  .ln-btn-arrow { font-size: 1rem; line-height: 1; }

  /* Messages */
  .ln-msg {
    padding: 0.85rem 1rem;
    border-radius: 8px;
    margin-bottom: 1.2rem;
    font-size: 0.82rem;
    line-height: 1.5;
  }
  .ln-err { background: rgba(239,68,68,0.07); color: #f87171; border: 1px solid rgba(239,68,68,0.15); }
  .ln-ok  { background: rgba(16,185,129,0.07); color: #34d399; border: 1px solid rgba(16,185,129,0.15); }

  /* Spinner */
  .ln-spin {
    width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: #fff;
    border-radius: 50%;
    animation: _spin 0.7s linear infinite;
  }
  @keyframes _spin { to { transform: rotate(360deg); } }

  /* Divider */
  .ln-div {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 1.8rem 0;
  }
  .ln-div-line { flex: 1; height: 1px; background: var(--border); }
  .ln-div-txt {
    font-size: 0.68rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    white-space: nowrap;
  }

  /* Social */
  .ln-social { display: flex; gap: 10px; }
  .ln-soc-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.75rem;
    color: var(--text-secondary);
    font-size: 0.82rem;
    font-weight: 500;
    font-family: var(--font-body);
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
  }
  .ln-soc-btn:hover { border-color: #2e2e3e; color: var(--text-primary); }

  /* Legal */
  .ln-legal {
    margin-top: 2rem;
    font-size: 0.7rem;
    color: var(--text-muted);
    text-align: center;
    line-height: 1.7;
  }
  .ln-legal a { color: var(--text-secondary); text-decoration: none; transition: color 0.15s; }
  .ln-legal a:hover { color: var(--text-primary); }

  /* Bottom bar */
  .ln-foot {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2.5rem;
    border-top: 1px solid var(--border);
  }
  .ln-foot-copy { font-size: 0.68rem; color: var(--text-muted); }
  .ln-foot-links { display: flex; gap: 1.5rem; }
  .ln-foot-links a {
    font-size: 0.68rem;
    color: var(--text-muted);
    text-decoration: none;
    transition: color 0.15s;
  }
  .ln-foot-links a:hover { color: var(--text-secondary); }

  /* Responsive */
  @media (max-width: 860px) {
    .ln-wrap { flex-direction: column; }
    .ln-left { width: 100%; padding: 2.5rem 1.75rem; }
    .ln-hero { padding: 2rem 0 1.5rem; }
    .ln-right { padding: 2.5rem 1.5rem 6rem; }
    .ln-foot { padding: 1rem 1.5rem; }
  }
`;

export default function LoginPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [tab, setTab]         = useState('login');   // 'login' | 'register'
  const [regType, setRegType] = useState('user');    // 'admin' | 'user'

  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');

  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgType, setNewOrgType] = useState('college');

  const [orgs, setOrgs]     = useState([]);
  const [orgId, setOrgId]   = useState('');
  const [orgName, setOrgName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadOrgs = async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, type')
          .order('name');
        if (error) throw error;
        const list = data || [];
        setOrgs(list);
        if (list.length > 0) { setOrgId(list[0].id); setOrgName(list[0].name); }
      } catch { /* swallow */ }
    };
    loadOrgs();
  }, []);

  const reset = () => { setError(''); setSuccess(''); setName(''); setEmail(''); setPassword(''); setNewOrgName(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      if (tab === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message?.toLowerCase().includes('email not confirmed'))
            throw new Error('Your email is not confirmed yet. Please check your inbox (and spam folder) for a confirmation link from Supabase.');
          if (error.message?.toLowerCase().includes('invalid login credentials'))
            throw new Error('Invalid email or password. If you just registered, please confirm your email first.');
          throw error;
        }
      } else if (regType === 'admin') {
        if (!newOrgName.trim()) throw new Error('Organization name is required');
        const { data: orgData, error: orgErr } = await supabase
          .from('organizations')
          .insert({ name: newOrgName.trim(), type: newOrgType })
          .select().single();
        if (orgErr) throw new Error(orgErr.message?.includes('unique') ? 'Organization name already taken' : orgErr.message);
        const { error: memberErr } = await supabase
          .from('members')
          .insert({ name: name.trim(), email: email.toLowerCase().trim(), role: 'admin', member_type: 'general', org_id: orgData.id, is_registered: true });
        if (memberErr) throw new Error(memberErr.message);
        const { error: signUpErr } = await signUp(email, password, 'admin', orgData.id, newOrgName.trim());
        if (signUpErr) throw signUpErr;
        setSuccess('Admin account created! Check your email to confirm, then sign in.');
        setTab('login'); reset();
      } else {
        if (!orgId) throw new Error('Please select an organization');
        await api.post('/auth/validate-user', { email: email.toLowerCase().trim(), org_id: orgId });
        const { error: signUpErr } = await signUp(email, password, 'user', orgId, orgName);
        if (signUpErr) throw signUpErr;
        await supabase
          .from('members')
          .update({ is_registered: true, name: name.trim() })
          .eq('email', email.toLowerCase().trim())
          .eq('org_id', orgId);
        setSuccess('Account created! Check your email to confirm, then sign in.');
        setTab('login'); reset();
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const btnLabel = loading ? 'Processing…'
    : tab === 'login' ? 'Access Workspace'
    : regType === 'admin' ? 'Create Admin Account'
    : 'Create Account';

  return (
    <>
      <style>{styles}</style>
      <div className="ln-wrap">

        {/* ── LEFT ── */}
        <div className="ln-left">
          <div className="ln-logo">
            <div className="ln-logo-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="ln-logo-name">Smart Navigator</span>
          </div>

          <div className="ln-hero">
            <h1 className="ln-headline">
              Your Knowledge,<br />
              <span className="acc">Intelligently</span>
              Navigated.
            </h1>
            <p className="ln-tagline">
              Precision-engineered workspace intelligence for modern teams and institutions.
            </p>
            <div className="ln-pills">
              <span className="ln-pill"><span className="pill-dot dot-green" />99.9% Uptime</span>
              <span className="ln-pill"><span className="pill-dot dot-purple" />10k+ Documents</span>
              <span className="ln-pill"><span className="pill-dot dot-amber" />200ms Response</span>
            </div>
          </div>

          <div className="ln-left-foot">© 2025 Smart Navigator. Built for knowledge.</div>
        </div>

        {/* ── RIGHT ── */}
        <div className="ln-right">
          <div className="ln-form-box">

            {/* Pill tabs */}
            <div className="ln-toggle-tabs">
              <button className={`ln-toggle-tab ${tab === 'login' ? 'on' : ''}`}
                onClick={() => { setTab('login'); reset(); }}>
                Sign In
              </button>
              <button className={`ln-toggle-tab ${tab === 'register' ? 'on' : ''}`}
                onClick={() => { setTab('register'); reset(); }}>
                Register
              </button>
            </div>

            <h2 className="ln-title">
              {tab === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="ln-subtitle">
              {tab === 'login'
                ? 'Enter your credentials to access your workspace.'
                : 'Join the knowledge network.'}
            </p>

            {/* Admin / User sub-tabs */}
            {tab === 'register' && (
              <div className="ln-sub-tabs">
                <button className={`ln-sub-tab ${regType === 'user' ? 'on' : ''}`}
                  onClick={() => setRegType('user')}>User</button>
                <button className={`ln-sub-tab ${regType === 'admin' ? 'on' : ''}`}
                  onClick={() => setRegType('admin')}>Admin</button>
              </div>
            )}

            {error   && <div className="ln-msg ln-err">{error}</div>}
            {success && <div className="ln-msg ln-ok">{success}</div>}

            <form onSubmit={handleSubmit}>
              {tab === 'register' && (
                <div className="ln-field">
                  <div className="ln-field-top"><label className="ln-label">Full Name</label></div>
                  <input className="ln-input" type="text" placeholder="Your name"
                    value={name} onChange={e => setName(e.target.value)} required />
                </div>
              )}

              <div className="ln-field">
                <div className="ln-field-top"><label className="ln-label">Email Address</label></div>
                <input className="ln-input" type="email" placeholder="name@company.com"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>

              <div className="ln-field">
                <div className="ln-field-top">
                  <label className="ln-label">Password</label>
                  {tab === 'login' && <button type="button" className="ln-forgot">Forgot?</button>}
                </div>
                <input className="ln-input" type="password" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>

              {/* Admin: create org */}
              {tab === 'register' && regType === 'admin' && (
                <>
                  <div className="ln-field">
                    <div className="ln-field-top"><label className="ln-label">Organization Name</label></div>
                    <input className="ln-input" type="text" placeholder="e.g. Manipal University Jaipur"
                      value={newOrgName} onChange={e => setNewOrgName(e.target.value)} required />
                  </div>
                  <div className="ln-field">
                    <div className="ln-field-top"><label className="ln-label">Organization Type</label></div>
                    <select className="ln-select" value={newOrgType} onChange={e => setNewOrgType(e.target.value)}>
                      <option value="college">College / University</option>
                      <option value="company">Company / Enterprise</option>
                      <option value="community">Community / NGO</option>
                    </select>
                  </div>
                </>
              )}

              {/* User: select org */}
              {tab === 'register' && regType === 'user' && (
                <div className="ln-field">
                  <div className="ln-field-top"><label className="ln-label">Organization</label></div>
                  {orgs.length === 0
                    ? <div className="ln-msg ln-err" style={{ margin: 0 }}>No organizations found. Ask your admin to register first.</div>
                    : (
                      <select className="ln-select" value={orgId} onChange={e => {
                        setOrgId(e.target.value);
                        const sel = orgs.find(o => o.id === e.target.value);
                        if (sel) setOrgName(sel.name);
                      }} required>
                        {orgs.map(org => (
                          <option key={org.id} value={org.id}>{org.name} · {org.type.toUpperCase()}</option>
                        ))}
                      </select>
                    )}
                </div>
              )}

              <button type="submit" className="ln-btn" disabled={loading}>
                {loading && <span className="ln-spin" />}
                {btnLabel}
                {!loading && <span className="ln-btn-arrow">→</span>}
              </button>
            </form>

            <div className="ln-div">
              <div className="ln-div-line" />
              <span className="ln-div-txt">or continue with</span>
              <div className="ln-div-line" />
            </div>

            <div className="ln-social">
              <button type="button" className="ln-soc-btn" onClick={signInWithGoogle}>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button type="button" className="ln-soc-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                GitHub
              </button>
            </div>

            <div className="ln-legal">
              By signing in, you agree to our{' '}
              <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
            </div>
          </div>

          {/* Bottom bar */}
          <div className="ln-foot">
            <span className="ln-foot-copy">© 2025 Smart Navigator. Built for knowledge.</span>
            <nav className="ln-foot-links">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Status</a>
              <a href="#">Docs</a>
            </nav>
          </div>
        </div>

      </div>
    </>
  );
}
