use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};

pub fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let open_item = MenuItem::with_id(app, "open", "Show Island", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "Customization…", true, None::<&str>)?;
    let update_item = MenuItem::with_id(app, "check_updates", "Check for Updates…", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit KitKat", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&open_item, &settings_item, &update_item, &sep, &quit_item])?;

    let mut builder = TrayIconBuilder::with_id("kitkat-tray")
        .tooltip("KitKat Music")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => {
                if let Some(win) = app.get_webview_window("island") {
                    let _ = win.emit("tray-open", ());
                }
            }
            "settings" => {
                crate::open_settings_window(app);
            }
            "check_updates" => {
                crate::open_settings_window(app);
                if let Some(win) = app.get_webview_window("settings") {
                    let _ = win.emit("trigger-update-check", ());
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(win) = app.get_webview_window("island") {
                    let _ = win.emit("tray-toggle", ());
                }
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    builder.build(app)?;
    Ok(())
}
