// Spreadsheet ID - REPLACE WITH YOUR SPREADSHEET ID
const SPREADSHEET_ID = "1s3M5Rg5XZ5jL93VtvbMcD9_Q8ApQrOx5t0kZlgZaG98"; // Get this from the URL of your spreadsheet

// Get spreadsheet reference
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// Ensure all required sheets exist
function ensureSheetsExist() {
  const ss = getSpreadsheet();
  
  // Check for Products sheet
  if (!ss.getSheetByName("Products")) {
    const productsSheet = ss.insertSheet("Products");
    productsSheet.appendRow(["id", "name", "price", "imgUrl", "desc", "active"]);
  }
  
  // Check for Customers sheet
  if (!ss.getSheetByName("Customers")) {
    const customersSheet = ss.insertSheet("Customers");
    customersSheet.appendRow(["customerId", "name", "email", "phone", "address", "date"]);
  }
  
  // Check for Orders sheet
  if (!ss.getSheetByName("Orders")) {
    const ordersSheet = ss.insertSheet("Orders");
    ordersSheet.appendRow(["orderId", "customerId", "date", "total", "status", "downPayment", "paymentMethod"]);
  }
  
  // Check for OrderItems sheet
  if (!ss.getSheetByName("OrderItems")) {
    const orderItemsSheet = ss.insertSheet("OrderItems");
    orderItemsSheet.appendRow(["orderItemId", "orderId", "productId", "quantity", "price"]);
  }
}

// Get all products from the Google Sheet
function getProducts() {
  try {
    // Ensure sheets exist
    ensureSheetsExist();
    
    // Get the Products sheet
    const sheet = getSpreadsheet().getSheetByName("Products");
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) { // Only header row or empty
      return [];
    }
    
    const header = data[0];
    const products = [];
    
    // Find column indexes
    const idIndex = header.indexOf("id");
    const nameIndex = header.indexOf("name");
    const priceIndex = header.indexOf("price");
    const imgUrlIndex = header.indexOf("imgUrl");
    const descIndex = header.indexOf("desc");
    const activeIndex = header.indexOf("active");
    
    // Log the column indexes for debugging
    console.log("Column indexes:", {
      id: idIndex,
      name: nameIndex,
      price: priceIndex,
      imgUrl: imgUrlIndex,
      desc: descIndex,
      active: activeIndex
    });
    
    // Make sure all required columns exist
    if (idIndex === -1 || nameIndex === -1 || priceIndex === -1) {
      console.error("Required columns missing in Products sheet");
      return [];
    }
    
    // Process each row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Check if product is active (if column exists)
      let isActive = true;
      
      if (activeIndex !== -1) {
        const activeValue = row[activeIndex];
        console.log(`Row ${i} active value:`, activeValue, typeof activeValue);
        
        // Check for various forms of "true" values
        if (activeValue === false || 
            activeValue === "false" || 
            activeValue === "no" || 
            activeValue === "NO" || 
            activeValue === "False" || 
            activeValue === "N" || 
            activeValue === 0 || 
            activeValue === "" || 
            activeValue === null || 
            activeValue === undefined) {
          isActive = false;
        }
      }
      
      console.log(`Product ${row[nameIndex]} isActive:`, isActive);
      
      // Only include active products
      if (isActive) {
        const product = {
          id: row[idIndex],
          name: row[nameIndex],
          price: row[priceIndex]
        };
        
        // Add optional fields if they exist
        if (imgUrlIndex !== -1) {
          product.imgUrl = formatImageUrl(row[imgUrlIndex] || "");
        }
        
        if (descIndex !== -1) {
          product.desc = row[descIndex] || "";
        }
        
        products.push(product);
      }
    }
    
    console.log("Returning products:", products.length);
    return products;
  } catch (error) {
    console.error("Error getting products:", error);
    return [];
  }
}

// Format image URL function that works with any image URL
function formatImageUrl(url) {
  // Check if URL is empty or undefined
  if (!url || url.trim() === "") {
    // Return a default placeholder image
    return "https://placehold.co/200x200?text=No+Image";
  }
  
  // Log the original URL for debugging
  console.log("Processing image URL:", url);
  
  // Special handling for Google Drive URLs (if you ever use them again)
  if (url.includes("drive.google.com")) {
    const match = url.match(/[-\w]{25,}/);
    if (match) {
      const fileId = match[0];
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
  }
  
  // If URL doesn't start with http:// or https://, assume it's a relative path
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // Add a default prefix (replace with your own base URL if needed)
    // return 'https://your-domain.com/' + url;
  }
  
  // Return the URL as is
  return url;
}

// Generate a unique ID
function generateUUID() {
  return Utilities.getUuid();
}

// Save customer data to spreadsheet
function saveCustomer(customerId, name, email, phone, address) {
  try {
    // Ensure sheets exist
    ensureSheetsExist();
    
    const sheet = getSpreadsheet().getSheetByName("Customers");
    sheet.appendRow([
      customerId,
      name,
      email,
      phone,
      address,
      new Date() // Add timestamp
    ]);
    
    return true;
  } catch (error) {
    console.error("Error saving customer:", error);
    return false;
  }
}

// Save order data to spreadsheet
function saveOrder(customerId, orderId, orderDate, total, status, dp, paymentMethod) {
  try {
    // Ensure sheets exist
    ensureSheetsExist();
    
    const sheet = getSpreadsheet().getSheetByName("Orders");
    sheet.appendRow([
      orderId,
      customerId,
      orderDate,
      total,
      status,
      dp,
      paymentMethod
    ]);
    
    return true;
  } catch (error) {
    console.error("Error saving order:", error);
    return false;
  }
}

// Save order items to spreadsheet
function saveOrderItems(orderItems) {
  try {
    // Ensure sheets exist
    ensureSheetsExist();
    
    const sheet = getSpreadsheet().getSheetByName("OrderItems");
    
    // Add each order item as a new row
    orderItems.forEach(item => {
      sheet.appendRow([
        item.orderItemId,
        item.orderId,
        item.productId,
        item.quantity,
        item.price
      ]);
    });
    
    return true;
  } catch (error) {
    console.error("Error saving order items:", error);
    return false;
  }
}

// Handle GET requests
function doGet(e) {
  // If e or e.parameter is missing, or action is not present, serve HTML
  if (!e || !e.parameter || !e.parameter.action) {
    const htmlOutput = HtmlService.createHtmlOutput("<h1>ItsOkayToBuy API</h1><p>This is an API for the ItsOkayToBuy shop.</p>");
    htmlOutput.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    return htmlOutput;
  }

  // If action is present, handle API request
  const action = e.parameter.action;
  const callback = e.parameter.callback || '';

  if (action === 'getProducts') {
    const products = getProducts();
    
    if (callback) {
      // Return JSONP response with callback
      return ContentService.createTextOutput(`${callback}(${JSON.stringify(products)})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      // Return standard JSON response
      return ContentService.createTextOutput(JSON.stringify(products))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeader('Access-Control-Allow-Origin', '*')
        .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        .setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
  }
  
  // Test API connectivity
  if (action === 'test') {
    // Ensure sheets exist during test
    ensureSheetsExist();
    
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + JSON.stringify({
        status: "success",
        message: "API is working correctly",
        timestamp: new Date().toISOString()
      }) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "API is working correctly",
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
  }

  // Fallback: serve API info
  return ContentService.createTextOutput(JSON.stringify({
    status: "error",
    message: "Unknown action requested"
  }))
  .setMimeType(ContentService.MimeType.JSON)
  .setHeader('Access-Control-Allow-Origin', '*')
  .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Handle POST requests
function doPost(e) {
  try {
    // Parse the cart data from the form parameters
    const customerName = e.parameter.customerName;
    const customerEmail = e.parameter.customerEmail;
    const customerPhone = e.parameter.customerPhone;
    const customerAddress = e.parameter.customerAddress;
    const paymentMethod = e.parameter.paymentMethod;
    const cart = JSON.parse(e.parameter.cartData);
    const total = parseFloat(e.parameter.total) || 0;
    const downPayment = parseFloat(e.parameter.downPayment) || 0;
    const uniqueCode = parseInt(e.parameter.uniqueCode) || 0;
    const redirectSuccess = e.parameter.redirectSuccess === 'true';
    
    // Generate IDs
    const customerId = generateUUID();
    const orderId = generateUUID();
    
    // Use provided total or calculate it
    const calculatedTotal = total || cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const date = new Date();
    
    // Save customer data
    saveCustomer(
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress
    );
    
    // Save order data with the provided down payment
    saveOrder(
      customerId,
      orderId,
      date,
      calculatedTotal,
      "Pending",
      downPayment, // Use the paidNow amount as the down payment
      paymentMethod
    );
    
    // Prepare order items
    const orderItems = cart.map(item => ({
      orderItemId: generateUUID(),
      orderId: orderId,
      productId: item.id,
      quantity: item.quantity,
      price: item.price
    }));
    
    // Save order items
    saveOrderItems(orderItems);

    const responseData = {
      success: true,
      orderId: orderId,
      total: calculatedTotal,
      downPayment: downPayment,
      uniqueCode: uniqueCode,
      paymentMethod: paymentMethod
    };

    // If redirectSuccess parameter is true, return HTML
    if (redirectSuccess) {
      return HtmlService.createHtmlOutput(`
        <html>
          <body>
            <pre>${JSON.stringify(responseData)}</pre>
          </body>
        </html>
      `);
    } else {
      // Return JSON response with CORS headers
      return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
  } catch (err) {
    console.error("Error in doPost:", err);
    const errorResponse = { 
      success: false, 
      error: err.message 
    };

    if (e.parameter.redirectSuccess === 'true') {
      return HtmlService.createHtmlOutput(`
        <html>
          <body>
            <pre>${JSON.stringify(errorResponse)}</pre>
          </body>
        </html>
      `);
    } else {
      return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
  }
}

// Handle OPTIONS requests (for CORS)
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
    .setHeader("Access-Control-Max-Age", "3600");
}