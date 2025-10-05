# CS4218 Project - Virtual Vault

## Github Workflow URL:

https://github.com/cs4218/cs4218-2510-ecom-project-team009/actions

## 1. Project member contributions

For each mentioned file/method, bug fixes and unit tests have been written for them by each member.

### Tabriz Pahlavi (A0233017U)

#### Frontend:

1. pages/user/Orders.js
2. pages/user/Profile.js
3. pages/admin/Users.js
4. components/Form/SearchInput.js
5. components/UserList.js
6. context/search.js
7. pages/Search.js

#### Backend:

1.  updateProfileController
2.  getOrdersController
3.  getAllOrdersController
4.  orderStatusController
5.  models/orderModel.js

---

### Winston Leonard Prayonggo (A0255823B)

#### Frontend:

1. pages/Homepage.js
2. context/cart.js
3. pages/CartPage.js
4. hooks/useCategory.js
5. pages/Categories.js

#### Backend:

1. controllers/categoryController.js
2. models/categoryModel.js

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

---

### Nicholas Chee (A0251980B)

### Frontend:

pages/ProductDetails.js
pages/CategoryProduct.js
pages/Contact.js
pages/Policy.js
pages/About.js
pages/Pagenotfound.js
components/Footer.js
components/Header.js
components/Layout.js
components/Spinner.js

### Backend:

controllers/productController.js
models/productModel.js
config/db.js

---
