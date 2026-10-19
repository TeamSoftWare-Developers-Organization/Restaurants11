# 🍽️ Restaurants11 — Smart Restaurant Management & POS System

[![Next.js](https://img.shields.io/badge/Next.js-16.1.5-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
[![Electron](https://img.shields.io/badge/Electron-Desktop_Suite-47848F?logo=electron)](https://www.electronjs.org/)
[![Bun](https://img.shields.io/badge/Bun-1.4+-black?logo=bun)](https://bun.sh/)
[![Django Ninja](https://img.shields.io/badge/Django_Ninja-REST_API-092E20?logo=django)](https://django-ninja.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Ready-336791?logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Responsive-06B6D4?logo=tailwind-css)](https://tailwindcss.com/)
[![TensorFlow](https://img.shields.io/badge/AI_Biometrics-TensorFlow_CNN-FF6F00?logo=tensorflow)](https://tensorflow.org/)
[![ZATCA Compliant](https://img.shields.io/badge/E--Invoicing-ZATCA_Phase_2-008080)](https://zatca.gov.sa/)
[![License](https://img.shields.io/badge/License-TeamSoftWare-orange.svg)](#license)

A modern, cloud-ready and standalone desktop-capable Restaurant Enterprise Resource Planning (ERP) and Point of Sale (POS) system. Powered by **Artificial Intelligence & Machine Learning** for biometric attendance, hardware scanners, intelligent market basket analysis, stock depletion forecasting, cashier fraud detection, kitchen synchronized firing (KDS), reservation no-show prediction, menu engineering matrices, one-click automated procurement, and an exclusive **SuperDev Portal** for hardware-locked lifetime licensing and automated PostgreSQL database setup.

---

## 🌐 Language Navigation / دليل اللغات
- [English Documentation](#-english-overview)
- [النسخة العربية (Arabic Documentation)](#-نظام-إدارة-المطاعم-المتكامل-الذكي-باللغة-العربية)

---

## 🌟 English Overview

### 💡 Key Modules & Capabilities

#### 1. ⚡ High-Performance Point of Sale (POS) & Checkout Engine
- **Ergonomic, Touch-Optimized Cashier Bar:** Ultra-compact, fast layout for POS cashiers with unified responsive heights and keyboard navigation.
- **Instant Payment Modalities:** One-touch buttons for Cash (`نقدي`), Card/Mada (`بطاقة`), and Credit/Deferred (`آجل`) payments.
- **Hold Orders & Fast Invoice Viewer:** Side-by-side quick buttons for parking pending tickets (`طلب معلق`) and instantly previewing/printing thermal invoices.
- **Inline Shift & Expense Quick-Actions:** Direct inline links to register on-the-fly shift expenses (`+ تسجيل مصروف`) or initiate shift handover/closing (`إغلاق الوردية`).
- **Barcode & Fast Scan Engine:** Automatic barcode scanning for retail packs and menu items with instant cart incrementation.
- **Smart Recommendations (Market Basket Analysis):** On-the-fly cross-selling suggestions based on transaction history and item co-occurrence matrices.
- **Multi-Order Workflow:** Comprehensive routing for **Dine-in (صالة)** with table management, **Takeaway (سفري)**, and **Delivery (توصيل)**.
- **Standardized Currency:** Standardized Libyan Dinar (`LYD` / `د.ل`) across all financial calculations.

#### 2. ⚡ SuperDev Suite & Automated PostgreSQL Database Provisioning (Zafer & Ayoub Exclusive)
- **1-Click Automated PostgreSQL Setup (`/core/license/superdev/auto-setup-postgres/`):**
  - When PostgreSQL server is installed on the client machine, a single button click connects to the DBMS, creates the `restaurant_db` UTF8 database, updates `.env`, applies all Django migrations, and verifies admin credentials automatically.
  - No need to launch `psql`, pgAdmin, or run manual terminal commands.
- **Hardware-Locked Machine ID Licensing:**
  - Prevents unauthorized cloning by calculating a cryptographic hardware footprint (`Machine ID`) based on MAC and motherboard serials.
  - Offline mathematical HMAC-SHA256 lifetime product key generation and activation.
- **Strict Multi-Layer Device Authorization:**
  - The SuperDev button, tab, and database provisioning tools are strictly bound to **Zafer's and Ayoub's authorized personal hardware** (`E165-594A-81A8-FF6F` + paired tokens).
  - Completely invisible and blocked from all client terminals and standard admin accounts.
  - Secret developer device pairing via shortcut (`Ctrl + Shift + Alt + D` or 5-click header trigger) with master passcode verification.

#### 3. 🖥️ Standalone Desktop Suite (Electron .exe & Silent Launcher)
- **Native Windows Desktop Installer (.exe):** Built with Electron and NSIS for Windows 10/11 64-bit with desktop shortcuts and system tray control.
- **One-Click Silent System Launcher:** `run_system.bat` and `launch_hidden.vbs` start both frontend and backend seamlessly in the background.
- **Safe Browser Experience:** Clean, standalone web interface with unnecessary browser prompts and PWA installation pills completely removed for a cleaner workflow.

#### 4. 🤖 AI & Machine Learning Suite
- **👆 Biometric Attendance & Hardware Scanner Bridge:**
  - **OpenCV & CLAHE Preprocessing:** Cleans raw scanner inputs, crops regions of interest, resizes to $128 \times 128$, and applies *Contrast Limited Adaptive Histogram Equalization*.
  - **TensorFlow CNN Embeddings:** Maps fingerprint ridge structures into 128-dimensional embedding vectors for instant cosine similarity matching.
  - **Hardware Bridge:** Native serial and USB integration with ZKTeco desktop readers (ZK4500, ZK7500, ZK9500) and optical serial sensors (AS608, R307, R503).
- **📈 AI Stock Depletion & Demand Forecasting:** Dynamic consumption analysis using linear regression and rolling averages. Generates predictive depletion timelines (e.g., "Ingredient X will run out in 3 days").
- **🛒 Market Basket Analysis (Cross-Selling Engine):** Association rule mining on past orders to identify correlated purchases (e.g., Burger + Fries + Drink).
- **🛡️ AI Financial Fraud & Cash Anomaly Detector:** Automated risk scoring for cashier shifts evaluating cash variances, abnormal discount ratios, and excessive order cancellations.
- **🍳 AI Kitchen Intelligence & Synchronized Dish Firing:** Dynamic preparation time estimation based on category base times and real-time kitchen backlog load (`sync_order_firing`) ensuring items finish and exit together.
- **📅 AI Reservation No-Show Guard:** Mathematical risk model evaluating Lead Time, Party Size, Peak Hours, and Customer History:
  $$P(\text{No-Show}) = \sigma\left(w_1 \cdot \text{LeadTime} + w_2 \cdot \text{PartySize} + w_3 \cdot \text{PeakHour} + w_4 \cdot \text{CustomerHistory}\right)$$
- **📊 AI Menu Engineering Matrix (BCG Matrix Analysis):** Categorizes dishes into Stars (نجوم), Puzzles (ألغاز), Plowhorses (أحصنة عمل), and Dogs (راكدة) based on profitability and popularity.
- **👥 AI Predictive Staff Rostering & Labor Cost Optimizer:** Forecasts hourly order demand curves from historical sales, dynamically detects rush peaks, and calculates optimal chef and cashier staffing.
- **📊 AI Executive Operations Digest (`GET /api/core/ai/executive-brief/`):** Aggregates real-time mission-critical KPIs across 6 departments with instant one-click routing to urgent operational tasks.

#### 5. ⚡ One-Click Auto Purchase Orders (Procurement Automation)
- **Instant PO Generation:** Directly bridges stock depletion forecasts with the procurement engine, generating a draft Purchase Order (`PO-AUTO-{timestamp}`, status `PENDING`).
- **Interactive Preview Modal:** Review low-stock ingredients, suggested reorder quantities, unit costs, and total budget before committing.
- **One-Click Warehouse Receipt (`POST /purchases/{id}/receive/`):** Instantly posts draft purchase orders into inventory, increments stock, updates the weighted average unit cost, and adjusts supplier ledger balance.

#### 6. 🕒 Shift Variance, Cash Reconciliation & Overtime Management
- **Shift Reconciliation & Variance Auditing (`POST /api/payments/shifts/{shift_id}/close/`):**
  $$\text{Expected Cash} = \text{Opening Balance} + \text{Cash Sales} + \text{Cash In} - \text{Cash Out}$$
  $$\text{Variance} = \text{Actual Counted Cash} - \text{Expected Cash}$$
- **Automated status classification:** `BALANCED` (exact 100% match), `SURPLUS` (excess cash), or `DEFICIT` (cash shortage).
- **Itemized closing reconciliation receipt and printable shift handover digest.**

#### 7. 📦 Inventory, Stocktaking & Recipes
- **Real-Time Stock Audit:** Periodic physical count entry, automated variance calculation between actual and system stock, and one-click reconciliation.
- **Weighted Average Costing Engine:** On receiving goods, unit costs are dynamically re-evaluated atomically:
  $$\text{New Cost} = \frac{(\text{Current Qty} \times \text{Current Cost}) + (\text{New Qty} \times \text{Invoice Price})}{\text{Current Qty} + \text{New Qty}}$$
- **Dynamic Recipe Costing & Profit Margin Pricing:** Direct binding of menu meals to inventory raw ingredients, live production cost updates, and automated stock deduction on sales.

#### 8. 📱 Ultra-Responsive Architecture (PC, Tablets & Mobile Devices)
- **Fluid Multi-Device Layout:** Complete responsive redesign across all system pages (Dashboard, Salaries, POS, Employees, Inventory, Orders, Recipes, Settings).
- **Off-Canvas Mobile Drawer Sidebar:** Replaces desktop fixed sidebar on screens $< 1024\text{px}$ with a touch-friendly slide-over drawer, dark backdrop overlay, and auto-dismiss on link navigation.
- **Compact Mobile Top Bar:** Elegant sticky top navigation bar with restaurant branding, dark mode switcher, and hamburger menu button.
- **Zero Horizontal Overflow:** Strict layout boundaries, responsive tables with horizontal swipe (`overflow-x-auto`), and responsive trial banners preventing UI clipping on smartphones.

#### 9. 🧾 E-Invoicing & ZATCA Phase 2 Compliance
- **Customizable Invoices:** Visual templates for Sales Invoices, Purchase Invoices, and Return Invoices with live preview.
- **ZATCA TLV QR Codes:** Base64-encoded TLV QR codes complying with electronic billing regulations.
- **A4 & Thermal 80mm Layouts:** Print-ready formatting for thermal roll printers and standard A4 sheets.

---

## 🛠️ Tech Stack

### Frontend Architecture
- **Framework:** [Next.js](https://nextjs.org/) 16.x (App Router, Turbopack, React 19)
- **Desktop Runtime:** [Electron](https://www.electronjs.org/) 35.x & Electron Builder
- **Package Manager:** [Bun](https://bun.sh/) (Fast runtime & package manager)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Modern Grid/Flexbox, Dark & Light Mode tokens)
- **State Management:** Zustand with selective persistent storage
- **Icons:** Lucide React
- **HTTP Client:** Axios with automated JWT refresh and SuperDev device verification interceptors

### Backend & AI Architecture
- **Framework:** [Django](https://www.djangoproject.com/) 5.x / 6.x
- **API Engine:** [Django Ninja](https://django-ninja.dev/) (High-speed typed OpenAPI/Swagger)
- **Authentication:** Django Ninja JWT (JSON Web Tokens)
- **AI & Computer Vision:** OpenCV (`opencv-python-headless`), TensorFlow / Keras, NumPy, Scikit-learn
- **Hardware Integration:** `pyzkfp` (ZKTeco USB SDK), `pyserial` (UART/COM)
- **Database:** PostgreSQL (Production / LAN Server) / SQLite (Fallback & Offline resilience)
- **Runtime:** Python 3.12+ / 3.13+

---

## 🚀 Installation & Quick Start

### 1. Django Backend Setup
```bash
# Navigate to the backend directory
cd restaurantsApi

# Create and activate virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start backend development server
python manage.py runserver 127.0.0.1:8000
```
- **API Base URL:** `http://127.0.0.1:8000/`
- **Interactive Swagger Docs:** `http://127.0.0.1:8000/api/docs`

---

### 2. Next.js Frontend Setup (with Bun)
```bash
# Navigate to the frontend directory
cd restaurant-frontend

# Install dependencies using Bun
bun install

# Start development server on port 3005
bun run dev

# Or build for production
bun run build
bun run start
```
- **Web Application URL:** `http://localhost:3005/`

---

### 3. Desktop Application & Electron Setup
```bash
# Root directory
cd ..

# Run Desktop in development mode
bun run desktop:dev

# Build Windows Executable (.exe Installer)
bun run desktop:dist
```

---

## 🔑 Demo & Operational Accounts (الحسابات التجريبية)

```bash
cd restaurantsApi
python manage.py seed_demo_users
```

| Role / الدور | Username | Password | Permissions & Coverage |
|---|---|---|---|
| **SuperDev Master (ظافر)** | `zafer` | `Password@123` | Exclusive SuperDev Portal, PostgreSQL Setup & License Generator |
| **SuperDev Master (أيوب)** | `ayoub` | `Password@123` | Exclusive SuperDev Portal, PostgreSQL Setup & License Generator |
| **System Administrator (مدير النظام)** | `admin` | `Password@123` | Full superuser access across all restaurant operations |
| **POS Cashier (كاشير نقطة البيع)** | `cashier1` | `Password@123` | POS, Orders, Tables, Reservations, Drawer |
| **Kitchen Chef & KDS (شيف المطبخ)** | `chef_kds` | `Password@123` | Kitchen Display System (KDS), Order status |
| **Dining Waiter (نادل الصالة)** | `waiter1` | `Password@123` | Table management, Dine-in ordering |
| **Inventory Manager (مسؤول المخزن والمشتريات)** | `inventory_mgr` | `Password@123` | Inventory, Stocktaking, Recipes, POs |

---
---

## 🇸🇦 نظام إدارة المطاعم المتكامل الذكي (باللغة العربية)

نظام سحابي ومكتبي متكامل ومتقدم لإدارة المنشآت والمطاعم ونقاط البيع السريعة، مدعوم بأحدث خوارزميات **الذكاء الاصطناعي (AI)** لتحليل البيانات، كشف الاحتيال، التنبؤ بالمخزون، توليد أوامر الشراء المؤتمتة، جدولة نزول الأطباق بالتزامن في المطبخ، حماية الحجوزات، وهندسة المنيو، مع دعم التشغيل المكتبي المستقل عبر **Electron**، والتهيئة التلقائية الفورية لقواعد بيانات **PostgreSQL** بنقرة واحدة، ومحرك ترخيص عتادي مشفر حصري للمطورين الفائقين **ظافر وأيوب (SuperDev)**.

---

### 🌟 المميزات والوحدات الرئيسية

#### 1. 🛒 نقطة البيع السريعة (POS) وشريط الكاشير الذكي
- **شريط دفع متناسق ومريح:** إعادة هيكلة منطقة الدفع والعمليات لتكون ذات ارتفاع موحد وشديدة السلاسة لشاشات اللمس وأجهزة الكاشير.
- **أزرار الدفع الفوري بنقرة واحدة:** أزرار سريعة ومميزة بصرياً للدفع **النقدي (`نقدي`)**، **البطاقات المصرفية (`بطاقة`)**، و**الدفع الآجل للمديونيات (`آجل`)**.
- **إدارة الطلبات المعلقة والفواتير السريعة:** زران متجاوران لحفظ الطلب كمعلق في ثوانٍ (`طلب معلق`) ومعاينة وطباعة الفاتورة الفورية (`عرض الفاتورة`).
- **إجراءات الوردية والمصروفات المباشرة:** روابط مدمجة أسفل السلة لتسجيل المصروفات النثرية الفورية (`+ تسجيل مصروف`) أو إغلاق وتسليم الوردية (`إغلاق الوردية`).
- **دعم الباركود الشامل:** قراءة ومسح باركود المنتجات والوجبات آلياً وإضافتها للسلة بضغطة زر.
- **اقتراحات سلة المشتريات بالذكاء الاصطناعي:** اقتراح منتجات مكملة للزبون أثناء تحضير الطلب بناءً على سجل الطلبات السابقة (Cross-Selling).
- **إدارة مسارات الطلبات المتعددة:** دعم كامل لطلبات **الصالة (Dine-in)** مع ربط الطاولات، **السفري (Takeaway)**، و**التوصيل (Delivery)**.
- **عملة موحدة:** اعتماد الدينار الليبي (`د.ل` / `LYD`) في جميع الفواتير والحسابات.

#### 2. ⚡ بوابة المطورين الفائقين والتهيئة التلقائية لقواعد بيانات PostgreSQL (SuperDev)
- **إنشاء وتهيئة PostgreSQL بنقرة زر واحدة (One-Click Auto-Setup):**
  - عند تثبيت خادم PostgreSQL على جهاز العميل، يقوم النظام تلقائياً وبضغطة زر واحدة بإنشاء قاعدة البيانات `restaurant_db`، تحديث ملف البيئة `.env`، تطبيق كافة الهجرات والجداول (Migrations)، والتحقق من حسابات النظام دون الحاجة لفتح أية طرفية أو أداة خارجية.
- **التحقق والحماية العتادية الصارمة (Hardware-Bound Security):**
  - زر وقسم SuperDev محجوب ومخفي تماماً عن كافة حواسيب العملاء وعن حساب المدير العام `admin`.
  - مقتصر حصرياً على جهاز **ظافر** (`E165-594A-81A8-FF6F`) وجهاز **أيوب** عبر فحص المعرف العتادي وتوكن الاعتماد المشفر.
  - إمكانية اعتماد أي جهاز جديد لظافر أو أيوب عبر اختصار لوحة المفاتيح السري (`Ctrl + Shift + Alt + D` أو 5 نقرات على عنوان الإعدادات) مع إدخال الرمز السري الفائق.
- **نظام التراخيص الدائم المشفر (Hardware-Locked Lifetime Licensing):**
  - توليد مفاتيح تفعيل دائمة مرتبطة بعتاد الجهاز الحقيقي للعميل اعتماداً على خوارزمية HMAC-SHA256 الرياضية بدون الحاجة لإنترنت.

#### 3. 🖥️ تطبيق سطح المكتب المستقل (Desktop Suite)
- **حزمة Electron رسمية (.exe):** ملف تثبيت مخصص لويندوز 10/11 بأعلى أداء وسرعة وصول.
- **مشغل صامت بنقرة واحدة:** ملفات `run_system.bat` و `launch_hidden.vbs` لتشغيل الباك إند والفرونت إند في الخلفية بضغطة واحدة.
- **تجربة تصفح نظيفة:** واجهة مستخدم نظيفة وخالية من الإشعارات الجانبية غير المرغوبة.

#### 4. 🤖 حزمة الذكاء الاصطناعي وتعلم الآلة (AI & ML)
- **👆 الحضور والانصراف بالبصمة البيومترية:**
  - معالجة صور البصمات بمرشحات **OpenCV & CLAHE** لتنقية التشويش والرطوبة.
  - استخراج متجهات الخصائص بدقة 128 بُعداً عبر شبكات **TensorFlow CNN** والمقارنة الفورية عبر Cosine Similarity.
  - جسر عتادي يربط أجهزة **ZKTeco USB** (ZK4500 / ZK7500 / ZK9500) وحساسات **Serial COM** (AS608 / R307 / R503).
- **📈 التنبؤ باستهلاك المخزون (AI Stock Forecasting):** تحليل معدلات استهلاك المواد الخام عبر الانحدار الخطي والمتوسط المتحرك وتنبيهات مسبقة بنفاد المواد.
- **🛒 تحليل سلة المشتريات (Market Basket Analysis):** استنتاج الوجبات المترابطة آلياً وعرضها في كرت تفاعلي بشاشة الكاشير لزيادة متوسط قيمة الفاتورة.
- **🛡️ كشف التلاعب المالي وعجز الخزينة (AI Fraud Detection):** تقييم ذكي لمخاطر الورديات بناءً على الفروقات النقدية، نسب الخصومات غير الطبيعية، ومعدل إلغاء الطلبات المشبوه.
- **🍳 ذكاء المطبخ والجدولة المتزامنة للأطباق (Synchronized Firing KDS):** تقدير وقت التحضير الفعلي لكل صنف وجدولة وقت بدء الطهي لتنتهي جميع الأطباق وتخرج ساخنة في اللحظة نفسها.
- **📅 حارس الحجوزات الذكي (AI No-Show Guard):** حساب احتمالية تخلف الضيوف عن الحضور لحظياً واقتراح تفعيل الحجز المزدوج الذكي لتفادي بقاء الطاولات فارغة.
- **📊 مصفوفة هندسة المنيو والربحية (AI Menu Engineering Matrix):** تقسيم الأطباق وفق مصفوفة بوسطن الرباعية (نجوم، ألغاز، أحصنة عمل، وأصناف راكدة).
- **👥 الجدولة الذكية للورديات وتكلفة العمالة (AI Predictive Staff Rostering):** التنبؤ بالطلب لكل ساعة وتوليد جدول ورديات الطهاة والكاشيرات تلقائياً لتقليل تكلفة العمالة.
- **📊 الموجز التنفيذي الذكي للإدارة (AI Executive Operations Digest):** تجميع المؤشرات الحرجة من 6 محاور تشغيلية رئيسية مع أزرار توجيه فوري للمهام الحرجة بنقرة واحدة.

#### 5. ⚡ الأتمتة التلقائية لأوامر الشراء (One-Click Auto Purchase Orders)
- **توليد مسودة أمر الشراء بنقرة واحدة:** ربط تنبيهات المخزون مباشرة بنظام المشتريات لتوليد فاتورة شراء مسودة (`PO-AUTO-{timestamp}`) بالكميات المقترحة وتوجيهها للمورد الافتراضي.
- **الاستلام والترحيل الفوري للمخزن (`POST /purchases/{id}/receive/`):** اعتماد الفاتورة وترحيل الكميات فورياً للمخزون، وتحديث متوسط التكلفة وحساب المورد بنقرة واحدة.

#### 6. 🕒 احتساب فروقات الوردية والمطابقة النقدية والعمل الإضافي (Shift Variance & Overtime)
- **محرك تسوية الوردية الدقيق (`POST /api/payments/shifts/{shift_id}/close/`):**
  $$\text{الفارق (Variance)} = \text{المبلغ الفعلي المعدود في الخزينة} - \text{النقدية المتوقعة}$$
  - تصنيف الحالة آلياً: `BALANCED` (مطابق 100%)، `SURPLUS` (فائض نقدي بالدرج)، أو `DEFICIT` (عجز نقدي).
  - إصدار تقرير تسوية إغلاق تفصيلي وإيصال مطابقة قابل للطباعة مباشرة.
- **نافذة إغلاق الوردية الذكية (`CloseShiftModal.tsx`):** حساب الفارق مباشرة أثناء كتابة المبلغ المعدود، تمييز لوني ديناميكي، تسجيل الملاحظات وطباعة ملخص الاستلام والتسليم.

#### 7. 📦 المخزون، الجرد، والمشتريات
- **جرد المنتجات والمخزون الحي:** واجهة متخصصة لإجراء الجرد الفعلي للمنتجات، مقارنة الرصيد الدفتري بالفعلي، واحتساب الفروقات والتسوية بنقرة واحدة.
- **محرك متوسط التكلفة المرجح (Weighted Average Cost):** إعادة احتساب تكلفة الوحدة تلقائياً فور استلام البضاعة.
- **هندسة الوصفات وتكاليف الوجبات:** ربط الوجبات بالمواد الخام، وحساب التكلفة اللحظي، والخصم التلقائي للمخزون فور البيع.

#### 8. 📱 تصميم متجاوب فائق المرونة لكافة الشاشات (الهواتف الذكية، الأجهزة اللوحية، والحواسيب)
- **توافق كامل مع كافة الأجهزة (Full Responsiveness):** إعادة هيكلة مرنة لجميع صفحات النظام (لوحة التحكم، المرتبات، الكاشير، الموظفين، المخزون، الطلبات، الوصفات، والإعدادات).
- **قائمة جانبية منزلقة للأجهزة المحمولة (Off-Canvas Mobile Drawer):** إخفاء القائمة الثابتة تلقائياً على الشاشات التي يقل عرضها عن 1024 بكسل واستبدالها بدرج جانبي سلس مع طبقة تعتيم ضبابية خلفية (Backdrop Overlay) وإغلاق فوري عند الضغط على أي رابط.
- **شريط تنقل علوي مدمج للهواتف (Mobile Top Bar):** شريط علوي أنيق يحتوي على شعار واسم المطعم، زر التحويل للوضع الليلي، وزر القائمة (Hamburger Menu).
- **منع التمدد الأفقي للشاشات (Zero Overflow):** ضبط دقيق لجميع الجداول وتأطيرها بخاصية التمرير الأفقي السلس (`overflow-x-auto`)، مع جعل شريط التنبيه التجريبي يتكيف بمرونة مع أصغر شاشات الهواتف.

#### 9. 🧾 الفوترة الإلكترونية وتوافق ZATCA المرحلة الثانية
- **نماذج فواتير قابلة للتخصيص:** تصاميم عصرية لفواتير المبيعات، المشتريات، والمرتجعات مع معاينة حية ومباشرة.
- **توليد رمز الاستجابة السريعة (ZATCA TLV Base64 QR Code):** تشفير بيانات الفاتورة وفق المعايير الرسمية.
- **خيارات الطباعة:** دعم مقاسات الورق A4 وإيصالات الرول الحراري 80mm.

---

## 📄 الترخيص (License)
هذا المشروع مطوّر ومملوك بواسطة **TeamSoftWare Developers Organization** لخدمة حلول إدارة المطاعم والضيافة.
All rights reserved © 2026.
