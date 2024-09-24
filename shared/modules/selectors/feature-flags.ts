import { getNetworkNameByChainId } from '../feature-flags';
import { NetworkState, getCurrentChainId } from './networks';

type FeatureFlagsMetaMaskState = {
  metamask: {
    swapsState: {
      swapsFeatureFlags: {
        [key: string]: {
          extensionActive: boolean;
          mobileActive: boolean;
          smartTransactions: {
            expectedDeadline?: number;
            maxDeadline?: number;
            returnTxHashAsap?: boolean;
          };
        };
      };
    };
  };
};

export function getFeatureFlagsByChainId(
  state: NetworkState & FeatureFlagsMetaMaskState,
) {
  const chainId = getCurrentChainId(state);
  const networkName = getNetworkNameByChainId(chainId);
  const featureFlags = state.metamask.swapsState?.swapsFeatureFlags;
  if (!featureFlags?.[networkName]) {
    return null;
  }
  return {
    smartTransactions: {
      ...featureFlags.smartTransactions,
      ...featureFlags[networkName].smartTransactions,
    },
  };
}
