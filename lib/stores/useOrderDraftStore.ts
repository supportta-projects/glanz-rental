import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { shallow } from "zustand/shallow";
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
  clearDraft: () => void;
  loadOrder: (order: any) => void;
}

const initialDraft: OrderDraft = {
  customer_id: null,
  start_date: new Date().toISOString(),
  end_date: "",
  invoice_number: "",
  items: [],
  grand_total: 0,
};

// Computed selectors (memoized - no re-runs unless dependencies change)
const selectItems = (state: OrderDraftState) => state.draft.items;
const selectSubtotal = (state: OrderDraftState) => {
  return state.draft.items.reduce((sum, item) => sum + item.line_total, 0);
};

const selectGrandTotal = (state: OrderDraftState) => {
  const subtotal = selectSubtotal(state);
  const user = useUserStore.getState().user;
  const gstEnabled = user?.gst_enabled ?? false;
  
  if (!gstEnabled) return subtotal;
  
  const gstRatePercent = user?.gst_rate ?? 5.00;
  const gstRate = gstRatePercent / 100;
  const gstIncluded = user?.gst_included ?? false;
  
  return gstIncluded ? subtotal : subtotal + (subtotal * gstRate);
};

const selectGst = (state: OrderDraftState) => {
  const subtotal = selectSubtotal(state);
  const user = useUserStore.getState().user;
  const gstEnabled = user?.gst_enabled ?? false;
  
  if (!gstEnabled) return 0;
  
  const gstRatePercent = user?.gst_rate ?? 5.00;
  const gstRate = gstRatePercent / 100;
  const gstIncluded = user?.gst_included ?? false;
  
  return gstIncluded ? subtotal * (gstRate / (1 + gstRate)) : subtotal * gstRate;
};

export const useOrderDraftStore = create<OrderDraftState>()(
  subscribeWithSelector((set, get) => ({
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
          items: [item, ...state.draft.items],
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
  }))
);

// Optimized selectors with shallow equality for items array
export const useOrderItems = () => useOrderDraftStore(selectItems);
export const useOrderSubtotal = () => useOrderDraftStore(selectSubtotal);
export const useOrderGrandTotal = () => useOrderDraftStore(selectGrandTotal);
export const useOrderGst = () => useOrderDraftStore(selectGst);

