import { Link } from 'react-router';
import styles from './Pager.module.css';

type Props = { page: number; totalPages: number; hrefFor: (page: number) => string };

/** Page numbers to show: first, last, and a window around the current page. */
function pageList(page: number, total: number): (number | 'gap')[] {
  const pages = new Set([1, total, page - 2, page - 1, page, page + 1, page + 2]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

export function Pager({ page, totalPages, hrefFor }: Props) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className={styles.pager}>
      {page > 1 && (
        <Link className={`${styles.item} ${styles.edge}`} to={hrefFor(page - 1)} rel="prev">
          ‹ Previous
        </Link>
      )}
      {pageList(page, totalPages).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className={styles.gap} aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={p}
            to={hrefFor(p)}
            className={`${styles.item} ${p === page ? styles.current : ''}`}
            aria-label={`Page ${p}`}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link className={`${styles.item} ${styles.edge}`} to={hrefFor(page + 1)} rel="next">
          Next ›
        </Link>
      )}
    </nav>
  );
}
