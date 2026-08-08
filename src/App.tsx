import React from 'react';
import { Route, Switch } from 'wouter';
import { WorkbenchLayout } from './components/layout/WorkbenchLayout';
import Dashboard from './pages/dashboard';
import UploadParse from './pages/upload';
import EpisodeDB from './pages/episodes';
import Player2 from './pages/player2';
import Scheduler1 from './pages/scheduler';
import ArchiveQueue from './pages/archive';
import Settings from './pages/settings';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <>
      <WorkbenchLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/upload" component={UploadParse} />
          <Route path="/episodes" component={EpisodeDB} />
          <Route path="/archive" component={ArchiveQueue} />
          <Route path="/scheduler" component={Scheduler1} />
          <Route path="/player2" component={Player2} />
          <Route path="/settings" component={Settings} />
          <Route>
            <div className="flex h-[50vh] flex-col items-center justify-center text-center">
              <h1 className="text-4xl font-bold text-muted-foreground">404</h1>
              <p className="mt-2 text-lg text-muted-foreground">Module not found.</p>
            </div>
          </Route>
        </Switch>
      </WorkbenchLayout>
      <Toaster theme="dark" position="bottom-right" />
    </>
  );
}
