'use client';

const stabColor = (s: string) =>
  ({ stable: '#22c55e', tensions: '#fbbf24', conflict: '#f97316', crisis: '#ef4444' }[s?.toLowerCase()] || '#64748b');

export function LoadDots({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-[5px] py-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-1 h-1 rounded-full bg-[#475569]"
          style={{ animation: `pulse-dot 1.2s ease-in-out ${i * 0.15}s infinite` }} />
      ))}
      <span className="text-[#475569] text-[9px] tracking-[0.12em]">{text}</span>
    </div>
  );
}

export function BriefingContent({ b, accentColor }: { b: any; accentColor: string }) {
  const sc = stabColor(b.stability);
  const keyFacts = b.key_facts || b.keyFacts || [];
  const recentNews = b.recent_news || b.recentNews || [];
  const govType = b.government_type || b.governmentType || '';

  return (
    <div className="animate-fade-up">
      <div className="inline-flex items-center gap-[5px] px-[9px] py-[3px] rounded-[3px] mb-[10px]"
        style={{ background: `${sc}10`, border: `1px solid ${sc}22` }}>
        <div className="w-[5px] h-[5px] rounded-full" style={{ background: sc, boxShadow: `0 0 6px ${sc}` }} />
        <span className="text-[8px] font-semibold tracking-[0.14em]" style={{ color: sc }}>
          {(b.stability || 'UNKNOWN').toUpperCase()}
        </span>
      </div>

      <p className="text-[12px] font-semibold text-[#f1f5f9] mb-[10px] leading-[1.4]"
        style={{ fontFamily: "'Instrument Sans', sans-serif" }}>{b.headline}</p>

      <div className="grid grid-cols-2 gap-1 mb-[10px]">
        {[{ l: 'GOV TYPE', v: govType }, { l: 'LEADER', v: b.leader }, { l: 'POPULATION', v: b.population }, { l: 'GDP', v: b.gdp }].map((x, i) => (
          <div key={i} className="px-[7px] py-[5px] rounded-[3px]" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="text-[6.5px] text-[#3b4a5c] tracking-[0.12em] mb-[1px] font-semibold">{x.l}</div>
            <div className="text-[9px] text-[#94a3b8] leading-[1.3]">{x.v || '—'}</div>
          </div>
        ))}
      </div>

      {keyFacts.length > 0 && (
        <div className="mb-[10px]">
          <div className="text-[7px] text-[#3b4a5c] tracking-[0.14em] mb-1 font-semibold">KEY FACTS</div>
          {keyFacts.map((f: string, i: number) => (
            <div key={i} className="flex gap-[6px] mb-[3px]">
              <div className="w-[3px] h-[3px] rounded-full mt-[5px] shrink-0 opacity-70" style={{ background: accentColor }} />
              <span className="text-[9px] text-[#8896a7] leading-[1.45]">{f}</span>
            </div>
          ))}
        </div>
      )}

      {recentNews.length > 0 && (
        <div className="mb-[10px]">
          <div className="text-[7px] text-[#3b4a5c] tracking-[0.14em] mb-1 font-semibold">RECENT NEWS</div>
          {recentNews.map((n: string, i: number) => (
            <div key={i} className="px-[8px] py-[5px] mb-[2px]" style={{ borderLeft: `2px solid ${accentColor}40`, background: 'rgba(255,255,255,0.01)' }}>
              <span className="text-[9px] text-[#8896a7] leading-[1.45]">{n}</span>
            </div>
          ))}
        </div>
      )}

      {b.analysis && (
        <div className="px-[10px] py-[8px] rounded-[3px]" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="text-[7px] text-[#3b4a5c] tracking-[0.14em] mb-[3px] font-semibold">ANALYSIS</div>
          <p className="text-[9.5px] text-[#8896a7] leading-[1.55] m-0">{b.analysis}</p>
        </div>
      )}
    </div>
  );
}
