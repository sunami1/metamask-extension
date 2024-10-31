import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  Button,
  ButtonVariant,
  Text,
} from '../../../components/component-library';
import {
  getBridgeQuotes,
  getValidationErrors,
} from '../../../ducks/bridge/selectors';
import { useI18nContext } from '../../../hooks/useI18nContext';
import {
  formatFiatAmount,
  formatTokenAmount,
  formatEtaInMinutes,
} from '../utils/quote';
import { useCountdownTimer } from '../../../hooks/bridge/useCountdownTimer';
import { getCurrentCurrency } from '../../../selectors';
import { getNativeCurrency } from '../../../ducks/metamask/metamask';
import { TextAlign } from '../../../helpers/constants/design-system';
import { QuoteInfoRow } from './quote-info-row';
import { BridgeQuotesModal } from './bridge-quotes-modal';

export const BridgeQuoteCard = () => {
  const t = useI18nContext();

  const { isLoading, activeQuote } = useSelector(getBridgeQuotes);
  const currency = useSelector(getCurrentCurrency);
  const ticker = useSelector(getNativeCurrency);
  const { isNoQuotesAvailable, isSrcAmountLessThan30 } =
    useSelector(getValidationErrors);

  const secondsUntilNextRefresh = useCountdownTimer();

  const [showAllQuotes, setShowAllQuotes] = useState(false);

  return (
    <Box className="quote-card">
      {activeQuote ? (
        <Box>
          <BridgeQuotesModal
            isOpen={showAllQuotes}
            onClose={() => setShowAllQuotes(false)}
          />
          <Box className="bridge-box quote-card__timer">
            {!isLoading && (
              <Text>{t('swapNewQuoteIn', [secondsUntilNextRefresh])}</Text>
            )}
          </Box>

          <Box className="bridge-box prepare-bridge-page__content quote-card__content">
            <QuoteInfoRow
              label={t('estimatedTime')}
              tooltipText={t('bridgeTimingTooltipText')}
              description={t('bridgeTimingMinutes', [
                formatEtaInMinutes(
                  activeQuote.estimatedProcessingTimeInSeconds,
                ),
              ])}
            />
            {activeQuote.swapRate && (
              <QuoteInfoRow
                label={t('quoteRate')}
                description={`1 ${
                  activeQuote.quote.srcAsset.symbol
                } = ${formatTokenAmount(
                  activeQuote.swapRate,
                  activeQuote.quote.destAsset.symbol,
                )}`}
              />
            )}
            {activeQuote.totalNetworkFee && (
              <QuoteInfoRow
                label={t('totalFees')}
                tooltipText={t('bridgeTotalFeesTooltipText')}
                description={
                  formatFiatAmount(
                    activeQuote.totalNetworkFee?.fiat,
                    currency,
                  ) ??
                  formatTokenAmount(activeQuote.totalNetworkFee?.raw, ticker, 6)
                }
                secondaryDescription={
                  activeQuote.totalNetworkFee?.fiat
                    ? formatTokenAmount(
                        activeQuote.totalNetworkFee?.raw,
                        ticker,
                        6,
                      )
                    : undefined
                }
              />
            )}
          </Box>

          <Box className="bridge-box quote-card__footer">
            <span>
              <Text>{t('swapIncludesMMFee', [0.875])}</Text>
              <Button
                variant={ButtonVariant.Link}
                onClick={() => {
                  setShowAllQuotes(true);
                }}
              >
                <Text>{t('viewAllQuotes')}</Text>
              </Button>
            </span>
            <Button variant={ButtonVariant.Link}>
              <Text>{t('termsOfService')}</Text>
            </Button>
          </Box>
        </Box>
      ) : null}
      {isNoQuotesAvailable && (
        <BannerAlert
          title={t('noOptionsAvailable')}
          severity={BannerAlertSeverity.Danger}
          description={
            isSrcAmountLessThan30
              ? t('noOptionsAvailableLessThan30Message')
              : t('noOptionsAvailableMessage')
          }
          textAlign={TextAlign.Left}
        />
      )}
    </Box>
  );
};
