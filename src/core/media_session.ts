import type { AudioEngine, AudioTrack } from "./audio";

export function setupMediaSession(engine: AudioEngine, onNext?: () => void, onPrev?: () => void): void {
  if (!("mediaSession" in navigator)) return;

  engine.addStateListener((state) => {
    navigator.mediaSession.playbackState = state === "playing" ? "playing" : state === "paused" ? "paused" : "none";
  });

  try {
    navigator.mediaSession.setActionHandler("play", () => engine.resume());
    navigator.mediaSession.setActionHandler("pause", () => engine.pause());
    navigator.mediaSession.setActionHandler("nexttrack", () => onNext?.());
    navigator.mediaSession.setActionHandler("previoustrack", () => onPrev?.());
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) engine.seek(details.seekTime);
    });
  } catch {
    // Some action handlers might not be supported on all webview versions
  }
}

export function updateMediaMetadata(track: AudioTrack): void {
  if (!("mediaSession" in navigator)) return;

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      artwork: track.thumbnailUrl ? [{ src: track.thumbnailUrl, sizes: "512x512", type: "image/jpeg" }] : [],
    });
  } catch {
    // Ignore metadata failure
  }
}
