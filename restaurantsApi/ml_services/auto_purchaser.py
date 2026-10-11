from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from inventory.models import Ingredient, Supplier, PurchaseInvoice, PurchaseInvoiceItem
from ml_services.stock_forecaster import StockForecastingService


class AutoPurchaseOrderService:
    """
    محرك الأتمتة التلقائية لأوامر الشراء (One-Click Auto Purchase Orders)
    يقوم بفحص المواد المعرضة للنفاد وتوليد فاتورة شراء مسودة (Draft PO) تلقائياً
    """

    @classmethod
    def get_depleted_items_preview(cls):
        """
        استعراض المواد المعرضة للنفاد قبل توليد أمر الشراء
        """
        forecasts = StockForecastingService.analyze_stock_runway(lookback_days=7)
        depleted = []

        for f in forecasts:
            ing = Ingredient.objects.filter(id=f["ingredient_id"]).first()
            reorder_lvl = float(ing.reorder_level) if ing else 0.0
            
            is_critical = f["risk_level"] in ["CRITICAL", "WARNING"]
            is_below_reorder = float(f["current_stock"]) <= reorder_lvl and reorder_lvl > 0
            has_suggested_reorder = f["suggested_reorder_qty"] > 0

            if is_critical or is_below_reorder or has_suggested_reorder:
                qty = f["suggested_reorder_qty"]
                if qty <= 0:
                    qty = max(10.0, (reorder_lvl * 2) - float(f["current_stock"]))

                unit_cost = float(f["cost_per_unit"]) if float(f["cost_per_unit"]) > 0 else 10.0
                depleted.append({
                    "ingredient_id": f["ingredient_id"],
                    "name": f["name"],
                    "unit": f["unit"],
                    "current_stock": f["current_stock"],
                    "suggested_qty": round(qty, 2),
                    "unit_price": unit_cost,
                    "estimated_total": round(qty * unit_cost, 2),
                    "risk_level": f["risk_level"],
                    "days_left": f["days_left"]
                })

        if not depleted:
            low_stock_ings = Ingredient.objects.all().order_by('current_stock')[:5]
            for ing in low_stock_ings:
                reorder_lvl = float(ing.reorder_level)
                suggested = reorder_lvl * 2 if reorder_lvl > 0 else 10.0
                unit_cost = float(ing.cost_per_unit) if float(ing.cost_per_unit) > 0 else 5.0
                depleted.append({
                    "ingredient_id": ing.id,
                    "name": ing.name,
                    "unit": ing.unit,
                    "current_stock": float(ing.current_stock),
                    "suggested_qty": round(suggested, 2),
                    "unit_price": unit_cost,
                    "estimated_total": round(suggested * unit_cost, 2),
                    "risk_level": "WARNING" if float(ing.current_stock) <= reorder_lvl else "HEALTHY",
                    "days_left": None
                })

        return depleted

    @classmethod
    def generate_draft_po(cls, supplier_id: int = None, items_override: list = None):
        """
        توليد فاتورة شراء مسودة (Draft PO) بنقرة واحدة وتعيينها للمورد الافتراضي
        """
        supplier = None
        if supplier_id:
            supplier = Supplier.objects.filter(id=supplier_id).first()

        if not supplier:
            supplier = Supplier.objects.first()

        if not supplier:
            supplier = Supplier.objects.create(
                name="المورد الافتراضي المعتمد",
                company_name="شركة التوريدات الغذائية العامة",
                phone="0910000000",
                tax_number="VAT-DEFAULT-001"
            )

        items_to_order = items_override if items_override is not None else cls.get_depleted_items_preview()

        # في حال عدم وجود مواد حرجة حسب معدل الحرق، نختار المواد الأقل رصيداً
        if not items_to_order:
            low_stock_ings = Ingredient.objects.all().order_by('current_stock')[:5]
            items_to_order = [
                {
                    "ingredient_id": ing.id,
                    "name": ing.name,
                    "unit": ing.unit,
                    "current_stock": float(ing.current_stock),
                    "suggested_qty": float(ing.reorder_level) * 2 if ing.reorder_level > 0 else 10.0,
                    "unit_price": float(ing.cost_per_unit) if ing.cost_per_unit > 0 else 5.0,
                    "estimated_total": round(
                        (float(ing.reorder_level) * 2 if ing.reorder_level > 0 else 10.0) *
                        (float(ing.cost_per_unit) if ing.cost_per_unit > 0 else 5.0), 2
                    ),
                    "risk_level": "WARNING",
                    "days_left": None
                }
                for ing in low_stock_ings
            ]

        if not items_to_order:
            return {"status": "error", "message": "لا توجد مواد خام مسجلة في المخزن لطلبها."}

        with transaction.atomic():
            now_str = timezone.now().strftime("%Y%m%d%H%M%S")
            po_number = f"PO-AUTO-{now_str}"

            invoice = PurchaseInvoice.objects.create(
                invoice_number=po_number,
                supplier=supplier,
                paid_amount=Decimal('0.00'),
                status='PENDING',  # مسودة أمر شراء معلقة للمراجعة والاعتماد
                invoice_date=timezone.now().date()
            )

            total_sum = 0.0

            for it in items_to_order:
                ing = Ingredient.objects.filter(id=it["ingredient_id"]).first()
                if not ing:
                    continue

                qty = float(it.get("quantity", it.get("suggested_qty", 1.0)))
                price = float(it.get("unit_price", ing.cost_per_unit or 1.0))
                line_total = round(qty * price, 2)
                total_sum += line_total

                PurchaseInvoiceItem.objects.create(
                    invoice=invoice,
                    ingredient=ing,
                    quantity=qty,
                    unit_price=Decimal(str(round(price, 2))),
                    total_price=Decimal(str(round(line_total, 2)))
                )

            invoice.total_amount = Decimal(str(round(total_sum, 2)))
            invoice.save()

        return {
            "status": "success",
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "supplier_id": supplier.id,
            "supplier_name": supplier.name,
            "items_count": len(items_to_order),
            "total_amount": round(total_sum, 2),
            "invoice_status": invoice.status,
            "message": f"تم توليد مسودة أمر الشراء {invoice.invoice_number} بنجاح بنقرة واحدة!"
        }

    @classmethod
    def receive_and_post_invoice(cls, invoice_id: int):
        """
        اعتماد واستلام فاتورة الشراء وترحيلها للمخزن فورياً
        """
        with transaction.atomic():
            invoice = PurchaseInvoice.objects.select_related('supplier').prefetch_related('items__ingredient').get(id=invoice_id)
            if invoice.status == 'RECEIVED':
                return {"status": "info", "message": "الفاتورة مستلمة ومرحلة للمخزن بالفعل."}

            supplier = invoice.supplier
            total_sum = 0.0

            for item in invoice.items.all():
                ing = item.ingredient
                item_total = float(item.quantity) * float(item.unit_price)
                total_sum += item_total

                # تحديث متوسط التكلفة وإضافة الكمية للمخزون
                old_stock = float(ing.current_stock)
                old_cost = float(ing.cost_per_unit)

                if old_stock > 0 and old_cost > 0:
                    current_total_value = old_stock * old_cost
                    new_stock = old_stock + float(item.quantity)
                    new_cost_per_unit = (current_total_value + item_total) / new_stock if new_stock > 0 else float(item.unit_price)
                else:
                    new_stock = old_stock + float(item.quantity)
                    new_cost_per_unit = float(item.unit_price)

                ing.current_stock = round(new_stock, 3)
                ing.cost_per_unit = Decimal(str(round(new_cost_per_unit, 2)))
                ing.save()

            invoice.status = 'RECEIVED'
            invoice.save()

            unpaid = total_sum - float(invoice.paid_amount)
            if unpaid > 0:
                supplier.balance = Decimal(str(round(float(supplier.balance) + unpaid, 2)))
                supplier.save()

            return {
                "status": "success",
                "invoice_id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "message": f"تم اعتماد واستلام الفاتورة {invoice.invoice_number} وترحيل الكميات للمخزن بنجاح!"
            }
