export interface CountryData {
  id: number;           // TopoJSON numeric ID
  name: string;
  iso3: string;
  region: string;
  stability: number;    // 0-4
  conflict: number;     // 0-4
  freedom: number;      // 0-100
  gdp: number | null;
  population: number | null;
  updated_at: string;
}

export interface Briefing {
  id?: string;
  country_id: number;
  country_name: string;
  headline: string;
  stability: string;
  government_type: string;
  leader: string;
  population: string;
  gdp: string;
  key_facts: string[];
  recent_news: string[];
  analysis: string;
  created_at?: string;
}

export interface Alliance {
  name: string;
  color: string;
  dash: string;
  country_ids: number[];
}

export type ChoroplethMode = 'stability' | 'conflict' | 'freedom' | 'gdp' | 'population' | 'region';

export interface HotspotEntry {
  id: string;
  name: string;
  score: number;
  stability: number;
  conflict: number;
  freedom: number | undefined;
}
