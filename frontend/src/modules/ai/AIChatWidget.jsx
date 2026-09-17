import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import ToastProvider from "../dashboard/Toast";
import AIChatPanel from "./AIChatPanel";
import { useAIChat } from "./useAIChat";
import { useDraggable } from "./useDraggable";
import { useResizable } from "./useResizable";

const MARGIN = 24;
const BUBBLE_SIZE = 56;

function AIChatWidgetInner() {
  const [isOpen, setIsOpen] = useState(false);
  const chat = useAIChat();
  const resize = useResizable("small");

  // Không để panel to hơn viewport (đề phòng màn hình nhỏ hơn preset L/M).
  const panelWidth = resize.isFullscreen
    ? window.innerWidth
    : Math.min(resize.size.width, window.innerWidth - MARGIN * 2);
  const panelHeight = resize.isFullscreen
    ? window.innerHeight
    : Math.min(resize.size.height, window.innerHeight - MARGIN * 2);

  const { position, setPosition, onMouseDown } = useDraggable({
    x: Math.max(MARGIN, window.innerWidth - panelWidth - MARGIN),
    y: Math.max(MARGIN, window.innerHeight - panelHeight - MARGIN),
  });

  // Khi đổi size (S/M/L) hoặc bật/tắt fullscreen, giữ nguyên góc dưới-phải
  // của panel và cho panel phình to về phía trái/lên trên — tránh trường
  // hợp phần mở rộng bị tràn ra ngoài mép phải màn hình (bị che khuất).
  const prevSizeRef = useRef({ width: panelWidth, height: panelHeight });
  useEffect(() => {
    if (resize.isFullscreen) return;
    const prev = prevSizeRef.current;
    if (prev.width === panelWidth && prev.height === panelHeight) return;

    setPosition((pos) => {
      const rightEdge = pos.x + prev.width;
      const bottomEdge = pos.y + prev.height;
      const newX = Math.max(
        MARGIN,
        Math.min(rightEdge - panelWidth, window.innerWidth - panelWidth - MARGIN)
      );
      const newY = Math.max(
        MARGIN,
        Math.min(bottomEdge - panelHeight, window.innerHeight - panelHeight - MARGIN)
      );
      return { x: newX, y: newY };
    });

    prevSizeRef.current = { width: panelWidth, height: panelHeight };
  }, [panelWidth, panelHeight, resize.isFullscreen, setPosition]);

  // Bubble khi đóng — hiện badge số tin nhắn đã có sẵn trong hội thoại.
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: MARGIN,
          right: MARGIN,
          width: BUBBLE_SIZE,
          height: BUBBLE_SIZE,
          zIndex: 9999,
        }}
        className="relative flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition hover:scale-110 hover:bg-indigo-700"
        aria-label="Open AI Assistant"
      >
        <Sparkles size={22} />
        {chat.messages.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {Math.min(chat.messages.length, 99)}
          </span>
        )}
      </button>
    );
  }

  const panelStyle = resize.isFullscreen
    ? { position: "fixed", inset: 0, zIndex: 9999 }
    : {
        position: "fixed",
        left: position.x,
        top: position.y,
        width: panelWidth,
        height: panelHeight,
        zIndex: 9999,
      };

  return (
    <div style={panelStyle} onMouseDown={onMouseDown}>
      <AIChatPanel
        chat={chat}
        resize={resize}
        onClose={() => setIsOpen(false)}
        isFullscreen={resize.isFullscreen}
      />
    </div>
  );
}

// Root persistent widget — mount 1 lần duy nhất tại App root (xem App.jsx),
// KHÔNG mount trong từng page. Nhờ vậy component không bao giờ unmount khi
// chuyển page, giữ nguyên chat history + session xuyên suốt, và không tốn
// token gửi lại history mỗi khi đổi trang.
export default function AIChatWidget() {
  return (
    <ToastProvider>
      <AIChatWidgetInner />
    </ToastProvider>
  );
}
