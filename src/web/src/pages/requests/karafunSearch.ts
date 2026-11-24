import { api } from "../../api";
import type { KarafunTrack } from "./karafunTypes";

export * from "./karafunTypes";

export async function searchKarafun(query: string): Promise<KarafunTrack[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const result = await api(`/api/karafun/search?q=${encodeURIComponent(trimmed)}`);
  return Array.isArray(result) ? (result as KarafunTrack[]) : [];
}
