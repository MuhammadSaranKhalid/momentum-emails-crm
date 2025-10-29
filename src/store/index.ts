import { configureStore } from '@reduxjs/toolkit';
import accountsReducer from './features/accounts/accountsSlice';
import campaignReducer from './features/campaigns/campaignSlice';

export const store = configureStore({
  reducer: {
    accounts: accountsReducer,
    campaign: campaignReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;