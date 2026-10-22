import { useId, type FormEvent } from 'react';
import { Button } from './Button';
import styles from './SearchBox.module.css';

type Props = { value: string; onChange: (v: string) => void; onSubmit: (v: string) => void; label?: string };

export function SearchBox({ value, onChange, onSubmit, label = 'Search games' }: Props) {
  const id = useId();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(value);
  };
  return (
    <form role="search" className={styles.form} onSubmit={submit}>
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <input
        id={id}
        type="search"
        className={styles.input}
        value={value}
        maxLength={100}
        placeholder="Search games"
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
      <Button type="submit" className={styles.go}>
        Search
      </Button>
    </form>
  );
}
