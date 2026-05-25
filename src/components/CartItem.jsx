import { memo, useId, useState } from "react";
import { ChevronDown, Minus, Plus, RotateCcw, Settings2, Trash2 } from "lucide-react";
import { QUOTE_TYPES } from "../lib/constants";
import {
  computeEffectiveOptionPrice,
  computeEffectiveUnitPrice,
  computeUnitPrice,
  formatVND,
} from "../lib/helpers";

const MIN_QTY = 0.1;
const DEFAULT_QTY_ON_INVALID_BLUR = 1;

// --- Local editable-number-with-string-buffer helpers --------------------
// We keep a local string buffer for each editable price field so users can
// clear or type intermediate values ("0", "0.5", "1.") without the parent
// state immediately clamping them. Valid >= 0 numbers commit to parent;
// invalid/empty blurs fall back to a sensible default.

const makeStringHandlers = ({ setStr, defaultOnBlur, commit }) => {
  const onChange = (e) => {
    const v = e.target.value;
    setStr(v);
    const n = parseFloat(v);
    if (!Number.isNaN(n) && n >= 0) {
      commit(n);
    }
  };
  const onBlur = () => {
    setStr((current) => {
      const n = parseFloat(current);
      if (Number.isNaN(n) || n < 0) {
        commit(defaultOnBlur);
        return String(defaultOnBlur);
      }
      commit(n);
      return String(n);
    });
  };
  return { onChange, onBlur };
};

function CartItem({ item, product, productOptions, optionsMap, onChange, onRemove }) {
  const qtyId = useId();
  const qtyIdM = useId();
  const radiogroupId = useId();
  const radiogroupIdM = useId();
  const detailsId = useId();
  const priceId = useId();
  const priceIdM = useId();
  const [expanded, setExpanded] = useState(false);

  // ----- Quantity string buffer (decimal-friendly) -----
  // Adjust-state-during-render pattern: when the parent's item.qty changes,
  // resync the local string buffer UNLESS it already represents the same number
  // (preserves user typing like "1." while item.qty is 1).
  const [qtyStr, setQtyStr] = useState(() => String(item.qty));
  const [prevItemQty, setPrevItemQty] = useState(item.qty);
  if (item.qty !== prevItemQty) {
    setPrevItemQty(item.qty);
    if (parseFloat(qtyStr) !== item.qty) setQtyStr(String(item.qty));
  }

  const handleQtyChange = (e) => {
    const v = e.target.value;
    setQtyStr(v);
    const n = parseFloat(v);
    if (!Number.isNaN(n) && n >= MIN_QTY) {
      onChange(item.id, { qty: n });
    }
  };

  const handleQtyBlur = () => {
    const n = parseFloat(qtyStr);
    if (Number.isNaN(n) || n < MIN_QTY) {
      setQtyStr(String(DEFAULT_QTY_ON_INVALID_BLUR));
      onChange(item.id, { qty: DEFAULT_QTY_ON_INVALID_BLUR });
    } else {
      setQtyStr(String(n));
    }
  };

  // ----- Effective prices and override state -----
  const catalogUnitPrice = computeUnitPrice(product, item.quoteType);
  const effectiveUnitPrice = computeEffectiveUnitPrice(item, product);
  const unitPriceOverridden =
    item.unitPriceOverride != null && item.unitPriceOverride !== catalogUnitPrice;

  // ----- Unit price string buffer (adjust-during-render sync) -----
  const [unitPriceStr, setUnitPriceStr] = useState(() => String(effectiveUnitPrice));
  const [prevEffectiveUnit, setPrevEffectiveUnit] = useState(effectiveUnitPrice);
  if (effectiveUnitPrice !== prevEffectiveUnit) {
    setPrevEffectiveUnit(effectiveUnitPrice);
    if (parseFloat(unitPriceStr) !== effectiveUnitPrice) {
      setUnitPriceStr(String(effectiveUnitPrice));
    }
  }

  const unitPriceHandlers = makeStringHandlers({
    setStr: setUnitPriceStr,
    defaultOnBlur: catalogUnitPrice,
    commit: (n) => onChange(item.id, { unitPriceOverride: n }),
  });

  const handleUnitPriceReset = () => {
    setUnitPriceStr(String(catalogUnitPrice));
    onChange(item.id, { unitPriceOverride: null });
  };

  // ----- Subtotal calc -----
  const baseTotal = effectiveUnitPrice * item.qty;
  const optionsTotal =
    item.selectedOptions.reduce((sum, optId) => {
      const opt = optionsMap.get(optId);
      return sum + computeEffectiveOptionPrice(item, opt);
    }, 0) * item.qty;
  const subtotal = baseTotal + optionsTotal;

  const activeQt = QUOTE_TYPES.find((q) => q.value === item.quoteType) || QUOTE_TYPES[0];
  const selectedOptCount = item.selectedOptions.length;
  const hasManufacture = product.price_manufacture > 0;
  const hasOptions = productOptions.length > 0;
  const showExpand = hasManufacture || hasOptions;

  // ----- Option price commit helper -----
  const setOptionPriceOverride = (optionId, value) => {
    const next = { ...(item.optionPriceOverrides || {}) };
    if (value == null) delete next[optionId];
    else next[optionId] = value;
    onChange(item.id, { optionPriceOverrides: next });
  };

  return (
    <article aria-label={`Hạng mục: ${product.name}`} className="border-b border-stone-200/60">
      {/* MOBILE compact branch — < sm (640px) */}
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
          {/* Row 1 — trash · name · subtotal · chevron */}
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

          {/* Row 2 — qty stepper · unit · EDITABLE UNIT PRICE · quote-type · options badge */}
          <div className="mt-1.5 ml-9 flex items-center gap-2 flex-wrap">
            <label htmlFor={qtyIdM} className="sr-only">
              Số lượng {product.name} đơn vị {product.unit}
            </label>
            <div className="inline-flex items-center bg-stone-50 border border-stone-300 h-9">
              <button
                type="button"
                onClick={() =>
                  onChange(item.id, { qty: Math.max(0.1, parseFloat((item.qty - 1).toFixed(2))) })
                }
                aria-label="Giảm số lượng"
                className="inline-flex items-center justify-center w-9 h-9 hover:bg-stone-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-inset"
              >
                <Minus aria-hidden="true" className="w-3.5 h-3.5" />
              </button>
              <input
                id={qtyIdM}
                type="number"
                inputMode="decimal"
                value={qtyStr}
                min="0.1"
                max="9999"
                step="0.1"
                onChange={handleQtyChange}
                onBlur={handleQtyBlur}
                className="w-12 h-9 text-center text-sm font-mono bg-transparent border-x border-stone-300 focus:outline-none focus-visible:bg-amber-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-800"
              />
              <button
                type="button"
                onClick={() => onChange(item.id, { qty: parseFloat((item.qty + 1).toFixed(2)) })}
                aria-label="Tăng số lượng"
                className="inline-flex items-center justify-center w-9 h-9 hover:bg-stone-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-inset"
              >
                <Plus aria-hidden="true" className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Editable unit price (mobile) */}
            <span className="text-[11px] text-stone-600 font-mono">{product.unit} ·</span>
            <label htmlFor={priceIdM} className="sr-only">
              Đơn giá {product.name}
            </label>
            <input
              id={priceIdM}
              type="number"
              inputMode="decimal"
              value={unitPriceStr}
              min="0"
              step="1000"
              onChange={unitPriceHandlers.onChange}
              onBlur={unitPriceHandlers.onBlur}
              aria-label={`Đơn giá ${product.name}`}
              className={`w-24 h-9 text-right text-[12px] font-mono px-1.5 bg-white border focus:outline-none focus-visible:bg-amber-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-800 ${
                unitPriceOverridden
                  ? "border-amber-700/70 text-amber-900"
                  : "border-stone-300 text-stone-700"
              }`}
            />
            {unitPriceOverridden && (
              <button
                type="button"
                onClick={handleUnitPriceReset}
                aria-label="Khôi phục giá niêm yết"
                title="Khôi phục giá niêm yết"
                className="inline-flex items-center justify-center w-7 h-7 text-stone-500 hover:text-amber-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-1"
              >
                <RotateCcw aria-hidden="true" className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Quote-type chip — opens details */}
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
                {selectedOptCount > 0
                  ? `+${selectedOptCount} tùy chọn`
                  : `Tùy chọn (${productOptions.length})`}
              </span>
            )}
          </div>
        </div>

        {/* Row 3 — expanded details (mobile) */}
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
                {productOptions.map((opt) => (
                  <OptionRow
                    key={opt.option_id}
                    opt={opt}
                    item={item}
                    onToggle={() => {
                      const checked = item.selectedOptions.includes(opt.option_id);
                      const newOpts = checked
                        ? item.selectedOptions.filter((o) => o !== opt.option_id)
                        : [...item.selectedOptions, opt.option_id];
                      onChange(item.id, { selectedOptions: newOpts });
                    }}
                    onPriceChange={(value) => setOptionPriceOverride(opt.option_id, value)}
                  />
                ))}
              </fieldset>
            )}
          </div>
        )}
      </div>

      {/* DESKTOP branch — sm and up */}
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

        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <label htmlFor={qtyId} className="sr-only">
            Số lượng {product.name} đơn vị {product.unit}
          </label>
          <div className="inline-flex items-center bg-stone-50 border border-stone-300">
            <button
              type="button"
              onClick={() =>
                onChange(item.id, { qty: Math.max(0.1, parseFloat((item.qty - 1).toFixed(2))) })
              }
              aria-label="Giảm số lượng"
              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] hover:bg-stone-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-inset"
            >
              <Minus aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
            <input
              id={qtyId}
              type="number"
              inputMode="decimal"
              value={qtyStr}
              min="0.1"
              max="9999"
              step="0.1"
              onChange={handleQtyChange}
              onBlur={handleQtyBlur}
              className="w-16 text-center text-sm font-mono bg-transparent border-x border-stone-300 py-2 min-h-[44px] focus:outline-none focus-visible:bg-amber-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-800"
            />
            <button
              type="button"
              onClick={() => onChange(item.id, { qty: parseFloat((item.qty + 1).toFixed(2)) })}
              aria-label="Tăng số lượng"
              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] hover:bg-stone-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-inset"
            >
              <Plus aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-xs text-stone-600">{product.unit}</span>
          <span aria-hidden="true" className="text-xs text-stone-500">×</span>

          {/* Editable unit price (desktop) */}
          <label htmlFor={priceId} className="sr-only">
            Đơn giá {product.name}
          </label>
          <div className="inline-flex items-center gap-1">
            <input
              id={priceId}
              type="number"
              inputMode="decimal"
              value={unitPriceStr}
              min="0"
              step="1000"
              onChange={unitPriceHandlers.onChange}
              onBlur={unitPriceHandlers.onBlur}
              aria-label={`Đơn giá ${product.name}`}
              className={`w-32 h-10 text-right text-xs font-mono px-2 bg-white border focus:outline-none focus-visible:bg-amber-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-800 ${
                unitPriceOverridden
                  ? "border-amber-700/70 text-amber-900"
                  : "border-stone-300 text-stone-700"
              }`}
            />
            <span className="text-xs text-stone-500">đ</span>
            {unitPriceOverridden && (
              <button
                type="button"
                onClick={handleUnitPriceReset}
                aria-label="Khôi phục giá niêm yết"
                title="Khôi phục giá niêm yết"
                className="inline-flex items-center justify-center w-8 h-8 text-stone-500 hover:text-amber-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-1"
              >
                <RotateCcw aria-hidden="true" className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {productOptions.length > 0 && (
          <fieldset className="mt-2 space-y-1 pl-1">
            <legend className="sr-only">Tùy chọn cho {product.name}</legend>
            {productOptions.map((opt) => (
              <OptionRow
                key={opt.option_id}
                opt={opt}
                item={item}
                desktop
                onToggle={() => {
                  const checked = item.selectedOptions.includes(opt.option_id);
                  const newOpts = checked
                    ? item.selectedOptions.filter((o) => o !== opt.option_id)
                    : [...item.selectedOptions, opt.option_id];
                  onChange(item.id, { selectedOptions: newOpts });
                }}
                onPriceChange={(value) => setOptionPriceOverride(opt.option_id, value)}
              />
            ))}
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

// ---------------------------------------------------------------------------
// Option row — checkbox + editable extra-price (when checked and not free)
//
// Layout note: the checkbox + name are wrapped in a `<label>` so the label
// can implicitly toggle the checkbox when clicked. The price input and reset
// button sit OUTSIDE the label as siblings so clicking inside them doesn't
// accidentally toggle the option's selected state.
// ---------------------------------------------------------------------------
function OptionRow({ opt, item, desktop = false, onToggle, onPriceChange }) {
  const checked = item.selectedOptions.includes(opt.option_id);
  const catalogExtra = opt.is_free ? 0 : opt.extra_price;
  const effectivePrice = computeEffectiveOptionPrice(item, opt);
  const overridden =
    item.optionPriceOverrides?.[opt.option_id] != null &&
    item.optionPriceOverrides[opt.option_id] !== catalogExtra;

  // Adjust-during-render sync between effectivePrice prop and local string buffer.
  const [priceStr, setPriceStr] = useState(() => String(effectivePrice));
  const [prevEffective, setPrevEffective] = useState(effectivePrice);
  if (effectivePrice !== prevEffective) {
    setPrevEffective(effectivePrice);
    if (parseFloat(priceStr) !== effectivePrice) setPriceStr(String(effectivePrice));
  }

  const handlers = makeStringHandlers({
    setStr: setPriceStr,
    defaultOnBlur: catalogExtra,
    commit: (n) => onPriceChange(n),
  });

  const handleReset = () => {
    setPriceStr(String(catalogExtra));
    onPriceChange(null);
  };

  const showPriceInput = checked && (!opt.is_free || overridden);

  return (
    <div
      className={`flex items-center gap-2 text-xs select-none ${
        desktop ? "py-1" : "py-1.5 min-h-[36px]"
      }`}
    >
      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="w-4 h-4 accent-amber-900 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-800"
        />
        <span className={`flex-1 truncate ${checked ? "text-stone-900" : "text-stone-600"}`}>
          {opt.option_name}
        </span>
      </label>

      {opt.is_free && !overridden && (
        <span className="font-mono text-amber-900">Miễn phí</span>
      )}

      {!showPriceInput && !opt.is_free && !checked && (
        <span className="font-mono text-stone-500">+{formatVND(catalogExtra)}</span>
      )}

      {showPriceInput && (
        <span className="inline-flex items-center gap-1 shrink-0">
          <span className="text-amber-900 font-mono">+</span>
          <input
            type="number"
            inputMode="decimal"
            value={priceStr}
            min="0"
            step="1000"
            onChange={handlers.onChange}
            onBlur={handlers.onBlur}
            aria-label={`Giá phụ thu cho ${opt.option_name}`}
            className={`w-24 h-7 text-right font-mono px-1.5 bg-white border focus:outline-none focus-visible:bg-amber-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-800 ${
              overridden ? "border-amber-700/70 text-amber-900" : "border-stone-300 text-stone-700"
            }`}
          />
          {overridden && (
            <button
              type="button"
              onClick={handleReset}
              aria-label={`Khôi phục giá gốc cho ${opt.option_name}`}
              title="Khôi phục giá gốc"
              className="inline-flex items-center justify-center w-6 h-6 text-stone-500 hover:text-amber-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-1"
            >
              <RotateCcw aria-hidden="true" className="w-3 h-3" />
            </button>
          )}
        </span>
      )}
    </div>
  );
}

export default memo(CartItem);
