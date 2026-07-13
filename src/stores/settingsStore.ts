import { create } from 'zustand';
import type { UserSettings, ContentSource, DifficultyLevel } from '../types';
import { storageGet, storageSet } from '../utils/storage';
import { saveSelectedSource, loadSelectedSource } from '../utils/storage';

// ============================================================
// Settings Store State & Actions
// ============================================================

interface SettingsState {
  settings: UserSettings;
}

interface SettingsActions {
  /** Load settings from LocalStorage on app init */
  loadSettings: () => void;
  /** Set theme (light or dark) */
  setTheme: (theme: 'light' | 'dark') => void;
  /** Set font size */
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  /** Toggle auto-translate */
  setAutoTranslate: (enabled: boolean) => void;
  /** Set vocabulary highlight difficulty level */
  setHighlightLevel: (level: DifficultyLevel) => void;
  /** Set daily learning goal (articles per day) */
  setDailyGoal: (goal: number) => void;
  /** Change the selected content source */
  setSelectedSource: (source: ContentSource) => void;
}

type SettingsStore = SettingsState & SettingsActions;

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  fontSize: 'medium',
  autoTranslate: false,
  highlightLevel: 'intermediate',
  dailyGoal: 3,
  selectedSource: 'current-affairs',
};

function persistSettings(settings: UserSettings): void {
  storageSet('user-settings', settings);
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS, selectedSource: loadSelectedSource() },

  loadSettings: () => {
    const stored = storageGet('user-settings');
    if (stored) {
      set({ settings: stored });
    } else {
      // Even if no full settings are stored, respect the selected-content-source key
      const source = loadSelectedSource();
      set({ settings: { ...DEFAULT_SETTINGS, selectedSource: source } });
    }
  },

  setTheme: (theme: 'light' | 'dark') => {
    const updated: UserSettings = { ...get().settings, theme };
    persistSettings(updated);
    set({ settings: updated });
  },

  setFontSize: (size: 'small' | 'medium' | 'large') => {
    const updated: UserSettings = { ...get().settings, fontSize: size };
    persistSettings(updated);
    set({ settings: updated });
  },

  setAutoTranslate: (enabled: boolean) => {
    const updated: UserSettings = { ...get().settings, autoTranslate: enabled };
    persistSettings(updated);
    set({ settings: updated });
  },

  setHighlightLevel: (level: DifficultyLevel) => {
    const updated: UserSettings = { ...get().settings, highlightLevel: level };
    persistSettings(updated);
    set({ settings: updated });
  },

  setDailyGoal: (goal: number) => {
    const updated: UserSettings = { ...get().settings, dailyGoal: goal };
    persistSettings(updated);
    set({ settings: updated });
  },

  setSelectedSource: (source: ContentSource) => {
    // Persist to the dedicated 'selected-content-source' key for quick access
    saveSelectedSource(source);
    // Also update settings
    const updated: UserSettings = { ...get().settings, selectedSource: source };
    persistSettings(updated);
    set({ settings: updated });
  },
}));
