const VND_FORMATTER = new Intl.NumberFormat("vi-VN");

export const formatVND = (n) => {
  if (!n && n !== 0) return "0";
  return VND_FORMATTER.format(Math.round(n));
};

export const computeUnitPrice = (product, quoteType) => {
  if (!product) return 0;
  if (quoteType === "install") return product.price_install;
  if (quoteType === "manufacture") return product.price_manufacture;
  return product.price_install + product.price_manufacture;
};

export const normalizeProducts = (raw) =>
  raw.map((p) => ({
    ...p,
    price_install:
      typeof p.price_install === "string"
        ? parseFloat(p.price_install) || 0
        : p.price_install || 0,
    price_manufacture:
      typeof p.price_manufacture === "string"
        ? parseFloat(p.price_manufacture) || 0
        : p.price_manufacture || 0,
  }));

export const normalizeOptions = (raw) =>
  raw.map((o) => ({
    ...o,
    extra_price:
      typeof o.extra_price === "string"
        ? parseFloat(o.extra_price) || 0
        : o.extra_price || 0,
    is_free: o.is_free === true || o.is_free === "TRUE" || o.is_free === "true",
  }));

export const buildOptionsBySku = (options) => {
  const map = new Map();
  for (const opt of options) {
    if (!map.has(opt.sku)) map.set(opt.sku, []);
    map.get(opt.sku).push(opt);
  }
  return map;
};

export const buildOptionsMap = (options) => {
  const m = new Map();
  for (const o of options) m.set(o.option_id, o);
  return m;
};

export const buildProductsMap = (products) => {
  const m = new Map();
  for (const p of products) m.set(p.sku, p);
  return m;
};

export const normalizeVietnamesePhone = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("84")) return digits;
  if (digits.startsWith("0")) return "84" + digits.slice(1);
  return digits;
};

const DIVIDER = "━━━━━━━━━━━━━━━";

export const buildZaloQuoteMessage = ({
  quoteId,
  today,
  customer,
  lineItems,
  grandTotal,
  brandName = "Nội Thất Khoán",
  validityDays = 30,
}) => {
  const date = today.toLocaleDateString("vi-VN");
  const lines = [];

  lines.push("📋 BÁO GIÁ THI CÔNG NỘI THẤT");
  lines.push(`Mã: ${quoteId}`);
  lines.push(`Ngày: ${date}`);
  lines.push("");

  const hasCustomer = customer?.name || customer?.phone || customer?.address;
  if (hasCustomer) {
    if (customer.name) lines.push(`👤 Khách hàng: ${customer.name}`);
    if (customer.phone) lines.push(`📞 SĐT: ${customer.phone}`);
    if (customer.address) lines.push(`📍 Địa chỉ: ${customer.address}`);
    lines.push("");
  }

  lines.push(DIVIDER);
  lines.push(`CHI TIẾT (${lineItems.length} hạng mục)`);
  lines.push(DIVIDER);

  lineItems.forEach((li, idx) => {
    lines.push(`${idx + 1}. ${li.product.name}`);
    lines.push(
      `   ${li.item.qty} ${li.product.unit} × ${formatVND(li.unitPrice)}đ = ${formatVND(
        li.subtotal,
      )}đ`,
    );
    if (li.selectedOpts && li.selectedOpts.length > 0) {
      li.selectedOpts.forEach((o) => {
        const extra = !o.is_free ? ` (+${formatVND(o.extra_price)}đ)` : " (miễn phí)";
        lines.push(`   + ${o.option_name}${extra}`);
      });
    }
  });

  lines.push("");
  lines.push(DIVIDER);
  lines.push(`💰 TỔNG CỘNG: ${formatVND(grandTotal)}đ`);
  lines.push(DIVIDER);
  lines.push("");
  lines.push("📌 Lưu ý:");
  lines.push(`• Báo giá có giá trị trong ${validityDays} ngày`);
  lines.push("• Vật tư có thể thay đổi theo thực tế công trình");
  lines.push("");
  lines.push(`— ${brandName} —`);

  return lines.join("\n");
};
