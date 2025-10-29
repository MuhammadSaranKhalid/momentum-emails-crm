import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserAccount } from '@/types/user-tokens';

interface AccountsState {
  selectedAccount: UserAccount | null;
}

const initialState: AccountsState = {
  selectedAccount: null,
};

const accountsSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    setSelectedAccount: (state, action: PayloadAction<UserAccount | null>) => {
      state.selectedAccount = action.payload;
    },
    clearSelectedAccount: (state) => {
      state.selectedAccount = null;
    },
  },
});

export const { setSelectedAccount, clearSelectedAccount } = accountsSlice.actions;

export default accountsSlice.reducer;