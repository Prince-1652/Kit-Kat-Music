import { invoke } from "@tauri-apps/api/core";
import { renderIcon, renderM3Loader } from "../core/icons";

export interface SearchResult {
  id: string;
  title: string;
  uploader: string;
  duration_secs?: number;
  thumbnail_url?: string;
}

export class SearchManager {
  private timer: number | null = null;
  private currentQueryId = 0;
  private isSearchOpen = false;

  onTrackSelect?: (track: SearchResult) => void;
  onSearchOpen?: () => void;
  onSearchClose?: () => void;

  close(): void {
    this.isSearchOpen = false;
  }

  setup(inputEl: HTMLInputElement, resultsContainer: HTMLElement, clearBtn?: HTMLButtonElement, searchBar?: HTMLElement): void {
    const renderIdleState = () => {
      resultsContainer.innerHTML = `
        <div class="search-empty-state">
          <div class="empty-icon-pill">${renderIcon("search")}</div>
          <div class="empty-text">
            <div class="empty-title">Search music</div>
            <div class="empty-sub">Type a track, artist, or album name</div>
          </div>
        </div>
      `;
    };

    const triggerOpen = () => {
      if (!this.isSearchOpen) {
        this.isSearchOpen = true;
        this.onSearchOpen?.();
      }
      if (inputEl.value.trim().length === 0) {
        // Prevent re-rendering and re-animating if already in idle state
        if (!resultsContainer.querySelector(".search-empty-state:not(.error)")) {
          renderIdleState();
        }
      }
    };

    searchBar?.addEventListener("click", (e) => {
      if (e.target !== clearBtn && !clearBtn?.contains(e.target as Node)) {
        if (document.activeElement === inputEl) {
          triggerOpen();
        } else {
          // Focus triggers inputEl focus listener cleanly without double-call
          inputEl.focus();
        }
      }
    });

    inputEl.addEventListener("focus", () => {
      triggerOpen();
    });

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const q = inputEl.value.trim();
        if (q.length > 0) {
          if (this.timer) clearTimeout(this.timer);
          this.runSearch(q, resultsContainer);
        }
      }
    });

    inputEl.addEventListener("input", () => {
      const q = inputEl.value.trim();
      if (clearBtn) {
        if (q.length > 0) {
          clearBtn.classList.add("visible");
        } else {
          clearBtn.classList.remove("visible");
        }
      }

      if (this.timer) clearTimeout(this.timer);

      if (q.length === 0) {
        this.currentQueryId++; // Invalidate any inflight query
        renderIdleState();
        return;
      }

      if (!this.isSearchOpen) {
        this.isSearchOpen = true;
        this.onSearchOpen?.();
      }
      this.timer = window.setTimeout(() => this.runSearch(q, resultsContainer), 350);
    });

    clearBtn?.addEventListener("click", () => {
      this.currentQueryId++; // Invalidate any inflight query
      if (this.timer) clearTimeout(this.timer);
      inputEl.value = "";
      clearBtn.classList.remove("visible");
      resultsContainer.innerHTML = "";
      this.isSearchOpen = false;
      this.onSearchClose?.();
      inputEl.blur();
    });
  }

  private async runSearch(query: string, container: HTMLElement): Promise<void> {
    const queryId = ++this.currentQueryId;
    container.innerHTML = renderM3Loader("Searching YouTube...");

    try {
      const tracks = await invoke<SearchResult[]>("search_music", { query });
      if (queryId !== this.currentQueryId) return;

      if (tracks.length === 0) {
        container.innerHTML = `
          <div class="search-empty-state">
            <div class="empty-icon-pill">${renderIcon("search")}</div>
            <div class="empty-text">
              <div class="empty-title">No tracks found</div>
              <div class="empty-sub">Try searching with different keywords or artist names</div>
            </div>
          </div>
        `;
        return;
      }

      container.innerHTML = tracks
        .map((t) => {
          const duration = this.formatDuration(t.duration_secs);
          return `
        <div class="search-item" data-id="${this.escapeHtml(t.id)}">
          <div class="search-thumb-wrap">
            <img src="${this.escapeHtml(t.thumbnail_url || "")}" class="search-thumb" alt="" />
            <div class="search-thumb-fallback">${renderIcon("music")}</div>
            <div class="search-thumb-play-overlay">
              ${renderIcon("play")}
            </div>
          </div>
          <div class="search-meta">
            <div class="search-title" title="${this.escapeHtml(t.title)}">${this.escapeHtml(t.title)}</div>
            <div class="search-artist">${this.escapeHtml(t.uploader)}</div>
          </div>
          <div class="search-trailing">
            ${duration ? `<span class="search-duration">${duration}</span>` : ""}
            <div class="search-play-indicator" title="Play">
              ${renderIcon("play")}
            </div>
          </div>
        </div>
      `;
        })
        .join("");

      container.querySelectorAll<HTMLImageElement>(".search-thumb").forEach((img) => {
        img.addEventListener("error", () => {
          img.style.display = "none";
        });
      });

      container.querySelectorAll(".search-item").forEach((el, index) => {
        el.addEventListener("click", () => {
          this.onTrackSelect?.(tracks[index]);
        });
      });
    } catch (err) {
      if (queryId === this.currentQueryId) {
        container.innerHTML = `
          <div class="search-empty-state error">
            <div class="empty-icon-pill error">${renderIcon("wifiOff")}</div>
            <div class="empty-text">
              <div class="empty-title">Search failed</div>
              <div class="empty-sub">Check internet connection and try again</div>
            </div>
          </div>
        `;
      }
    }
  }

  private formatDuration(secs?: number): string {
    if (!secs || isNaN(secs) || secs <= 0) return "";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
