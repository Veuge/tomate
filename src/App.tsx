import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { TimerScreen } from '@/features/timer/TimerScreen';
import { StatsScreen } from '@/features/stats/StatsScreen';
import { TagsScreen } from '@/features/tags/TagsScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { useTimerRunner } from '@/features/timer/useTimerRunner';
import { useTheme } from '@/features/settings/useTheme';
import { useAuth } from '@/features/auth/useAuth';
import { startSync } from '@/lib/sync';

// A data router is required for useBlocker (unsaved-changes prompt in Settings).
const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <TimerScreen /> },
      { path: 'stats', element: <StatsScreen /> },
      { path: 'tags', element: <TagsScreen /> },
      { path: 'settings', element: <SettingsScreen /> },
      { path: 'login', element: <LoginScreen /> },
    ],
  },
]);

export default function App() {
  useTheme();
  useTimerRunner();
  const { user } = useAuth();
  useEffect(() => (user ? startSync(user.id) : undefined), [user]);

  return <RouterProvider router={router} />;
}
