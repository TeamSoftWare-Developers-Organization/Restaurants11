import api from '@/lib/api';

export interface Category {
    id: number;
    name: string;
}

export interface MenuItem {
    id: number;
    name: string;
    description?: string;
    price: number;
    category?: Category;
    category_id?: number;
    is_available: boolean;
    image_url?: string;
}

export const menuService = {
    getCategories: async (): Promise<Category[]> => {
        const response = await api.get('/menu/categories/');
        return response.data;
    },
    createCategory: async (name: string): Promise<Category> => {
        const response = await api.post('/menu/categories/', { name });
        return response.data;
    },
    getMenuItems: async (): Promise<MenuItem[]> => {
        const response = await api.get('/menu/items/');
        return response.data;
    },
    createMenuItem: async (item: Partial<MenuItem>): Promise<MenuItem> => {
        const response = await api.post('/menu/items/', item);
        return response.data;
    },
    updateMenuItem: async (id: number, item: Partial<MenuItem>): Promise<MenuItem> => {
        const response = await api.put(`/menu/items/${id}/`, item);
        return response.data;
    },
    deleteMenuItem: async (id: number): Promise<void> => {
        await api.delete(`/menu/items/${id}/`);
    },
    uploadImage: async (file: File): Promise<{ image_url: string }> => {
        const formData = new FormData();
        formData.append('image', file);
        const response = await api.post('/menu/upload-image/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
};

export const isLiquidOrDrink = (item: { name?: string; category?: { name: string } | null } | null | undefined): boolean => {
    if (!item) return false;
    const drinkKeywords = [
        'ماء', 'مياه', 'معدنية', 'مساه',
        'مشروب', 'مشروبات', 'عصير', 'عصائر', 'بارد', 'باردة',
        'ساخن', 'ساخنة', 'قهوة', 'شاي', 'بيبسي', 'كولا',
        'سفن', 'سبرايت', 'صودا', 'غازية', 'غازي', 'سائل',
        'سوائل', 'نسكافيه', 'كابتشينو', 'لاتيه', 'اسبريسو',
        'إسبريسو', 'موخيتو', 'موهيتو', 'سموذي', 'كوكتيل',
        'drink', 'beverage', 'water', 'juice', 'coffee', 'tea'
    ];
    const name = (item.name || '').toLowerCase();
    const catName = (item.category?.name || '').toLowerCase();
    return drinkKeywords.some(kw => name.includes(kw) || catName.includes(kw));
};
