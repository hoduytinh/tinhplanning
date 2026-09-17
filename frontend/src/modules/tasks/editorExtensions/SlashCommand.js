import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import SlashCommandList from "./SlashCommandList";

// Danh sách lệnh slash "/" — giống Notion. Mỗi item biết cách tự thực thi
// trên editor (xóa chữ "/query" vừa gõ rồi áp dụng format tương ứng).
function buildItems({ query, editor }) {
  const all = [
    {
      title: "Heading 1",
      description: "Large heading",
      icon: "H1",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
    },
    {
      title: "Heading 2",
      description: "Medium heading",
      icon: "H2",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
    },
    {
      title: "Heading 3",
      description: "Small heading",
      icon: "H3",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
    },
    {
      title: "Bullet List",
      description: "Bulleted list",
      icon: "•",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      title: "Numbered List",
      description: "Numbered list",
      icon: "1.",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      title: "Checklist",
      description: "To-do list",
      icon: "☑",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleTaskList().run(),
    },
    {
      title: "Code Block",
      description: "Source code block",
      icon: "</>",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      title: "Callout — Info",
      description: "Info block (blue)",
      icon: "💡",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setCallout("info").run(),
    },
    {
      title: "Callout — Warning",
      description: "Warning block (yellow)",
      icon: "⚠️",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setCallout("warning").run(),
    },
    {
      title: "Callout — Critical",
      description: "Critical block (red)",
      icon: "🔴",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setCallout("critical").run(),
    },
    {
      title: "Table",
      description: "Comparison table / test cases",
      icon: "▦",
      command: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
    },
    {
      title: "Divider",
      description: "Horizontal rule",
      icon: "—",
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
    {
      title: "Image",
      description: "Insert image from URL",
      icon: "🖼",
      command: ({ editor, range }) => {
        const url = window.prompt("Paste image URL:");
        editor.chain().focus().deleteRange(range).run();
        if (url) editor.chain().focus().setImage({ src: url }).run();
      },
    },
    {
      title: "Link",
      description: "Insert a link",
      icon: "🔗",
      command: ({ editor, range }) => {
        const url = window.prompt("Paste URL:");
        editor.chain().focus().deleteRange(range).run();
        if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      },
    },
  ];

  if (!query) return all;
  const q = query.toLowerCase();
  return all.filter((item) => item.title.toLowerCase().includes(q));
}

// Popup gợi ý được render qua ReactRenderer + định vị thủ công bằng
// getBoundingClientRect() của vùng con trỏ (props.clientRect), tương tự
// StatusIcon.jsx — không cần thêm thư viện tippy.js.
function renderSlashPopup() {
  let component;
  let popupEl;

  const positionPopup = (rect) => {
    if (!popupEl || !rect) return;
    popupEl.style.left = `${rect.left}px`;
    popupEl.style.top = `${rect.bottom + 6}px`;
  };

  return {
    onStart: (props) => {
      component = new ReactRenderer(SlashCommandList, {
        props: {
          items: props.items,
          command: (item) => props.command(item),
        },
        editor: props.editor,
      });

      popupEl = document.createElement("div");
      popupEl.style.position = "fixed";
      popupEl.style.zIndex = "50";
      popupEl.appendChild(component.element);
      document.body.appendChild(popupEl);

      positionPopup(props.clientRect?.());
    },
    onUpdate(props) {
      component.updateProps({
        items: props.items,
        command: (item) => props.command(item),
      });
      positionPopup(props.clientRect?.());
    },
    onKeyDown(props) {
      if (props.event.key === "Escape") {
        popupEl?.remove();
        return true;
      }
      return component?.ref?.onKeyDown(props) ?? false;
    },
    onExit() {
      popupEl?.remove();
      component?.destroy();
    },
  };
}

const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        items: buildItems,
        command: ({ editor, range, props }) => props.command({ editor, range }),
        render: renderSlashPopup,
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export default SlashCommand;
