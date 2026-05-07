import { create } from 'zustand';
import { Tab } from '../types';

interface AppState {
  // Sidebar/UI State
  sidebarOpen: boolean;
  activeModule: string;
  isDarkMode: boolean;
  
  // Tab Management
  openTabs: Tab[];
  activeTab: Tab;
  
  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  }>;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveModule: (module: string) => void;
  toggleDarkMode: () => void;
  
  addTab: (tab: Tab) => void;
  removeTab: (tab: Tab) => void;
  setActiveTab: (tab: Tab) => void;
  
  addNotification: (notification: Omit<AppState['notifications'][0], 'id'>) => void;
  removeNotification: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  activeModule: 'dashboard',
  isDarkMode: false,
  openTabs: [Tab.DASHBOARD],
  activeTab: Tab.DASHBOARD,
  notifications: [],

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveModule: (module) => set({ activeModule: module }),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

  addTab: (tab) => set((state) => ({
    openTabs: state.openTabs.includes(tab) ? state.openTabs : [...state.openTabs, tab],
    activeTab: tab
  })),
  
  removeTab: (tab) => set((state) => {
    const newTabs = state.openTabs.filter((t) => t !== tab);
    return {
      openTabs: newTabs,
      activeTab: state.activeTab === tab ? (newTabs[newTabs.length - 1] || Tab.DASHBOARD) : state.activeTab
    };
  }),
  
  setActiveTab: (tab) => set({ activeTab: tab }),

  addNotification: (notification) => set((state) => ({
    notifications: [...state.notifications, { ...notification, id: Math.random().toString(36).substring(7) }]
  })),
  
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id)
  })),
}));
