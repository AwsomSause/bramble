import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' };

export function Button({ variant = 'default', className, type = 'button', ...rest }: Props) {
  const cls = [styles.btn, variant === 'primary' ? styles.primary : '', className ?? ''].join(' ').trim();
  return <button type={type} className={cls} {...rest} />;
}

export const buttonClass = (variant: 'default' | 'primary' = 'default') =>
  `${styles.btn} ${variant === 'primary' ? styles.primary : ''}`.trim();
