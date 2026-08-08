import { Search, Archive, Download, RefreshCw } from 'lucide-react';

export default function ArchiveQueue() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Archive.org Ingestion</h2>
          <p className="text-muted-foreground mt-2">Search, queue, and import content from the Internet Archive directly into your library.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search Archive.org by keyword, identifier, or creator..."
            className="w-full bg-card border rounded-md py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2">
          <Search className="mr-2 h-4 w-4" />
          Search
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-muted/20 font-semibold flex items-center justify-between">
            <span>Search Results</span>
          </div>
          <div className="p-8 text-center text-muted-foreground flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <Archive className="h-12 w-12 text-muted mb-4" />
            <p>Search to find media assets.</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-muted/20 font-semibold flex items-center justify-between">
            <span>Holding Queue</span>
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">0 pending</span>
          </div>
          <div className="p-8 text-center text-muted-foreground flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <Download className="h-12 w-12 text-muted mb-4" />
            <p>Queue is empty.</p>
          </div>
          <div className="p-4 border-t bg-muted/10">
            <button disabled className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 opacity-50 cursor-not-allowed">
              <RefreshCw className="mr-2 h-4 w-4" />
              Process Queue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
