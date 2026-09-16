import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function ChatMessage({ message }) {
  const isAI = message.role === "model";

  return (
    <div className={`flex gap-2 ${isAI ? "" : "flex-row-reverse"}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isAI ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-600"
        }`}
      >
        {isAI ? <Bot size={15} /> : <User size={15} />}
      </div>

      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          isAI
            ? "bg-slate-100 text-slate-800"
            : "bg-indigo-600 text-white"
        }`}
      >
        {isAI ? (
          <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        ) : (
          <span className="whitespace-pre-wrap">{message.content}</span>
        )}
      </div>
    </div>
  );
}
