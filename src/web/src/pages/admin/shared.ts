// Types, constants and pure helpers shared by the Admin page, its sections and useAdmin.

export type LibraryParseMode =
  | 'discid-artist-title'
  | 'discid-title-artist'
  | 'artist-title-discid'
  | 'title-artist-discid'
  | 'artist-title'
  | 'title-artist'
  | 'discid_title_artist';

export type Library = { id: number; name: string; path: string; parseMode: LibraryParseMode };
export type BreakFolder = { id: number; name: string; path: string };
export type Stats = {
  artists: number;
  tracks: number;
  queued: number;
  lastScan?: any;
};
export type FolderItem = { name: string; path: string; isDirectory: boolean };
export type ManagedUser = {
  id: number;
  username: string;
  display_name: string | null;
  picture: string | null;
  role: 'admin' | 'user';
  is_active: boolean;
  oidc_subject: string | null;
  oidc_issuer: string | null;
  social_provider?: 'google' | 'facebook' | null;
  singer_id: string | null;
  singer_display_name: string | null;
  linkedLogins: { id: number; username: string; provider: string; isActive: boolean }[];
  created_at: string;
};
export type OidcConfig = {
  enabled: boolean;
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  buttonText: string;
  buttonColor: string;
  autoCreateUsers: boolean;
  passwordLoginEnabled: boolean;
};
export type OidcPublicConfig = {
  enabled: boolean;
  buttonText: string;
  buttonColor: string;
  passwordLoginEnabled: boolean;
};

export const LIBRARY_PARSE_MODE_OPTIONS: Array<{
  value: LibraryParseMode;
  label: string;
  example: string;
}> = [
  {
    value: 'discid-artist-title',
    label: 'discID - Artist - Title',
    example: 'SC1234-01 - Queen - Bohemian Rhapsody',
  },
  {
    value: 'discid-title-artist',
    label: 'discID - Title - Artist',
    example: 'SC1234-01 - Bohemian Rhapsody - Queen',
  },
  {
    value: 'artist-title-discid',
    label: 'Artist - Title - discID',
    example: 'Queen - Bohemian Rhapsody - SC1234-01',
  },
  {
    value: 'title-artist-discid',
    label: 'Title - Artist - discID',
    example: 'Bohemian Rhapsody - Queen - SC1234-01',
  },
  {
    value: 'artist-title',
    label: 'Artist - Title',
    example: 'Queen - Bohemian Rhapsody',
  },
  {
    value: 'title-artist',
    label: 'Title - Artist',
    example: 'Bohemian Rhapsody - Queen',
  },
  {
    value: 'discid_title_artist',
    label: 'discID_title_artist',
    example: 'SC1234-01_Bohemian_Rhapsody_Queen',
  },
];

export type AdminSection = "overview" | "libraries" | "break" | "system" | "gateway" | "users" | "social" | "oidc";

export const ADMIN_SECTION_STORAGE_KEY = "karaokedock.admin.section";

export const ADMIN_SECTIONS: Array<{ id: AdminSection; label: string; icon: string; description: string }> = [
  { id: "overview", label: "Overview", icon: "bar_chart", description: "Library and queue statistics" },
  { id: "libraries", label: "Media Libraries", icon: "library_music", description: "Karaoke folders and how they are scanned" },
  { id: "break", label: "Break Music", icon: "music_note", description: "Break music folders and saved playlists" },
  { id: "system", label: "System", icon: "settings", description: "Requests, downloads, background tasks and logging" },
  { id: "gateway", label: "Remote Gateway", icon: "cloud_sync", description: "Public request gateway sync" },
  { id: "users", label: "Users", icon: "group", description: "Host and admin accounts" },
  { id: "social", label: "Social Login", icon: "account_circle", description: "Google and Facebook sign-in for singers" },
  { id: "oidc", label: "SSO / OIDC", icon: "link", description: "Single sign-on for hosts and admins" },
];

export function isAdminSection(value: unknown): value is AdminSection {
  return ADMIN_SECTIONS.some((section) => section.id === value);
}

export function loadAdminSection(): AdminSection {
  if (typeof window === "undefined") return "overview";
  const fromHash = window.location.hash.replace(/^#/, "");
  if (isAdminSection(fromHash)) return fromHash;
  try {
    const stored = window.localStorage.getItem(ADMIN_SECTION_STORAGE_KEY);
    return isAdminSection(stored) ? stored : "overview";
  } catch {
    return "overview";
  }
}

export const getUserDisplayName = (user: Pick<ManagedUser, 'username' | 'display_name' | 'singer_display_name'>) =>
  user.singer_display_name?.trim() || user.display_name?.trim() || user.username;
