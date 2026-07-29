import { NavLink, Outlet } from "react-router-dom";
import { Button } from "@heroui/react";
import { useState } from "react";
import { useAuth } from "../lib/useAuth";
import { isCloudSyncEnabled } from "../lib/supabaseClient";
import { exportProfileToFile, importProfileFromFile } from "../lib/storage";

const NAV_ITEMS = [
  { to: "/", label: "Inventar" },
  { to: "/team-builder", label: "Team Builder" },
  { to: "/events", label: "Events & Banner" },
];

export function Layout() {
  const { session, loading, signInWithEmail, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  async function handleSignIn() {
    const { error } = await signInWithEmail(email);
    setAuthMessage(error ?? "Magic Link gesendet, bitte E-Mail prüfen.");
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-6xl flex-col px-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-4 py-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Auto<span className="text-amber-400">DBL</span>egends
          </h1>
          <p className="text-xs text-white/50">Automatischer Team Builder für Dragon Ball Legends</p>
        </div>
        <nav className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `rounded-full px-4 py-1.5 text-sm transition-colors ${
                  isActive ? "bg-amber-400 text-black font-semibold" : "text-white/70 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="relative">
          {!isCloudSyncEnabled ? (
            <span className="text-xs text-white/40">Nur lokal gespeichert</span>
          ) : loading ? (
            <span className="text-xs text-white/40">…</span>
          ) : session ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">{session.user.email}</span>
              <Button size="sm" variant="outline" onPress={() => void signOut()}>
                Abmelden
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onPress={() => setShowAuth((s) => !s)}>
              Anmelden zum Speichern
            </Button>
          )}
          {showAuth && !session && (
            <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-white/10 bg-[#171c2e] p-3 shadow-xl">
              <p className="mb-2 text-xs text-white/60">
                Optional: mit E-Mail anmelden, um dein Inventar & Teams geräteübergreifend zu behalten.
              </p>
              <input
                className="mb-2 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm text-white outline-none"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button size="sm" fullWidth onPress={() => void handleSignIn()}>
                Magic Link senden
              </Button>
              {authMessage && <p className="mt-2 text-xs text-white/60">{authMessage}</p>}
            </div>
          )}
        </div>
      </header>

      <div className="mb-4 flex justify-end gap-2 text-xs">
        <button className="text-white/40 hover:text-white/70 underline" onClick={exportProfileToFile}>
          Profil exportieren
        </button>
        <label className="cursor-pointer text-white/40 hover:text-white/70 underline">
          Profil importieren
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importProfileFromFile(file).then(() => window.location.reload());
            }}
          />
        </label>
      </div>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
