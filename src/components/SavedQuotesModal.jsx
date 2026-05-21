import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  Loader2,
  Phone,
  RefreshCw,
  Search,
  User,
  X,
} from "lucide-react";
import Modal from "./Modal";
import { useDebounce } from "../hooks/useDebounce";
import { formatVND } from "../lib/helpers";
import { QUOTE_STATUS_LIST, QUOTE_STATUS_MAP } from "../lib/constants";

const ALL_STATUS = "all";

function parseItems(rawItems) {
  if (Array.isArray(rawItems)) return rawItems;
  if (typeof rawItems !== "string" || !rawItems.trim()) return [];
  try {
    return JSON.parse(rawItems);
  } catch {
    return [];
  }
}

function formatDateTime(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }) {
  const cfg = QUOTE_STATUS_MAP[status] || QUOTE_STATUS_MAP.draft;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] tracking-widest uppercase font-medium border ${cfg.className}`}
    >
      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function QuoteCard({ quote, productsMap, expanded, onToggle, onChangeStatus, updating }) {
  const items = useMemo(() => parseItems(quote.items), [quote.items]);
  const titleId = `quote-${quote.quote_id}`;
  return (
    <li className="border border-stone-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`${titleId}-body`}
        className="w-full text-left px-4 py-3 flex items-stretch gap-3 cursor-pointer hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F2]"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span id={titleId} className="font-mono text-[11px] text-stone-700">
              {quote.quote_id}
            </span>
            <StatusBadge status={quote.status} />
          </div>
          <p className="text-sm text-stone-900 font-medium truncate">
            {quote.customer_name || "(Không tên)"}
          </p>
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-stone-600 mt-0.5">
            {quote.customer_phone && (
              <span className="inline-flex items-center gap-0.5 font-mono">
                <Phone aria-hidden="true" className="w-3 h-3" />
                {quote.customer_phone}
              </span>
            )}
            <span aria-hidden="true">·</span>
            <span>{formatDateTime(quote.created_at)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end justify-between shrink-0">
          <span className="font-serif text-lg text-stone-900 font-medium tabular-nums leading-none">
            {formatVND(quote.total)}
            <span className="text-[10px] text-stone-600 ml-0.5">đ</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`w-4 h-4 text-stone-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {expanded && (
        <div id={`${titleId}-body`} className="border-t border-stone-200 bg-[#FDFCF8] px-4 py-3 space-y-3">
          {quote.customer_address && (
            <p className="text-xs text-stone-700">
              <span className="text-[10px] tracking-widest uppercase text-stone-500 mr-1.5">
                Địa chỉ
              </span>
              {quote.customer_address}
            </p>
          )}

          <div>
            <p className="text-[10px] tracking-widest uppercase text-stone-600 font-medium mb-1.5">
              {items.length} hạng mục
            </p>
            <ul className="space-y-1.5">
              {items.length === 0 && (
                <li className="text-xs text-stone-600 italic">Không có dữ liệu hạng mục</li>
              )}
              {items.map((it, idx) => {
                const product = productsMap?.get?.(it.sku);
                const name = product?.name || it.sku;
                return (
                  <li
                    key={`${it.id || it.sku || idx}-${idx}`}
                    className="flex items-baseline justify-between gap-2 text-xs"
                  >
                    <span className="flex items-baseline gap-1.5 min-w-0">
                      <span className="font-mono text-stone-500 w-5 shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="text-stone-900 truncate">{name}</span>
                    </span>
                    <span className="text-stone-600 font-mono shrink-0">
                      {it.qty}
                      {product?.unit && <span className="ml-1">{product.unit}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-stone-200">
            <label className="text-[10px] tracking-widest uppercase text-stone-600 font-medium">
              Trạng thái
            </label>
            <select
              value={quote.status || "draft"}
              disabled={updating}
              onChange={(e) => onChangeStatus(quote.quote_id, e.target.value)}
              className="text-[11px] tracking-wider uppercase border border-stone-300 bg-white px-2 py-1.5 min-h-[36px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 disabled:opacity-50"
            >
              {QUOTE_STATUS_LIST.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {updating && (
              <Loader2 aria-hidden="true" className="w-3.5 h-3.5 text-stone-500 animate-spin" />
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export default function SavedQuotesModal({ scriptUrl, productsMap, isLive, onClose }) {
  const titleId = useId();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 200);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const abortRef = useRef(null);

  const fetchQuotes = async () => {
    if (!scriptUrl || !isLive) {
      setError("Cần kết nối Google Sheet để tải danh sách đơn đã lưu.");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${scriptUrl}?action=listQuotes`, { signal: controller.signal });
      const data = await res.json();
      if (data.ok && Array.isArray(data.quotes)) {
        setQuotes(
          [...data.quotes].sort((a, b) => {
            const da = new Date(a.created_at).getTime() || 0;
            const db = new Date(b.created_at).getTime() || 0;
            return db - da;
          }),
        );
      } else {
        setError(data.error || "Không tải được danh sách");
      }
    } catch (e) {
      if (e.name === "AbortError") return;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptUrl, isLive]);

  const handleStatusChange = async (quoteId, newStatus) => {
    if (!scriptUrl) return;
    setUpdatingId(quoteId);
    setStatusMessage(null);
    try {
      const res = await fetch(scriptUrl, {
        method: "POST",
        body: JSON.stringify({
          action: "updateQuoteStatus",
          quote_id: quoteId,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setQuotes((prev) =>
          prev.map((q) => (q.quote_id === quoteId ? { ...q, status: newStatus } : q)),
        );
        setStatusMessage({
          type: "success",
          text: `Đã cập nhật trạng thái ${quoteId} → ${
            QUOTE_STATUS_MAP[newStatus]?.label || newStatus
          }`,
        });
      } else {
        setStatusMessage({ type: "error", text: data.error || "Cập nhật thất bại" });
      }
    } catch (e) {
      setStatusMessage({ type: "error", text: e.message });
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quotes.filter((quote) => {
      const matchStatus =
        statusFilter === ALL_STATUS || (quote.status || "draft") === statusFilter;
      const matchSearch =
        !q ||
        (quote.quote_id || "").toLowerCase().includes(q) ||
        (quote.customer_name || "").toLowerCase().includes(q) ||
        (quote.customer_phone || "").toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [quotes, search, statusFilter]);

  const filterChips = useMemo(() => {
    const counts = quotes.reduce(
      (acc, q) => {
        const s = q.status || "draft";
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      { [ALL_STATUS]: quotes.length },
    );
    return [
      { value: ALL_STATUS, label: "Tất cả", count: counts[ALL_STATUS] || 0 },
      ...QUOTE_STATUS_LIST.map((s) => ({
        value: s.value,
        label: s.label,
        count: counts[s.value] || 0,
      })),
    ];
  }, [quotes]);

  return (
    <Modal
      titleId={titleId}
      onClose={onClose}
      className="bg-[#FAF7F2] max-w-2xl w-full my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border-t-2 border-stone-900 flex flex-col"
    >
      <div className="sticky top-0 bg-white border-b border-stone-300 px-4 sm:px-6 py-3 flex justify-between items-center gap-2 z-20">
        <div className="min-w-0">
          <h2 id={titleId} className="font-serif text-lg sm:text-xl text-stone-900 leading-tight font-medium">
            Đơn hàng đã lưu
          </h2>
          <p className="text-[11px] tracking-widest uppercase text-stone-600 mt-0.5">
            {filtered.length}/{quotes.length} báo giá
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={fetchQuotes}
            disabled={loading || !isLive}
            aria-label="Tải lại danh sách"
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-stone-600 hover:text-stone-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw aria-hidden="true" className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-stone-600 hover:text-stone-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white border-b border-stone-200 px-4 sm:px-6 py-3 space-y-3">
        <div className="relative">
          <label htmlFor={`${titleId}-search`} className="sr-only">
            Tìm theo mã đơn, tên hoặc số điện thoại
          </label>
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500 pointer-events-none"
          />
          <input
            id={`${titleId}-search`}
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo mã đơn, tên hoặc SĐT..."
            className="w-full pl-9 pr-9 py-2.5 min-h-[44px] bg-white border border-stone-300 text-sm focus:outline-none focus-visible:border-amber-800 focus-visible:ring-2 focus-visible:ring-amber-800/30"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Xóa từ khóa"
              className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center min-w-[40px] min-h-[40px] text-stone-500 hover:text-stone-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800"
            >
              <X aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 pb-1" role="group" aria-label="Lọc theo trạng thái">
          {filterChips.map((chip) => {
            const active = chip.value === statusFilter;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setStatusFilter(chip.value)}
                aria-pressed={active}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-[11px] tracking-wider uppercase border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                  active
                    ? "bg-stone-900 text-amber-50 border-stone-900 font-medium"
                    : "bg-white text-stone-700 border-stone-300 hover:border-stone-600"
                }`}
              >
                {chip.label}
                <span
                  className={`text-[10px] tabular-nums ${
                    active ? "text-amber-200" : "text-stone-500"
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {statusMessage && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-3 px-3 py-2 text-xs border ${
              statusMessage.type === "success"
                ? "bg-amber-50 border-amber-700/40 text-stone-900"
                : "bg-stone-100 border-stone-400 text-stone-900"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {!isLive ? (
          <EmptyState
            icon={<AlertCircle aria-hidden="true" className="w-6 h-6 text-stone-500 mx-auto mb-3" />}
            title="Chưa kết nối Google Sheet"
            description='Vui lòng kết nối Google Sheet trong "Cài đặt" để xem các đơn đã lưu.'
          />
        ) : loading && quotes.length === 0 ? (
          <EmptyState
            icon={<Loader2 aria-hidden="true" className="w-6 h-6 text-stone-500 mx-auto mb-3 animate-spin" />}
            title="Đang tải danh sách đơn..."
          />
        ) : error ? (
          <EmptyState
            icon={<AlertCircle aria-hidden="true" className="w-6 h-6 text-amber-800 mx-auto mb-3" />}
            title="Không tải được dữ liệu"
            description={error}
            action={
              <button
                type="button"
                onClick={fetchQuotes}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] border border-stone-900 text-stone-900 text-[11px] tracking-wider uppercase hover:bg-stone-900 hover:text-amber-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
              >
                <RefreshCw aria-hidden="true" className="w-3.5 h-3.5" /> Thử lại
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<User aria-hidden="true" className="w-6 h-6 text-stone-400 mx-auto mb-3" />}
            title={quotes.length === 0 ? "Chưa có đơn nào được lưu" : "Không tìm thấy đơn phù hợp"}
            description={
              quotes.length === 0
                ? "Khi bạn lưu báo giá từ cửa sổ xem trước, nó sẽ xuất hiện ở đây."
                : "Thử đổi từ khóa hoặc bộ lọc trạng thái."
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {filtered.map((q, idx) => {
              const rowKey = `${q.quote_id || "row"}-${idx}`;
              return (
                <QuoteCard
                  key={rowKey}
                  quote={q}
                  productsMap={productsMap}
                  expanded={expanded === rowKey}
                  onToggle={() => setExpanded(expanded === rowKey ? null : rowKey)}
                  onChangeStatus={handleStatusChange}
                  updating={updatingId === q.quote_id}
                />
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function EmptyState({ icon, title, description, action }) {
  return (
    <div className="py-12 text-center">
      {icon}
      <p className="font-serif italic text-stone-800 text-base">{title}</p>
      {description && (
        <p className="text-xs text-stone-600 mt-2 max-w-xs mx-auto leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4 inline-flex">{action}</div>}
    </div>
  );
}
