import type { InventoryEntry, Team, UserProfile } from "@autodbl/shared";

const INVENTORY_KEY = "autodbl.inventory.v1";
const TEAMS_KEY = "autodbl.teams.v1";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadInventory(): InventoryEntry[] {
  return read<InventoryEntry[]>(INVENTORY_KEY, []);
}

export function saveInventory(entries: InventoryEntry[]): void {
  write(INVENTORY_KEY, entries);
}

export function loadTeams(): Team[] {
  return read<Team[]>(TEAMS_KEY, []);
}

export function saveTeams(teams: Team[]): void {
  write(TEAMS_KEY, teams);
}

export function loadProfile(): UserProfile {
  return { inventory: loadInventory(), teams: loadTeams() };
}

export function exportProfileToFile(): void {
  const profile = loadProfile();
  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `autodbl-profile-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importProfileFromFile(file: File): Promise<UserProfile> {
  const text = await file.text();
  const parsed = JSON.parse(text) as UserProfile;
  if (!Array.isArray(parsed.inventory) || !Array.isArray(parsed.teams)) {
    throw new Error("Ungültige Profildatei");
  }
  saveInventory(parsed.inventory);
  saveTeams(parsed.teams);
  return parsed;
}
