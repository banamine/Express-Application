import { Settings2, Database, Github, Webhook } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-2">Configure database connections, external APIs, and application behavior.</p>
      </div>

      <div className="grid gap-6">
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <Database className="h-5 w-5 text-primary" />
            Database Configuration
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Neon Postgres URL (DATABASE_URL)
              </label>
              <input 
                type="password"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
                placeholder="postgresql://..." 
                value="********"
                readOnly
              />
              <p className="text-xs text-muted-foreground">Configured via environment variables.</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <Github className="h-5 w-5 text-primary" />
            GitHub Integration
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Personal Access Token (GITHUB_TOKEN)
              </label>
              <input 
                type="password"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                placeholder="ghp_..." 
              />
            </div>
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2">
              Sync Repository
            </button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
            <Webhook className="h-5 w-5 text-primary" />
            Watchdog Configuration
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">AJ_LEGACY_FALLBACK</p>
                <p className="text-sm text-muted-foreground">Enable legacy segments feed when live HD falls behind.</p>
              </div>
              <div className="h-6 w-11 rounded-full bg-primary/20 relative cursor-pointer border border-primary/50">
                <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
