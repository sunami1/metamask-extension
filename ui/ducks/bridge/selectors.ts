import {
  NetworkConfiguration,
  NetworkState,
} from '@metamask/network-controller';
import { orderBy, uniqBy } from 'lodash';
import { createSelector } from 'reselect';
import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import { BigNumber } from 'bignumber.js';
import { zeroAddress } from 'ethereumjs-util';
import { calcTokenAmount } from '@metamask/notification-services-controller/push-services';
import {
  getNetworkConfigurationsByChainId,
  getIsBridgeEnabled,
  getCurrentCurrency,
} from '../../selectors/selectors';
import {
  ALLOWED_BRIDGE_CHAIN_IDS,
  BRIDGE_PREFERRED_GAS_ESTIMATE,
  BRIDGE_QUOTE_MAX_ETA_SECONDS,
  BRIDGE_QUOTE_MAX_RETURN_DIFFERENCE_PERCENTAGE,
  BRIDGE_MIN_FIAT_SRC_AMOUNT,
} from '../../../shared/constants/bridge';
import {
  BridgeControllerState,
  BridgeFeatureFlagsKey,
  // TODO: Remove restricted import
  // eslint-disable-next-line import/no-restricted-paths
} from '../../../app/scripts/controllers/bridge/types';
import { createDeepEqualSelector } from '../../selectors/util';
import { SWAPS_CHAINID_DEFAULT_TOKEN_MAP } from '../../../shared/constants/swaps';
import {
  getConversionRate,
  getGasFeeEstimates,
  getProviderConfig,
} from '../metamask/metamask';
// TODO: Remove restricted import
// eslint-disable-next-line import/no-restricted-paths
import { RequestStatus } from '../../../app/scripts/controllers/bridge/constants';
import {
  L1GasFees,
  BridgeToken,
  QuoteMetadata,
  QuoteResponse,
  SortOrder,
} from '../../pages/bridge/types';
import {
  calcAdjustedReturn,
  calcCost,
  calcSentAmount,
  calcSwapRate,
  calcToAmount,
  calcTotalNetworkFee,
  isNativeAddress,
} from '../../pages/bridge/utils/quote';
import {
  decGWEIToHexWEI,
  decEthToConvertedCurrency,
} from '../../../shared/modules/conversion.utils';
import { NetworkCongestionThresholds } from '../../../shared/constants/gas';
import { BridgeState } from './bridge';

export type BridgeAppState = {
  metamask: NetworkState & { bridgeState: BridgeControllerState } & {
    useExternalServices: boolean;
    currencyRates: { [currency: string]: { conversionRate: number } };
  };
  bridge: BridgeState;
};

// only includes networks user has added
export const getAllBridgeableNetworks = createDeepEqualSelector(
  getNetworkConfigurationsByChainId,
  (networkConfigurationsByChainId) => {
    return uniqBy(
      Object.values(networkConfigurationsByChainId),
      'chainId',
    ).filter(({ chainId }) =>
      ALLOWED_BRIDGE_CHAIN_IDS.includes(
        chainId as (typeof ALLOWED_BRIDGE_CHAIN_IDS)[number],
      ),
    );
  },
);

export const getFromChains = createDeepEqualSelector(
  getAllBridgeableNetworks,
  (state: BridgeAppState) => state.metamask.bridgeState?.bridgeFeatureFlags,
  (allBridgeableNetworks, bridgeFeatureFlags) =>
    allBridgeableNetworks.filter(({ chainId }) =>
      bridgeFeatureFlags[BridgeFeatureFlagsKey.NETWORK_SRC_ALLOWLIST].includes(
        chainId,
      ),
    ),
);

export const getFromChain = createDeepEqualSelector(
  getNetworkConfigurationsByChainId,
  getProviderConfig,
  (
    networkConfigurationsByChainId,
    providerConfig,
  ): NetworkConfiguration | undefined =>
    providerConfig?.chainId
      ? networkConfigurationsByChainId[providerConfig.chainId]
      : undefined,
);

export const getToChains = createDeepEqualSelector(
  getAllBridgeableNetworks,
  (state: BridgeAppState) => state.metamask.bridgeState?.bridgeFeatureFlags,
  (allBridgeableNetworks, bridgeFeatureFlags): NetworkConfiguration[] =>
    allBridgeableNetworks.filter(({ chainId }) =>
      bridgeFeatureFlags[BridgeFeatureFlagsKey.NETWORK_DEST_ALLOWLIST].includes(
        chainId,
      ),
    ),
);

export const getToChain = createDeepEqualSelector(
  getToChains,
  (state: BridgeAppState) => state.bridge.toChainId,
  (toChains, toChainId): NetworkConfiguration | undefined =>
    toChains.find(({ chainId }) => chainId === toChainId),
);

export const getFromTokens = createDeepEqualSelector(
  (state: BridgeAppState) => state.metamask.bridgeState.srcTokens,
  (state: BridgeAppState) => state.metamask.bridgeState.srcTopAssets,
  (state: BridgeAppState) =>
    state.metamask.bridgeState.srcTokensLoadingStatus === RequestStatus.LOADING,
  (fromTokens, fromTopAssets, isLoading) => {
    return {
      isLoading,
      fromTokens: fromTokens ?? {},
      fromTopAssets: fromTopAssets ?? [],
    };
  },
);

export const getToTokens = createDeepEqualSelector(
  (state: BridgeAppState) => state.metamask.bridgeState.destTokens,
  (state: BridgeAppState) => state.metamask.bridgeState.destTopAssets,
  (state: BridgeAppState) =>
    state.metamask.bridgeState.destTokensLoadingStatus ===
    RequestStatus.LOADING,
  (toTokens, toTopAssets, isLoading) => {
    return {
      isLoading,
      toTokens: toTokens ?? {},
      toTopAssets: toTopAssets ?? [],
    };
  },
);

export const getFromToken = createSelector(
  (state: BridgeAppState) => state.bridge.fromToken,
  getFromChain,
  (fromToken, fromChain): BridgeToken | null => {
    if (!fromChain?.chainId) {
      return null;
    }
    return fromToken?.address
      ? fromToken
      : SWAPS_CHAINID_DEFAULT_TOKEN_MAP[
          fromChain.chainId as keyof typeof SWAPS_CHAINID_DEFAULT_TOKEN_MAP
        ];
  },
);

export const getToToken = (state: BridgeAppState): BridgeToken | null => {
  return state.bridge.toToken;
};

export const getFromAmount = (state: BridgeAppState): string | null =>
  state.bridge.fromTokenInputValue;

export const getQuoteRequest = (state: BridgeAppState) => {
  const { quoteRequest } = state.metamask.bridgeState;
  return quoteRequest;
};

export const getBridgeQuotesConfig = (state: BridgeAppState) =>
  state.metamask.bridgeState?.bridgeFeatureFlags[
    BridgeFeatureFlagsKey.EXTENSION_CONFIG
  ] ?? {};

const _getBridgeFeesPerGas = createSelector(
  getGasFeeEstimates,
  (gasFeeEstimates) => ({
    estimatedBaseFeeInDecGwei: (gasFeeEstimates as GasFeeEstimates)
      ?.estimatedBaseFee,
    maxPriorityFeePerGasInDecGwei: (gasFeeEstimates as GasFeeEstimates)?.[
      BRIDGE_PREFERRED_GAS_ESTIMATE
    ]?.suggestedMaxPriorityFeePerGas,
    maxFeePerGas: decGWEIToHexWEI(
      (gasFeeEstimates as GasFeeEstimates)?.high?.suggestedMaxFeePerGas,
    ),
    maxPriorityFeePerGas: decGWEIToHexWEI(
      (gasFeeEstimates as GasFeeEstimates)?.high?.suggestedMaxPriorityFeePerGas,
    ),
  }),
);

export const getBridgeSortOrder = (state: BridgeAppState) =>
  state.bridge.sortOrder;

// A dest network can be selected before it's imported
// The cached exchange rate won't be available so the rate from the bridge state is used
const _getToTokenExchangeRate = createSelector(
  (state) => state.metamask.currencyRates,
  (state: BridgeAppState) => state.bridge.toTokenExchangeRate,
  getToChain,
  getToToken,
  (cachedCurrencyRates, toTokenExchangeRate, toChain, toToken) => {
    return (
      toTokenExchangeRate ??
      (isNativeAddress(toToken?.address) && toChain?.nativeCurrency
        ? cachedCurrencyRates[toChain.nativeCurrency]?.conversionRate
        : null)
    );
  },
);

const _getQuotesWithMetadata = createDeepEqualSelector(
  (state) => state.metamask.bridgeState.quotes,
  _getToTokenExchangeRate,
  (state: BridgeAppState) => state.bridge.fromTokenExchangeRate,
  getConversionRate,
  _getBridgeFeesPerGas,
  (
    quotes,
    toTokenExchangeRate,
    fromTokenExchangeRate,
    nativeExchangeRate,
    { estimatedBaseFeeInDecGwei, maxPriorityFeePerGasInDecGwei },
  ): (QuoteResponse & QuoteMetadata)[] => {
    const newQuotes = quotes.map((quote: QuoteResponse) => {
      const toTokenAmount = calcToAmount(quote.quote, toTokenExchangeRate);
      const totalNetworkFee = calcTotalNetworkFee(
        quote,
        estimatedBaseFeeInDecGwei,
        maxPriorityFeePerGasInDecGwei,
        nativeExchangeRate,
      );
      const sentAmount = calcSentAmount(
        quote.quote,
        isNativeAddress(quote.quote.srcAsset.address)
          ? nativeExchangeRate
          : fromTokenExchangeRate,
      );
      const adjustedReturn = calcAdjustedReturn(
        toTokenAmount.fiat,
        totalNetworkFee.fiat,
      );

      return {
        ...quote,
        toTokenAmount,
        sentAmount,
        totalNetworkFee,
        adjustedReturn,
        swapRate: calcSwapRate(sentAmount.amount, toTokenAmount.amount),
        cost: calcCost(adjustedReturn.fiat, sentAmount.fiat),
      };
    });

    return newQuotes;
  },
);

const _getSortedQuotesWithMetadata = createDeepEqualSelector(
  _getQuotesWithMetadata,
  getBridgeSortOrder,
  (quotesWithMetadata, sortOrder) => {
    switch (sortOrder) {
      case SortOrder.ETA_ASC:
        return orderBy(
          quotesWithMetadata,
          (quote) => quote.estimatedProcessingTimeInSeconds,
          'asc',
        );
      case SortOrder.COST_ASC:
      default:
        return orderBy(quotesWithMetadata, ({ cost }) => cost.fiat, 'asc');
    }
  },
);

const _getRecommendedQuote = createDeepEqualSelector(
  _getSortedQuotesWithMetadata,
  getBridgeSortOrder,
  (sortedQuotesWithMetadata, sortOrder) => {
    if (!sortedQuotesWithMetadata.length) {
      return undefined;
    }

    const bestReturnValue = BigNumber.max(
      sortedQuotesWithMetadata.map(
        ({ adjustedReturn }) => adjustedReturn.fiat ?? 0,
      ),
    );

    const isFastestQuoteValueReasonable = (
      adjustedReturnInFiat: BigNumber | null,
    ) =>
      adjustedReturnInFiat
        ? adjustedReturnInFiat
            .div(bestReturnValue)
            .gte(BRIDGE_QUOTE_MAX_RETURN_DIFFERENCE_PERCENTAGE)
        : true;

    const isBestPricedQuoteETAReasonable = (
      estimatedProcessingTimeInSeconds: number,
    ) => estimatedProcessingTimeInSeconds < BRIDGE_QUOTE_MAX_ETA_SECONDS;

    return (
      sortedQuotesWithMetadata.find((quote) => {
        return sortOrder === SortOrder.ETA_ASC
          ? isFastestQuoteValueReasonable(quote.adjustedReturn.fiat)
          : isBestPricedQuoteETAReasonable(
              quote.estimatedProcessingTimeInSeconds,
            );
      }) ?? sortedQuotesWithMetadata[0]
    );
  },
);

// Generates a pseudo-unique string that identifies each quote
// by aggregator, bridge, steps and value
const _getQuoteIdentifier = ({ quote }: QuoteResponse & L1GasFees) =>
  `${quote.bridgeId}-${quote.bridges[0]}-${quote.steps.length}`;

const _getSelectedQuote = createSelector(
  (state: BridgeAppState) => state.metamask.bridgeState.quotesRefreshCount,
  (state: BridgeAppState) => state.bridge.selectedQuote,
  _getSortedQuotesWithMetadata,
  (quotesRefreshCount, selectedQuote, sortedQuotesWithMetadata) =>
    quotesRefreshCount <= 1
      ? selectedQuote
      : // Find match for selectedQuote in new quotes
        sortedQuotesWithMetadata.find((quote) =>
          selectedQuote
            ? _getQuoteIdentifier(quote) === _getQuoteIdentifier(selectedQuote)
            : false,
        ),
);

export const getBridgeQuotes = createSelector(
  _getSortedQuotesWithMetadata,
  _getRecommendedQuote,
  _getSelectedQuote,
  (state) => state.metamask.bridgeState.quotesLastFetched,
  (state) =>
    state.metamask.bridgeState.quotesLoadingStatus === RequestStatus.LOADING,
  (state: BridgeAppState) => state.metamask.bridgeState.quotesRefreshCount,
  getBridgeQuotesConfig,
  getQuoteRequest,
  (
    sortedQuotesWithMetadata,
    recommendedQuote,
    selectedQuote,
    quotesLastFetchedMs,
    isLoading,
    quotesRefreshCount,
    { maxRefreshCount },
    { insufficientBal },
  ) => ({
    sortedQuotes: sortedQuotesWithMetadata,
    recommendedQuote,
    activeQuote: selectedQuote || recommendedQuote,
    quotesLastFetchedMs,
    isLoading,
    quotesRefreshCount,
    isQuoteGoingToRefresh: insufficientBal
      ? false
      : quotesRefreshCount < maxRefreshCount,
  }),
);

export const getSlippage = (state: BridgeAppState) => state.bridge.slippage;

const _getValidatedSrcAmount = createSelector(
  getFromToken,
  (state: BridgeAppState) =>
    state.metamask.bridgeState.quoteRequest.srcTokenAmount,
  (fromToken, srcTokenAmount) =>
    srcTokenAmount && fromToken?.decimals
      ? calcTokenAmount(srcTokenAmount, Number(fromToken.decimals)).toFixed()
      : null,
);

export const getFromAmountInFiat = createSelector(
  getFromToken,
  getFromChain,
  _getValidatedSrcAmount,
  (state: BridgeAppState) => state.bridge.fromTokenExchangeRate,
  getConversionRate,
  getCurrentCurrency,
  (
    fromToken,
    fromChain,
    validatedSrcAmount,
    fromTokenExchangeRate,
    nativeExchangeRate,
    currentCurrency,
  ) => {
    if (
      fromToken?.symbol &&
      fromChain?.chainId &&
      validatedSrcAmount &&
      nativeExchangeRate
    ) {
      if (fromToken.address === zeroAddress()) {
        return new BigNumber(
          decEthToConvertedCurrency(
            validatedSrcAmount,
            currentCurrency,
            nativeExchangeRate,
          ).toString(),
        );
      }
      if (fromTokenExchangeRate) {
        return new BigNumber(validatedSrcAmount).mul(
          new BigNumber(fromTokenExchangeRate.toString() ?? 1),
        );
      }
    }
    return new BigNumber(0);
  },
);

export const getIsBridgeTx = createDeepEqualSelector(
  getFromChain,
  getToChain,
  (state: BridgeAppState) => getIsBridgeEnabled(state),
  (fromChain, toChain, isBridgeEnabled: boolean) =>
    isBridgeEnabled && toChain && fromChain?.chainId
      ? fromChain.chainId !== toChain.chainId
      : false,
);

export const getValidationErrors = createDeepEqualSelector(
  getBridgeQuotes,
  getFromAmountInFiat,
  _getValidatedSrcAmount,
  getGasFeeEstimates,
  (
    { activeQuote, quotesLastFetchedMs, isLoading },
    fromAmountInFiat,
    validatedSrcAmount,
    { networkCongestion },
  ) => {
    return {
      isNoQuotesAvailable: !activeQuote && quotesLastFetchedMs && !isLoading,
      isSrcAmountLessThan30:
        activeQuote?.sentAmount.fiat?.lt(30) &&
        activeQuote?.sentAmount.fiat?.gt(BRIDGE_MIN_FIAT_SRC_AMOUNT),
      isEstimatedReturnLow:
        activeQuote?.sentAmount?.fiat && activeQuote?.adjustedReturn?.fiat
          ? activeQuote.adjustedReturn.fiat.lt(
              new BigNumber(
                BRIDGE_QUOTE_MAX_RETURN_DIFFERENCE_PERCENTAGE,
              ).times(activeQuote.sentAmount.fiat),
            )
          : false,
      isSrcAmountTooLow:
        validatedSrcAmount &&
        fromAmountInFiat.lte(BRIDGE_MIN_FIAT_SRC_AMOUNT) &&
        fromAmountInFiat.gt(0),
      isInsufficientGasBalance: (balance?: BigNumber) =>
        balance && activeQuote?.totalNetworkFee?.amount
          ? activeQuote.totalNetworkFee.amount.gt(balance)
          : false,
      isInsufficientBalance: (balance?: BigNumber) =>
        validatedSrcAmount && balance !== undefined
          ? balance.lt(validatedSrcAmount)
          : false,
      isNetworkCongested: networkCongestion
        ? networkCongestion >= NetworkCongestionThresholds.busy
        : false,
    };
  },
);
