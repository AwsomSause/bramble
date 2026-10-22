import { AppRoutes } from './app/routes';
import { useApplySettings } from './features/settings/useSettings';

export default function App() {
  useApplySettings();
  return <AppRoutes />;
}
