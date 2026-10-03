import api from '@/lib/api';

export interface Ingredient {
    id: number;
    name: string;
    current_stock: number;
    unit: string;
    cost_per_unit: number;
    reorder_level: number;
    image?: string;
    last_updated: string;
}

export interface RecipeIngredient {
    id: number;
    menu_item: any;
    ingredient: Ingredient;
    quantity_needed: number;
}

export const inventoryService = {
    getIngredients: async (): Promise<Ingredient[]> => {
        const response = await api.get('/inventory/ingredients/');
        return response.data;
    },
    createIngredient: async (data: FormData): Promise<Ingredient> => {
        const response = await api.post('/inventory/ingredients/', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    updateIngredient: async (id: number, data: FormData): Promise<Ingredient> => {
        const response = await api.put(`/inventory/ingredients/${id}/`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    deleteIngredient: async (id: number): Promise<void> => {
        await api.delete(`/inventory/ingredients/${id}/`);
    },

    // Recipe Management
    getAllRecipes: async (): Promise<RecipeIngredient[]> => {
        const response = await api.get('/inventory/recipes/');
        return response.data;
    },
    getRecipeForItem: async (menuItemId: number): Promise<RecipeIngredient[]> => {
        const response = await api.get(`/inventory/recipes/${menuItemId}/`);
        return response.data;
    },
    addIngredientToRecipe: async (menuItemId: number, data: { ingredient_id: number, quantity_needed: number }): Promise<RecipeIngredient> => {
        const response = await api.post(`/inventory/recipes/${menuItemId}/`, data);
        return response.data;
    },
    updateRecipeIngredient: async (recipeIngredientId: number, data: { ingredient_id?: number, quantity_needed: number }): Promise<RecipeIngredient> => {
        const response = await api.put(`/inventory/recipe_items/${recipeIngredientId}/`, data);
        return response.data;
    },
    removeIngredientFromRecipe: async (recipeIngredientId: number): Promise<void> => {
        await api.delete(`/inventory/recipe_items/${recipeIngredientId}/`);
    },

    // Stocktaking (جرد المنتجات والمخزون)
    getItemsForStocktake: async (): Promise<StocktakeAuditItem[]> => {
        const response = await api.get('/inventory/stocktaking/items/');
        return response.data;
    },
    reconcileStocktake: async (data: ReconcilePayload): Promise<any> => {
        const response = await api.post('/inventory/stocktaking/reconcile/', data);
        return response.data;
    },
    getStocktakeHistory: async (): Promise<StocktakeSession[]> => {
        const response = await api.get('/inventory/stocktaking/history/');
        return response.data;
    },
    getStocktakeDetail: async (id: number): Promise<StocktakeSession> => {
        const response = await api.get(`/inventory/stocktaking/history/${id}/`);
        return response.data;
    }
};

export interface StocktakeAuditItem {
    id: number;
    name: string;
    current_stock: number;
    unit: string;
    unit_display: string;
    cost_per_unit: number;
    total_value: number;
    reorder_level: number;
    image?: string | null;
    last_updated: string;
}

export interface StocktakeHistoryItem {
    id: number;
    ingredient_id: number;
    ingredient_name: string;
    unit: string;
    unit_display: string;
    system_stock: number;
    actual_stock: number;
    difference: number;
    unit_cost: number;
    variance_value: number;
    status: 'MATCHED' | 'SHORTAGE' | 'SURPLUS';
    status_display: string;
    notes: string;
}

export interface StocktakeSession {
    id: number;
    reference_number: string;
    performed_by: string;
    status: string;
    status_display: string;
    created_at: string;
    applied_at?: string;
    notes?: string;
    total_system_value: number;
    total_actual_value: number;
    net_variance_value: number;
    total_items_counted: number;
    items_with_shortage: number;
    items_with_surplus: number;
    items_matched: number;
    items: StocktakeHistoryItem[];
}

export interface ReconcilePayload {
    reference_number?: string;
    performed_by?: string;
    notes?: string;
    auto_reconcile: boolean;
    items: {
        ingredient_id: number;
        actual_stock: number;
        notes?: string;
    }[];
}

