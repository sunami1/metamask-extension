import React, { useState } from 'react';
import {
  Box,
  Icon,
  IconName,
  IconSize,
  Popover,
  PopoverHeader,
  PopoverPosition,
  PopoverProps,
  Text,
} from '../../../components/component-library';
import {
  IconColor,
  JustifyContent,
  TextAlign,
  TextColor,
} from '../../../helpers/constants/design-system';
import Column from './column';

const Tooltip = React.forwardRef(
  ({
    children,
    title,
    triggerElement,
    disabled = false,
    onClose,
    iconName,
    ...props
  }: PopoverProps<'div'> & {
    triggerElement?: React.ReactElement;
    disabled?: boolean;
    onClose?: () => void;
    iconName?: IconName;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [referenceElement, setReferenceElement] =
      useState<HTMLSpanElement | null>(null);

    const handleMouseEnter = () => setIsOpen(true);
    const handleMouseLeave = () => setIsOpen(false);
    const setBoxRef = (ref: HTMLSpanElement | null) => setReferenceElement(ref);

    return (
      <>
        <Box
          ref={setBoxRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {triggerElement}
          {!triggerElement && !iconName ? (
            <Icon
              name={IconName.Question}
              color={IconColor.iconMuted}
              size={IconSize.Sm}
            />
          ) : (
            !triggerElement &&
            iconName && (
              <Icon
                color={IconColor.iconMuted}
                name={iconName}
                size={IconSize.Sm}
              />
            )
          )}
        </Box>
        {!disabled && (
          <Popover
            position={PopoverPosition.Auto}
            referenceElement={referenceElement}
            isOpen={isOpen}
            onClickOutside={handleMouseLeave}
            style={{
              maxWidth: '240px',
              backgroundColor: 'var(--color-text-default)',
              paddingInline: '16px',
              paddingTop: '8px',
              paddingBottom: '8px',
              transitionTimingFunction: 'linear',
              display: 'inherit',
            }}
            preventOverflow
            flip
            hasArrow
            {...props}
          >
            <Column>
              <PopoverHeader
                color={TextColor.infoInverse}
                textAlign={TextAlign.Center}
                onClose={onClose}
                childrenWrapperProps={{ style: { whiteSpace: 'nowrap' } }}
              >
                {title}
              </PopoverHeader>
              <Text
                justifyContent={JustifyContent.center}
                color={TextColor.infoInverse}
              >
                {children}
              </Text>
            </Column>
          </Popover>
        )}
      </>
    );
  },
);

export default Tooltip;
