import React from 'react';
import './MatrixGuideCell.css';

interface SpriteMetadata {
  sprite_sheet_url: string;
  total_columns: number;
  total_rows: number;
  target_column_index: number;
  target_row_index: number;
}

interface MicroSpriteConfig {
  url: string;
  cols: number;
  rows: number;
  frames: Array<{ minute_idx: number; col: number; row: number }>;
}

interface TimelineSlot {
  slot_id: string;
  start_time_utc: string;
  end_time_utc: string;
  duration_minutes?: number;
  has_visual_preview?: boolean;
  sprite_metadata?: SpriteMetadata;
  has_micro_previews?: boolean;
  micro_sprite_config?: MicroSpriteConfig;
}

export const MatrixGuideCell: React.FC<{ slot: TimelineSlot; title: string }> = ({ slot, title }) => {
  // Opt-In Feature Flag for Micro Grid
  if (slot.has_micro_previews && slot.micro_sprite_config && slot.micro_sprite_config.frames) {
    return (
      <div className="timeline-slot-container border border-[var(--border)] overflow-hidden" style={{ contain: 'strict' }}>
        <div className="micro-thumbnail-track" style={{ '--slot-total-minutes': slot.duration_minutes || 60 } as React.CSSProperties}>
          {slot.micro_sprite_config.frames.map((frame) => (
            <div 
              key={frame.minute_idx}
              className="micro-preview-tile"
              style={{
                '--matrix-cols': slot.micro_sprite_config!.cols,
                '--matrix-rows': slot.micro_sprite_config!.rows,
                '--col-idx': frame.col,
                '--row-idx': frame.row,
                '--sprite-url': `url(${slot.micro_sprite_config!.url})`
              } as React.CSSProperties}
            />
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-2 z-10 bg-black/50">
          <span className="text-xs text-[var(--text-1)] truncate block font-semibold">{title}</span>
        </div>
      </div>
    );
  }

  // Rule 1: Opt-In Feature Flag (has_visual_preview) fallback
  if (!slot.has_visual_preview || !slot.sprite_metadata) {
    return (
      <div className="matrix-guide-cell fallback-cell bg-ajn-surface-1 flex items-center justify-center text-ajn-text-1 border border-ajn-border">
        <span className="text-xs truncate px-2">{title}</span>
      </div>
    );
  }

  const {
    sprite_sheet_url,
    total_columns,
    total_rows,
    target_column_index,
    target_row_index
  } = slot.sprite_metadata;

  // Rule 2: Percent-Based CSS Locators
  // The frontend must calculate background position using coordinates and matrix counts natively, avoiding hardcoded values:
  const xOffsetPercent = total_columns > 1 ? (target_column_index / (total_columns - 1)) * 100 : 0;
  const yOffsetPercent = total_rows > 1 ? (target_row_index / (total_rows - 1)) * 100 : 0;

  // Rule 3: Enforced Container Boundaries
  // CSS class "matrix-guide-cell" implements the required background-size and overflow logic.
  
  return (
    <div 
      className="matrix-guide-cell border border-ajn-border"
      style={{
        backgroundImage: `url(${sprite_sheet_url})`,
        backgroundPosition: `${xOffsetPercent}% ${yOffsetPercent}%`,
        // We set CSS variables to enforce the size in CSS as requested.
        '--total-columns': total_columns,
        '--total-rows': total_rows,
      } as React.CSSProperties}
    >
      {/* Title overlay or other metadata can go here, ensuring it contrasts with the image */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2">
        <span className="text-xs text-ajn-text-1 truncate block font-semibold">{title}</span>
      </div>
    </div>
  );
};

