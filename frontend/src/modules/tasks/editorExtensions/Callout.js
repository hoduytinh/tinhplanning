import { mergeAttributes, Node } from "@tiptap/core";

// Node "callout" tùy chỉnh — Tiptap không có sẵn extension chính thức cho
// block này nên phải tự định nghĩa. 3 loại: info (xanh), warning (vàng),
// critical (đỏ) — mỗi loại có icon + màu nền riêng, style áp ở CSS class
// theo attribute `calloutType`.
export const CALLOUT_TYPES = {
  info: { icon: "💡", label: "Info" },
  warning: { icon: "⚠️", label: "Warning" },
  critical: { icon: "🔴", label: "Critical" },
};

const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      calloutType: {
        default: "info",
        parseHTML: (el) => el.getAttribute("data-callout-type") || "info",
        renderHTML: (attrs) => ({ "data-callout-type": attrs.calloutType }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout-type]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "callout-block" }),
      0,
    ];
  },

  addCommands() {
    return {
      // Nếu con trỏ đang ở trong 1 callout, đổi loại (info/warning/critical)
      // ngay trên node đó thay vì bọc lồng thêm 1 callout mới.
      setCallout:
        (calloutType = "info") =>
        ({ commands, state, tr, dispatch }) => {
          const { $from } = state.selection;
          for (let d = $from.depth; d > 0; d -= 1) {
            const node = $from.node(d);
            if (node.type.name === this.name) {
              const pos = $from.before(d);
              if (dispatch) tr.setNodeMarkup(pos, undefined, { calloutType });
              return true;
            }
          }
          return commands.wrapIn(this.name, { calloutType });
        },
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});

export default Callout;
