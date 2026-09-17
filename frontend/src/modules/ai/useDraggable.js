import { useCallback, useRef, useState } from "react";

// Hook kéo-thả đơn giản dựa trên vị trí tuyệt đối (fixed positioning).
// Chỉ bắt đầu kéo khi mousedown xảy ra trên phần tử có `data-drag-handle`
// (thường là header của panel) để tránh xung đột với việc chọn text/click
// vào nút bên trong panel.
export function useDraggable(initialPosition = { x: 20, y: 20 }) {
  const [position, setPosition] = useState(initialPosition);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback(
    (e) => {
      if (!e.target.closest("[data-drag-handle]")) return;
      isDragging.current = true;
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };

      const onMouseMove = (moveEvent) => {
        if (!isDragging.current) return;
        const newX = Math.max(
          0,
          Math.min(window.innerWidth - 80, moveEvent.clientX - dragStart.current.x)
        );
        const newY = Math.max(
          0,
          Math.min(window.innerHeight - 80, moveEvent.clientY - dragStart.current.y)
        );
        setPosition({ x: newX, y: newY });
      };

      const onMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [position]
  );

  return { position, setPosition, onMouseDown };
}
