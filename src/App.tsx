import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { TimerScreen } from "@/features/timer/TimerScreen";
import { StatsScreen } from "@/features/stats/StatsScreen";
import { TagsScreen } from "@/features/tags/TagsScreen";
import { SettingsScreen } from "@/features/settings/SettingsScreen";
import { LoginScreen } from "@/features/auth/LoginScreen";
import { useTimerRunner } from "@/features/timer/useTimerRunner";
import { useTheme } from "@/features/settings/useTheme";
import { useAuth } from "@/features/auth/useAuth";
import { startSync } from "@/lib/sync";

export default function App() {
  useTheme();
  useTimerRunner();
  const { user } = useAuth();
  useEffect(() => (user ? startSync(user.id) : undefined), [user]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<TimerScreen />} />
          <Route path="stats" element={<StatsScreen />} />
          <Route path="tags" element={<TagsScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
          <Route path="login" element={<LoginScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
