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
    }
};
