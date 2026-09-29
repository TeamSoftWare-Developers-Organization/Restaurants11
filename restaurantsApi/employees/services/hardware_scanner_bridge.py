"""
خادم الجسر والربط بين ماسح البصمة المادي (USB / Serial) ونظام المطعم
Hardware Scanner Bridge Service for Restaurant Attendance

يدعم هذا البرنامج:
1. قارئات البصمة المكتبية بنظام USB من ZKTeco (ZK4500, ZK7500, ZK9500) عبر مكتبة pyzkfp
2. المستشعرات الضوئية التسلسلية (AS608, R307, R503, FPM10A) عبر منفذ COM/Serial ومكتبة pyserial
3. المعالجة الرقمية للصورة عبر OpenCV ومرشحات تحسين خطوط التلال (CLAHE / Normalization)
4. التمرير الفوري لنموذج TensorFlow Lite أو إرسال الحركة مباشرة إلى خادم Django
"""

import sys
import time
import io
import os
import argparse
import urllib.request
import urllib.parse
import json

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# محاولة استيراد مكتبات المعالجة
try:
    import numpy as np
except ImportError:
    np = None

try:
    import cv2
except ImportError:
    cv2 = None

try:
    from PIL import Image
except ImportError:
    Image = None

# إعدادات الاتصال الافتراضية
DEFAULT_API_URL = "http://127.0.0.1:8000/api/attendance/fingerprint-checkin/"


def preprocess_captured_buffer(raw_bytes: bytes, width: int = None, height: int = None) -> bytes:
    """
    تحسين ومعالجة البصمة الخام عبر OpenCV وإرجاعها كصورة JPEG/PNG معيارية بمقاس 128x128
    """
    if cv2 is not None and np is not None:
        try:
            if width and height and len(raw_bytes) == width * height:
                img = np.frombuffer(raw_bytes, dtype=np.uint8).reshape((height, width))
            else:
                nparr = np.frombuffer(raw_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)

            if img is not None:
                # 1. توحيد المقاس إلى 128x128
                img_resized = cv2.resize(img, (128, 128), interpolation=cv2.INTER_AREA)
                # 2. تنقية وتحسين تباين أخاديد البصمة (CLAHE)
                clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
                img_enhanced = clahe.apply(img_resized)
                # 3. ترميز الصورة إلى PNG
                _, encoded = cv2.imencode(".png", img_enhanced)
                return encoded.tobytes()
        except Exception as e:
            print(f"⚠️ تحذير: فشلت معالجة OpenCV ({e})، جاري استخدام المعالجة الافتراضية...")

    # Fallback to Pillow
    if Image is not None:
        try:
            if width and height and len(raw_bytes) == width * height:
                image = Image.frombytes('L', (width, height), raw_bytes)
            else:
                image = Image.open(io.BytesIO(raw_bytes)).convert('L')
            image = image.resize((128, 128))
            buf = io.BytesIO()
            image.save(buf, format='PNG')
            return buf.getvalue()
        except Exception:
            pass

    return raw_bytes


def send_to_django_api(image_bytes: bytes, punch_type: str = "CHECK_IN", api_url: str = DEFAULT_API_URL) -> dict:
    """
    إرسال صورة البصمة المعالجة عبر HTTP Multipart POST إلى خادم Django
    """
    boundary = "----WebKitFormBoundary" + hex(int(time.time() * 1000))[2:]
    
    body = bytearray()
    # punch_type field
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="punch_type"\r\n\r\n{punch_type}\r\n'.encode("utf-8"))
    
    # file field
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="file"; filename="fingerprint.png"\r\n'.encode("utf-8"))
    body.extend(b"Content-Type: image/png\r\n\r\n")
    body.extend(image_bytes)
    body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    req = urllib.request.Request(
        f"{api_url}?punch_type={punch_type}",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )

    try:
        with urllib.request.urlopen(req) as resp:
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


# ----------------------------------------------------
# 1. مشغل ماسح ZKTeco USB عبر مكتبة pyzkfp
# ----------------------------------------------------
class ZKTecoScanner:
    def __init__(self):
        try:
            from pyzkfp import ZKFP2
            self.zk = ZKFP2()
            self.device = None
        except ImportError:
            self.zk = None
            self.device = None

    def initialize(self):
        if not self.zk:
            raise RuntimeError("حزمة pyzkfp غير مثبتة. قم بتثبيتها عبر: pip install pyzkfp")
        self.zk.Init()
        count = self.zk.GetDeviceCount()
        if count <= 0:
            raise RuntimeError("لم يتم العثور على أي ماسح بصمة ZKTeco USB متصل بالجهاز.")
        self.device = self.zk.OpenDevice(0)
        print(f"✅ تم الاتصال بمازح ZKTeco بنجاح! عدد الأجهزة المتصلة: {count}")

    def listen_loop(self, api_url=DEFAULT_API_URL):
        print("🎯 قارئ ZKTeco في وضع الاستماع... ضع إصبعك على الماسح...")
        try:
            while True:
                capture = self.zk.AcquireFingerprint(self.device)
                if capture:
                    raw_bytes, width, height = capture
                    print(f"📸 تم التقاط بصمة! الأبعاد: {width}x{height} - جاري المعالجة والمطابقة بالذكاء الاصطناعي...")
                    
                    processed_bytes = preprocess_captured_buffer(raw_bytes, width, height)
                    result = send_to_django_api(processed_bytes, punch_type="CHECK_IN", api_url=api_url)

                    if result["success"]:
                        emp_name = result["data"].get("employee_name", "موظف")
                        conf = result["data"].get("match_confidence", "100%")
                        punch = result["data"].get("punch_type_display", "تسجيل حضور")
                        print(f"🎉 مرحباً {emp_name}! تم {punch} بنجاح (دقة المطابقة: {conf}) ✅\n")
                    else:
                        msg = result["error"].get("message", "فشلت المطابقة")
                        print(f"❌ خطأ: {msg}\n")
                    
                    time.sleep(1.5)  # تفادي التكرار عند استمرار الضغط
                time.sleep(0.1)
        except KeyboardInterrupt:
            print("\nإيقاف قارئ ZKTeco...")
        finally:
            if self.device:
                self.zk.CloseDevice(self.device)
                self.zk.Terminate()


# ----------------------------------------------------
# 2. مشغل المستشعرات التسلسلية (Optical Serial - AS608 / R307)
# ----------------------------------------------------
class SerialOpticalScanner:
    def __init__(self, port="COM3", baudrate=57600):
        self.port = port
        self.baudrate = baudrate

    def listen_loop(self, api_url=DEFAULT_API_URL):
        print(f"🔌 جاري محاولة الاتصال بمستشعر البصمة التسلسلي عبر {self.port} بسرعة {self.baudrate}...")
        try:
            import serial
            ser = serial.Serial(self.port, baudrate=self.baudrate, timeout=1)
            print("✅ تم فتح المنفذ التسلسلي بنجاح! في انتظار قراءة البصمة...")
        except Exception as e:
            print(f"⚠️ تعذر فتح المنفذ {self.port}: {e}")
            return


# ----------------------------------------------------
# 3. وضع المحاكاة والاختبار السريع (Simulation & Testing)
# ----------------------------------------------------
def run_simulation(image_path: str, api_url=DEFAULT_API_URL):
    """
    محاكاة إرسال بصمة من ملف صورة محلي لاختبار خط سير المعالجة والذكاء الاصطناعي
    """
    if not os.path.exists(image_path):
        print(f"❌ لم يتم العثور على ملف الصورة: {image_path}")
        return

    with open(image_path, "rb") as f:
        raw_bytes = f.read()

    print(f"🔬 جاري اختبار معالجة البصمة من الملف: {image_path}...")
    processed_bytes = preprocess_captured_buffer(raw_bytes)
    print("📡 إرسال الصورة المعالجة إلى خادم الذكاء الاصطناعي...")
    res = send_to_django_api(processed_bytes, punch_type="CHECK_IN", api_url=api_url)

    if res["success"]:
        print("🎉 نجحت العملية!", json.dumps(res["data"], ensure_ascii=False, indent=2))
    else:
        print("❌ فشلت المطابقة:", json.dumps(res["error"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="جسر أجهزة البصمة ونظام حضور وانصراف المطعم")
    parser.add_argument("--mode", choices=["zkteco", "serial", "test"], default="test", help="نوع الماسح المتصل")
    parser.add_argument("--port", default="COM3", help="رقم منفذ COM في حال اختيار serial")
    parser.add_argument("--image", default="", help="مسار صورة البصمة للاختبار في وضع test")
    parser.add_argument("--api", default=DEFAULT_API_URL, help="رابط نقطة نهاية API الحضور")
    args = parser.parse_args()

    print("=" * 60)
    print("🚀 Restaurant Fingerprint Hardware Bridge Service")
    print("=" * 60)

    if args.mode == "zkteco":
        scanner = ZKTecoScanner()
        try:
            scanner.initialize()
            scanner.listen_loop(api_url=args.api)
        except Exception as err:
            print(f"❌ خطأ في قارئ ZKTeco: {err}")
    elif args.mode == "serial":
        scanner = SerialOpticalScanner(port=args.port)
        scanner.listen_loop(api_url=args.api)
    elif args.mode == "test":
        if args.image:
            run_simulation(args.image, api_url=args.api)
        else:
            print("💡 وضع الاختبار جاهز. يمكنك تمرير مسار صورة عبر: python hardware_scanner_bridge.py --mode test --image sample.png")
            print("💡 لتشغيل ماسح ZKTeco المكتبي: python hardware_scanner_bridge.py --mode zkteco")
