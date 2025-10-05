'use client';

import { useState } from 'react';

export default function SignInPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (!username || username.length < 3) {
      setStatus('Username must be at least 3 characters.');
      return;
    }
    if (!password || password.length < 6) {
      setStatus('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // Placeholder: implement /api/signin server route to authenticate
      const res = await fetch('/api/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus(json?.error || 'Sign in failed');
      } else {
        setStatus('Signed in successfully');
        setUsername('');
        setPassword('');
      }
    } catch (err) {
      // use the caught error to avoid "defined but never used"
      console.error('signin network error:', err);
      setStatus('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Sign In</h1>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        {status && <div role="status">{status}</div>}
      </form>
    </main>
  );
}
