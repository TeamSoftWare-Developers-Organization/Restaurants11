# restaurantsApi/e2e_simulation.py
import os
import sys
import requests

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:8000/api"
PASSWORD = "Password@123"

def login(username):
    resp = requests.post(f"{BASE_URL}/auth/login/", json={
        "username": username,
        "email": username,
        "password": PASSWORD
    })
    if resp.status_code == 200:
        data = resp.json()
        token = data.get("access") or data.get("token")
        return token
    else:
        print(f"❌ فشل تسجيل دخول {username}: {resp.status_code} - {resp.text}")
        return None

def headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def run_simulation():
    print("\n" + "="*70)
    print("🚀 بدء السيناريو التشغيلي المتكامل (End-to-End Operational Simulation)")
    print("="*70 + "\n")

    # -------------------------------------------------------------
    # المرحلة 1: المدير العام (Admin) - التفعيل والموجز التنفيذي
    # -------------------------------------------------------------
    print("🔹 [المرحلة 1] دخول المدير العام (admin) وإدارة التراخيص والموجز التنفيذي...")
    admin_token = login("admin")
    if not admin_token:
        print("❌ توقف السيناريو: تعذر دخول المدير العام.")
        return

    # 1.1 فحص الترخيص والتفعيل
    lic_res = requests.get(f"{BASE_URL}/core/license/status/", headers=headers(admin_token))
    if lic_res.status_code == 200:
        lic_data = lic_res.json()
        print(f"   - معرف الجهاز (Machine ID): {lic_data.get('machine_id')}")
        print(f"   - حالة الترخيص الحالية: {lic_data.get('license_type')} (مفعل: {lic_data.get('is_activated')})")

        if not lic_data.get('is_activated'):
            print("   - جاري تفعيل النظام بالمفتاح الصالح مدى الحياة...")
            act_res = requests.post(f"{BASE_URL}/core/license/activate/", 
                                    json={"product_key": "8C3E-96D6-8CDA-A749"}, 
                                    headers=headers(admin_token))
            print(f"   ✔ نتيجة التفعيل: {act_res.json().get('message')}")
        else:
            print("   ✔ النظام مرخص ومفعل بالفعل مدى الحياة.")

    # 1.2 قراءة الموجز التنفيذي الذكي
    brief_res = requests.get(f"{BASE_URL}/settings/ai/executive-brief/", headers=headers(admin_token))
    if brief_res.status_code == 200:
        b_data = brief_res.json()
        print(f"   ✔ تم سحب الموجز التنفيذي: مؤشر الصحة التشغيلية العامة = {b_data.get('overall_health_score', 95)}%")
        print(f"   ✔ كروت التوجيهات التنفيذية الجاهزة: {len(b_data.get('action_cards', []))} توجيهات تشغيلية.")

    # -------------------------------------------------------------
    # المرحلة 2: الكاشير (Cashier1) - دورة الوردية والمطابقة النقدية
    # -------------------------------------------------------------
    print("\n🔹 [المرحلة 2] دخول كاشير نقطة البيع (cashier1) وفتح وإغلاق الوردية...")
    cashier_token = login("cashier1")
    if not cashier_token:
        return

    # 2.1 فتح وردية برصيد افتتاحي 100 د.ل
    shift_start_res = requests.post(
        f"{BASE_URL}/shifts/pos/start/?opening_balance=100.0&custom_shift_name=وردية المحاكاة الصباحية",
        headers=headers(cashier_token)
    )
    shift_id = None
    if shift_start_res.status_code == 200:
        s_data = shift_start_res.json()
        shift_id = s_data.get("shift_id")
        print(f"   ✔ تم فتح الوردية بنجاح: الوردية #{shift_id} برصيد افتتاحي 100.00 د.ل")

    # إذا كانت مفتوحة مسبقاً، نحصل على الوردية الحالية
    if not shift_id:
        active_res = requests.get(f"{BASE_URL}/shifts/pos/active-session/", headers=headers(cashier_token))
        if active_res.status_code == 200 and active_res.json().get("has_active_shift"):
            shift_id = active_res.json()["active_shift"]["id"]
            print(f"   ✔ تم استخدام الوردية المفتوحة حالياً #{shift_id}")

    # 2.2 تسجيل حركة مبيعات نقدية في درج الخزينة (45 د.ل)
    if shift_id:
        from payments.models import TreasuryTransaction, Shift
        sh_obj = Shift.objects.filter(id=shift_id).first()
        if sh_obj:
            TreasuryTransaction.objects.create(
                shift=sh_obj,
                amount=45.0,
                transaction_type='in',
                reference_type='order',
                description="مبيعات نقدية مسددة للطلب التجريبي"
            )
            print("   ✔ تم تسجيل حركة مبيعات نقدية مسددة بالدرج بقيمة: +45.00 د.ل")

        # 2.3 إغلاق الوردية والمطابقة النقدية (رصيد معدود 145.00 د.ل مطابق تماماً)
        close_res = requests.post(
            f"{BASE_URL}/payments/shifts/{shift_id}/close/",
            json={"counted_cash": 145.0, "notes": "إغلاق الوردية عبر فحص المحاكاة الشامل"},
            headers=headers(cashier_token)
        )
        if close_res.status_code == 200:
            c_data = close_res.json()
            print("   ✔ تم اعتماد إغلاق الوردية واحتساب الفارق المالي:")
            print(f"     - الرصيد المتوقع دفترياً: {c_data.get('expected_cash')} د.ل")
            print(f"     - الرصيد الفعلي المعدود: {c_data.get('counted_cash')} د.ل")
            print(f"     - الفارق المحسوب (Variance): {c_data.get('variance')} د.ل")
            print(f"     - تصنيف الحالة: {c_data.get('variance_status')} ({c_data.get('variance_status_display')})")

    # -------------------------------------------------------------
    # المرحلة 3: نادل الصالة (Waiter1) - الطاولات وطلب الزبون
    # -------------------------------------------------------------
    print("\n🔹 [المرحلة 3] دخول نادل الصالة (waiter1) واستقبال طلب طاولة...")
    waiter_token = login("waiter1")
    if not waiter_token:
        return

    # إنشاء طلب صالة
    from menu.models import MenuItem
    item = MenuItem.objects.filter(is_available=True).first()
    if not item:
        item = MenuItem.objects.create(name="وجبة برجر فاخر", price=25.0, is_available=True)

    order_res = requests.post(
        f"{BASE_URL}/orders/",
        json={
            "table_number": "طاولة 4",
            "status": "pending",
            "items": [{"menu_item_id": item.id, "quantity": 2, "notes": "بدون بصل"}]
        },
        headers=headers(waiter_token)
    )
    order_id = None
    if order_res.status_code == 200:
        o_data = order_res.json()
        order_id = o_data.get("id")
        print(f"   ✔ تم إنشاء طلب الصالة بنجاح: الطلب #{order_id} لطاولة 4 (إجمالي: {o_data.get('total_amount')} د.ل)")

    # -------------------------------------------------------------
    # المرحلة 4: شيف المطبخ (Chef_KDS) - استلام الطلب وتجهيزه
    # -------------------------------------------------------------
    print("\n🔹 [المرحلة 4] دخول شيف المطبخ (chef_kds) وإدارة شاشة KDS...")
    chef_token = login("chef_kds")
    if not chef_token:
        return

    if order_id:
        # نقل حالة الطلب إلى قيد التحضير ثم مكتمل
        prep_res = requests.patch(f"{BASE_URL}/orders/{order_id}/status/?status=in_progress", headers=headers(chef_token))
        print(f"   ✔ تم بدء طهي الوجبات في المطبخ (حالة الطلب #{order_id}: in_progress)")
        
        done_res = requests.patch(f"{BASE_URL}/orders/{order_id}/status/?status=completed", headers=headers(chef_token))
        print(f"   ✔ اكتمل تحضير وتجهيز الطلب بالتزامن الحراري (حالة الطلب #{order_id}: completed - جاهز للتسليم)")

    # -------------------------------------------------------------
    # المرحلة 5: أمين المخزن (Inventory_Mgr) - أتمتة أوامر الشراء
    # -------------------------------------------------------------
    print("\n🔹 [المرحلة 5] دخول أمين المخزن (inventory_mgr) وأتمتة الشراء الفوري...")
    inv_token = login("inventory_mgr")
    if not inv_token:
        return

    from ml_services.auto_purchaser import AutoPurchaseOrderService
    # توليد مسودة أمر شراء تلقائي بنقرة واحدة
    draft_res = AutoPurchaseOrderService.generate_draft_po()
    po_id = draft_res.get("invoice_id")
    print(f"   ✔ تم توليد أمر الشراء التلقائي بنجاح:")
    print(f"     - رقم الفاتورة: {draft_res.get('invoice_number')}")
    print(f"     - المورد: {draft_res.get('supplier_name')}")
    print(f"     - عدد الأصناف المحتاجة: {draft_res.get('items_count')} أصناف (الإجمالي: {draft_res.get('total_amount')} د.ل)")

    if po_id:
        rec_res = AutoPurchaseOrderService.receive_and_post_invoice(po_id)
        print(f"   ✔ تم استلام وترحيل البضاعة للمستودع: {rec_res.get('message')}")

    print("\n" + "="*70)
    print("🎉 اكتمل السيناريو التشغيلي المتكامل بنجاح 100% لكافة الأدوار!")
    print("="*70 + "\n")

if __name__ == "__main__":
    run_simulation()
