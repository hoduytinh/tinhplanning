import { Component } from "react";
import { AlertTriangle } from "lucide-react";

// Chặn lỗi render để tránh trắng cả trang khi 1 phần UI (vd: rich text editor)
// gặp sự cố — chỉ phần đó hiển thị thông báo lỗi, phần còn lại của app vẫn dùng được.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={16} className="shrink-0" />
            <span>
              Something went wrong while displaying this section.{" "}
              {this.state.error?.message}
            </span>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
