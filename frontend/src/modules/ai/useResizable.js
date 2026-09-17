import { useState } from "react";

// 3 kích thước cố định cho panel (không kể chế độ fullscreen, xử lý riêng).
export const PANEL_SIZES = {
  small: { width: 360, height: 500, label: "S" },
  medium: { width: 520, height: 680, label: "M" },
  large: { width: 720, height: 820, label: "L" },
};

export function useResizable(initialSize = "small") {
  const [sizeKey, setSizeKey] = useState(initialSize);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const setSize = (key) => {
    if (PANEL_SIZES[key]) setSizeKey(key);
  };

  const toggleFullscreen = () => setIsFullscreen((f) => !f);

  return {
    sizeKey,
    size: PANEL_SIZES[sizeKey],
    setSize,
    isFullscreen,
    toggleFullscreen,
  };
}
