# 🍽️ Restaurants11 — Smart Restaurant Management & POS System

[![Next.js](https://img.shields.io/badge/Next.js-16.1.5-black?logo=next.js)](https://nextjs.org/)
[![Django Ninja](https://img.shields.io/badge/Django_Ninja-REST_API-092E20?logo=django)](https://django-ninja.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Responsive-06B6D4?logo=tailwind-css)](https://tailwindcss.com/)
[![TensorFlow](https://img.shields.io/badge/AI_Biometrics-TensorFlow_CNN-FF6F00?logo=tensorflow)](https://tensorflow.org/)
[![License](https://img.shields.io/badge/License-TeamSoftWare-orange.svg)](#license)

A modern, cloud-ready, end-to-end Restaurant Enterprise Resource Planning (ERP) and Point of Sale (POS) system. Powered by **Artificial Intelligence (TensorFlow & OpenCV)** for biometric attendance and automated hardware scanners, with high-performance reactive APIs built with **Django Ninja** and a responsive **Next.js (App Router & Turbopack)** client.

---

## 🌐 Language / اللغة
- [English Version](#-english-overview)
- [النسخة العربية (Arabic Version)](#-نظام-إدارة-المطاعم-المتكامل-الذكي-باللغة-العربية)

---

## 🌟 English Overview

### 💡 Core System Features

#### 1. ⚡ High-Speed Point of Sale (POS)
- **Touch-Friendly & Fluid UI:** Optimized for desktop touch monitors, tablets, and mobile devices with fast tile selection and keyboard shortcuts.
- **Multi-Order Workflow:** Seamlessly handles **Dine-in**, **Takeaway**, and **Delivery** orders.
- **Thermal Receipt Printing:** Instant 80mm thermal receipt rendering, customizable restaurant headers, and QR/barcode-ready formats.
- **Shift & Counter Controls:** Open/close shifts with starting float, mid-shift expense registration, and closing cash counts.
- **Standardized Currency:** Standardized Libyan Dinar (`LYD` / `د.ل`) across all transactions.

#### 2. 📦 Automated Procurement, Weighted Average Costing & Inventory
- **Suppliers Directory:** Comprehensive management of vendor contact info, commercial records, running credit balances, and payment terms.
- **Purchase Invoices (التوريد والمشتريات):** Register supplier bills and raw materials directly into the stockroom with automatic journal logging.
- **Weighted Average Costing Engine (متوسط التكلفة المرجح):** On receiving goods (`RECEIVED`), the backend automatically recalculates unit costs via atomic database transactions, preventing manual input errors:
  $$\text{New Cost} = \frac{(\text{Current Qty} \times \text{Current Cost}) + (\text{New Qty} \times \text{Invoice Price})}{\text{Current Qty} + \text{New Qty}}$$
- **Opening Stock Valuation:** Support for opening balances and baseline inventory unit costs.
- **Invoice Overview & Financial KPIs:** Quick filters, financial KPIs (total spent, debt balances, items count), and print-ready supplier vouchers.

#### 3. 🍲 Smart Recipe Costing & Margin Pricing
- **Direct Ingredient Linking:** Connect menu meals to raw stock ingredients with precise unit conversions (grams, milliliters, pieces).
- **Live Recipe Cost Calculation:** Instant meal cost updates derived from real-time weighted average costs of current stock.
- **Profit Margin Estimator:** Interactive margin tools (+30%, +50%, +100%) with one-click menu price updating.
- **Automatic Stock Depletion:** Selling a menu item automatically deducts its composite ingredients from inventory.

#### 4. 👆 Biometric AI Attendance & Hardware Scanner Bridge
- **Advanced Preprocessing (OpenCV & CLAHE):** Cleans raw scanner inputs, crops regions of interest, resizes to $128 \times 128$, and applies *Contrast Limited Adaptive Histogram Equalization* to eliminate noise, humidity, or dust artifacts.
- **TensorFlow Feature Extraction:** Uses a Convolutional Neural Network (CNN) to map fingerprint ridges into a compact 128-dimensional embedding vector.
- **Real-Time Vector Similarity:** Calculates Cosine Similarity against registered employee templates for fast biometric verification.
- **Physical Hardware Scanner Bridge (`hardware_scanner_bridge.py`):**
  - **ZKTeco USB Scanners:** Native integration with ZK4500, ZK7500, and ZK9500 desktop readers using `pyzkfp`.
  - **Optical Serial Sensors:** Direct serial communication with AS608, R307, and R503 modules via COM/UART ports using `pyserial`.
  - **Edge Deployment:** Supports lightweight `tflite-runtime` for low-latency verification on Raspberry Pi and POS terminals.

#### 5. 🪑 Floorplan, Tables & Reservation Management
- **Visual Floorplan:** Interactive table occupancy monitoring (Available, Busy, Reserved).
- **Reservations Calendar:** Book tables in advance with customer details, arrival windows, and auto-assignment to POS tickets.
- **Capacity & Location Tweaks:** Easily add, edit, or reorganize dining zones and seat limits.

#### 6. 💰 Treasury, Expenses, Cashflows & Payroll
- **Main Treasury Tracking:** Real-time visibility into drawer balances, bank deposits, safe transfers, and daily cash intake.
- **Operating Expense Registry:** Categorize utility bills, maintenance, kitchen supplies, and recurring operational costs.
- **Payroll & Advance Loans:** Track base salaries, employee advances (سلف), overtime, and calculate net disbursements.

#### 7. 🔐 Role-Based Access Control (RBAC) & Security
- **Granular Permissions Matrix:** Restrict or grant access to individual modules (POS, Inventory, Treasury, Reports, Settings) per user role (Admin, Cashier, Waiter, Chef).
- **Dynamic Sidebar:** Automatically hides unauthorized routes and actions.
- **Dual Login Identifiers:** Authenticate using username or email with secure JWT token storage.

#### 8. 📱 100% Fully Responsive Design & Brand Customization
- **Multi-Device Compatibility:** Custom mobile drawer navigation, sticky top headers, and touch-scrollable data grids across smartphones, iPads, Android tablets, and widescreen displays.
- **Dark & Light Mode:** Tailored theme transitions designed for low-light kitchen and cashier environments.
- **Brand Customization Settings:** Upload restaurant logos, set legal business names, tax IDs, phone numbers, and customize receipt footers.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** [Next.js](https://nextjs.org/) (App Router, Turbopack, React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS with Dark Mode support
- **State Management:** Zustand with selective storage persistence
- **Icons:** Lucide React
- **HTTP Client:** Axios with JWT auto-refresh interceptors

### Backend
- **Framework:** [Django](https://www.djangoproject.com/) 5.x
- **API Engine:** [Django Ninja](https://django-ninja.dev/) & Ninja Extra (Fast OpenAPI/Swagger generation)
- **Authentication:** Django Ninja JWT (JSON Web Tokens)
- **Computer Vision & AI:** OpenCV (`opencv-python-headless`), TensorFlow / Keras, NumPy
- **Hardware Drivers:** `pyzkfp` (ZKTeco USB SDK), `pyserial` (UART/COM)
- **Database:** SQLite (development) / PostgreSQL (production-ready)
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

# Install required packages
pip install -r requirements.txt

# Apply database migrations
python manage.py migrate

# Run the backend server
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

# Start the development server
npm run dev

# Or build for production
npm run build
npm start
```
- **Web App URL:** `http://localhost:3000/`

---

### 3. Physical Fingerprint Scanner Bridge
To connect an on-premise USB scanner or serial fingerprint sensor to the attendance engine:
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
| **System Admin** | `admin` or `admin@example.com` | `admin` |
| **Cashier / Staff** | `Ali451` | `123` |

---
---

## 🇸🇦 نظام إدارة المطاعم المتكامل الذكي (باللغة العربية)

نظام سحابي متكامل ومتقدم لإدارة المطاعم ونقاط البيع والمخازن، مدعوم بتقنيات **الذكاء الاصطناعي (AI)** والبصمة البيومترية المادية، ومبني بأحدث معايير الأداء والسرعة باستخدام **Next.js (App Router)** و **Django Ninja**.

### 🌟 أبرز الميزات:
1. **🛒 نقطة البيع السريعة (POS):** دعم شاشات اللمس، طلبات الصالة والسفري والدليفري، طباعة الإيصالات، وإدارة الورديات بالدينار الليبي (`د.ل`).
2. **📦 المشتريات والتوريد وحساب التكلفة الآلي:** إدارة الموردين، ترحيل الفواتير، ومحرك حساب متوسط التكلفة المرجح (Weighted Average Cost) آلياً داخل المعاملات الموحدة (Atomic Transactions).
3. **🍲 الوصفات وحساب التكاليف الذكي:** ربط الوجبات بالمواد الخام وحساب تكلفة الوجبة واقتراح هوامش الربح وخصم المخزون آلياً فور البيع.
4. **👆 حضور وانصراف ذكي بالبصمة البيومترية:** معالجة متقدمة لصور البصمات بمرشحات OpenCV وCLAHE، استخراج مصفوفات الميزات عبر شبكات TensorFlow CNN، وربط أجهزة ZKTeco USB وحساسات Serial COM.
5. **🪑 إدارة الطاولات والحجوزات:** متابعة حالة الصالة لحظياً وتنظيم حجوزات الزبائن.
6. **💰 الخزينة والمصروفات والرواتب:** تتبع السيولة النقدية، السلف، المصروفات اليومية، وحساب صافي رواتب الموظفين.
7. **🔐 مصفوفة الصلاحيات (RBAC):** تقييد ومنح الصلاحيات بدقة لكل دور ومستخدم، وإخفاء الروابط غير المصرح بها تلقائياً.
8. **📱 تصميم متجاوب 100%:** واجهة متجاوبة بالكامل على الهواتف والأجهزة اللوحية والحواسيب مع درج تنقل ذكي ووضع ليلي/نهاري وهوية وشعار مخصص للمطعم.

---

## 📄 الترخيص (License)
هذا المشروع مطوّر ومملوك بواسطة **TeamSoftWare Developers Organization** لخدمة أنظمة المطاعم وإدارة المنشآت الغذائية.
