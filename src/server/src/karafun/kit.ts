import type {
  KarafunKit,
  KarafunKitFile,
  KarafunKitFileKind,
} from './types.js';

// KaraFun ".kit" container parser.
//
// Layout (big-endian):
//   u32 magic
//   N x { u8 type, u32 totalSize }              directory
//   M x { u8 type, u32 size, u32 offset, data } chunks
//
// `offset` is the position of the chunk inside the merged logical file for
// that type. Chunks of one logical file can be interleaved with others.
// The XML <files> section maps chunk types to logical names:
//   <file index="2" label="ins.ogg">ins.ogg</file>
// This parser uses only Uint8Array/DataView and also runs in the browser.

const XML_MAGIC = [0x3c, 0x3f, 0x78, 0x6d]; // "<?xm"

function indexOfBytes(bytes: Uint8Array, pattern: number[], from = 0): number {
  outer: for (let i = from; i <= bytes.length - pattern.length; i++) {
    for (let j = 0; j < pattern.length; j++) {
      if (bytes[i + j] !== pattern[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes);
}

function sanitizeName(name: string, fallback: string): string {
  const cleaned = String(name ?? '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/^\.+/, '')
    .trim();
  return cleaned || fallback;
}

export function classifyKitFile(name: string): { kind: KarafunKitFileKind; mime: string } {
  const lower = name.toLowerCase();
  if (lower === 'xml') return { kind: 'xml', mime: 'application/xml' };
  const ext = lower.includes('.') ? lower.split('.').pop() : '';
  if (ext === 'ogg' || ext === 'oga') return { kind: 'audio', mime: 'audio/ogg' };
  if (ext === 'jpg' || ext === 'jpeg') return { kind: 'image', mime: 'image/jpeg' };
  if (ext === 'png') return { kind: 'image', mime: 'image/png' };
  if (ext === 'milk') return { kind: 'preset', mime: 'text/plain' };
  if (ext === 'xml') return { kind: 'xml', mime: 'application/xml' };
  return { kind: 'binary', mime: 'application/octet-stream' };
}

export function audioRole(file: Pick<KarafunKitFile, 'name' | 'label'>): string {
  const name = (file.label || file.name).toLowerCase();
  if (/\bins\b|instrumental/.test(name)) return 'instrumental';
  if (/\bbv\b|backing/.test(name)) return 'backing';
  if (/\bld\b|lead/.test(name)) return 'lead';
  return 'track';
}

export function parseKarafunKit(input: Uint8Array | ArrayBuffer): KarafunKit {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 32) throw new Error('Not a KaraFun .kit file (too small)');

  const xmlStart = indexOfBytes(bytes, XML_MAGIC);
  if (xmlStart < 9) throw new Error('Not a KaraFun .kit file (no karaoke XML)');

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const firstChunk = xmlStart - 9;
  const xmlSize = view.getUint32(firstChunk + 1, false);
  if (firstChunk + 9 + xmlSize > bytes.length) {
    throw new Error('Invalid KaraFun .kit XML chunk size');
  }

  const magic = view.getUint32(0, false);
  const directoryBytes = firstChunk - 4;
  if (directoryBytes < 0 || directoryBytes % 5 !== 0) {
    throw new Error('Invalid KaraFun .kit directory');
  }

  const directory: Array<{ type: number; totalSize: number }> = [];
  for (let offset = 4; offset < firstChunk; offset += 5) {
    directory.push({
      type: bytes[offset],
      totalSize: view.getUint32(offset + 1, false),
    });
  }

  const chunks: Array<{ type: number; size: number; offset: number; dataStart: number }> = [];
  let position = firstChunk;
  while (position + 9 <= bytes.length) {
    const type = bytes[position];
    const size = view.getUint32(position + 1, false);
    const offset = view.getUint32(position + 5, false);
    const dataStart = position + 9;
    if (size === 0 || dataStart + size > bytes.length) break;
    chunks.push({ type, size, offset, dataStart });
    position = dataStart + size;
  }
  if (chunks.length === 0) throw new Error('Invalid KaraFun .kit chunk stream');

  const byType = new Map<number, typeof chunks>();
  for (const chunk of chunks) {
    const list = byType.get(chunk.type) ?? [];
    list.push(chunk);
    byType.set(chunk.type, list);
  }

  const files: KarafunKitFile[] = [];
  for (const [type, list] of [...byType.entries()].sort((a, b) => a[0] - b[0])) {
    const declared = directory.find((entry) => entry.type === type)?.totalSize;
    const total = declared ?? list.reduce((sum, chunk) => sum + chunk.size, 0);
    const merged = new Uint8Array(total);
    let fallbackOffset = 0;
    for (const chunk of list) {
      const target = chunk.offset + chunk.size <= total ? chunk.offset : fallbackOffset;
      merged.set(bytes.subarray(chunk.dataStart, chunk.dataStart + chunk.size), target);
      fallbackOffset = target + chunk.size;
    }
    files.push({
      type,
      name: '',
      label: '',
      kind: 'binary',
      mime: 'application/octet-stream',
      size: total,
      data: merged,
    });
  }

  const xmlFile = files.find((file) =>
    decodeUtf8(file.data.subarray(0, 16)).startsWith('<?xml'),
  );
  if (!xmlFile) throw new Error('Invalid KaraFun .kit: no karaoke XML chunk');
  const xml = decodeUtf8(xmlFile.data);

  const labels = new Map<number, string>();
  for (const match of xml.matchAll(/<file\b([^>]*)>([\s\S]*?)<\/file>/gi)) {
    const attrs = match[1];
    const index = /(?:^|\s)index\s*=\s*"(\d+)"/i.exec(attrs)?.[1];
    const label = /(?:^|\s)label\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] ?? match[2];
    if (index !== undefined) labels.set(Number(index), label);
  }

  for (const file of files) {
    const label = labels.get(file.type);
    file.label = label ?? `file-${file.type}.bin`;
    file.name = sanitizeName(label ?? `file-${file.type}.bin`, `file-${file.type}.bin`);
    Object.assign(file, classifyKitFile(file.name));
  }

  const used = new Set<string>();
  for (const file of files) {
    let name = file.name;
    if (used.has(name)) {
      const dot = name.lastIndexOf('.');
      const base = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : '';
      let counter = 2;
      while (used.has(`${base}_${counter}${ext}`)) counter++;
      name = `${base}_${counter}${ext}`;
    }
    used.add(name);
    file.name = name;
  }

  if (!xmlFile.name.includes('.')) {
    xmlFile.name = 'karaoke.xml';
    xmlFile.kind = 'xml';
    xmlFile.mime = 'application/xml';
  }

  return {
    magic,
    directory,
    chunks,
    files,
    xml,
    audioFiles: files.filter((file) => file.kind === 'audio'),
    imageFiles: files.filter((file) => file.kind === 'image'),
    presetFiles: files.filter((file) => file.kind === 'preset'),
  };
}
