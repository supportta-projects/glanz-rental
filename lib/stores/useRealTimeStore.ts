import { create } from "zustand";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface RealTimeState {
  channel: RealtimeChannel | null;
  setChannel: (channel: RealtimeChannel | null) => void;
}

export const useRealTimeStore = create<RealTimeState>((set) => ({
  channel: null,
  setChannel: (channel) => set({ channel }),
}));

