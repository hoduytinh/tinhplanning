import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import Link from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Mention from "@tiptap/extension-mention";
import CharacterCount from "@tiptap/extension-character-count";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { createLowlight, common } from "lowlight";
import Callout, { CALLOUT_TYPES } from "./editorExtensions/Callout";
import SlashCommand from "./editorExtensions/SlashCommand";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Link2,
  Image as ImageIcon,
  List,
  ListOrdered,
  ListTodo,
  IndentIncrease,
  IndentDecrease,
  Quote,
  Info,
  SeparatorHorizontal,
  Table2,
  Rows3,
  Columns3,
  Trash2,
  Highlighter,
  Palette,
  Smile,
} from "lucide-react";

const lowlight = createLowlight(common);

const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Red", value: "#dc2626" },
  { label: "Orange", value: "#d97706" },
  { label: "Yellow", value: "#ca8a04" },
  { label: "Green", value: "#16a34a" },
  { label: "Teal", value: "#0d9488" },
  { label: "Blue", value: "#2563eb" },
  { label: "Sky Blue", value: "#0284c7" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Pink", value: "#db2777" },
  { label: "Brown", value: "#92400e" },
  { label: "Gray", value: "#475569" },
];

const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "#fef08a" },
  { label: "Orange", value: "#fed7aa" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Teal", value: "#99f6e4" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Purple", value: "#e9d5ff" },
  { label: "Pink", value: "#fbcfe8" },
  { label: "Red", value: "#fecaca" },
  { label: "Gray", value: "#e2e8f0" },
];

// Bộ ký hiệu/emoji thông dụng để chèn nhanh vào nội dung.
const SYMBOLS = [
  "✅", "❌", "⚠️", "❗", "❓", "⭐", "🔥", "💡",
  "📌", "📎", "📅", "🕒", "🚩", "🏁", "👍", "👎",
  "🚀", "✨", "🛠️", "🔧", "📊", "📈", "📉", "📝",
  "💬", "📢", "🔔", "☑️", "➡️", "⬅️", "⬆️", "⬇️",
  "🔁", "♻️", "👥", "👤", "🎯", "🛡️", "⚡", "🔒",
];

// Rich text editor (Tiptap) cho mô tả task. Nội dung được lưu dạng HTML
// trong field `description` (string) — không cần đổi schema backend.
// props: content (HTML string), onChange(html), onBlur(html), placeholder
export default function RichTextEditor({
  content,
  onChange,
  onBlur,
  placeholder = "Describe the task... Type / for quick formatting",
  editable = true,
  fillHeight = false,
}) {
  const [colorMenu, setColorMenu] = useState(false);
  const [highlightMenu, setHighlightMenu] = useState(false);
  const [symbolMenu, setSymbolMenu] = useState(false);
  const [calloutMenu, setCalloutMenu] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const fileInputRef = useRef(null);

  const insertImageFile = (file, editorInstance) => {
    if (!file || !file.type.startsWith("image/")) return false;
    const reader = new FileReader();
    reader.onload = () => {
      editorInstance.chain().focus().setImage({ src: reader.result }).run();
    };
    reader.readAsDataURL(file);
    return true;
  };

  const editor = useEditor({
    extensions: [
      // Tắt heading/codeBlock mặc định của StarterKit để dùng extension
      // riêng (Heading giới hạn level 1-3, CodeBlockLowlight có highlight cú pháp).
      StarterKit.configure({ codeBlock: false, heading: false }),
      Heading.configure({ levels: [1, 2, 3] }),
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({ openOnClick: true, autolink: true }),
      ImageExtension.configure({
        allowBase64: true,
        HTMLAttributes: { class: "max-w-full rounded-md" },
      }),
      Placeholder.configure({ placeholder }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      // Chưa có API danh bạ người dùng (users/members) trong backend nên
      // suggestion popup chưa có dữ liệu thật — gõ "@" vẫn hoạt động như
      // text bình thường, sẵn sàng nối API khi có module người dùng.
      Mention.configure({ HTMLAttributes: { class: "mention" } }),
      CharacterCount,
      Callout,
      SlashCommand,
      // Table (khác với TableKit) KHÔNG tự bundle TableRow/TableHeader/TableCell,
      // nên phải đăng ký riêng cả 4 extension này.
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content || "",
    editable,
    editorProps: {
      attributes: {
        class:
          "rte-content prose prose-sm max-w-none min-h-[120px] px-3 py-2 text-sm text-slate-700 focus:outline-none " +
          "[&_pre]:rounded-lg [&_pre]:border [&_pre]:border-slate-200 [&_pre]:bg-slate-100 [&_pre]:text-slate-700 [&_pre]:p-3 [&_pre]:text-xs " +
          "[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:text-[13px] [&_code]:text-slate-700 " +
          "[&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 " +
          "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 " +
          "[&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1.5 " +
          "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 " +
          "[&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500 " +
          "[&_hr]:my-4 [&_hr]:border-slate-200 " +
          "[&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-50 " +
          "[&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 " +
          "[&_mark]:rounded [&_mark]:px-0.5 [&_img]:my-2",
      },
      handlePaste: (_view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItem = items.find((it) => it.type.startsWith("image/"));
        if (imageItem && editor) {
          const file = imageItem.getAsFile();
          if (insertImageFile(file, editor)) {
            event.preventDefault();
            return true;
          }
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files || []);
        const imageFile = files.find((f) => f.type.startsWith("image/"));
        if (imageFile && editor) {
          event.preventDefault();
          insertImageFile(imageFile, editor);
          return true;
        }
        return false;
      },
    },
    onCreate: ({ editor: ed }) => setWordCount(ed.storage.characterCount.words()),
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML());
      setWordCount(ed.storage.characterCount.words());
    },
    onBlur: ({ editor: ed }) => onBlur?.(ed.getHTML()),
  });

  // Đồng bộ nội dung khi task đổi (chuyển sang task khác).
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, editor]);

  // Đóng dropdown khi tắt chế độ sửa.
  useEffect(() => {
    if (!editable) {
      setColorMenu(false);
      setHighlightMenu(false);
      setSymbolMenu(false);
      setCalloutMenu(false);
    }
  }, [editable]);

  if (!editor) return null;

  const btn = (active) =>
    `flex h-7 w-7 items-center justify-center rounded-md transition ${
      active
        ? "bg-brand/10 text-brand"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
    }`;

  const inTable = editor.isActive("table");

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href || "";
    const url = window.prompt("Paste URL:", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertImageByUrl = () => {
    const url = window.prompt("Paste image URL:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const onFilePicked = (e) => {
    const file = e.target.files?.[0];
    if (file) insertImageFile(file, editor);
    e.target.value = "";
  };

  const indent = () => {
    if (editor.isActive("taskItem")) editor.chain().focus().sinkListItem("taskItem").run();
    else editor.chain().focus().sinkListItem("listItem").run();
  };

  const outdent = () => {
    if (editor.isActive("taskItem")) editor.chain().focus().liftListItem("taskItem").run();
    else editor.chain().focus().liftListItem("listItem").run();
  };

  const divider = <span className="mx-1 h-4 w-px bg-slate-200" />;

  return (
    <div
      className={`flex overflow-hidden rounded-lg border border-slate-200 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30 ${
        fillHeight ? "h-full flex-col" : "flex-col"
      }`}
    >
      {editable && (
        <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50 px-2 py-1">
          {/* Nhóm 1 — Heading & Text format */}
          <button
            type="button"
            title="Heading 1"
            className={btn(editor.isActive("heading", { level: 1 }))}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            aria-label="Heading 1"
          >
            <Heading1 size={14} />
          </button>
          <button
            type="button"
            title="Heading 2"
            className={btn(editor.isActive("heading", { level: 2 }))}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            aria-label="Heading 2"
          >
            <Heading2 size={14} />
          </button>
          <button
            type="button"
            title="Heading 3"
            className={btn(editor.isActive("heading", { level: 3 }))}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            aria-label="Heading 3"
          >
            <Heading3 size={14} />
          </button>

          {divider}

          <button
            type="button"
            title="Bold (Ctrl+B)"
            className={btn(editor.isActive("bold"))}
            onClick={() => editor.chain().focus().toggleBold().run()}
            aria-label="Bold"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            title="Italic (Ctrl+I)"
            className={btn(editor.isActive("italic"))}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            aria-label="Italic"
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            title="Underline (Ctrl+U)"
            className={btn(editor.isActive("underline"))}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            aria-label="Underline"
          >
            <UnderlineIcon size={14} />
          </button>
          <button
            type="button"
            title="Strikethrough (Ctrl+Shift+S)"
            className={btn(editor.isActive("strike"))}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            aria-label="Strikethrough"
          >
            <Strikethrough size={14} />
          </button>

          {/* Màu chữ */}
          <div className="relative">
            <button
              type="button"
              title="Text color"
              className={btn(colorMenu)}
              onClick={() => {
                setHighlightMenu(false);
                setCalloutMenu(false);
                setColorMenu((v) => !v);
              }}
              aria-label="Text color"
            >
              <Palette size={14} />
            </button>
            {colorMenu && (
              <div className="absolute left-0 top-8 z-10 flex w-40 flex-wrap gap-1 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    title={c.label}
                    onClick={() => {
                      if (c.value) {
                        editor.chain().focus().setColor(c.value).run();
                      } else {
                        editor.chain().focus().unsetColor().run();
                      }
                      setColorMenu(false);
                    }}
                    className="h-5 w-5 shrink-0 rounded-full border border-slate-200"
                    style={{ backgroundColor: c.value || "#ffffff" }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Highlight */}
          <div className="relative">
            <button
              type="button"
              title="Highlight"
              className={btn(editor.isActive("highlight") || highlightMenu)}
              onClick={() => {
                setColorMenu(false);
                setCalloutMenu(false);
                setHighlightMenu((v) => !v);
              }}
              aria-label="Highlight"
            >
              <Highlighter size={14} />
            </button>
            {highlightMenu && (
              <div className="absolute left-0 top-8 z-10 flex w-40 flex-wrap gap-1 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    title={c.label}
                    onClick={() => {
                      editor.chain().focus().toggleHighlight({ color: c.value }).run();
                      setHighlightMenu(false);
                    }}
                    className="h-5 w-5 shrink-0 rounded-full border border-slate-200"
                    style={{ backgroundColor: c.value }}
                  />
                ))}
                <button
                  type="button"
                  title="Remove highlight"
                  onClick={() => {
                    editor.chain().focus().unsetHighlight().run();
                    setHighlightMenu(false);
                  }}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            )}
          </div>

          {divider}

          {/* Nhóm 2 — Insert */}
          <button
            type="button"
            title="Inline code (Ctrl+E)"
            className={btn(editor.isActive("code"))}
            onClick={() => editor.chain().focus().toggleCode().run()}
            aria-label="Inline code"
          >
            <Code size={14} />
          </button>
          <button
            type="button"
            title="Code block"
            className={btn(editor.isActive("codeBlock"))}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            aria-label="Code block"
          >
            <Code2 size={14} />
          </button>
          <button
            type="button"
            title="Insert link (Ctrl+K)"
            className={btn(editor.isActive("link"))}
            onClick={setLink}
            aria-label="Insert link"
          >
            <Link2 size={14} />
          </button>
          <button
            type="button"
            title="Insert image (URL or upload)"
            className={btn(false)}
            onClick={insertImageByUrl}
            onDoubleClick={() => fileInputRef.current?.click()}
            aria-label="Insert image"
          >
            <ImageIcon size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFilePicked}
          />

          {/* Ký hiệu / emoji */}
          <div className="relative">
            <button
              type="button"
              title="Insert symbol / emoji"
              className={btn(symbolMenu)}
              onClick={() => {
                setColorMenu(false);
                setHighlightMenu(false);
                setCalloutMenu(false);
                setSymbolMenu((v) => !v);
              }}
              aria-label="Insert symbol"
            >
              <Smile size={14} />
            </button>
            {symbolMenu && (
              <div className="absolute left-0 top-8 z-10 grid w-56 grid-cols-8 gap-1 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg">
                {SYMBOLS.map((s, i) => (
                  <button
                    key={`${s}-${i}`}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().insertContent(s).run();
                      setSymbolMenu(false);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded text-sm hover:bg-slate-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {divider}

          {/* Nhóm 3 — Structure */}
          <button
            type="button"
            title="Bulleted list"
            className={btn(editor.isActive("bulletList"))}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            aria-label="Bulleted list"
          >
            <List size={14} />
          </button>
          <button
            type="button"
            title="Numbered list"
            className={btn(editor.isActive("orderedList"))}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            aria-label="Numbered list"
          >
            <ListOrdered size={14} />
          </button>
          <button
            type="button"
            title="Checklist (acceptance criteria, steps to reproduce)"
            className={btn(editor.isActive("taskList"))}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            aria-label="Checklist"
          >
            <ListTodo size={14} />
          </button>
          <button
            type="button"
            title="Indent (Tab)"
            className={btn(false)}
            onClick={indent}
            aria-label="Indent"
          >
            <IndentIncrease size={14} />
          </button>
          <button
            type="button"
            title="Outdent (Shift+Tab)"
            className={btn(false)}
            onClick={outdent}
            aria-label="Outdent"
          >
            <IndentDecrease size={14} />
          </button>
          <button
            type="button"
            title="Quote"
            className={btn(editor.isActive("blockquote"))}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            aria-label="Quote"
          >
            <Quote size={14} />
          </button>

          {/* Callout */}
          <div className="relative">
            <button
              type="button"
              title="Callout (Info / Warning / Critical)"
              className={btn(editor.isActive("callout") || calloutMenu)}
              onClick={() => {
                setColorMenu(false);
                setHighlightMenu(false);
                setSymbolMenu(false);
                setCalloutMenu((v) => !v);
              }}
              aria-label="Callout"
            >
              <Info size={14} />
            </button>
            {calloutMenu && (
              <div className="absolute left-0 top-8 z-10 w-44 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                {Object.entries(CALLOUT_TYPES).map(([type, meta]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setCallout(type).run();
                      setCalloutMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                  </button>
                ))}
                {editor.isActive("callout") && (
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().unsetCallout().run();
                      setCalloutMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-slate-400 hover:bg-slate-50"
                  >
                    <Trash2 size={12} /> Remove callout
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            title="Horizontal rule"
            className={btn(false)}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            aria-label="Horizontal rule"
          >
            <SeparatorHorizontal size={14} />
          </button>

          {/* Table */}
          <button
            type="button"
            title="Insert table"
            className={btn(inTable)}
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            aria-label="Insert table"
          >
            <Table2 size={14} />
          </button>
          {inTable && (
            <>
              <button
                type="button"
                title="Add row"
                className={btn(false)}
                onClick={() => editor.chain().focus().addRowAfter().run()}
                aria-label="Add row"
              >
                <Rows3 size={14} />
              </button>
              <button
                type="button"
                title="Add column"
                className={btn(false)}
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                aria-label="Add column"
              >
                <Columns3 size={14} />
              </button>
              <button
                type="button"
                title="Delete table"
                className={btn(false)}
                onClick={() => editor.chain().focus().deleteTable().run()}
                aria-label="Delete table"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      )}
      <div className={fillHeight ? "flex-1 overflow-y-auto" : ""}>
        <EditorContent editor={editor} />
      </div>
      {editable && (
        <div className="flex shrink-0 items-center justify-end border-t border-slate-100 bg-slate-50 px-3 py-1 text-xs text-slate-400">
          {wordCount} words
        </div>
      )}
    </div>
  );
}


