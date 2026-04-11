'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { topoDecode, topoMesh } from '@/lib/topojson';
import { supabase } from '@/lib/supabase';
import { STABILITY_COLORS, STABILITY_LABELS, CONFLICT_COLORS, CONFLICT_LABELS, REGIONS, ALLIANCES, getRegion, getStabilityColor } from '@/lib/constants';
import { BriefingContent, LoadDots } from '@/components/BriefingPanel';
import type { CountryData, ChoroplethMode } from '@/types';

const TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export default function GeoMap() {
  const [topoData, setTopoData] = useState<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [countryDB, setCountryDB] = useState<Record<number, CountryData>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ChoroplethMode>('stability');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchIdx, setSearchIdx] = useState(-1);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareBriefings, setCompareBriefings] = useState<Record<string, any>>({});
  const [compareLoading, setCompareLoading] = useState<Record<string, boolean>>({});
  const [activeAlliances, setActiveAlliances] = useState<string[]>([]);
  const [showHotspots, setShowHotspots] = useState(true);
  const [liveGDP, setLiveGDP] = useState<Record<number, number>>({});
  const [livePop, setLivePop] = useState<Record<number, number>>({});
  const [liveLoading, setLiveLoading] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<any>(null);

  useEffect(() => { fetch(TOPO_URL).then(r => r.json()).then(d => { setTopoData(d); setMapReady(true); }).catch(() => setMapReady(true)); }, []);

  useEffect(() => {
    supabase.from('countries').select('*').then(({ data }) => {
      if (data) { const m: Record<number, CountryData> = {}; data.forEach((c: any) => { m[c.numeric_id] = c; }); setCountryDB(m); }
    });
  }, []);

  useEffect(() => {
    setLiveLoading(true);
    const I: Record<string, number> = {AFG:4,ALB:8,DZA:12,AGO:24,ARG:32,ARM:51,AUS:36,AUT:40,AZE:31,BHS:44,BHR:48,BGD:50,BLR:112,BEL:56,BLZ:84,BEN:204,BTN:64,BOL:68,BIH:70,BWA:72,BRA:76,BRN:96,BGR:100,BFA:854,BDI:108,KHM:116,CMR:120,CAN:124,CAF:140,TCD:148,CHL:152,CHN:156,COL:170,COG:178,COD:180,CRI:188,CIV:384,HRV:191,CUB:192,CYP:196,CZE:203,DNK:208,DJI:262,DOM:214,ECU:218,EGY:818,SLV:222,GNQ:226,ERI:232,EST:233,SWZ:748,ETH:231,FJI:242,FIN:246,FRA:250,GAB:266,GMB:270,GEO:268,DEU:276,GHA:288,GRC:300,GTM:320,GIN:324,GNB:624,GUY:328,HTI:332,HND:340,HUN:348,ISL:352,IND:356,IDN:360,IRN:364,IRQ:368,IRL:372,ISR:376,ITA:380,JAM:388,JPN:392,JOR:400,KAZ:398,KEN:404,PRK:408,KOR:410,KWT:414,KGZ:417,LAO:418,LVA:428,LBN:422,LSO:426,LBR:430,LBY:434,LTU:440,LUX:442,MDG:450,MWI:454,MYS:458,MLI:466,MRT:478,MUS:480,MEX:484,MDA:498,MNG:496,MNE:499,MAR:504,MOZ:508,MMR:104,NAM:516,NPL:524,NLD:528,NZL:554,NIC:558,NER:562,NGA:566,MKD:807,NOR:578,OMN:512,PAK:586,PAN:591,PNG:598,PRY:600,PER:604,PHL:608,POL:616,PRT:620,QAT:634,ROU:642,RUS:643,RWA:646,SAU:682,SEN:686,SRB:688,SLE:694,SGP:702,SVK:703,SVN:705,SLB:90,SOM:706,ZAF:710,SSD:728,ESP:724,LKA:144,SDN:729,SUR:740,SWE:752,CHE:756,SYR:760,TWN:158,TJK:762,TZA:834,THA:764,TLS:626,TGO:768,TTO:780,TUN:788,TUR:792,TKM:795,UGA:800,UKR:804,ARE:784,GBR:826,USA:840,URY:858,UZB:860,VUT:548,VEN:862,VNM:704,PSE:275,YEM:887,ZMB:894,ZWE:716};
    const f = async (ind: string) => { try { const r = await fetch(`https://api.worldbank.org/v2/country/all/indicator/${ind}?format=json&per_page=300&date=2023`); const d = await r.json(); if (!d[1]) return {}; const m: Record<number,number> = {}; for (const e of d[1]) { if (!e.value || !e.countryiso3code) continue; const n = I[e.countryiso3code]; if (n) m[n] = e.value; } return m; } catch { return {}; } };
    Promise.all([f('NY.GDP.MKTP.CD'), f('SP.POP.TOTL')]).then(([g, p]) => { setLiveGDP(g); setLivePop(p); setLiveLoading(false); });
  }, []);

  useEffect(() => { if (!svgRef.current || !gRef.current) return; const z = d3.zoom<SVGSVGElement, unknown>().scaleExtent([1, 12]).on('zoom', e => { d3.select(gRef.current!).attr('transform', e.transform.toString()); }); d3.select(svgRef.current).call(z); zoomRef.current = z; }, [topoData]);

  const proj = useMemo(() => d3.geoNaturalEarth1().scale(155).translate([390, 240]), []);
  const pathGen = useMemo(() => d3.geoPath().projection(proj), [proj]);
  const countries = useMemo(() => { if (!topoData) return []; return topoDecode(topoData, topoData.objects.countries).features.filter((f: any) => f.properties.name !== 'Antarctica' && f.properties.name !== 'Fr. S. Antarctic Lands'); }, [topoData]);
  const borderMesh = useMemo(() => { if (!topoData) return ''; return pathGen(topoMesh(topoData, topoData.objects.countries) as any) || ''; }, [topoData, pathGen]);
  const graticulePath = useMemo(() => pathGen(d3.geoGraticule10() as any), [pathGen]);
  const spherePath = useMemo(() => pathGen({ type: 'Sphere' } as any), [pathGen]);

  const getCD = useCallback((n: number): Partial<CountryData> => countryDB[n] || {}, [countryDB]);

  const getFill = useCallback((feat: any, isHov: boolean, isSel: boolean) => {
    const id = parseInt(feat.id); const cd = getCD(id); const isComp = compareMode && compareIds.includes(feat.id);
    if (mode === 'region') { const c = getRegion(id).color; if (isSel||isComp) return c; if (isHov) return d3.color(c)?.brighter(0.4)?.formatHex()||c; return d3.color(c)?.darker(0.5)?.formatHex()||c; }
    if (mode === 'stability' || mode === 'conflict') { const val = mode === 'stability' ? cd.stability : cd.conflict; const cols = mode === 'stability' ? STABILITY_COLORS : CONFLICT_COLORS; const color = val !== undefined ? cols[val] : '#1e293b'; if (isSel||isComp) return d3.color(color)?.brighter(0.5)?.formatHex()||color; if (isHov) return d3.color(color)?.brighter(0.3)?.formatHex()||color; return d3.color(color)?.darker(0.3)?.formatHex()||color; }
    if (mode === 'freedom') { const val = cd.freedom; if (val === undefined || val === null) return '#141a26'; const color = d3.interpolateRdYlGn(val/100); if (isSel||isComp) return d3.color(color)?.brighter(0.5)?.formatHex()||color; if (isHov) return d3.color(color)?.brighter(0.3)?.formatHex()||color; return color; }
    const data = mode === 'gdp' ? liveGDP : livePop; const max = mode === 'gdp' ? 28e12 : 1.45e9; const val = data[id]; if (!val) return '#141a26'; const t = Math.min(val/max, 1); const interp = mode === 'gdp' ? d3.interpolateYlGnBu : d3.interpolateYlOrRd; const color = interp(t); if (isSel||isComp) return d3.color(color)?.brighter(0.5)?.formatHex()||color; if (isHov) return d3.color(color)?.brighter(0.3)?.formatHex()||color; return color;
  }, [mode, getCD, compareMode, compareIds, liveGDP, livePop]);

  const flyTo = useCallback((feat: any) => { if (!svgRef.current || !zoomRef.current) return; const b = pathGen.bounds(feat); const dx=b[1][0]-b[0][0], dy=b[1][1]-b[0][1], cx=(b[0][0]+b[1][0])/2, cy=(b[0][1]+b[1][1])/2; const s = Math.min(8, 0.85/Math.max(dx/780, dy/460)); const tr = [780/2-s*cx, 460/2-s*cy]; d3.select(svgRef.current).transition().duration(750).call(zoomRef.current.transform, d3.zoomIdentity.translate(tr[0], tr[1]).scale(s)); }, [pathGen]);
  const resetZoom = () => { if (svgRef.current && zoomRef.current) d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity); };

  const fetchBriefing = async (name: string, numId?: number) => { try { const r = await fetch('/api/briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ countryName: name, countryId: numId }) }); return await r.json(); } catch { return null; } };

  const handleClick = (feat: any) => {
    const name = feat.properties.name; const nid = parseInt(feat.id); const rg = getRegion(nid);
    if (compareMode) {
      if (compareIds.includes(feat.id)) { setCompareIds(p => p.filter(x => x !== feat.id)); setCompareBriefings(p => { const n = { ...p }; delete n[feat.id]; return n; }); }
      else if (compareIds.length < 3) { setCompareIds(p => [...p, feat.id]); setCompareLoading(p => ({ ...p, [feat.id]: true })); fetchBriefing(name, nid).then(b => { if (b) setCompareBriefings(p => ({ ...p, [feat.id]: { ...b, country: name, regionColor: rg.color } })); }).finally(() => setCompareLoading(p => ({ ...p, [feat.id]: false }))); }
    } else { setSelected(feat.id); flyTo(feat); setLoading(true); setError(null); setBriefing(null); fetchBriefing(name, nid).then(b => { if (b?.error) setError(b.error); else setBriefing({ ...b, country: name, regionColor: rg.color }); }).catch(() => setError('Briefing failed.')).finally(() => setLoading(false)); }
  };

  const searchResults = useMemo(() => { if (!searchQuery.trim()) return []; const q = searchQuery.toLowerCase(); return countries.filter((c: any) => c.properties.name?.toLowerCase().includes(q)).slice(0, 8); }, [searchQuery, countries]);
  const handleSearchSelect = (feat: any) => { setSearchQuery(''); setSearchFocused(false); setSearchIdx(-1); flyTo(feat); handleClick(feat); };
  const handleSearchKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'ArrowDown') { e.preventDefault(); setSearchIdx(p => Math.min(p+1, searchResults.length-1)); } else if (e.key === 'ArrowUp') { e.preventDefault(); setSearchIdx(p => Math.max(p-1, 0)); } else if (e.key === 'Enter' && searchIdx >= 0 && searchResults[searchIdx]) { e.preventDefault(); handleSearchSelect(searchResults[searchIdx]); } else if (e.key === 'Escape') { setSearchFocused(false); setSearchQuery(''); } };

  const hotspots = useMemo(() => {
    if (!countries.length || !Object.keys(countryDB).length) return [];
    return countries.map((c: any) => { const id = parseInt(c.id); const cd = getCD(id); const stab = cd.stability ?? 0; const conf = cd.conflict ?? 0; const free = cd.freedom; const fs = free !== undefined && free !== null ? Math.max(0, (100-free)/25) : 0; return { id: c.id, name: c.properties.name, score: stab*2+conf*2.5+fs, stab, conf, free }; }).filter((h: any) => h.score > 5).sort((a: any, b: any) => b.score-a.score).slice(0, 12);
  }, [countries, countryDB, getCD]);

  const toggleAlliance = (n: string) => setActiveAlliances(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n]);
  const toggleCompare = () => { if (compareMode) { setCompareMode(false); setCompareIds([]); setCompareBriefings({}); setCompareLoading({}); } else { setCompareMode(true); setSelected(null); setBriefing(null); } };

  const hovFeat = countries.find((c: any) => c.id === hovered);
  const selFeat = countries.find((c: any) => c.id === selected);
  const showPanel = (!compareMode && selected) || (compareMode && compareIds.length > 0);
  const modes: { k: ChoroplethMode; l: string }[] = [{ k: 'stability', l: 'STABILITY' }, { k: 'conflict', l: 'CONFLICT' }, { k: 'freedom', l: 'FREEDOM' }, { k: 'gdp', l: 'GDP' }, { k: 'population', l: 'POP' }, { k: 'region', l: 'REGION' }];
  const fG = (v: number) => v >= 1e12 ? `$${(v/1e12).toFixed(1)}T` : v >= 1e9 ? `$${(v/1e9).toFixed(0)}B` : `$${(v/1e6).toFixed(0)}M`;
  const fP = (v: number) => v >= 1e9 ? `${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : `${(v/1e3).toFixed(0)}K`;

  return (
    <div className="w-full min-h-screen relative" style={{ background: '#070b12' }}>
      {/* Header */}
      <div className="relative z-20 px-[18px] pt-[10px] pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(7,11,18,0.97)', backdropFilter: 'blur(16px)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-[7px] h-[7px] rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} />
            <h1 className="m-0 text-[17px] font-bold tracking-tight text-[#f1f5f9]" style={{ fontFamily: "'Instrument Sans', sans-serif" }}>GEOSCOPE</h1>
            <span className="text-[7px] text-[#22c55e] font-semibold tracking-widest px-1 py-px rounded-sm" style={{ border: '1px solid rgba(34,197,94,0.25)' }}>LIVE</span>
          </div>
          <div className="relative flex-[0_1_260px] min-w-[160px]">
            <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setSearchIdx(-1); }} onFocus={() => setSearchFocused(true)} onBlur={() => setTimeout(() => setSearchFocused(false), 200)} onKeyDown={handleSearchKeyDown} placeholder="Search country..." className="w-full py-[5px] pl-7 pr-2.5 rounded text-[10.5px] outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontFamily: "'IBM Plex Mono', monospace" }} />
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 opacity-30" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            {searchFocused && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded overflow-hidden z-[100] max-h-[260px] overflow-y-auto" style={{ background: 'rgba(10,15,25,0.98)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                {searchResults.map((feat: any, i: number) => (<div key={feat.id} onClick={() => handleSearchSelect(feat)} className="flex items-center gap-2 px-2.5 py-[7px] cursor-pointer" style={{ background: i === searchIdx ? 'rgba(255,255,255,0.06)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.03)' }}><div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: getStabilityColor(getCD(parseInt(feat.id)).stability ?? 2) }} /><span className="text-[10.5px] text-[#e2e8f0] font-medium" style={{ fontFamily: "'Instrument Sans', sans-serif" }}>{feat.properties.name}</span><span className="text-[7.5px] text-[#475569] ml-auto">{getRegion(parseInt(feat.id)).name}</span></div>))}
              </div>
            )}
          </div>
          <div className="flex gap-1 items-center">
            <button onClick={toggleCompare} className="px-2 py-1 rounded-sm cursor-pointer text-[8.5px] font-semibold tracking-wide" style={{ background: compareMode ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${compareMode ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.07)'}`, color: compareMode ? '#4ade80' : '#64748b', fontFamily: "'IBM Plex Mono', monospace" }}>{compareMode ? 'COMPARING' : 'COMPARE'}</button>
            <button onClick={resetZoom} className="px-2 py-1 rounded-sm cursor-pointer text-[8.5px] tracking-wide" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#64748b', fontFamily: "'IBM Plex Mono', monospace" }}>RESET</button>
          </div>
        </div>
        <div className="flex gap-px mt-2 p-0.5 rounded w-fit" style={{ background: 'rgba(255,255,255,0.02)' }}>
          {modes.map(m => (<button key={m.k} onClick={() => setMode(m.k)} className="px-2.5 py-[3px] rounded-sm border-none cursor-pointer text-[8px] font-semibold tracking-widest transition-all" style={{ background: mode === m.k ? 'rgba(255,255,255,0.1)' : 'transparent', color: mode === m.k ? '#f1f5f9' : '#3b4a5c', fontFamily: "'IBM Plex Mono', monospace" }}>{m.l}{(m.k === 'gdp' || m.k === 'population') && liveLoading ? ' ⟳' : ''}</button>))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-1 min-h-[15px]">
          {mode === 'stability' && STABILITY_LABELS.map((l, i) => (<div key={l} className="flex items-center gap-1"><div className="w-2.5 h-[5px] rounded-sm" style={{ background: STABILITY_COLORS[i] }} /><span className="text-[7.5px] text-[#475569]">{l}</span></div>))}
          {mode === 'conflict' && CONFLICT_LABELS.map((l, i) => (<div key={l} className="flex items-center gap-1"><div className="w-2.5 h-[5px] rounded-sm" style={{ background: CONFLICT_COLORS[i] }} /><span className="text-[7.5px] text-[#475569]">{l}</span></div>))}
          {mode === 'region' && Object.entries(REGIONS).map(([n, d]) => (<div key={n} className="flex items-center gap-1"><div className="w-[7px] h-[3px] rounded-sm opacity-80" style={{ background: d.color }} /><span className="text-[7px] text-[#3b4a5c]">{n.toUpperCase()}</span></div>))}
          {['gdp','population','freedom'].includes(mode) && (<div className="flex items-center gap-1"><span className="text-[7px] text-[#475569]">LOW</span><div className="w-[90px] h-1 rounded" style={{ background: mode === 'gdp' ? 'linear-gradient(90deg,#081d58,#1d91c0,#ffffcc)' : mode === 'population' ? 'linear-gradient(90deg,#ffffb2,#fd8d3c,#b10026)' : 'linear-gradient(90deg,#d73027,#ffffbf,#1a9850)' }} /><span className="text-[7px] text-[#475569]">HIGH</span></div>)}
        </div>
        <div className="flex flex-wrap gap-1 items-center mt-1">
          <span className="text-[7px] text-[#2a3544] tracking-widest font-semibold mr-1">ALLIANCES</span>
          {ALLIANCES.map(a => (<button key={a.name} onClick={() => toggleAlliance(a.name)} className="px-[7px] py-[2px] rounded-sm cursor-pointer text-[7.5px] font-semibold transition-all" style={{ background: activeAlliances.includes(a.name) ? `${a.color}20` : 'rgba(255,255,255,0.02)', border: `1px solid ${activeAlliances.includes(a.name) ? `${a.color}50` : 'rgba(255,255,255,0.05)'}`, color: activeAlliances.includes(a.name) ? a.color : '#3b4a5c', fontFamily: "'IBM Plex Mono', monospace" }}>{a.name.toUpperCase()}</button>))}
        </div>
      </div>

      {/* Main */}
      <div className="flex relative z-5" style={{ height: 'calc(100vh - 130px)' }}>
        <div className="flex-1 relative overflow-hidden">
          {!mapReady ? (<div className="flex items-center justify-center h-full gap-2.5"><div className="w-[22px] h-[22px] rounded-full animate-spin-slow" style={{ border: '2px solid #1e293b', borderTop: '2px solid #22c55e' }} /><span className="text-[9px] text-[#475569] tracking-widest">LOADING GEODATA...</span></div>) : (
            <svg ref={svgRef} viewBox="0 0 780 460" className="w-full h-full cursor-grab" preserveAspectRatio="xMidYMid meet">
              <defs><radialGradient id="oc" cx="50%" cy="45%"><stop offset="0%" stopColor="#0d1320"/><stop offset="100%" stopColor="#070b12"/></radialGradient></defs>
              <g ref={gRef}>
                <path d={spherePath||''} fill="url(#oc)" stroke="rgba(34,197,94,0.05)" strokeWidth="0.5"/>
                <path d={graticulePath||''} fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="0.3"/>
                {countries.map((feat: any) => { const d = pathGen(feat); if (!d) return null; const isH = hovered === feat.id; const isS = selected === feat.id || (compareMode && compareIds.includes(feat.id)); return <path key={feat.id??feat.properties.name} d={d} fill={getFill(feat, isH, isS)} stroke="none" className="cursor-pointer transition-[fill] duration-200" onClick={e => { e.stopPropagation(); handleClick(feat); }} onMouseEnter={() => setHovered(feat.id)} onMouseLeave={() => setHovered(null)} />; })}
                <path d={borderMesh} fill="none" stroke="rgba(200,215,235,0.2)" strokeWidth="0.4" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />
                {(compareMode ? compareIds : [selected].filter(Boolean)).map(id => { const feat = countries.find((c: any) => c.id === id); if (!feat) return null; const d = pathGen(feat as any); if (!d) return null; return <path key={`s-${id}`} d={d} fill="none" stroke="#f8fafc" strokeWidth="1.5" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />; })}
                {hovered && hovered !== selected && !(compareMode && compareIds.includes(hovered)) && (() => { const feat = countries.find((c: any) => c.id === hovered); if (!feat) return null; const d = pathGen(feat as any); if (!d) return null; return <path d={d} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.8" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />; })()}
                {activeAlliances.map(name => { const a = ALLIANCES.find(x => x.name === name); if (!a) return null; return a.country_ids.map(nid => { const feat = countries.find((c: any) => parseInt(c.id) === nid); if (!feat) return null; const d = pathGen(feat as any); if (!d) return null; return <path key={`${name}-${nid}`} d={d} fill={`${a.color}12`} stroke={a.color} strokeWidth="1.2" strokeDasharray={a.dash} strokeLinejoin="round" style={{ pointerEvents: 'none' }} />; }); })}
              </g>
            </svg>
          )}
          {hovFeat && (<div className="absolute bottom-3 left-3 px-2.5 py-[5px] rounded flex items-center gap-2 animate-fade-up" style={{ background: 'rgba(7,11,18,0.93)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(10px)' }}><div className="w-1.5 h-1.5 rounded-full" style={{ background: getStabilityColor(getCD(parseInt(hovFeat.id)).stability ?? 2) }} /><span className="text-[11px] text-[#f1f5f9] font-semibold" style={{ fontFamily: "'Instrument Sans', sans-serif" }}>{hovFeat.properties.name}</span><span className="text-[8px] text-[#475569]">{getRegion(parseInt(hovFeat.id)).name}</span>{mode === 'stability' && (() => { const v = getCD(parseInt(hovFeat.id)).stability; return <span className="text-[8px] font-semibold" style={{ color: v !== undefined ? STABILITY_COLORS[v] : '#475569' }}>{v !== undefined ? STABILITY_LABELS[v] : 'No data'}</span>; })()}{mode === 'gdp' && (() => { const v = liveGDP[parseInt(hovFeat.id)]; return v ? <span className="text-[9px] text-[#94a3b8] font-medium">{fG(v)}</span> : null; })()}{mode === 'population' && (() => { const v = livePop[parseInt(hovFeat.id)]; return v ? <span className="text-[9px] text-[#94a3b8] font-medium">{fP(v)}</span> : null; })()}</div>)}
          {showHotspots && hotspots.length > 0 && !showPanel && (<div className="absolute top-2.5 left-2.5 w-[210px] rounded-md overflow-hidden animate-fade-up z-10 max-h-[calc(100%-20px)] overflow-y-auto" style={{ background: 'rgba(7,11,18,0.94)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}><div className="flex justify-between items-center px-2.5 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}><div className="flex items-center gap-1"><div className="w-[5px] h-[5px] rounded-full" style={{ background: '#ef4444', boxShadow: '0 0 8px #ef4444', animation: 'pulse-dot 2s infinite' }} /><span className="text-[8px] font-bold text-[#f87171] tracking-widest">HOTSPOTS</span></div><button onClick={() => setShowHotspots(false)} className="bg-transparent border-none text-[#3b4a5c] cursor-pointer text-[10px]">×</button></div>{hotspots.map((h, i) => (<div key={h.id} onClick={() => { const feat = countries.find((c: any) => c.id === h.id); if (feat) handleClick(feat); }} className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', background: hovered === h.id ? 'rgba(255,255,255,0.04)' : 'transparent' }} onMouseEnter={() => setHovered(h.id)} onMouseLeave={() => setHovered(null)}><span className="text-[9px] text-[#3b4a5c] font-bold w-3.5 text-right shrink-0">{i+1}</span><div className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: STABILITY_COLORS[h.stab] || '#475569' }} /><div className="flex-1 min-w-0"><div className="text-[9.5px] text-[#e2e8f0] font-semibold truncate" style={{ fontFamily: "'Instrument Sans', sans-serif" }}>{h.name}</div><div className="flex gap-1.5 mt-px"><span className="text-[7px] font-semibold" style={{ color: STABILITY_COLORS[h.stab] }}>{STABILITY_LABELS[h.stab]}</span><span className="text-[7px]" style={{ color: CONFLICT_COLORS[h.conf] }}>{CONFLICT_LABELS[h.conf]}</span></div></div></div>))}</div>)}
          {!showHotspots && !showPanel && (<button onClick={() => setShowHotspots(true)} className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded cursor-pointer z-10" style={{ background: 'rgba(7,11,18,0.9)', border: '1px solid rgba(239,68,68,0.2)' }}><div className="w-[5px] h-[5px] rounded-full" style={{ background: '#ef4444', boxShadow: '0 0 6px #ef4444' }} /><span className="text-[8px] text-[#f87171] font-semibold tracking-widest">HOTSPOTS</span></button>)}
        </div>

        {/* Side Panel */}
        {showPanel && (<div className="animate-slide-in overflow-y-auto transition-[width] duration-300" style={{ width: compareMode ? Math.min(compareIds.length * 220 + 40, 660) : 360, maxWidth: compareMode ? '70vw' : '42vw', borderLeft: '1px solid rgba(255,255,255,0.04)', background: 'rgba(7,11,18,0.98)' }}>
          {!compareMode && selected && selFeat && (<><div className="flex justify-between items-start px-3.5 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}><div><div className="flex items-center gap-1.5 mb-0.5"><div className="w-2 h-2 rounded-full" style={{ background: getStabilityColor(getCD(parseInt(selected)).stability ?? 2) }} /><h2 className="m-0 text-sm font-bold text-[#f1f5f9]" style={{ fontFamily: "'Instrument Sans', sans-serif" }}>{selFeat.properties.name}</h2></div><span className="text-[7.5px] text-[#3b4a5c] tracking-widest">{getRegion(parseInt(selected)).name.toUpperCase()}</span></div><button onClick={() => { setSelected(null); setBriefing(null); setError(null); }} className="flex items-center justify-center w-[22px] h-[22px] rounded-sm bg-transparent text-[#475569] text-[11px] cursor-pointer" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>×</button></div><div className="px-3.5 py-2.5">{loading && <LoadDots text="FETCHING INTEL..." />}{error && <p className="text-[#ef4444] text-[9px]">{error}</p>}{briefing && <BriefingContent b={briefing} accentColor={getRegion(parseInt(selected)).color} />}</div></>)}
          {compareMode && compareIds.length > 0 && (<><div className="flex justify-between items-center px-3.5 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}><span className="text-[9px] font-semibold text-[#4ade80] tracking-widest">COMPARING {compareIds.length}</span><button onClick={() => { setCompareIds([]); setCompareBriefings({}); setCompareLoading({}); }} className="text-[7.5px] text-[#475569] px-2 py-0.5 rounded-sm bg-transparent cursor-pointer tracking-wide" style={{ border: '1px solid rgba(255,255,255,0.07)', fontFamily: "'IBM Plex Mono', monospace" }}>CLEAR</button></div><div className="flex" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>{compareIds.map((id, idx) => { const feat = countries.find((c: any) => c.id === id); const b = compareBriefings[id]; const isL = compareLoading[id]; const rg = getRegion(parseInt(id)); return (<div key={id} className="flex-1 px-2.5 py-2 min-w-0" style={{ borderRight: idx < compareIds.length-1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}><div className="flex items-center justify-between mb-1.5"><div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: getStabilityColor(getCD(parseInt(id)).stability ?? 2) }} /><span className="text-[10px] font-bold text-[#f1f5f9]" style={{ fontFamily: "'Instrument Sans', sans-serif" }}>{feat?.properties.name}</span></div><button onClick={() => { setCompareIds(p => p.filter(x => x !== id)); setCompareBriefings(p => { const n = { ...p }; delete n[id]; return n; }); }} className="bg-transparent border-none text-[#3b4a5c] cursor-pointer text-[10px]">×</button></div>{isL && <LoadDots text="LOADING..." />}{b && <BriefingContent b={b} accentColor={rg.color} />}</div>); })}</div></>)}
        </div>)}
      </div>
    </div>
  );
}
