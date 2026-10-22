import { AppRoutes } from './app/routes';
import { AdminHost } from './features/admin/AdminHost';
import { useApplySettings } from './features/settings/useSettings';

export default function App() {
  useApplySettings();
  return (
    <>
      <AppRoutes />
      <AdminHost />
    </>
  );
}
