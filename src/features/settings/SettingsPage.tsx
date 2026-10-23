import { useId, useState, type ReactNode } from 'react';
import { usePageTitle } from '../../app/usePageTitle';
import { clearAllData } from '../../lib/stores';
import { Button } from '../../ui/Button';
import { DEFAULT_SETTINGS, useSettings, type Settings } from './useSettings';
import styles from './Settings.module.css';

function Choice<K extends keyof Settings>({
  legend,
  name,
  value,
  options,
  onPick,
  hint,
}: {
  legend: string;
  name: K;
  value: Settings[K];
  options: [Settings[K], string][];
  onPick: (v: Settings[K]) => void;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <fieldset className={styles.group}>
      <legend>{legend}</legend>
      <div className={styles.options}>
        {options.map(([v, label]) => (
          <label key={String(v)}>
            <input type="radio" name={`${id}-${String(name)}`} checked={value === v} onChange={() => onPick(v)} />
            {label}
          </label>
        ))}
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}
    </fieldset>
  );
}

export default function SettingsPage() {
  usePageTitle('Settings');
  const [s, update] = useSettings();
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);

  return (
    <div className={styles.page}>
      <h1>Settings</h1>
      <Choice legend="Theme" name="theme" value={s.theme} onPick={(theme) => update({ theme })}
        options={[
          ['classic', 'Classic'],
          ['midnight', 'Midnight Bramble'],
          ['living', 'Living Room White'],
          ['checker', 'Midnight Checker'],
          ['blade', 'Blade Green'],
        ]} />
      <Choice legend="Background" name="background" value={s.background} onPick={(background) => update({ background })}
        options={[['plain', 'Plain'], ['berries', 'Berry pattern'], ['leaves', 'Drifting leaves']]} />
      <Choice legend="Motion" name="motion" value={s.motion} onPick={(motion) => update({ motion })}
        options={[['system', 'Follow my device'], ['reduce', 'Reduce motion'], ['full', 'Full motion']]}
        hint="Reduce motion turns off animations, including the drifting leaves." />
      <Choice legend="Text size" name="textScale" value={s.textScale} onPick={(textScale) => update({ textScale })}
        options={[[1, '100%'], [1.15, '115%'], [1.3, '130%']]} />
      <fieldset className={styles.group}>
        <legend>Performance</legend>
        <div className={styles.options}>
          <label>
            <input type="checkbox" checked={s.lowPerf} onChange={(e) => update({ lowPerf: e.target.checked })} />
            Low-performance mode
          </label>
        </div>
        <p className={styles.hint}>Turns off animations and moving backgrounds. Good for older laptops and phones.</p>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>Your data</legend>
        <p className={styles.hint} style={{ marginTop: 0 }}>
          Favorites, recently played games, best scores and these settings are stored only in this browser.
        </p>
        <div className={styles.row} style={{ marginTop: 8 }}>
          <Button onClick={() => update(DEFAULT_SETTINGS)}>Reset look to default</Button>
          <Button onClick={() => { setConfirming(true); setCleared(false); }}>Clear my data…</Button>
        </div>
        {confirming && (
          <fieldset className={styles.confirm}>
            <legend>Are you sure? This removes favorites, history, scores and settings.</legend>
            <div className={styles.row}>
              <Button
                variant="primary"
                onClick={() => {
                  clearAllData();
                  update(DEFAULT_SETTINGS);
                  clearAllData();
                  setConfirming(false);
                  setCleared(true);
                }}
              >
                Yes, clear everything
              </Button>
              <Button onClick={() => setConfirming(false)}>Cancel</Button>
            </div>
          </fieldset>
        )}
        <p role="status" className={styles.hint}>{cleared ? 'Your data was cleared.' : ''}</p>
      </fieldset>
    </div>
  );
}
