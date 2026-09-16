import api from '@/lib/api';

export interface Table {
    id: number;
    table_number: string;
    capacity: number;
    status: string;
    location?: string;
}

export interface Reservation {
    id: number;
    table?: Table;
    customer_name: string;
    customer_phone: string;
    reservation_time: string;
    number_of_guests: number;
    status: string;
    notes?: string;
    table_id?: number;
}

export const reservationService = {
    getReservations: async (date?: string): Promise<Reservation[]> => {
        const response = await api.get('/reservations/reservations/', {
            params: { for_date: date }
        });
        return response.data;
    },
    createReservation: async (data: Partial<Reservation>): Promise<Reservation> => {
        const response = await api.post('/reservations/reservations/', data);
        return response.data;
    },
    updateReservation: async (id: number, data: Partial<Reservation>): Promise<Reservation> => {
        const response = await api.put(`/reservations/reservations/${id}/`, data);
        return response.data;
    },
    deleteReservation: async (id: number): Promise<void> => {
        await api.delete(`/reservations/reservations/${id}/`);
    },
    getTables: async (): Promise<Table[]> => {
        const response = await api.get('/reservations/tables/');
        return response.data;
    },
    createTable: async (data: Partial<Table>): Promise<Table> => {
        const response = await api.post('/reservations/tables/', data);
        return response.data;
    },
    updateTable: async (id: number, data: Partial<Table>): Promise<Table> => {
        const response = await api.put(`/reservations/tables/${id}/`, data);
        return response.data;
    },
    deleteTable: async (id: number): Promise<void> => {
        await api.delete(`/reservations/tables/${id}/`);
    }
};
