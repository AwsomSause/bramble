import { useEffect, useState, type FormEvent } from 'react';
import { usePageTitle } from '../../app/usePageTitle';
import { Button } from '../../ui/Button';
import { Box } from '../../ui/Box';
import { downscaleImage } from './image';
import { adopt, care, getActive, removePet, selectPet, usePetState } from './petStore';
import { ageDays, derive, mood, stage, type Action, type Pet, type StatName } from './pet-logic';
import { PetView } from './PetView';
import styles from './Pet.module.css';

/** A clock that ticks so stats visibly drift while the page is open. */
function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

const STAT_META: { key: StatName; label: string; icon: string }[] = [
  { key: 'hunger', label: 'Hunger', icon: '🍓' },
  { key: 'happiness', label: 'Happiness', icon: '✨' },
  { key: 'energy', label: 'Energy', icon: '⚡' },
  { key: 'cleanliness', label: 'Cleanliness', icon: '🧼' },
];

const ACTIONS: { action: Action; label: string }[] = [
  { action: 'feed', label: 'Feed' },
  { action: 'play', label: 'Play' },
  { action: 'clean', label: 'Clean' },
  { action: 'sleep', label: 'Sleep' },
];

function StatBar({ label, icon, value }: { label: string; icon: string; value: number }) {
  const v = Math.round(value);
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>
        <span aria-hidden="true">{icon}</span> {label}
      </span>
      <div
        className={styles.meter}
        role="meter"
        aria-label={label}
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className={styles.meterFill} data-low={v < 35} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function AdoptForm({ onDone }: { onDone?: () => void }) {
  const [name, setName] = useState('');
  const [image, setImage] = useState<string>();
  const [error, setError] = useState('');

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try {
      setImage(await downscaleImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that image.');
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Give your buddy a name.');
      return;
    }
    adopt(name, Date.now(), image);
    setName('');
    setImage(undefined);
    onDone?.();
  };

  return (
    <form onSubmit={submit} className={styles.adopt}>
      <h2>Adopt a buddy</h2>
      <p className={styles.note}>Pick a name, and optionally a picture. Your picture stays on this device — it&apos;s never uploaded.</p>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
      </label>
      <label>
        Picture (optional)
        <input type="file" accept="image/*" onChange={(e) => pickImage(e.target.files?.[0])} />
      </label>
      {image && <img src={image} alt="Your buddy preview" className={styles.preview} />}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <Button type="submit" variant="primary">
        Adopt
      </Button>
    </form>
  );
}

function Shelf({ pets, activeId, now }: { pets: Pet[]; activeId: string | null; now: number }) {
  if (pets.length <= 1) return null;
  return (
    <nav aria-label="Your pets" className={styles.shelf}>
      {pets.map((p) => {
        const d = derive(p, now);
        return (
          <button
            key={p.id}
            type="button"
            className={styles.shelfPet}
            aria-current={p.id === activeId ? 'true' : undefined}
            aria-label={`${p.name}${d.alive ? '' : ' (gone)'}`}
            onClick={() => selectPet(p.id)}
          >
            {p.imageDataUrl ? <img src={p.imageDataUrl} alt="" /> : <span aria-hidden="true">🫐</span>}
            <span>{p.name}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default function PetPage() {
  usePageTitle('Bramble Buddy');
  const now = useNow();
  const { pets, activeId } = usePetState();
  const [adopting, setAdopting] = useState(false);
  const active = getActive(now);

  if (pets.length === 0) {
    return (
      <div className={styles.page}>
        <h1>Bramble Buddy</h1>
        <AdoptForm />
      </div>
    );
  }

  if (adopting) {
    return (
      <div className={styles.page}>
        <h1>Bramble Buddy</h1>
        <AdoptForm onDone={() => setAdopting(false)} />
        <p>
          <button type="button" className={styles.linkBtn} onClick={() => setAdopting(false)}>
            ← Back to my pets
          </button>
        </p>
      </div>
    );
  }

  const d = active ? derive(active, now) : undefined;

  return (
    <div className={styles.page}>
      <h1>Bramble Buddy</h1>
      <Shelf pets={pets} activeId={activeId} now={now} />
      {active && d && (
        <div className={styles.main}>
          {d.alive ? (
            <>
              <div className={styles.pet}>
                <PetView imageDataUrl={active.imageDataUrl} mood={mood(d.stats)} name={active.name} />
                <p className={styles.sub}>
                  {stage(active, now)} · {ageDays(active, now)} day{ageDays(active, now) === 1 ? '' : 's'} old
                </p>
              </div>
              <div className={styles.care}>
                <div className={styles.stats}>
                  {STAT_META.map((m) => (
                    <StatBar key={m.key} label={m.label} icon={m.icon} value={d.stats[m.key]} />
                  ))}
                </div>
                <div className={styles.actions}>
                  {ACTIONS.map((a) => (
                    <Button key={a.action} onClick={() => care(active.id, a.action, Date.now())}>
                      {a.label}
                    </Button>
                  ))}
                </div>
                <p className={styles.note}>Come back and care for {active.name} — if a buddy is left alone too long, it won&apos;t make it.</p>
              </div>
            </>
          ) : (
            <Box title={`In memory of ${active.name}`}>
              <p>
                {active.name} was left alone too long and has gone to the big berry patch. {active.name} lived{' '}
                {ageDays(active, now)} day{ageDays(active, now) === 1 ? '' : 's'}.
              </p>
              <div className={styles.actions}>
                <Button variant="primary" onClick={() => setAdopting(true)}>
                  Adopt a new buddy
                </Button>
                <Button onClick={() => removePet(active.id)}>Remove</Button>
              </div>
            </Box>
          )}
        </div>
      )}
      <p className={styles.adoptMore}>
        <button type="button" className={styles.linkBtn} onClick={() => setAdopting(true)}>
          + Adopt another buddy
        </button>
      </p>
    </div>
  );
}
