import { useId, type ReactNode } from 'react';
import styles from './Box.module.css';

export function Box({ title, children, as = 'section' }: { title: string; children: ReactNode; as?: 'section' | 'aside' }) {
  const Tag = as;
  const id = useId();
  return (
    <Tag className={styles.box} aria-labelledby={id}>
      <h2 id={id} className={styles.bar}>
        {title}
      </h2>
      <div className={styles.body}>{children}</div>
    </Tag>
  );
}
