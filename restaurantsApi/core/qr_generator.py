import base64
import io
from datetime import datetime
from decimal import Decimal
from typing import Optional, Union, Dict, Any
from django.utils import timezone


def encode_tlv(tag: int, value: Union[str, float, int, Decimal]) -> bytes:
    """
    تحويل الحقل إلى صيغة Tag-Length-Value المتوافقة مع معيار الفاتورة الإلكترونية ZATCA
    - Tag: 1 byte
    - Length: 1 byte
    - Value: UTF-8 encoded bytes
    """
    val_bytes = str(value).encode('utf-8')
    tag_byte = bytes([tag])
    len_byte = bytes([len(val_bytes)])
    return tag_byte + len_byte + val_bytes


def generate_zatca_tlv_base64(
    seller_name: str,
    tax_number: str,
    invoice_date: Union[datetime, str],
    total_amount: Union[float, Decimal, str],
    tax_amount: Union[float, Decimal, str]
) -> str:
    """
    توليد نص التشفير TLV Base64 للفاتورة الإلكترونية وفق المعايير المحاسبية:
    Tag 1: اسم المنشأة / المورد
    Tag 2: الرقم الضريبي للمنشأة
    Tag 3: وقت وتاريخ الفاتورة بتنسيق ISO 8601
    Tag 4: إجمالي الفاتورة شاملاً الضريبة
    Tag 5: مبلغ ضريبة القيمة المضافة
    """
    seller_str = (seller_name or "My Restaurant").strip()
    tax_no_str = (tax_number or "300000000000003").strip()

    if isinstance(invoice_date, datetime):
        date_str = invoice_date.strftime("%Y-%m-%dT%H:%M:%SZ")
    else:
        date_str = str(invoice_date)

    tot_float = float(total_amount or 0.0)
    tax_float = float(tax_amount or 0.0)

    tot_str = f"{tot_float:.2f}"
    tax_str = f"{tax_float:.2f}"

    tlv_data = (
        encode_tlv(1, seller_str) +
        encode_tlv(2, tax_no_str) +
        encode_tlv(3, date_str) +
        encode_tlv(4, tot_str) +
        encode_tlv(5, tax_str)
    )

    return base64.b64encode(tlv_data).decode('ascii')


def generate_qr_image_data_url(data_text: str, box_size: int = 4, border: int = 1) -> str:
    """
    توليد صورة QR Code بصيغة Data URL (PNG Base64) قابلة للعرض مباشرة في المتصفح أو الطباعة الحرارية
    """
    try:
        import qrcode
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=box_size,
            border=border,
        )
        qr.add_data(data_text)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("ascii")
        return f"data:image/png;base64,{img_str}"
    except Exception as e:
        return ""


def get_order_qr_data(order, settings=None) -> Dict[str, Any]:
    """
    دالة مساعدة لحساب واستخراج بيانات رمز الاستجابة السريعة (QR Code) لطلب محدد
    """
    if settings is None:
        try:
            from core.models import RestaurantSettings
            settings = RestaurantSettings.load()
        except Exception:
            settings = None

    seller_name = getattr(settings, 'name', "My Restaurant") if settings else "My Restaurant"
    tax_number = getattr(settings, 'tax_number', "") if settings else ""
    tax_rate = float(getattr(settings, 'tax_rate', 0.0) or 0.0) if settings else 0.0

    total_amount = float(order.total_amount or 0.0)

    # حساب مبلغ الضريبة بناءً على نسبة الضريبة في الإعدادات
    if tax_rate > 0:
        tax_amount = round(total_amount * (tax_rate / (100.0 + tax_rate)), 2)
    else:
        tax_amount = 0.0

    date_val = order.order_date_time if order.order_date_time else timezone.now()

    tlv_base64 = generate_zatca_tlv_base64(
        seller_name=seller_name,
        tax_number=tax_number,
        invoice_date=date_val,
        total_amount=total_amount,
        tax_amount=tax_amount
    )

    qr_image_url = generate_qr_image_data_url(tlv_base64)

    return {
        "tlv_base64": tlv_base64,
        "qr_image_url": qr_image_url,
        "seller_name": seller_name,
        "tax_number": tax_number,
        "total_amount": total_amount,
        "tax_amount": tax_amount,
        "tax_rate": tax_rate,
        "invoice_date": date_val.isoformat() if hasattr(date_val, 'isoformat') else str(date_val)
    }
