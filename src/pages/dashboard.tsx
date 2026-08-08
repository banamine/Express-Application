import { useQuery } from '@tanstack/react-query';
import { Layers, ListVideo, Archive, Activity } from 'lucide-react';

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['db-health'],
    queryFn: async () => {
      const res = await fetch('/api/db-health');
      if (!res.ok) throw new Error('Database connection failed');
      return res.json();
    }
  });

  const stats = [
    { name: 'Total Episodes', value: '1,234', icon: ListVideo },
    { name: 'Archive Queue', value: '45', icon: Archive },
    { name: 'Active Players', value: '2', icon: Layers },
    { name: 'DB Status', value: isLoading ? 'Checking...' : data?.connected ? 'Online' : 'Offline', icon: Activity, error: !!error },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-2">Welcome to M3U Matrix Stripper.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between h-32">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-muted-foreground leading-none tracking-tight">{stat.name}</h3>
              <stat.icon className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className={`text-3xl font-bold mt-2 ${stat.error ? 'text-destructive' : ''}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm min-h-[300px]">
           <h3 className="font-semibold mb-4 text-lg">System Architecture</h3>
           <div className="text-sm text-muted-foreground space-y-4">
              <p><strong>Two-Paddock Mode</strong> is active.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Player 1:</strong> 24h Linear Broadcast. Breaks at :05, :29, :57.</li>
                <li><strong>Player 2:</strong> AJ Broadcast / VoD. 15-minute NTD breaks.</li>
              </ul>
           </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm min-h-[300px]">
           <h3 className="font-semibold mb-4 text-lg">Recent Activity</h3>
           <div className="flex h-full items-center justify-center text-sm text-muted-foreground pb-8">
             No recent activity detected.
           </div>
        </div>
      </div>
    </div>
  );
}
