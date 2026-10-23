import { AppRoutes } from './app/routes';
import { AdminHost } from './features/admin/AdminHost';
import { useApplySettings } from './features/settings/useSettings';
import { useApplyCosmetics } from './features/shop/useCosmetics';

export default function App() {
  useApplySettings();
  useApplyCosmetics();
  return (
    <>
      <AppRoutes />
      <AdminHost />
    </>
  );
}
