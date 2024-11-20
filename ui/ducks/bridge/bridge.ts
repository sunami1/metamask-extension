import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Hex } from '@metamask/utils';
import { getAddress } from 'ethers/lib/utils';
import { swapsSlice } from '../swaps/swaps';
import { SwapsTokenObject } from '../../../shared/constants/swaps';
import { SwapsEthToken } from '../../selectors';
import { fetchTokenExchangeRates } from '../../helpers/utils/util';
import {
  QuoteMetadata,
  QuoteResponse,
  SortOrder,
} from '../../pages/bridge/types';

export type BridgeState = {
  toChainId: Hex | null;
  fromToken: SwapsTokenObject | SwapsEthToken | null;
  toToken: SwapsTokenObject | SwapsEthToken | null;
  fromTokenInputValue: string | null;
  fromTokenExchangeRate: number | null;
  toTokenExchangeRate: number | null;
  sortOrder: SortOrder;
  selectedQuote: (QuoteResponse & QuoteMetadata) | null; // Alternate quote selected by user. When quotes refresh, the best match will be activated.
};

const initialState: BridgeState = {
  toChainId: null,
  fromToken: null,
  toToken: null,
  fromTokenInputValue: null,
  fromTokenExchangeRate: null,
  toTokenExchangeRate: null,
  sortOrder: SortOrder.COST_ASC,
  selectedQuote: null,
};

export const setSrcTokenExchangeRates = createAsyncThunk(
  'bridge/setSrcTokenExchangeRates',
  async (request: { chainId: Hex; tokenAddress: string; currency: string }) => {
    const { chainId, tokenAddress, currency } = request;
    const exchangeRates = await fetchTokenExchangeRates(
      currency,
      [tokenAddress],
      chainId,
    );
    return exchangeRates?.[getAddress(tokenAddress)];
  },
);

export const setDestTokenExchangeRates = createAsyncThunk(
  'bridge/setDestTokenExchangeRates',
  async (request: { chainId: Hex; tokenAddress: string; currency: string }) => {
    const { chainId, tokenAddress, currency } = request;
    const exchangeRates = await fetchTokenExchangeRates(
      currency,
      [tokenAddress],
      chainId,
    );
    return {
      toTokenExchangeRate: exchangeRates?.[getAddress(tokenAddress)],
    };
  },
);

const bridgeSlice = createSlice({
  name: 'bridge',
  initialState: { ...initialState },
  reducers: {
    ...swapsSlice.reducer,
    setToChainId: (state, action) => {
      state.toChainId = action.payload;
    },
    setFromToken: (state, action) => {
      state.fromToken = action.payload;
    },
    setToToken: (state, action) => {
      state.toToken = action.payload;
    },
    setFromTokenInputValue: (state, action) => {
      state.fromTokenInputValue = action.payload;
    },
    resetInputFields: () => ({
      ...initialState,
    }),
    setSortOrder: (state, action) => {
      state.sortOrder = action.payload;
    },
    setSelectedQuote: (state, action) => {
      state.selectedQuote = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(setDestTokenExchangeRates.fulfilled, (state, action) => {
      state.toTokenExchangeRate = action.payload.toTokenExchangeRate ?? null;
    });
    builder.addCase(setSrcTokenExchangeRates.fulfilled, (state, action) => {
      state.fromTokenExchangeRate = action.payload ?? null;
    });
  },
});

export { bridgeSlice };
export default bridgeSlice.reducer;
