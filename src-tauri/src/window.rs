use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewWindow};

#[derive(Clone, Copy, Default)]
pub struct IslandRect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

pub struct WindowManager {
    pub rect: Mutex<IslandRect>,
    pub collapsed: AtomicBool,
    pub ignoring: AtomicBool,
}

impl WindowManager {
    pub fn new() -> Self {
        Self {
            rect: Mutex::new(IslandRect {
                x: 0.0,
                y: 0.0,
                w: 240.0,
                h: 6.0,
            }),
            collapsed: AtomicBool::new(true),
            ignoring: AtomicBool::new(false),
        }
    }

    pub fn set_rect(&self, rect: IslandRect, collapsed: bool) {
        *self.rect.lock().unwrap() = rect;
        self.collapsed.store(collapsed, Ordering::Relaxed);
    }
}

pub fn setup_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("island") {
        if let Ok(Some(monitor)) = window.primary_monitor() {
            let screen_size = monitor.size();
            let scale = monitor.scale_factor();
            let win_w = (580.0 * scale) as u32;
            let win_h = (400.0 * scale) as u32;
            let x = ((screen_size.width - win_w) / 2) as i32;

            let _ = window.set_size(PhysicalSize::new(win_w, win_h));
            let _ = window.set_position(PhysicalPosition::new(x, 0));
        }

        // Spawn background cursor hit-test thread
        let handle = window.clone();
        std::thread::spawn(move || {
            run_cursor_poll(handle);
        });
    }
}

fn run_cursor_poll(window: WebviewWindow) {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

    let mut is_ignoring = false;

    loop {
        std::thread::sleep(Duration::from_millis(16));

        let mut pt = POINT::default();
        unsafe {
            if GetCursorPos(&mut pt).is_err() {
                continue;
            }
        }

        let Ok(win_pos) = window.outer_position() else { continue };

        let Some(state) = window.try_state::<WindowManager>() else { continue };
        let rect = *state.rect.lock().unwrap();
        let scale = window.scale_factor().unwrap_or(1.0);

        // Convert island rect in window to physical screen coords
        let island_screen_x = win_pos.x as f64 + (rect.x * scale);
        let island_screen_y = win_pos.y as f64 + (rect.y * scale);
        let island_screen_w = rect.w * scale;
        let island_screen_h = rect.h * scale;

        let margin = 14.0 * scale;
        let inside = (pt.x as f64) >= (island_screen_x - margin)
            && (pt.x as f64) <= (island_screen_x + island_screen_w + margin)
            && (pt.y as f64) >= 0.0
            && (pt.y as f64) <= (island_screen_y + island_screen_h + margin);

        let should_ignore = !inside;

        if should_ignore != is_ignoring {
            is_ignoring = should_ignore;
            let _ = window.set_ignore_cursor_events(is_ignoring);
        }
    }
}
