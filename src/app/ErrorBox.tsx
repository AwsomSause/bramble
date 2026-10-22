import { Button } from '../ui/Button';

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" style={{ padding: 16, border: '1px solid #e3a3b6', background: '#fff3f6', color: '#5a0c25', borderRadius: 3 }}>
      <p style={{ margin: '0 0 10px' }}>{message}</p>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
}
