import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function OnboardingPage() {
  const { user, fetchProfile } = useAuth();
  const navigate = useNavigate();

  const [orgs, setOrgs] = useState([]);
  const [orgId, setOrgId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('organizations').select('id, name, type').order('name').then(({ data }) => {
      const list = data || [];
      setOrgs(list);
      if (list.length > 0) setOrgId(list[0].id);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orgId) return;
    setLoading(true);
    setError('');
    try {
      const email = user.email.toLowerCase().trim();
      // Check if they're a pre-registered member in this org
      const { data: existing } = await supabase
        .from('members')
        .select('id')
        .eq('email', email)
        .eq('org_id', orgId)
        .maybeSingle();

      if (existing) {
        // Already exists (admin pre-added them), just mark registered
        await supabase.from('members').update({ is_registered: true }).eq('id', existing.id);
      } else {
        // New member, insert with user role
        const { error: insertErr } = await supabase.from('members').insert({
          name: user.user_metadata?.full_name || email.split('@')[0],
          email,
          role: 'user',
          member_type: 'general',
          org_id: orgId,
          is_registered: true,
        });
        if (insertErr) throw insertErr;
      }

      await fetchProfile(email);
      navigate('/chat', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#08080b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Figtree, sans-serif', color: '#eeeaf8' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '2rem' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>One last step</h1>
        <p style={{ color: '#6b6880', marginBottom: '2rem', fontSize: '0.88rem' }}>Select the organization you belong to.</p>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.07)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.82rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', fontSize: '0.68rem', letterSpacing: '0.13em', textTransform: 'uppercase', color: '#6b6880', fontWeight: 600, marginBottom: '0.45rem' }}>
              Organization
            </label>
            {orgs.length === 0
              ? <p style={{ color: '#f87171', fontSize: '0.82rem' }}>No organizations found. Contact your admin.</p>
              : (
                <select
                  value={orgId}
                  onChange={e => setOrgId(e.target.value)}
                  style={{ width: '100%', background: '#0f0f15', border: '1px solid #1a1a24', borderRadius: 8, padding: '0.85rem 1rem', color: '#eeeaf8', fontSize: '0.88rem', appearance: 'none' }}
                  required
                >
                  {orgs.map(org => (
                    <option key={org.id} value={org.id} style={{ background: '#1a1a24' }}>
                      {org.name} · {org.type.toUpperCase()}
                    </option>
                  ))}
                </select>
              )}
          </div>

          <button
            type="submit"
            disabled={loading || orgs.length === 0}
            style={{ width: '100%', background: 'linear-gradient(135deg, #7c5cfc 0%, #9f7dfc 100%)', color: '#fff', border: 'none', borderRadius: 8, padding: '1rem', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
          >
            {loading ? 'Saving…' : 'Join Organization →'}
          </button>
        </form>
      </div>
    </div>
  );
}
