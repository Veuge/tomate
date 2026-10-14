import { Link } from "react-router-dom";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { cx } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { syncNow, useSyncStatus } from "@/lib/sync";
import { useAuth } from "./useAuth";

export function SyncBadge() {
  const { user } = useAuth();
  const { state, error } = useSyncStatus();
  const base = "flex items-center gap-1.5 rounded-full px-3 h-8 text-xs font-medium bg-surface-2 text-muted";
  if (!supabase) return null;
  if (!user)
    return (
      <Link to="/login" className={cx(base, "hover:text-fg")}>
        <CloudOff size={14} /> Sign in to sync
      </Link>
    );
  return (
    <button onClick={() => void syncNow()} title={error ?? "Sync now"} className={cx(base, "hover:text-fg", state === "error" && "text-red-500")}>
      {state === "syncing" ? <RefreshCw size={14} className="animate-spin" /> : <Cloud size={14} />}
      {state === "error" ? "Sync error" : state === "syncing" ? "Syncing" : "Synced"}
    </button>
  );
}
