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

    getAttendanceLogs: async (params?: {
        limit?: number;
        employee_id?: number;
        punch_type?: string;
        start_date?: string;
        end_date?: string;
    }): Promise<AttendanceRecord[]> => {
        const query = new URLSearchParams();
        if (params?.limit) query.append('limit', params.limit.toString());
        if (params?.employee_id) query.append('employee_id', params.employee_id.toString());
        if (params?.punch_type) query.append('punch_type', params.punch_type);
        if (params?.start_date) query.append('start_date', params.start_date);
        if (params?.end_date) query.append('end_date', params.end_date);

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
