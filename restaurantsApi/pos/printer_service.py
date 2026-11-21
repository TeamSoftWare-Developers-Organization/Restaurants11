"""
pos/printer_service.py - Silent ESC/POS Raw Thermal Receipt Printer & Cash Drawer Service for RestoERP
Supports Windows Spooler via win32print or native ctypes winspool.drv fallback.
Renders receipts as 1-bit monochrome raster images to prevent corrupted Arabic text on thermal printers.
"""

import os
import sys
import ctypes
from ctypes import wintypes
from typing import Optional, List, Dict, Any
from PIL import Image, ImageDraw, ImageFont

# ESC/POS Hardware Commands
ESC_INIT = b"\x1b\x40"                      # ESC @ (Initialize printer)
ESC_OPEN_DRAWER = b"\x1b\x70\x00\x19\xfa"   # ESC p 0 25 250 (Cash drawer kick pulse on Pin 2)
GS_CUT_PAPER = b"\x1d\x56\x42\x00"          # GS V 66 0 (Feed and partial paper cut)

# Windows Spooler Types for ctypes fallback
class DOC_INFO_1W(ctypes.Structure):
    _fields_ = [
        ("pDocName", wintypes.LPCWSTR),
        ("pOutputFile", wintypes.LPCWSTR),
        ("pDatatype", wintypes.LPCWSTR),
    ]


def get_default_printer() -> str:
    """Returns the default Windows printer name."""
    try:
        import win32print
        return win32print.GetDefaultPrinter()
    except Exception:
        pass

    try:
        winspool = ctypes.WinDLL("winspool.drv")
        buf_size = wintypes.DWORD(0)
        winspool.GetDefaultPrinterW(None, ctypes.byref(buf_size))
        if buf_size.value > 0:
            buf = ctypes.create_unicode_buffer(buf_size.value)
            if winspool.GetDefaultPrinterW(buf, ctypes.byref(buf_size)):
                return buf.value
    except Exception as e:
        print(f"[PrinterService] Error getting default printer: {e}")

    return ""


def list_printers() -> List[str]:
    """Returns a list of all installed printer names on the local machine."""
    try:
        import win32print
        printers = win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS)
        return [p[2] for p in printers]
    except Exception:
        pass

    try:
        winspool = ctypes.WinDLL("winspool.drv")
        PRINTER_ENUM_LOCAL = 0x00000002
        PRINTER_ENUM_CONNECTIONS = 0x00000004

        cbBuf = wintypes.DWORD(0)
        pcReturned = wintypes.DWORD(0)
        winspool.EnumPrintersW(PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS, None, 2, None, 0, ctypes.byref(cbBuf), ctypes.byref(pcReturned))

        if cbBuf.value > 0:
            buf = (ctypes.c_byte * cbBuf.value)()
            if winspool.EnumPrintersW(PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS, None, 2, buf, cbBuf, ctypes.byref(cbBuf), ctypes.byref(pcReturned)):
                # We can fallback to wmic / powershell if needed or return default
                pass
    except Exception:
        pass

    default_p = get_default_printer()
    return [default_p] if default_p else []


def print_raw_receipt(printer_name: Optional[str], escpos_payload: bytes, open_drawer: bool = True) -> bool:
    """
    Sends raw ESC/POS bytes directly to the specified or default Windows thermal printer.
    Bypasses all Windows UI dialogs for zero-click instant cashier operation.
    """
    target_printer = printer_name or get_default_printer()
    if not target_printer:
        raise RuntimeError("لم يتم العثور على أي طابعة مثبتة أو افتراضية في نظام ويندوز.")

    # 1. Try win32print if available
    try:
        import win32print
        h_printer = win32print.OpenPrinter(target_printer)
        try:
            win32print.StartDocPrinter(h_printer, 1, ("POS_Receipt", None, "RAW"))
            win32print.StartPagePrinter(h_printer)

            win32print.WritePrinter(h_printer, ESC_INIT)

            if open_drawer:
                win32print.WritePrinter(h_printer, ESC_OPEN_DRAWER)

            win32print.WritePrinter(h_printer, escpos_payload)
            win32print.WritePrinter(h_printer, b"\n\n\n" + GS_CUT_PAPER)

            win32print.EndPagePrinter(h_printer)
            win32print.EndDocPrinter(h_printer)
            return True
        finally:
            win32print.ClosePrinter(h_printer)
    except ImportError:
        pass

    # 2. Native Win32 Spooler Fallback via ctypes (Zero Dependency)
    try:
        winspool = ctypes.WinDLL("winspool.drv")
        h_printer = wintypes.HANDLE()

        if not winspool.OpenPrinterW(target_printer, ctypes.byref(h_printer), None):
            raise RuntimeError(f"تعذر فتح الطابعة: {target_printer} (Win32 Error: {ctypes.GetLastError()})")

        try:
            doc_info = DOC_INFO_1W("POS_Receipt", None, "RAW")
            if not winspool.StartDocPrinterW(h_printer, 1, ctypes.byref(doc_info)):
                raise RuntimeError(f"تعذر بدء مهمة الطباعة لـ {target_printer}")

            if not winspool.StartPagePrinter(h_printer):
                raise RuntimeError(f"تعذر بدء صفحة الطباعة لـ {target_printer}")

            def _write(raw: bytes):
                written = wintypes.DWORD(0)
                winspool.WritePrinter(h_printer, raw, len(raw), ctypes.byref(written))

            _write(ESC_INIT)

            if open_drawer:
                _write(ESC_OPEN_DRAWER)

            _write(escpos_payload)
            _write(b"\n\n\n" + GS_CUT_PAPER)

            winspool.EndPagePrinter(h_printer)
            winspool.EndDocPrinter(h_printer)
            return True
        finally:
            winspool.ClosePrinter(h_printer)

    except Exception as e:
        print(f"[PrinterService] Printing error: {e}")
        raise e


def image_to_escpos(image: Image.Image) -> bytes:
    """
    Converts a PIL image to standard ESC/POS GS v 0 raster bit-image payload.
    Compatible with Epson, Xprinter, Rongta, Bixolon, etc.
    """
    bw = image.convert("1")
    width, height = bw.size

    # Byte-aligned width (multiple of 8)
    width_bytes = (width + 7) // 8
    padded_width = width_bytes * 8
    if width != padded_width:
        new_img = Image.new("1", (padded_width, height), 1)
        new_img.paste(bw, (0, 0))
        bw = new_img

    raw_bytes = bw.tobytes()
    # Invert bits: PIL mode 1 has 0=black, 1=white. ESC/POS raster expects 1=dot, 0=blank.
    inverted = bytes(~b & 0xFF for b in raw_bytes)

    # GS v 0 Header: \x1d\x76\x30\x00 xL xH yL yH
    xL = width_bytes & 0xFF
    xH = (width_bytes >> 8) & 0xFF
    yL = height & 0xFF
    yH = (height >> 8) & 0xFF

    header = b"\x1d\x76\x30\x00" + bytes([xL, xH, yL, yH])
    return header + inverted


def render_receipt_image(order_data: Dict[str, Any], settings: Optional[Dict[str, Any]] = None, width_dots: int = 576) -> Image.Image:
    """
    Renders an order receipt into a high-contrast 1-bit bitmap using Windows GDI.
    Ensures 100% bit-exact Arabic text shaping, correct RTL ordering, and crisp thermal output.
    576 dots = 80mm paper (203 DPI)
    384 dots = 58mm paper (203 DPI)
    """
    gdi32 = ctypes.windll.gdi32
    user32 = ctypes.windll.user32

    # Calculate approximate height
    items = order_data.get("items", [])
    num_items = max(1, len(items))
    estimated_height = 280 + (num_items * 45) + 200

    hdc = user32.GetDC(0)
    mem_dc = gdi32.CreateCompatibleDC(hdc)

    class BITMAPINFOHEADER(ctypes.Structure):
        _fields_ = [
            ('biSize', wintypes.DWORD),
            ('biWidth', wintypes.LONG),
            ('biHeight', wintypes.LONG),
            ('biPlanes', wintypes.WORD),
            ('biBitCount', wintypes.WORD),
            ('biCompression', wintypes.DWORD),
            ('biSizeImage', wintypes.DWORD),
            ('biXPelsPerMeter', wintypes.LONG),
            ('biYPelsPerMeter', wintypes.LONG),
            ('biClrUsed', wintypes.DWORD),
            ('biClrImportant', wintypes.DWORD),
        ]

    bmi = BITMAPINFOHEADER()
    bmi.biSize = ctypes.sizeof(BITMAPINFOHEADER)
    bmi.biWidth = width_dots
    bmi.biHeight = -estimated_height  # Top-down DIB
    bmi.biPlanes = 1
    bmi.biBitCount = 32
    bmi.biCompression = 0

    p_bits = ctypes.c_void_p()
    h_bitmap = gdi32.CreateDIBSection(mem_dc, ctypes.byref(bmi), 0, ctypes.byref(p_bits), None, 0)
    gdi32.SelectObject(mem_dc, h_bitmap)

    # Fill white background
    rect_all = wintypes.RECT(0, 0, width_dots, estimated_height)
    white_brush = gdi32.CreateSolidBrush(0x00FFFFFF)
    user32.FillRect(mem_dc, ctypes.byref(rect_all), white_brush)

    # Create Fonts
    h_font_title = gdi32.CreateFontW(32, 0, 0, 0, 700, 0, 0, 0, 1, 0, 0, 0, 0, "Tahoma")
    h_font_bold = gdi32.CreateFontW(24, 0, 0, 0, 700, 0, 0, 0, 1, 0, 0, 0, 0, "Tahoma")
    h_font_regular = gdi32.CreateFontW(22, 0, 0, 0, 400, 0, 0, 0, 1, 0, 0, 0, 0, "Tahoma")

    gdi32.SetTextColor(mem_dc, 0x00000000)
    gdi32.SetBkMode(mem_dc, 1)  # TRANSPARENT

    DT_RIGHT = 0x00000002
    DT_LEFT = 0x00000000
    DT_CENTER = 0x00000001
    DT_RTLREADING = 0x00020000
    DT_SINGLELINE = 0x00000020
    DT_VCENTER = 0x00000004

    def draw_text(txt: str, y: int, h: int, font_h, align: str = "center"):
        gdi32.SelectObject(mem_dc, font_h)
        flags = DT_SINGLELINE | DT_VCENTER | DT_RTLREADING
        if align == "center":
            flags |= DT_CENTER
            r = wintypes.RECT(10, y, width_dots - 10, y + h)
        elif align == "right":
            flags |= DT_RIGHT
            r = wintypes.RECT(10, y, width_dots - 10, y + h)
        else:
            flags |= DT_LEFT
            r = wintypes.RECT(10, y, width_dots - 10, y + h)
        user32.DrawTextW(mem_dc, str(txt), len(str(txt)), ctypes.byref(r), flags)

    def draw_line(y: int):
        pen = gdi32.CreatePen(0, 1, 0x00000000)
        old_pen = gdi32.SelectObject(mem_dc, pen)
        gdi32.MoveToEx(mem_dc, 10, y, None)
        gdi32.LineTo(mem_dc, width_dots - 10, y)
        gdi32.SelectObject(mem_dc, old_pen)
        gdi32.DeleteObject(pen)

    # 1. Header (Restaurant Info)
    restaurant_name = (settings.get("name") if settings else None) or "مطعمنا"
    tax_number = (settings.get("tax_number") if settings else "") or ""
    curr = (settings.get("currency") if settings else None) or "د.ل"

    y = 15
    draw_text(restaurant_name, y, 40, h_font_title, "center")
    y += 45
    draw_text("فاتورة مبيعات ضريبية مبسطة", y, 28, h_font_bold, "center")
    y += 32
    if tax_number:
        draw_text(f"الرقم الضريبي: {tax_number}", y, 24, h_font_regular, "center")
        y += 28

    draw_line(y)
    y += 10

    # 2. Order Metadata
    order_id = order_data.get("order_number") or order_data.get("id", "---")
    date_str = str(order_data.get("order_date_time") or order_data.get("created_at") or "")[:19]
    cashier = order_data.get("cashier_name") or "كاشير عام"
    table_num = order_data.get("table_number") or "سفري"

    draw_text(f"رقم الفاتورة: #{order_id}", y, 26, h_font_bold, "right")
    y += 28
    draw_text(f"التاريخ: {date_str}", y, 24, h_font_regular, "right")
    y += 26
    draw_text(f"الكاشير: {cashier} | الخدمة: {table_num}", y, 24, h_font_regular, "right")
    y += 30

    draw_line(y)
    y += 10

    # 3. Table Header
    gdi32.SelectObject(mem_dc, h_font_bold)
    # Right: Item name, Center: Qty, Left: Total
    r_item = wintypes.RECT(width_dots // 2, y, width_dots - 10, y + 26)
    r_qty = wintypes.RECT(width_dots // 4, y, width_dots // 2, y + 26)
    r_price = wintypes.RECT(10, y, width_dots // 4, y + 26)

    user32.DrawTextW(mem_dc, "الصنف", len("الصنف"), ctypes.byref(r_item), DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_RTLREADING)
    user32.DrawTextW(mem_dc, "الكمية", len("الكمية"), ctypes.byref(r_qty), DT_CENTER | DT_VCENTER | DT_SINGLELINE | DT_RTLREADING)
    user32.DrawTextW(mem_dc, "الإجمالي", len("الإجمالي"), ctypes.byref(r_price), DT_LEFT | DT_VCENTER | DT_SINGLELINE)
    y += 30
    draw_line(y)
    y += 10

    # 4. Item Rows
    for it in items:
        name = it.get("name") or (it.get("menu_item", {}).get("name") if isinstance(it.get("menu_item"), dict) else None) or "صنف"
        qty = it.get("quantity", 1)
        price = float(it.get("unit_price") or it.get("price") or (it.get("menu_item", {}).get("price") if isinstance(it.get("menu_item"), dict) else 0) or 0)
        row_total = price * qty

        gdi32.SelectObject(mem_dc, h_font_regular)
        r_item = wintypes.RECT(width_dots // 2, y, width_dots - 10, y + 26)
        r_qty = wintypes.RECT(width_dots // 4, y, width_dots // 2, y + 26)
        r_price = wintypes.RECT(10, y, width_dots // 4, y + 26)

        user32.DrawTextW(mem_dc, name, len(name), ctypes.byref(r_item), DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_RTLREADING)
        user32.DrawTextW(mem_dc, str(qty), len(str(qty)), ctypes.byref(r_qty), DT_CENTER | DT_VCENTER | DT_SINGLELINE)
        user32.DrawTextW(mem_dc, f"{row_total:.2f}", len(f"{row_total:.2f}"), ctypes.byref(r_price), DT_LEFT | DT_VCENTER | DT_SINGLELINE)
        y += 28

    draw_line(y)
    y += 12

    # 5. Totals
    total_amount = float(order_data.get("total_amount", 0))
    discount = float(order_data.get("discount_amount", 0))
    tax = float(order_data.get("tax_amount", 0))

    draw_text(f"المجموع الكلي: {total_amount:.2f} {curr}", y, 32, h_font_title, "center")
    y += 38

    if discount > 0:
        draw_text(f"الخصم: {discount:.2f} {curr}", y, 24, h_font_regular, "center")
        y += 26
    if tax > 0:
        draw_text(f"شامل ضريبة القيمة المضافة: {tax:.2f} {curr}", y, 24, h_font_regular, "center")
        y += 26

    draw_line(y)
    y += 12

    draw_text("شكراً لزيارتكم! نتشرف بخدمتكم دائماً", y, 26, h_font_bold, "center")
    y += 35

    final_height = y + 20

    # Extract Bitmap buffer
    buf = (ctypes.c_char * (width_dots * estimated_height * 4)).from_address(p_bits.value)
    raw_img = Image.frombuffer('RGBA', (width_dots, estimated_height), buf, 'raw', 'BGRA', 0, 1)

    # Crop to exact height
    cropped_img = raw_img.crop((0, 0, width_dots, final_height))

    # Cleanup GDI handles
    gdi32.DeleteObject(h_font_title)
    gdi32.DeleteObject(h_font_bold)
    gdi32.DeleteObject(h_font_regular)
    gdi32.DeleteObject(white_brush)
    gdi32.DeleteObject(h_bitmap)
    gdi32.DeleteDC(mem_dc)
    user32.ReleaseDC(0, hdc)

    return cropped_img.convert("1")


def print_order_receipt(order_data: Dict[str, Any], printer_name: Optional[str] = None, open_drawer: bool = True, paper_width: str = "80mm", settings: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    High-level API: Renders an order into an ESC/POS raster image and sends it silently to the printer.
    """
    target_printer = printer_name or get_default_printer()
    if not target_printer:
        return {"success": False, "message": "لم يتم العثور على طابعة افتراضية مثبتة في ويندوز."}

    width_dots = 384 if paper_width == "58mm" else 576

    try:
        receipt_img = render_receipt_image(order_data, settings=settings, width_dots=width_dots)
        escpos_bytes = image_to_escpos(receipt_img)
        print_raw_receipt(target_printer, escpos_bytes, open_drawer=open_drawer)
        return {
            "success": True,
            "printer": target_printer,
            "message": f"تمت الطباعة بنجاح على {target_printer}"
        }
    except Exception as e:
        return {
            "success": False,
            "printer": target_printer,
            "message": f"فشلت الطباعة: {str(e)}"
        }
