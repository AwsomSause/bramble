import { Link } from 'react-router';
import { usePageTitle } from '../../app/usePageTitle';
import { Box } from '../../ui/Box';

export default function NotFound({ what = 'page' }: { what?: 'page' | 'game' }) {
  usePageTitle('Not found');
  return (
    <Box title={what === 'game' ? 'Game not found' : 'Page not found'}>
      <p>
        {what === 'game'
          ? "We couldn't find that game. It may have been renamed or removed."
          : "That page isn't in the berry patch."}
      </p>
      <p>
        <Link to="/games">Browse all games</Link> · <Link to="/">Go home</Link>
      </p>
    </Box>
  );
}
