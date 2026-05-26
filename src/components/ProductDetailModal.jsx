import { useCallback, useId, useState } from "react";
import { AlertCircle, Loader2, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import Modal from "./Modal";
import { formatVND } from "../lib/helpers";

const NEW_OPTION_PREFIX = "new-";

const blankProduct = () => ({
  sku: "", // empty → backend assigns SP-NNN
  name: "",
  category: "",
  unit: "",
  price_install: "0",
  price_manufacture: "0",
});

const blankOption = (sku) => ({
  option_id: `${NEW_OPTION_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  sku,
  option_name: "",
  extra_price: "0",
  is_free: false,
});

/**
 * @param {{
 *   product: object|null,
 *   productOptions?: Array<object>,
 *   canEdit: boolean,
 *   isCreate?: boolean,
 *   categories?: Array<string>,
 *   onClose: () => void,
 *   onAddToCart?: (product: object) => void,
 *   onSave: (payload: { product: object, options: Array<object> }) => Promise<object>,
 * }} props
 */
export default function ProductDetailModal({
  product,
  productOptions = [],
  canEdit,
  isCreate = false,
  categories = [],
  onClose,
  onAddToCart,
  onSave,
}) {
  const titleId = useId();
  const categoriesId = useId();
  // In create mode there is nothing to "view" — start in edit immediately.
  const [mode, setMode] = useState(isCreate ? "edit" : "view");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Editable draft state — populated on mount (create) or on entering edit mode
  const [draftProduct, setDraftProduct] = useState(() =>
    isCreate
      ? blankProduct()
      : {
          sku: product?.sku || "",
          name: product?.name || "",
          category: product?.category || "",
          unit: product?.unit || "",
          price_install: String(product?.price_install || 0),
          price_manufacture: String(product?.price_manufacture || 0),
        },
  );
  const [draftOptions, setDraftOptions] = useState(() =>
    isCreate
      ? []
      : productOptions.map((o) => ({
          option_id: o.option_id,
          sku: o.sku,
          option_name: o.option_name || "",
          extra_price: String(o.extra_price || 0),
          is_free: !!o.is_free,
        })),
  );

  const enterEdit = () => {
    setDraftProduct({
      sku: product.sku,
      name: product.name || "",
      category: product.category || "",
      unit: product.unit || "",
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
    // In create mode "Cancel" closes the modal entirely since there is no view.
    if (isCreate) {
      onClose();
      return;
    }
    setMode("view");
    setError(null);
  };

  const addNewOption = () => {
    setDraftOptions((prev) => [...prev, blankOption(draftProduct.sku || "")]);
  };

  const removeOption = (idx) => {
    setDraftOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = useCallback(async () => {
    if (!draftProduct || !draftProduct.name.trim()) {
      setError("Tên sản phẩm không được để trống.");
      return;
    }
    if (isCreate && !draftProduct.unit.trim()) {
      setError("Đơn vị tính không được để trống.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        product: {
          // Empty sku tells the backend to auto-assign a new SP-NNN.
          sku: draftProduct.sku || undefined,
          name: draftProduct.name.trim(),
          category: draftProduct.category.trim(),
          unit: draftProduct.unit.trim(),
          price_install: parseFloat(draftProduct.price_install) || 0,
          price_manufacture: parseFloat(draftProduct.price_manufacture) || 0,
        },
        options: draftOptions.map((o) => ({
          option_id: o.option_id, // backend treats "new-..." as create
          sku: o.sku,
          option_name: o.option_name.trim(),
          extra_price: parseFloat(o.extra_price) || 0,
          is_free: o.is_free,
        })),
      });
      if (isCreate) {
        onClose();
      } else {
        setMode("view");
      }
    } catch (e) {
      setError(e?.message || "Lưu không thành công.");
    } finally {
      setSaving(false);
    }
  }, [draftProduct, draftOptions, onSave, isCreate, onClose]);

  // ----- Top header strings -----
  const headerTitle = isCreate
    ? "Thêm sản phẩm mới"
    : mode === "edit"
    ? "Chỉnh sửa sản phẩm"
    : product?.name || "Chi tiết sản phẩm";
  const headerSubtitle = isCreate
    ? "Nhập thông tin để thêm vào danh mục"
    : product
    ? `${product.sku} · ${product.category || "—"}`
    : "";

  const total = (product?.price_install || 0) + (product?.price_manufacture || 0);
  const hasBreakdown = (product?.price_manufacture || 0) > 0;

  return (
    <Modal
      titleId={titleId}
      onClose={saving ? () => {} : onClose}
      className="bg-white max-w-2xl w-full my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border-t-2 border-stone-900"
    >
      <div className="sticky top-0 bg-white border-b border-stone-300 px-4 sm:px-6 py-3 flex justify-between items-center gap-2 z-10">
        <div className="min-w-0">
          {headerSubtitle && (
            <p className="text-[10px] tracking-widest uppercase text-stone-500 font-mono">
              {headerSubtitle}
            </p>
          )}
          <h2
            id={titleId}
            className="font-serif text-lg sm:text-xl text-stone-900 leading-tight font-medium truncate"
          >
            {headerTitle}
          </h2>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!isCreate && mode === "view" && canEdit && (
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
                {saving ? "Đang lưu..." : isCreate ? "Tạo" : "Lưu"}
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

      {/* Shared datalist for category suggestions */}
      <datalist id={categoriesId}>
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

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
        {mode === "view" && product ? (
          <ProductView
            product={product}
            total={total}
            hasBreakdown={hasBreakdown}
            productOptions={productOptions}
            onAddToCart={() => {
              if (onAddToCart) onAddToCart(product);
              onClose();
            }}
          />
        ) : (
          <ProductEditForm
            draftProduct={draftProduct}
            setDraftProduct={setDraftProduct}
            draftOptions={draftOptions}
            setDraftOptions={setDraftOptions}
            onAddOption={addNewOption}
            onRemoveOption={removeOption}
            categoriesListId={categoriesId}
            disabled={saving}
            isCreate={isCreate}
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
// Edit / Create mode
// ---------------------------------------------------------------------------
function ProductEditForm({
  draftProduct,
  setDraftProduct,
  draftOptions,
  setDraftOptions,
  onAddOption,
  onRemoveOption,
  categoriesListId,
  disabled,
  isCreate,
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
            Tên sản phẩm <span className="text-red-700">*</span>
          </label>
          <input
            id="prod-name"
            type="text"
            value={draftProduct.name}
            onChange={(e) => setDraftProduct({ ...draftProduct, name: e.target.value })}
            placeholder="VD: Tủ Áo"
            className="w-full px-3 py-2 min-h-[44px] text-sm border border-stone-300 bg-white focus:outline-none focus-visible:bg-amber-50/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-800"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="prod-category"
              className="block text-[10px] tracking-widest uppercase text-stone-700 mb-1 font-medium"
            >
              Danh mục
            </label>
            <input
              id="prod-category"
              type="text"
              list={categoriesListId}
              value={draftProduct.category}
              onChange={(e) => setDraftProduct({ ...draftProduct, category: e.target.value })}
              placeholder="VD: Phòng ngủ"
              className="w-full px-3 py-2 min-h-[44px] text-sm border border-stone-300 bg-white focus:outline-none focus-visible:bg-amber-50/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-800"
            />
          </div>
          <div>
            <label
              htmlFor="prod-unit"
              className="block text-[10px] tracking-widest uppercase text-stone-700 mb-1 font-medium"
            >
              Đơn vị tính {isCreate && <span className="text-red-700">*</span>}
            </label>
            <input
              id="prod-unit"
              type="text"
              value={draftProduct.unit}
              onChange={(e) => setDraftProduct({ ...draftProduct, unit: e.target.value })}
              placeholder="VD: M2, MD, Cái"
              className="w-full px-3 py-2 min-h-[44px] text-sm border border-stone-300 bg-white focus:outline-none focus-visible:bg-amber-50/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="prod-install"
              className="block text-[10px] tracking-widest uppercase text-stone-700 mb-1 font-medium"
            >
              Giá lắp đặt (đ{draftProduct.unit ? ` / ${draftProduct.unit}` : ""})
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
              Giá sản xuất (đ{draftProduct.unit ? ` / ${draftProduct.unit}` : ""})
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
        <div className="flex items-center justify-between">
          <legend className="text-[10px] tracking-widest uppercase text-stone-700 font-medium inline-flex items-center gap-1">
            <Sparkles aria-hidden="true" className="w-3 h-3 text-amber-800" />
            Tùy chọn ({draftOptions.length})
          </legend>
          <button
            type="button"
            onClick={onAddOption}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] border border-stone-300 text-stone-800 text-[11px] tracking-wider uppercase hover:bg-stone-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-1"
          >
            <Plus aria-hidden="true" className="w-3 h-3" /> Thêm tùy chọn
          </button>
        </div>
        {draftOptions.length === 0 ? (
          <p className="text-sm text-stone-500 italic">
            Chưa có tùy chọn. Bấm "Thêm tùy chọn" để tạo.
          </p>
        ) : (
          <div className="space-y-3 border-y border-stone-200 py-3">
            {draftOptions.map((o, idx) => {
              const isNew = String(o.option_id).startsWith(NEW_OPTION_PREFIX);
              return (
                <div
                  key={o.option_id}
                  className="space-y-2 pb-2 border-b border-stone-200/60 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
                      {isNew ? "Tùy chọn mới" : o.option_id}
                    </p>
                    {isNew && (
                      <button
                        type="button"
                        onClick={() => onRemoveOption(idx)}
                        aria-label="Xóa tùy chọn mới này"
                        className="inline-flex items-center justify-center w-7 h-7 text-stone-500 hover:text-red-800 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-1"
                      >
                        <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr,140px] gap-2">
                    <input
                      type="text"
                      value={o.option_name}
                      onChange={(e) => updateOption(idx, { option_name: e.target.value })}
                      aria-label={`Tên tùy chọn`}
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
                        aria-label="Giá phụ thu"
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
              );
            })}
          </div>
        )}
      </fieldset>
    </form>
  );
}
