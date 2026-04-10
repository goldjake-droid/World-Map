'use client';

import dynamic from 'next/dynamic';

const GeoMap = dynamic(() => import('@/components/GeoMap'), { ssr: false });

export default function Home() {
  return <GeoMap />;
}
