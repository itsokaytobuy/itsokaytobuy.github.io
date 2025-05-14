function doGet(e) {
  // If e or e.parameter is missing, or action is not present, serve HTML
  if (!e || !e.parameter || !e.parameter.action) {
    const html = HtmlService.createHtmlOutputFromFile("index");
    html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    return html;
  }

  // If action is present, handle API
  const action = e.parameter.action;

  if (action === 'getProducts') {
    return ContentService.createTextOutput(JSON.stringify(getProducts()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Fallback: serve HTML
  const html = HtmlService.createHtmlOutputFromFile("index");
  html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return html;
}

function getProducts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Products");
  const data = sheet.getDataRange().getValues();
  const header = data[0];
  const activeIndex = header.indexOf("Active");

  const products = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const isActive = row[activeIndex];
    
    if (String(isActive).toLowerCase() === 'true' || String(isActive).toLowerCase() === 'yes') {
      const [id, name, price, imgUrlRaw, desc] = row;
      const imgUrl = formatImageUrl(imgUrlRaw);
      products.push({ id, name, price, imgUrl, desc });
    }
  }

  return products;
}

function formatImageUrl(url) {
  if (!url) return "";
  if (url.includes("drive.google.com")) {
    const match = url.match(/[-\w]{25,}/);
    if (match) {
      const fileId = match[0];
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
  }
  return url;
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const customer = data.customer;
    const cart = data.cart;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = ss.getSheetByName("Orders");
    const itemsSheet = ss.getSheetByName("OrderItems");
    const customerSheet = ss.getSheetByName("Customer");

    const customerId = Utilities.getUuid();
    customerSheet.appendRow([
      customerId,
      customer.name,
      customer.email,
      customer.phone,
      customer.address
    ]);

    const orderId = Utilities.getUuid();
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const dp = total / 2;
    const date = new Date();
    ordersSheet.appendRow([
      orderId,
      customerId,
      date,
      total,
      "Pending",
      dp
    ]);

    cart.forEach(item => {
      const orderItemId = Utilities.getUuid();
      itemsSheet.appendRow([
        orderItemId,
        orderId,
        item.id,
        item.quantity,
        item.price
      ]);
    });

    // Return JSON response with CORS headers
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}