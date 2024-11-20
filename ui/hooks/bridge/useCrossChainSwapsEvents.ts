import { useCallback, useContext } from 'react';
import { MetaMetricsContext } from '../../contexts/metametrics';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
  MetaMetricsSwapsEventSource,
} from '../../../shared/constants/metametrics';
import { Json } from '@metamask/utils';

enum ActionType {
  CROSSCHAIN_V1 = 'crosschain-v1',
  SWAPBRIDGE_V1 = 'swapbridge-v1',
}

type RequestParams = {
  chain_id_source: string;
  chain_id_destination?: string;
  token_symbol_source: string;
  token_symbol_destination?: string;
  token_address_source: string;
  token_address_destination?: string;
};

type RequestAmounts = {
  slippage_limit: number;
  custom_slippage: boolean;
  usd_amount_source: number;
  stx_enabled: boolean;
  is_hardware_wallet: boolean;
  swap_type: 'crosschain' | 'single_chain';
};

type TradeData = {
  usd_quoted_gas: number;
  gas_included: boolean;
  quoted_time_minutes: number;
  usd_quoted_return: number;
  provider: `${string}_${string}`;
};

type QuoteFetchData = {
  can_submit: boolean;
  best_quote_provider?: `${string}_${string}`;
  quotes_count: number;
  quotes_list: `${string}_${string}`[];
  initial_load_time_all_quotes: number;
};

type CrossChainSwapsEventProperties = {
  [MetaMetricsEventName.ActionOpened]: RequestParams & {
    location: MetaMetricsSwapsEventSource;
  };
  [MetaMetricsEventName.ActionCompleted]: RequestParams &
    RequestAmounts &
    TradeData & {
      usd_actual_return: number;
      actual_time: number;
      quote_vs_execution_ratio: number;
      quoted_vs_used_gas_ratio: number;
    };
  [MetaMetricsEventName.ActionSubmitted]: RequestParams &
    RequestAmounts &
    TradeData;
  [MetaMetricsEventName.ActionFailed]: RequestParams &
    RequestAmounts &
    TradeData & {
      actual_time: number;
    };
  [MetaMetricsEventName.CrossChainSwapsQuotesRequested]: RequestParams &
    RequestAmounts & {
      has_sufficient_funds: boolean;
    };
  [MetaMetricsEventName.AllQuotesOpened]: RequestParams &
    RequestAmounts &
    QuoteFetchData;
  [MetaMetricsEventName.AllQuotesSorted]: RequestParams &
    RequestAmounts &
    QuoteFetchData;
  [MetaMetricsEventName.QuoteSelected]: RequestParams &
    RequestAmounts &
    QuoteFetchData &
    TradeData & {
      is_best_quote: boolean;
    };
  [MetaMetricsEventName.CrossChainSwapsQuotesReceived]: RequestParams &
    RequestAmounts &
    QuoteFetchData &
    TradeData & {
      refresh_count: number;
      warnings: string[];
    };
  [MetaMetricsEventName.InputSourceDestinationFlipped]: RequestParams;
  [MetaMetricsEventName.InputChanged]: {
    input:
      | 'token_source'
      | 'token_destination'
      | 'chain_source'
      | 'chain_destination'
      | 'slippage';
    value: string;
  };
  [MetaMetricsEventName.CrossChainSwapsQuoteError]: {
    error_message: Json;
  };
};

export const useCrossChainSwapsEvents = () => {
  const trackEvent = useContext(MetaMetricsContext);

  const trackCrossChainSwapsEvent = useCallback(
    <EventName extends keyof CrossChainSwapsEventProperties>({
      event,
      category,
      properties,
    }: {
      event: EventName;
      category?: MetaMetricsEventCategory;
      properties: CrossChainSwapsEventProperties[EventName];
    }) => {
      trackEvent({
        category: category ?? MetaMetricsEventCategory.CrossChainSwaps,
        event,
        properties: {
          action_type: ActionType.CROSSCHAIN_V1,
          ...properties,
        },
      });
    },
    [trackEvent],
  );

  return { trackCrossChainSwapsEvent };
};
