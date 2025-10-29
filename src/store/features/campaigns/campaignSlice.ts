import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/store';

interface CampaignState {
  name: string;
  subject: string;
  body: string;
  cc: string[];
  bcc: string[];
  selectedMemberIds: string[];
  reply_to?: string;
}

const initialState: CampaignState = {
  name: 'New Campaign',
  subject: '',
  body: '',
  cc: [],
  bcc: [],
  selectedMemberIds: [],
};

export const campaignSlice = createSlice({
  name: 'campaign',
  initialState,
  reducers: {
    setCampaignName: (state, action: PayloadAction<string>) => {
      state.name = action.payload;
    },
    setSubject: (state, action: PayloadAction<string>) => {
      state.subject = action.payload;
    },
    setBody: (state, action: PayloadAction<string>) => {
      state.body = action.payload;
    },
    setCc: (state, action: PayloadAction<string[]>) => {
      state.cc = action.payload;
    },
    setBcc: (state, action: PayloadAction<string[]>) => {
      state.bcc = action.payload;
    },
    setSelectedMemberIds: (state, action: PayloadAction<string[]>) => {
      state.selectedMemberIds = action.payload;
    },
    setReplyTo: (state, action: PayloadAction<string | undefined>) => {
      state.reply_to = action.payload;
    },
    resetCampaign: () => initialState,
  },
});

export const {
  setCampaignName,
  setSubject,
  setBody,
  setCc,
  setBcc,
  setSelectedMemberIds,
  setReplyTo,
  resetCampaign,
} = campaignSlice.actions;

// Selectors
export const selectCampaignData = (state: RootState) => state.campaign;
export const selectCampaignName = (state: RootState) => state.campaign.name;
export const selectSelectedMemberIds = (state: RootState) => state.campaign.selectedMemberIds;
export const selectSelectedMembersCount = (state: RootState) => state.campaign.selectedMemberIds.length;

export default campaignSlice.reducer;

