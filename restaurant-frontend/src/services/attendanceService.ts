import api from '@/lib/api';

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

export const attendanceService = {
    checkinWithFingerprint: async (file: File, punchType: 'CHECK_IN' | 'CHECK_OUT' = 'CHECK_IN'): Promise<CheckinResult> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('punch_type', punchType);

        const response = await api.post('/attendance/fingerprint-checkin/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    getAttendanceLogs: async (limit: number = 30): Promise<AttendanceRecord[]> => {
        const response = await api.get(`/attendance/logs/?limit=${limit}`);
        return response.data;
    },

    enrollFingerprint: async (employeeId: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post(`/employees/${employeeId}/enroll-fingerprint/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
};
