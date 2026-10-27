"""
خادم الجسر والربط الشبكي لأجهزة البصمة عبر كابل الإيثرنت (Cable EtherNet / LAN) لنظام المطعم
Hardware Ethernet Scanner Bridge Service for Restaurant Attendance

يدعم هذا البرنامج:
1. الاتصال المباشر بأجهزة البصمة الشبكية (ZKTeco Standalone Terminals) عبر كابل الإيثرنت (Cable EtherNet - RJ45)
2. استخدام بروتوكول الشبكة ZKTeco TCP/IP عبر مكتبة pyzk
3. دعم المنافذ الرئيسية:
   - المنفذ 4370 (المنفذ القياسي الافتراضي لـ ZKTeco Standalone)
   - المنفذ 4444 (منفذ خادم الجسر والربط Daemon Listener)
   - المنفذ 8888 (منفذ السحابة والتحميل التلقائي ADMS Push SDK)
   - المنفذ 5003 (المنفذ الاحتياطي البديل للطوارئ Backup Port)
4. محاولة الاتصال التلقائي عبر المنافذ البديلة والاحتياطية في حال انقطاع المنفذ الرئيسي
5. التمرير الفوري لبيانات الحضور إلى خادم النظام (Django Ninja API)
"""

import sys
import time
import socket
import argparse
import urllib.request
import urllib.parse
import urllib.error
import json
from typing import Optional, List, Dict, Any

if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            getattr(sys.stdout, "reconfigure")(encoding='utf-8')
        if hasattr(sys.stderr, "reconfigure"):
            getattr(sys.stderr, "reconfigure")(encoding='utf-8')
    except Exception:
        pass

# المنافذ المعتمدة لجهاز البصمة الشبكي عبر كابل الإيثرنت
SUPPORTED_PORTS = [4370, 4444, 8888, 5003]
DEFAULT_PORT = 4370
BACKUP_PORT = 5003
DEFAULT_DEVICE_IP = "192.168.1.201"
DEFAULT_API_URL = "http://127.0.0.1:8000/api/attendance/biometric-checkin/"


def check_tcp_connectivity(ip: str, port: int, timeout: float = 2.0) -> bool:
    """
    فحص سريع لجاهزية واستجابة منفذ الشبكة عبر كابل الإيثرنت
    """
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        res = s.connect_ex((ip, port))
        s.close()
        return res == 0
    except Exception:
        return False


def send_punch_to_api(credential_id: str, punch_type: str = "CHECK_IN", device_info: str = "Ethernet Terminal", api_url: str = DEFAULT_API_URL) -> dict:
    """
    إرسال حركة الحضور المسجلة عبر كابل الإيثرنت إلى واجهة برمجة تطبيقات المطعم
    """
    payload = json.dumps({
        "credential_id": str(credential_id),
        "punch_type": punch_type,
        "device_info": device_info
    }).encode("utf-8")

    req = urllib.request.Request(
        api_url,
        data=payload,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return {"success": True, "status_code": resp.status, "data": data}
    except urllib.error.HTTPError as e:
        try:
            err_data = json.loads(e.read().decode("utf-8"))
        except Exception:
            err_data = {"message": str(e)}
        return {"success": False, "status_code": e.code, "error": err_data}
    except Exception as e:
        return {"success": False, "status_code": 500, "error": str(e)}


class ZKTecoEthernetBridge:
    """
    مشغل ومستمع أجهزة البصمة الشبكية عبر كابل الإيثرنت ومكتبة pyzk
    """
    def __init__(self, ip: str = DEFAULT_DEVICE_IP, port: int = DEFAULT_PORT, timeout: int = 5):
        self.ip = ip
        self.port = port
        self.timeout = timeout
        self.active_port: Optional[int] = None
        self.zk: Any = None
        self.conn: Any = None

    def find_working_port(self) -> Optional[int]:
        """
        فحص المنفذ الأساسي ثم المنافذ البديلة (4370، 4444، 8888) والاحتياطي (5003)
        """
        ports_order = [self.port] + [p for p in SUPPORTED_PORTS if p != self.port]
        print(f"🔍 فحص اتصال كابل الإيثرنت بالجهاز {self.ip} عبر المنافذ: {ports_order}...")

        for p in ports_order:
            is_backup = (p == BACKUP_PORT)
            tag = " (المنفذ الاحتياطي للطوارئ)" if is_backup else ""
            if check_tcp_connectivity(self.ip, p, timeout=1.5):
                print(f"✅ تم اكتشاف المنفذ {p}{tag} مفتوح ومستجيب عبر كابل الإيثرنت!")
                return p
            else:
                print(f"  - المنفذ {p} غير مستجيب...")

        return None

    def connect(self) -> bool:
        try:
            from zk import ZK, const
        except ImportError:
            raise RuntimeError("حزمة pyzk غير مثبتة. يرجى تثبيتها عبر: pip install pyzk")

        # 1. البحث عن المنفذ المستجيب
        detected_port = self.find_working_port() or self.port
        self.active_port = detected_port

        is_backup = (detected_port == BACKUP_PORT)
        print(f"🔌 جاري إنشاء جلسة ZKTeco الشبكية مع {self.ip}:{detected_port}" + (" [منفذ احتياطي]" if is_backup else "") + "...")

        try:
            self.zk = ZK(self.ip, port=detected_port, timeout=self.timeout, password=0, force_udp=False, ommit_ping=False)
            self.conn = self.zk.connect()
            if self.conn:
                print(f"🎉 تم الاتصال بجهاز البصمة الشبكي بنجاح عبر كابل الإيثرنت! (المنفذ: {detected_port})")
                try:
                    dev_name = self.conn.get_device_name()
                    firmware = self.conn.get_firmware_version()
                    serial = self.conn.get_serialnumber()
                    print(f"📋 معلومات الجهاز: {dev_name} | البرمجية: {firmware} | الرقم التسلسلي: {serial}")
                except Exception:
                    pass
                return True
        except Exception as e:
            print(f"⚠️ فشل الاتصال المباشر عبر pyzk على المنفذ {detected_port}: {e}")

        # محاولة أخيرة عبر المنفذ الاحتياطي 5003 إذا لم يكن هو المنفذ المجرب
        if detected_port != BACKUP_PORT:
            try:
                print(f"🔄 محاولة التبديل للمنفذ الاحتياطي للطوارئ ({BACKUP_PORT})...")
                self.zk = ZK(self.ip, port=BACKUP_PORT, timeout=self.timeout, password=0, force_udp=False, ommit_ping=False)
                self.conn = self.zk.connect()
                if self.conn:
                    self.active_port = BACKUP_PORT
                    print(f"🎉 تم الاتصال بنجاح عبر المنفذ الاحتياطي ({BACKUP_PORT})!")
                    return True
            except Exception as e:
                print(f"⚠️ تعذر الاتصال بالمنفذ الاحتياطي {BACKUP_PORT}: {e}")

        return False

    def listen_live_events(self, api_url: str = DEFAULT_API_URL):
        """
        الاستماع المباشر لحركات البصمة عبر كابل الإيثرنت وإرسالها فورياً للنظام
        """
        if not self.conn:
            if not self.connect():
                print("❌ تعذر بدء جلسة الاستماع لعدم استجابة جهاز البصمة على كابل الإيثرنت.")
                return

        print(f"📡 جهاز البصمة الشبكي في وضع الاستماع المباشر (Ethernet Cable RJ45 - المنفذ {self.active_port})...")
        print("💡 ضع إصبعك على مستشعر جهاز البصمة لتسجيل الحضور فورياً...")

        last_attendance_count = 0
        try:
            attendances = self.conn.get_attendance()
            last_attendance_count = len(attendances)
        except Exception:
            pass

        try:
            while True:
                time.sleep(2)
                try:
                    current_attendances = self.conn.get_attendance()
                    current_count = len(current_attendances)

                    if current_count > last_attendance_count:
                        new_records = current_attendances[last_attendance_count:]
                        last_attendance_count = current_count

                        for att in new_records:
                            punch_type = "CHECK_OUT" if getattr(att, "punch", 0) == 1 else "CHECK_IN"
                            print(f"📸 تم التقاط حركة بصمة عبر كابل الإيثرنت! رقم المستخدم: {att.user_id} - الوقت: {att.timestamp}")

                            device_label = f"Ethernet Terminal ({self.ip}:{self.active_port})"
                            res = send_punch_to_api(
                                credential_id=f"ETH-{att.user_id}",
                                punch_type=punch_type,
                                device_info=device_label,
                                api_url=api_url
                            )

                            if res["success"]:
                                emp_name = res["data"].get("employee_name", f"الموظف #{att.user_id}")
                                print(f"✅ مرحباً {emp_name}! تم توثيق الحضور بنجاح عبر الشبكة.")
                            else:
                                print(f"⚠️ تم تسجيل البصمة على الجهاز ولكن تعذر الترحيل: {res.get('error')}")

                except Exception as loop_err:
                    print(f"⚠️ انقطع الاتصال بجهاز البصمة ({loop_err})، جاري إعادة المحاولة عبر كابل الإيثرنت...")
                    time.sleep(3)
                    self.connect()

        except KeyboardInterrupt:
            print("\n🛑 إيقاف خدمة ربط جهاز البصمة الشبكي...")
        finally:
            if self.conn:
                try:
                    self.conn.disconnect()
                except Exception:
                    pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="جسر أجهزة البصمة الشبكية عبر كابل الإيثرنت (Cable EtherNet)")
    parser.add_argument("--ip", default=DEFAULT_DEVICE_IP, help="عنوان IP لجهاز البصمة الشبكي (افتراضي: 192.168.1.201)")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="منفذ الاتصال (4370، 4444، 8888، أو الاحتياطي 5003)")
    parser.add_argument("--api", default=DEFAULT_API_URL, help="رابط نقطة نهاية API الحضور")
    parser.add_argument("--test", action="store_true", help="فحص الاتصال فقط دون استماع مستمر")
    args = parser.parse_args()

    print("=" * 65)
    print("🚀 Restaurant Ethernet Biometric Hardware Bridge (Cable EtherNet)")
    print(f"📌 المنافذ المدعومة: 4370 | 4444 | 8888 | المنفذ الاحتياطي: {BACKUP_PORT}")
    print("=" * 65)

    bridge = ZKTecoEthernetBridge(ip=args.ip, port=args.port)

    if args.test:
        connected = bridge.connect()
        if connected:
            print(f"🎉 فحص الاتصال ناجح! جهاز البصمة يعمل عبر كابل الإيثرنت على المنفذ: {bridge.active_port}")
        else:
            print(f"❌ فشل فحص الاتصال بجهاز البصمة {args.ip}. تأكد من توصيل كابل الإيثرنت (Cable EtherNet).")
    else:
        bridge.listen_live_events(api_url=args.api)
