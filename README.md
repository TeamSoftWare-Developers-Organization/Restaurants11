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

A modern, cloud-ready and standalone desktop-capable Restaurant Enterprise Resource Planning (ERP) and Point of Sale (POS) system. Powered by **Artificial Intelligence & Machine Learning** for biometric attendance, hardware scanners, intelligent market basket analysis, stock depletion forecasting, cashier fraud detection, kitchen synchronized firing (KDS), reservation no-show prediction, menu engineering matrices, one-click automated procurement, and an exclusive **SuperDev Portal** for hardware-locked lifetime licensing, wall-clock trial security, and automated PostgreSQL database setup.

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
- **Hold Orders & Fast Invoice Viewer:** Side-by-side quick buttons for parking pending tickets (`طلب معلق`) and instantly previewing/printing thermal invoices in a streamlined pop-up modal without leaving POS.
- **Expanded Items & Cart Workspace:** Optimized ergonomic layout maximizing item selection and cart area for high-volume checkout.
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
- **Central Biometric Terminal & Network Architecture Management:**
  - Network configuration for biometric hardware (Device Static IP, primary communication port 4370, daemon bridge 4444, ADMS push 8888, emergency backup 5003, and live socket connection diagnostics) is exclusively governed in Settings under SuperDev access.
  - Stored centrally in the backend database (`RestaurantSettings`), eliminating technical clutter from operational and employee modals.
- **Licensing Test Lab & Wall-Clock 1-Hour Trial Mode (تجربة لمدة ساعة كاملة بالوقت الفعلي المطلق):**
  - **Absolute Wall-Clock Calculation:** Built-in granular 1-hour trial ($60\text{ minutes} = 3600\text{ seconds}$) computed strictly from initial installation timestamp (`installed_at` UTC). The duration continues elapsing even if the computer or device is turned off, shut down, suspended, or sleeping.
  - **Anti-Tampering Clock Guard:** Detects any clock rollback or manual date tampering ($t < t_{\text{installed}}$) and immediately locks down the trial to prevent unauthorized extension.
  - **Instant Visibility & Sleep-Wakeup Synchronization:** Frontend utilizes `visibilitychange` and `focus` event listeners coupled with absolute target timestamps to immediately reflect real-world elapsed time and lock expired sessions upon laptop lid opening or waking from sleep.
  - **SuperDev Test Controls:** Instant 1-click launch of a new 1-hour trial, simulation of trial expiration to test the lock screen, and one-click restoration of permanent lifetime activation.

#### 3. 🖥️ Standalone Desktop Suite (Electron .exe & Silent Launcher)
- **Native Windows Desktop Installer (`dist/RestoERP Setup 1.0.0.exe`):** Pre-compiled 64-bit installer with desktop shortcuts, system tray controls, and seamless offline installation bundled directly in the repository.
- **Clean Frameless Interface & Custom Controls:** Desktop app operates in a clean, modern frameless window with native custom window controls (`ElectronWindowControls`), removing redundant menu bars and browser prompts.
- **Automated Dependency Setup (`install_system.bat`):** Automated installation script that checks for and installs Bun runtime, Python dependencies, and project requirements in one run.
- **Intelligent Dual-Mode API Routing (`api.ts`):** Automatically routes requests to local Django backend (`http://127.0.0.1:8000/api`) when running on localhost or inside Electron, while preserving cloud URLs (`restaurants11.onrender.com`) in production.
- **Enhanced CORS & Security Headers:** Explicit backend CORS support for custom developer headers (`X-SuperDev-Device-Token`, `X-Device-Machine-Id`) with 15-second request timeouts to prevent connection drops.
- **One-Click Silent System Launcher:** `run_system.bat` and `launch_hidden.vbs` start both frontend and backend seamlessly in the background.

#### 4. 🤖 AI & Machine Learning Suite
- **👆 Biometric Attendance & Ethernet Cable Hardware Bridge:**
  - **OpenCV & CLAHE Preprocessing:** Cleans raw scanner inputs, crops regions of interest, resizes to $128 \times 128$, and applies *Contrast Limited Adaptive Histogram Equalization*.
  - **TensorFlow CNN Embeddings:** Maps fingerprint ridge structures into 128-dimensional embedding vectors for instant cosine similarity matching.
  - **Dedicated Ethernet Cable Integration (Cable EtherNet / LAN):** USB cables have been phased out in favor of robust direct Ethernet Cable networking (RJ45 / TCP/IP) using the `pyzk` library for wall-mounted ZKTeco standalone attendance terminals.
  - **Multi-Port Communication & Failover Architecture:** Native support for key biometric ports with automatic fallback:
    - **Port 4370:** Standard ZKTeco standalone terminal protocol (Default).
    - **Port 4444:** Bridge daemon & listener service.
    - **Port 8888:** Cloud sync & ADMS Push SDK port.
    - **Port 5003:** Dedicated emergency backup / fallback port (منفذ احتياطي).
  - **Role-Based Biometric Access & Fraud Prevention:** Smartphone WebAuthn biometrics are restricted exclusively to Managers (`manager` / `admin`). Regular staff are required to authenticate through the verified physical Ethernet terminal on the restaurant's local area network.
  - **Granular Attendance Permissions:** Integrated `attendance` permission key in the RBAC matrix and sidebar navigation.
  - **Clean Employee Enrollment:** Technical network IP and port selectors removed from employee enrollment. HR and managers only enter the employee's PIN / Terminal User ID, utilizing central SuperDev network parameters.
  - **Dedicated Biometric Check-In Modal (`/attendance`):** Dedicated registration modal ("نافذة تسجيل الحضور بجهاز البصمة الشبكي") with active terminal status, fast Check-In / Check-Out toggles, optional employee selector, instant live punch, and bulk log sync.
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

#### 6. 🕒 Shift Variance, Cash Reconciliation, Overtime & Deficit Deduction
- **Shift Reconciliation & Variance Auditing (`POST /api/payments/shifts/{shift_id}/close/`):**
  $$\text{Expected Cash} = \text{Opening Balance} + \text{Cash Sales} + \text{Cash In} - \text{Cash Out}$$
  $$\text{Variance} = \text{Actual Counted Cash} - \text{Expected Cash}$$
- **Automated status classification:** `BALANCED` (exact 100% match), `SURPLUS` (excess cash), or `DEFICIT` (cash shortage).
- **Itemized closing reconciliation receipt and printable shift handover digest.**
- **Cash Deficit Deduction from Employee Salaries:**
  - Automated detection of closed shifts with negative variance/shortage during the month.
  - Dedicated deduction fields (`shortage_deduction` & `shortage_reason`) on salary slips and payroll payments.
  - Mandatory admin/manager credential verification before executing any absence or cash deficit deductions.
  - Auto-inclusion in treasury transaction records and printable salary payment vouchers.

#### 7. 💰 Dashboard Profit Margin Statement & Shift Deficit Settlement to Treasury
- **Profit Margin & COGS Real-Time Statement (`GET /api/payments/dashboard/profit-margin-and-deficits`):**
  - Instant breakdown of Total Sales, Cost of Goods Sold (COGS based on recipe raw ingredients), Gross Profit, Operating Expenses, Employee Payroll, and Net Operational Profit.
  - Live margin percentage computation and visual progression indicator.
- **Shift Shortage & Cash Deficit Auditing:**
  - Dedicated ledger tracking all closed shifts, expected cash in drawer vs. counted cash, detected cash shortages (عجز) or surpluses (فائض), and settlement status.
- **Direct Settlement & Treasury Transfer Engine:**
  - One-click shift shortage settlement to treasury transactions (`POST /api/payments/dashboard/settle-shift-deficit`).
  - One-click batch settlement for all pending shift deficits (`POST /api/payments/dashboard/settle-all-deficits`).
  - One-click operational profit transfer to main treasury with custom notes and live treasury balance verification (`POST /api/payments/dashboard/transfer-profit-to-treasury`).

#### 8. 👥 Attendance, Scheduled Shifts, Smart Search & Late Deductions
- **Admin-Defined Attendance Schedules, Late Penalties & Absence Deductions:**
  - Granular configuration for each employee and system-wide default policy: scheduled clock-in time (`work_start_time`), departure time (`work_end_time`), late grace period (`late_grace_period_minutes`), admin-defined late penalty value (`late_deduction_amount`), and admin-defined daily absence deduction value (`absence_deduction_amount`).
  - If an employee clocks in after the scheduled time (past grace period), the admin-specified late penalty is automatically applied.
  - If an employee is absent, the admin-specified daily absence deduction amount is automatically used in salary calculations.
  - Clear shift timings, late penalties, and absence deduction rates prominently displayed in employee directories and restaurant settings.
- **Real-Time Lateness Detection & Smart Attendance Search:**
  - Automated comparison of initial daily punch times against scheduled start hours plus grace window.
  - Live status badges: On-Time (`حضور في الموعد`), Late with exact delay minutes (`متأخر X دقيقة - خصم Y د.ل`), and Absent (`غائب`).
  - Integrated smart search bar within daily timesheets supporting keywords (`حاضر`, `متأخر`, `غائب`), role filters, names, and phone numbers.
- **Automated Late Deductions in Payroll & Admin Approval:**
  - Monthly attendance aggregation calculating total late days, total late minutes, and suggested late penalties.
  - Integrated deduction field on salary disbursement slips alongside absence and cash shortages.
  - Mandatory cryptographic Admin authentication whenever deductions are applied.
- **Comprehensive Attendance Monitoring & Tracking:**
  - Real-time attendance dashboard tracking `PRESENT`, `CHECKED_OUT`, and `ABSENT` statuses with overall attendance percentages.
  - Time-range and employee-specific filtering for attendance punches and timesheets.
  - Detailed working hours calculations, duration breakdown, and first-in/last-out logging.
  - Printable official attendance reports and timesheets by individual employee or all staff.

#### 9. 📦 Inventory, Stocktaking & Recipes
- **Recipe & Menu Item Ingredient Guard:** Enforced validation preventing menu item creation or recipe definition before registering underlying ingredients in inventory.
- **Barcode Engine for Raw Materials & Inventory Items:** Added barcode support to `Ingredient` models, indexed API lookup (`GET /api/inventory/ingredients/by-barcode/{barcode}/`), dedicated barcode badges, and instant dual search (by barcode or item name).
- **Real-Time Stock Audit:** Periodic physical count entry, automated variance calculation between actual and system stock, and one-click reconciliation.
- **Weighted Average Costing Engine:** On receiving goods, unit costs are dynamically re-evaluated atomically:
  $$\text{New Cost} = \frac{(\text{Current Qty} \times \text{Current Cost}) + (\text{New Qty} \times \text{Invoice Price})}{\text{Current Qty} + \text{New Qty}}$$
- **Dynamic Recipe Costing & Profit Margin Pricing:** Direct binding of menu meals to inventory raw ingredients, live production cost updates, and automated stock deduction on sales.

#### 10. 📱 Ultra-Responsive Architecture (PC, Tablets & Mobile Devices)
- **Fluid Multi-Device Layout:** Complete responsive redesign across all system pages (Dashboard, Salaries, POS, Employees, Inventory, Orders, Recipes, Settings).
- **RTL Sidebar Alignment:** Sidebar toggle and panel placement positioned ergonomically on the right side for native RTL Arabic workflows.
- **Monochrome Thermal Invoicing:** High-contrast pure black and white (Pure B&W) receipt template optimized for 80mm thermal receipt printers without grayscale artifacts.
- **Dynamic 1-Hour Wall-Clock Trial Engine & Live Second-by-Second Countdown:** Precision timer tracking remaining trial duration with real-time ticking down to the second (`⏳ 59 دقيقة و 42 ثانية`), automatically locking the entire interface upon expiration and prompting for the cryptographic product key.
- **Off-Canvas Mobile Drawer Sidebar:** Replaces desktop fixed sidebar on screens $< 1024\text{px}$ with a touch-friendly slide-over drawer, dark backdrop overlay, and auto-dismiss on link navigation.
- **Compact Mobile Top Bar:** Elegant sticky top navigation bar with restaurant branding, dark mode switcher, and hamburger menu button.
- **Zero Horizontal Overflow:** Strict layout boundaries, responsive tables with horizontal swipe (`overflow-x-auto`), and responsive trial banners preventing UI clipping on smartphones.

#### 11. 🧾 E-Invoicing & ZATCA Phase 2 Compliance
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
- **HTTP Client:** Axios with intelligent dual-mode base URL routing, CORS custom header support, and 15s timeout safeguards

### Backend & AI Architecture
- **Framework:** [Django](https://www.djangoproject.com/) 5.x / 6.x
- **API Engine:** [Django Ninja](https://django-ninja.dev/) (High-speed typed OpenAPI/Swagger)
- **Authentication:** Django Ninja JWT (JSON Web Tokens)
- **AI & Computer Vision:** OpenCV (`opencv-python-headless`), TensorFlow / Keras, NumPy, Scikit-learn
- **Hardware Integration:** `pyzk` (ZKTeco Ethernet LAN), `pyserial` (UART/COM)
- **Database:** PostgreSQL (Production / LAN Server) / SQLite (Fallback & Offline resilience)
- **Runtime:** Python 3.12+ / 3.13+

---

## 🚀 Installation & Quick Start

### 1. Automated Installation (Recommended for Windows)
```bash
# Run the automated installer script to verify Bun, install frontend & backend packages:
install_system.bat
```

---

### 2. Manual Django Backend Setup
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

### 3. Next.js Frontend Setup (with Bun)
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

### 4. Desktop Application & Electron Setup
```bash
# Root directory
cd ..

# Run Desktop in development mode
bun run desktop:dev

# Build Windows Executable (.exe Installer)
bun run desktop:dist
```
- Built installer will be located in: `dist/RestoERP Setup 1.0.0.exe`

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

نظام سحابي ومكتبي متكامل ومتقدم لإدارة المنشآت والمطاعم ونقاط البيع السريعة، مدعوم بأحدث خوارزميات **الذكاء الاصطناعي (AI)** لتحليل البيانات، كشف الاحتيال، التنبؤ بالمخزون، توليد أوامر الشراء المؤتمتة، جدولة نزول الأطباق بالتزامن في المطبخ، حماية الحجوزات، وهندسة المنيو، مع دعم التشغيل المكتبي المستقل عبر **Electron**، والتهيئة التلقائية الفورية لقواعد بيانات **PostgreSQL** بنقرة واحدة، ومحرك ترخيص عتادي مشفر بالوقت الفعلي المطلق حصري للمطورين الفائقين **ظافر وأيوب (SuperDev)**.

---

### 🌟 المميزات والوحدات الرئيسية

#### 1. 🛒 نقطة البيع السريعة (POS) وشريط الكاشير الذكي
- **شريط دفع متناسق ومريح:** إعادة هيكلة منطقة الدفع والعمليات لتكون ذات ارتفاع موحد وشديدة السلاسة لشاشات اللمس وأجهزة الكاشير.
- **أزرار الدفع الفوري بنقرة واحدة:** أزرار سريعة ومميزة بصرياً للدفع **النقدي (`نقدي`)**، **البطاقات المصرفية (`بطاقة`)**، و**الدفع الآجل للمديونيات (`آجل`)**.
- **إدارة الطلبات المعلقة والفواتير السريعة (نافذة منبثقة Popup):** زران متجاوران لحفظ الطلب كمعلق (`طلب معلق`) ومعاينة الفاتورة الحرارية 80mm وطباعتها عبر شاشة منبثقة سريعة دون مغادرة صفحة البيع.
- **توسيع مساحة الأصناف والسلة:** تحسين واجهة نقطة البيع بزيادة مساحة استعراض الأصناف وسلة المشتريات لتسهيل العمل السريع لكاشيرات المطعم.
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
- **إدارة وضبط أجهزة البصمة الشبكية مركزياً (SuperDev Biometrics Management):**
  - حصر إعدادات شبكة أجهزة البصمة (عنوان IP، المنافذ المدعومة 4370، 4444، 8888، والمنفذ الاحتياطي 5003، وزر فحص الاتصال الحي Test Connection) حصرياً ضمن صلاحية SuperDev لظافر وأيوب.
  - تخزين وحفظ الإعدادات مركزياً في قاعدة البيانات (`RestaurantSettings`) لربط شاشات الحضور وانصراف وبصمات الموظفين دون تعريض المعطيات الفنية للمديرين أو الموظفين.
- **مختبر اختبار نظام التراخيص وفترة تجريبية لمدة ساعة كاملة بالوقت الفعلي المطلق (Wall-clock 1-Hour Trial):**
  - **احتساب المدة بالوقت الفعلي المطلق:** احتساب مدة الساعة التجريبية (60 دقيقة = 3600 ثانية) بالاعتماد على الطابع الزمني المطلق للتثبيت (`installed_at`). تستمر مدة التجربة في الانقضاء وتُخصم بالكامل حتى ولو كان الجهاز مغلقاً أو مطفأً أو في وضع السكون (Sleep Mode).
  - **الحماية الصارمة ضد التلاعب بساعة النظام:** كشف فوري لأي محاولة تلاعب بإرجاع ساعة الويندوز أو الحاسوب إلى الماضي ($t < t_{\text{installed}}$)، واعتبار ذلك خرقاً أمنياً يُنهي الفترة التجريبية ويقفل النظام فوراً.
  - **التزامن اللحظي للواجهة عند استيقاظ الجهاز:** ربط الواجهة الأمامية بأحداث `visibilitychange` و `focus` مع حساب الوقت المتبقي من الطابع الزمني المطلق للانتهاء، بحيث بمجرد فتح غطاء اللابتوب أو تشغيل الشاشة، يتم احتساب وخصم كافة الدقائق التي مرت أثناء إغلاق الجهاز وقفل النظام فوراً إذا تجاوزت الساعة.
  - **أزرار تحكم سريعة للمطورين الفائقين:** بدء فترة تجريبية جديدة لساعة كاملة، تسريع إنهاء مدة الساعة فورياً لمحاكاة القفل واختبار نافذة التفعيل، واستعادة التفعيل الدائم مدى الحياة (Lifetime) بنقرة واحدة.

#### 3. 🖥️ تطبيق سطح المكتب المستقل (Desktop Suite)
- **حزمة تثبيت ويندوز الرسمية (`dist/RestoERP Setup 1.0.0.exe`):** ملف تثبيت مدمج ومرفوع مباشرة على المستودع جاهز للتنصيب على أجهزة نقاط البيع التي تعمل بنظام ويندوز 10/11 مع اختصارات سطح المكتب.
- **واجهة مدمجة بدون إطارات (Frameless Window):** تشغيل التطبيق في نافذة حديثة متكاملة مع إزالة شريط القوائم التقليدي وإضافة عناصر تحكم علوية مخصصة (`ElectronWindowControls`).
- **مثبت البرمجيات المؤتمت (`install_system.bat`):** سكريبت تنصيب فوري يقوم بفحص وتثبيت بيئة Bun ومكتبات بايثون وإعداد المشروع بضغطة زر واحدة.
- **التوجيه الذكي للاتصال (Dual-Mode API Routing):** توجيه تلقائي ذكي إلى خادم Django المحلي (`http://127.0.0.1:8000/api`) عند التشغيل على localhost أو عبر تطبيق Electron مع حفظ مسار السحابة في الإنتاج.
- **دعم ترويسات CORS المخصصة وحماية الشبكة:** السماح الشامل بترويسات التحقق العتادية (`X-SuperDev-Device-Token`, `X-Device-Machine-Id`) في إعدادات Django وضبط مهلة استجابة 15 ثانية لمنع أخطاء الشبكة.
- **مشغل صامت بنقرة واحدة:** ملفات `run_system.bat` و `launch_hidden.vbs` لتشغيل الباك إند والفرونت إند في الخلفية بضغطة واحدة.

#### 4. 🤖 حزمة الذكاء الاصطناعي وتعلم الآلة (AI & ML)
- **👆 الحضور والانصراف بالبصمة البيومترية عبر كابل الإيثرنت (Cable EtherNet):**
  - **استبدال كابلات USB بكابل الإيثرنت (Cable EtherNet):** إلغاء التوصيل عبر كابل USB بالكامل واعتماد الربط الشبكي المباشر والمستقر عبر كابل الإيثرنت (RJ45 LAN) لأجهزة ZKTeco الجدارية والمكتبية عبر مكتبة `pyzk` المتخصصة.
  - **دعم المنافذ الشبكية المتعددة والمنفذ الاحتياطي:** بنية اتصال ذكية مع التبديل التلقائي في حال انقطاع أي منفذ:
    - **المنفذ 4370:** المنفذ القياسي الافتراضي لأجهزة ZKTeco Standalone.
    - **المنفذ 4444:** منفذ خادم الجسر الشبكي ومستمع الحركات الفوري (Daemon Listener).
    - **المنفذ 8888:** منفذ المزامنة السحابية والتحميل التلقائي (ADMS Push SDK).
    - **المنفذ 5003:** منفذ احتياطي بديل ومخصص للطوارئ (Backup Port).
  - **معالجة متقدمة بالذكاء الاصطناعي:** استخراج متجهات الخصائص بدقة 128 بُعداً عبر شبكات **TensorFlow CNN** والمقارنة الفورية.
  - **حصر بصمة الهاتف الذكي بالمدير ومنع الحضور عن بُعد:** قصر ميزة مسح بصمة الهاتف الذكي (`WebAuthn`) حصرياً على صلاحية المدير، وإلزام الموظفين العاديين بالحضور عبر جهاز البصمة الشبكي المتصل بكابل الإيثرنت داخل المنشأة.
  - **صلاحية حضور مخصصة (`attendance`):** إدراج صلاحية مستقلة لشاشة الحضور وتسجيل البصمة ضمن مصفوفة الصلاحيات مع حجبها تلقائياً عن المستخدمين العاديين في القائمة الجانبية.
  - **تبسيط نافذة تسجيل بصمة الموظف (`/employees`):** إزالة تعقيدات الشبكة والـ IP والمنافذ من نافذة الموظفين، والاكتفاء برقم الموظف على الجهاز (PIN / User ID) والاعتماد التلقائي على إعدادات SuperDev.
  - **نافذة مخصصة لتسجيل الحضور والانصراف بجهاز البصمة (`/attendance`):** فتح نافذة منبثقة مستقلة وأنيقة لعرض حالة اتصال الجهاز، أزرار واضحة لاختيار نوع الحركة (تسجيل دخول أو تسجيل خروج)، التعرف التلقائي أو اختيار الموظف، تسجيل الحركة فورياً، وسحب ومزامنة سجلات الجهاز.
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

#### 6. 🕒 احتساب فروقات الوردية والمطابقة النقدية وخصم العجز المالي (Shift Variance & Deficit Deduction)
- **محرك تسوية الوردية الدقيق (`POST /api/payments/shifts/{shift_id}/close/`):**
  $$\text{الفارق (Variance)} = \text{المبلغ الفعلي المعدود في الخزينة} - \text{النقدية المتوقعة}$$
  - تصنيف الحالة آلياً: `BALANCED` (مطابق 100%)، `SURPLUS` (فائض نقدي بالدرج)، أو `DEFICIT` (عجز نقدي).
  - إصدار تقرير تسوية إغلاق تفصيلي وإيصال مطابقة قابل للطباعة مباشرة.
- **نافذة إغلاق الوردية الذكية (`CloseShiftModal.tsx`):** حساب الفارق مباشرة أثناء كتابة المبلغ المعدود، تمييز لوني ديناميكي، تسجيل الملاحظات وطباعة ملخص الاستلام والتسليم.
- **خصم عجز الورديات والخزينة من المرتبات:**
  - فحص وكشف تلقائي لأي عجز نقدي في ورديات الكاشير/الموظف المغلقة خلال الشهر وربطها بمسير الرواتب.
  - إدراج حقول خصم العجز المالي وبيان السبب في سند الصرف وإيصالات الخزينة.
  - فرض اشتراط موافقة واعتماد المدير الإلزامية قبل اعتماد وصرف أي خصم (غياب أو عجز مالي).
  - إبراز الخصم في جدول السجل وسند صرف المرتبات الرسمي القابل للطباعة.

#### 7. 💰 كشف هامش الربح وتتبع العجز في لوحة التحكم والترحيل للخزينة
- **كشف هامش الربح وتكلفة البضاعة المباعة اللحظي (`GET /api/payments/dashboard/profit-margin-and-deficits`):**
  - تحليل فوري لإجمالي المبيعات، تكلفة البضاعة المباعة (COGS المحسوبة بدقة من استهلاك خامات ووصفات الوجبات)، مجمل الربح، المصروفات التشغيلية، الرواتب والبدلات، وصافي الربح التشغيلي.
  - احتساب نسب الهامش الربحي وشريط تقدم بصري يوضح هيكل التكاليف وصافي الأرباح ونسبتها المئوية من المبيعات.
- **كشف عجز الورديات والمطابقة النقدية الدورية:**
  - جدول تفصيلي بجميع الورديات المغلقة، مقارنة النقدية المتوقعة بالدرج مع النقدية الفعلية، وإظهار العجز أو الفائض النقدي لكل كاشير مع حالة التسوية.
- **ترحيل وتسوية العجز والأرباح إلى الخزينة بنقرة واحدة:**
  - تسوية عجز أي وردية وترحيلها كحركة منصرفات/تسوية في الخزينة الرئيسية (`POST /api/payments/dashboard/settle-shift-deficit`).
  - تسوية جماعية لكافة فروقات وعجوزات الورديات المعلقة بضغطة زر واحدة (`POST /api/payments/dashboard/settle-all-deficits`).
  - ترحيل الأرباح الصافية أو جزء منها وإيداعها مباشرة في الخزينة مع تسجيل الملاحظات وتحديث رصيد الخزينة الفعلي لحظياً (`POST /api/payments/dashboard/transfer-profit-to-treasury`).

#### 8. 👥 كشف الحضور والانصراف، مواعيد الدوام، البحث الذكي وخصم التأخير من المرتبات
- **تحديد موعد البصمة للحضور وقيم خصم التأخير والغياب بواسطة الأدمن:**
  - تحديد موعد البصمة المجدول للحضور (`work_start_time` - الساعة) وموعد الانصراف وفترة السماح لكل موظف وعبر الإعدادات العامة للمطعم.
  - احتساب وتطبيق قيمة الخصم المحددة من الأدمن في حال التأخير عن موعد البصمة بعد انتهاء فترة السماح.
  - تحديد قيمة الخصم المعتمدة من الأدمن في حال الغياب (`absence_deduction_amount` بالدينار الليبي)، واحتسابها تلقائياً عند غياب الموظف بدقة في مسير الرواتب.
  - إظهار موعد الحضور وقيم خصم التأخير والغياب بوضوح في جدول الموظفين، نافذة صرف المرتبات، وكشف الحضور اليومي.
- **كشف الحضور اليومي، احتساب التأخير والبحث الذكي:**
  - مقارنة وقت أول بصمة حضور بالموعد المجدول وفترة السماح آلياً ولحظياً.
  - تمييز شارات الحالة: الحضور في الموعد (أخضر)، أو متأخر مع إظهار عدد دقائق التأخير وقيمة الخصم المستحق (أحمر)، أو غائب.
  - محرك بحث ذكي داخل كشف اليوم يدعم الكلمات الدلالية (`حاضر`، `متأخر`، `غائب`) والبحث بالاسم، رقم الهاتف، والدور الوظيفي، مع تصفية سريعة بنقرة واحدة.
- **احتساب وخصم التأخير تلقائياً من مسير الرواتب (Salaries Payroll):**
  - مسح آلي لكافة حركات الشهر واحتساب إجمالي أيام ودقائق التأخير، واقتراح قيمة خصم التأخير تلقائياً في نافذة صرف المرتب.
  - إدراج خصم التأخير كبند مالي مستقل بجانب خصم الغياب وعجز الورديات.
  - إلزامية اعتماد المشرف/المدير (Admin Approval) لأي خصم قبل الصرف، وإدراج الخصم في قيود الخزينة وسند الصرف القابل للطباعة.
- **متابعة تفصيلية وشاملة للحضور والانصراف:**
  - لوحة متابعة ومؤشرات فورية لنسبة الحضور وحالات الموظفين (`حاضر`، `انصرف`، `غائب`).
  - تصفية الحركات بدقة حسب الموظف والفترة الزمنية (تاريخ البدء والانتهاء) ونوع البصمة.
  - احتساب وتنسيق ساعات العمل والدقائق وتوثيق توقيت أول دخول وآخر خروج وعدد البصمات.
  - إمكانية طباعة كشف حضور وانصراف رسمي لجميع الموظفين معاً أو كشف مخصص لكل موظف على حدة.

#### 9. 📦 المخزون، الجرد، والمشتريات والوصفات
- **حماية إضافة الأصناف والوجبات (Ingredient Guard):** منع إضافة أي صنف في قائمة الطعام أو صفحة الوصفات قبل التحقق من إدخال وتسجيل مكوناته ومواده الخام أولاً في صفحة المخزون لضمان دقة التكاليف والجرد.
- **دعم الباركود الشامل للمخزون والمواد الخام:** إضافة حقل الباركود لنموذج المواد الخام والمخزون (`Ingredient`)، ونقطة نهاية API للبحث السريع، مع إبراز كود الباركود في الجدول وتفعيل البحث والمسح الفوري.
- **جرد المنتجات والمخزون الحي:** واجهة متخصصة لإجراء الجرد الفعلي للمنتجات، مقارنة الرصيد الدفتري بالفعلي، واحتساب الفروقات والتسوية بنقرة واحدة.
- **محرك متوسط التكلفة المرجح (Weighted Average Cost):** إعادة احتساب تكلفة الوحدة تلقائياً فور استلام البضاعة.
- **هندسة الوصفات وتكاليف الوجبات:** ربط الوجبات بالمواد الخام، وحساب التكلفة اللحظي، والخصم التلقائي للمخزون فور البيع.

#### 10. 📱 تصميم متجاوب، شريط جانبي يمين، وفاتورة أبيض وأسود نقية (Pure B&W)
- **توافق كامل مع كافة الأجهزة (Full Responsiveness):** إعادة هيكلة مرنة لجميع صفحات النظام (لوحة التحكم، المرتبات، الكاشير، الموظفين، المخزون، الطلبات، الوصفات، والإعدادات).
- **تموضع القائمة الجانبية يميناً (Right-Aligned Sidebar Toggle):** نقل زر فتح وإغلاق القائمة الجانبية إلى جهة اليمين لتتوافق بصرياً ووظيفياً مع بيئة العمل والواجهات العربية (RTL).
- **فاتورة حرارية أبيض وأسود نقي (Pure Black & White):** تصميم عالي التباين خالٍ تماماً من التدرجات الرمادية المسببة لتشويش الطابعات الحرارية لضمان دقة وسرعة طباعة الإيصالات 80mm.
- **محرك الفترة التجريبية (1 ساعة كاملة) بالوقت الفعلي المطلق:** نظام عد تنازلي حي بالثواني ينبض في الشريط العلوي (`⏳ 59 دقيقة و 42 ثانية`)، وعند انتهاء الـ 60 دقيقة يتم قفل النظام تلقائياً وتظهر شاشة القفل الحمراء لطلب مفتاح التفعيل الدائم.
- **قائمة جانبية منزلقة للأجهزة المحمولة (Off-Canvas Mobile Drawer):** إخفاء القائمة الثابتة تلقائياً على الشاشات التي يقل عرضها عن 1024 بكسل واستبدالها بدرج جانبي سلس مع طبقة تعتيم ضبابية خلفية (Backdrop Overlay) وإغلاق فوري عند الضغط على أي رابط.
- **شريط تنقل علوي مدمج للهواتف (Mobile Top Bar):** شريط علوي أنيق يحتوي على شعار واسم المطعم، زر التحويل للوضع الليلي، وزر القائمة (Hamburger Menu).
- **منع التمدد الأفقي للشاشات (Zero Overflow):** ضبط دقيق لجميع الجداول وتأطيرها بخاصية التمرير الأفقي السلس (`overflow-x-auto`)، مع جعل شريط التنبيه التجريبي يتكيف بمرونة مع أصغر شاشات الهواتف.

#### 11. 🧾 الفوترة الإلكترونية وتوافق ZATCA المرحلة الثانية
- **نماذج فواتير قابلة للتخصيص:** تصاميم عصرية لفواتير المبيعات، المشتريات، والمرتجعات مع معاينة حية ومباشرة.
- **توليد رمز الاستجابة السريعة (ZATCA TLV Base64 QR Code):** تشفير بيانات الفاتورة وفق المعايير الرسمية.
- **خيارات الطباعة:** دعم مقاسات الورق A4 وإيصالات الرول الحراري 80mm.

---

## 📄 الترخيص (License)
هذا المشروع مطوّر ومملوك بواسطة **TeamSoftWare Developers Organization** لخدمة حلول إدارة المطاعم والضيافة.  
All rights reserved © 2026.
