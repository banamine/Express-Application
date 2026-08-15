import { getDb } from './db/index';
import { episodes } from '../shared/schema';
import { desc, sql } from 'drizzle-orm';
import crypto from 'crypto';

export async function getMatrixGuidePayload() {
  const db = getDb();
  const now = new Date();
  
  // Use current UTC clock time as the source of truth
  const system_clock_utc = now.toISOString();

  // Fetch all valid episodes to construct the timeline
  const allEpisodes = await db.select().from(episodes)
    .where(sql`status = 'valid'`)
    .orderBy(desc(episodes.priority), desc(episodes.importedAt));

  // 1. Group by channel (groupTitle)
  const channelMap = new Map<string, typeof allEpisodes>();
  for (const ep of allEpisodes) {
    // If a program lacks a groupTitle, assign it to a default channel
    const channelName = ep.groupTitle || "DEFAULT";
    if (!channelMap.has(channelName)) {
      channelMap.set(channelName, []);
    }
    channelMap.get(channelName)!.push(ep);
  }

  // EPG Matrix Sprite Dimensions
  // Dynamic matrix height count chosen by backend
  const total_rows = channelMap.size;
  // Dynamic matrix width count chosen by backend. (e.g. 48 slots of 30-mins in 24 hours)
  const total_columns = 48;
  const SPRITE_DURATION_SEC = 1800; // Each column represents 30 minutes
  
  // Hypothetical URL for the generated EPG matrix sprite sheet
  const sprite_sheet_url = "https://assets.aistudio.internal/epg-matrix-sprite-latest.jpg";

  // Timeline starting point (Midnight UTC of current day)
  const startOfDay = new Date(now.toISOString().split('T')[0] + 'T00:00:00.000Z');
  const startOfDayMs = startOfDay.getTime();

  const payload = {
    system_clock_utc,
    channels: [] as any[]
  };

  let target_row_index = 0;

  for (const [channelName, eps] of channelMap.entries()) {
    let currentOffsetSec = 0;
    let epIdx = 0;
    const timeline_slots = [];

    // Simulate a 24-hour block schedule for each channel (86400 seconds)
    while (currentOffsetSec < 86400 && eps.length > 0) {
      const ep = eps[epIdx % eps.length];
      const durationSec = (ep.duration && ep.duration > 0) ? ep.duration : SPRITE_DURATION_SEC;

      const startMs = startOfDayMs + currentOffsetSec * 1000;
      const endMs = startMs + durationSec * 1000;
      
      const startIso = new Date(startMs).toISOString();
      const endIso = new Date(endMs).toISOString();

      // Rule 2: target_column_index math based on clock times.
      // E.g. 0-indexed column based on which 30-min block this slot starts in.
      const target_column_index = Math.floor(currentOffsetSec / SPRITE_DURATION_SEC);
      const safe_col_idx = Math.min(target_column_index, total_columns - 1);

      // Rule 1: Opt-In Feature Flag. If no preview is available, set has_visual_preview to false
      // For demonstration, CSPAN3 and DW lack preview sprites as stated by the prompt instructions.
      const has_visual_preview = !!ep.thumbnailUrl && channelName !== "CSPAN3" && channelName !== "DW";
      
      const slot_id = ep.id ? `${ep.id}-${currentOffsetSec}` : crypto.randomUUID();

      const slot: any = {
        slot_id,
        start_time_utc: startIso,
        end_time_utc: endIso,
        has_visual_preview,
      };

      if (has_visual_preview) {
        slot.sprite_metadata = {
          sprite_sheet_url,
          total_columns,
          total_rows,
          target_column_index: safe_col_idx,
          target_row_index
        };
      }

      timeline_slots.push(slot);

      currentOffsetSec += durationSec;
      epIdx++;
    }

    const channel_id = "CH-" + crypto.createHash('md5').update(channelName).digest('hex').substring(0, 8);

    payload.channels.push({
      channel_id,
      channel_name: channelName,
      timeline_slots
    });

    target_row_index++;
  }

  return payload;
}
