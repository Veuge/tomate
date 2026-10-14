import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Mail } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

export function LoginScreen() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  if (!supabase) {
    return (
      <Card className="max-w-md mx-auto mt-10">
        <p className="font-medium">Sync isn't configured</p>
        <p className="text-sm text-muted mt-1">
          Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code>. Until then
          everything is stored on this device.
        </p>
      </Card>
    );
  }
  if (user) return <Navigate to="/settings" replace />;

  const send = async () => {
    setState("sending");
    const { error } = await supabase!.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
      setState("error");
    } else setState("sent");
  };

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-16">
      <Card className="p-6 sm:p-8">
        <span className="grid place-items-center h-12 w-12 rounded-2xl bg-accent/15 text-accent mb-5">
          <Mail size={22} />
        </span>
        <h1 className="text-xl font-semibold">Sign in to sync</h1>
        <p className="text-sm text-muted mt-1 mb-6">
          Your sessions and tags sync across web, desktop and phone. We'll email you a sign-in link — no password.
        </p>
        {state === "sent" ? (
          <p className="text-sm rounded-xl bg-surface-2 p-4">
            Check <span className="font-medium">{email}</span> and open the link on this device.
          </p>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 rounded-xl bg-surface-2 px-4 outline-none focus:ring-2 focus:ring-line"
            />
            <Button type="submit" variant="primary" className="h-11" disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Email me a link"}
            </Button>
            {state === "error" && <p className="text-sm text-red-500">{error}</p>}
          </form>
        )}
      </Card>
    </div>
  );
}
