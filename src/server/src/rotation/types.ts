// server/src/rotation/types.ts
// All shared types, interfaces, and enums for the karaoke rotation system.

// ---------------------------------------------------------------------------
// Enum string-literal types
// ---------------------------------------------------------------------------

export type SingerStatus = 'active' | 'inactive' | 'absent' | 'skipped' | 'banned';
export type SongRequestStatus = 'pending' | 'queued' | 'singing' | 'completed' | 'skipped' | 'removed';
export type RotationStatus = 'active' | 'paused' | 'closed';
export type RotationSingerStatus = 'active' | 'inactive' | 'absent' | 'skipped';
export type RotationTurnStatus = 'scheduled' | 'active' | 'completed' | 'skipped';
export type RotationTurnSource = 'automatic' | 'manual_override' | 'priority';
export type OverrideStatus = 'pending' | 'consumed' | 'cancelled';

/** How the rotation selects the next singer/song. */
export type RotationType =
  | 'strict_round_robin'
  | 'least_recently_sung'
  | 'signup_order'
  | 'song_queue_only'
  | 'manual'
  | 'hybrid';

/** Where a new singer is inserted when using strict_round_robin. */
export type NewSingerPlacement = 'end_of_current_round' | 'next_round' | 'next_available';

/** How duets/group songs count for each participant. */
export type DuetPolicy = 'primary_only' | 'all_participants' | 'group_as_singer';

/** What happens to a singer when they are skipped. */
export type SkipPolicy = 'move_to_end' | 'keep_position' | 'remove_until_reactivated';

/** Priority handling strategy. */
export type PriorityPolicy = 'none' | 'host_override_only' | 'weighted' | 'vip_next';

/** How the next song is chosen for the selected singer. */
export type SongSelectionPolicy =
  | 'oldest_request_first'
  | 'manual_host_selection'
  | 'singer_selected_next'
  | 'highest_priority_first';

/** What to do when the active singer runs out of songs. */
export type EmptySingerPolicy = 'remove_from_rotation' | 'keep_active_without_song';

// ---------------------------------------------------------------------------
// Data model interfaces (mirror DB rows)
// ---------------------------------------------------------------------------

export interface Singer {
  id: bigint;
  display_name: string;
  status: SingerStatus;
  joined_at: Date;
  last_sang_at: Date | null;
  total_songs_sung: number;
}

export interface SongRequest {
  id: bigint;
  singer_id: bigint;
  track_id: number | null;
  title: string;
  artist: string | null;
  status: SongRequestStatus;
  requested_at: Date;
  completed_at: Date | null;
  priority: number;
  participant_singer_ids: bigint[];
}

export interface RotationConfig {
  type: RotationType;
  basePolicy: RotationType;
  newSingerPlacement: NewSingerPlacement;
  duetPolicy: DuetPolicy;
  skipPolicy: SkipPolicy;
  priorityPolicy: PriorityPolicy;
  allowSingerMultipleSongsInQueue: boolean;
  maxPendingSongsPerSinger: number;
  preventSameSingerBackToBack: boolean;
  songSelectionPolicy: SongSelectionPolicy;
  emptySingerPolicy: EmptySingerPolicy;
}

export interface Rotation {
  id: bigint;
  name: string;
  type: RotationType;
  base_policy: RotationType;
  status: RotationStatus;
  current_round: number;
  current_turn_id: bigint | null;
  config: RotationConfig;
  created_at: Date;
  updated_at: Date;
}

export interface RotationSinger {
  id: bigint;
  rotation_id: bigint;
  singer_id: bigint;
  status: RotationSingerStatus;
  position: number;
  joined_at: Date;
  current_round_joined: number;
  last_round_sang: number | null;
  last_sang_at: Date | null;
  total_songs_sung: number;
}

export interface RotationTurn {
  id: bigint;
  rotation_id: bigint;
  singer_id: bigint;
  song_request_id: bigint | null;
  round_number: number;
  status: RotationTurnStatus;
  source: RotationTurnSource;
  created_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
}

export interface ManualOverride {
  id: bigint;
  rotation_id: bigint;
  singer_id: bigint;
  song_request_id: bigint | null;
  position: number;
  status: OverrideStatus;
  expires_after_turn: boolean;
  created_at: Date;
}

// ---------------------------------------------------------------------------
// In-memory "snapshot" types used by pure policy functions
// ---------------------------------------------------------------------------

/** A singer enriched with their rotation-specific fields and pending songs. */
export interface SingerSnapshot {
  singerId: bigint;
  displayName: string;
  singerStatus: SingerStatus;
  rotationStatus: RotationSingerStatus;
  position: number;
  joinedAt: Date;
  currentRoundJoined: number;
  lastRoundSang: number | null;
  lastSangAt: Date | null;
  pendingSongs: SongRequestSnapshot[];
}

export interface SongRequestSnapshot {
  id: bigint;
  singerId: bigint;
  title: string;
  artist: string | null;
  priority: number;
  requestedAt: Date;
  participantSingerIds: bigint[];
}

/** Minimal context passed into every policy function. */
export interface PolicyContext {
  currentRound: number;
  lastCompletedSingerId: bigint | null;
  config: RotationConfig;
}

/** Result returned by a policy — identifies which singer and song to use next. */
export interface PolicyResult {
  singerId: bigint;
  songRequestId: bigint;
}

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

export interface RotationState {
  rotation: Rotation;
  currentTurn: RotationTurn | null;
  nextTurnPreview: PolicyResult | null;
  singersInOrder: SingerSnapshot[];
  pendingSongsBySinger: Record<string, SongRequestSnapshot[]>;
  recentlyCompletedTurns: RotationTurn[];
  manualOverrides: ManualOverride[];
  currentRound: number;
}

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

export const DEFAULT_ROTATION_CONFIG: RotationConfig = {
  type: 'hybrid',
  basePolicy: 'strict_round_robin',
  newSingerPlacement: 'end_of_current_round',
  duetPolicy: 'all_participants',
  skipPolicy: 'move_to_end',
  priorityPolicy: 'host_override_only',
  allowSingerMultipleSongsInQueue: true,
  maxPendingSongsPerSinger: 5,
  preventSameSingerBackToBack: true,
  songSelectionPolicy: 'oldest_request_first',
  emptySingerPolicy: 'keep_active_without_song',
};
