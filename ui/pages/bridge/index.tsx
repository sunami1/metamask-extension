import React, { useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Switch, useHistory } from 'react-router-dom';
import { zeroAddress } from 'ethereumjs-util';
import { I18nContext } from '../../contexts/i18n';
import { clearSwapsState } from '../../ducks/swaps/swaps';
import {
  DEFAULT_ROUTE,
  SWAPS_MAINTENANCE_ROUTE,
  PREPARE_SWAP_ROUTE,
  CROSS_CHAIN_SWAP_ROUTE,
} from '../../helpers/constants/routes';
import { resetBackgroundSwapsState } from '../../store/actions';
import FeatureToggledRoute from '../../helpers/higher-order-components/feature-toggled-route';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '../../components/component-library';
import {
  getCurrentCurrency,
  getIsBridgeChain,
  getIsBridgeEnabled,
} from '../../selectors';
import useBridging from '../../hooks/bridge/useBridging';
import { Content, Header, Page } from '../../components/multichain/pages/page';
import { getProviderConfig } from '../../ducks/metamask/metamask';
import { useSwapsFeatureFlags } from '../swaps/hooks/useSwapsFeatureFlags';
import {
  resetBridgeState,
  setFromChain,
  setSrcTokenExchangeRates,
} from '../../ducks/bridge/actions';
import { useGasFeeEstimates } from '../../hooks/useGasFeeEstimates';
import { TextVariant } from '../../helpers/constants/design-system';
import PrepareBridgePage from './prepare/prepare-bridge-page';
import { BridgeTransactionSettingsModal } from './prepare/bridge-transaction-settings-modal';

const CrossChainSwap = () => {
  const t = useContext(I18nContext);

  // Load swaps feature flags so that we can use smart transactions
  useSwapsFeatureFlags();
  useBridging();

  const history = useHistory();
  const dispatch = useDispatch();

  const isBridgeEnabled = useSelector(getIsBridgeEnabled);
  const providerConfig = useSelector(getProviderConfig);
  const isBridgeChain = useSelector(getIsBridgeChain);
  const currency = useSelector(getCurrentCurrency);

  useEffect(() => {
    if (isBridgeChain && isBridgeEnabled && providerConfig && currency) {
      dispatch(setFromChain(providerConfig.chainId));
      dispatch(
        setSrcTokenExchangeRates({
          chainId: providerConfig.chainId,
          tokenAddress: zeroAddress(),
          currency,
        }),
      );
    }
  }, [isBridgeChain, isBridgeEnabled, providerConfig, currency]);

  const resetControllerAndInputStates = async () => {
    await dispatch(resetBridgeState());
  };

  useEffect(() => {
    // Reset controller and inputs before unloading the page
    resetControllerAndInputStates();

    window.addEventListener('beforeunload', resetControllerAndInputStates);

    return () => {
      window.removeEventListener('beforeunload', resetControllerAndInputStates);
      resetControllerAndInputStates();
    };
  }, []);

  // Needed for refreshing gas estimates
  useGasFeeEstimates(providerConfig?.id);

  const redirectToDefaultRoute = async () => {
    history.push({
      pathname: DEFAULT_ROUTE,
      state: { stayOnHomePage: true },
    });
    dispatch(clearSwapsState());
    await dispatch(resetBackgroundSwapsState());
    await resetControllerAndInputStates();
  };

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  return (
    <Page className="bridge__container">
      <Header
        textProps={{ variant: TextVariant.headingSm }}
        startAccessory={
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Sm}
            ariaLabel={t('back')}
            onClick={redirectToDefaultRoute}
          />
        }
        endAccessory={
          <ButtonIcon
            iconName={IconName.Setting}
            size={ButtonIconSize.Sm}
            ariaLabel={t('settings')}
            onClick={() => setIsSettingsModalOpen(true)}
          />
        }
      >
        {t('bridge')}
      </Header>
      <Content paddingTop={0}>
        <Switch>
          <FeatureToggledRoute
            redirectRoute={SWAPS_MAINTENANCE_ROUTE}
            flag={isBridgeEnabled}
            path={CROSS_CHAIN_SWAP_ROUTE + PREPARE_SWAP_ROUTE}
            render={() => {
              return (
                <>
                  <BridgeTransactionSettingsModal
                    isOpen={isSettingsModalOpen}
                    onClose={() => setIsSettingsModalOpen(false)}
                  />
                  <PrepareBridgePage />
                </>
              );
            }}
          />
        </Switch>
      </Content>
    </Page>
  );
};

export default CrossChainSwap;
