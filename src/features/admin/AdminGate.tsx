import { useState, type FormEvent } from 'react';
import { Button } from '../../ui/Button';
import adminConfig from './admin.config.json';
import { isConfigured, verifyCredentials, type AdminConfig } from './credentials';
import { AdminPanel } from './AdminPanel';
import { closeAdmin } from './useAdmin';
import { canPublishHere } from './github';
import styles from './Admin.module.css';

type Props = { config?: AdminConfig; canPublish?: boolean };

export function AdminGate({ config = adminConfig as AdminConfig, canPublish = canPublishHere() }: Props) {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [school, setSchool] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setChecking(true);
    const ok = await verifyCredentials({ username, password, school }, config);
    setChecking(false);
    if (ok) setAuthed(true);
    else setError("That didn't match. Check your username, password and school answer.");
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Admin">
      <div className={styles.sheet}>
        <div className={styles.sheetHead}>
          <strong>{authed ? 'Bramble admin' : 'Admin'}</strong>
          <Button onClick={closeAdmin} aria-label="Close admin">
            ✕
          </Button>
        </div>
        <div className={styles.sheetBody}>
          {!isConfigured(config) ? (
            <div>
              <p>No admin password is set yet.</p>
              <p>
                On your computer, run <code>npm run set-admin</code> once to choose a username, password and secret
                answer, then rebuild. Until then this panel stays locked.
              </p>
            </div>
          ) : !authed ? (
            <form onSubmit={submit} className={styles.login}>
              <p className={styles.softnote}>
                Note: this is a light lock for a static site — it keeps the panel out of sight, but it isn&apos;t strong
                security.
              </p>
              <label>
                Username
                <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
              </label>
              <label>
                Password
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
              </label>
              <label>
                What was your 3rd grade school?
                <input value={school} onChange={(e) => setSchool(e.target.value)} autoComplete="off" />
              </label>
              {error && (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              )}
              <Button type="submit" variant="primary" disabled={checking}>
                {checking ? 'Checking…' : 'Unlock'}
              </Button>
            </form>
          ) : (
            <AdminPanel canPublish={canPublish} />
          )}
        </div>
      </div>
    </div>
  );
}
