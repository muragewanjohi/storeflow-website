# Postman Collection Guide

**How to use and update the StoreFlow Postman collection for API testing**

---

## 📦 What is Included

The Postman collection includes:

1. **API Collection** (`postman/StoreFlow_API_Collection.json`)
   - All API endpoints organized by feature
   - Automated tests for each endpoint
   - Request examples with sample data

2. **Environment File** (`postman/StoreFlow_Environment.json`)
   - Environment variables for different setups
   - Easy switching between local/staging/production

3. **Documentation** (`postman/README.md`)
   - How to use the collection
   - How to update it
   - Troubleshooting guide

---

## 🚀 Getting Started

### Step 1: Import Collection

1. **Open Postman**
2. Click **Import** button (top left)
3. Select **File** tab
4. Choose `storeflow/postman/StoreFlow_API_Collection.json`
5. Click **Import**

### Step 2: Import Environment

1. Click **Import** button again
2. Select `storeflow/postman/StoreFlow_Environment.json`
3. Click **Import**
4. Select **StoreFlow Environment** from dropdown (top right corner)

### Step 3: Configure Variables

Click on **StoreFlow Environment** → **Edit**:

- **`base_url`**: `http://localhost:3000` (or your API URL)
- **`test_domain`**: `test.example.com` (your test domain)
- **`tenant_subdomain`**: `teststore` (your test tenant subdomain)

### Step 4: Start Testing

1. Start your dev server: `npm run dev`
2. Open any request in the collection
3. Click **Send**
4. Check **Test Results** tab for automated tests

---

## 📋 Current Endpoints

### ✅ Day 10: Tenant Resolution
- `GET /api/tenant/current` - Get current tenant

### ✅ Day 11: Domain Management
- `POST /api/admin/domains` - Add custom domain
- `GET /api/admin/domains?domain=...` - Get domain info
- `DELETE /api/admin/domains?domain=...` - Remove domain

### ✅ Day 10: Products (Example)
- `GET /api/products` - List products
- `POST /api/products` - Create product

---

## 🔄 Updating After Each Day

### When to Update

Update the collection **after each day** that adds new API endpoints:
- Day 12: Authentication endpoints
- Day 13-14: Tenant management endpoints
- Day 15+: Product management endpoints
- Day 18-19: Order management endpoints
- Day 20-21: Customer management endpoints
- etc.

### How to Update

#### Option 1: Using Postman UI (Recommended)

1. **Add New Request:**
   - Right-click on folder → **Add Request**
   - Name it (e.g., "Login")
   - Set method (GET/POST/PUT/DELETE)
   - Set URL: `{{base_url}}/api/endpoint`

2. **Configure Request:**
   - Add headers if needed
   - Add body if needed (for POST/PUT)
   - Add query parameters if needed

3. **Add Tests:**
   - Go to **Tests** tab
   - Add test scripts:
   ```javascript
   pm.test("Status code is 200", function () {
       pm.response.to.have.status(200);
   });
   
   pm.test("Response has expected data", function () {
       var jsonData = pm.response.json();
       pm.expect(jsonData).to.have.property('data');
   });
   ```

4. **Add Description:**
   - Go to **Description** tab
   - Add markdown documentation:
   ```markdown
   **Day X:** Feature Name
   
   Description of what this endpoint does.
   
   **Required Parameters:**
   - param1: Description
   
   **Response:**
   - data: Response data
   ```

5. **Export Collection:**
   - Click **...** (three dots) → **Export**
   - Save as `StoreFlow_API_Collection.json`
   - Replace existing file in `postman/` folder

#### Option 2: Manual JSON Edit

1. **Open Collection JSON:**
   - Edit `postman/StoreFlow_API_Collection.json`

2. **Add New Request:**
   ```json
   {
     "name": "New Endpoint",
     "request": {
       "method": "POST",
       "header": [
         {
           "key": "Content-Type",
           "value": "application/json"
         }
       ],
       "body": {
         "mode": "raw",
         "raw": "{\n    \"key\": \"value\"\n}"
       },
       "url": {
         "raw": "{{base_url}}/api/endpoint",
         "host": ["{{base_url}}"],
         "path": ["api", "endpoint"]
       }
     },
     "event": [{
       "listen": "test",
       "script": {
         "exec": [
           "pm.test(\"Status code is 200\", function () {",
           "    pm.response.to.have.status(200);",
           "});"
         ]
       }
     }]
   }
   ```

3. **Add to Folder:**
   - Find appropriate folder in `item` array
   - Add request to folder's `item` array

---

## 📝 Update Checklist

After each day with API endpoints:

- [ ] **New Endpoints Added**
  - [ ] Request configured correctly
  - [ ] URL uses `{{base_url}}` variable
  - [ ] Method set correctly (GET/POST/PUT/DELETE)
  - [ ] Headers added if needed
  - [ ] Body added if needed (with sample data)

- [ ] **Tests Added**
  - [ ] Status code test
  - [ ] Response structure test
  - [ ] Data validation test

- [ ] **Documentation Added**
  - [ ] Description mentions which day
  - [ ] Parameters documented
  - [ ] Response documented
  - [ ] Example included

- [ ] **Collection Exported**
  - [ ] Collection exported from Postman
  - [ ] File saved to `postman/StoreFlow_API_Collection.json`
  - [ ] Changes committed to git

- [ ] **README Updated**
  - [ ] New endpoints listed in README
  - [ ] Day marked as complete

---

## 🧪 Testing Workflow

### Daily Testing

1. **Start Dev Server:**
   ```bash
   npm run dev
   ```

2. **Open Postman:**
   - Select **StoreFlow Environment**
   - Open collection

3. **Test New Endpoints:**
   - Run each new endpoint
   - Verify tests pass
   - Check response data

4. **Test Existing Endpoints:**
   - Run a few existing endpoints
   - Ensure nothing broke

### Before Committing

1. **Run All Tests:**
   - Use Postman's **Collection Runner**
   - Run entire collection
   - Verify all tests pass

2. **Export Collection:**
   - Export updated collection
   - Save to `postman/` folder

3. **Update Documentation:**
   - Update `postman/README.md`
   - Update `docs/POSTMAN_COLLECTION_GUIDE.md` (this file)

---

## 📚 Example: Adding Day 12 Authentication Endpoints

### Step 1: Add Login Endpoint

```json
{
  "name": "Landlord Login",
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Content-Type",
        "value": "application/json"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n    \"email\": \"admin@example.com\",\n    \"password\": \"password123\"\n}"
    },
    "url": {
      "raw": "{{base_url}}/api/auth/admin/login",
      "host": ["{{base_url}}"],
      "path": ["api", "auth", "admin", "login"]
    }
  },
  "event": [{
    "listen": "test",
    "script": {
      "exec": [
        "pm.test(\"Status code is 200\", function () {",
        "    pm.response.to.have.status(200);",
        "});",
        "",
        "pm.test(\"Response has auth token\", function () {",
        "    var jsonData = pm.response.json();",
        "    pm.expect(jsonData).to.have.property('token');",
        "    ",
        "    // Save token to environment",
        "    pm.environment.set('auth_token', jsonData.token);",
        "});"
      ]
    }
  }]
}
```

### Step 2: Add to Collection

- Add to "Authentication" folder (create if needed)
- Export collection
- Update README

---

## 🔗 Related Documentation

- [Day 11 Manual Testing Guide](./DAY_11_MANUAL_TESTING_GUIDE.md)
- [Day 11 Testing Quick Start](./DAY_11_TESTING_QUICK_START.md)
- [Postman Collection README](../postman/README.md)

---

## ✅ Best Practices

1. **Always Use Variables:**
   - Use `{{base_url}}` instead of hardcoded URLs
   - Use environment variables for test data

2. **Write Tests:**
   - Test status codes
   - Test response structure
   - Test data validation

3. **Document Everything:**
   - Add descriptions to requests
   - Document parameters
   - Include examples

4. **Keep Updated:**
   - Update after each day
   - Export and commit regularly
   - Keep README current

---

**Happy Testing! 🚀**

