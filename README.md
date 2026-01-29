# Admin Stock - Astro + Vue

ระบบจัดการสต็อคของชำร่วย พัฒนาด้วย Astro Framework และ Vue.js

## 🚀 โครงสร้างโปรเจกต์

```
src/
├── components/
│   ├── common/           # Components ใช้ร่วมกัน
│   │   ├── Navbar.vue    # เมนูบาร์
│   │   ├── Modal.vue     # Modal กลาง
│   │   └── Toast.vue     # แจ้งเตือน
│   │
│   ├── stock/            # หน้าจัดการสต็อค
│   │   ├── StockDashboard.vue
│   │   ├── ItemCard.vue
│   │   ├── ItemRow.vue
│   │   ├── types.ts
│   │   └── modals/
│   │       ├── AddItemModal.vue
│   │       ├── EditItemModal.vue
│   │       └── ActionModal.vue
│   │
│   ├── history/          # หน้าประวัติ
│   │   └── HistoryTable.vue
│   │
│   └── editor/           # หน้า Layout Editor
│       ├── EditorCanvas.vue
│       ├── CanvasItem.vue
│       └── types.ts
│
├── layouts/
│   └── MainLayout.astro  # Layout หลัก
│
├── lib/
│   └── supabase.ts       # Supabase client
│
└── pages/
    ├── index.astro       # หน้าแรก (Stock)
    ├── history.astro     # หน้าประวัติ
    └── editor.astro      # หน้า Layout Editor
```

## 📦 การติดตั้ง

```bash
# ติดตั้ง dependencies
npm install

# รัน development server
npm run dev

# build สำหรับ production
npm run build

# preview build
npm run preview
```

## ⚙️ Environment Variables

สร้างไฟล์ `.env` จาก `.env.example`:

```bash
cp .env.example .env
```

ตั้งค่า Environment Variables:

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 🌐 Deploy บน Vercel

1. Push โค้ดขึ้น GitHub
2. เชื่อมต่อ Vercel กับ repository
3. ตั้งค่า Environment Variables บน Vercel:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

## 🛠️ Tech Stack

- **Framework:** [Astro](https://astro.build/) v4
- **UI Library:** [Vue.js](https://vuejs.org/) v3
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) v3
- **Backend:** [Supabase](https://supabase.com/)
- **Icons:** [Font Awesome](https://fontawesome.com/)

## 📝 Features

### หน้าหลัก (Stock)
- ✅ ดูรายการสินค้าแบบ Grid/List
- ✅ ค้นหาสินค้า
- ✅ เพิ่ม/แก้ไข/ลบสินค้า (Admin)
- ✅ เบิก/เติมสต็อค
- ✅ อัปโหลดรูปภาพ

### หน้าประวัติ (History)
- ✅ ดูประวัติการทำรายการ
- ✅ กรองตามเดือน/สินค้า/สาขา
- ✅ Pagination
- ✅ Export CSV

### หน้า Layout Editor
- ✅ Drag & Drop วัตถุ
- ✅ Resize/Rotate
- ✅ Zoom In/Out
- ✅ บันทึกตำแหน่ง
- ✅ Guest Mode (View Only)

## 🔐 Authentication

ระบบใช้ Supabase Auth สำหรับการเข้าสู่ระบบ:
- Guest สามารถดูข้อมูลได้
- Admin เท่านั้นที่แก้ไขข้อมูลได้
