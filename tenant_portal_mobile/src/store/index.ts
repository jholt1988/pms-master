import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from 'redux';
import authReducer from './authSlice';
import userReducer from './userSlice';
import paymentsReducer from './paymentsSlice';
import maintenanceReducer from './maintenanceSlice';
import leaseReducer from './leaseSlice';
import notificationReducer from './notificationSlice';
import messageReducer from './messageSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'user'], // Only persist these reducers (not payments/maintenance/lease/notification/message - always fetch fresh)
};

// Combine reducers
const rootReducer = combineReducers({
  auth: authReducer,
 user: userReducer,
  payments: paymentsReducer,
  maintenance: maintenanceReducer,
  lease: leaseReducer,
  notification: notificationReducer,
  message: messageReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Create persistor
export const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
