import { memo, useState } from "react";
import { ChevronDown, Plus, Sparkles } from "lucide-react";
import { formatVND } from "../lib/helpers";

function ProductCard({ product, optionsCount, onAdd }) {
  const [open, setOpen] = useState(false);
  const total = product.price_install + product.price_manufacture;
  const hasBreakdown = product.price_manufacture > 0;
  const titleId = `prod-${product.sku}`;
  const detailsId = `prod-${product.sku}-details`;

  return (
    <article
      aria-labelledby={titleId}
      className="group relative bg-white border border-stone-200/80 hover:border-amber-800/30 focus-within:border-amber-800/50 transition-colors"
    >
      {/* ====================== MOBILE LAYOUT (<sm): horizontal row ====================== */}
      <div className="sm:hidden flex items-stretch gap-2 p-3">
        <div className="flex flex-col justify-center border-r border-stone-200 pr-2 min-w-[56px] max-w-[56px]">
          <p className="text-[9px] tracking-[0.12em] uppercase text-amber-900 font-medium leading-tight line-clamp-2">
            {product.category}
          </p>
          <span className="text-[9px] text-stone-500 font-mono mt-0.5 truncate">
            {product.sku}
          </span>
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3
            id={titleId}
            className="font-serif text-[15px] text-stone-900 leading-snug line-clamp-2"
          >
            {product.name}
          </h3>
          <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
            <span className="font-serif text-base text-stone-900 font-medium tabular-nums leading-none">
              {formatVND(total)}
              <span className="text-[10px] text-stone-600 ml-0.5">đ</span>
            </span>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider leading-none">
              /{product.unit}
            </span>
            {optionsCount > 0 && (
              <span
                aria-label={`${optionsCount} tùy chọn`}
                className="text-[10px] text-amber-900 inline-flex items-center gap-0.5 leading-none"
              >
                <Sparkles aria-hidden="true" className="w-3 h-3" />
                {optionsCount}
              </span>
            )}
            {!hasBreakdown && (
              <span className="text-[10px] text-amber-900 italic leading-none">
                · chỉ lắp đặt
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {hasBreakdown && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={detailsId}
              aria-label={`Xem chi tiết giá ${product.name}`}
              className="inline-flex items-center justify-center min-w-[36px] min-h-[44px] text-stone-500 hover:text-stone-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800"
            >
              <ChevronDown
                aria-hidden="true"
                className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          )}
          <button
            type="button"
            onClick={() => onAdd(product)}
            aria-label={`Thêm ${product.name} vào báo giá`}
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] bg-stone-900 text-amber-50 hover:bg-amber-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F2]"
          >
            <Plus aria-hidden="true" className="w-4 h-4" />
            <span className="sr-only">Thêm</span>
          </button>
        </div>
      </div>

      {open && hasBreakdown && (
        <div
          id={detailsId}
          className="sm:hidden px-3 pb-3 text-[11px] text-stone-600 space-y-0.5 border-t border-stone-200 pt-2"
        >
          <div className="flex justify-between">
            <span>Lắp đặt</span>
            <span className="font-mono">{formatVND(product.price_install)}</span>
          </div>
          <div className="flex justify-between">
            <span>Sản xuất</span>
            <span className="font-mono">{formatVND(product.price_manufacture)}</span>
          </div>
        </div>
      )}

      {/* ====================== DESKTOP LAYOUT (sm+): original card ====================== */}
      <div className="hidden sm:flex p-5 flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow">
        <div>
          <div className="flex items-start justify-between mb-3 gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] tracking-[0.18em] uppercase text-amber-900 font-medium mb-1">
                {product.category}
              </p>
              <h3 className="font-serif text-xl text-stone-900 leading-tight">
                {product.name}
              </h3>
            </div>
            <span className="shrink-0 text-[11px] tracking-wider text-stone-500 font-mono">
              {product.sku}
            </span>
          </div>

          {product.description && (
            <p className="text-xs text-stone-600 italic mb-3 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        <div>
          <div className="border-t border-stone-200 pt-3 mb-4 space-y-1">
            {hasBreakdown ? (
              <>
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Lắp đặt</span>
                  <span className="font-mono">{formatVND(product.price_install)}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Sản xuất</span>
                  <span className="font-mono">{formatVND(product.price_manufacture)}</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-amber-900 italic">Chỉ tính công lắp đặt</div>
            )}
            <div className="flex justify-between items-baseline pt-1">
              <span className="text-[11px] tracking-wider text-stone-600 uppercase">
                Đơn giá / {product.unit}
              </span>
              <span className="font-serif text-xl text-stone-900 font-medium">
                {formatVND(total)}
                <span className="text-xs text-stone-600 ml-1">đ</span>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            {optionsCount > 0 && (
              <span className="text-[11px] tracking-wider text-amber-900 uppercase inline-flex items-center gap-1">
                <Sparkles aria-hidden="true" className="w-3 h-3" /> {optionsCount} tùy chọn
              </span>
            )}
            <button
              type="button"
              onClick={() => onAdd(product)}
              aria-label={`Thêm ${product.name} vào báo giá`}
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-stone-900 text-amber-50 text-xs tracking-widest uppercase hover:bg-amber-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F2]"
            >
              <Plus aria-hidden="true" className="w-3.5 h-3.5" /> Thêm
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default memo(ProductCard);
