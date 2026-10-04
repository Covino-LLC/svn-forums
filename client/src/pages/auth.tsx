import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = mode === "signup" ? { username, email, password } : { username, password };
      const res = await apiRequest("POST", `/api/auth/${mode}`, body);
      queryClient.setQueryData(["/api/auth/me"], await res.json());
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setLocation("/");
    } catch (err) {
      // apiRequest throws "<status>: <json body>"
      const raw = err instanceof Error ? err.message : "";
      try {
        setError(JSON.parse(raw.slice(raw.indexOf(":") + 1)).message);
      } catch {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-sm mx-auto">
      <Card className="p-6">
        <h1 className="text-xl font-bold mb-1" data-testid="text-auth-title">
          {mode === "signup" ? "Create an account" : "Log in"}
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          {mode === "signup" ? "Plant ideas and join others. New accounts start with 2 energy." : "Welcome back."}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required data-testid="input-username" />
          </div>
          {mode === "signup" && (
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required data-testid="input-email" />
              <p className="text-[11px] text-muted-foreground">Never shown to other people.</p>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 8 : undefined} required data-testid="input-password" />
          </div>
          {error && <p className="text-sm text-destructive" data-testid="text-auth-error">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy} data-testid="button-auth-submit">
            {mode === "signup" ? "Sign up" : "Log in"}
          </Button>
        </form>
        <button
          type="button"
          className="text-xs text-muted-foreground underline mt-4"
          onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }}
          data-testid="button-auth-toggle"
        >
          {mode === "signup" ? "Already have an account? Log in" : "New here? Create an account"}
        </button>
      </Card>
    </div>
  );
}
