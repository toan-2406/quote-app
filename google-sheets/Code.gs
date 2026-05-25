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
