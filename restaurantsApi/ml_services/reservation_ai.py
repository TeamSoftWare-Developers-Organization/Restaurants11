from datetime import datetime, date
from django.utils import timezone
from django.db.models import Count, Q
from reservations.models import Reservation


class ReservationIntelligenceService:
    """
    محرك التنبؤ بنسبة تخلف الضيوف عن الحضور (No-Show) وتحسين إشغال المقاعد
    """

    @classmethod
    def calculate_no_show_risk(cls, reservation_id: int):
        try:
            res = Reservation.objects.select_related('table').get(id=reservation_id)
        except Reservation.DoesNotExist:
            return None

        risk_score = 15  # خطورة أساسية افتراضية
        risk_factors = []

        # 1. حجم المجموعة (المجموعات الكبيرة 6+ أشخاص تزيد فيها نسبة الإلغاء المفاجئ)
        party_size = getattr(res, 'number_of_guests', getattr(res, 'guests_count', getattr(res, 'people_count', 2)))
        if party_size >= 6:
            risk_score += 25
            risk_factors.append(f"مجموعة كبيرة ({party_size} أشخاص)")
        elif party_size == 1:
            risk_score += 10

        # 2. فترة الحجز المسبق (Lead Time)
        res_time = res.reservation_time
        if isinstance(res_time, datetime):
            res_date = res_time.date()
        else:
            res_date = getattr(res, 'reservation_date', date.today())

        days_in_advance = (res_date - date.today()).days
        if days_in_advance > 5:
            risk_score += 20
            risk_factors.append(f"حجز مسبق بفترة طويلة ({days_in_advance} أيام)")
        elif days_in_advance == 0:
            risk_score -= 10  # الحجز في نفس اليوم أكثر التزاماً

        # 3. وقت الذروة وساعات المساء (Weekend / Peak Hours)
        if isinstance(res_time, datetime):
            hour = res_time.hour
        elif hasattr(res_time, 'hour'):
            hour = res_time.hour
        else:
            hour = None

        if hour in [19, 20, 21, 22]:
            risk_score += 15
            risk_factors.append("وقت ذروة مسائية")

        # 4. السجل التاريخي لرقم هاتف العميل
        customer_phone = getattr(res, 'customer_phone', getattr(res, 'phone', None))
        if customer_phone:
            past_reservations = Reservation.objects.filter(
                customer_phone=customer_phone
            ).exclude(id=res.id)
            total_past = past_reservations.count()
            if total_past > 0:
                past_no_shows = past_reservations.filter(
                    status__in=['cancelled', 'CANCELLED', 'no_show', 'NO_SHOW']
                ).count()
                no_show_ratio = past_no_shows / total_past
                if no_show_ratio >= 0.5:
                    risk_score += 35
                    risk_factors.append(f"تاريخ سابق من الإلغاء ({int(no_show_ratio * 100)}%)")
                elif no_show_ratio == 0:
                    risk_score -= 20  # عميل ملتزم سابقاً

        # تطبيع النتيجة بين 5% و 95%
        final_probability = max(5, min(risk_score, 95))

        if final_probability >= 65:
            risk_level = "HIGH"
            suggested_action = "يُنصح بإرسال رسالة تأكيد عاجلة أو قبول حجز بديل (Overbooking)"
        elif final_probability >= 40:
            risk_level = "MEDIUM"
            suggested_action = "تأكيد الحجز هاتفياً قبل الموعد بساعتين"
        else:
            risk_level = "LOW"
            suggested_action = "احتمالية حضور عالية - تثبيت الطاولة"

        return {
            "reservation_id": res.id,
            "guest_name": getattr(res, 'customer_name', getattr(res, 'name', 'عميل')),
            "table_id": res.table_id if res.table else None,
            "no_show_probability": final_probability,
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "suggested_action": suggested_action,
        }

    @classmethod
    def analyze_upcoming_reservations(cls):
        """تحليل جميع الحجوزات القادمة اليوم وتصنيف المخاطر"""
        upcoming = Reservation.objects.filter(
            status__in=['pending', 'confirmed', 'PENDING', 'CONFIRMED'],
            reservation_time__date__gte=date.today()
        ).order_by('reservation_time')[:20]

        return [cls.calculate_no_show_risk(r.id) for r in upcoming if r]
