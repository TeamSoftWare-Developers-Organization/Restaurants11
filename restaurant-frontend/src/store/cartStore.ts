import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 1. تعريف هيكل الصنف في السلة
export interface CartItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    image_url?: string | null;
    category?: string | null;
    notes?: string;
}

// 2. تعريف هيكل المخزن (Store) والعمليات الحسابية
export interface CartState {
    items: CartItem[];

    // العمليات (Actions)
    addItem: (product: Omit<CartItem, 'quantity'>) => void;
    removeItem: (id: number) => void;
    updateQuantity: (id: number, quantity: number) => void;
    updateItemNotes: (id: number, notes: string) => void;
    clearCart: () => void;
    setCartItems: (items: CartItem[]) => void;

    // الحسابات (Computed Values)
    getTotals: () => {
        subtotal: number;
        taxAmount: number;
        total: number;
    };
}

// 3. إنشاء المخزن مع ميزة الحفظ التلقائي (Persistence)
export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],

            // إضافة صنف أو زيادة الكمية إذا كان موجوداً
            addItem: (product) => {
                const currentItems = get().items;
                const existingItem = currentItems.find((item) => item.id === product.id);

                if (existingItem) {
                    set({
                        items: currentItems.map((item) =>
                            item.id === product.id
                                ? { ...item, quantity: item.quantity + 1, image_url: product.image_url ?? item.image_url, category: product.category ?? item.category }
                                : item
                        ),
                    });
                } else {
                    set({ items: [...currentItems, { ...product, quantity: 1, notes: product.notes || '' }] });
                }
            },

            // حذف صنف بالكامل
            removeItem: (id) => {
                set({ items: get().items.filter((item) => item.id !== id) });
            },

            // تحديث الكمية يدوياً
            updateQuantity: (id, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(id);
                    return;
                }
                set({
                    items: get().items.map((item) =>
                        item.id === id ? { ...item, quantity } : item
                    ),
                });
            },

            // تحديث ملاحظات الصنف (خاصة بالمطبخ والتحضير)
            updateItemNotes: (id, notes) => {
                set({
                    items: get().items.map((item) =>
                        item.id === id ? { ...item, notes } : item
                    ),
                });
            },

            clearCart: () => set({ items: [] }),
            setCartItems: (items) => set({ items }),

            // محرك العمليات الحسابية الخوارزمي
            getTotals: () => {
                const items = get().items;
                const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
                const taxAmount = 0; // تم إلغاء الضريبة نهائياً
                const total = subtotal;

                return {
                    subtotal: Number(subtotal.toFixed(2)),
                    taxAmount: 0,
                    total: Number(total.toFixed(2)),
                };
            },
        }),
        {
            name: 'restaurant-cart-storage', // اسم المفتاح في LocalStorage
        }
    )
);
