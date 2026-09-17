import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import Modal from "../../shared/components/Modal";
import Button from "../../shared/components/Button";
import { fetchMeetingSummary } from "./meetingApi";

// Hiển thị bản tóm tắt cuộc họp dạng text để copy/share.
export default function SummaryModal({ open, meetingId, onClose, onError }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !meetingId) return;
    setLoading(true);
    setCopied(false);
    fetchMeetingSummary(meetingId)
      .then((d) => setText(d.text))
      .catch((err) => onError?.(err.message))
      .finally(() => setLoading(false));
  }, [open, meetingId, onError]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard có thể bị chặn — bỏ qua.
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Meeting Summary"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={copy} disabled={loading || !text}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </>
      }
    >
      {loading ? (
        <p className="text-sm text-slate-500">Generating summary...</p>
      ) : (
        <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-sm text-slate-700">
          {text}
        </pre>
      )}
    </Modal>
  );
}
