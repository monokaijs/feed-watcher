import {combineReducers, configureStore} from '@reduxjs/toolkit';
import {FLUSH, PAUSE, PERSIST, persistReducer, persistStore, PURGE, REGISTER, REHYDRATE} from 'redux-persist';
import {chromeStorageAdapter} from './storage';
import appReducer from './slices/appSlice';
import githubReducer from './slices/githubSlice';
import watcherReducer from './slices/watcherSlice';
import type {TypedUseSelectorHook} from 'react-redux';
// Create typed versions of hooks
import {useDispatch as useReduxDispatch, useSelector as useReduxSelector} from 'react-redux';
import autoMergeLevel2 from "redux-persist/es/stateReconciler/autoMergeLevel2";

const rootReducer = combineReducers({
  app: appReducer,
  github: githubReducer,
  watcher: watcherReducer,
});

const persistConfig = {
  key: 'feedwatcher-root',
  storage: chromeStorageAdapter,
  version: 1,
  stateReconciler: autoMergeLevel2
} as any;

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export {useDispatch, useSelector} from 'react-redux';

export const useAppDispatch = () => useReduxDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useReduxSelector;

export const getState = () => store.getState();
export const dispatch = store.dispatch;

export const purgeStore = () => {
  persistor.purge();
};

export const flushStore = () => {
  persistor.flush();
};

export const initializeStore = async () => {
  try {
    await new Promise<void>((resolve) => {
      const unsubscribe = store.subscribe(() => {
        const state = store.getState();
        // Check if rehydration is complete
        if (state._persist?.rehydrated) {
          unsubscribe();
          resolve();
        }
      });
    });

    console.log('Store initialized and rehydrated');
    return true;
  } catch (error) {
    console.error('Failed to initialize store:', error);
    return false;
  }
};
