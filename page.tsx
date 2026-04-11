'use client';

import dynamic from 'next/dynamic';

const GeoMap = dynamic(() => import('@/components/GeoMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#070b12',
        color: '#475569',
        fontFamily: 'monospace',
        fontSize: '11px',
        letterSpacing: '0.1em',
      }}
    >
      LOADING GEOSCOPE...
    </div>
  ),
});

export default function Home() {
  return <GeoMap />;
}
