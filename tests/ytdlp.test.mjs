import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { existsSync } from "node:fs";

const localAppData = process.env.LOCALAPPDATA || "";
let ytDlpBin = join(localAppData, "Kitkat", "bin", "yt-dlp.exe");
if (!existsSync(ytDlpBin)) {
  ytDlpBin = "yt-dlp";
}

console.log("Checking yt-dlp at:", ytDlpBin);

try {
  const version = execFileSync(ytDlpBin, ["--version"], { encoding: "utf8" });
  console.log("yt-dlp version:", version.trim());

  console.log("Testing audio stream extraction for Blinding Lights (4NRXx6U8ABQ)...");
  const streamUrl = execFileSync(ytDlpBin, [
    "--extractor-args",
    "youtube:player_client=android,web",
    "-g",
    "-f",
    "ba[ext=m4a][protocol^=http]/ba[ext=webm][protocol^=http]/ba[protocol^=http]/ba/b",
    "--no-playlist",
    "https://www.youtube.com/watch?v=4NRXx6U8ABQ"
  ], { encoding: "utf8" }).trim();

  const lines = streamUrl.split("\n").map(s => s.trim()).filter(s => s.startsWith("http"));
  const chosenUrl = lines[lines.length - 1];
  console.log("Extracted Stream URL prefix:", chosenUrl.substring(0, 80));

  const headRes = await fetch(chosenUrl, {
    method: "GET",
    headers: {
      "Range": "bytes=0-1024",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });
  console.log("Audio stream status:", headRes.status);
  console.log("Content-Type:", headRes.headers.get("content-type"));
  console.log("Accept-Ranges:", headRes.headers.get("accept-ranges"));

  if (headRes.status === 200 || headRes.status === 206) {
    console.log("SUCCESS: Stream is directly playable by HTML5 Audio!");
  } else {
    console.error("FAIL: Stream returned status", headRes.status);
    process.exit(1);
  }

  console.log("Testing audio stream extraction for Adele Hello (YQHsXMglC9A)...");
  const adeleUrl = execFileSync(ytDlpBin, [
    "--extractor-args",
    "youtube:player_client=android,web",
    "-g",
    "-f",
    "ba[ext=m4a][protocol^=http]/ba[ext=webm][protocol^=http]/ba[protocol^=http]/ba/b",
    "--no-playlist",
    "https://www.youtube.com/watch?v=YQHsXMglC9A"
  ], { encoding: "utf8" }).trim();

  const adeleLines = adeleUrl.split("\n").map(s => s.trim()).filter(s => s.startsWith("http"));
  const chosenAdele = adeleLines[adeleLines.length - 1];
  const adeleRes = await fetch(chosenAdele, {
    method: "GET",
    headers: {
      "Range": "bytes=0-1024",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });
  console.log("Adele stream status:", adeleRes.status);
  if (adeleRes.status === 200 || adeleRes.status === 206) {
    console.log("SUCCESS: Adele stream is directly playable!");
  } else {
    console.error("FAIL: Adele stream returned status", adeleRes.status);
    process.exit(1);
  }
} catch (err) {
  console.error("Error during test:", err);
  process.exit(1);
}
