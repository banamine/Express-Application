import { Express } from "express";
import { getDb } from './db/index';
import { archiveHoldingQueue } from '../shared/schema';
import * as cheerio from 'cheerio';

export function registerArchiveRoutes(app: Express) {
  // 1. /api/archive/expand-rss
  app.post("/api/archive/expand-rss", async (req, res) => {
    try {
      const { rssUrl } = req.body;
      const resp = await fetch(rssUrl);
      if (!resp.ok) throw new Error("Failed to fetch RSS");
      const xml = await resp.text();
      const $ = cheerio.load(xml, { xmlMode: true });
      const items: any[] = [];
      $('item').each((i, el) => {
        const title = $(el).find('title').text();
        const link = $(el).find('link').text();
        let identifier = "";
        const match = link.match(/\/details\/([^/]+)/);
        if (match) identifier = match[1];
        if (identifier) {
          items.push({ identifier, title, mediatype: 'movies' });
        }
      });
      res.json({ items, total: items.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 2. /api/archive/import-items
  app.post("/api/archive/import-items", async (req, res) => {
    try {
      const { items, groupTitle, replaceExisting } = req.body;
      const db = getDb();
      let imported = 0;
      for (const item of items) {
        const identifier = item.identifier;
        await db.insert(archiveHoldingQueue).values({
          identifier,
          status: 'pending',
          pendingEpisodeJson: JSON.stringify({ groupTitle })
        }).onConflictDoNothing(); // Ignore if already queued
        imported++;
      }
      res.json({ message: `${imported} items queued`, imported });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 3. /api/archive/fetch
  app.post("/api/archive/fetch", async (req, res) => {
    try {
      const { url } = req.body;
      let identifier = url;
      const match = url.match(/\/details\/([^/?#]+)/);
      if (match) identifier = match[1];
      
      const resp = await fetch(`https://archive.org/metadata/${identifier}`);
      const data = await resp.json();
      
      // Transform raw Archive.org data into the expected FetchResponse shape
      const files = data.files || [];
      const videoFiles = files.filter((f: any) => 
        f.name && f.format && (
          f.format.toLowerCase().includes('h.264') || 
          f.format.toLowerCase().includes('mpeg4') ||
          f.format.toLowerCase().includes('matroska') ||
          f.format.toLowerCase().includes('quicktime') ||
          f.format.toLowerCase().includes('ogg video') ||
          f.format.toLowerCase().includes('theora') ||
          f.format.toLowerCase().includes('512kb mpeg4') ||
          f.format.toLowerCase().includes('mpeg-4')
        )
      );

      const items = videoFiles.map((f: any) => ({
        identifier: data.metadata?.identifier || identifier,
        filename: f.name,
        title: f.title || f.name,
        url: `https://archive.org/download/${data.metadata?.identifier || identifier}/${f.name}`,
        thumbnailUrl: `https://archive.org/services/img/${data.metadata?.identifier || identifier}`,
        duration: parseFloat(f.length || '0'),
        format: f.format,
        size: parseInt(f.size || '0', 10),
        suspect: parseFloat(f.length || '0') < 60 // mark as suspect if less than 60 seconds
      }));

      res.json({
        items,
        metadata: data.metadata || { identifier },
        errors: [],
        count: items.length
      });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 4. /api/archive/import
  app.post("/api/archive/import", async (req, res) => {
    try {
      const { url, groupTitle, replaceExisting } = req.body;
      let identifier = url;
      const match = url.match(/\/details\/([^/?#]+)/);
      if (match) identifier = match[1];
      
      const db = getDb();
      await db.insert(archiveHoldingQueue).values({
        identifier,
        status: 'pending',
        pendingEpisodeJson: JSON.stringify({ groupTitle })
      }).onConflictDoNothing();
      res.json({ message: "Import queued", imported: 1 });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 5. /api/archive/collection
  app.post("/api/archive/collection", async (req, res) => {
    try {
      const { collection, page, rows, sort } = req.body;
      const q = `collection:(${collection})`;
      const u = new URL('https://archive.org/advancedsearch.php');
      u.searchParams.set('q', q);
      u.searchParams.set('fl[]', 'identifier,title,mediatype');
      u.searchParams.set('sort[]', sort || 'publicdate desc');
      u.searchParams.set('rows', String(rows || 50));
      u.searchParams.set('page', String(page || 1));
      u.searchParams.set('output', 'json');
      const resp = await fetch(u.toString());
      const data = await resp.json();
      res.json({ items: data.response?.docs || [], total: data.response?.numFound || 0 });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 6. /api/archive/tvnews/search
  app.post("/api/archive/tvnews/search", async (req, res) => {
    try {
      const { network, query, startDate, endDate, rows, start } = req.body;
      let q = `collection:(TV-NEWS)`;
      if (network) q += ` AND identifier:(${network}_*)`;
      if (query) q += ` AND (${query})`;
      const u = new URL('https://archive.org/advancedsearch.php');
      u.searchParams.set('q', q);
      u.searchParams.set('fl[]', 'identifier,title,date,source');
      u.searchParams.set('sort[]', 'date desc');
      u.searchParams.set('rows', String(rows || 50));
      u.searchParams.set('start', String(start || 0));
      u.searchParams.set('output', 'json');
      const resp = await fetch(u.toString());
      const data = await resp.json();
      res.json({ items: data.response?.docs || [], total: data.response?.numFound || 0 });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 7. /api/archive/tvnews/import
  app.post("/api/archive/tvnews/import", async (req, res) => {
    try {
      const { items, groupTitle, expandSegments, segmentSecs } = req.body;
      const db = getDb();
      let imported = 0;
      for (const item of items) {
        const identifier = item.identifier;
        await db.insert(archiveHoldingQueue).values({
          identifier,
          status: 'pending',
          pendingEpisodeJson: JSON.stringify({ groupTitle, expandSegments, segmentSecs })
        }).onConflictDoNothing();
        imported++;
      }
      res.json({ message: `${imported} TV News items queued`, imported });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
