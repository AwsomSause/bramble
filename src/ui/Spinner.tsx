import styles from './Spinner.module.css';

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className={styles.wrap} role="status">
      <div className={styles.berries} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <span>{label}</span>
    </div>
  );
}
