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
    productsSheet.appendRow(["productId", "name", "category", "price", "imgUrl", "desc", "active"]);
  }
  
  // Check for Customers sheet
  if (!ss.getSheetByName("Customers")) {
    const customersSheet = ss.insertSheet("Customers");
    customersSheet.appendRow(["customerId", "name", "email", "phone", "address", "lastOrder"]);
  }
  
  // Check for Orders sheet
  if (!ss.getSheetByName("Orders")) {
    const ordersSheet = ss.insertSheet("Orders");
    ordersSheet.appendRow(["orderId", "customerId", "date", "total", "status", "downPayment", "paymentMethod", "shippingOption", "shippingAddress"]);
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
    const idIndex = header.indexOf("productId");
    const nameIndex = header.indexOf("name");
    const priceIndex = header.indexOf("price");
    const imgUrlIndex = header.indexOf("imgUrl");
    const descIndex = header.indexOf("desc");
    const activeIndex = header.indexOf("active");
    const categoryIndex = header.indexOf("category");
    
    // Log the column indexes for debugging
    console.log("Column indexes:", {
      id: idIndex,
      name: nameIndex,
      price: priceIndex,
      imgUrl: imgUrlIndex,
      desc: descIndex,
      active: activeIndex,
      category: categoryIndex
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
        
        if (categoryIndex !== -1) {
          product.category = row[categoryIndex] || "";
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

// Validate products based on their IDs
function validateProducts(productIds) {
  try {
    const sheet = getSpreadsheet().getSheetByName("Products");
    const data = sheet.getDataRange().getValues();
    const header = data[0];
    
    const idIndex = header.indexOf("productId");
    const activeIndex = header.indexOf("active");
    const nameIndex = header.indexOf("name");
    
    if (idIndex === -1 || activeIndex === -1 || nameIndex === -1) {
      return { error: "Required columns missing" };
    }
    
    const inactiveProducts = [];
    
    productIds.forEach(pid => {
      for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === pid) {
          const isActive = data[i][activeIndex] === true || 
                          data[i][activeIndex] === "true" || 
                          data[i][activeIndex] === "yes" || 
                          data[i][activeIndex] === "YES";
          
          if (!isActive) {
            inactiveProducts.push({
              id: pid,
              name: data[i][nameIndex]
            });
          }
          break;
        }
      }
    });
    
    return { inactiveProducts };
    
  } catch (error) {
    return { error: error.toString() };
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

// Generate a consistent customer ID primarily from phone number
function generateCustomerId(name, phone) {
  // Clean the phone number and name
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Always include both name and phone for better readability and identification
  // Take the first 10 characters of the name (or less if the name is shorter)
  const namePrefix = cleanName.slice(0, 10);
  
  // Take the last 6 digits of the phone
  const phoneSuffix = cleanPhone.slice(-6);
  
  // Combine them
  return `cust-${namePrefix}-${phoneSuffix}`;
}

// Find existing customer or create a new one
function findOrCreateCustomer(customerId, name, email, phone, address) {
  try {
    ensureSheetsExist();
    const sheet = getSpreadsheet().getSheetByName("Customers");
    const data = sheet.getDataRange().getValues();
    
    // Add header if sheet is empty
    if (data.length < 1) {
      sheet.appendRow(["customerId", "name", "email", "phone", "address", "lastOrder"]);
      data.push(["customerId", "name", "email", "phone", "address", "lastOrder"]);
    }
    
    // Get column indexes from header
    const header = data[0];
    const columns = {
      customerId: header.indexOf("customerId"),
      name: header.indexOf("name"),
      email: header.indexOf("email"),
      phone: header.indexOf("phone"),
      address: header.indexOf("address"),
      lastOrder: header.indexOf("lastOrder")
    };
    
    // Validate required columns
    if (columns.customerId === -1) {
      throw new Error("customerId column not found");
    }

    // Search for existing customer
    for (let i = 1; i < data.length; i++) {
      if (data[i][columns.customerId] === customerId) {
        // Create UTC+7 date
        const now = new Date();
        const utc7Date = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd HH:mm:ss");
        
        // Update only date and address
        sheet.getRange(i + 1, columns.lastOrder + 1).setValue(utc7Date);
        sheet.getRange(i + 1, columns.address + 1).setValue(address);
        return true;
      }
    }
    
    // If customer not found, create new entry
    const now = new Date();
    const utc7Date = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd HH:mm:ss");
    
    const newRowData = new Array(header.length).fill("");
    newRowData[columns.customerId] = customerId;
    newRowData[columns.name] = name;
    newRowData[columns.email] = email;
    newRowData[columns.phone] = phone;
    newRowData[columns.address] = address;
    newRowData[columns.lastOrder] = utc7Date;
    
    sheet.appendRow(newRowData);
    return false;

  } catch (error) {
    console.error("Error in findOrCreateCustomer:", error);
    console.error("Stack:", error.stack);
    return false;
  }
}

// Save order data to spreadsheet
function saveOrder(customerId, orderId, orderDate, total, status, dp, paymentMethod, shippingOption, shippingAddress) {
  try {
    const sheet = getSpreadsheet().getSheetByName("Orders");
    const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Map columns to their indexes
    const columns = {
      orderId: header.indexOf("orderId"),
      customerId: header.indexOf("customerId"),
      date: header.indexOf("date"),
      total: header.indexOf("total"),
      status: header.indexOf("status"),
      downPayment: header.indexOf("downPayment"),
      paymentMethod: header.indexOf("paymentMethod"),
      shippingOption: header.indexOf("shippingOption"),
      shippingAddress: header.indexOf("shippingAddress")
    };
    
    // Validate required columns exist
    const requiredColumns = ["orderId", "customerId", "date", "total"];
    for (const col of requiredColumns) {
      if (columns[col] === -1) {
        throw new Error(`Required column ${col} not found in Orders sheet`);
      }
    }
    
    // Convert orderDate to UTC+7
    const utc7Date = Utilities.formatDate(orderDate, "GMT+7", "yyyy-MM-dd HH:mm:ss");
    
    // Create row data array matching column order in sheet
    const rowData = new Array(header.length).fill("");
    rowData[columns.orderId] = orderId;
    rowData[columns.customerId] = customerId;
    rowData[columns.date] = utc7Date;
    rowData[columns.total] = total;
    rowData[columns.status] = status;
    rowData[columns.downPayment] = dp;
    rowData[columns.paymentMethod] = paymentMethod;
    rowData[columns.shippingOption] = shippingOption;
    rowData[columns.shippingAddress] = shippingAddress;
    
    sheet.appendRow(rowData);
    return true;
  } catch (error) {
    console.error("Error saving order:", error);
    return false;
  }
}

// Updated code to generate order item IDs that incorporate the order ID
function saveOrderItems(orderItems, orderId) {
  try {
    // Ensure sheets exist
    ensureSheetsExist();
    
    const sheet = getSpreadsheet().getSheetByName("OrderItems");
    
    // Add each order item as a new row
    orderItems.forEach((item, index) => {
      // Create a simpler order item ID that includes the order ID
      const orderItemId = `${orderId}-item-${index + 1}`;
      
      sheet.appendRow([
        orderItemId,
        orderId,
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
    const htmlOutput = HtmlService.createHtmlOutputFromFile('index');
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
  
  if (action === 'validateProducts') {
    const productIds = e.parameter.productIds ? JSON.parse(e.parameter.productIds) : [];
    const result = validateProducts(productIds);
    
    if (callback) {
      return ContentService.createTextOutput(`${callback}(${JSON.stringify(result)})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (action === 'submitOrder') {
    // Parse parameters
    const customerName = e.parameter.customerName;
    const customerEmail = e.parameter.customerEmail;
    const customerPhone = e.parameter.customerPhone;
    const customerAddress = e.parameter.customerAddress;
    const paymentMethod = e.parameter.paymentMethod;
    const shippingOption = e.parameter.shippingOption || "Standard";
    const cart = e.parameter.cartData ? JSON.parse(e.parameter.cartData) : [];
    const total = parseFloat(e.parameter.total) || 0;
    const downPayment = parseFloat(e.parameter.downPayment) || 0;
    const uniqueCode = parseInt(e.parameter.uniqueCode) || 0;
    const orderId = e.parameter.orderId || ('ORD-' + new Date().getTime().toString().slice(-6));
    const customerId = generateCustomerId(customerName, customerPhone);

    findOrCreateCustomer(customerId, customerName, customerEmail, customerPhone, customerAddress);

    const calculatedTotal = total || cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const date = new Date();

    saveOrder(
      customerId,
      orderId,
      date,
      calculatedTotal,
      "Pending",
      downPayment,
      paymentMethod,
      shippingOption,
      customerAddress
    );

    const orderItems = cart.map(item => ({
      productId: item.id,
      quantity: item.quantity,
      price: item.price
    }));

    saveOrderItems(orderItems, orderId);

    const responseData = {
      success: true,
      orderId: orderId,
      total: calculatedTotal,
      downPayment: downPayment,
      uniqueCode: uniqueCode,
      paymentMethod: paymentMethod
    };

    if (callback) {
      return ContentService.createTextOutput(`${callback}(${JSON.stringify(responseData)})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService.createTextOutput(JSON.stringify(responseData))
        .setMimeType(ContentService.MimeType.JSON);
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
    // Parse the form parameters
    const customerName = e.parameter.customerName;
    const customerEmail = e.parameter.customerEmail;
    const customerPhone = e.parameter.customerPhone;
    const customerAddress = e.parameter.customerAddress;
    const paymentMethod = e.parameter.paymentMethod;
    const shippingOption = e.parameter.shippingOption || "Standard";
    const cart = JSON.parse(e.parameter.cartData);
    const total = parseFloat(e.parameter.total) || 0;
    const downPayment = parseFloat(e.parameter.downPayment) || 0;
    const uniqueCode = parseInt(e.parameter.uniqueCode) || 0;
    const redirectSuccess = e.parameter.redirectSuccess === 'true';
    
    // Use the order ID from the frontend or generate a fallback if missing
    const orderId = e.parameter.orderId || ('ORD-' + new Date().getTime().toString().slice(-6));
    
    // Generate a customer ID based on name and phone
    const customerId = generateCustomerId(customerName, customerPhone);
    
    // Check if customer already exists and update or create accordingly
    const customerExists = findOrCreateCustomer(
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress
    );
    
    // Use provided total or calculate it
    const calculatedTotal = total || cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const date = new Date();
    
    // Save order data with the provided down payment and shipping option
    saveOrder(
      customerId,
      orderId,
      date,
      calculatedTotal,
      "Pending",
      downPayment,
      paymentMethod,
      shippingOption,
      customerAddress
    );
    
    // Prepare order items - no need to generate UUIDs anymore
    const orderItems = cart.map(item => ({
      productId: item.id,
      quantity: item.quantity,
      price: item.price
    }));
    
    // Save order items - pass the orderId to the function
    saveOrderItems(orderItems, orderId);

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