import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ButtonPrimary,
  ButtonPrimarySize,
  Icon,
  IconName,
  PopoverPosition,
} from '../../../components/component-library';
import {
  getFromAmount,
  getFromChain,
  getFromToken,
  getToChain,
  getToToken,
  getBridgeQuotes,
  getValidationErrors,
} from '../../../ducks/bridge/selectors';
import { useI18nContext } from '../../../hooks/useI18nContext';
import useSubmitBridgeTransaction from '../hooks/useSubmitBridgeTransaction';
import {
  BlockSize,
  TextVariant,
} from '../../../helpers/constants/design-system';
import useLatestBalance from '../../../hooks/bridge/useLatestBalance';
import { SWAPS_CHAINID_DEFAULT_TOKEN_MAP } from '../../../../shared/constants/swaps';
import { Row, Tooltip } from '../layout';
import { getNativeCurrency } from '../../../ducks/metamask/metamask';

export const BridgeCTAButton = () => {
  const dispatch = useDispatch();
  const t = useI18nContext();

  const fromToken = useSelector(getFromToken);
  const toToken = useSelector(getToToken);

  const fromChain = useSelector(getFromChain);
  const toChain = useSelector(getToChain);

  const fromAmount = useSelector(getFromAmount);

  const { isLoading, activeQuote } = useSelector(getBridgeQuotes);

  const { submitBridgeTransaction } = useSubmitBridgeTransaction();
  const {
    isNoQuotesAvailable,
    isInsufficientBalance: isInsufficientBalance_,
    isInsufficientGasBalance: isInsufficientGasBalance_,
    isInsufficientGasForQuote: isInsufficientGasForQuote_,
  } = useSelector(getValidationErrors);

  const ticker = useSelector(getNativeCurrency);

  const { normalizedBalance } = useLatestBalance(fromToken, fromChain?.chainId);
  const { normalizedBalance: nativeAssetBalance } = useLatestBalance(
    fromChain?.chainId
      ? SWAPS_CHAINID_DEFAULT_TOKEN_MAP[
          fromChain.chainId as keyof typeof SWAPS_CHAINID_DEFAULT_TOKEN_MAP
        ]
      : null,
    fromChain?.chainId,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isInsufficientBalance = isInsufficientBalance_(normalizedBalance);
  const isInsufficientGasBalance =
    isInsufficientGasBalance_(nativeAssetBalance);
  const isInsufficientGasForQuote =
    isInsufficientGasForQuote_(nativeAssetBalance);

  const isTxSubmittable =
    fromToken &&
    toToken &&
    fromChain &&
    toChain &&
    fromAmount &&
    activeQuote &&
    !isInsufficientBalance &&
    !isInsufficientGasBalance &&
    !isInsufficientGasForQuote &&
    !isSubmitting;

  const label = useMemo(() => {
    if (isLoading && !isTxSubmittable) {
      return t('swapFetchingQuotes');
    }

    if (isNoQuotesAvailable) {
      return t('swapQuotesNotAvailableErrorTitle');
    }

    if (isInsufficientBalance) {
      return t('alertReasonInsufficientBalance');
    }

    if (isInsufficientGasForQuote) {
      return (
        <Row gap={1}>
          {t('bridgeValidationInsufficientGasReason')}
          <Tooltip
            title={t('bridgeValidationInsufficientGasTitle', [ticker])}
            position={PopoverPosition.TopEnd}
            iconName={IconName.Info}
            isOpen
          >
            {t('bridgeValidationInsufficientGasMessage', [ticker])}
          </Tooltip>
        </Row>
      );
    }

    if (!fromAmount) {
      if (!toToken) {
        return t('bridgeSelectTokenAndAmount');
      }
      return t('bridgeEnterAmount');
    }

    if (isTxSubmittable) {
      return t('confirm');
    }

    return t('swapSelectToken');
  }, [
    isLoading,
    fromAmount,
    toToken,
    ticker,
    isTxSubmittable,
    normalizedBalance,
    isInsufficientBalance,
    isInsufficientGasBalance,
    isInsufficientGasForQuote,
  ]);

  return (
    <ButtonPrimary
      width={BlockSize.Full}
      size={activeQuote ? ButtonPrimarySize.Md : ButtonPrimarySize.Lg}
      variant={TextVariant.bodyMd}
      data-testid="bridge-cta-button"
      onClick={() => {
        if (isTxSubmittable) {
          setIsSubmitting(true);
          dispatch(submitBridgeTransaction(activeQuote));
        }
      }}
      disabled={!isTxSubmittable}
    >
      {label}
    </ButtonPrimary>
  );
};
