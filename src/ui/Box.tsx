import type { ReactNode } from 'react';
import styles from './Box.module.css';

export function Box({ title, children, as = 'section' }: { title: string; children: ReactNode; as?: 'section' | 'aside' }) {
  const Tag = as;
  return (
    <Tag className={styles.box}>
      <h2 className={styles.bar}>{title}</h2>
      <div className={styles.body}>{children}</div>
    </Tag>
  );
}
