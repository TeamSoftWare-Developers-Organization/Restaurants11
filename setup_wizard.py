"""
RestoERP Setup Wizard - مثبت النظام التفاعلي
واجهة رسومية تفاعلية حديثة تتيح للمستخدم أو العميل اختيار المكونات والأدوات المراد تثبيتها
مثل البرامج والتطبيقات الاحترافية (Custom Setup Wizard).
"""

import os
import sys
import time
import socket
import threading
import subprocess
from pathlib import Path
import tkinter as tk
from tkinter import ttk, messagebox

# إعداد المسارات
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "restaurantsApi"
FRONTEND_DIR = ROOT_DIR / "restaurant-frontend"


class ModernSetupWizard(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("RestoERP — معالج تثبيت النظام وإعداد المكونات")
        self.geometry("740x580")
        self.minsize(700, 520)
        self.configure(bg="#0F172A")  # لون خلفية كحلي داكن عصري

        # أيقونة إن وجدت
        icon_path = ROOT_DIR / "dist" / ".icon-ico" / "icon.ico"
        if icon_path.exists():
            try:
                self.iconbitmap(str(icon_path))
            except Exception:
                pass

        # متغيرات الاختيارات التفاعلية للمكونات (Components Selection)
        self.var_backend = tk.BooleanVar(value=True)       # خادم النظام الأساسي Django
        self.var_frontend = tk.BooleanVar(value=True)      # واجهة الكاشير ونقاط البيع Next.js
        self.var_bun = tk.BooleanVar(value=True)           # محرك Bun السريع
        self.var_postgres = tk.BooleanVar(value=True)      # قاعدة بيانات PostgreSQL
        self.var_demo_users = tk.BooleanVar(value=True)    # حسابات المستخدمين والبيانات الافتراضية
        self.var_desktop_shortcut = tk.BooleanVar(value=True) # اختصار سطح المكتب

        # بناء الواجهة
        self.create_header()
        self.create_body()
        self.create_footer()

    def create_header(self):
        header_frame = tk.Frame(self, bg="#1E293B", height=90, padx=25, pady=15)
        header_frame.pack(fill=tk.X, side=tk.TOP)

        title_lbl = tk.Label(
            header_frame,
            text="🍽️ معالج تثبيت وتجهيز نظام المطاعم المتكامل (RestoERP)",
            font=("Segoe UI", 14, "bold"),
            fg="#F8FAFC",
            bg="#1E293B"
        )
        title_lbl.pack(anchor="w")

        subtitle_lbl = tk.Label(
            header_frame,
            text="حدد المكونات والأدوات التي ترغب في تثبيتها وتهيئتها على هذا الحاسوب:",
            font=("Segoe UI", 10),
            fg="#94A3B8",
            bg="#1E293B"
        )
        subtitle_lbl.pack(anchor="w", pady=(4, 0))

    def create_body(self):
        self.body_frame = tk.Frame(self, bg="#0F172A", padx=25, pady=15)
        self.body_frame.pack(fill=tk.BOTH, expand=True)

        # بطاقة اختيار المكونات
        comp_group = tk.LabelFrame(
            self.body_frame,
            text="  حزم وأدوات النظام المتاحة للتثبيت (Custom Components)  ",
            font=("Segoe UI", 10, "bold"),
            fg="#38BDF8",
            bg="#0F172A",
            padx=15,
            pady=10
        )
        comp_group.pack(fill=tk.BOTH, expand=True)

        components = [
            (
                self.var_backend,
                "خادم الباك إند الأساسي (Django REST API & Python Packages)",
                "يتضمن تثبيت جميع مكتبات Python من requirements.txt وضبط إعدادات النظام.",
                True # إلزامي
            ),
            (
                self.var_frontend,
                "واجهة الكاشير ونقاط البيع السريعة (Next.js & Frontend Modules)",
                "تثبيت وتجهيز شاشات نقاط البيع، المخزون، والورديات بالكامل.",
                True
            ),
            (
                self.var_bun,
                "محرك Bun Runtime السريع (موصى به لتسريع أداء الواجهة)",
                "يقوم بفحص وتنزيل أو استيراد محرك bun.exe لتسريع تشغيل النظام.",
                False
            ),
            (
                self.var_postgres,
                "تهيئة وإنشاء قاعدة بيانات PostgreSQL تلقائياً (restaurant_db)",
                "التحقق من خادم PostgreSQL وإنشاء قاعدة البيانات وتطبيق كافة الجداول (Migrations).",
                False
            ),
            (
                self.var_demo_users,
                "توليد حسابات المستخدمين والبيانات التشغيلية الافتراضية",
                "إنشاء حسابات النظام الأساسية: المدير (admin)، الكاشير، الشيف، والنادل.",
                False
            ),
            (
                self.var_desktop_shortcut,
                "إنشاء اختصار مباشر على سطح المكتب (Desktop Shortcut)",
                "إنشاء أيقونة تشغيل بنقرة واحدة لتشغيل النظام كبرنامج سطح مكتب فوري.",
                False
            )
        ]

        for var, title, desc, required in components:
            row = tk.Frame(comp_group, bg="#0F172A", pady=3)
            row.pack(fill=tk.X, anchor="w")

            cb = tk.Checkbutton(
                row,
                text=title,
                variable=var,
                font=("Segoe UI", 10, "bold"),
                fg="#F1F5F9",
                bg="#0F172A",
                activebackground="#0F172A",
                activeforeground="#38BDF8",
                selectcolor="#1E293B"
            )
            if required:
                cb.config(state="disabled") # إلزامي لا يمكن إلغاؤه لضمان عمل النظام
            cb.pack(anchor="w")

            desc_lbl = tk.Label(
                row,
                text=desc,
                font=("Segoe UI", 8),
                fg="#64748B",
                bg="#0F172A",
                padx=22
            )
            desc_lbl.pack(anchor="w")

        # شريط التقدم وسجل السجلات
        self.progress_frame = tk.Frame(self.body_frame, bg="#0F172A", pady=8)
        self.progress_frame.pack(fill=tk.X)

        self.status_lbl = tk.Label(
            self.progress_frame,
            text="جاهز لبدء التثبيت. اضغط على زر 'تثبيت الآن' للبدء.",
            font=("Segoe UI", 9, "bold"),
            fg="#94A3B8",
            bg="#0F172A"
        )
        self.status_lbl.pack(anchor="w", pady=(0, 4))

        self.progress_bar = ttk.Progressbar(self.progress_frame, mode="determinate")
        self.progress_bar.pack(fill=tk.X)

    def create_footer(self):
        footer_frame = tk.Frame(self, bg="#1E293B", height=60, padx=25, pady=12)
        footer_frame.pack(fill=tk.X, side=tk.BOTTOM)

        self.btn_exit = tk.Button(
            footer_frame,
            text="إلغاء الأمر",
            font=("Segoe UI", 10, "bold"),
            bg="#334155",
            fg="#F8FAFC",
            activebackground="#475569",
            activeforeground="#FFFFFF",
            relief="flat",
            padx=18,
            pady=6,
            cursor="hand2",
            command=self.destroy
        )
        self.btn_exit.pack(side=tk.LEFT)

        self.btn_install = tk.Button(
            footer_frame,
            text="🚀 تثبيت المكونات المحددة الآن",
            font=("Segoe UI", 10, "bold"),
            bg="#059669",
            fg="#FFFFFF",
            activebackground="#10B981",
            activeforeground="#FFFFFF",
            relief="flat",
            padx=22,
            pady=6,
            cursor="hand2",
            command=self.start_installation
        )
        self.btn_install.pack(side=tk.RIGHT)

    def log(self, message: str, step: int = 0, total_steps: int = 6):
        self.status_lbl.config(text=message)
        if total_steps > 0:
            percentage = int((step / total_steps) * 100)
            self.progress_bar["value"] = percentage
        self.update_idletasks()

    def start_installation(self):
        # تعطيل أزرار الواجهة لمنع التكرار أثناء التثبيت
        self.btn_install.config(state="disabled", bg="#064E3B")
        self.btn_exit.config(state="disabled")

        # تشغيل التثبيت في مسار خلفي منفصل لعدم تجميد الواجهة (Non-blocking GUI)
        thread = threading.Thread(target=self.run_install_tasks, daemon=True)
        thread.start()

    def run_install_tasks(self):
        total_steps = 6
        current_step = 0

        try:
            # 1. تثبيت محرك Bun إن تم تحديده
            if self.var_bun.get():
                current_step += 1
                self.log(f"[{current_step}/{total_steps}] فحص وتهيئة محرك Bun...", current_step, total_steps)
                bin_dir = ROOT_DIR / "bin"
                bin_dir.mkdir(exist_ok=True)
                user_bun = Path(os.path.expandvars(r"%USERPROFILE%\.bun\bin\bun.exe"))
                local_bun = bin_dir / "bun.exe"
                if not local_bun.exists() and user_bun.exists():
                    import shutil
                    shutil.copy2(user_bun, local_bun)

                # إضافة لمسار النظام
                os.environ["PATH"] = f"{bin_dir};{user_bun.parent};{os.environ.get('PATH', '')}"

            # 2. تثبيت حزم الواجهة الأمامية
            if self.var_frontend.get():
                current_step += 1
                self.log(f"[{current_step}/{total_steps}] تثبيت مكتبات الواجهة الأمامية (Frontend)...", current_step, total_steps)
                runner = "bun" if subprocess.run(["where" if os.name == "nt" else "which", "bun"], capture_output=True).returncode == 0 else "npm"
                cmd = [runner, "install"]
                subprocess.run(cmd, cwd=FRONTEND_DIR, shell=True, check=True)

            # 3. تثبيت مكتبات الباك إند
            if self.var_backend.get():
                current_step += 1
                self.log(f"[{current_step}/{total_steps}] تثبيت مكتبات البايثون وخادم Django...", current_step, total_steps)
                req_file = BACKEND_DIR / "requirements.txt"
                subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(req_file), "--quiet"], cwd=BACKEND_DIR, check=True)

            # 4. تهيئة قاعدة البيانات وإنشاء الجداول
            if self.var_postgres.get():
                current_step += 1
                self.log(f"[{current_step}/{total_steps}] فحص وإنشاء قاعدة بيانات PostgreSQL وتهيئة الجداول...", current_step, total_steps)
                
                # إنشاء قاعدة البيانات برمجياً إن كان خادم Postgres متاحاً
                self.provision_postgres_db()

                # تطبيق الهجرات
                subprocess.run([sys.executable, "manage.py", "migrate", "--noinput"], cwd=BACKEND_DIR, check=True)

            # 5. زرع الحسابات الافتراضية
            if self.var_demo_users.get():
                current_step += 1
                self.log(f"[{current_step}/{total_steps}] توليد حسابات المستخدمين والبيانات الافتراضية...", current_step, total_steps)
                subprocess.run([sys.executable, "manage.py", "seed_demo_users"], cwd=BACKEND_DIR, check=False)

            # 6. إنشاء اختصار سطح المكتب
            if self.var_desktop_shortcut.get():
                current_step += 1
                self.log(f"[{current_step}/{total_steps}] إنشاء اختصار على سطح المكتب...", current_step, total_steps)
                self.create_desktop_shortcut()

            # اكتمال التثبيت
            self.log("✅ اكتمل تثبيت وتجهيز كافة المكونات المحددة بنجاح!", total_steps, total_steps)
            messagebox.showinfo("تم التثبيت بنجاح", "تهانينا! تم تثبيت وإعداد نظام RestoERP بنجاح تام.\nيمكنك الآن تشغيل النظام مباشرة.")
            self.destroy()

        except Exception as err:
            self.status_lbl.config(text=f"❌ حدث خطأ أثناء التثبيت: {err}", fg="#F87171")
            messagebox.showerror("خطأ أثناء التثبيت", f"حدث خطأ أثناء تثبيت المكونات:\n{err}")
            self.btn_exit.config(state="normal")
            self.btn_install.config(state="normal", bg="#059669")

    def provision_postgres_db(self):
        """فحص خادم Postgres وإنشاء قاعدة البيانات restaurant_db تلقائياً"""
        host = "127.0.0.1"
        port = 5432
        db_name = "restaurant_db"
        db_user = "postgres"
        db_pass = "0918147613a"

        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1.5)
        is_live = (sock.connect_ex((host, port)) == 0)
        sock.close()

        if is_live:
            try:
                import psycopg2
                from psycopg2 import sql
                from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
                conn = psycopg2.connect(dbname="postgres", user=db_user, password=db_pass, host=host, port=port)
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                cur = conn.cursor()
                cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
                if not cur.fetchone():
                    cur.execute(sql.SQL("CREATE DATABASE {} WITH OWNER {} ENCODING 'UTF8';").format(
                        sql.Identifier(db_name),
                        sql.Identifier(db_user)
                    ))
                cur.close()
                conn.close()
            except Exception:
                pass

    def create_desktop_shortcut(self):
        """إنشاء اختصار مباشر على سطح المكتب عبر VBScript"""
        try:
            desktop = Path(os.path.expandvars(r"%USERPROFILE%\Desktop"))
            target_bat = ROOT_DIR / "start_system.bat"
            shortcut_path = desktop / "RestoERP POS.lnk"
            icon_path = ROOT_DIR / "dist" / ".icon-ico" / "icon.ico"

            vbs_script = f"""
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "{shortcut_path}"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "{target_bat}"
oLink.WorkingDirectory = "{ROOT_DIR}"
oLink.Description = "RestoERP Restaurant Management and POS"
If "{icon_path}" <> "" Then
    oLink.IconLocation = "{icon_path}"
End If
oLink.Save
"""
            temp_vbs = ROOT_DIR / "create_shortcut.vbs"
            temp_vbs.write_text(vbs_script, encoding="utf-8")
            subprocess.run(["cscript", "//nologo", str(temp_vbs)], check=False)
            if temp_vbs.exists():
                temp_vbs.unlink()
        except Exception:
            pass


def main():
    app = ModernSetupWizard()
    app.mainloop()


if __name__ == "__main__":
    main()
