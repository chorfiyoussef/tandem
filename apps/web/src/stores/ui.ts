import { create } from "zustand";

type NewTaskDefaults = { listId?: string; statusId?: string; categoryId?: string; dueDate?: string; parentId?: string };
export type ListGroupBy = "status" | "category";

type UiState = {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;

  newTaskOpen: boolean;
  newTaskDefaults: NewTaskDefaults;
  openNewTask: (defaults?: NewTaskDefaults) => void;
  closeNewTask: () => void;

  collapsedGroups: Record<string, boolean>;
  toggleGroup: (key: string) => void;

  collapsedSpaces: Record<string, boolean>;
  toggleSpace: (id: string) => void;

  /** The list most recently viewed; used as the default for quick-create. */
  lastListId: string | null;
  setLastListId: (id: string | null) => void;

  /** How each list's list view is grouped this session. */
  listGroupBy: Record<string, ListGroupBy>;
  setListGroupBy: (listId: string, groupBy: ListGroupBy) => void;
};

export const useUi = create<UiState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  paletteOpen: false,
  setPaletteOpen: (open) => set({ paletteOpen: open }),

  newTaskOpen: false,
  newTaskDefaults: {},
  openNewTask: (defaults = {}) => set({ newTaskOpen: true, newTaskDefaults: defaults }),
  closeNewTask: () => set({ newTaskOpen: false }),

  collapsedGroups: {},
  toggleGroup: (key) => set((s) => ({ collapsedGroups: { ...s.collapsedGroups, [key]: !s.collapsedGroups[key] } })),

  collapsedSpaces: {},
  toggleSpace: (id) => set((s) => ({ collapsedSpaces: { ...s.collapsedSpaces, [id]: !s.collapsedSpaces[id] } })),

  lastListId: null,
  setLastListId: (id) => set({ lastListId: id }),

  listGroupBy: {},
  setListGroupBy: (listId, groupBy) => set((s) => ({ listGroupBy: { ...s.listGroupBy, [listId]: groupBy } })),
}));
