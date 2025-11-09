# CS4218 Project - Virtual Vault

## Github Workflow URL:

https://github.com/cs4218/cs4218-2510-ecom-project-team009/actions

## 1. Project member contributions

For each mentioned file/method, bug fixes and unit tests have been written for them by each member.

### Tabriz Pahlavi (A0233017U)

#### Frontend Unit Test + Integration Test:

1. pages/user/Orders.js
2. pages/user/Profile.js
3. pages/admin/Users.js
4. components/Form/SearchInput.js
5. components/UserList.js
6. context/search.js
7. pages/Search.js

#### Backend Unit Test + Integration Test:

1.  updateProfileController
2.  getOrdersController
3.  getAllOrdersController
4.  orderStatusController
5.  models/orderModel.js

#### E2E Tests

1.  e2e/flows/profile-page.spec.ts
2.  e2e/flows/admin-users-list.spec.ts
3.  e2e/flows/search-feature.spec.ts
4.  e2e/flows/order-feature.spec.ts

#### Performance Tests (Capacity tests)
1. performance-testing/scenarios/homepage-browsing/capacity-test.jmx

---

### Winston Leonard Prayonggo (A0255823B)

#### Frontend Unit Test + Integration Test:

1. pages/Homepage.js
2. context/cart.js
3. pages/CartPage.js
4. hooks/useCategory.js
5. pages/Categories.js

#### Backend Unit Test + Integration Test:

1. controllers/categoryController.js
2. models/categoryModel.js
3. braintreeController inside productController.js

#### End to End playwright test:

1. e2e/flows/home-cart-payment.spec.ts
2. e2e/flows/home-category.spec.ts

#### Performance testing (Spike test):

1. performance-testing/scenarios/homepage-spike
2. performance-testing/scenarios/payment-spike

#### Bug Fix:

##### **HomePage.js**

- **Duplicate key warning:**  
  In `Prices.js`, multiple items shared the same `_id`, producing the React warning:
  > “Encountered two children with the same key.”  
  > Fixed by ensuring each rendered element uses a unique key.
- **Missing `key` prop in Header.js:**  
  Categories were mapped without unique keys. Added `key` attributes to each element.
- **Filter not updating total count:**  
  When filtering products, the total product count was not refreshed, causing a the filtered products to not show. Fixed logic to update the total count whenever filters change.

##### **CartPage.js**

- **Duplicate items rendering issue:**  
  The cart can contain duplicate items (e.g., when a user adds the same product multiple times), which is valid.  
  However, the CartPage previously mapped these duplicates using the same `_id` as the React `key`, causing unstable rendering behavior.  
  This led to incorrect item removals when duplicates existed.  
  Fixed by ensuring each rendered item in the cart list uses a unique key
- **Cart not user-specific:**  
  Cart contents did not differ between logged-in accounts. Fixed by namespacing localStorage keys (e.g., `cart_<userId>`).
- **Users logged in for more than 7 days are unable to make payment:**  
   The JWT token for the user has already expired, making them unable to make
  a payment. Current Fix: Set the expiry token to 365 days.

##### **categoryController.js**

- **General cleanup:**  
  Fixed typos and inconsistent capitalization in function names and messages (e.g., `deleteCategoryCOntroller` → `deleteCategoryController`).
- **Blank name validation:**  
  Prevented creation of categories with only whitespace (e.g., `"   "`).
- **Duplicate category handling:**  
  Previously returned `200 OK`; now correctly returns **`409 Conflict`** when a category already exists.
- **Update non-existent ID:**  
  `updateCategoryController` used to return `200 OK` even when the ID didn’t exist. Fixed to return **`404 Not Found`**.
- **Single category fetch:**  
  `singleCategoryController` returned `success: true` with `category: null`. Now returns **`404 Not Found`** and `success: false` when not found.
- **Delete non-existent ID:**  
  `deleteCategoryController` returned `200 OK` even when no record was deleted. Fixed to return **`404 Not Found`** and `success: false` in that case.

##### **categoryModel.js**

- **Missing required validation:**  
  Uncommented `required: true` for the `name` field to enforce category name validation at the schema level.

##### **Performace testing bugs**

- **Homepage spike testing:**  
  Homepage was not able to recover after a sudden spike of 750 users from a baseline of 100 users.

---

### Nicholas Chee (A0251980B)

### Frontend Unit Tests:

1. pages/ProductDetails.js
2. pages/CategoryProduct.js
3. pages/Contact.js
4. pages/Policy.js
5. pages/About.js
6. pages/Pagenotfound.js
7. components/Footer.js
8. components/Header.js
9. components/Layout.js
10. components/Spinner.js

### Backend Unit Tests:

1. controllers/productController.js
2. models/productModel.js
3. config/db.js

### Integration Tests:

1. productController.integration.test.js
2. ProductDetails.integration.test.js

### E2E Playwright Tests:

1. category-product.spec.ts
2. product-details.spec.ts

## Bugs Fixed

### **HomePage.js**

- **Price filter not uncheckable:**  
  Price filters used `Radio` buttons which cannot be unchecked once selected. Users had no way to clear price filters without using the "RESET FILTERS" button.

  > Fixed by converting price filters from `Radio.Group` to individual `Checkbox` components with controlled state management.

- **Price range gaps (non-inclusive boundaries):**  
  Price ranges had gaps between tiers (e.g., $60-79 and $80-99 excluded $79.90).

  > Fixed by updating `Prices.js` to use `.99` endings: `[0, 19.99]`, `[20, 39.99]`, etc., ensuring all price points are covered.

- **Reset filters causes full page refresh:**  
  The "RESET FILTERS" button used `window.location.reload()`, which cleared all application state including cart contents and user session.

  > Fixed by replacing page reload with state updates: `setChecked([])`, `setRadio([])`, `setPage(1)`, and calling `getAllProducts()` to reload data without losing state.

- **Filter headers not aligned:**  
  "Filter By Category" header was misaligned compared to "Filter By Price" and filter checkboxes.

  > Fixed by adding consistent `mt-4` (margin-top) class to both filter section headers.

- **Checkbox labels rendering below checkboxes:**  
  Ant Design `Checkbox` components had labels wrapping to a new line instead of appearing inline with the checkbox.

  > Fixed by adding CSS class `.filter-checkbox` with `display: flex`, `align-items: center`, and forcing child `<span>` elements to `display: inline`.

- **Product card buttons not vertically aligned:**  
  Products with multi-line titles (e.g., "The Law of Contract in Singapore") created taller cards, causing "Details" and "Add to Cart" buttons to misalign across the product grid.

  > Fixed by implementing flexbox layout with fixed card height (`32rem`), fixed image height (`300px`), and `margin-top: auto` on button container to push buttons to the bottom of each card.

- **Filter not updating total count:**  
  When applying category or price filters, the total product count was not refreshed, causing pagination logic to break and prevent filtered results from displaying correctly.

  > Fixed by updating `filterProduct()` to set `setTotal(data?.products.length)` whenever filters change.

- **Infinite photo loading loop on filter:**  
  When users applied category or price filters, the application loaded _all_ matching products simultaneously instead of using pagination, triggering thousands of HTTP photo requests and causing browser tab crashes.
  > Fixed by: (1) Adding pagination to `productFiltersController` with `skip()` and `limit()`, (2) Updating `useEffect` dependencies to only load first page on filter change, (3) Adding `loading="lazy"` to `<img>` tags to defer off-screen image loads.

### **productController.js**

- **Typo fixes:**  
  Multiple spelling errors throughout error messages and comments:

  - "Erorr" → "Error"
  - "upate producta" → "update product"
  - "alidation" → "validation"
  - "Updte" → "Update"
  - "realted" → "related"
    > Fixed all typos to improve code readability and professionalism.

- **Application crash when `req.params.pid` is "undefined":**  
  The `productPhotoController` did not handle cases where `product.photo` was null or undefined, causing crashes when accessing `product.photo.data`.

  > Fixed by adding optional chaining: `if (product?.photo?.data)` to safely check for photo existence.

- **Incorrect HTTP status code for validation failures:**  
  Validation errors (e.g., missing required fields) returned HTTP 500 (Internal Server Error) instead of 400 (Bad Request).

  > Fixed by updating error responses to use `res.status(400)` for client-side validation failures.

- **Missing separate validation for photo presence vs. photo size:**  
  Photo validation logic did not distinguish between "photo not provided" and "photo too large", making error messages unclear.
  > Fixed by creating separate validation checks:
  >
  > - Check if photo exists
  > - Then check if photo size exceeds limit
  > - Return specific error messages for each case

### **ProductDetails.js**

- **Typo in variable name:**  
  Initial product state variable was misspelled as `initalp`.

  > Fixed: `initalp` → `initialProduct` for clarity and correctness.

- **Invalid JSX attribute:**  
  Used HTML attribute `class` instead of React's `className`, causing React warnings.
  > Fixed by replacing all instances of `class` with `className`.

### **CategoryProduct.js**

- **"Add to Cart" button not functional:**  
  The "Add to Cart" button on both main products and similar products did not add items to cart or show success toast messages.
  > Fixed by implementing proper cart state management:
  >
  > - Add product to cart state: `setCart([...cart, p])`
  > - Persist to localStorage with user-specific key: `localStorage.setItem(\`cart\_${userId}\`, JSON.stringify([...cart, p]))`
  > - Display success toast: `toast.success("Item Added to cart")`

### **Header.js**

- **Missing `key` prop in category mapping:**  
  Categories were mapped without unique `key` attributes, producing React warnings:

  > "Each child in a list should have a unique 'key' prop."
  > Fixed by adding `key={c._id}` to each mapped category element.

- **Unnecessary React Fragments:**  
  Multiple instances of empty React Fragments (`<> </>`) that served no purpose and cluttered the JSX.
  > Removed all unnecessary fragments to simplify code structure.

### **Layout.js**

- **Missing PropTypes validation:**  
  Component did not validate `children` and `title` props, allowing incorrect prop types to be passed without warnings.
  > Added PropTypes validation:
  >
  > ```javascript
  > Layout.propTypes = {
  >   children: PropTypes.node.isRequired,
  >   title: PropTypes.string,
  >   description: PropTypes.string,
  >   keywords: PropTypes.string,
  >   author: PropTypes.string,
  > };
  > ```

### **Spinner.js**

- **Incorrect semantic HTML for countdown timer:**  
  Countdown timer used `<div role="status">` which is not semantically correct for dynamic numeric output.
  > Fixed by replacing `<div role="status">` with `<output>` element, which is the proper HTML5 tag for representing calculation or user action results.

### **Prices.js**

- **Duplicate `_id` values:**  
  Multiple price range objects shared the same `_id`, producing React warning:
  > "Encountered two children with the same key."
  > Fixed by ensuring each price range has a unique `_id` (0, 1, 2, 3, 4, 5).

### **productRoutes.js**

- **Typo in route path:**  
  Route path contained typo: `/rproduct/:slug` instead of `/product/:slug`, breaking navigation to product detail pages.
  > Fixed: `rproduct` → `product` to restore proper routing.

---

**Total bugs fixed: 25 across 9 files**  
**Impact:** Improved user experience, eliminated crashes, fixed navigation, enhanced accessibility, and resolved all React warnings.

---

### John Michael San Diego (A0253342M)

### Frontend:

Unit Test

1. context/auth.js
2. pages/Auth/Register.js
3. pages/Auth/Login.js
4. components/AdminMenu.js
5. pages/AdminDashboard.js
6. pages/Auth/ForgotPassword.js
7. components/Route/Public.js

Integration Test

1. components/Route/Public.js
2. pages/Auth/Register.js
3. pages/Auth/Login.js
4. pages/AdminDashboard.js
5. pages/Auth/ForgotPassword.js

### Backend:

Unit Test

1. middlewares/authMiddleware.js
2. helpers/authHelper.js
3. controllers/authController.js

Integration Test

1. controllers/authController.js (registerController)
2. controllers/authController.js (loginController)
3. controllers/authController.js (forgotPasswordController)
4. routes/authRoute (register, login, forgot-password, user-auth, and admin-auth)

#### Misc:

- Jest integration test configurations
- Playwright configurations w/ setup and teardown global scripts

#### Bug Fix:

##### **authMiddleware.js**

- requireSignIn now returns appropriate response when error occurs
- remove console.errors

##### **authController.js**

- add status 400 for invalid registerController input payload
- fix typos such as ‘Emai’ to Email
- fix inconsistent casing of response messages throughout the controller
- remove dead code testController

##### **auth.js**

- add missing React import statement

##### **Register.js**

- add basic validations across the inputs instead of just a plain “required”
- fix placeholder case and trailing spaces
- accessible by authenticated users

##### **Login.js**

- add basic validation across inputs as well
- fix placeholder case and trailing spaces
- added fix toast success message fallback
- missing missing password
- accessible by authenticated users

##### **AdminDashboard.js**

- remove user link dead code

##### **ForgotPassword.js**

- Missing forgot password functionality so created such page and feature

##### **Public.js**

- Authenticated user can still access auth pages so implemented public route guard

---

### Rick Koh (A0255063J)

#### Frontend Unit Test:

1. components/Form/CategoryForm.js
2. components/Routes/AdminRoute.js
3. components/Routes/Private.js
4. components/UserMenu.js
5. pages/admin/AdminOrders.js
6. pages/admin/CreateCategory.js
7. pages/admin/CreateProduct.js
8. pages/admin/Products.js
9. pages/admin/UpdateProduct.js
10. pages/user/Dashboard.js

#### Frontend Integration Test:

1. pages/admin/CreateProduct.js
2. pages/admin/UpdateProduct.js
3. pages/admin/CreateCategory.js
4. pages/admin/AdminOrders.js
5. pages/admin/Products.js
6. components/Routes/Private.js
7. pages/user/Dashboard.js
8. components/UserMenu.js

#### Backend Test:

1. models/productModel.js
2. models/userModel.js

#### E2E Tests:

1. e2e/flows/admin-actions.spec.ts
2. e2e/flows/admin-view.spec.ts
3. e2e/flows/user-flows.spec.ts

#### Misc:

- config/db.js: Enhanced connection pooling for improved E2E testing
- playwright.config.ts: Enhanced configuration with workers
- e2e/utils/auth-helpers.ts: Implemented triple-layer defense in login functions to address timing issues

#### Bug Fix:

##### **Missing Dependencies & Linting**

- **react-icons dependency:** Added missing react-icons package in client
- **CreateCategory.js:** Added missing React `key` prop
- **CreateProduct.js & UpdateProduct.js:** Fixed AntDesign deprecated bordered prop
- **AdminOrders.js:** Fixed linting errors

##### **AdminRoute.js**

- Missing `try` and `catch` block in `authCheck` function as there could be network/axios errors

##### **Private.js**

- Missing `try` and `catch` block in `authCheck` function as there could be network/axios errors

##### **CreateProduct.js**

- Wrong toast message when creating product
- Missing shipping field in FormData - user selections for shipping were not being saved to database, causing data loss

##### **UpdateProduct.js**

- Wrong toast message when updating product
- Missing shipping field in FormData - shipping status changes were not persisted during product updates
- Broken shipping dropdown value - type inconsistency between boolean from API (yes/no) and string dropdown values caused dropdown to malfunction after user interaction. Fixed by converting boolean to string on load for consistent type handling

##### **AdminOrders.js**

- Wrong timestamp field name - used `createAt` instead of `createdAt`, causing order dates to not display correctly

##### **CreateCategory.js**

- Wrong toast message when creating category
