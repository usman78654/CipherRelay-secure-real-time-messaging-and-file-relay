import { useEffect, useState } from 'react';
import { loadKeysSecurely } from '../crypto/keygen/loadKeys';

export default function KeyStatus({ user }) {
  const username = user?.username || user?.user?.username;
  const [state, setState] = useState({ loading: true, ready: false });
  useEffect(() => {
    let active = true;
    loadKeysSecurely(username).then(keys => {
      if (active) setState({ loading: false, ready: Boolean(keys?.signing?.privateKey && keys?.ecdh?.privateKey) });
    }).catch(() => { if (active) setState({ loading: false, ready: false }); });
    return () => { active = false; };
  }, [username]);
  return <div style={{ background: '#fff', padding: 20, borderRadius: 12, marginBottom: 20 }}>
    <h3>Cryptographic identity</h3>
    {state.loading ? <p>Checking this browser…</p> : state.ready
      ? <p style={{ color: '#075e54' }}>Ready: non-exportable private signing and agreement keys are stored in this browser.</p>
      : <p role="alert" style={{ color: '#842029' }}>Private keys are missing on this browser. Secure chat is disabled. Register a new demo account; generating an unrelated replacement would make old messages unreadable and trigger contacts’ key-change warnings.</p>}
  </div>;
}
