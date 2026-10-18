/**
 * Minimal ID3v2.3 tag writer (title, artist, comment, source URL) so the
 * MP3s stems produces show up properly in players and libraries.
 * Text frames use UTF-16 with BOM (encoding 1), which ID3v2.3 readers
 * universally support, so any title round-trips.
 */
export interface Id3Tags {
  title?: string;
  artist?: string;
  album?: string;
  comment?: string;
  /** Stored as WOAS (official audio source webpage). */
  sourceUrl?: string;
}

function utf16WithBom(s: string): Uint8Array {
  const out = new Uint8Array(2 + s.length * 2 + 2);
  out[0] = 0xff; out[1] = 0xfe; // little-endian BOM
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out[2 + i * 2] = c & 0xff;
    out[3 + i * 2] = c >> 8;
  }
  return out; // trailing two zero bytes = terminator
}

function frame(id: string, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(10 + payload.length);
  for (let i = 0; i < 4; i++) out[i] = id.charCodeAt(i);
  new DataView(out.buffer).setUint32(4, payload.length); // v2.3: plain big-endian size
  out.set(payload, 10);
  return out;
}

function textFrame(id: string, value: string): Uint8Array {
  const text = utf16WithBom(value);
  const payload = new Uint8Array(1 + text.length);
  payload[0] = 1; // UTF-16 with BOM
  payload.set(text, 1);
  return frame(id, payload);
}

function commentFrame(value: string): Uint8Array {
  const desc = utf16WithBom('');
  const text = utf16WithBom(value);
  const payload = new Uint8Array(1 + 3 + desc.length + text.length);
  payload[0] = 1;
  payload.set([0x65, 0x6e, 0x67], 1); // "eng"
  payload.set(desc, 4);
  payload.set(text, 4 + desc.length);
  return frame('COMM', payload);
}

function latin1Frame(id: string, value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) bytes[i] = value.charCodeAt(i) & 0xff;
  return frame(id, bytes);
}

/** Build an ID3v2.3 tag (empty array when there is nothing to write). */
export function id3v23(tags: Id3Tags): Uint8Array {
  const frames: Uint8Array[] = [];
  if (tags.title) frames.push(textFrame('TIT2', tags.title));
  if (tags.artist) frames.push(textFrame('TPE1', tags.artist));
  if (tags.album) frames.push(textFrame('TALB', tags.album));
  if (tags.comment) frames.push(commentFrame(tags.comment));
  if (tags.sourceUrl) frames.push(latin1Frame('WOAS', tags.sourceUrl));
  if (!frames.length) return new Uint8Array(0);
  const size = frames.reduce((n, f) => n + f.length, 0);
  const out = new Uint8Array(10 + size);
  out.set([0x49, 0x44, 0x33, 3, 0, 0], 0); // "ID3", v2.3.0, no flags
  // Syncsafe size: 4 × 7 bits.
  out[6] = (size >> 21) & 0x7f; out[7] = (size >> 14) & 0x7f; out[8] = (size >> 7) & 0x7f; out[9] = size & 0x7f;
  let o = 10;
  for (const f of frames) { out.set(f, o); o += f.length; }
  return out;
}
