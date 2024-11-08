import React from 'react';
import {
  SelectButtonProps,
  SelectButtonSize,
} from '../../../../components/component-library/select-button/select-button.types';
import {
  AvatarBase,
  AvatarNetwork,
  AvatarNetworkSize,
  AvatarToken,
  BadgeWrapper,
  BadgeWrapperPosition,
  Icon,
  IconSize,
  SelectButton,
  Text,
} from '../../../../components/component-library';
import {
  AlignItems,
  BackgroundColor,
  BlockSize,
  BorderColor,
  BorderRadius,
  IconColor,
  OverflowWrap,
  TextVariant,
} from '../../../../helpers/constants/design-system';
import { IconName } from '@metamask/snaps-sdk/jsx';
import { useI18nContext } from '../../../../hooks/useI18nContext';
import { AssetPicker } from '../../../../components/multichain/asset-picker-amount/asset-picker';
import { NETWORK_TO_NAME_MAP } from '../../../../../shared/constants/network';

export const BridgeAssetPickerButton = ({
  asset,
  networkProps,
  networkImageSrc,
  ...props
}: {
  networkImageSrc?: string;
} & SelectButtonProps<'div'> &
  Pick<React.ComponentProps<typeof AssetPicker>, 'asset' | 'networkProps'>) => {
  const t = useI18nContext();

  return (
    <SelectButton
      borderRadius={BorderRadius.pill}
      backgroundColor={BackgroundColor.backgroundDefault}
      borderColor={BorderColor.borderMuted}
      style={{
        width: '180px',
        height: '54px',
        maxWidth: '343px',
        paddingLeft: 12,
        paddingRight: 12,
        paddingTop: 5,
        paddingBottom: 5,
      }}
      gap={0}
      size={SelectButtonSize.Lg}
      alignItems={AlignItems.center}
      descriptionProps={{
        variant: TextVariant.bodyMd,
        overflowWrap: OverflowWrap.BreakWord,
        ellipsis: false,
      }}
      caretIconProps={{
        name: IconName.ArrowDown,
        color: IconColor.iconMuted,
        paddingLeft: 1,
      }}
      label={<Text ellipsis>{asset?.symbol ?? t('bridgeTo')}</Text>}
      description={
        asset && networkProps?.network
          ? t('onNetwork', [
              NETWORK_TO_NAME_MAP[
                networkProps.network.chainId as keyof typeof NETWORK_TO_NAME_MAP
              ] ?? networkProps.network.name,
            ])
          : undefined
      }
      startAccessory={
        <BadgeWrapper
          marginRight={2}
          badge={
            asset && networkProps?.network?.name ? (
              <AvatarNetwork
                name={networkProps.network.name}
                src={networkImageSrc}
                size={AvatarNetworkSize.Xs}
              />
            ) : undefined
          }
          position={BadgeWrapperPosition.bottomRight}
          badgeContainerProps={{ width: BlockSize.Min }}
          style={{ alignSelf: 'auto' }}
        >
          {asset ? (
            <AvatarToken
              src={asset.image || undefined}
              backgroundColor={BackgroundColor.backgroundHover}
              name={asset.symbol}
              borderColor={BorderColor.borderMuted}
            />
          ) : (
            <AvatarBase backgroundColor={BackgroundColor.backgroundHover}>
              <Icon
                name={IconName.Add}
                size={IconSize.Sm}
                color={IconColor.overlayInverse}
              />
            </AvatarBase>
          )}
        </BadgeWrapper>
      }
      {...props}
    />
  );
};
