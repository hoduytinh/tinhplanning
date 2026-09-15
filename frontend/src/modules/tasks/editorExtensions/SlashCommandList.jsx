import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

// Danh sách gợi ý hiển thị khi gõ "/" — nhận danh sách item đã lọc từ
// SlashCommand.js, hỗ trợ điều hướng bàn phím (mũi tên lên/xuống, Enter)
// thông qua ref (dùng bởi Suggestion.render() -> onKeyDown).
const SlashCommandList = forwardRef(function SlashCommandList(
  { items, command },
  ref
) {
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [items]);

  const select = (index) => {
    const item = items[index];
    if (item) command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowDown") {
        setSelected((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setSelected((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        select(selected);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="w-64 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400 shadow-lg">
        Không có kết quả
      </div>
    );
  }

  return (
    <div className="max-h-72 w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
      {items.map((item, i) => (
        <button
          key={item.title}
          type="button"
          onMouseEnter={() => setSelected(i)}
          onClick={() => select(i)}
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
            i === selected ? "bg-brand/10 text-brand" : "text-slate-700 hover:bg-slate-50"
          }`}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs">
            {item.icon}
          </span>
          <span className="flex flex-col">
            <span className="font-medium leading-tight">{item.title}</span>
            <span className="text-xs leading-tight text-slate-400">
              {item.description}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
});

export default SlashCommandList;
