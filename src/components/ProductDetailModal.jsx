import { useCallback, useId, useState } from "react";
import { AlertCircle, Loader2, Pencil, Plus, Sparkles, X } from "lucide-react";
import Modal from "./Modal";
import { formatVND } from "../lib/helpers";

/**
 * @param {{
 *   product: object,
 *   productOptions: Array<object>,
 *   canEdit: boolean,
 *   onClose: () => void,
 *   onAddToCart: (product: object) => void,
 *   onSave: (payload: { product: object, options: Array<object> }) => Promise<void>,
 * }} props
 */
export default function ProductDetailModal({
  product,
  productOptions,
  canEdit,
  onClose,
  onAddToCart,
  onSave,
}) {
  const titleId = useId();
  const [mode, setMode] = useState("view"); // "view" | "edit"
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Editable draft state — populated on entering edit mode
  const [draftProduct, setDraftProduct] = useState(null);
  const [draftOptions, setDraftOptions] = useState([]);

  const enterEdit = () => {
    setDraftProduct({
      sku: product.sku,
      name: product.name || "",
      price_install: String(product.price_install || 0),
      price_manufacture: String(product.price_manufacture || 0),
    });
    setDraftOptions(
      productOptions.map((o) => ({
        option_id: o.option_id,
        sku: o.sku,
        option_name: o.option_name || "",
        extra_price: String(o.extra_price || 0),
        is_free: !!o.is_free,
      })),
    );
    setError(null);
    setMode("edit");
  };

  const cancelEdit = () => {
    setMode("view");
    setError(null);
  };

  const handleSave = useCallback(async () => {
    if (!draftProduct || !draftProduct.name.trim()) {
      setError("Tên sản phẩm không được để trống.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        product: {
          sku: draftProduct.sku,
          name: draftProduct.name.trim(),
          price_install: parseFloat(draftProduct.price_install) || 0,
          price_manufacture: parseFloat(draftProduct.price_manufacture) || 0,
        },
        options: draftOptions.map((o) => ({
          option_id: o.option_id,
          sku: o.sku,
          option_name: o.option_name.trim(),
          extra_price: parseFloat(o.extra_price) || 0,
          is_free: o.is_free,
        })),
      });
      setMode("view");
    } catch (e) {
      setError(e?.message || "Lưu không thành công.");
    } finally {
      setSaving(false);
    }
  }, [draftProduct, draftOptions, onSave]);

  const total = product.price_install + product.price_manufacture;
  const hasBreakdown = product.price_manufacture > 0;

  return (
    <Modal
      titleId={titleId}
      onClose={saving ? () => {} : onClose}
      className="bg-white max-w-2xl w-full my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border-t-2 border-stone-900"
    >
      {/* Sticky header */}
      <div className="sticky top-0 bg-white border-b border-stone-300 px-4 sm:px-6 py-3 flex justify-between items-center gap-2 z-10">
        <div className="min-w-0">
          <p className="text-[10px] tracking-widest uppercase text-stone-500 font-mono">
            {product.sku} · {product.category}
          </p>
          <h2
            id={titleId}
            className="font-serif text-lg sm:text-xl text-stone-900 leading-tight font-medium truncate"
          >
            {mode === "edit" ? "Chỉnh sửa sản phẩm" : product.name}
          </h2>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {mode === "view" && canEdit && (
            <button
              type="button"
              onClick={enterEdit}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] border border-stone-300 text-stone-800 text-[11px] tracking-wider uppercase hover:bg-stone-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
            >
              <Pencil aria-hidden="true" className="w-3.5 h-3.5" /> Sửa
            </button>
          )}
          {mode === "edit" && (
            <>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="px-3 py-2 min-h-[40px] border border-stone-300 text-stone-700 text-[11px] tracking-wider uppercase hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] bg-stone-900 text-amber-50 text-[11px] tracking-wider uppercase hover:bg-amber-900 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
              >
                {saving && <Loader2 aria-hidden="true" className="w-3.5 h-3.5 animate-spin" />}
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Đóng"
            className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] text-stone-600 hover:text-stone-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="px-4 sm:px-6 py-2 bg-amber-50 border-b border-amber-700/30 text-xs text-stone-900 flex items-start gap-2"
        >
          <AlertCircle aria-hidden="true" className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-800" />
          <span>{error}</span>
        </div>
      )}

      <div className="p-4 sm:p-6 space-y-5">
        {mode === "view" ? (
          <ProductView
            product={product}
            total={total}
            hasBreakdown={hasBreakdown}
            productOptions={productOptions}
            onAddToCart={() => {
              onAddToCart(product);
              onClose();
            }}
          />
        ) : (
          <ProductEditForm
            draftProduct={draftProduct}
            setDraftProduct={setDraftProduct}
            draftOptions={draftOptions}
            setDraftOptions={setDraftOptions}
            unit={product.unit}
            disabled={saving}
          />
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// View mode
// ---------------------------------------------------------------------------
function ProductView({ product, total, hasBreakdown, productOptions, onAddToCart }) {
  return (
    <>
      {product.description && (
        <p className="text-sm text-stone-700 italic leading-relaxed">{product.description}</p>
      )}

      <dl className="grid grid-cols-2 gap-4 pb-4 border-b border-stone-200">
        <div>
          <dt className="text-[10px] tracking-widest uppercase text-stone-500 mb-1 font-medium">
            Giá lắp đặt
          </dt>
          <dd className="font-serif text-lg text-stone-900 font-medium">
            {formatVND(product.price_install)}
            <span className="text-xs text-stone-500 ml-0.5">đ</span>
          </dd>
        </div>
        <div>
          <dt className="text-[10px] tracking-widest uppercase text-stone-500 mb-1 font-medium">
            Giá sản xuất
          </dt>
          <dd className="font-serif text-lg text-stone-900 font-medium">
            {hasBreakdown ? (
              <>
                {formatVND(product.price_manufacture)}
                <span className="text-xs text-stone-500 ml-0.5">đ</span>
              </>
            ) : (
              <span className="text-sm text-stone-400 italic font-sans">— Không có —</span>
            )}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[10px] tracking-widest uppercase text-stone-500 mb-1 font-medium">
            Tổng đơn giá / {product.unit}
          </dt>
          <dd className="font-serif text-2xl text-stone-900 font-medium">
            {formatVND(total)}
            <span className="text-sm text-stone-500 ml-1">đ</span>
          </dd>
        </div>
      </dl>

      <div>
        <h3 className="text-[10px] tracking-widest uppercase text-stone-700 font-medium mb-2 inline-flex items-center gap-1">
          <Sparkles aria-hidden="true" className="w-3 h-3 text-amber-800" />
          Tùy chọn ({productOptions.length})
        </h3>
        {productOptions.length === 0 ? (
          <p className="text-sm text-stone-500 italic">Không có tùy chọn cho sản phẩm này.</p>
        ) : (
          <ul className="divide-y divide-stone-200 border-y border-stone-200">
            {productOptions.map((o) => (
              <li key={o.option_id} className="py-2 flex items-center justify-between text-sm">
                <span className="text-stone-900">{o.option_name}</span>
                <span className="font-mono text-amber-900">
                  {o.is_free ? "Miễn phí" : `+${formatVND(o.extra_price)}đ`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={onAddToCart}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] bg-stone-900 text-amber-50 text-xs tracking-widest uppercase hover:bg-amber-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
      >
        <Plus aria-hidden="true" className="w-3.5 h-3.5" /> Thêm vào báo giá
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Edit mode
// ---------------------------------------------------------------------------
function ProductEditForm({
  draftProduct,
  setDraftProduct,
  draftOptions,
  setDraftOptions,
  unit,
  disabled,
}) {
  const updateOption = (idx, patch) => {
    setDraftOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
      <fieldset disabled={disabled} className="space-y-3">
        <legend className="sr-only">Thông tin sản phẩm</legend>

        <div>
          <label
            htmlFor="prod-name"
            className="block text-[10px] tracking-widest uppercase text-stone-700 mb-1 font-medium"
          >
            Tên sản phẩm
          </label>
          <input
            id="prod-name"
            type="text"
            value={draftProduct.name}
            onChange={(e) => setDraftProduct({ ...draftProduct, name: e.target.value })}
            className="w-full px-3 py-2 min-h-[44px] text-sm border border-stone-300 bg-white focus:outline-none focus-visible:bg-amber-50/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-800"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="prod-install"
              className="block text-[10px] tracking-widest uppercase text-stone-700 mb-1 font-medium"
            >
              Giá lắp đặt (đ / {unit})
            </label>
            <input
              id="prod-install"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              value={draftProduct.price_install}
              onChange={(e) =>
                setDraftProduct({ ...draftProduct, price_install: e.target.value })
              }
              className="w-full px-3 py-2 min-h-[44px] text-sm font-mono text-right border border-stone-300 bg-white focus:outline-none focus-visible:bg-amber-50/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-800"
            />
          </div>
          <div>
            <label
              htmlFor="prod-manufacture"
              className="block text-[10px] tracking-widest uppercase text-stone-700 mb-1 font-medium"
            >
              Giá sản xuất (đ / {unit})
            </label>
            <input
              id="prod-manufacture"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              value={draftProduct.price_manufacture}
              onChange={(e) =>
                setDraftProduct({ ...draftProduct, price_manufacture: e.target.value })
              }
              className="w-full px-3 py-2 min-h-[44px] text-sm font-mono text-right border border-stone-300 bg-white focus:outline-none focus-visible:bg-amber-50/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-800"
            />
            <p className="text-[11px] text-stone-500 mt-1 italic">
              Để 0 nếu chỉ có công lắp đặt.
            </p>
          </div>
        </div>
      </fieldset>

      <fieldset disabled={disabled} className="space-y-2">
        <legend className="text-[10px] tracking-widest uppercase text-stone-700 font-medium mb-1 inline-flex items-center gap-1">
          <Sparkles aria-hidden="true" className="w-3 h-3 text-amber-800" />
          Tùy chọn ({draftOptions.length})
        </legend>
        {draftOptions.length === 0 ? (
          <p className="text-sm text-stone-500 italic">Sản phẩm này chưa có tùy chọn.</p>
        ) : (
          <div className="space-y-3 border-y border-stone-200 py-3">
            {draftOptions.map((o, idx) => (
              <div key={o.option_id} className="space-y-2 pb-2 border-b border-stone-200/60 last:border-b-0 last:pb-0">
                <p className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
                  {o.option_id}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr,140px] gap-2">
                  <input
                    type="text"
                    value={o.option_name}
                    onChange={(e) => updateOption(idx, { option_name: e.target.value })}
                    aria-label={`Tên tùy chọn ${o.option_id}`}
                    placeholder="Tên tùy chọn"
                    className="px-3 py-2 min-h-[40px] text-sm border border-stone-300 bg-white focus:outline-none focus-visible:bg-amber-50/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-800"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1000"
                      value={o.extra_price}
                      disabled={o.is_free}
                      onChange={(e) => updateOption(idx, { extra_price: e.target.value })}
                      aria-label={`Giá tùy chọn ${o.option_id}`}
                      className="flex-1 px-2 py-2 min-h-[40px] text-sm font-mono text-right border border-stone-300 bg-white disabled:bg-stone-100 disabled:text-stone-400 focus:outline-none focus-visible:bg-amber-50/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-800"
                    />
                    <span className="text-xs text-stone-500">đ</span>
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-stone-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={o.is_free}
                    onChange={(e) => updateOption(idx, { is_free: e.target.checked })}
                    className="w-4 h-4 accent-amber-900 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-800"
                  />
                  Miễn phí
                </label>
              </div>
            ))}
          </div>
        )}
      </fieldset>
    </form>
  );
}
