// Type definitions for YouTube IFrame API
declare namespace YT {
  interface Player {
    getCurrentTime(): number;
    getDuration(): number;
    destroy(): void;
  }

  interface PlayerOptions {
    events?: {
      onReady?: (event: any) => void;
      onError?: (event: any) => void;
    };
  }

  class Player {
    constructor(elementId: string, options: PlayerOptions);
  }
}

interface Window {
  YT?: typeof YT;
  onYouTubeIframeAPIReady?: () => void;
}
