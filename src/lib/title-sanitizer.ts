// src/lib/title-sanitizer.ts

/**
 * Extracts filenames from URLs, strips unwanted tags, extensions,
 * and visual fluff to create clean display titles while preserving release years.
 */
export function sanitizeTitle(rawTitle: string): string {
  if (!rawTitle) return "Unknown Title";
  
  let clean = rawTitle;

  // 1. If a full URL or file path is passed, extract ONLY the final filename
  if (clean.includes('/')) {
    clean = clean.split('/').pop() || clean;
  }

  // 2. Decode URL-encoded strings (fixes %20, %27, %28, %29)
  try {
    clean = decodeURIComponent(clean);
  } catch (e) {
    console.warn("Title decode failed for:", clean);
  }

  // 3. Strip file extensions (.mp4, .mkv, .m4v, .ts, .avi)
  clean = clean.replace(/\.[a-zA-Z0-9]{2,4}$/gi, "");

  // 4. Remove all brackets and parentheses to free trapped years (e.g., "(1971)" -> " 1971 ")
  clean = clean.replace(/[()[\]{}]/g, " ");

  // 5. Remove resolutions, codecs, and broadcast tags 
  const fluffRegex = /\b(1080p|720p|480p|2160p|4k|x264|h264|x265|h265|hevc|bluray|web-dl|webrip|brrip|bdrip|dvdrip|aac|ac3|mp3|movie|remastered|sdtv|hdtv|eztv|dvdscr|r5|tc|cam)\b/gi;
  clean = clean.replace(fluffRegex, " ");

  // 6. Strip non-ASCII/Cyrillic characters (Fallback for unreadable foreign metadata like "Канал")
  clean = clean.replace(/[^\x00-\x7F]/g, "");

  // 7. Normalize separators (replace underscores and dashes with spaces)
  clean = clean.replace(/[_.-]+/g, " ");

  // 8. Collapse spaced acronyms (e.g., "A L F" -> "ALF")
  clean = clean.replace(/\b([a-zA-Z])\s(?=[a-zA-Z]\b)/g, "$1");

  // 9. Remove duplicate words (e.g., "ALF S01E01 ALF" -> "ALF S01E01")
  const words = clean.split(/\s+/).filter(word => word.length > 0);
  const uniqueWords = [...new Set(words)];
  clean = uniqueWords.join(" ");

  // 10. Trim excess whitespace. If Cyrillic strip left nothing, fallback to "Unknown Title"
  const finalTitle = clean.trim();
  return finalTitle === "" || finalTitle.match(/^[0-9]+$/) ? "Unknown Title" : finalTitle;
}
