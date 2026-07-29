// config.js — ตั้งค่าระบบ (แก้ไฟล์นี้ไฟล์เดียว)
const CONFIG = {
  // https://frc-contour-default-rtdb.asia-southeast1.firebasedatabase.app/
  FIREBASE_URL: "",   // เช่น "https://xxxx-default-rtdb.asia-southeast1.firebasedatabase.app"
  FORECAST_PATH: "forecast/ec",
  HISTORY_PATH: "history/ec",
  ALERT_THRESHOLD: 600,   // µS/cm — เกณฑ์เตือน
  WARN_THRESHOLD: 450,
  REFRESH_MINUTES: 10,    // รีเฟรชข้อมูลอัตโนมัติ
};
