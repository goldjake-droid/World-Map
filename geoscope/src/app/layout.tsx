import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GEOSCOPE — Live Geopolitical Intelligence',
  description: 'Interactive world map with real-time geopolitical data, AI-powered briefings, and conflict analysis.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="scanlines" />
        {children}
      </body>
    </html>
  );
}
