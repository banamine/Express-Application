import React from 'react';
import { Sidebar } from './Sidebar';

export function WorkbenchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ContextBar placeholder */}
        <header className="flex h-14 items-center border-b bg-card px-6 lg:px-8">
          <div className="flex w-full items-center justify-between">
            <h1 className="text-lg font-semibold">Workspace</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Status: Online</span>
            </div>
          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-background p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
