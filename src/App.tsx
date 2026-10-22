import { AppRoutes } from './app/routes';
import { useApplySettings } from './features/settings/useSettings';
import { useApplyCosmetics } from './features/shop/useCosmetics';

export default function App() {
  useApplySettings();
  useApplyCosmetics();
  return <AppRoutes />;
}
