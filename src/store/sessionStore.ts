import { create } from 'zustand';
import { session } from '../data/seed';
import { startRealtimeSimulation } from '../services/realtime';

interface SessionState {
  /** True once the user has passed the welcome screen into the dining session. */
  joined: boolean;
  scannedAt: number | null;
  join: () => void;
}

export const useSession = create<SessionState>((set) => ({
  joined: false,
  scannedAt: null,
  join: () => {
    startRealtimeSimulation(); // begin receiving "server pushes" for this restaurant
    set({ joined: true, scannedAt: Date.now() });
  },
}));

export { session };
