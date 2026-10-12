import { invoke } from "@tauri-apps/api/core";
import { renderIcon } from "../core/icons";

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
  onTrackSelect?: (track: SearchResult) => void;
  onSearchOpen?: () => void;
  onSearchClose?: () => void;

  setup(inputEl: HTMLInputElement, resultsContainer: HTMLElement, clearBtn?: HTMLButtonElement): void {
    inputEl.addEventListener("focus", () => {
      this.onSearchOpen?.();
      if (inputEl.value.trim().length === 0 && resultsContainer.children.length === 0) {
        resultsContainer.innerHTML = `<div class="search-hint">${renderIcon("search")} Type song or artist to search YouTube</div>`;
      }
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
        resultsContainer.innerHTML = `<div class="search-hint">${renderIcon("search")} Type song or artist to search YouTube</div>`;
        return;
      }

      this.onSearchOpen?.();
      this.timer = window.setTimeout(() => this.runSearch(q, resultsContainer), 350);
    });

    clearBtn?.addEventListener("click", () => {
      inputEl.value = "";
      clearBtn.classList.remove("visible");
      resultsContainer.innerHTML = "";
      this.onSearchClose?.();
      inputEl.blur();
    });
  }

  private async runSearch(query: string, container: HTMLElement): Promise<void> {
    const queryId = ++this.currentQueryId;
    container.innerHTML = `<div class="search-loading">${renderIcon("loader2")} Searching YouTube...</div>`;

    try {
      const tracks = await invoke<SearchResult[]>("search_music", { query });
      if (queryId !== this.currentQueryId) return;

      if (tracks.length === 0) {
        container.innerHTML = `<div class="search-empty">No tracks found</div>`;
        return;
      }

      container.innerHTML = tracks
        .map(
          (t) => `
        <div class="search-item" data-id="${t.id}">
          <img src="${t.thumbnail_url || ""}" class="search-thumb" onerror="this.style.display='none'" />
          <div class="search-meta">
            <div class="search-title">${this.escapeHtml(t.title)}</div>
            <div class="search-artist">${this.escapeHtml(t.uploader)}</div>
          </div>
        </div>
      `
        )
        .join("");

      container.querySelectorAll(".search-item").forEach((el, index) => {
        el.addEventListener("click", () => {
          this.onTrackSelect?.(tracks[index]);
        });
      });
    } catch (err) {
      if (queryId === this.currentQueryId) {
        container.innerHTML = `<div class="search-error">${renderIcon("wifiOff")} Search error: ${err}</div>`;
      }
    }
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
