import express from "express";
import type { Express } from "express";
import { getDb } from './db';
import { episodes, archiveHoldingQueue } from '../shared/schema';
import { desc, eq } from 'drizzle-orm';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

import { getAjStatus, refreshAjPool, startAjPool } from './aj-pool';
import { getHealthCheckStatus, setHealthCheckInterval, runHealthCheckPass, HealthCheckInterval, startHealthScheduler } from './health-check';
import { registerArchiveRoutes } from './archive-routes';

export function registerRoutes(app: Express) {
  registerArchiveRoutes(app);

  // Database health check
  app.get('/api/db-health', async (req, res) => {
    try {
      const db = getDb();
      // Simple query to verify connection
      await db.select().from(episodes).limit(1);
      res.json({ status: 'ok', connected: true });
    } catch (e: any) {
      console.error('Database connection error:', e);
      res.status(500).json({ status: 'error', connected: false, message: e.message });
    }
  });

  // DB push endpoint
  app.post('/api/db-migrate', async (req, res) => {
    try {
      res.json({ success: true, url: process.env.DATABASE_URL ? 'PRESENT' : 'MISSING' });
    } catch (e: any) {
      console.error('Migration failed:', e.stdout || e.message);
      res.status(500).json({ error: e.stdout || e.message });
    }
  });

  // Upload M3U/CSV
  app.post('/api/episodes/upload', upload.array('files'), async (req, res) => {
    try {
      const db = getDb();
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      let importedCount = 0;

      for (const file of files) {
        const content = file.buffer.toString('utf-8');
        const filename = file.originalname.toLowerCase();

        if (filename.endsWith('.m3u') || filename.endsWith('.m3u8')) {
          const { episodes: parsedEpisodes, errors } = await import('./m3u-parser').then(m => m.m3uParser.parseM3UContent(content));
          
          if (errors.length > 0) {
            console.warn(`Encountered ${errors.length} errors parsing ${filename}:`, errors.slice(0, 5));
          }

          for (const ep of parsedEpisodes) {
            const now = new Date();
            const fakeId = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}_${uuidv4().slice(0, 4)}`;
            
            await db.insert(episodes).values({
              id: fakeId,
              season: ep.season,
              episode: ep.episode,
              title: ep.title,
              url: ep.url,
              duration: ep.duration,
              tvgLogo: ep.tvgLogo,
              groupTitle: ep.groupTitle,
              tvgId: ep.tvgId,
              tvgName: ep.tvgName,
              objectPosition: ep.objectPosition,
              allowedPlayers: ["player1", "player2"],
            });
            importedCount++;
          }
        }
      }

      res.json({ success: true, count: importedCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Import URLs (M3U or direct media links)
  app.post('/api/episodes/import-urls', express.json(), async (req, res) => {
    try {
      const db = getDb();
      const { urls } = req.body;
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'No URLs provided' });
      }

      let importedCount = 0;
      
      for (const url of urls) {
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.endsWith('.m3u') || lowerUrl.endsWith('.m3u8')) {
          try {
            // Fetch M3U and parse
            const fetchRes = await fetch(url);
            if (!fetchRes.ok) {
              console.warn(`Failed to fetch M3U from ${url}: ${fetchRes.statusText}`);
              continue;
            }
            const content = await fetchRes.text();
            const { episodes: parsedEpisodes, errors } = await import('./m3u-parser').then(m => m.m3uParser.parseM3UContent(content));
            
            if (errors.length > 0) {
              console.warn(`Encountered ${errors.length} errors parsing M3U from ${url}:`, errors.slice(0, 5));
            }

            for (const ep of parsedEpisodes) {
              const now = new Date();
              const fakeId = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}_${uuidv4().slice(0, 4)}`;
              
              await db.insert(episodes).values({
                id: fakeId,
                season: ep.season,
                episode: ep.episode,
                title: ep.title,
                url: ep.url,
                duration: ep.duration,
                tvgLogo: ep.tvgLogo,
                groupTitle: ep.groupTitle,
                tvgId: ep.tvgId,
                tvgName: ep.tvgName,
                objectPosition: ep.objectPosition,
                allowedPlayers: ["player1", "player2"],
              });
              importedCount++;
            }
          } catch (e: any) {
            console.warn(`Error fetching or parsing URL ${url}:`, e.message);
          }
        } else {
          // Direct media link
          const now = new Date();
          const fakeId = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}_${uuidv4().slice(0, 4)}`;
          
          let title = url.split('/').pop() || 'Unknown Video';
          if (title.includes('?')) title = title.split('?')[0];

          await db.insert(episodes).values({
            id: fakeId,
            season: 1,
            episode: 1,
            title: decodeURIComponent(title),
            url: url,
            duration: 0,
            allowedPlayers: ["player1", "player2"],
          });
          importedCount++;
        }
      }

      res.json({ success: true, count: importedCount });
    } catch (err: any) {
      console.error('Failed to import URLs:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get facets
  app.get('/api/episodes/facets', async (req, res) => {
    try {
      const db = getDb();
      const allEpisodes = await db.select().from(episodes);
      
      const groupMap = new Map<string, number>();
      const hostMap = new Map<string, number>();

      for (const ep of allEpisodes) {
        const g = (ep.groupTitle || '').trim();
        groupMap.set(g, (groupMap.get(g) || 0) + 1);

        let h = '';
        try {
          if (ep.url) {
            h = new URL(ep.url).hostname.replace(/^www\./, '');
          }
        } catch (e) {
          // ignore
        }
        hostMap.set(h, (hostMap.get(h) || 0) + 1);
      }

      const sortOrder = req.query.sort === 'value-asc' ? 'value-asc' : 'count-desc';
      
      const sortMap = (map: Map<string, number>) => {
        return Array.from(map.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => {
             if (sortOrder === 'count-desc') {
               return b.count - a.count || a.value.localeCompare(b.value);
             }
             return a.value.localeCompare(b.value);
          });
      };

      res.json({
        groups: sortMap(groupMap),
        hosts: sortMap(hostMap)
      });
    } catch (err: any) {
      console.error('Error fetching facets:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Bulk title update
  app.post('/api/episodes/bulk-title', express.json(), async (req, res) => {
    try {
      const { ids, operation, value } = req.body;
      if (!Array.isArray(ids) || !ids.length || !operation || !value) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const db = getDb();
      let updatedCount = 0;

      for (const id of ids) {
        const [ep] = await db.select().from(episodes).where(eq(episodes.id, id)).limit(1);
        if (ep) {
          let newTitle = ep.title;
          if (operation === 'replace') {
            newTitle = value;
          } else if (operation === 'prepend') {
            newTitle = `${value}${ep.title}`;
          } else if (operation === 'append') {
            newTitle = `${ep.title}${value}`;
          }

          await db.update(episodes).set({ title: newTitle }).where(eq(episodes.id, id));
          updatedCount++;
        }
      }

      res.json({ updated: updatedCount });
    } catch (err: any) {
      console.error('Error in bulk-title:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get episodes
  app.get('/api/episodes', async (req, res) => {
    try {
      const db = getDb();
      const allEpisodes = await db.select().from(episodes).orderBy(desc(episodes.importedAt)).limit(100);
      res.json(allEpisodes);
    } catch (err: any) {
      console.error('Failed to load episodes:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Auto-tag episodes
  app.post('/api/episodes/auto-tag', async (req, res) => {
    try {
      const db = getDb();
      const { rules } = req.body;
      if (!rules || !Array.isArray(rules)) {
        return res.status(400).json({ error: 'Rules array is required' });
      }

      const allEpisodes = await db.select().from(episodes);
      let changedCount = 0;

      for (const ep of allEpisodes) {
        let matchedGroup = null;

        for (const rule of rules) {
          const targetValue = ep[rule.field as 'title' | 'url'];
          if (!targetValue) continue;

          let matched = false;
          if (rule.matchType === 'contains') {
            matched = targetValue.toLowerCase().includes(rule.value.toLowerCase());
          } else if (rule.matchType === 'regex') {
            try {
              const regex = new RegExp(rule.value, 'i');
              matched = regex.test(targetValue);
            } catch (e) {
              // ignore invalid regexes
            }
          }

          if (matched) {
            matchedGroup = rule.targetGroup;
            break; // First match wins
          }
        }

        if (matchedGroup && ep.groupTitle !== matchedGroup) {
          await db.update(episodes).set({ groupTitle: matchedGroup }).where(eq(episodes.id, ep.id));
          changedCount++;
        }
      }

      res.json({ success: true, changed: changedCount });
    } catch (err: any) {
      console.error('Failed to auto-tag episodes:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // AJ Pool routes
  startAjPool();

  app.get('/api/aj-pool/status', (req, res) => {
    res.json(getAjStatus());
  });

  app.post('/api/aj-pool/refresh', async (req, res) => {
    try {
      await refreshAjPool();
      res.json({ success: true, status: getAjStatus() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Health check routes
  startHealthScheduler().catch(console.error);

  app.get('/api/health-check/status', (req, res) => {
    res.json(getHealthCheckStatus());
  });

  app.post('/api/health-check/run', async (req, res) => {
    try {
      await runHealthCheckPass();
      res.json({ success: true, status: getHealthCheckStatus() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/health-check/interval', async (req, res) => {
    try {
      const { interval } = req.body;
      await setHealthCheckInterval(interval as HealthCheckInterval);
      res.json({ success: true, interval });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Mock schedule endpoint
  app.get('/api/stream/schedule', (req, res) => {
    res.json({
      scheduleDate: new Date().toISOString(),
      streamStartIso: new Date().toISOString(),
      totalDurationSeconds: 86400,
      isFullDay: true,
      generatedAt: new Date().toISOString(),
      blocks: []
    });
  });

  // Other endpoints like archive holding queue, watchdog, schedule, etc., will be added here
}
