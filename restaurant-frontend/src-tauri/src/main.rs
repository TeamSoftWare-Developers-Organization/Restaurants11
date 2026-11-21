// منع فتح شاشة موجه الأوامر (CMD) نهائياً على نظام Windows
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    smart_restaurant_pos_lib::run()
}
