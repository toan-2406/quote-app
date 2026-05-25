import { useCallback, useId, useState } from "react";
import { CheckCircle2, Cloud, MessageCircle, Printer, X } from "lucide-react";
import Modal from "./Modal";
import { QUOTE_TYPES } from "../lib/constants";
import {
  buildZaloQuoteMessage,
  computeEffectiveOptionPrice,
  computeEffectiveUnitPrice,
  formatVND,
  normalizeVietnamesePhone,
} from "../lib/helpers";

export default function QuoteSummaryModal({
  items,
  customer,
  note = "",
  productsMap,
  optionsMap,
  onClose,
  onSaveToSheet,
  isLive,
  savedInfo,
}) {
  const titleId = useId();
  const [shareStatus, setShareStatus] = useState(null);

  const lineItems = items
    .map((item) => {
      const product = productsMap.get(item.sku);
      if (!product) return null;
      const unitPrice = computeEffectiveUnitPrice(item, product);
      const baseTotal = unitPrice * item.qty;
      const selectedOpts = item.selectedOptions
        .map((oid) => {
          const o = optionsMap.get(oid);
          if (!o) return null;
          // Decorate the option with its effective price so downstream renderers
          // and the Zalo message helper can use the overridden value uniformly.
          return { ...o, effectivePrice: computeEffectiveOptionPrice(item, o) };
        })
        .filter(Boolean);
      const optsTotal =
        selectedOpts.reduce((sum, o) => sum + o.effectivePrice, 0) * item.qty;
      const typeLabel = QUOTE_TYPES.find((q) => q.value === item.quoteType)?.label || "Cả hai";
      return {
        product,
        item,
        unitPrice,
        baseTotal,
        optsTotal,
        subtotal: baseTotal + optsTotal,
        selectedOpts,
        typeLabel,
      };
    })
    .filter(Boolean);

  const grandTotal = lineItems.reduce((s, li) => s + li.subtotal, 0);
  const today = new Date();
  const quoteId =
    savedInfo?.quote_id ||
    `BG-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(
      today.getDate(),
    ).padStart(2, "0")}-${String(today.getHours()).padStart(2, "0")}${String(
      today.getMinutes(),
    ).padStart(2, "0")}`;

  const handlePrint = () => window.print();

  const handleZaloShare = useCallback(async () => {
    const message = buildZaloQuoteMessage({
      quoteId,
      today,
      customer,
      lineItems,
      grandTotal,
      note,
    });

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Báo giá ${quoteId}`,
          text: message,
        });
        setShareStatus({
          type: "success",
          text: "Đã mở hộp thoại chia sẻ. Chọn Zalo để gửi.",
        });
        return;
      } catch (e) {
        if (e?.name === "AbortError") return;
      }
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = message;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      const phone = normalizeVietnamesePhone(customer.phone);
      const zaloUrl = phone ? `https://zalo.me/${phone}` : "https://chat.zalo.me/";
      window.open(zaloUrl, "_blank", "noopener,noreferrer");
      setShareStatus({
        type: "success",
        text: phone
          ? `Đã copy báo giá. Dán vào khung chat với SĐT ${customer.phone}.`
          : "Đã copy báo giá. Dán vào Zalo để gửi.",
      });
    } catch (e) {
      setShareStatus({
        type: "error",
        text: "Không copy được: " + (e?.message || "lỗi không xác định"),
      });
    }
  }, [quoteId, today, customer, lineItems, grandTotal, note]);

  return (
    <Modal
      titleId={titleId}
      onClose={onClose}
      className="quote-summary bg-white max-w-3xl w-full my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border-t-2 border-stone-900"
    >
      {/* Sticky top header — compact on mobile (label + X only), full on desktop */}
      <div className="sticky top-0 bg-white border-b border-stone-300 px-4 sm:px-6 py-3 flex justify-between items-center gap-2 print:hidden z-20">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[11px] tracking-widest uppercase text-stone-700 font-medium">
            Xem trước báo giá
          </span>
          <span className="hidden sm:inline text-[11px] text-stone-500">
            · {lineItems.length} hạng mục
          </span>
        </div>
        <div className="flex gap-2 items-center" aria-live="polite">
          {isLive && !savedInfo && (
            <button
              type="button"
              onClick={onSaveToSheet}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-amber-800 text-amber-50 text-[11px] tracking-wider uppercase hover:bg-amber-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
            >
              <Cloud aria-hidden="true" className="w-3.5 h-3.5" /> Lưu vào Sheet
            </button>
          )}
          {savedInfo && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-stone-900">
              <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 text-amber-800" />
              Đã lưu: <span className="font-mono">{savedInfo.quote_id}</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleZaloShare}
            aria-label="Gửi báo giá qua Zalo"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-amber-700 text-amber-50 text-[11px] tracking-wider uppercase hover:bg-amber-800 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
          >
            <MessageCircle aria-hidden="true" className="w-3.5 h-3.5" /> Gửi Zalo
          </button>
          <button
            type="button"
            onClick={handlePrint}
            aria-label="In hoặc xuất PDF báo giá"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-stone-900 text-amber-50 text-[11px] tracking-wider uppercase hover:bg-amber-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
          >
            <Printer aria-hidden="true" className="w-3.5 h-3.5" /> In / PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ báo giá"
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 text-stone-600 hover:text-stone-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {shareStatus && (
        <div
          role="status"
          aria-live="polite"
          className={`sticky top-[57px] z-10 px-4 sm:px-6 py-2 text-xs border-b print:hidden ${
            shareStatus.type === "success"
              ? "bg-amber-50 border-amber-700/40 text-stone-900"
              : "bg-stone-100 border-stone-400 text-stone-900"
          }`}
        >
          {shareStatus.text}
        </div>
      )}

      <div className="px-5 sm:px-10 pt-5 sm:pt-10 pb-6 sm:pb-10 print:px-6 print:py-6 font-sans">
        {/* Letterhead */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 sm:mb-8 pb-5 sm:pb-6 border-b-2 border-stone-900 gap-3 sm:gap-4">
          <div>
            <h2
              id={titleId}
              className="font-serif text-2xl sm:text-3xl md:text-4xl text-stone-900 mb-1 font-medium leading-tight"
            >
              Báo Giá Thi Công
            </h2>
            <p className="text-[11px] tracking-widest uppercase text-amber-800 font-medium">
              Nội Thất Khoán
            </p>
          </div>
          <div className="flex items-center sm:flex-col sm:items-end gap-3 sm:gap-1 text-xs">
            <span className="inline-block border border-amber-800 text-amber-800 px-2 py-0.5 font-mono text-xs tracking-wider rotate-[-1deg]">
              {quoteId}
            </span>
            <p className="text-stone-700 font-serif italic">
              {today.toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Customer info */}
        {(customer.name || customer.phone || customer.address) && (
          <div className="mb-6 sm:mb-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {customer.name && (
              <div>
                <span className="text-[11px] uppercase tracking-wider text-stone-600 font-medium">
                  Khách hàng
                </span>
                <p className="text-stone-900 mt-0.5">{customer.name}</p>
              </div>
            )}
            {customer.phone && (
              <div>
                <span className="text-[11px] uppercase tracking-wider text-stone-600 font-medium">
                  SĐT
                </span>
                <p className="text-stone-900 mt-0.5 font-mono">{customer.phone}</p>
              </div>
            )}
            {customer.address && (
              <div className="sm:col-span-2">
                <span className="text-[11px] uppercase tracking-wider text-stone-600 font-medium">
                  Địa chỉ
                </span>
                <p className="text-stone-900 mt-0.5">{customer.address}</p>
              </div>
            )}
          </div>
        )}

        {/* Mobile card list — sm:hidden print:hidden */}
        <ol
          aria-label="Danh sách hạng mục báo giá"
          className="sm:hidden print:hidden divide-y divide-stone-200 border-y border-stone-200 mb-5"
        >
          {lineItems.map((li, idx) => (
            <li key={li.item.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-baseline gap-2 min-w-0 flex-1">
                  <span
                    aria-hidden="true"
                    className="font-mono text-[11px] text-stone-500 shrink-0 w-6"
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <p className="text-stone-900 font-medium leading-snug">{li.product.name}</p>
                </div>
                <span className="font-mono text-sm text-stone-900 font-medium whitespace-nowrap">
                  {formatVND(li.subtotal)}
                  <span className="text-xs text-stone-500 ml-0.5">đ</span>
                </span>
              </div>
              {li.selectedOpts.length > 0 && (
                <ul className="ml-8 mt-1.5 space-y-0.5">
                  {li.selectedOpts.map((o) => (
                    <li key={o.option_id} className="text-xs text-stone-700 italic">
                      + {o.option_name}
                      {o.effectivePrice > 0 && (
                        <span className="font-mono ml-1">({formatVND(o.effectivePrice)}đ)</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="ml-8 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-900 tracking-wider uppercase font-medium">
                  {li.typeLabel}
                </span>
                <span className="text-stone-600 font-mono">
                  {li.item.qty} {li.product.unit}
                </span>
                <span aria-hidden="true" className="text-stone-400">
                  ×
                </span>
                <span className="text-stone-600 font-mono">{formatVND(li.unitPrice)}đ</span>
              </div>
            </li>
          ))}
        </ol>

        {/* Mobile total summary (above the sticky action bar for in-context scanning) */}
        <div className="sm:hidden print:hidden mb-4 pt-4 border-t-2 border-stone-900 flex justify-between items-baseline">
          <span className="text-[11px] tracking-widest uppercase text-stone-700 font-medium">
            Tổng cộng
          </span>
          <span className="font-serif text-2xl text-stone-900 font-medium">
            {formatVND(grandTotal)}
            <span className="text-sm text-stone-600 font-normal ml-1">đ</span>
          </span>
        </div>

        {/* Desktop / Print table — hidden on mobile, shown sm+ and print */}
        <div className="hidden sm:block print:block overflow-x-auto -mx-10 px-10 print:mx-0 print:px-0 print:overflow-visible">
          <table className="w-full text-sm mb-6 min-w-[560px] print:min-w-0">
            <caption className="sr-only">Bảng chi tiết các hạng mục trong báo giá</caption>
            <thead>
              <tr className="border-b border-stone-300 text-[11px] uppercase tracking-wider text-stone-700">
                <th scope="col" className="text-left py-2 font-normal w-12">STT</th>
                <th scope="col" className="text-left py-2 font-normal">Hạng mục</th>
                <th scope="col" className="text-center py-2 font-normal w-14">ĐVT</th>
                <th scope="col" className="text-right py-2 font-normal w-16">SL</th>
                <th scope="col" className="text-right py-2 font-normal w-28">Đơn giá</th>
                <th scope="col" className="text-right py-2 font-normal w-32">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li, idx) => (
                <tr key={li.item.id} className="border-b border-stone-200 align-top">
                  <td className="py-3 font-mono text-stone-600">{idx + 1}</td>
                  <td className="py-3">
                    <p className="text-stone-900">{li.product.name}</p>
                    {li.selectedOpts.length > 0 && (
                      <ul className="mt-1 ml-2 list-disc list-inside">
                        {li.selectedOpts.map((o) => (
                          <li key={o.option_id} className="text-xs text-stone-700 italic">
                            + {o.option_name}{" "}
                            {o.effectivePrice > 0 && (
                              <span className="font-mono">({formatVND(o.effectivePrice)}đ)</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="text-center py-3 text-stone-700">{li.product.unit}</td>
                  <td className="text-right py-3 font-mono text-stone-700">{li.item.qty}</td>
                  <td className="text-right py-3 font-mono text-stone-700">
                    {formatVND(li.unitPrice)}
                  </td>
                  <td className="text-right py-3 font-mono text-stone-900 font-medium">
                    {formatVND(li.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-stone-900">
                <td
                  colSpan="5"
                  className="py-4 text-right text-[11px] uppercase tracking-widest text-stone-700 font-medium"
                >
                  Tổng cộng
                </td>
                <td className="py-4 text-right font-serif text-2xl text-stone-900 font-medium">
                  {formatVND(grandTotal)} <span className="text-sm text-stone-700">đ</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {note && note.trim() && (
          <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-stone-300">
            <p className="text-[11px] uppercase tracking-widest text-stone-700 font-medium mb-2">
              📝 Ghi chú
            </p>
            <p className="text-sm text-stone-900 whitespace-pre-wrap leading-relaxed">
              {note.trim()}
            </p>
          </div>
        )}
      </div>

      {/* Mobile sticky bottom action bar — thumb-zone ergonomics */}
      <div
        className="sticky bottom-0 sm:hidden print:hidden bg-stone-900 text-amber-50 px-4 py-3 z-20 shadow-[0_-8px_24px_rgba(0,0,0,0.18)]"
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] tracking-widest uppercase opacity-70 font-medium">
              Tổng cộng · {lineItems.length} hạng mục
            </p>
            <p className="font-serif text-xl font-medium leading-tight truncate">
              {formatVND(grandTotal)}
              <span className="text-sm opacity-70 ml-1">đ</span>
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0 items-center">
            {isLive && !savedInfo && (
              <button
                type="button"
                onClick={onSaveToSheet}
                aria-label="Lưu báo giá vào Google Sheet"
                className="inline-flex items-center justify-center w-11 h-11 border border-amber-50/40 text-amber-50 hover:bg-amber-50/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900"
              >
                <Cloud aria-hidden="true" className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              aria-label="In hoặc xuất PDF báo giá"
              className="inline-flex items-center justify-center w-11 h-11 border border-amber-50/40 text-amber-50 hover:bg-amber-50/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900"
            >
              <Printer aria-hidden="true" className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZaloShare}
              aria-label="Gửi báo giá qua Zalo"
              className="inline-flex items-center gap-1.5 px-3.5 py-3 min-h-[44px] bg-amber-50 text-stone-900 text-[11px] tracking-widest uppercase font-medium hover:bg-amber-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900"
            >
              <MessageCircle aria-hidden="true" className="w-3.5 h-3.5" /> Gửi Zalo
            </button>
          </div>
        </div>
        {savedInfo && (
          <p className="mt-1 text-[11px] opacity-90 inline-flex items-center gap-1">
            <CheckCircle2 aria-hidden="true" className="w-3 h-3" />
            Đã lưu: <span className="font-mono">{savedInfo.quote_id}</span>
          </p>
        )}
      </div>
    </Modal>
  );
}
