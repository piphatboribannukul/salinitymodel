# EC Forecast Web — วิธีติดตั้ง

## โครงไฟล์ (แยกไฟล์แล้ว แก้ง่าย)
| ไฟล์ | หน้าที่ | ต้องแก้ไหม |
|---|---|---|
| index.html | โครงหน้า | ไม่ |
| style.css | ธีม/สี | ตามใจ |
| app.js | logic แผนที่+กราฟ+ตาราง | ไม่ |
| **config.js** | **FIREBASE_URL + เกณฑ์เตือน** | **ใส่ URL Firebase (บรรทัดเดียว)** |
| stations.js | พิกัดสถานี (ตอนนี้ประมาณ) | แก้พิกัดจริงได้ทีละสถานี |
| boundaries.js | ขอบเขตบริการ(จังหวัดจริง) + zone influence + สาขา (Voronoi ประมาณ) | แทน GeoJSON ทางการได้ |
| demo_data.js | ข้อมูลตัวอย่าง (fallback) | ไม่ |

## ติดตั้งบน GitHub Pages (FRCfirebase repo)
1. สร้างโฟลเดอร์ `forecast/` ใน repo แล้วอัปโหลด 7 ไฟล์นี้
2. แก้ config.js ใส่ FIREBASE_URL (ตัวเดียวกับใน FRCContour/Railway)
3. เข้า https://piphatboribannukul.github.io/FRCfirebase/forecast/

## พฤติกรรม LIVE / DEMO
- เปิดมาแล้วลองอ่าน Firebase `/forecast/ec` ก่อน → มีข้อมูล = ป้าย LIVE เขียว
- ต่อไม่ได้/ยังว่าง (Railway ยังไม่รัน) = ป้าย DEMO เหลือง ใช้ข้อมูลตัวอย่างจากโมเดล
- รีเฟรชอัตโนมัติทุก 10 นาที (ตั้งใน config.js)

## ชั้นข้อมูลบนแผนที่ (ปุ่ม toggle มุมขวาบนของการ์ดแผนที่)
- ขอบเขตพื้นที่บริการ — เส้นจังหวัด กทม./นนทบุรี/สมุทรปราการ (ข้อมูลจริง)
- Zone Influence โรงสูบ — 13 โซน (Voronoi โดยประมาณ — แทนด้วยขอบเขตทางการได้ใน boundaries.js)
- พื้นที่สาขา — 6 เขต (เฉพาะสาขาที่มีสถานี TWQMS; เพิ่ม/แทนได้)

## ฝั่ง Railway
ใช้ predict_ec.py ตัวล่าสุด (เขียน current+hist+fc เพิ่ม) — แทนไฟล์เดิมใน repo ได้เลย
