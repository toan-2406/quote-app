import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Archive,
  ChevronDown,
  FileText,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  Trash2,
  User,
  X,
} from "lucide-react";

import ConnectionBadge from "./components/ConnectionBadge";
import ProductCard from "./components/ProductCard";
import ProductDetailModal from "./components/ProductDetailModal";
import CartItem from "./components/CartItem";
import SettingsModal from "./components/SettingsModal";
import QuoteSummaryModal from "./components/QuoteSummaryModal";
import SavedQuotesModal from "./components/SavedQuotesModal";

import { useDebounce } from "./hooks/useDebounce";
import { useMediaQuery } from "./hooks/useMediaQuery";

import {
  CART_STORAGE_KEY,
  CUSTOMER_STORAGE_KEY,
  DEFAULT_SCRIPT_URL,
  MOBILE_BREAKPOINT_QUERY,
  QUOTE_NOTE_MAX_LENGTH,
  QUOTE_NOTE_STORAGE_KEY,
  QUOTE_TYPES,
  QUOTE_TYPE_STORAGE_KEY,
  STORAGE_KEY,
} from "./lib/constants";
import {
  buildOptionsBySku,
  buildOptionsMap,
  buildProductsMap,
  computeEffectiveOptionPrice,
  computeEffectiveUnitPrice,
  formatVND,
  normalizeOptions,
  normalizeProducts,
} from "./lib/helpers";
import { storage } from "./lib/storage";

const TOAST_TIMEOUT_MS = 1800;

export default function QuoteApp() {
  const [products, setProducts] = useState([]);
  const [options, setOptions] = useState([]);
  const [scriptUrl, setScriptUrl] = useState(DEFAULT_SCRIPT_URL);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [lastFetch, setLastFetch] = useState(null);

  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 200);

  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [showSummary, setShowSummary] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSavedQuotes, setShowSavedQuotes] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [mobileTab, setMobileTab] = useState("catalog");
  const [defaultQuoteType, setDefaultQuoteType] = useState("both");
  const [savedQuoteInfo, setSavedQuoteInfo] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [customerExpandedMobile, setCustomerExpandedMobile] = useState(false);
  const [quoteNote, setQuoteNote] = useState("");

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const [cartBumpKey, setCartBumpKey] = useState(0);

  // Tracks whether cart/customer/defaultQuoteType have been loaded from storage.
  // Persistence effects below skip writes until hydration completes so the
  // initial empty defaults don't overwrite the user's saved data on first render.
  const [hydrated, setHydrated] = useState(false);

  const isMobile = useMediaQuery(MOBILE_BREAKPOINT_QUERY);
  const abortRef = useRef(null);

  const productsMap = useMemo(() => buildProductsMap(products), [products]);
  const optionsMap = useMemo(() => buildOptionsMap(options), [options]);
  const optionsBySku = useMemo(() => buildOptionsBySku(options), [options]);

  const showToast = useCallback((message) => {
    setToast({ id: Date.now(), message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_TIMEOUT_MS);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  // Hydrate cart, customer, defaultQuoteType, quoteNote from localStorage on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cartStored, customerStored, typeStored, noteStored] = await Promise.all([
          storage.get(CART_STORAGE_KEY),
          storage.get(CUSTOMER_STORAGE_KEY),
          storage.get(QUOTE_TYPE_STORAGE_KEY),
          storage.get(QUOTE_NOTE_STORAGE_KEY),
        ]);
        if (cancelled) return;
        if (cartStored?.value) {
          const parsed = JSON.parse(cartStored.value);
          if (Array.isArray(parsed)) setCart(parsed);
        }
        if (customerStored?.value) {
          const parsed = JSON.parse(customerStored.value);
          if (parsed && typeof parsed === "object") {
            setCustomer({
              name: parsed.name || "",
              phone: parsed.phone || "",
              address: parsed.address || "",
            });
          }
        }
        if (typeStored?.value) {
          const allowed = QUOTE_TYPES.map((q) => q.value);
          if (allowed.includes(typeStored.value)) setDefaultQuoteType(typeStored.value);
        }
        if (noteStored?.value && typeof noteStored.value === "string") {
          setQuoteNote(noteStored.value.slice(0, QUOTE_NOTE_MAX_LENGTH));
        }
      } catch {
        // Storage unavailable or corrupted — fall back to defaults.
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist cart on change (post-hydration).
  useEffect(() => {
    if (!hydrated) return;
    storage.set(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  // Persist customer info on change (post-hydration).
  useEffect(() => {
    if (!hydrated) return;
    storage.set(CUSTOMER_STORAGE_KEY, JSON.stringify(customer));
  }, [customer, hydrated]);

  // Persist default quote type on change (post-hydration).
  useEffect(() => {
    if (!hydrated) return;
    storage.set(QUOTE_TYPE_STORAGE_KEY, defaultQuoteType);
  }, [defaultQuoteType, hydrated]);

  // Persist quote note on change (post-hydration).
  useEffect(() => {
    if (!hydrated) return;
    storage.set(QUOTE_NOTE_STORAGE_KEY, quoteNote);
  }, [quoteNote, hydrated]);

  const fetchSheetData = useCallback(async (url) => {
    if (!url) {
      setConnectionStatus("demo");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setConnectionStatus("connecting");
    try {
      const res = await fetch(`${url}?action=getAll`, { signal: controller.signal });
      const data = await res.json();
      if (data.ok && Array.isArray(data.products)) {
        setProducts(normalizeProducts(data.products));
        setOptions(normalizeOptions(data.options || []));
        setConnectionStatus("connected");
        setLastFetch(new Date());
      } else {
        setConnectionStatus("error");
      }
    } catch (e) {
      if (e.name === "AbortError") return;
      setConnectionStatus("error");
    }
  }, []);

  useEffect(() => {
    (async () => {
      let urlToUse = DEFAULT_SCRIPT_URL;
      try {
        const stored = await storage.get(STORAGE_KEY);
        if (stored?.value) urlToUse = stored.value;
      } catch {}
      setScriptUrl(urlToUse);
      fetchSheetData(urlToUse);
    })();
    return () => abortRef.current?.abort();
  }, [fetchSheetData]);

  const handleSaveSettings = useCallback(async (url, initialData) => {
    try {
      await storage.set(STORAGE_KEY, url);
    } catch {}
    setScriptUrl(url);
    if (initialData?.products) {
      setProducts(normalizeProducts(initialData.products));
      setOptions(normalizeOptions(initialData.options || []));
      setConnectionStatus("connected");
      setLastFetch(new Date());
    }
    setShowSettings(false);
  }, []);

  const handleDisconnect = useCallback(async () => {
    try {
      await storage.delete(STORAGE_KEY);
    } catch {}
    setScriptUrl("");
    setProducts([]);
    setOptions([]);
    setConnectionStatus("demo");
    setShowSettings(false);
  }, []);

  const CATEGORIES = useMemo(
    () => ["Tất cả", ...Array.from(new Set(products.map((p) => p.category)))],
    [products],
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = activeCategory === "Tất cả" || p.category === activeCategory;
      const matchSearch =
        !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [activeCategory, search, products]);

  const addToCart = useCallback(
    (product) => {
      const initialType = product.price_manufacture > 0 ? defaultQuoteType : "install";
      let merged = false;
      setCart((prev) => {
        // Merge by SKU: bumping qty on the existing line preserves the user's
        // overrides (quoteType, unitPriceOverride, optionPriceOverrides,
        // selectedOptions) instead of creating a duplicate row.
        const idx = prev.findIndex((it) => it.sku === product.sku);
        if (idx >= 0) {
          merged = true;
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            qty: parseFloat((next[idx].qty + 1).toFixed(2)),
          };
          return next;
        }
        return [
          ...prev,
          {
            id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            sku: product.sku,
            qty: 1,
            selectedOptions: [],
            quoteType: initialType,
            unitPriceOverride: null,
            optionPriceOverrides: {},
          },
        ];
      });
      setSavedQuoteInfo(null);
      setCartBumpKey((k) => k + 1);
      showToast(merged ? `Đã +1: ${product.name}` : `Đã thêm: ${product.name}`);
    },
    [defaultQuoteType, showToast],
  );

  const applyTypeToAll = useCallback(
    (type) => {
      setDefaultQuoteType(type);
      setCart((prev) =>
        prev.map((it) => {
          const p = productsMap.get(it.sku);
          if (p && p.price_manufacture === 0) return { ...it, quoteType: "install" };
          return { ...it, quoteType: type };
        }),
      );
    },
    [productsMap],
  );

  const updateCartItem = useCallback((id, patch) => {
    setCart((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    setSavedQuoteInfo(null);
  }, []);

  const removeCartItem = useCallback((id) => {
    setCart((prev) => prev.filter((it) => it.id !== id));
    setSavedQuoteInfo(null);
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setQuoteNote("");
    setSavedQuoteInfo(null);
  }, []);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const p = productsMap.get(item.sku);
      if (!p) return sum;
      const base = computeEffectiveUnitPrice(item, p) * item.qty;
      const opts =
        item.selectedOptions.reduce((s, oid) => {
          const o = optionsMap.get(oid);
          return s + computeEffectiveOptionPrice(item, o);
        }, 0) * item.qty;
      return sum + base + opts;
    }, 0);
  }, [cart, productsMap, optionsMap]);

  const handleSaveQuoteToSheet = useCallback(async () => {
    if (!scriptUrl) return;
    setSaveError(null);
    try {
      const res = await fetch(scriptUrl, {
        method: "POST",
        body: JSON.stringify({
          action: "saveQuote",
          quote: {
            customer_name: customer.name,
            customer_phone: customer.phone,
            customer_address: customer.address,
            items: cart,
            total: cartTotal,
            note: quoteNote,
            status: "draft",
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSavedQuoteInfo(data);
      } else {
        setSaveError(data.error);
      }
    } catch (e) {
      setSaveError(e.message);
    }
  }, [scriptUrl, customer, cart, cartTotal, quoteNote]);

  const goToCart = useCallback(() => {
    setMobileTab("cart");
    setToast(null);
  }, []);

  // Persist product + options edits back to the Sheet, then refresh local
  // products/options from source so subsequent renders pick up the new values.
  const handleUpdateProductAndOptions = useCallback(
    async ({ product, options }) => {
      if (!scriptUrl) throw new Error("Chưa kết nối với Google Sheet.");
      const res = await fetch(scriptUrl, {
        method: "POST",
        body: JSON.stringify({
          action: "updateProductAndOptions",
          product,
          options,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Cập nhật thất bại.");
      // Refetch in background so the catalog reflects new values.
      fetchSheetData(scriptUrl);
      return data;
    },
    [scriptUrl, fetchSheetData],
  );

  return (
    <div className="min-h-screen pb-12 bg-[#FAF7F2]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-stone-900 focus:text-amber-50 focus:px-4 focus:py-2 focus:text-xs focus:tracking-widest focus:uppercase"
      >
        Bỏ qua điều hướng
      </a>

      {/* Header — NOT sticky anymore */}
      <header className="border-b border-stone-200 bg-white print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              aria-hidden="true"
              className="w-10 h-10 bg-stone-900 flex items-center justify-center shrink-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
            >
              <span className="font-serif text-amber-50 text-xl font-medium">N</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-serif text-lg sm:text-xl text-stone-900 leading-none font-medium truncate">
                Nội Thất Khoán
              </h1>
              <p className="hidden sm:block text-[10px] tracking-[0.2em] uppercase text-stone-600 mt-1 font-medium">
                Hệ thống báo giá tự động
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="hidden md:inline text-xs text-stone-700">
              {products.length} hạng mục
            </span>
            {connectionStatus === "connected" && (
              <button
                type="button"
                onClick={() => fetchSheetData(scriptUrl)}
                aria-label="Tải lại dữ liệu từ Google Sheet"
                className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] text-stone-600 hover:text-stone-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
              >
                <RefreshCw aria-hidden="true" className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowSavedQuotes(true)}
              aria-label="Xem đơn hàng đã lưu"
              disabled={connectionStatus !== "connected"}
              className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] text-stone-600 hover:text-stone-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Đơn hàng đã lưu"
            >
              <Archive aria-hidden="true" className="w-4 h-4" />
            </button>
            <div aria-live="polite" className="hidden sm:block">
              <ConnectionBadge status={connectionStatus} onClick={() => setShowSettings(true)} />
            </div>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              aria-label={
                connectionStatus === "connected"
                  ? "Mở cài đặt — đã kết nối"
                  : connectionStatus === "error"
                  ? "Mở cài đặt — lỗi kết nối"
                  : "Mở cài đặt kết nối Google Sheet"
              }
              className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] text-stone-600 hover:text-stone-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
            >
              <Settings aria-hidden="true" className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="sm:hidden border-t border-stone-200 px-4 py-2 flex items-center justify-between bg-white">
          <span className="text-xs text-stone-700">{products.length} hạng mục</span>
          <div aria-live="polite">
            <ConnectionBadge status={connectionStatus} onClick={() => setShowSettings(true)} />
          </div>
        </div>
      </header>

      {/* Mobile tabs — STICKY now */}
      <div
        role="tablist"
        aria-label="Chế độ xem"
        className="lg:hidden sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur print:hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "catalog"}
            aria-controls="catalog-panel"
            id="catalog-tab"
            onClick={() => setMobileTab("catalog")}
            className={`flex-1 py-3 min-h-[48px] text-xs tracking-widest uppercase border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-inset ${
              mobileTab === "catalog"
                ? "border-stone-900 text-stone-900 font-medium"
                : "border-transparent text-stone-600"
            }`}
          >
            Danh mục
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "cart"}
            aria-controls="cart-panel"
            id="cart-tab"
            onClick={() => setMobileTab("cart")}
            className={`flex-1 py-3 min-h-[48px] text-xs tracking-widest uppercase border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-inset ${
              mobileTab === "cart"
                ? "border-stone-900 text-stone-900 font-medium"
                : "border-transparent text-stone-600"
            }`}
          >
            Báo giá
            <span aria-live="polite" aria-atomic="true" className="inline-block ml-1">
              {cart.length > 0 && (
                <span
                  key={cartBumpKey}
                  className="text-amber-800 cart-bump inline-block tabular-nums"
                >
                  ({cart.length})
                </span>
              )}
            </span>
          </button>
        </div>
      </div>

      <div
        id="main-content"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid lg:grid-cols-[1fr_420px] gap-6 lg:gap-8"
      >
        <main
          id="catalog-panel"
          role="tabpanel"
          aria-labelledby="catalog-tab"
          className={mobileTab !== "catalog" ? "hidden lg:block" : ""}
        >
          <div className="mb-8 grid grid-cols-12 gap-4 items-end">
            <div className="col-span-12 lg:col-span-8">
              <p className="text-[11px] tracking-[0.25em] uppercase text-amber-900 mb-2 font-medium">
                No. {String(products.length).padStart(3, "0")} — Bảng báo giá thi công
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-stone-900 leading-[1.05] tracking-tight font-medium">
                Chọn hạng mục
                <br />
                <em className="italic font-normal text-amber-900">để dựng báo giá</em>
              </h2>
            </div>
            <div
              className="col-span-12 lg:col-span-4 lg:border-l lg:border-stone-300 lg:pl-6 text-xs"
              role="status"
              aria-live="polite"
            >
              {connectionStatus === "connected" ? (
                <p className="text-stone-700">
                  Đang đồng bộ với Google Sheet
                  {lastFetch && (
                    <span className="block text-stone-600 font-mono mt-1">
                      Cập nhật {lastFetch.toLocaleTimeString("vi-VN")}
                    </span>
                  )}
                </p>
              ) : connectionStatus === "error" ? (
                <div className="text-stone-900">
                  <p className="mb-2">Lỗi kết nối Google Sheet.</p>
                  <button
                    type="button"
                    onClick={() => fetchSheetData(scriptUrl)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] border border-stone-900 text-stone-900 text-[11px] tracking-wider uppercase hover:bg-stone-900 hover:text-amber-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
                  >
                    <RefreshCw aria-hidden="true" className="w-3 h-3" /> Thử lại
                  </button>
                </div>
              ) : connectionStatus === "connecting" ? (
                <p className="text-stone-700">Đang tải dữ liệu…</p>
              ) : (
                <p className="text-stone-700">
                  Chưa liên kết Google Sheet.{" "}
                  <button
                    type="button"
                    onClick={() => setShowSettings(true)}
                    className="underline underline-offset-2 hover:text-stone-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 rounded-sm"
                  >
                    Cấu hình ngay
                  </button>
                </p>
              )}
            </div>
          </div>

          <div className="relative mb-5">
            <label htmlFor="catalog-search" className="sr-only">
              Tìm sản phẩm hoặc mã SKU
            </label>
            <Search
              aria-hidden="true"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none"
            />
            <input
              id="catalog-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm sản phẩm hoặc mã SKU…"
              className="w-full pl-11 pr-12 py-3 min-h-[48px] bg-white border border-stone-300 focus:outline-none focus-visible:border-amber-800 focus-visible:ring-2 focus-visible:ring-amber-800/30 text-sm placeholder:text-stone-500"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center min-w-[40px] min-h-[40px] text-stone-600 hover:text-stone-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 rounded-sm"
              >
                <X aria-hidden="true" className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <nav aria-label="Danh mục sản phẩm" className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={activeCategory === cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-2 min-h-[40px] text-xs tracking-wider uppercase border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F2] ${
                    activeCategory === cat
                      ? "bg-stone-900 text-amber-50 border-stone-900 font-medium"
                      : "bg-transparent text-stone-700 border-stone-400 hover:border-stone-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => setShowCreateProduct(true)}
              disabled={connectionStatus !== "connected"}
              aria-label="Thêm sản phẩm mới vào danh mục"
              title={connectionStatus !== "connected" ? "Cần kết nối Google Sheet" : "Thêm sản phẩm mới"}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] bg-amber-800 text-amber-50 text-xs tracking-wider uppercase font-medium hover:bg-amber-900 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F2]"
            >
              <Plus aria-hidden="true" className="w-3.5 h-3.5" /> Sản phẩm mới
            </button>
          </div>

          {connectionStatus === "connecting" ? (
            <div className="text-center py-16">
              <Loader2
                aria-hidden="true"
                className="w-6 h-6 text-stone-500 mx-auto animate-spin mb-3"
              />
              <p className="text-xs tracking-wider uppercase text-stone-600 font-medium">
                Đang tải dữ liệu từ Google Sheet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-4">
              {filteredProducts.map((p) => (
                <ProductCard
                  key={p.sku}
                  product={p}
                  optionsCount={(optionsBySku.get(p.sku) || []).length}
                  onAdd={addToCart}
                  onOpenDetail={setDetailProduct}
                />
              ))}
            </div>
          )}
          {filteredProducts.length === 0 && connectionStatus !== "connecting" && (
            <div className="text-center py-16 text-stone-600 text-sm">
              Không tìm thấy sản phẩm phù hợp
            </div>
          )}
        </main>

        <aside
          id="cart-panel"
          role="tabpanel"
          aria-labelledby="cart-tab"
          aria-label="Báo giá hiện tại"
          className={mobileTab !== "cart" ? "hidden lg:block" : ""}
        >
          <div className="lg:sticky lg:top-24 bg-[#FDFCF8] border border-stone-300 shadow-sm border-l-2 border-l-amber-800/60">
            <div className="px-5 py-4 border-b border-stone-300">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-serif text-xl text-stone-900 inline-flex items-center gap-2 font-medium">
                  <ShoppingBag aria-hidden="true" className="w-4 h-4" />
                  Báo giá
                </h3>
                <span className="text-xs text-stone-700" aria-live="polite">
                  {cart.length} hạng mục
                </span>
              </div>
            </div>

            <div className="px-5 py-3 border-b border-stone-300 bg-amber-50/60">
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <span
                  id="default-quote-type-label"
                  className="text-[11px] tracking-widest uppercase text-stone-800 font-medium"
                >
                  Loại báo giá mặc định
                </span>
                {cart.length > 0 && (
                  <span className="text-[11px] text-stone-700 italic">
                    Áp dụng cho {cart.length} hạng mục
                  </span>
                )}
              </div>
              <div
                role="radiogroup"
                aria-labelledby="default-quote-type-label"
                className="flex gap-0 border border-amber-800/30 bg-white"
              >
                {QUOTE_TYPES.map((qt) => {
                  const isActive = defaultQuoteType === qt.value;
                  return (
                    <button
                      key={qt.value}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => applyTypeToAll(qt.value)}
                      className={`flex-1 py-2.5 min-h-[44px] text-xs tracking-wider uppercase transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-inset ${
                        isActive
                          ? "bg-amber-900 text-amber-50 font-medium"
                          : "text-stone-800 hover:bg-amber-50"
                      }`}
                    >
                      {qt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-stone-700 italic mt-1.5 leading-snug">
                * Hạng mục chỉ có Lắp đặt sẽ luôn dùng "Lắp đặt"
              </p>
            </div>

            <div className="border-b border-stone-300 bg-white/40">
              {/* Mobile-only summary trigger (collapsed by default) */}
              <div className="lg:hidden">
                {!customerExpandedMobile && (
                  <button
                    type="button"
                    onClick={() => setCustomerExpandedMobile(true)}
                    aria-expanded={false}
                    aria-controls="customer-form-region"
                    className="w-full flex items-center gap-3 px-5 py-3 min-h-[52px] text-left hover:bg-amber-50/40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-inset"
                  >
                    <User aria-hidden="true" className="w-4 h-4 text-stone-500 shrink-0" />
                    {customer.name || customer.phone || customer.address ? (
                      <span className="flex-1 min-w-0 text-sm text-stone-900 truncate">
                        {[customer.name, customer.phone].filter(Boolean).join(" · ") ||
                          customer.address}
                      </span>
                    ) : (
                      <span className="flex-1 min-w-0 text-sm text-stone-600 italic">
                        Thêm thông tin khách hàng
                      </span>
                    )}
                    <Pencil aria-hidden="true" className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  </button>
                )}
              </div>

              {/* Form region — always visible on lg, conditionally on mobile */}
              <div
                id="customer-form-region"
                role="region"
                aria-label="Thông tin khách hàng"
                className={`px-5 py-3 space-y-2 ${
                  customerExpandedMobile ? "block" : "hidden lg:block"
                }`}
              >
                <div className="lg:hidden flex items-center justify-between -mt-1 mb-1">
                  <span className="text-[11px] tracking-widest uppercase text-stone-700 font-medium">
                    Khách hàng
                  </span>
                  <button
                    type="button"
                    onClick={() => setCustomerExpandedMobile(false)}
                    aria-label="Thu gọn thông tin khách hàng"
                    aria-expanded={true}
                    aria-controls="customer-form-region"
                    className="inline-flex items-center justify-center w-9 h-9 -mr-2 text-stone-500 hover:text-stone-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800"
                  >
                    <ChevronDown aria-hidden="true" className="w-4 h-4 rotate-180" />
                  </button>
                </div>
                <div className="relative">
                  <label htmlFor="customer-name" className="sr-only">
                    Tên khách hàng
                  </label>
                  <User
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500 pointer-events-none"
                  />
                  <input
                    id="customer-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Tên khách hàng"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 min-h-[44px] bg-white border border-stone-300 text-sm focus:outline-none focus-visible:border-amber-800 focus-visible:ring-2 focus-visible:ring-amber-800/30"
                  />
                </div>
                <div className="relative">
                  <label htmlFor="customer-phone" className="sr-only">
                    Số điện thoại khách hàng
                  </label>
                  <Phone
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500 pointer-events-none"
                  />
                  <input
                    id="customer-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Số điện thoại"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 min-h-[44px] bg-white border border-stone-300 text-sm focus:outline-none focus-visible:border-amber-800 focus-visible:ring-2 focus-visible:ring-amber-800/30 font-mono"
                  />
                </div>
                <div className="relative">
                  <label htmlFor="customer-address" className="sr-only">
                    Địa chỉ công trình
                  </label>
                  <MapPin
                    aria-hidden="true"
                    className="absolute left-3 top-3 w-3.5 h-3.5 text-stone-500 pointer-events-none"
                  />
                  <input
                    id="customer-address"
                    type="text"
                    autoComplete="street-address"
                    placeholder="Địa chỉ công trình"
                    value={customer.address}
                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 min-h-[44px] bg-white border border-stone-300 text-sm focus:outline-none focus-visible:border-amber-800 focus-visible:ring-2 focus-visible:ring-amber-800/30"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 pb-2 lg:pb-0 lg:max-h-[420px] lg:overflow-y-auto">
              {cart.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-serif italic text-stone-700 text-lg leading-snug">
                    "Một báo giá đẹp bắt đầu từ hạng mục đầu tiên."
                  </p>
                  <p className="text-[11px] text-stone-600 mt-3 tracking-wider uppercase">
                    Chưa có hạng mục
                  </p>
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setMobileTab("catalog")}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] border border-stone-900 text-stone-900 text-[11px] tracking-wider uppercase hover:bg-stone-900 hover:text-amber-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
                    >
                      Chọn hạng mục
                    </button>
                  )}
                </div>
              ) : (
                cart.map((item) => {
                  const product = productsMap.get(item.sku);
                  if (!product) return null;
                  return (
                    <CartItem
                      key={item.id}
                      item={item}
                      product={product}
                      productOptions={optionsBySku.get(product.sku) || []}
                      optionsMap={optionsMap}
                      onChange={updateCartItem}
                      onRemove={removeCartItem}
                    />
                  );
                })
              )}
            </div>

            {cart.length > 0 && (
              <>
                {/* Quote note — visible on both mobile (above sticky bar) and desktop */}
                <div className="px-4 lg:px-5 py-3 border-t border-stone-200/80 bg-white/40">
                  <label
                    htmlFor="quote-note-input"
                    className="flex items-center justify-between text-[10px] lg:text-[11px] tracking-widest uppercase text-stone-700 font-medium mb-1.5"
                  >
                    <span>📝 Ghi chú hóa đơn</span>
                    <span
                      aria-live="polite"
                      className={`font-mono text-[10px] ${
                        quoteNote.length >= QUOTE_NOTE_MAX_LENGTH
                          ? "text-amber-800"
                          : "text-stone-500"
                      }`}
                    >
                      {quoteNote.length} / {QUOTE_NOTE_MAX_LENGTH}
                    </span>
                  </label>
                  <textarea
                    id="quote-note-input"
                    value={quoteNote}
                    onChange={(e) =>
                      setQuoteNote(e.target.value.slice(0, QUOTE_NOTE_MAX_LENGTH))
                    }
                    maxLength={QUOTE_NOTE_MAX_LENGTH}
                    rows={3}
                    placeholder="VD: Giao trước Tết. Bao gồm vận chuyển HCM → ĐN."
                    className="w-full px-3 py-2 text-xs font-sans bg-white border border-stone-300 resize-y focus:outline-none focus-visible:bg-amber-50/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-800"
                  />
                </div>

                <div className="hidden lg:block px-5 py-4 border-t border-stone-300 bg-white/60">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] tracking-widest uppercase text-stone-700 font-medium">
                      Tổng cộng
                    </span>
                    <span className="font-serif text-2xl text-stone-900 font-medium">
                      {formatVND(cartTotal)}{" "}
                      <span className="text-sm text-stone-600 font-normal">đ</span>
                    </span>
                  </div>
                </div>
                {saveError && (
                  <div
                    role="alert"
                    className="hidden lg:flex px-5 py-2 bg-amber-50 border-t border-amber-700/30 text-xs text-stone-900 items-start gap-2"
                  >
                    <AlertCircle
                      aria-hidden="true"
                      className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-800"
                    />
                    <span>Không lưu được: {saveError}</span>
                  </div>
                )}
                <div className="hidden lg:flex p-5 flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={clearCart}
                    className="px-4 py-2.5 min-h-[44px] text-[11px] tracking-wider uppercase text-stone-700 hover:text-red-800 border border-stone-300 hover:border-red-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
                  >
                    Xóa hết
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSummary(true);
                      setSaveError(null);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] bg-stone-900 text-amber-50 text-xs tracking-widest uppercase hover:bg-amber-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
                  >
                    <FileText aria-hidden="true" className="w-3.5 h-3.5" /> Xuất báo giá
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Bottom-fixed action bar — mobile + cart tab + items only */}
      {mobileTab === "cart" && cart.length > 0 && (
        <div
          role="region"
          aria-label="Tổng tiền và hành động báo giá"
          className="fixed inset-x-0 bottom-0 z-40 lg:hidden print:hidden border-t border-stone-300 bg-[#FDFCF8]/95 backdrop-blur shadow-[0_-8px_24px_rgba(0,0,0,0.10)]"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {saveError && (
            <div
              role="alert"
              className="px-4 py-1.5 bg-amber-50 border-b border-amber-700/30 text-[11px] text-stone-900 flex items-start gap-1.5"
            >
              <AlertCircle
                aria-hidden="true"
                className="w-3 h-3 shrink-0 mt-0.5 text-amber-800"
              />
              <span className="truncate">Không lưu được: {saveError}</span>
            </div>
          )}
          <div className="px-4 py-2.5 flex items-center gap-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] tracking-widest uppercase text-stone-600 font-medium leading-none">
                Tổng cộng · {cart.length} hạng mục
              </p>
              <p className="font-serif text-xl text-stone-900 font-medium tabular-nums leading-tight mt-0.5">
                {formatVND(cartTotal)}
                <span className="text-xs text-stone-600 font-normal ml-1">đ</span>
              </p>
            </div>
            <button
              type="button"
              onClick={clearCart}
              aria-label="Xóa hết hạng mục"
              className="inline-flex items-center justify-center w-11 h-11 text-stone-600 hover:text-red-800 border border-stone-300 hover:border-red-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFCF8] shrink-0"
            >
              <Trash2 aria-hidden="true" className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSummary(true);
                setSaveError(null);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-stone-900 text-amber-50 text-xs tracking-widest uppercase font-medium hover:bg-amber-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFCF8] shrink-0"
            >
              <FileText aria-hidden="true" className="w-3.5 h-3.5" />
              Xuất báo giá
            </button>
          </div>
        </div>
      )}

      {/* Toast — fixed bottom, mobile-only, dismisses tab-switch FOMO */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed left-1/2 -translate-x-1/2 z-50 lg:hidden print:hidden max-w-[90vw] ${
            mobileTab === "cart" && cart.length > 0 ? "bottom-[92px]" : "bottom-4"
          }`}
        >
          <button
            type="button"
            onClick={goToCart}
            className="inline-flex items-center gap-2 px-4 py-3 min-h-[48px] bg-stone-900 text-amber-50 text-xs tracking-wider uppercase shadow-[0_8px_30px_rgba(0,0,0,0.3)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 toast-pop"
          >
            <Plus aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[55vw]">{toast.message}</span>
            <span className="ml-2 px-2 py-0.5 bg-amber-50 text-stone-900 text-[10px] font-mono tracking-wider rounded-sm">
              {cart.length}
            </span>
            <span aria-hidden="true" className="ml-1 text-amber-200">
              →
            </span>
            <span className="sr-only">Mở giỏ báo giá</span>
          </button>
        </div>
      )}

      {detailProduct && (() => {
        // Look up the live product from productsMap so the modal reflects
        // the latest values after a save+refetch. If the SKU was removed
        // upstream, fall back to the snapshot so the modal can still close.
        const liveProduct = productsMap.get(detailProduct.sku) || detailProduct;
        return (
          <ProductDetailModal
            product={liveProduct}
            productOptions={optionsBySku.get(liveProduct.sku) || []}
            canEdit={connectionStatus === "connected"}
            categories={CATEGORIES.filter((c) => c !== "Tất cả")}
            onClose={() => setDetailProduct(null)}
            onAddToCart={addToCart}
            onSave={handleUpdateProductAndOptions}
          />
        );
      })()}

      {showCreateProduct && (
        <ProductDetailModal
          product={null}
          productOptions={[]}
          canEdit={connectionStatus === "connected"}
          isCreate
          categories={CATEGORIES.filter((c) => c !== "Tất cả")}
          onClose={() => setShowCreateProduct(false)}
          onSave={handleUpdateProductAndOptions}
        />
      )}

      {showSummary && (
        <QuoteSummaryModal
          items={cart}
          customer={customer}
          note={quoteNote}
          productsMap={productsMap}
          optionsMap={optionsMap}
          onClose={() => setShowSummary(false)}
          onSaveToSheet={handleSaveQuoteToSheet}
          isLive={connectionStatus === "connected"}
          savedInfo={savedQuoteInfo}
        />
      )}

      {showSettings && (
        <SettingsModal
          currentUrl={scriptUrl}
          onSave={handleSaveSettings}
          onDisconnect={handleDisconnect}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showSavedQuotes && (
        <SavedQuotesModal
          scriptUrl={scriptUrl}
          productsMap={productsMap}
          isLive={connectionStatus === "connected"}
          onClose={() => setShowSavedQuotes(false)}
        />
      )}
    </div>
  );
}
