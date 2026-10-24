export interface EmployeeAttendanceSummary {
    employee_id: number;
    employee_name: string;
    role: string;
    phone_number?: string;
    status: 'PRESENT' | 'CHECKED_OUT' | 'ABSENT';
    status_display: string;
    first_check_in?: string | null;
    last_check_out?: string | null;
    work_duration_formatted: string;
    work_duration_minutes: number;
    punch_count: number;
    latest_punch_time?: string | null;
    scheduled_start?: string | null;
    scheduled_end?: string | null;
    is_late?: boolean;
    late_minutes?: number;
    late_deduction_amount?: number;
    absence_deduction_amount?: number;
    late_status_display?: string | null;
}

export interface OverallAttendanceOverview {
    date: string;
    total_employees: number;
    present_count: number;
    checked_out_count: number;
    absent_count: number;
    attendance_rate: string;
    total_absence_deductions?: number;
    total_late_deductions?: number;
    employees_summary: EmployeeAttendanceSummary[];
}

export interface AttendanceRecord {
    id: number;
    employee_id: number;
    employee_name: string;
    role: string;
    punch_type: 'CHECK_IN' | 'CHECK_OUT';
    punch_type_display: string;
    timestamp: string;
    confidence_score: number;
    confidence_percentage: string;
    notes?: string;
}

export interface CheckinResult {
    status: 'success' | 'failed';
    employee_id: number;
    employee_name: string;
    role: string;
    punch_type: string;
    punch_type_display: string;
    time: string;
    date: string;
    match_confidence: string;
}
