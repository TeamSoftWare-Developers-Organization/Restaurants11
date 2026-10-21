import api from '@/lib/api';

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
}

export interface OverallAttendanceOverview {
    date: string;
    total_employees: number;
    present_count: number;
    checked_out_count: number;
    absent_count: number;
    attendance_rate: string;
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

    getAttendanceOverview: async (targetDate?: string): Promise<OverallAttendanceOverview> => {
        const query = targetDate ? `?target_date=${targetDate}` : '';
        const response = await api.get(`/attendance/overview/${query}`);
        return response.data;
    },

    getAttendanceLogs: async (params?: {
        limit?: number;
        employee_id?: number;
        punch_type?: string;
        start_date?: string;
        end_date?: string;
    }): Promise<AttendanceRecord[]> => {
        const query = new URLSearchParams();
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (value === undefined || value === null || value === '') continue;
                switch (key) {
                    case 'limit':
                    case 'employee_id':
                        query.append(key, value.toString());
                        break;
                    case 'punch_type':
                    case 'start_date':
                    case 'end_date':
                        query.append(key, String(value));
                        break;
                    default:
                        break;
                }
            }
        }

        const queryString = query.toString();
        const url = `/attendance/logs/${queryString ? `?${queryString}` : ''}`;
        const response = await api.get(url);
        return response.data;
    },

    addManualRecord: async (data: {
        employee_id: number;
        punch_type: 'CHECK_IN' | 'CHECK_OUT';
        timestamp?: string;
        notes?: string;
    }): Promise<AttendanceRecord> => {
        const response = await api.post('/attendance/manual-record/', data);
        return response.data;
    },

    deleteAttendanceLog: async (logId: number): Promise<{ success: boolean; message: string }> => {
        const response = await api.delete(`/attendance/logs/${logId}/`);
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

    enrollBiometric: async (employeeId: number, data: {
        biometric_type: 'webauthn' | 'hardware_scanner' | 'zkteco_terminal';
        credential_id: string;
        public_key?: string;
        device_info?: string;
        template_data?: Record<string, any>;
    }) => {
        const response = await api.post(`/employees/${employeeId}/enroll-biometric/`, data);
        return response.data;
    },

    checkinBiometric: async (
        credentialId: string,
        punchType: 'CHECK_IN' | 'CHECK_OUT' = 'CHECK_IN',
        deviceInfo?: string
    ): Promise<CheckinResult> => {
        const response = await api.post('/attendance/biometric-checkin/', {
            credential_id: credentialId,
            punch_type: punchType,
            device_info: deviceInfo,
        });
        return response.data;
    },

    getEthernetPorts: async () => {
        const response = await api.get('/attendance/ethernet/ports/');
        return response.data;
    },

    testEthernetDevice: async (ip: string = '192.168.1.201', port: number = 4370) => {
        const response = await api.post('/attendance/ethernet/test-connection/', { ip, port });
        return response.data;
    },

    syncEthernetAttendance: async (ip: string = '192.168.1.201', port: number = 4370) => {
        const response = await api.post('/attendance/ethernet/sync-attendance/', { ip, port });
        return response.data;
    },

    checkinEthernetTerminal: async (
        ip: string = '192.168.1.201',
        port: number = 4370,
        punchType: 'CHECK_IN' | 'CHECK_OUT' = 'CHECK_IN',
        employeeId?: number
    ): Promise<CheckinResult> => {
        const response = await api.post('/attendance/ethernet/live-checkin/', {
            ip,
            port,
            punch_type: punchType,
            employee_id: employeeId
        });
        return response.data;
    },
};
