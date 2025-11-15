# StoreFlow Postman Collection

**Complete API testing collection for StoreFlow multi-tenant ecommerce platform**

---

## 📦 Files

- **`StoreFlow_API_Collection.json`** - Main Postman collection with all API endpoints
- **`StoreFlow_Environment.json`** - Environment variables for different environments
- **`README.md`** - This file

---

## 🚀 Quick Start

### 1. Import Collection

1. Open Postman
2. Click **Import** button
3. Select `StoreFlow_API_Collection.json`
4. Click **Import**

### 2. Import Environment

1. Click **Import** button
2. Select `StoreFlow_Environment.json`
3. Click **Import**
4. Select the **StoreFlow Environment** from the environment dropdown (top right)

### 3. Configure Environment Variables

Update these variables in the environment:

- **`base_url`** - Your API base URL (default: `http://localhost:3000`)
- **`test_domain`** - Test domain for domain management (default: `test.example.com`)
- **`tenant_id`** - Current tenant ID (optional, for testing)
- **`tenant_subdomain`** - Tenant subdomain (default: `teststore`)
- **`auth_token`** - Authentication token (when auth is implemented)

---

## 📋 Collection Structure

### Tenant Management
- **Get Current Tenant** - Get tenant info from hostname/headers

### Domain Management (Day 11)
- **Add Custom Domain** - Add a custom domain to tenant
- **Get Domain Info** - Get domain information and verification status
- **Remove Domain** - Remove a custom domain

### Products (Day 10 Example)
- **Get Products** - List all products for tenant
- **Create Product** - Create a new product

---

## 🧪 Testing

### Running Tests

Each request includes automated tests that verify:
- Status codes
- Response structure
- Data validation

### Manual Testing

1. **Set Environment Variables:**
   - Update `base_url` if not using localhost
   - Set `test_domain` to your test domain

2. **Run Requests:**
   - Click on any request
   - Click **Send**
   - Check **Test Results** tab for automated tests

3. **Check Response:**
   - View response in **Body** tab
   - Check **Headers** for additional info

---

## 🔄 Updating Collection

### After Each Development Day

When new API endpoints are added, update the collection:

1. **Add New Request:**
   ```json
   {
     "name": "New Endpoint Name",
     "request": {
       "method": "GET|POST|PUT|DELETE",
       "url": "{{base_url}}/api/endpoint",
       "header": [...],
       "body": {...}
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

2. **Add to Appropriate Folder:**
   - Create new folder if needed
   - Add request to relevant folder

3. **Add Tests:**
   - Include automated tests for each request
   - Test status codes, response structure, data validation

4. **Update Documentation:**
   - Add description mentioning which day it was added
   - Include required/optional parameters
   - Document expected responses

### Example: Adding New Endpoint

**Step 1:** Open Postman collection

**Step 2:** Right-click on folder → **Add Request**

**Step 3:** Configure request:
- Method: `POST`
- URL: `{{base_url}}/api/new-endpoint`
- Headers: Add required headers
- Body: Add request body (if needed)

**Step 4:** Add tests in **Tests** tab:
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has expected data", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('data');
});
```

**Step 5:** Add description:
- Mention which day it was added
- Document parameters
- Document expected response

**Step 6:** Export updated collection:
- Click **...** (three dots) → **Export**
- Save as `StoreFlow_API_Collection.json`
- Replace existing file

---

## 📝 Day-by-Day Updates

### Day 10: Tenant Resolution System ✅
- ✅ Get Current Tenant (`/api/tenant/current`)
- ✅ Products Example (`/api/products`)

### Day 11: Vercel Domain Management ✅
- ✅ Add Custom Domain (`POST /api/admin/domains`)
- ✅ Get Domain Info (`GET /api/admin/domains`)
- ✅ Remove Domain (`DELETE /api/admin/domains`)

### Day 12: Supabase Authentication (Coming Soon)
- ⏳ Landlord Login
- ⏳ Tenant Login
- ⏳ Logout
- ⏳ Refresh Token

### Day 13-14: Tenant Management (Coming Soon)
- ⏳ Create Tenant
- ⏳ Update Tenant
- ⏳ Delete Tenant
- ⏳ List Tenants

### Day 15+: Product Management (Coming Soon)
- ⏳ Update Product
- ⏳ Delete Product
- ⏳ Get Product by ID
- ⏳ Search Products

---

## 🔐 Authentication

Currently, authentication is not implemented. When Day 12 (Authentication) is complete:

1. **Add Auth Token:**
   - Login endpoint will return `auth_token`
   - Set `auth_token` in environment variables
   - Collection will auto-include token in headers

2. **Update Collection:**
   - Add Authorization header to all requests
   - Add login/logout endpoints
   - Add token refresh endpoint

---

## 🌍 Multiple Environments

### Local Development
```json
{
  "base_url": "http://localhost:3000",
  "test_domain": "test.localhost"
}
```

### Staging
```json
{
  "base_url": "https://staging.storeflow.com",
  "test_domain": "test.staging.storeflow.com"
}
```

### Production
```json
{
  "base_url": "https://api.storeflow.com",
  "test_domain": "test.storeflow.com"
}
```

**Create separate environments in Postman for each.**

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to server"
**Solution:** 
- Check if dev server is running (`npm run dev`)
- Verify `base_url` is correct

### Issue: "404 Not Found"
**Solution:**
- Check API route exists
- Verify URL path is correct
- Check middleware configuration

### Issue: "401 Unauthorized"
**Solution:**
- Authentication not implemented yet (Day 12)
- For now, ensure tenant context is set via middleware

### Issue: "500 Internal Server Error"
**Solution:**
- Check server logs
- Verify environment variables are set
- Check database connection

---

## 📚 Resources

- [Postman Documentation](https://learning.postman.com/docs/)
- [Writing Tests in Postman](https://learning.postman.com/docs/writing-scripts/test-scripts/)
- [Environment Variables](https://learning.postman.com/docs/sending-requests/managing-environments/)

---

## ✅ Testing Checklist

After each day, verify:

- [ ] New endpoints added to collection
- [ ] Tests written for each endpoint
- [ ] Documentation updated
- [ ] Environment variables set correctly
- [ ] All tests passing
- [ ] Collection exported and saved

---

## 📝 Notes

- **Collection Version:** 1.0
- **Last Updated:** Day 11
- **Next Update:** Day 12 (Authentication)

---

**Happy Testing! 🚀**

