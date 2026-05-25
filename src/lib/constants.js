export const STORAGE_KEY = "quote_script_url";
export const CART_STORAGE_KEY = "quote_cart_v1";
export const CUSTOMER_STORAGE_KEY = "quote_customer_v1";
export const QUOTE_TYPE_STORAGE_KEY = "quote_default_type_v1";

export const DEFAULT_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbx1tD8as7dw7nyGbJv7MTJMvz4dzdqAplL_c8vSzYQ1zqWX0CYrUK4W9cd_s0dVuAw3Rw/exec";

export const QUOTE_TYPES = [
  { value: "both", label: "Cả hai", short: "Cả hai" },
  { value: "install", label: "Lắp đặt", short: "L.Đặt" },
  { value: "manufacture", label: "Sản xuất", short: "S.Xuất" },
];

export const MOBILE_BREAKPOINT_QUERY = "(max-width: 1023px)";

export const QUOTE_STATUS_LIST = [
  { value: "draft", label: "Nháp" },
  { value: "approved", label: "Duyệt" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Hủy" },
];

export const QUOTE_STATUS_MAP = {
  draft: {
    label: "Nháp",
    className: "bg-stone-100 text-stone-800 border-stone-400",
    dot: "bg-stone-500",
  },
  approved: {
    label: "Duyệt",
    className: "bg-amber-50 text-stone-900 border-amber-700/40",
    dot: "bg-amber-700",
  },
  completed: {
    label: "Hoàn thành",
    className: "bg-stone-900 text-amber-50 border-stone-900",
    dot: "bg-amber-300",
  },
  cancelled: {
    label: "Hủy",
    className: "bg-white text-stone-500 border-stone-300 line-through",
    dot: "bg-stone-300",
  },
};
