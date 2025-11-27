import { create } from "zustand";
import type { OrderItem, OrderDraft } from "@/lib/types";
import { useUserStore } from "./useUserStore";

interface OrderDraftState {
  draft: OrderDraft;
  setCustomer: (customerId: string, name?: string, phone?: string) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setInvoiceNumber: (number: string) => void;
  addItem: (item: OrderItem) => void;
  updateItem: (index: number, item: Partial<OrderItem>) => void;
  removeItem: (index: number) => void;
  calculateGrandTotal: () => number;
  calculateSubtotal: () => number;
  calculateGst: () => number;
  clearDraft: () => void;
  loadOrder: (order: any) => void;
}

const initialDraft: OrderDraft = {
  customer_id: null,
  start_date: new Date().toISOString(), // Full ISO datetime string
  end_date: "",
  invoice_number: "",
  items: [],
  grand_total: 0,
};

export const useOrderDraftStore = create<OrderDraftState>((set, get) => ({
  draft: initialDraft,
  
  setCustomer: (customerId, name, phone) =>
    set((state) => ({
      draft: {
        ...state.draft,
        customer_id: customerId,
        customer_name: name,
        customer_phone: phone,
      },
    })),
  
  setStartDate: (date) =>
    set((state) => ({
      draft: { ...state.draft, start_date: date },
    })),
  
  setEndDate: (date) =>
    set((state) => ({
      draft: { ...state.draft, end_date: date },
    })),
  
  setInvoiceNumber: (number) =>
    set((state) => ({
      draft: { ...state.draft, invoice_number: number },
    })),
  
  addItem: (item) =>
    set((state) => ({
      draft: {
        ...state.draft,
        items: [...state.draft.items, item],
      },
    })),
  
  updateItem: (index, updates) =>
    set((state) => {
      const newItems = [...state.draft.items];
      newItems[index] = { ...newItems[index], ...updates };
      return {
        draft: { ...state.draft, items: newItems },
      };
    }),
  
  removeItem: (index) =>
    set((state) => ({
      draft: {
        ...state.draft,
        items: state.draft.items.filter((_, i) => i !== index),
      },
    })),
  
  calculateSubtotal: () => {
    const { draft } = get();
    return draft.items.reduce((sum, item) => sum + item.line_total, 0);
  },
  
  calculateGst: () => {
    const { draft } = get();
    const subtotal = draft.items.reduce((sum, item) => sum + item.line_total, 0);
    
    // Get user's GST settings
    const user = useUserStore.getState().user;
    const gstEnabled = user?.gst_enabled ?? false;
    
    // If GST is disabled, return 0
    if (!gstEnabled) {
      return 0;
    }
    
    // Get GST rate from user settings (default to 5%)
    const gstRatePercent = user?.gst_rate ?? 5.00;
    const gstRate = gstRatePercent / 100; // Convert percentage to decimal
    
    const gstIncluded = user?.gst_included ?? false;
    
    if (gstIncluded) {
      // GST is included in prices, so calculate GST from subtotal
      // If subtotal includes GST: GST = subtotal * (rate / (1 + rate))
      return subtotal * (gstRate / (1 + gstRate));
    } else {
      // GST is excluded, so add rate% on top
      return subtotal * gstRate;
    }
  },
  
  calculateGrandTotal: () => {
    const { draft } = get();
    const subtotal = draft.items.reduce((sum, item) => sum + item.line_total, 0);
    
    // Get user's GST settings
    const user = useUserStore.getState().user;
    const gstEnabled = user?.gst_enabled ?? false;
    
    // If GST is disabled, return subtotal as grand total
    if (!gstEnabled) {
      return subtotal;
    }
    
    // Get GST rate from user settings (default to 5%)
    const gstRatePercent = user?.gst_rate ?? 5.00;
    const gstRate = gstRatePercent / 100; // Convert percentage to decimal
    
    const gstIncluded = user?.gst_included ?? false;
    
    if (gstIncluded) {
      // GST is already included in prices, so subtotal is the grand total
      return subtotal;
    } else {
      // GST is excluded, so add rate% on top
      return subtotal + (subtotal * gstRate);
    }
  },
  
  clearDraft: () => set({ draft: initialDraft }),
  
  loadOrder: (order) =>
    set({
      draft: {
        customer_id: order.customer_id,
        customer_name: order.customer?.name,
        customer_phone: order.customer?.phone,
        start_date: order.start_date,
        end_date: order.end_date,
        invoice_number: order.invoice_number,
        items: order.items || [],
        grand_total: order.total_amount,
      },
    }),
}));

