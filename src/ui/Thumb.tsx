import { useState } from 'react';
import styles from './Thumb.module.css';

const PALETTE = ['#6b2d8b', '#c4194f', '#3b1d4f', '#4f8a2b', '#2a4fb5'];

/** A berry-cluster placeholder, colored by the title so different games look different. */
function Fallback({ title }: { title: string }) {
  const n = [...title].reduce((a, c) => a + c.charCodeAt(0), 0);
  const c1 = PALETTE[n % PALETTE.length];
  const c2 = PALETTE[(n + 2) % PALETTE.length];
  const letter = (title.trim()[0] ?? '?').toUpperCase();
  return (
    <svg className={styles.fallback} viewBox="0 0 160 120" aria-hidden="true" data-testid="thumb-fallback">
      <rect width="160" height="120" fill="#fbf7f2" />
      <path d="M80 18 q18 -14 34 -4 q-16 4 -34 4z" fill="#4f8a2b" />
      {[
        [62, 46],
        [80, 40],
        [98, 46],
        [70, 64],
        [90, 64],
        [80, 82],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="13" fill={i % 2 ? c1 : c2} stroke="#fff" strokeWidth="2" />
      ))}
      <text x="80" y="112" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="14" fill="#3b1d4f">
        {letter}
      </text>
    </svg>
  );
}

export function Thumb({ src, title }: { src?: string; title: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={styles.frame}>
      {src && !failed ? (
        <img
          className={styles.img}
          src={`${import.meta.env.BASE_URL}${src}`}
          alt=""
          loading="lazy"
          decoding="async"
          width={160}
          height={120}
          onError={() => setFailed(true)}
        />
      ) : (
        <Fallback title={title} />
      )}
    </span>
  );
}
