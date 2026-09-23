'use client';
import { useEffect, useState } from 'react';
import { fetchHealth } from '@/lib/api';
export function DataModeBanner() {
  const [status, setStatus] = useState('checking');
  useEffect(() => {
    let active = true;
    const refresh = () => fetchHealth().then(health => { if (active) setStatus(health.status); });
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  return <div role="status" className="px-6 py-2 text-sm border-b border-surface-border text-amber-300 bg-surface">
    {status === 'demo' ? 'DEMO MODE — simulated data, no live feed or Telegram alerts.' : status === 'online' ? 'LIVE DATA — security checks may be incomplete. Scores are not profit probabilities.' : status === 'offline' ? 'ENGINE OFFLINE — data may be unavailable or stale.' : 'Checking data connection…'}
  </div>;
}
