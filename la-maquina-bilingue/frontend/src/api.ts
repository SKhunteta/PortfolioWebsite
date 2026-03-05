const BASE = '/api';

export interface Stats {
  total: number;
  en: number;
  es: number;
}

export interface Headline {
  id: string;
  title: string;
  source: string;
  language: string;
  url: string;
  published_at: string;
  fetched_at: string;
  emotions: Record<string, number> | null;
  matched_id: string | null;
  match_score: number | null;
}

export interface MatchedPair {
  en_id: string;
  en_title: string;
  en_source: string;
  en_emotions: Record<string, number> | null;
  en_published: string;
  es_id: string;
  es_title: string;
  es_source: string;
  es_emotions: Record<string, number> | null;
  es_published: string;
  match_score: number;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function postJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'POST' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getStats: () => fetchJson<Stats>('/stats'),
  getHeadlines: (lang: string, limit = 50) =>
    fetchJson<Headline[]>(`/headlines?language=${lang}&limit=${limit}`),
  getPairs: (limit = 50) => fetchJson<MatchedPair[]>(`/pairs?limit=${limit}`),
  getRecent: (hours = 24) => fetchJson<Headline[]>(`/recent?hours=${hours}`),
  triggerIngest: () => postJson<{ status: string; inserted: Record<string, number> }>('/ingest'),
  triggerPipeline: () => postJson<Record<string, unknown>>('/pipeline'),
};
