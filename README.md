# 🍽️ Restaurants11 — Smart Restaurant Management & POS System

[![Next.js](https://img.shields.io/badge/Next.js-16.1.5-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
[![Bun](https://img.shields.io/badge/Bun-1.4+-black?logo=bun)](https://bun.sh/)
[![Django Ninja](https://img.shields.io/badge/Django_Ninja-REST_API-092E20?logo=django)](https://django-ninja.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Responsive-06B6D4?logo=tailwind-css)](https://tailwindcss.com/)
[![TensorFlow](https://img.shields.io/badge/AI_Biometrics-TensorFlow_CNN-FF6F00?logo=tensorflow)](https://tensorflow.org/)
[![ZATCA Compliant](https://img.shields.io/badge/E--Invoicing-ZATCA_Phase_2-008080)](https://zatca.gov.sa/)
[![License](https://img.shields.io/badge/License-TeamSoftWare-orange.svg)](#license)

A modern, cloud-ready, end-to-end Restaurant Enterprise Resource Planning (ERP) and Point of Sale (POS) system. Powered by **Artificial Intelligence & Machine Learning** for biometric attendance, hardware scanners, intelligent market basket analysis, stock depletion forecasting, cashier fraud detection, kitchen synchronized firing (KDS), reservation no-show prediction, menu engineering matrices, and one-click automated procurement. Designed with high-performance reactive APIs built with **Django Ninja** and a responsive **Next.js (App Router, React 19 & Turbopack)** client powered by **Bun**.

---

## 🌐 Language Navigation / دليل اللغات
- [English Documentation](#-english-overview)
- [النسخة العربية (Arabic Documentation)](#-نظام-إدارة-المطاعم-المتكامل-الذكي-باللغة-العربية)

---

## 🌟 English Overview

### 💡 Key Modules & Capabilities

#### 1. ⚡ Modern Point of Sale (POS) & Barcode Engine
- **Touch-Friendly & Fluid UI:** High-efficiency cashier interface optimized for desktop touch monitors, tablets, and mobile devices with fast category switching and keyboard shortcuts.
- **Barcode Scanning & Fast Lookup:** Real-time barcode reading support for menu items, retail packaged products, and fast recipe triggers.
- **Smart Recommendations (Market Basket Analysis):** On-the-fly cross-selling suggestions based on transaction history and item co-occurrence matrices.
- **Multi-Order Workflow:** Full workflow support for **Dine-in (صالة)** with table management, **Takeaway (سفري)**, and **Delivery (توصيل)**.
- **Thermal Receipt & Digital Printing:** Instant 80mm thermal receipt generation, customizable restaurant headers/footers, and QR/barcode-ready formats.
- **Multi-Payment Support:** Cash payments, electronic payments (Card / Mada / Local cards), and mixed payment splits.
- **Standardized Currency:** Standardized Libyan Dinar (`LYD` / `د.ل`) across all financial calculations.

#### 2. 🤖 AI & Machine Learning Suite
- **👆 Biometric Attendance & Hardware Scanner Bridge:**
  - **OpenCV & CLAHE Preprocessing:** Cleans raw scanner inputs, crops regions of interest, resizes to $128 \times 128$, and applies *Contrast Limited Adaptive Histogram Equalization*.
  - **TensorFlow CNN Embeddings:** Maps fingerprint ridge structures into 128-dimensional embedding vectors for instant cosine similarity matching.
  - **Hardware Bridge:** Native serial and USB integration with ZKTeco desktop readers (ZK4500, ZK7500, ZK9500) and optical serial sensors (AS608, R307, R503).
- **📈 AI Stock Depletion & Demand Forecasting:**
  - Dynamic consumption analysis using linear regression and rolling averages.
  - Generates predictive depletion timelines (e.g., "Ingredient X will run out in 3 days") and triggers automated procurement alerts.
- **🛒 Market Basket Analysis (Cross-Selling Engine):**
  - Association rule mining on past orders to identify correlated purchases (e.g., Burger + Fries + Drink).
  - Live POS recommendation widget boosting average order value.
- **🛡️ AI Financial Fraud & Cash Anomaly Detector:**
  - Automated risk scoring for cashier shifts evaluating cash variances, abnormal discount ratios, and excessive order cancellations.
  - Real-time audit dashboard alerting managers to potential register discrepancies.
- **🍳 AI Kitchen Intelligence & Synchronized Dish Firing:**
  - Dynamic preparation time estimation based on category base times and real-time kitchen backlog load.
  - Synchronized firing scheduling (`sync_order_firing`) ensuring appetizers, main courses, and steaks finish simultaneously and leave the kitchen hot together.
- **📅 AI Reservation No-Show Guard:**
  - Mathematical risk model evaluating Lead Time, Party Size, Peak Hours, and Customer History:
    $$P(\text{No-Show}) = \sigma\left(w_1 \cdot \text{LeadTime} + w_2 \cdot \text{PartySize} + w_3 \cdot \text{PeakHour} + w_4 \cdot \text{CustomerHistory}\right)$$
  - Instant proactive risk scoring alerting staff to activate smart overbooking or prompt instant WhatsApp re-confirmation.
- **📊 AI Menu Engineering Matrix (BCG Matrix Analysis):**
  - Analyzes profitability and popularity by comparing true food cost against sales volume:
    - **Stars (نجوم):** High Margin, High Volume (Promote & protect).
    - **Puzzles (ألغاز):** High Margin, Low Volume (Feature prominently on POS).
    - **Plowhorses (أحصنة عمل):** Low Margin, High Volume (Optimize cost or slight price increase).
    - **Dogs (راكدة):** Low Margin, Low Volume (Recipe redesign or drop).
- **👥 AI Predictive Staff Rostering & Labor Cost Optimizer:**
  - Forecasts hourly order demand curves from historical sales, dynamically detects morning vs evening rush peaks, and calculates required chef and cashier staffing.
  - Automatically generates and assigns rosters to active personnel while calculating tangible labor cost savings compared to traditional flat schedules.
- **📊 AI Executive Operations Digest (`GET /api/core/ai/executive-brief/`):**
  - Aggregates real-time mission-critical KPIs across 6 departments (Critical Inventory, Suspicious Shifts, Kitchen Load, High-Risk Reservations, Live Sales & AI Savings).
  - Surfaces actionable executive directive cards with instant one-click routing to urgent operational tasks directly on the root `/` and `/dashboard` views.

#### 3. ⚡ One-Click Auto Purchase Orders (Procurement Automation)
- **Instant PO Generation:** Directly bridges stock depletion forecasts with the procurement engine. With a single click, generates a draft Purchase Order (`PO-AUTO-{timestamp}`, status `PENDING`) assigned to the default or selected supplier.
- **Interactive Preview Modal:** Review low-stock ingredients, suggested reorder quantities, unit costs, and total budget before committing.
- **One-Click Warehouse Receipt (`POST /purchases/{id}/receive/`):** Instantly posts draft purchase orders into inventory, increments stock, updates the weighted average unit cost, and adjusts supplier ledger balance.

#### 4. 🕒 Shift Variance, Cash Reconciliation & Overtime Management
- **Shift Reconciliation & Variance Auditing (`POST /api/payments/shifts/{shift_id}/close/`):**
  - Instant drawer reconciliation comparing counted cash against book expectations:
    $$\text{Expected Cash} = \text{Opening Balance} + \text{Cash Sales} + \text{Cash In} - \text{Cash Out}$$
    $$\text{Variance} = \text{Actual Counted Cash} - \text{Expected Cash}$$
  - Automated status classification: `BALANCED` (exact 100% match), `SURPLUS` (excess drawer cash), or `DEFICIT` (cash shortage).
  - Itemized closing reconciliation receipt and printable shift handover digest.
- **Interactive Close Shift Modal (`CloseShiftModal.tsx`):** Live variance calculation as cash is entered, color-coded status badges, notes recording, and direct summary printing.
- **Shift Scheduling & Allocation:** Create and configure shifts with custom working hours, roles, and shift templates.
- **Extra Duties & Overtime Tracking:** Dedicated logging for additional tasks (أعمال إضافية), extra hours worked, and automated overtime compensation calculations.

#### 5. 💻 Progressive Web App (PWA) & Desktop Standalone Mode
- **Native Desktop & Tablet Experience:** Installable PWA (`manifest.json`) running in borderless `standalone` window mode.
- **Branded App Icons & Assets:** High-resolution 192x192 and 512x512 maskable application icons.
- **Offline & Network Resiliency:** Safe local data caching with automatic synchronization.

#### 6. 📦 Inventory, Stocktaking & Procurement
- **Real-Time Stock Audit (جرد المنتجات والمخزون):** Periodic physical count entry, automated variance calculation between actual and system stock, and one-click reconciliation.
- **Product & Ingredient Catalog:** Multi-unit conversion support (grams, milliliters, kilograms, pieces) with product image upload and thumbnail previews.
- **Suppliers & Purchase Invoices (فواتير المشتريات):** Register supplier bills, track credit/debit balances, and manage purchase returns.
- **Weighted Average Costing Engine (متوسط التكلفة المرجح):** On receiving goods (`RECEIVED`), unit costs are dynamically re-evaluated atomically:
  $$\text{New Cost} = \frac{(\text{Current Qty} \times \text{Current Cost}) + (\text{New Qty} \times \text{Invoice Price})}{\text{Current Qty} + \text{New Qty}}$$

#### 6. 🍲 Dynamic Recipe Costing & Profit Margin Pricing
- **Recipe Assembly:** Direct binding of menu meals to inventory raw ingredients.
- **Live Recipe Cost:** Automatic recalculation of meal production cost whenever ingredient procurement prices change.
- **Margin Estimator:** Pre-configured and custom profit margins (+30%, +50%, +100%) with instant price update application.
- **Automated Stock Depletion:** Selling a meal through POS automatically deducts raw ingredient portions from stock.

#### 7. 🧾 E-Invoicing & ZATCA Phase 2 Compliance
- **Customizable Invoices:** Visual templates for Sales Invoices, Purchase Invoices, and Return Invoices with live preview.
- **ZATCA TLV QR Codes:** Base64-encoded TLV (Tag-Length-Value) QR code generation complying with electronic billing regulations (Seller Name, VAT Registration, Timestamp, Invoice Total, VAT Total).
- **A4 & Thermal 80mm Layouts:** Print-ready formatting for thermal roll printers and standard office A4 sheets.

#### 8. 🪑 Floorplan, Tables & Reservation Management
- **Visual Dining Area:** Real-time visual status of dining tables (Available, Busy, Reserved).
- **Reservation Scheduling:** Advance table booking with customer details, guest count, and direct conversion to POS orders.

#### 9. 💰 Treasury, Expenses, Cashflows & Payroll
- **Treasury Ledger:** Complete audit trail of cash drawers, safe transfers, bank deposits, and daily collections.
- **Operational Expense Registry:** Categorized expenses (utilities, cleaning, maintenance, emergency repairs).
- **Payroll & Advance Loans (السلف والمرتبات):** Employee salary profiles, advances deductions, and net monthly payout logging.

#### 10. 🔐 Role-Based Access Control (RBAC) & Theme Support
- **Granular Permissions:** Strict role segregation (Admin, Cashier, Waiter, Kitchen Chef, Inventory Manager).
- **Dynamic Adaptive Sidebar:** Automatically filters inaccessible pages and expands smoothly across all screen widths.
- **Flawless Light & Dark Modes:** Carefully styled for both day and night operational environments across all views.

---

## 🛠️ Tech Stack

### Frontend Architecture
- **Framework:** [Next.js](https://nextjs.org/) 16.x (App Router, Turbopack, React 19)
- **Package Manager:** [Bun](https://bun.sh/) (Fast runtime & package manager)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Modern Grid/Flexbox, Dark & Light Mode tokens)
- **State Management:** Zustand with selective persistent storage
- **Icons:** Lucide React
- **HTTP Client:** Axios with automated JWT refresh interceptors

### Backend & AI Architecture
- **Framework:** [Django](https://www.djangoproject.com/) 5.x / 6.x
- **API Engine:** [Django Ninja](https://django-ninja.dev/) (High-speed typed OpenAPI/Swagger)
- **Authentication:** Django Ninja JWT (JSON Web Tokens)
- **AI & Computer Vision:** OpenCV (`opencv-python-headless`), TensorFlow / Keras, NumPy, Scikit-learn
- **Hardware Integration:** `pyzkfp` (ZKTeco USB SDK), `pyserial` (UART/COM)
- **Database:** PostgreSQL (Production) / SQLite (Development & CI)
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

### 3. Hardware Fingerprint Scanner Bridge
```bash
cd restaurantsApi
.venv\Scripts\activate

# 1. ZKTeco USB Desktop Scanner (ZK4500 / ZK7500 / ZK9500):
python employees/services/hardware_scanner_bridge.py --mode zkteco

# 2. Optical Serial Sensor (AS608 / R307 / R503 on COM3):
python employees/services/hardware_scanner_bridge.py --mode serial --port COM3

# 3. Simulate fingerprint verification via image file:
python employees/services/hardware_scanner_bridge.py --mode test --image path/to/sample.png
```

---

## 🔑 Demo & Operational Accounts (الحسابات التجريبية)

Easily seed or reset all operational demo accounts using the built-in Django command:
```bash
python manage.py seed_demo_users
```

| Role / الدور | Username | Password | Permissions & Coverage |
|---|---|---|---|
| **System Administrator (مدير النظام)** | `admin` | `Password@123` | Full superuser access across all modules |
| **POS Cashier (كاشير نقطة البيع)** | `cashier1` | `Password@123` | POS, Orders, Tables, Reservations, Drawer |
| **Kitchen Chef & KDS (شيف المطبخ)** | `chef_kds` | `Password@123` | Kitchen Display System (KDS), Order status |
| **Dining Waiter (نادل الصالة)** | `waiter1` | `Password@123` | Table management, Dine-in ordering |
| **Inventory Manager (مسؤول المخزن والمشتريات)** | `inventory_mgr` | `Password@123` | Inventory, Stocktaking, Recipes, POs |


---
---

## 🇸🇦 نظام إدارة المطاعم المتكامل الذكي (باللغة العربية)

نظام سحابي متكامل ومتقدم لإدارة المنشآت والمطاعم ونقاط البيع السريعة، مدعوم بأحدث خوارزميات **الذكاء الاصطناعي (AI)** لتحليل البيانات، كشف الاحتيال، التنبؤ بالمخزون، توليد أوامر الشراء المؤتمتة، جدولة نزول الأطباق بالتزامن في المطبخ، حماية الحجوزات، وهندسة المنيو، ومبني بأعلى معايير السرعة والأداء باستخدام **Next.js 16 (App Router & React 19)**، حزمة **Bun**، و **Django Ninja**.

---

### 🌟 المميزات والوحدات الرئيسية

#### 1. 🛒 نقطة البيع السريعة (POS) والباركود الذكي
- **شاشة بيع متطورة للمس:** واجهة فائقة السلاسة تدعم أجهزة الكاشير اللمسية، الأجهزة اللوحية، والهواتف مع تصنيفات سريعة واختصارات لوحة المفاتيح.
- **دعم الباركود الشامل:** قراءة ومسح باركود المنتجات والوجبات آلياً وإضافتها للسلة بضغطة زر.
- **اقتراحات سلة المشتريات بالذكاء الاصطناعي:** اقتراح منتجات مكملة للزبون أثناء تحضير الطلب بناءً على سجل الطلبات السابقة (Cross-Selling).
- **إدارة مسارات الطلبات المتعددة:** دعم كامل لطلبات **الصالة (Dine-in)** مع ربط الطاولات، **السفري (Takeaway)**، و**التوصيل (Delivery)**.
- **طباعة الإيصالات الحرارية:** إيصالات 80mm فورية مع ترويسة مخصصة وتذييل وشعار المطعم.
- **دعم طرق الدفع المتعددة:** نقدي (كاش)، بطاقات مصرفية (مدى / بطاقات محلية)، وتقسيم الدفعات.
- **عملة موحدة:** اعتماد الدينار الليبي (`د.ل` / `LYD`) في جميع الفواتير والحسابات.

#### 2. 🤖 حزمة الذكاء الاصطناعي وتعلم الآلة (AI & ML)
- **👆 الحضور والانصراف بالبصمة البيومترية:**
  - معالجة صور البصمات بمرشحات **OpenCV & CLAHE** لتنقية التشويش والرطوبة.
  - استخراج متجهات الخصائص بدقة 128 بُعداً عبر شبكات **TensorFlow CNN** والمقارنة الفورية عبر Cosine Similarity.
  - جسر عتادي يربط أجهزة **ZKTeco USB** (ZK4500 / ZK7500 / ZK9500) وحساسات **Serial COM** (AS608 / R307 / R503).
- **📈 التنبؤ باستهلاك المخزون (AI Stock Forecasting):**
  - تحليل معدلات استهلاك المواد الخام عبر الانحدار الخطي والمتوسط المتحرك.
  - تنبيهات استباقية بالمواد المتوقع نفادها خلال أيام لتفادي توقف الإنتاج.
- **🛒 تحليل سلة المشتريات (Market Basket Analysis):**
  - استنتاج الوجبات المترابطة آلياً وعرضها في كرت تفاعلي بشاشة الكاشير لزيادة متوسط قيمة الفاتورة.
- **🛡️ كشف التلاعب المالي وعجز الخزينة (AI Fraud Detection):**
  - تقييم ذكي لمخاطر الورديات بناءً على الفروقات النقدية، نسب الخصومات غير الطبيعية، ومعدل إلغاء الطلبات المشبوه.
- **🍳 ذكاء المطبخ والجدولة المتزامنة للأطباق (Synchronized Firing KDS):**
  - تقدير وقت التحضير الفعلي لكل صنف بناءً على نوع الطبق وحمولة المطبخ الحالية (Kitchen Backlog Load).
  - جدولة وقت بدء الطهي لكل صنف في الفاتورة الواحدة لتنتهي جميع الأطباق وتخرج ساخنة في اللحظة نفسها.
- **📅 حارس الحجوزات الذكي (AI No-Show Guard):**
  - حساب احتمالية تخلف الضيوف عن الحضور لحظياً بناءً على فترة الحجز المسبقة، عدد الأفراد، وأوقات الذروة.
  - اقتراح تفعيل الحجز المزدوج الذكي (Overbooking) أو طلب التأكيد الفوري لتفادي بقاء الطاولات فارغة.
- **📊 مصفوفة هندسة المنيو والربحية (AI Menu Engineering Matrix):**
  - تقسيم جميع أطباق القائمة آلياً وفق مصفوفة بوسطن الرباعية (BCG): **نجوم (Stars)**، **ألغاز (Puzzles)**، **أحصنة عمل (Plowhorses)**، و**أصناف راكدة (Dogs)** بناءً على هامش الربح وشعبية المبيعات.
- **👥 الجدولة الذكية للورديات وتكلفة العمالة (AI Predictive Staff Rostering):**
  - التنبؤ بعدد الطلبات المتوقعة لكل ساعة بناءً على تاريخ المبيعات، وتوليد جدول ورديات الطهاة والكاشيرات تلقائياً لتقليل تكلفة العمالة ومنع الازدحام في أوقات الذروة واحتساب الوفر المالي المحقق.
- **📊 الموجز التنفيذي الذكي للإدارة (AI Executive Operations Digest):**
  - تجميع وسحب المؤشرات الحرجة اللحظية من 6 محاور تشغيلية رئيسية (المخزون المعرض للنفاد، الورديات المشبوهة، ضغط المطبخ، الحجوزات عالية المخاطر، والمبيعات والوفر المالي) عبر مسار `GET /api/core/ai/executive-brief/`.
  - شريط بطاقات علوي تنفيذي في لوحة التحكم `/` و `/dashboard` يقدم "ملخص تشغيل اليوم الذكي" مع أزرار توجيه فوري للمهام الحرجة بنقرة واحدة.

#### 3. ⚡ الأتمتة التلقائية لأوامر الشراء (One-Click Auto Purchase Orders)
- **توليد مسودة أمر الشراء بنقرة واحدة:** ربط تنبيهات المخزون مباشرة بنظام المشتريات لتوليد فاتورة شراء مسودة (`PO-AUTO-{timestamp}`) بالكميات المقترحة وتوجيهها للمورد الافتراضي.
- **نافذة المعاينة والتحكم:** مراجعة المواد الموشكة على النفاد، الرصيد الحالي، والكميات المقترحة مع إمكانية تعديل الكمية قبل الاعتماد.
- **الاستلام والترحيل الفوري للمخزن (`POST /purchases/{id}/receive/`):** اعتماد الفاتورة وترحيل الكميات فورياً للمخزون، وتحديث متوسط التكلفة وحساب المورد بنقرة واحدة.

#### 4. 🕒 احتساب فروقات الوردية والمطابقة النقدية والعمل الإضافي (Shift Variance & Overtime)
- **محرك تسوية الوردية الدقيق (`POST /api/payments/shifts/{shift_id}/close/`):**
  - معادلة النقدية المتوقعة دفترياً:
    $$\text{النقدية المتوقعة} = \text{الرصيد الافتتاحي} + \text{مبيعات الكاش} + \text{المقبوضات الإضافية} - \text{المصروفات}$$
    $$\text{الفارق (Variance)} = \text{المبلغ الفعلي المعدود في الخزينة} - \text{النقدية المتوقعة}$$
  - تصنيف الحالة آلياً: `BALANCED` (مطابق 100%)، `SURPLUS` (فائض نقدي بالدرج)، أو `DEFICIT` (عجز نقدي).
  - إصدار تقرير تسوية إغلاق تفصيلي وإيصال مطابقة قابل للطباعة مباشرة.
- **نافذة إغلاق الوردية الذكية (`CloseShiftModal.tsx`):** حساب الفارق مباشرة أثناء كتابة المبلغ المعدود، تمييز لوني ديناميكي (أخضر / زمردي / أحمر)، تسجيل الملاحظات وطباعة ملخص الاستلام والتسليم.
- **جدولة وتخصيص الورديات:** قوالب ورديات مرنة، ربط الكاشير بنقطة البيع، وحساب ساعات العمل الإضافي وتكلفتها آلياً.

#### 5. 💻 تطبيق الويب التقدمي (PWA) للعمل كبرنامج ديسكتوب
- **تثبيت مباشر كبرنامج سطح مكتب (Desktop PWA):** دعم التثبيت على أنظمة ويندوز، ماك، والأجهزة اللوحية عبر ملف `manifest.json` وتشغيل الواجهة في نافذة مستقلة `standalone` بدون متصفح.
- **أيقونات وهوية بصرية مخصصة:** أيقونات عالية الدقة (192x192 و 512x512) مع دعم العمل دون انقطاع.

#### 6. 📦 المخزون، الجرد، والمشتريات
- **جرد المنتجات والمخزون الحي:** واجهة متخصصة لإجراء الجرد الفعلي للمنتجات، مقارنة الرصيد الدفتري بالفعلي، واحتساب الفروقات والتسوية بنقرة واحدة.
- **دليل المواد والمنتجات:** دعم وحدات القياس المتعددة (جرام، مليلتر، كجم، قطعة) ورفع صور المنتجات ومعاينتها.
- **الموردين وفواتير الشراء:** تسجيل فواتير التوريد، متابعة ديون ومستحقات الموردين، وإصدار مرتجعات الشراء.
- **محرك متوسط التكلفة المرجح (Weighted Average Cost):** إعادة احتساب تكلفة الوحدة تلقائياً داخل معاملات ذرية آمنة (Atomic Transactions) فور استلام البضاعة.

#### 6. 🍲 هندسة الوصفات وتكاليف الوجبات وهوامش الربح
- **ربط الوجبات بالمكونات:** ربط كل طبق بالمواد الخام المستخدمة بدقة.
- **حساب التكلفة اللحظي:** تحديث تلقائي لتكلفة الوجبة فور تغير أسعار شراء المكونات من الموردين.
- **محدد هامش الربح الذكي:** اقتراح هوامش ربح (+30%، +50%، +100%) وتحديث أسعار البيع بنقرة واحدة.
- **الخصم التلقائي للمخزون:** خصم نسب المكونات من المستودع تلقائياً عند تنفيذ الطلب في الكاشير.

#### 7. 🧾 الفوترة الإلكترونية وتوافق ZATCA المرحلة الثانية
- **نماذج فواتير قابلة للتخصيص:** تصاميم عصرية لفواتير المبيعات، المشتريات، والمرتجعات مع معاينة حية ومباشرة.
- **توليد رمز الاستجابة السريعة (ZATCA TLV Base64 QR Code):** تشفير بيانات الفاتورة وفق المعايير الرسمية (اسم المورد، الرقم الضريبي، الطابع الزمني، الإجمالي، والضريبة).
- **خيارات الطباعة:** دعم مقاسات الورق A4 وإيصالات الرول الحراري 80mm.

#### 8. 🪑 إدارة الصالة، الطاولات والحجوزات
- **خريطة الصالة التفاعلية:** متابعة لحظية لحالة الطاولات (متاحة، مشغولة، محجوزة).
- **جدول الحجوزات:** تسجيل مواعيد وصول الزبائن وتخصيص الطاولات وربطها بالطلب.

#### 9. 💰 الخزينة، المصروفات، والرواتب
- **حركة الخزينة العامة:** رصد دقيق للمقبوضات، المدفوعات، التحويلات، والإيداعات.
- **سجل المصروفات التشغيلية:** تصنيف فواتير الخدمات والصيانة والمشتريات الطارئة.
- **إدارة الرواتب والسلف:** تسجيل السلف والخصومات وحساب صافي المستحقات الشهرية للموظفين.

#### 10. 🔐 الصلاحيات وتجربة المستخدم (RBAC & UI)
- **مصفوفة صلاحيات دقيقة:** تخصيص الوصول للوحدات حسب دور كل موظف (مدير، كاشير، ويتر، شيف، مسؤول مخزن).
- **قائمة جانبية ديناميكية (Sidebar):** تتكيف تلقائياً مع الشاشات وتخفي الروابط غير المصرح بها.
- **دعم متكامل للوضعين النهاري والليلي (Light & Dark Modes):** ألوان مريحة ومتباينة بدقة تناسب بيئات الإضاءة المختلفة طوال اليوم.

---

## 📄 الترخيص (License)
هذا المشروع مطوّر ومملوك بواسطة **TeamSoftWare Developers Organization** لخدمة حلول إدارة المطاعم والضيافة.
