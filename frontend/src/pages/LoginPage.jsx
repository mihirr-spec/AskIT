import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600&display=swap');

  :root {
    --left-bg: #1c1c1e;
    --right-bg: #0c0c0c;
    --text-primary: #f5f5f5;
    --text-secondary: #8E8F94;
    --input-bg: #18191B;
    --btn-bg: #EAE8DF;
    --btn-text: #050505;
    --border-color: #2D2D31;
    --font-serif: 'DM Serif Display', serif;
    --font-sans: 'Inter', sans-serif;
  }

  body { margin: 0; padding: 0; box-sizing: border-box; background: var(--right-bg); color: var(--text-primary); font-family: var(--font-sans); }

  .split-layout { display: flex; min-height: 100vh; width: 100%; }

  .panel-left {
    flex: 1;
    background: linear-gradient(135deg, #222225 0%, #151517 100%);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 6vw;
    border-right: 1px solid rgba(255,255,255,0.03);
  }
  .left-header { letter-spacing: 0.25em; font-size: 10px; text-transform: uppercase; color: #6D6E72; font-weight: 600; }
  .brand-title { font-family: var(--font-serif); font-size: clamp(3rem, 6vw, 5rem); line-height: 1.1; color: #E6E4DD; letter-spacing: -0.01em; margin-top: 2vh; }
  .brand-title em { font-style: italic; font-weight: normal; display: block; }
  .brand-title span { display: block; margin-left: 2rem; }
  .quote-text { font-family: var(--font-serif); font-size: 1.1rem; font-style: italic; color: #8E8F94; line-height: 1.6; margin-bottom: 2rem; }
  .vol-text { display: flex; align-items: center; gap: 1rem; font-size: 10px; letter-spacing: 0.1em; color: #4D4E52; }
  .vol-line { width: 40px; height: 1px; background: #4D4E52; }

  .panel-right { flex: 1; background: var(--right-bg); display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 2rem; overflow-y: auto; }
  .form-container { width: 100%; max-width: 400px; }
  .form-title { font-family: var(--font-serif); font-size: 2.2rem; margin-bottom: 0.5rem; font-weight: normal; }
  .form-subtitle { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 2rem; }

  .auth-tabs { display: flex; gap: 0; margin-bottom: 2rem; border-bottom: 1px solid var(--border-color); }
  .auth-tab { background: none; border: none; border-bottom: 2px solid transparent; padding: 10px 20px; font-size: 11px; letter-spacing: 1px; font-weight: 700; text-transform: uppercase; color: #6D6E72; cursor: pointer; margin-bottom: -1px; transition: 0.2s; }
  .auth-tab.active { color: var(--text-primary); border-bottom-color: #EAE8DF; }

  .reg-tabs { display: flex; gap: 8px; margin-bottom: 1.5rem; }
  .reg-tab { background: transparent; border: 1px solid var(--border-color); color: #6D6E72; padding: 8px 16px; font-size: 10px; letter-spacing: 1px; font-weight: 600; text-transform: uppercase; cursor: pointer; border-radius: 3px; transition: 0.2s; }
  .reg-tab.active { background: #1e1e21; border-color: #5D6A8E; color: var(--text-primary); }

  .input-group { margin-bottom: 1.2rem; }
  .input-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; }
  .input-label { font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: #6D6E72; font-weight: 600; }
  .forgot-link { font-size: 9px; letter-spacing: 0.05em; color: #5D6A8E; text-decoration: none; cursor: pointer; }
  .forgot-link:hover { color: #8F9EC4; }

  .styled-input, .styled-select {
    width: 100%; background: var(--input-bg); border: 1px solid transparent; border-radius: 4px;
    padding: 0.9rem 1.2rem; color: var(--text-primary); font-size: 0.9rem; font-family: var(--font-sans);
    transition: border-color 0.2s; box-sizing: border-box;
  }
  .styled-input::placeholder { color: #4A4A4D; }
  .styled-input:focus, .styled-select:focus { outline: none; border-color: #3A3A3D; }
  .styled-select { appearance: none; cursor: pointer; }

  .btn-submit {
    width: 100%; background: var(--btn-bg); color: var(--btn-text); border: none; border-radius: 4px;
    padding: 1rem; font-size: 10px; letter-spacing: 0.2em; font-weight: 700; text-transform: uppercase;
    cursor: pointer; margin-top: 1rem; transition: opacity 0.2s; display: flex; justify-content: center; align-items: center; gap: 8px;
  }
  .btn-submit:hover { opacity: 0.9; }
  .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

  .msg-box { padding: 0.9rem; border-radius: 4px; margin-bottom: 1.2rem; font-size: 0.82rem; line-height: 1.5; }
  .msg-error { background: rgba(239,68,68,0.1); color: #EF4444; border: 1px solid rgba(239,68,68,0.2); }
  .msg-success { background: rgba(16,185,129,0.1); color: #10B981; border: 1px solid rgba(16,185,129,0.2); }

  .spinner-small { width: 12px; height: 12px; border: 2px solid rgba(0,0,0,0.2); border-top-color: var(--btn-text); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .toggle-auth { margin-top: 2.5rem; text-align: center; font-size: 0.8rem; color: #6D6E72; }
  .toggle-auth button { background: none; border: none; color: #8F9EC4; font-size: 0.8rem; font-weight: 500; cursor: pointer; padding: 0 4px; }
  .toggle-auth button:hover { color: #BECBEB; }

  @media (max-width: 900px) {
    .split-layout { flex-direction: column; }
    .panel-left { padding: 3rem 2rem; border-right: none; border-bottom: 1px solid var(--border-color); }
    .brand-title { font-size: 2.5rem; }
  }
`;

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState('login');           // 'login' | 'register'
  const [regType, setRegType] = useState('user');    // 'admin' | 'user'

  // shared
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // admin-only
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgType, setNewOrgType] = useState('college');

  // user-only
  const [orgs, setOrgs] = useState([]);
  const [orgId, setOrgId] = useState('');
  const [orgName, setOrgName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadOrgs = async () => {
      try {
        const { data } = await api.get('/auth/organizations');
        const list = data?.organizations || [];
        setOrgs(list);
        if (list.length > 0) {
          setOrgId(list[0].id);
          setOrgName(list[0].name);
        }
      } catch {
        // backend not running; swallow
      }
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
          if (error.message?.toLowerCase().includes('email not confirmed')) {
            throw new Error('Your email is not confirmed yet. Please check your inbox (and spam folder) for a confirmation link from Supabase.');
          }
          if (error.message?.toLowerCase().includes('invalid login credentials')) {
            throw new Error('Invalid email or password. If you just registered, please confirm your email first.');
          }
          throw error;
        }
        // App.jsx handles redirect via auth state change
      } else if (regType === 'admin') {
        // ── ADMIN REGISTRATION ──────────────────────────────────
        if (!newOrgName.trim()) throw new Error('Organization name is required');

        // 1. Create organization
        const { data: orgData, error: orgErr } = await supabase
          .from('organizations')
          .insert({ name: newOrgName.trim(), type: newOrgType })
          .select()
          .single();
        if (orgErr) throw new Error(orgErr.message?.includes('unique') ? 'Organization name already taken' : orgErr.message);

        // 2. Create admin member record
        const { error: memberErr } = await supabase
          .from('members')
          .insert({ name: name.trim(), email: email.toLowerCase().trim(), role: 'admin', member_type: 'general', org_id: orgData.id, is_registered: true });
        if (memberErr) throw new Error(memberErr.message);

        // 3. Supabase Auth signup
        const { error: signUpErr } = await signUp(email, password, 'admin', orgData.id, newOrgName.trim());
        if (signUpErr) throw signUpErr;

        setSuccess('Admin account created! Check your email to confirm, then sign in.');
        setTab('login');
        reset();
      } else {
        // ── USER REGISTRATION ───────────────────────────────────
        if (!orgId) throw new Error('Please select an organization');

        // 1. Validate user is pre-registered by admin
        await api.post('/auth/validate-user', { email: email.toLowerCase().trim(), org_id: orgId });

        // 2. Supabase Auth signup
        const { error: signUpErr } = await signUp(email, password, 'user', orgId, orgName);
        if (signUpErr) throw signUpErr;

        // 3. Mark member as registered + set name
        await supabase
          .from('members')
          .update({ is_registered: true, name: name.trim() })
          .eq('email', email.toLowerCase().trim())
          .eq('org_id', orgId);

        setSuccess('Account created! Check your email to confirm, then sign in.');
        setTab('login');
        reset();
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || 'Authentication failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="split-layout">

        {/* LEFT */}
        <div className="panel-left">
          <div>
            <div className="left-header">Knowledge Access</div>
            <h1 className="brand-title">
              <em>Smart</em>
              <span>Navigator</span>
            </h1>
          </div>
          <div>
            <p className="quote-text">"The navigator does not fear the void; they use it to find the light of intelligence."</p>
            <div className="vol-text"><div className="vol-line" />VOL. 2025.01</div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="panel-right">
          <div className="form-container">
            <h2 className="form-title">{tab === 'login' ? 'Access Portal' : 'Create Account'}</h2>
            <p className="form-subtitle">{tab === 'login' ? 'Continue your journey.' : 'Join the knowledge network.'}</p>

            <div className="auth-tabs">
              <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); reset(); }}>SIGN IN</button>
              <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); reset(); }}>REGISTER</button>
            </div>

            {tab === 'register' && (
              <div className="reg-tabs">
                <button className={`reg-tab ${regType === 'user' ? 'active' : ''}`} onClick={() => setRegType('user')}>USER</button>
                <button className={`reg-tab ${regType === 'admin' ? 'active' : ''}`} onClick={() => setRegType('admin')}>ADMIN</button>
              </div>
            )}

            {error && <div className="msg-box msg-error">{error}</div>}
            {success && <div className="msg-box msg-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              {tab === 'register' && (
                <div className="input-group">
                  <div className="input-header"><label className="input-label">Full Name</label></div>
                  <input type="text" className="styled-input" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
                </div>
              )}

              <div className="input-group">
                <div className="input-header"><label className="input-label">Email Address</label></div>
                <input type="email" className="styled-input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>

              <div className="input-group">
                <div className="input-header">
                  <label className="input-label">Password</label>
                  {tab === 'login' && <span className="forgot-link">FORGOT?</span>}
                </div>
                <input type="password" className="styled-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>

              {/* Admin: create new org */}
              {tab === 'register' && regType === 'admin' && (
                <>
                  <div className="input-group">
                    <div className="input-header"><label className="input-label">Organization Name</label></div>
                    <input type="text" className="styled-input" placeholder="e.g. Manipal University Jaipur" value={newOrgName} onChange={e => setNewOrgName(e.target.value)} required />
                  </div>
                  <div className="input-group">
                    <div className="input-header"><label className="input-label">Organization Type</label></div>
                    <select className="styled-select" value={newOrgType} onChange={e => setNewOrgType(e.target.value)}>
                      <option value="college">College / University</option>
                      <option value="company">Company / Enterprise</option>
                      <option value="community">Community / NGO</option>
                    </select>
                  </div>
                </>
              )}

              {/* User: select existing org */}
              {tab === 'register' && regType === 'user' && (
                <div className="input-group">
                  <div className="input-header"><label className="input-label">Organization</label></div>
                  {orgs.length === 0 ? (
                    <div className="msg-box msg-error" style={{ margin: 0 }}>No organizations found. Ask your admin to register first.</div>
                  ) : (
                    <select className="styled-select" value={orgId} onChange={e => {
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

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading && <div className="spinner-small" />}
                {loading ? 'PROCESSING...' : tab === 'login' ? 'SIGN IN' : regType === 'admin' ? 'CREATE ADMIN ACCOUNT' : 'CREATE ACCOUNT'}
              </button>
            </form>

            <div className="toggle-auth">
              {tab === 'login'
                ? <>New here? <button onClick={() => { setTab('register'); reset(); }}>Create Account</button></>
                : <>Already have an account? <button onClick={() => { setTab('login'); reset(); }}>Sign In</button></>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
