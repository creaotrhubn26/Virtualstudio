import React, { ReactNode } from 'react';
import { IconButton, IconButtonProps, Box, BoxProps, Menu, MenuItem } from '@mui/material';

// Touch-aware IconButton
type TouchSizePreset = 'small' | 'medium' | 'large';

interface TouchIconButtonProps extends IconButtonProps {
  touchSize?: number | TouchSizePreset;
}

const touchSizeMap: Record<TouchSizePreset, number> = {
  small: 36,
  medium: 48,
  large: 56,
};

export function TouchIconButton({ touchSize = 48, sx, ...props }: TouchIconButtonProps) {
  const size = typeof touchSize === 'string' ? touchSizeMap[touchSize] : touchSize;
  return (
    <IconButton
      sx={{
        minWidth: size,
        minHeight: size,
        ...sx,
      }}
      {...props}
    />
  );
}

// Touch-aware pinch zoom container
interface TouchPinchZoomProps extends BoxProps {
  children: ReactNode;
  onZoom?: (scale: number) => void;
  minScale?: number;
  maxScale?: number;
}

export function TouchPinchZoom({ children, onZoom, minScale = 0.5, maxScale = 3, ...props }: TouchPinchZoomProps) {
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey && onZoom) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(minScale, Math.min(maxScale, delta));
      onZoom(newScale);
    }
  };

  return (
    <Box onWheel={handleWheel} {...props}>
      {children}
    </Box>
  );
}

// Touch context menu
interface TouchContextMenuProps {
  children: ReactNode;
  menuItems: { label: string; onClick: () => void }[];
  anchorPosition?: { x: number; y: number } | null;
  onClose: () => void;
}

export function TouchContextMenu({ children, menuItems, anchorPosition, onClose }: TouchContextMenuProps) {
  return (
    <>
      {children}
      <Menu
        open={Boolean(anchorPosition)}
        onClose={onClose}
        anchorReference="anchorPosition"
        anchorPosition={anchorPosition ? { top: anchorPosition.y, left: anchorPosition.x } : undefined}
      >
        {menuItems.map((item, index) => (
          <MenuItem key={index} onClick={() => { item.onClick(); onClose(); }}>
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// Touch draggable component
interface TouchDraggableProps extends BoxProps {
  children: ReactNode;
  onDragStart?: (e: React.TouchEvent | React.MouseEvent) => void;
  onDrag?: (e: React.TouchEvent | React.MouseEvent) => void;
  onDragEnd?: (e: React.TouchEvent | React.MouseEvent) => void;
}

export function TouchDraggable({ children, onDragStart, onDrag, onDragEnd, ...props }: TouchDraggableProps) {
  return (
    <Box
      onTouchStart={onDragStart}
      onTouchMove={onDrag}
      onTouchEnd={onDragEnd}
      onMouseDown={onDragStart}
      onMouseMove={onDrag}
      onMouseUp={onDragEnd}
      {...props}
    >
      {children}
    </Box>
  );
}

