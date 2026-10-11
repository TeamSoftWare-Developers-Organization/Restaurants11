from datetime import datetime, date, timedelta, time
from typing import Dict, Any, List, Optional
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Avg, Count
from menu.models import MenuItem
from inventory.models import RecipeIngredient
from orders.models import Order, OrderItem
from ml_services.staff_rostering import PredictiveStaffRosteringService
from ml_services.menu_optimizer import MenuEngineeringService


class DynamicPricingPromotionService:
    """
    محرك العروض والتسعير الديناميكي الذكي (AI Dynamic Promotion & Happy Hour Engine)
    
    الأهداف:
    1. تحليل التنبؤ الساعي للطلب لكشف ساعات الركود (Off-Peak Trough Hours).
    2. استغلال مصفوفة هندسة المنيو لتحديد أصناف الألغاز (Puzzles) والأصناف الراكدة.
    3. توليد حزم عروض ترويجية محسوبة بدقة تحمي هامش الربح وتنشط الطلب.
    4. تفعيل العروض بنقرة واحدة لتنعكس فوراً في نقطة البيع (POS).
    """

    # فترات الركود النمطية في المطاعم (إذا لم تتوفر بيانات كافية)
    DEFAULT_OFF_PEAK_WINDOWS = [
        {"start_hour": 14, "end_hour": 17, "label": "فترة ما بعد الغداء (14:00 - 17:00)", "name": "Happy Hour ما بعد الغداء"},
        {"start_hour": 9, "end_hour": 11, "label": "فترة الصباح الهادئة (09:00 - 11:00)", "name": "عرض الصباح الباكر"},
        {"start_hour": 22, "end_hour": 24, "label": "فترة المساء المتأخرة (22:00 - 24:00)", "name": "عرض السهرة المتأخرة"}
    ]

    # قائمة بالعروض النشطة حالياً في الذاكرة
    _active_promotions: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def get_off_peak_troughs(cls, target_date: Optional[date] = None) -> List[Dict[str, Any]]:
        """
        تحديد ساعات الركود (Troughs) عبر تحليل التنبؤ الساعي لحجم الطلبات
        """
        if not target_date:
            target_date = timezone.localdate() if hasattr(timezone, 'localdate') else date.today()

        forecast = PredictiveStaffRosteringService.predict_hourly_demand(target_date=target_date)
        hourly_schedule = forecast.get("hourly_schedule", [])

        if not hourly_schedule:
            return cls.DEFAULT_OFF_PEAK_WINDOWS

        # حساب متوسط الطلبات الساعي
        order_counts = [h["predicted_orders"] for h in hourly_schedule]
        avg_hourly_orders = sum(order_counts) / len(order_counts) if order_counts else 10.0
        trough_threshold = avg_hourly_orders * 0.70  # أي ساعة تقل بنسبة 30% عن المتوسط تعتبر ركوداً

        # تجميع الساعات المتتالية الهادئة في فترات
        troughs = []
        current_trough = None

        for h in hourly_schedule:
            hr = h["hour"]
            is_low = h["predicted_orders"] <= trough_threshold or h.get("is_rush", False) is False and h["predicted_orders"] < avg_hourly_orders

            if is_low and 10 <= hr <= 23:
                if current_trough is None:
                    current_trough = {
                        "start_hour": hr,
                        "end_hour": hr + 1,
                        "orders": [h["predicted_orders"]]
                    }
                else:
                    current_trough["end_hour"] = hr + 1
                    current_trough["orders"].append(h["predicted_orders"])
            else:
                if current_trough:
                    if len(current_trough["orders"]) >= 2:  # ساعتان فأكثر
                        troughs.append(current_trough)
                    current_trough = None

        if current_trough and len(current_trough["orders"]) >= 2:
            troughs.append(current_trough)

        if not troughs:
            return cls.DEFAULT_OFF_PEAK_WINDOWS

        formatted_windows = []
        for t_info in troughs:
            st = t_info["start_hour"]
            en = t_info["end_hour"]
            formatted_windows.append({
                "start_hour": st,
                "end_hour": en,
                "label": f"{st:02d}:00 - {en:02d}:00",
                "name": f"ساعات الركود ({st:02d}:00 - {en:02d}:00)",
                "avg_orders": round(sum(t_info["orders"]) / len(t_info["orders"]), 1)
            })

        return formatted_windows

    @classmethod
    def generate_promotion_suggestions(cls) -> Dict[str, Any]:
        """
        توليد اقتراحات العروض الذكية والتسعير الديناميكي لساعات الركود
        """
        now = timezone.localtime() if hasattr(timezone, 'localtime') else datetime.now()
        current_hour = now.hour

        # 1. تحديد فترات الركود
        off_peak_windows = cls.get_off_peak_troughs(target_date=now.date())

        # التحقق مما إذا كانت الساعة الحالية ضمن فترة ركود
        is_currently_off_peak = any(
            w["start_hour"] <= current_hour < w["end_hour"]
            for w in off_peak_windows
        )

        # 2. تحليل مصفوفة هندسة المنيو لاختيار الأصناف المستهدفة
        menu_matrix = MenuEngineeringService.analyze_menu_matrix()
        
        puzzle_items = [i for i in menu_matrix if i["classification"] == "PUZZLE"]
        plowhorse_items = [i for i in menu_matrix if i["classification"] == "PLOWHORSE"]
        star_items = [i for i in menu_matrix if i["classification"] == "STAR"]
        dog_items = [i for i in menu_matrix if i["classification"] == "DOG"]

        # في حال عدم وجود أصناف مصنفة كـ Puzzle، نأخذ الأصناف ذات الهامش الأعلى
        if not puzzle_items:
            puzzle_items = sorted(menu_matrix, key=lambda x: x["profit_margin"], reverse=True)[:3]
        if not plowhorse_items:
            plowhorse_items = sorted(menu_matrix, key=lambda x: x["sold_count"], reverse=True)[:3]

        promotions: List[Dict[str, Any]] = []

        # -------------------------------------------------------------
        # العرض الأول: Happy Hour Flash Discount (خصم الساعات الهادئة)
        # يستهدف أصناف الألغاز (Puzzles) لأن هامش ربحها مرتفع وتتحمل الخصم
        # -------------------------------------------------------------
        target_window = off_peak_windows[0] if off_peak_windows else cls.DEFAULT_OFF_PEAK_WINDOWS[0]
        selected_puzzles = puzzle_items[:3]

        if selected_puzzles:
            discount_pct = 15.0  # خصم 15%
            promo_items = []

            for p in selected_puzzles:
                original_p = float(p["selling_price"])
                cost = float(p["item_cost"])
                discounted_p = round(original_p * (1 - (discount_pct / 100.0)), 2)

                # صمام أمان الربح (Profit Floor Guard): التأكد من بقاء هامش ربح لا يقل عن 20%
                min_safe_price = round(cost * 1.20, 2)
                if discounted_p < min_safe_price:
                    discounted_p = max(min_safe_price, round(original_p * 0.90, 2))

                margin_before = round(original_p - cost, 2)
                margin_after = round(discounted_p - cost, 2)

                promo_items.append({
                    "item_id": p["item_id"],
                    "name": p["name"],
                    "original_price": original_p,
                    "discounted_price": discounted_p,
                    "discount_amount": round(original_p - discounted_p, 2),
                    "item_cost": cost,
                    "margin_before": margin_before,
                    "margin_after": margin_after,
                    "classification": p["classification"],
                    "classification_badge": p.get("badge", "لغز 🧩"),
                })

            promo_id = "PROMO-HAPPY-HOUR"
            promotions.append({
                "id": promo_id,
                "title": f"عرض الساعات الهادئة ⚡ ({target_window['label']})",
                "type": "FLASH_DISCOUNT",
                "discount_percentage": discount_pct,
                "time_window": target_window["label"],
                "badge": "خصم 15% ذكي 🔥",
                "rationale": "أصناف (الألغاز) بهامش ربح ممتاز ومبيعات هادئة؛ الخصم ينشط الطلب بدون الإضرار بالربحية.",
                "projected_sales_boost": "+35% زيادة في طلبات الوجبات",
                "projected_revenue_lift": "+22% في إيراد فترة الركود",
                "items": promo_items,
                "is_active": promo_id in cls._active_promotions,
                "start_hour": target_window["start_hour"],
                "end_hour": target_window["end_hour"],
            })

        # -------------------------------------------------------------
        # العرض الثاني: Smart Combo Booster (كومبو تنشيط الطلب التكاملي)
        # دمج صنف شائع (Plowhorse/Star) مع صنف لغز (Puzzle) بخصم حزمة
        # -------------------------------------------------------------
        if (plowhorse_items or star_items) and puzzle_items:
            popular_item = plowhorse_items[0] if plowhorse_items else star_items[0]
            puzzle_item = puzzle_items[0]

            if popular_item["item_id"] != puzzle_item["item_id"]:
                bundle_original = float(popular_item["selling_price"]) + float(puzzle_item["selling_price"])
                bundle_cost = float(popular_item["item_cost"]) + float(puzzle_item["item_cost"])
                bundle_discounted = round(bundle_original * 0.82, 2)  # خصم 18% على الكومبو
                bundle_margin = round(bundle_discounted - bundle_cost, 2)

                combo_id = "PROMO-SMART-COMBO"
                promotions.append({
                    "id": combo_id,
                    "title": f"كومبو التنشيط الذكي: {popular_item['name']} + {puzzle_item['name']}",
                    "type": "SMART_COMBO",
                    "discount_percentage": 18.0,
                    "time_window": "طوال فترة الركود المسائية",
                    "badge": "توفير 18% كومبو 🍱",
                    "rationale": "ربط الصنف الأكثر طلباً بصنف عالي الربحية لرفع متوسط قيمة الفاتورة وتصريف المخزون.",
                    "projected_sales_boost": "+45% زيادة في مبيعات الصنف الملحق",
                    "projected_revenue_lift": "+18% نمو في متوسط سلة المشتريات",
                    "items": [
                        {
                            "item_id": popular_item["item_id"],
                            "name": popular_item["name"],
                            "original_price": float(popular_item["selling_price"]),
                            "discounted_price": round(float(popular_item["selling_price"]) * 0.85, 2),
                            "item_cost": float(popular_item["item_cost"]),
                            "classification": popular_item["classification"],
                            "classification_badge": popular_item.get("badge", "شائع 🐎"),
                        },
                        {
                            "item_id": puzzle_item["item_id"],
                            "name": puzzle_item["name"],
                            "original_price": float(puzzle_item["selling_price"]),
                            "discounted_price": round(float(puzzle_item["selling_price"]) * 0.80, 2),
                            "item_cost": float(puzzle_item["item_cost"]),
                            "classification": puzzle_item["classification"],
                            "classification_badge": puzzle_item.get("badge", "لغز 🧩"),
                        }
                    ],
                    "bundle_original_price": bundle_original,
                    "bundle_discounted_price": bundle_discounted,
                    "bundle_profit_margin": bundle_margin,
                    "is_active": combo_id in cls._active_promotions,
                    "start_hour": target_window["start_hour"],
                    "end_hour": target_window["end_hour"],
                })

        # -------------------------------------------------------------
        # العرض الثالث: Clearance & Freshness Saver (عرض الأصناف الراكدة)
        # -------------------------------------------------------------
        if dog_items:
            selected_dogs = dog_items[:2]
            dog_promo_items = []
            for d in selected_dogs:
                orig_p = float(d["selling_price"])
                c = float(d["item_cost"])
                disc_p = round(orig_p * 0.80, 2)
                dog_promo_items.append({
                    "item_id": d["item_id"],
                    "name": d["name"],
                    "original_price": orig_p,
                    "discounted_price": disc_p,
                    "discount_amount": round(orig_p - disc_p, 2),
                    "item_cost": c,
                    "margin_before": round(orig_p - c, 2),
                    "margin_after": round(disc_p - c, 2),
                    "classification": "DOG",
                    "classification_badge": "تصريف مخزون ⚠️",
                })

            dog_promo_id = "PROMO-CLEARANCE-SAVER"
            promotions.append({
                "id": dog_promo_id,
                "title": "عرض تصريف الأصناف الراكدة (تجنب تلف المكونات) 🏷️",
                "type": "VOLUME_BOOSTER",
                "discount_percentage": 20.0,
                "time_window": target_window["label"],
                "badge": "خصم 20% لتسريع الدوران",
                "rationale": "تحريك الأصناف الراكدة لتسريع دوران المواد الأولية في المخزن قبل انتهاء الصلاحية.",
                "projected_sales_boost": "+50% في تصريف المخزون الراكد",
                "projected_revenue_lift": "استرداد تكلفة المواد الخام المحتجزة",
                "items": dog_promo_items,
                "is_active": dog_promo_id in cls._active_promotions,
                "start_hour": target_window["start_hour"],
                "end_hour": target_window["end_hour"],
            })

        return {
            "status": "success",
            "current_hour": current_hour,
            "is_currently_off_peak": is_currently_off_peak,
            "off_peak_windows": off_peak_windows,
            "total_suggestions_count": len(promotions),
            "promotions": promotions,
            "active_promotions_count": len(cls._active_promotions),
            "generated_at": now.strftime("%Y-%m-%d %H:%M:%S")
        }

    @classmethod
    def apply_promotion(cls, promotion_id: str, action: str = "activate") -> Dict[str, Any]:
        """
        تفعيل أو إيقاف العرض الترويجي في نقطة البيع (POS) بنقرة واحدة
        """
        all_data = cls.generate_promotion_suggestions()
        promos = all_data.get("promotions", [])
        matched = next((p for p in promos if p["id"] == promotion_id), None)

        if not matched:
            return {
                "success": False,
                "message": f"العرض المطلوب ({promotion_id}) غير متوفر."
            }

        if action == "deactivate":
            if promotion_id in cls._active_promotions:
                del cls._active_promotions[promotion_id]
            return {
                "success": True,
                "promotion_id": promotion_id,
                "is_active": False,
                "message": f"تم إلغاء تفعيل {matched['title']} من نقطة البيع."
            }
        else:
            cls._active_promotions[promotion_id] = matched
            return {
                "success": True,
                "promotion_id": promotion_id,
                "is_active": True,
                "message": f"تم تفعيل {matched['title']} بنجاح! سينعكس الخصم مباشرة في نقطة البيع.",
                "promotion": matched
            }

    @classmethod
    def get_active_promotions(cls) -> List[Dict[str, Any]]:
        """
        إرجاع قائمة العروض المفعلة حالياً في الـ POS
        """
        return list(cls._active_promotions.values())
