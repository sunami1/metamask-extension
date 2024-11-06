import { isObject } from '@metamask/utils';
import { cloneDeep } from 'lodash';

type VersionedData = {
  meta: { version: number };
  data: Record<string, unknown>;
};

export const version = 132;

/**
 * This migration sets `redesignedTransactionsEnabled` as true by default in preferences in PreferencesController.
 *
 * @param originalVersionedData - Versioned MetaMask extension state, exactly what we persist to dist.
 * @param originalVersionedData.meta - State metadata.
 * @param originalVersionedData.meta.version - The current state version.
 * @param originalVersionedData.data - The persisted MetaMask state, keyed by controller.
 * @returns Updated versioned MetaMask extension state.
 */
export async function migrate(
  originalVersionedData: VersionedData,
): Promise<VersionedData> {
  const versionedData = cloneDeep(originalVersionedData);
  versionedData.meta.version = version;
  transformState(versionedData.data);
  return versionedData;
}

function transformState(
  state: Record<string, unknown>,
): Record<string, unknown> {
  const preferencesControllerState = state?.PreferencesController as
    | Record<string, unknown>
    | undefined;

  const preferences = preferencesControllerState?.preferences as
    | Record<string, unknown>
    | undefined;

  if (isObject(preferencesControllerState) && isObject(preferences)) {
    // `redesignedTransactionsEnabled` was previously set to `false` by default
    // in `124.ts`
    if (preferences.redesignedTransactionsEnabled === false) {
      preferences.redesignedTransactionsEnabled = true;
    }
  }

  return state;
}
