import { Bell } from 'lucide-react';
import { Button } from '@/components/ui';
import { PHASE_LABEL } from '@/lib/types';
import { useAlarm } from '@/features/audio/alarm';
import { useTimer } from './store';

export function AlarmBanner() {
  const { ringing, stop } = useAlarm();
  const timer = useTimer((s) => s.timer);
  const start = useTimer((s) => s.start);
  if (!ringing) return null;
  const waiting = timer.status === 'idle';
  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:pl-60">
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-xl">
        <span className="grid place-items-center h-10 w-10 rounded-xl bg-accent/15 text-accent animate-pulse">
          <Bell size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{ringing === 'focus' ? 'Focus complete' : 'Break over'}</p>
          <p className="text-xs text-muted truncate">
            {waiting ? `Ready for ${PHASE_LABEL[timer.phase].toLowerCase()}` : `${PHASE_LABEL[timer.phase]} started`}
          </p>
        </div>
        {waiting && (
          <Button
            variant="primary"
            onClick={() => {
              stop();
              start();
            }}
          >
            Start
          </Button>
        )}
        <Button variant="ghost" onClick={stop}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
