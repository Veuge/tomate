import { NavLink, Outlet } from 'react-router-dom';
import { ChartColumn, Settings, Tag, Timer } from 'lucide-react';
import { cx } from './ui';
import { AlarmBanner } from '@/features/timer/AlarmBanner';
import { Toaster } from './Toast';

const NAV = [
  { to: '/', label: 'Timer', icon: Timer },
  { to: '/stats', label: 'Stats', icon: ChartColumn },
  { to: '/tags', label: 'Tags', icon: Tag },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell() {
  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop rail */}
      <nav className="hidden md:flex md:flex-col md:w-56 md:shrink-0 md:border-r md:border-line md:p-4 md:gap-1 md:sticky md:top-0 md:h-dvh">
        <div className="flex items-center gap-2 px-3 py-4 mb-2">
          <img src="/icons/icon.svg" alt="" className="h-7 w-7" />
          <span className="font-semibold">Pomodoro</span>
        </div>
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cx(
                'flex items-center gap-3 rounded-xl px-3 h-10 text-sm font-medium transition',
                isActive ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 min-w-0 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-28 md:pb-10 md:px-10 md:pt-10">
        <div className="mx-auto w-full max-w-3xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-bg/90 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cx(
                  'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium',
                  isActive ? 'text-fg' : 'text-muted'
                )
              }
            >
              <Icon size={22} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <AlarmBanner />
      <Toaster />
    </div>
  );
}
