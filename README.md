# 🍽️ Restaurants11 — Smart Restaurant Management & POS System

[![Next.js](https://img.shields.io/badge/Next.js-16.1.5-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
[![Django Ninja](https://img.shields.io/badge/Django_Ninja-REST_API-092E20?logo=django)](https://django-ninja.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Responsive-06B6D4?logo=tailwind-css)](https://tailwindcss.com/)
[![TensorFlow](https://img.shields.io/badge/AI_Biometrics-TensorFlow_CNN-FF6F00?logo=tensorflow)](https://tensorflow.org/)
[![ZATCA Compliant](https://img.shields.io/badge/E--Invoicing-ZATCA_Phase_2-008080)](https://zatca.gov.sa/)
[![License](https://img.shields.io/badge/License-TeamSoftWare-orange.svg)](#license)

A modern, cloud-ready, end-to-end Restaurant Enterprise Resource Planning (ERP) and Point of Sale (POS) system. Powered by **Artificial Intelligence (TensorFlow, OpenCV & Machine Learning)** for biometric attendance, hardware scanners, intelligent market basket analysis, stock depletion forecasting, and cashier fraud detection. Designed with high-performance reactive APIs built with **Django Ninja** and a responsive **Next.js (App Router, React 19 & Turbopack)** client.

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

#### 3. 🕒 Shift Customization & Overtime Management
- **Shift Scheduling & Allocation:** Create and configure shifts with custom working hours, roles, and shift templates.
- **Extra Duties & Overtime Tracking:** Dedicated logging for additional tasks (أعمال إضافية), extra hours worked, and automated overtime compensation calculations.
- **Cashier Counter Control:** Floating opening balance, mid-shift operational expenses logging, closing drawer count, and variance auditing.
- **Responsive Modals & Toast System:** Modern, mobile-responsive dialogs with keyboard accessibility (Escape key, outside click), smooth animations, and custom non-blocking Toast alerts.

#### 4. 📦 Inventory, Stocktaking & Procurement
- **Real-Time Stock Audit (جرد المنتجات والمخزون):** Periodic physical count entry, automated variance calculation between actual and system stock, and one-click reconciliation.
- **Product & Ingredient Catalog:** Multi-unit conversion support (grams, milliliters, kilograms, pieces) with product image upload and thumbnail previews.
- **Suppliers & Purchase Invoices (فواتير المشتريات):** Register supplier bills, track credit/debit balances, and manage purchase returns.
- **Weighted Average Costing Engine (متوسط التكلفة المرجح):** On receiving goods (`RECEIVED`), unit costs are dynamically re-evaluated atomically:
  $$\text{New Cost} = \frac{(\text{Current Qty} \times \text{Current Cost}) + (\text{New Qty} \times \text{Invoice Price})}{\text{Current Qty} + \text{New Qty}}$$

#### 5. 🍲 Dynamic Recipe Costing & Profit Margin Pricing
- **Recipe Assembly:** Direct binding of menu meals to inventory raw ingredients.
- **Live Recipe Cost:** Automatic recalculation of meal production cost whenever ingredient procurement prices change.
- **Margin Estimator:** Pre-configured and custom profit margins (+30%, +50%, +100%) with instant price update application.
- **Automated Stock Depletion:** Selling a meal through POS automatically deducts raw ingredient portions from stock.

#### 6. 🧾 E-Invoicing & ZATCA Phase 2 Compliance
- **Customizable Invoices:** Visual templates for Sales Invoices, Purchase Invoices, and Return Invoices with live preview.
- **ZATCA TLV QR Codes:** Base64-encoded TLV (Tag-Length-Value) QR code generation complying with electronic billing regulations (Seller Name, VAT Registration, Timestamp, Invoice Total, VAT Total).
- **A4 & Thermal 80mm Layouts:** Print-ready formatting for thermal roll printers and standard office A4 sheets.

#### 7. 🪑 Floorplan, Tables & Reservation Management
- **Visual Dining Area:** Real-time visual status of dining tables (Available, Busy, Reserved).
- **Reservation Scheduling:** Advance table booking with customer details, guest count, and direct conversion to POS orders.

#### 8. 💰 Treasury, Expenses, Cashflows & Payroll
- **Treasury Ledger:** Complete audit trail of cash drawers, safe transfers, bank deposits, and daily collections.
- **Operational Expense Registry:** Categorized expenses (utilities, cleaning, maintenance, emergency repairs).
- **Payroll & Advance Loans (السلف والمرتبات):** Employee salary profiles, advances deductions, and net monthly payout logging.

#### 9. 🔐 Role-Based Access Control (RBAC) & Full Responsiveness
- **Granular Permissions:** Strict role segregation (Admin, Cashier, Waiter, Kitchen Chef, Inventory Manager).
- **Dynamic Adaptive Sidebar:** Automatically filters inaccessible pages and expands smoothly across all screen widths.
- **Mobile First & Dark Mode:** Optimized layouts for smartphones, tablets, and widescreen touch terminals.

---

## 🛠️ Tech Stack

### Frontend Architecture
- **Framework:** [Next.js](https://nextjs.org/) 16.x (App Router, Turbopack, React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Modern Grid/Flexbox, Dark Mode variables)
- **State Management:** Zustand with selective persistent storage
- **Icons:** Lucide React
- **HTTP Client:** Axios with automated JWT refresh interceptors

### Backend & AI Architecture
- **Framework:** [Django](https://www.djangoproject.com/) 5.x / 6.x
- **API Engine:** [Django Ninja](https://django-ninja.dev/) & Ninja Extra (High-speed typed OpenAPI/Swagger)
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

### 2. Next.js Frontend Setup
```bash
# Navigate to the frontend directory
cd restaurant-frontend

# Install dependencies
npm install

# Start development server (Default Port 3005)
npm run dev

# Or build for production
npm run build
npm start
```
- **Web Application URL:** `http://localhost:3005/` (or configured port)

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

## 🔑 Default Credentials

| Role | Username / Email | Password |
|---|---|---|
| **System Administrator** | `admin` or `admin@example.com` | `admin` |
| **Cashier / Staff** | `Ali451` | `123` |

---
---

## 🇸🇦 نظام إدارة المطاعم المتكامل الذكي (باللغة العربية)

نظام سحابي متكامل ومتقدم لإدارة المنشآت والمطاعم ونقاط البيع السريعة، مدعوم بأحدث خوارزميات **الذكاء الاصطناعي (AI)** لتحليل البيانات، كشف الاحتيال، التنبؤ بالمخزون، والبصمة البيومترية المادية، ومبني بأعلى معايير السرعة والأداء باستخدام **Next.js 16 (App Router & React 19)** و **Django Ninja**.

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

#### 3. 🕒 إدارة وتخصيص الورديات والعمل الإضافي (Shifts & Overtime)
- **جدولة الورديات:** إنشاء قوالب الورديات وتعيين الموظفين ومواعيد العمل بدقة.
- **الأعمال الإضافية وحساب تكلفة الأوفر تايم:** تسجيل المهام الإضافية (Extra Duties)، ساعات العمل الإضافي، وحساب التكلفة المستحقة آلياً.
- **إدارة عهدة الكاشير:** تسجيل الرصيد الافتتاحي (Float)، تسجيل مصاريف الوردية التشغيلية، والرصيد الختامي ومطابقة العجز والفائض.
- **نوافذ منبثقة متجاوبة ونظام إشعارات مخصص:** نوافذ مودال (Modal) عصرية متجاوبة مع الهواتف، تدعم زر Escape والإغلاق الذكي، واستبدال رسائل التنبيه الافتراضية بنظام Toast Notifications مريح.

#### 4. 📦 المخزون، الجرد، والمشتريات
- **جرد المنتجات والمخزون الحي:** واجهة متخصصة لإجراء الجرد الفعلي للمنتجات، مقارنة الرصيد الدفتري بالفعلي، واحتساب الفروقات والتسوية بنقرة واحدة.
- **دليل المواد والمنتجات:** دعم وحدات القياس المتعددة (جرام، مليلتر، كجم، قطعة) ورفع صور المنتجات ومعاينتها.
- **الموردين وفواتير الشراء:** تسجيل فواتير التوريد، متابعة ديون ومستحقات الموردين، وإصدار مرتجعات الشراء.
- **محرك متوسط التكلفة المرجح (Weighted Average Cost):** إعادة احتساب تكلفة الوحدة تلقائياً داخل معاملات ذرية آمنة (Atomic Transactions) فور استلام البضاعة.

#### 5. 🍲 هندسة الوصفات وتكاليف الوجبات وهوامش الربح
- **ربط الوجبات بالمكونات:** ربط كل طبق بالمواد الخام المستخدمة بدقة.
- **حساب التكلفة اللحظي:** تحديث تلقائي لتكلفة الوجبة فور تغير أسعار شراء المكونات من الموردين.
- **محدد هامش الربح الذكي:** اقتراح هوامش ربح (+30%، +50%، +100%) وتحديث أسعار البيع بنقرة واحدة.
- **الخصم التلقائي للمخزون:** خصم نسب المكونات من المستودع تلقائياً عند تنفيذ الطلب في الكاشير.

#### 6. 🧾 الفوترة الإلكترونية وتوافق ZATCA المرحلة الثانية
- **نماذج فواتير قابلة للتخصيص:** تصاميم عصرية لفواتير المبيعات، المشتريات، والمرتجعات مع معاينة حية ومباشرة.
- **توليد رمز الاستجابة السريعة (ZATCA TLV Base64 QR Code):** تشفير بيانات الفاتورة وفق المعايير الرسمية (اسم المورد، الرقم الضريبي، الطابع الزمني، الإجمالي، والضريبة).
- **خيارات الطباعة:** دعم مقاسات الورق A4 وإيصالات الرول الحراري 80mm.

#### 7. 🪑 إدارة الصالة، الطاولات والحجوزات
- **خريطة الصالة التفاعلية:** متابعة لحظية لحالة الطاولات (متاحة، مشغولة، محجوزة).
- **جدول الحجوزات:** تسجيل مواعيد وصول الزبائن وتخصيص الطاولات وربطها بالطلب.

#### 8. 💰 الخزينة، المصروفات، والرواتب
- **حركة الخزينة العامة:** رصد دقيق للمقبوضات، المدفوعات، التحويلات، والإيداعات.
- **سجل المصروفات التشغيلية:** تصنيف فواتير الخدمات والصيانة والمشتريات الطارئة.
- **إدارة الرواتب والسلف:** تسجيل السلف والخصومات وحساب صافي المستحقات الشهرية للموظفين.

#### 9. 🔐 الصلاحيات والتصميم المتجاوب (RBAC & UI)
- **مصفوفة صلاحيات دقيقة:** تخصيص الوصول للوحدات حسب دور كل موظف (مدير، كاشير، ويتر، شيف، مسؤول مخزن).
- **قائمة جانبية ديناميكية (Sidebar):** تتكيف تلقائياً مع الشاشات وتخفي الروابط غير المصرح بها.
- **دعم الوضع الليلي (Dark Mode):** تصميم مريح للعين في بيئات العمل المختلفة.

---

## 📄 الترخيص (License)
هذا المشروع مطوّر ومملوك بواسطة **TeamSoftWare Developers Organization** لخدمة حلول إدارة المطاعم والضيافة.
