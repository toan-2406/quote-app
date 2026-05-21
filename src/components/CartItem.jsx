import { memo, useId, useState } from "react";
import { ChevronDown, Minus, Plus, Settings2, Trash2 } from "lucide-react";
import { QUOTE_TYPES } from "../lib/constants";
import { computeUnitPrice, formatVND } from "../lib/helpers";

function CartItem({ item, product, productOptions, optionsMap, onChange, onRemove }) {
  const qtyId = useId();
  const qtyIdM = useId();
  const radiogroupId = useId();
  const radiogroupIdM = useId();
  const detailsId = useId();
  const [expanded, setExpanded] = useState(false);

  const hasManufacture = product.price_manufacture > 0;
  const unitPrice = computeUnitPrice(product, item.quoteType);
  const baseTotal = unitPrice * item.qty;
  const optionsTotal =
    item.selectedOptions.reduce((sum, optId) => {
      const opt = optionsMap.get(optId);
      return sum + (opt && !opt.is_free ? opt.extra_price : 0);
    }, 0) * item.qty;
  const subtotal = baseTotal + optionsTotal;

  const activeQt = QUOTE_TYPES.find((q) => q.value === item.quoteType) || QUOTE_TYPES[0];
  const selectedOptCount = item.selectedOptions.length;
  const hasOptions = productOptions.length > 0;
  const showExpand = hasManufacture || hasOptions;

  return (
    <article aria-label={`Hạng mục: ${product.name}`} className="border-b border-stone-200/60">
      {/* MOBILE compact branch — < sm (640px). Entire row 1+2 acts as a single
          expand/collapse trigger; inner buttons/inputs preserve their own actions. */}
      <div className="sm:hidden">
        <div
          {...(showExpand
            ? {
                role: "button",
                tabIndex: 0,
                "aria-expanded": expanded,
                "aria-controls": detailsId,
                "aria-label": expanded
                  ? `Thu gọn chi tiết ${product.name}`
                  : `Mở chi tiết ${product.name}`,
                onClick: (e) => {
                  if (e.target.closest("button, input, label, select")) return;
                  setExpanded((v) => !v);
                },
                onKeyDown: (e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpanded((v) => !v);
                  }
                },
              }
            : {})}
          className={`py-2.5 ${
            showExpand
              ? "cursor-pointer hover:bg-stone-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-inset"
              : ""
          }`}
        >
          {/* Row 1 — trash · name · subtotal · chevron-icon */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={`Xóa ${product.name} khỏi báo giá`}
              className="inline-flex items-center justify-center w-9 h-9 -ml-1 text-stone-500 hover:text-red-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-1"
            >
              <Trash2 aria-hidden="true" className="w-4 h-4" />
            </button>
            <h4 className="flex-1 min-w-0 font-serif text-[15px] text-stone-900 truncate font-medium leading-tight">
              {product.name}
            </h4>
            <span className="font-serif text-[15px] text-stone-900 font-medium tabular-nums shrink-0">
              {formatVND(subtotal)}
              <span className="text-[10px] text-stone-500 ml-0.5">đ</span>
            </span>
            {showExpand && (
              <span
                aria-hidden="true"
                className="inline-flex items-center justify-center w-9 h-9 -mr-1 text-stone-500"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              </span>
            )}
          </div>

          {/* Row 2 — qty stepper · unit · quote-type chip · options badge */}
          <div className="mt-1.5 ml-9 flex items-center gap-2 flex-wrap">
          <label htmlFor={qtyIdM} className="sr-only">
            Số lượng {product.name} đơn vị {product.unit}
          </label>
          <div className="inline-flex items-center bg-stone-50 border border-stone-300 h-9">
            <button
              type="button"
              onClick={() =>
                onChange(item.id, { qty: Math.max(1, Math.round(item.qty - 1)) })
              }
              aria-label="Giảm số lượng"
              className="inline-flex items-center justify-center w-9 h-9 hover:bg-stone-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-inset"
            >
              <Minus aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
            <input
              id={qtyIdM}
              type="number"
              inputMode="numeric"
              value={item.qty}
              min="1"
              max="9999"
              step="1"
              onChange={(e) =>
                onChange(item.id, {
                  qty: Math.max(1, parseInt(e.target.value, 10) || 1),
                })
              }
              className="w-12 h-9 text-center text-sm font-mono bg-transparent border-x border-stone-300 focus:outline-none focus-visible:bg-amber-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-800"
            />
            <button
              type="button"
              onClick={() => onChange(item.id, { qty: Math.round(item.qty + 1) })}
              aria-label="Tăng số lượng"
              className="inline-flex items-center justify-center w-9 h-9 hover:bg-stone-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-inset"
            >
              <Plus aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-[11px] text-stone-600 font-mono">
            {product.unit} · {formatVND(unitPrice)}
          </span>

          {/* Quote-type override chip — opens details, focuses radiogroup */}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={`Loại báo giá: ${activeQt.label}. Mở chi tiết để thay đổi.`}
            className="ml-auto inline-flex items-center gap-1 h-7 px-2 text-[10px] tracking-wider uppercase border border-stone-300 bg-white text-stone-700 hover:border-amber-800 hover:text-amber-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-1"
          >
            <Settings2 aria-hidden="true" className="w-3 h-3" />
            {activeQt.short}
          </button>
          {hasOptions && (
            <span
              className={`inline-flex items-center h-7 px-2 text-[10px] tracking-wider uppercase border font-mono ${
                selectedOptCount > 0
                  ? "border-amber-700/50 bg-amber-50 text-amber-900"
                  : "border-stone-300 bg-white text-stone-600"
              }`}
            >
              {selectedOptCount > 0 ? `+${selectedOptCount} tùy chọn` : `Tùy chọn (${productOptions.length})`}
            </span>
          )}
          </div>
        </div>

        {/* Row 3 — collapsed details: quote-type radiogroup + options checkboxes */}
        {expanded && (
          <div
            id={detailsId}
            role="region"
            aria-label={`Chi tiết hạng mục ${product.name}`}
            className="mt-3 ml-9 mr-1 pl-3 mb-3 border-l-2 border-amber-800/30 space-y-3 cart-details-in"
          >
            <div>
              <span
                id={radiogroupIdM}
                className="block text-[10px] tracking-wider uppercase text-stone-600 mb-1 font-medium"
              >
                Loại báo giá (ghi đè)
              </span>
              <div
                role="radiogroup"
                aria-labelledby={radiogroupIdM}
                className="flex gap-0 border border-stone-300 bg-white"
              >
                {QUOTE_TYPES.map((qt) => {
                  const disabled = !hasManufacture && qt.value !== "install";
                  const isActive = item.quoteType === qt.value;
                  return (
                    <button
                      key={qt.value}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      aria-disabled={disabled}
                      disabled={disabled}
                      onClick={() => onChange(item.id, { quoteType: qt.value })}
                      title={disabled ? "Sản phẩm này chỉ có Lắp đặt" : qt.label}
                      className={`flex-1 py-2 min-h-[40px] text-[11px] tracking-wider uppercase transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-inset ${
                        isActive
                          ? "bg-stone-900 text-amber-50 font-medium"
                          : disabled
                          ? "text-stone-400 cursor-not-allowed bg-stone-50"
                          : "text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      <span aria-hidden="true">{qt.short}</span>
                      <span className="sr-only">{qt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {hasOptions && (
              <fieldset className="space-y-0.5">
                <legend className="text-[10px] tracking-wider uppercase text-stone-600 font-medium mb-1">
                  Tùy chọn
                </legend>
                {productOptions.map((opt) => {
                  const checked = item.selectedOptions.includes(opt.option_id);
                  return (
                    <label
                      key={opt.option_id}
                      className="flex items-center gap-2 text-xs cursor-pointer select-none py-1.5 min-h-[36px]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const newOpts = checked
                            ? item.selectedOptions.filter((o) => o !== opt.option_id)
                            : [...item.selectedOptions, opt.option_id];
                          onChange(item.id, { selectedOptions: newOpts });
                        }}
                        className="w-4 h-4 accent-amber-900 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-800"
                      />
                      <span
                        className={`flex-1 ${
                          checked ? "text-stone-900" : "text-stone-600"
                        }`}
                      >
                        {opt.option_name}
                      </span>
                      <span className="font-mono text-amber-900">
                        {opt.is_free ? "Miễn phí" : `+${formatVND(opt.extra_price)}`}
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            )}
          </div>
        )}
      </div>

      {/* DESKTOP branch — sm and up — UNCHANGED from current implementation */}
      <div className="hidden sm:block py-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] tracking-widest uppercase text-stone-600 mb-0.5 font-mono">
              {product.sku}
            </p>
            <h4 className="font-serif text-base text-stone-900 truncate font-medium">
              {product.name}
            </h4>
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label={`Xóa ${product.name} khỏi báo giá`}
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -mt-2 -mr-2 text-stone-500 hover:text-red-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <Trash2 aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-2.5">
          <span
            id={radiogroupId}
            className="block text-[11px] tracking-wider uppercase text-stone-600 mb-1 font-medium"
          >
            Loại báo giá
          </span>
          <div
            role="radiogroup"
            aria-labelledby={radiogroupId}
            className="flex gap-0 border border-stone-300 bg-white"
          >
            {QUOTE_TYPES.map((qt) => {
              const disabled = !hasManufacture && qt.value !== "install";
              const isActive = item.quoteType === qt.value;
              return (
                <button
                  key={qt.value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  aria-disabled={disabled}
                  disabled={disabled}
                  onClick={() => onChange(item.id, { quoteType: qt.value })}
                  title={disabled ? "Sản phẩm này chỉ có Lắp đặt" : qt.label}
                  className={`flex-1 py-2.5 min-h-[44px] text-[11px] tracking-wider uppercase transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-inset ${
                    isActive
                      ? "bg-stone-900 text-amber-50 font-medium"
                      : disabled
                      ? "text-stone-400 cursor-not-allowed bg-stone-50"
                      : "text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <span aria-hidden="true">{qt.short}</span>
                  <span className="sr-only">{qt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <label htmlFor={qtyId} className="sr-only">
            Số lượng {product.name} đơn vị {product.unit}
          </label>
          <div className="inline-flex items-center bg-stone-50 border border-stone-300">
            <button
              type="button"
              onClick={() =>
                onChange(item.id, { qty: Math.max(1, Math.round(item.qty - 1)) })
              }
              aria-label="Giảm số lượng"
              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] hover:bg-stone-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-inset"
            >
              <Minus aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
            <input
              id={qtyId}
              type="number"
              inputMode="numeric"
              value={item.qty}
              min="1"
              max="9999"
              step="1"
              onChange={(e) =>
                onChange(item.id, {
                  qty: Math.max(1, parseInt(e.target.value, 10) || 1),
                })
              }
              className="w-16 text-center text-sm font-mono bg-transparent border-x border-stone-300 py-2 min-h-[44px] focus:outline-none focus-visible:bg-amber-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-800"
            />
            <button
              type="button"
              onClick={() => onChange(item.id, { qty: Math.round(item.qty + 1) })}
              aria-label="Tăng số lượng"
              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] hover:bg-stone-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-inset"
            >
              <Plus aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-xs text-stone-600">{product.unit}</span>
          <span aria-hidden="true" className="text-xs text-stone-500">×</span>
          <span className="text-xs text-stone-600 font-mono">{formatVND(unitPrice)}</span>
        </div>

        {productOptions.length > 0 && (
          <fieldset className="mt-2 space-y-1 pl-1">
            <legend className="sr-only">Tùy chọn cho {product.name}</legend>
            {productOptions.map((opt) => {
              const checked = item.selectedOptions.includes(opt.option_id);
              return (
                <label
                  key={opt.option_id}
                  className="flex items-center gap-2 text-xs cursor-pointer select-none py-1"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const newOpts = checked
                        ? item.selectedOptions.filter((o) => o !== opt.option_id)
                        : [...item.selectedOptions, opt.option_id];
                      onChange(item.id, { selectedOptions: newOpts });
                    }}
                    className="w-4 h-4 accent-amber-900 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-800"
                  />
                  <span className={`flex-1 ${checked ? "text-stone-900" : "text-stone-600"}`}>
                    {opt.option_name}
                  </span>
                  <span className="font-mono text-amber-900">
                    {opt.is_free ? "Miễn phí" : `+${formatVND(opt.extra_price)}`}
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}

        <div className="flex justify-end mt-2">
          <span className="font-serif text-base text-stone-900 font-medium">
            {formatVND(subtotal)} <span className="text-xs text-stone-500">đ</span>
          </span>
        </div>
      </div>
    </article>
  );
}

export default memo(CartItem);
