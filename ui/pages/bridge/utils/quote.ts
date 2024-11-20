import { zeroAddress } from 'ethereumjs-util';
import { BigNumber } from 'bignumber.js';
import { calcTokenAmount } from '../../../../shared/lib/transactions-controller-utils';
import { QuoteResponse, QuoteRequest, Quote, L1GasFees } from '../types';
import {
  hexToDecimal,
  sumDecimals,
} from '../../../../shared/modules/conversion.utils';
<<<<<<< HEAD
=======
import { formatCurrency } from '../../../helpers/utils/confirm-tx.util';
import { DEFAULT_PRECISION } from '../../../hooks/useCurrencyDisplay';
import { Numeric } from '../../../../shared/modules/Numeric';
import { EtherDenomination } from '../../../../shared/constants/common';
>>>>>>> 61f029ee7a (chore: add L1 fees for Base and Optimism)

export const isNativeAddress = (address?: string) => address === zeroAddress();

export const isValidQuoteRequest = (
  partialRequest: Partial<QuoteRequest>,
  requireAmount = true,
): partialRequest is QuoteRequest => {
  const STRING_FIELDS = ['srcTokenAddress', 'destTokenAddress'];
  if (requireAmount) {
    STRING_FIELDS.push('srcTokenAmount');
  }
  const NUMBER_FIELDS = ['srcChainId', 'destChainId', 'slippage'];

  return (
    STRING_FIELDS.every(
      (field) =>
        field in partialRequest &&
        typeof partialRequest[field as keyof typeof partialRequest] ===
          'string' &&
        partialRequest[field as keyof typeof partialRequest] !== undefined &&
        partialRequest[field as keyof typeof partialRequest] !== '' &&
        partialRequest[field as keyof typeof partialRequest] !== null,
    ) &&
    NUMBER_FIELDS.every(
      (field) =>
        field in partialRequest &&
        typeof partialRequest[field as keyof typeof partialRequest] ===
          'number' &&
        partialRequest[field as keyof typeof partialRequest] !== undefined &&
        !isNaN(Number(partialRequest[field as keyof typeof partialRequest])) &&
        partialRequest[field as keyof typeof partialRequest] !== null,
    )
  );
};

export const calcToAmount = (
  { destTokenAmount, destAsset }: Quote,
  exchangeRate: number | null,
) => {
  const normalizedDestAmount = calcTokenAmount(
    destTokenAmount,
    destAsset.decimals,
  );
  return {
    raw: normalizedDestAmount,
    fiat: exchangeRate ? normalizedDestAmount.mul(exchangeRate) : null,
  };
};

export const calcSentAmount = (
  { srcTokenAmount, srcAsset, feeData }: Quote,
  exchangeRate: number | null,
) => {
  const normalizedSentAmount = calcTokenAmount(
    new BigNumber(srcTokenAmount).plus(feeData.metabridge.amount),
    srcAsset.decimals,
  );
  return {
    raw: normalizedSentAmount,
    fiat: exchangeRate
      ? normalizedSentAmount.mul(exchangeRate.toString())
      : null,
  };
};

const calcRelayerFee = (
  bridgeQuote: QuoteResponse,
  nativeExchangeRate?: number,
) => {
  const {
    quote: { srcAsset, srcTokenAmount, feeData },
    trade,
  } = bridgeQuote;
  const relayerFeeInNative = calcTokenAmount(
    new BigNumber(hexToDecimal(trade.value)).minus(
      isNativeAddress(srcAsset.address)
        ? new BigNumber(srcTokenAmount).plus(feeData.metabridge.amount)
        : 0,
    ),
    18,
  );
  return {
    raw: relayerFeeInNative,
    fiat: nativeExchangeRate
      ? relayerFeeInNative.mul(nativeExchangeRate)
      : null,
  };
};

const calcTotalGasFee = (
  bridgeQuote: QuoteResponse & L1GasFees,
  estimatedBaseFeeInDecGwei: string,
  maxPriorityFeePerGasInDecGwei: string,
  nativeExchangeRate?: number,
) => {
  const { approval, trade, l1GasFeesInHexWei } = bridgeQuote;
  const totalGasLimitInDec = sumDecimals(
    trade.gasLimit?.toString() ?? '0',
    approval?.gasLimit?.toString() ?? '0',
  );
  const feePerGasInDecGwei = sumDecimals(
    estimatedBaseFeeInDecGwei,
    maxPriorityFeePerGasInDecGwei,
  );

  const l1GasFeesInDecGWei = Numeric.from(
    l1GasFeesInHexWei ?? '0',
    16,
    EtherDenomination.WEI,
  ).toDenomination(EtherDenomination.GWEI);

  const gasFeesInDecGwei = totalGasLimitInDec
    .times(feePerGasInDecGwei)
    .add(l1GasFeesInDecGWei);

  const gasFeesInDecEth = new BigNumber(
    gasFeesInDecGwei.shiftedBy(9).toString(),
  );
  const gasFeesInUSD = nativeExchangeRate
    ? gasFeesInDecEth.times(nativeExchangeRate)
    : null;

  return {
    raw: gasFeesInDecEth,
    fiat: gasFeesInUSD,
  };
};

export const calcTotalNetworkFee = (
  bridgeQuote: QuoteResponse & L1GasFees,
  estimatedBaseFeeInDecGwei: string,
  maxPriorityFeePerGasInDecGwei: string,
  nativeExchangeRate?: number,
) => {
  const normalizedGasFee = calcTotalGasFee(
    bridgeQuote,
    estimatedBaseFeeInDecGwei,
    maxPriorityFeePerGasInDecGwei,
    nativeExchangeRate,
  );
  const normalizedRelayerFee = calcRelayerFee(bridgeQuote, nativeExchangeRate);
  return {
    raw: normalizedGasFee.raw.plus(normalizedRelayerFee.raw),
    fiat: normalizedGasFee.fiat?.plus(normalizedRelayerFee.fiat || '0') ?? null,
  };
};

export const calcAdjustedReturn = (
  destTokenAmountInFiat: BigNumber | null,
  totalNetworkFeeInFiat: BigNumber | null,
) => ({
  fiat:
    destTokenAmountInFiat && totalNetworkFeeInFiat
      ? destTokenAmountInFiat.minus(totalNetworkFeeInFiat)
      : null,
});

export const calcSwapRate = (
  sentAmount: BigNumber,
  destTokenAmount: BigNumber,
) => destTokenAmount.div(sentAmount);

export const calcCost = (
  adjustedReturnInFiat: BigNumber | null,
  sentAmountInFiat: BigNumber | null,
) => ({
  fiat:
    adjustedReturnInFiat && sentAmountInFiat
      ? adjustedReturnInFiat.minus(sentAmountInFiat)
      : null,
});

export const formatEtaInMinutes = (estimatedProcessingTimeInSeconds: number) =>
  (estimatedProcessingTimeInSeconds / 60).toFixed();
