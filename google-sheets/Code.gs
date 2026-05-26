// ============================================================
// QUOTE APP - Google Apps Script Backend
// ============================================================
// HƯỚNG DẪN CÀI ĐẶT (5 phút):
//
// 1. Mở Google Sheet:
//    https://docs.google.com/spreadsheets/d/13mOJ7s0IH2-Ute2AR-YHkZc2tdHxyqnqMWrVDRIF9T8/edit
//
// 2. Menu Extensions → Apps Script
//
// 3. Xóa code mẫu, dán TOÀN BỘ code này vào
//
// 4. Save (Ctrl+S), đặt tên project "Quote API"
//
// 5. Bấm "Deploy" (góc phải trên) → "New deployment"
//
// 6. Cài đặt:
//      - Type:     Web app (chọn icon bánh răng → Web app)
//      - Execute as: Me (your email)
//      - Who has access: Anyone
//
// 7. Bấm "Deploy". Cấp quyền khi được yêu cầu.
//
// 8. Copy URL "Web app URL" (dạng https://script.google.com/macros/s/.../exec)
//    → Dán vào webapp ở phần "Cài đặt kết nối"
//
// ============================================================

const SPREADSHEET_ID = '13mOJ7s0IH2-Ute2AR-YHkZc2tdHxyqnqMWrVDRIF9T8';

// ============================================================
// API ENDPOINTS
// ============================================================

function doGet(e) {
  try {
    const action = (e.parameter && e.parameter.action) || 'getAll';
    
    if (action === 'getAll') {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const products = readSheet(ss, 'products');
      const options = readSheet(ss, 'product_options');
      return jsonResponse({ 
        ok: true, 
        products, 
        options,
        fetched_at: new Date().toISOString()
      });
    }
    
    if (action === 'listQuotes') {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const quotes = readSheet(ss, 'quotes');
      return jsonResponse({ ok: true, quotes });
    }
    
    if (action === 'ping') {
      return jsonResponse({ ok: true, message: 'Quote API alive', time: new Date().toISOString() });
    }
    
    return jsonResponse({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'saveQuote') {
      return saveQuote(body.quote);
    }

    if (action === 'updateQuoteStatus') {
      return updateQuoteStatus(body.quote_id, body.status);
    }

    if (action === 'updateProductAndOptions') {
      return updateProductAndOptions(
        body.product,
        body.options || [],
        body.deleted_option_ids || []
      );
    }

    if (action === 'deleteProduct') {
      return deleteProduct(body.sku);
    }

    return jsonResponse({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() });
  }
}

// ============================================================
// HELPERS
// ============================================================

function readSheet(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0];
  
  return data.slice(1)
    .filter(row => row[0] !== '' && row[0] !== null) // bỏ dòng trống
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        let value = row[i];
        // Parse số nếu là chuỗi số
        if (typeof value === 'string' && /^\d+$/.test(value)) {
          value = parseInt(value, 10);
        }
        obj[h] = value;
      });
      return obj;
    });
}

function saveQuote(quote) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('quotes');
  const now = new Date();
  const quoteId = 'BG-' + Utilities.formatDate(now, 'GMT+7', 'yyyyMMdd-HHmmss');

  // NOTE: quotes sheet columns (1-indexed):
  // 1=quote_id, 2=customer_name, 3=customer_phone, 4=items(JSON),
  // 5=total, 6=created_at, 7=status, 8=note
  // Add column header "note" to row 1 column H if it does not exist yet.
  sheet.appendRow([
    quoteId,
    quote.customer_name || '',
    quote.customer_phone || '',
    JSON.stringify(quote.items || []),
    quote.total || 0,
    Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd HH:mm:ss'),
    quote.status || 'draft',
    quote.note || ''
  ]);

  return jsonResponse({
    ok: true,
    quote_id: quoteId,
    saved_at: now.toISOString()
  });
}

// ============================================================
// UPDATE / CREATE PRODUCT + OPTIONS
// ============================================================
// Payload shape:
//   product: { sku?, name, category, unit, price_install, price_manufacture, description? }
//   options: [ { option_id?, sku?, option_name, extra_price, is_free } ]
// Behavior:
//   - product.sku missing or starts with "new-" → append new product row,
//     auto-assigns SP-NNN based on the current max.
//   - product.sku matches an existing row → update only the fields supplied.
//   - For each option: missing/empty/"new-..." option_id → append new option
//     row, auto-assigns OPT-NNN. Existing option_id → update in place.
function updateProductAndOptions(product, options, deletedOptionIds) {
  if (!product) {
    return jsonResponse({ ok: false, error: 'Missing product' });
  }
  options = options || [];
  deletedOptionIds = deletedOptionIds || [];

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const productsSheet = ss.getSheetByName('products');
  const optionsSheet = ss.getSheetByName('product_options');

  // ----- Product: create or update -----
  let resolvedSku = product.sku;
  let productCreated = false;
  let productUpdated = false;
  const isNewProduct = !product.sku || String(product.sku).indexOf('new-') === 0;

  if (productsSheet) {
    if (isNewProduct) {
      resolvedSku = generateNextSku_(productsSheet);
      productsSheet.appendRow([
        resolvedSku,
        product.name || '',
        product.category || '',
        product.unit || '',
        Number(product.price_install) || 0,
        Number(product.price_manufacture) || 0,
        product.description || '',
        product.image_url || '',
        'active'
      ]);
      productCreated = true;
    } else {
      const data = productsSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === product.sku) {
          const row = i + 1;
          if (product.name != null) productsSheet.getRange(row, 2).setValue(product.name);
          if (product.category != null) productsSheet.getRange(row, 3).setValue(product.category);
          if (product.unit != null) productsSheet.getRange(row, 4).setValue(product.unit);
          if (product.price_install != null)
            productsSheet.getRange(row, 5).setValue(Number(product.price_install) || 0);
          if (product.price_manufacture != null)
            productsSheet.getRange(row, 6).setValue(Number(product.price_manufacture) || 0);
          if (product.description != null)
            productsSheet.getRange(row, 7).setValue(product.description);
          productUpdated = true;
          break;
        }
      }
    }
  }

  // ----- Options: create or update -----
  const optionsCreated = [];
  const optionsUpdated = [];

  if (optionsSheet && options.length > 0) {
    const optsData = optionsSheet.getDataRange().getValues();
    const idIndex = {};
    for (let i = 1; i < optsData.length; i++) idIndex[optsData[i][0]] = i + 1;

    options.forEach(function (opt) {
      if (!opt) return;
      const isNewOpt = !opt.option_id || String(opt.option_id).indexOf('new-') === 0;
      if (isNewOpt) {
        const newId = generateNextOptionId_(optionsSheet);
        optionsSheet.appendRow([
          newId,
          opt.sku || resolvedSku || '',
          opt.option_name || '',
          Number(opt.extra_price) || 0,
          opt.is_free ? 'TRUE' : 'FALSE'
        ]);
        optionsCreated.push(newId);
        // Update local index in case multiple new options reference each other later
        idIndex[newId] = optionsSheet.getLastRow();
      } else {
        const row = idIndex[opt.option_id];
        if (!row) return;
        if (opt.option_name != null) optionsSheet.getRange(row, 3).setValue(opt.option_name);
        if (opt.extra_price != null)
          optionsSheet.getRange(row, 4).setValue(Number(opt.extra_price) || 0);
        if (opt.is_free != null)
          optionsSheet.getRange(row, 5).setValue(opt.is_free ? 'TRUE' : 'FALSE');
        optionsUpdated.push(opt.option_id);
      }
    });
  }

  // ----- Options: delete (process AFTER updates/creates so any new options
  // appended above don't shift indexes mid-loop). Iterate bottom-up so row
  // deletions don't affect subsequent indices. -----
  const optionsDeleted = [];
  if (optionsSheet && deletedOptionIds.length > 0) {
    const data = optionsSheet.getDataRange().getValues();
    const rowsToDelete = [];
    for (let i = 1; i < data.length; i++) {
      if (deletedOptionIds.indexOf(data[i][0]) >= 0) {
        rowsToDelete.push({ row: i + 1, id: data[i][0] });
      }
    }
    rowsToDelete.sort(function (a, b) { return b.row - a.row; });
    rowsToDelete.forEach(function (entry) {
      optionsSheet.deleteRow(entry.row);
      optionsDeleted.push(entry.id);
    });
  }

  return jsonResponse({
    ok: true,
    sku: resolvedSku,
    product_created: productCreated,
    product_updated: productUpdated,
    options_created: optionsCreated,
    options_updated: optionsUpdated,
    options_deleted: optionsDeleted
  });
}

// Delete a product row and cascade-delete its options.
function deleteProduct(sku) {
  if (!sku) {
    return jsonResponse({ ok: false, error: 'Missing sku' });
  }
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const productsSheet = ss.getSheetByName('products');
  const optionsSheet = ss.getSheetByName('product_options');

  let productDeleted = false;
  const optionsDeleted = [];

  if (productsSheet) {
    const data = productsSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === sku) {
        productsSheet.deleteRow(i + 1);
        productDeleted = true;
        break;
      }
    }
  }

  if (optionsSheet) {
    const data = optionsSheet.getDataRange().getValues();
    const toDelete = [];
    for (let i = 1; i < data.length; i++) {
      // Column 2 (index 1) is the sku reference on option_options.
      if (data[i][1] === sku) {
        toDelete.push({ row: i + 1, id: data[i][0] });
      }
    }
    toDelete.sort(function (a, b) { return b.row - a.row; });
    toDelete.forEach(function (entry) {
      optionsSheet.deleteRow(entry.row);
      optionsDeleted.push(entry.id);
    });
  }

  return jsonResponse({
    ok: true,
    sku: sku,
    product_deleted: productDeleted,
    options_deleted: optionsDeleted
  });
}

// Find the max numeric suffix in column A among rows matching the prefix
// pattern and return prefix + (max+1) zero-padded to 3 digits.
function generateNextSku_(sheet) {
  const data = sheet.getDataRange().getValues();
  let max = 0;
  for (let i = 1; i < data.length; i++) {
    const m = String(data[i][0]).match(/^SP-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'SP-' + String(max + 1).padStart(3, '0');
}

function generateNextOptionId_(sheet) {
  const data = sheet.getDataRange().getValues();
  let max = 0;
  for (let i = 1; i < data.length; i++) {
    const m = String(data[i][0]).match(/^OPT-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'OPT-' + String(max + 1).padStart(3, '0');
}

function updateQuoteStatus(quoteId, newStatus) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('quotes');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === quoteId) {
      sheet.getRange(i + 1, 7).setValue(newStatus); // cột G (status)
      return jsonResponse({ ok: true, quote_id: quoteId, new_status: newStatus });
    }
  }
  
  return jsonResponse({ ok: false, error: 'Không tìm thấy quote_id: ' + quoteId });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// TEST FUNCTION - chạy thử trong Apps Script editor
// ============================================================

function testGetAll() {
  const result = doGet({ parameter: { action: 'getAll' } });
  Logger.log(result.getContent());
}

function testSaveQuote() {
  const result = doPost({
    postData: {
      contents: JSON.stringify({
        action: 'saveQuote',
        quote: {
          customer_name: 'Nguyễn Văn Test',
          customer_phone: '0901234567',
          items: [{ sku: 'SP-001', qty: 5, quoteType: 'both' }],
          total: 3500000,
          status: 'draft'
        }
      })
    }
  });
  Logger.log(result.getContent());
}
