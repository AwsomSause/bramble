import { Component, type ReactNode } from 'react';
import { Button } from '../ui/Button';

type State = { failed: boolean };

/**
 * Catches unexpected errors in a page (including a code file that went missing because the
 * site was just updated) so the visitor sees a way out instead of a blank page.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" style={{ padding: 16, border: '1px solid #e3a3b6', background: '#fff3f6', color: '#5a0c25', borderRadius: 3 }}>
        <p style={{ margin: '0 0 10px' }}>Something went wrong showing this page. The site may have just been updated.</p>
        <Button onClick={() => window.location.reload()}>Reload page</Button>
      </div>
    );
  }
}
