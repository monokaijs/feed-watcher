import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export interface AppState {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
}

const initialState: AppState = {
  theme: 'system',
  sidebarCollapsed: false,
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },

    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
  },
});

export const {
  setTheme,
} = appSlice.actions;

export default appSlice.reducer;
