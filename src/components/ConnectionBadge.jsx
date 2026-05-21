import { AlertCircle, Cloud, CloudOff, Loader2 } from "lucide-react";

const CONFIG = {
  demo: {
    label: "Chưa kết nối",
    aria: "Trạng thái: chưa kết nối Google Sheet. Bấm để cấu hình.",
    Icon: CloudOff,
    className:
      "text-stone-700 bg-stone-100 border-stone-400 [background-image:repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(120,113,108,0.08)_6px,rgba(120,113,108,0.08)_8px)]",
  },
  connecting: {
    label: "Đang tải",
    aria: "Đang tải dữ liệu từ Google Sheet.",
    Icon: Loader2,
    className: "text-stone-700 bg-transparent border-stone-400",
    spin: true,
  },
  connected: {
    label: "Đang liên kết",
    aria: "Đã kết nối Google Sheet thành công. Bấm để xem cài đặt.",
    Icon: Cloud,
    className: "text-amber-50 bg-stone-900 border-stone-900",
    dot: true,
  },
  error: {
    label: "Lỗi kết nối",
    aria: "Lỗi kết nối Google Sheet. Bấm để cấu hình lại.",
    Icon: AlertCircle,
    className: "text-stone-900 bg-amber-50 border-amber-800",
    dot: true,
  },
};

export default function ConnectionBadge({ status, onClick }) {
  const c = CONFIG[status] || CONFIG.demo;
  const I = c.Icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={c.aria}
      className={`inline-flex items-center justify-center gap-1.5 min-w-[140px] px-3 py-2 text-[10px] font-semibold tracking-wider uppercase border transition-all duration-300 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F2] cursor-pointer shadow-xs ${c.className}`}
    >
      <I aria-hidden="true" className={`w-3.5 h-3.5 ${c.spin ? "animate-spin" : ""}`} />
      <span>{c.label}</span>
      {c.dot && (
        <span
          aria-hidden="true"
          className={`w-1.5 h-1.5 rounded-full ${
            status === "connected" ? "bg-amber-300" : "bg-amber-800"
          }`}
        />
      )}
    </button>
  );
}
