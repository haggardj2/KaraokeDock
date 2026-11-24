import { createHash } from 'node:crypto';

export interface SyntheticAudioFile {
  type: number;
  label: string;
  data: Buffer;
}

export interface SyntheticKit {
  kit: Buffer;
  xml: string;
  audio: SyntheticAudioFile[];
  md5: string;
  fragments: Buffer[];
}

export function sampleKaraokeXml(
  files: Array<{ index: number; label: string }> = [
    { index: 1, label: 'xml' },
    { index: 2, label: 'ins.ogg' },
    { index: 3, label: 'ld.ogg' },
  ],
  duration = 2,
): string {
  const fileTags = files
    .map((file) => `<file index="${file.index}" label="${file.label}">${file.label}</file>`)
    .join('');
  return [
    '<?xml version="1.0"?>',
    '<root>',
    `<karaoke duration="${duration}">`,
    '<page id="1"><line id="1"><word id="1">',
    '<syllabe><start>00:00:01,000</start><end>00:00:01,500</end><text>Hel</text></syllabe>',
    '<syllabe><start>00:00:01,500</start><end>00:00:02,000</end><text>lo</text></syllabe>',
    '</word></line></page>',
    '</karaoke>',
    `<files>${fileTags}</files>`,
    '</root>',
  ].join('');
}

export function chunkBytes(type: number, data: Buffer, offset: number): Buffer {
  const header = Buffer.alloc(9);
  header[0] = type;
  header.writeUInt32BE(data.length, 1);
  header.writeUInt32BE(offset, 5);
  return Buffer.concat([header, data]);
}

export function buildKitFromChunks(
  xml: string,
  directory: Array<{ type: number; size: number }>,
  chunks: Buffer[],
): Buffer {
  const header = Buffer.alloc(4 + directory.length * 5);
  header.writeUInt32BE(0x0fd7ce01, 0);
  directory.forEach((entry, index) => {
    const offset = 4 + index * 5;
    header[offset] = entry.type;
    header.writeUInt32BE(entry.size, offset + 1);
  });
  return Buffer.concat([header, ...chunks]);
}

/**
 * Build a synthetic .kit with the XML first and each audio file interleaved in
 * two pieces. This exercises chunk routing by offset rather than simple
 * concatenation.
 */
export function buildSyntheticKit(options: {
  audio?: SyntheticAudioFile[];
  duration?: number;
  fragmentSize?: number;
} = {}): SyntheticKit {
  const audio = options.audio ?? [
    { type: 2, label: 'ins.ogg', data: Buffer.from('OggS-INS-0123456789', 'utf8') },
    { type: 3, label: 'ld.ogg', data: Buffer.from('OggS-LD-ABCDEFGHIJ', 'utf8') },
  ];
  const xml = sampleKaraokeXml(
    [
      { index: 1, label: 'xml' },
      ...audio.map((file) => ({ index: file.type, label: file.label })),
    ],
    options.duration ?? 2,
  );
  const xmlBuffer = Buffer.from(xml, 'utf8');
  const directory = [
    { type: 1, size: xmlBuffer.length },
    ...audio.map((file) => ({ type: file.type, size: file.data.length })),
  ];

  const chunks: Buffer[] = [chunkBytes(1, xmlBuffer, 0)];
  const half = audio.map((file) => Math.max(1, Math.floor(file.data.length / 2)));
  for (const [index, file] of audio.entries()) {
    const split = half[index] ?? file.data.length;
    chunks.push(chunkBytes(file.type, file.data.subarray(0, split), 0));
  }
  for (const [index, file] of audio.entries()) {
    const split = half[index] ?? file.data.length;
    chunks.push(
      chunkBytes(file.type, file.data.subarray(split), split),
    );
  }

  const kit = buildKitFromChunks(xml, directory, chunks);
  const fragmentSize = options.fragmentSize ?? 7;
  const fragments: Buffer[] = [];
  for (let index = 0; index < kit.length; index += fragmentSize) {
    fragments.push(kit.subarray(index, index + fragmentSize));
  }

  return {
    kit,
    xml,
    audio,
    md5: createHash('md5').update(kit).digest('hex'),
    fragments,
  };
}

export function fetchFromFragments(fragments: Buffer[]): typeof fetch {
  return (async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          for (const fragment of fragments) controller.enqueue(fragment);
          controller.close();
        },
      }),
    )) as typeof fetch;
}

export const sampleSessionXml = `<?xml version="1.0"?>
<response status="OK"><session>
  <key>ADQrGFDb</key>
  <user_id>6317143</user_id>
  <user_login>tester</user_login>
  <plan caption="Pro">S</plan>
  <is_pro>1</is_pro>
  <subscription_end_date>2026-12-01 00:00:00</subscription_end_date>
  <images-url-schema>https://cdnaws.recis.io/i/api/{id}/{format}.jpg</images-url-schema>
</session></response>`;

export const sampleSearchXml = `<?xml version="1.0"?>
<response status="OK"><list total_found="2">
  <song id="12543" content="73f4ac" meta="07b18d"/>
  <song id="37299" content="8110f3" meta="88cbea"/>
</list></response>`;

export const sampleSongInfoXml = `<?xml version="1.0"?>
<response status="OK">
  <song id="12543" len="239" explicit_lyrics="1" meta="07b18d" content="73f4ac">
    <title>Creep</title><artist id="4075">Radiohead</artist><year>1992</year>
    <tracks>
      <track type="ins" file="ins" caption="" index="0" active="" inactive="" />
      <track type="ld" file="ld" caption="" index="0" active="" inactive="" />
    </tracks>
    <keys>G</keys><image id="0004d3bb100547" /><bpm>-92</bpm>
  </song>
</response>`;

export const sampleSongRequestXml = `<?xml version="1.0"?>
<response status="OK">
  <song id="12543" len="239" preview="0" meta="07b18d" content="73f4ac">
    <title>Creep</title><artist id="4075">Radiohead</artist><year>1992</year>
    <stream>https://kf.assets.recis.io/example.kit</stream>
    <filesize>5325027</filesize>
    <md5>1a3f6fc3aa544f6cfa1a2bf67a73f4ac</md5>
    <previewstartsec>0</previewstartsec>
  </song>
</response>`;

export const sampleErrorXml = `<?xml version="1.0"?>
<response status="Error">
  <error action="restart">INVALID_SESSION</error>
  <message display="none">Your request could not be processed.</message>
</response>`;
