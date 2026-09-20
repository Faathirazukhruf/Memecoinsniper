import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'Memecoin Sniper | Personal Multi-Chain Hunting Terminal',
  description: 'Ultra-fast personal multi-chain memecoin hunting, smart wallet tracking, and trading intelligence terminal.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-gray-100 flex flex-col font-sans antialiased selection:bg-accent-blue/30 selection:text-white">
        <Navigation />
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
          {children}
        </main>
        <footer className="border-t border-surface-border bg-surface/50 py-3 text-center text-xs text-gray-500 font-mono">
          <span>Personal Multi-Chain Memecoin Hunting Engine • V1 Terminal</span>
        </footer>
      </body>
    </html>
  );
}
