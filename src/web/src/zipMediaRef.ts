const ZIP_MEDIA_REF_PREFIX = "zip://";
const ZIP_MEDIA_REF_RE = /^(.*\.zip)#([\s\S]*)$/i;

export type ParsedZipMediaRef = {
  zipPath: string;
  entryName: string;
};

export function parseZipMediaRef(ref: string): ParsedZipMediaRef | null {
  if (!ref.startsWith(ZIP_MEDIA_REF_PREFIX)) {
    return null;
  }

  const withoutPrefix = ref.slice(ZIP_MEDIA_REF_PREFIX.length);
  const match = withoutPrefix.match(ZIP_MEDIA_REF_RE);
  if (!match) {
    return {
      zipPath: withoutPrefix,
      entryName: "",
    };
  }

  return {
    zipPath: match[1],
    entryName: match[2],
  };
}
