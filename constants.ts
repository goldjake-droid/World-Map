import { Alliance } from '@/types';

export const STABILITY_COLORS = ['#22c55e', '#6ee7b7', '#fbbf24', '#f97316', '#ef4444'];
export const STABILITY_LABELS = ['Very Stable', 'Stable', 'Moderate', 'Unstable', 'Critical'];
export const CONFLICT_COLORS = ['#22c55e', '#84cc16', '#fbbf24', '#f97316', '#ef4444'];
export const CONFLICT_LABELS = ['Peaceful', 'Low', 'Moderate', 'High', 'Critical'];

export const REGIONS: Record<string, { color: string; ids: number[] }> = {
  'North America': { color: '#5B8DEF', ids: [840, 124, 484, 320, 84, 222, 340, 558, 188, 591, 192, 388, 332, 214, 780, 44, 630] },
  'South America': { color: '#34D399', ids: [76, 32, 170, 604, 862, 152, 218, 68, 600, 858, 328, 740] },
  'Europe': { color: '#818CF8', ids: [826, 250, 276, 380, 724, 620, 528, 56, 756, 40, 752, 578, 208, 246, 372, 616, 203, 642, 348, 300, 100, 191, 688, 703, 705, 440, 428, 233, 352, 442, 196, 8, 807, 499, 70, 498, 804, 112, 304] },
  'Middle East': { color: '#FBBF24', ids: [682, 784, 376, 364, 368, 760, 400, 422, 414, 634, 48, 512, 887, 275, 792] },
  'Africa': { color: '#F87171', ids: [566, 710, 818, 404, 231, 288, 834, 12, 504, 788, 800, 686, 384, 120, 450, 508, 716, 24, 466, 854, 562, 148, 729, 728, 706, 434, 454, 894, 646, 108, 768, 204, 694, 430, 478, 270, 624, 226, 266, 178, 180, 140, 232, 262, 174, 480, 426, 748, 72, 516, 732, 324] },
  'Central & South Asia': { color: '#FB923C', ids: [398, 860, 795, 417, 762, 4, 586, 496, 356, 50, 144, 524, 64, 462] },
  'East Asia': { color: '#22D3EE', ids: [156, 392, 410, 408, 158] },
  'Southeast Asia': { color: '#C084FC', ids: [764, 704, 608, 458, 702, 360, 104, 116, 418, 96, 626] },
  'Oceania': { color: '#F472B6', ids: [36, 554, 598, 242, 90, 548, 540] },
  'Russia & Caucasus': { color: '#94A3B8', ids: [643, 268, 51, 31] },
};

export const ALLIANCES: Alliance[] = [
  { name: 'NATO', color: '#60a5fa', dash: 'none', country_ids: [840, 124, 826, 250, 276, 380, 724, 620, 528, 56, 442, 208, 578, 352, 792, 300, 616, 203, 348, 100, 642, 191, 705, 233, 428, 440, 8, 807, 499, 246, 40] },
  { name: 'EU', color: '#a78bfa', dash: '4 2', country_ids: [250, 276, 380, 724, 620, 528, 56, 442, 40, 752, 246, 208, 372, 616, 203, 642, 348, 300, 100, 191, 703, 705, 440, 428, 233, 196, 807] },
  { name: 'BRICS', color: '#f59e0b', dash: 'none', country_ids: [76, 643, 356, 156, 710, 818, 231, 364, 682, 784, 32] },
  { name: 'OPEC', color: '#ef4444', dash: '6 2', country_ids: [682, 364, 368, 414, 862, 566, 12, 24, 178, 226, 434, 634] },
  { name: 'ASEAN', color: '#c084fc', dash: 'none', country_ids: [360, 458, 608, 764, 704, 104, 116, 418, 96, 702] },
  { name: 'African Union', color: '#f87171', dash: '4 2', country_ids: [566, 710, 818, 404, 231, 288, 834, 12, 504, 788, 800, 686, 384, 120, 450, 508, 716, 24, 466, 854, 562, 148, 729, 728, 706, 434, 454, 894, 646, 108, 768, 204, 694, 430, 478, 270, 624, 226, 266, 178, 180, 140, 232, 262, 174, 72, 516, 324, 748, 426] },
  { name: 'Five Eyes', color: '#22d3ee', dash: '3 3', country_ids: [840, 826, 124, 36, 554] },
  { name: 'G7', color: '#fbbf24', dash: '5 2', country_ids: [840, 826, 250, 276, 380, 124, 392] },
];

export function getRegion(numId: number): { name: string; color: string } {
  for (const [name, data] of Object.entries(REGIONS)) {
    if (data.ids.includes(numId)) return { name, color: data.color };
  }
  return { name: 'Other', color: '#475569' };
}

export function getStabilityColor(level: number): string {
  return STABILITY_COLORS[level] ?? '#475569';
}
