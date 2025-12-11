/* ============================================================
   Simple Ecommerce Frontend for Express + SQLite API
   Core Logic: Auth, Products, Cart, Checkout
============================================================ */

const API_BASE_URL = "http://localhost:5000";

/* ===========================
   Helper: Toast Notification
=========================== */
function showToast(msg, duration = 2000) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = msg;
    toast.classList.remove("hidden");

    setTimeout(() => {
        toast.classList.add("hidden");
    }, duration);
}

/* ===========================
   Helper: API Request Wrapper
=========================== */
async function apiRequest(path, method = "GET", body = null, auth = false) {
    const headers = {
        "Content-Type": "application/json",
    };

    if (auth) {
        const token = localStorage.getItem("token");
        if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(API_BASE_URL + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "API Error" }));
        throw new Error(error.message || "API error");
    }

    return res.json();
}

/* ===========================
   Helper: Update Cart Count Badge
=========================== */
async function updateCartCount() {
    const badge = document.getElementById("floatingCartCount");
    if (!badge) return;

    try {
        const cart = await apiRequest("/api/cart", "GET", null, true);
        badge.textContent = cart.items.length || 0;
    } catch {
        badge.textContent = "0";
    }
}

/* ===========================
   Helper: Set Nav User State
=========================== */
function applyNavUserState() {
    const navUser = document.getElementById("navUserSection");
    if (!navUser) return;

    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (token && user) {
        navUser.innerHTML = `
      <span class="nav-username">👤 ${user.name}</span>
      <button class="btn btn-light-outline" id="logoutBtn">Logout</button>
    `;

        document.getElementById("logoutBtn").onclick = () => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            showToast("Logged out");
            setTimeout(() => (location.href = "index.html"), 700);
        };
    }
}

/* ===========================
   Products Page Loader (Home)
=========================== */
async function loadProductsPage() {
    const page = document.body.getAttribute("data-page");
    if (page !== "home") return;

    const productsGrid = document.getElementById("productsGrid");
    const emptyState = document.getElementById("productsEmptyState");
    const filterCategory = document.getElementById("filterCategory");
    const filterSearch = document.getElementById("filterSearch");
    const filterPrice = document.getElementById("filterPrice");
    const filterApplyBtn = document.getElementById("filterApplyBtn");

    /* Load Categories Dropdown */
    try {
        const categories = await apiRequest("/api/categories");
        categories.forEach((cat) => {
            const opt = document.createElement("option");
            opt.value = cat.id;
            opt.textContent = cat.name;
            filterCategory.appendChild(opt);
        });
    } catch (err) {
        console.error("Category load error", err);
    }

    /* Load Products with Filters */
    async function loadProducts() {
        productsGrid.innerHTML = `<p>Loading...</p>`;

        let query = [];
        let category = filterCategory.value;
        let search = filterSearch.value.trim();
        let price = filterPrice.value;

        if (category) query.push(`category=${category}`);
        if (search) query.push(`search=${encodeURIComponent(search)}`);

        if (price === "1") query.push(`maxPrice=999`);
        if (price === "2") {
            query.push(`minPrice=1000`);
            query.push(`maxPrice=5000`);
        }
        if (price === "3") query.push(`minPrice=5000`);

        const endpoint = "/api/products" + (query.length ? "?" + query.join("&") : "");

        try {
            const products = await apiRequest(endpoint);

            productsGrid.innerHTML = "";
            emptyState.classList.add("hidden");

            if (!products.length) {
                emptyState.classList.remove("hidden");
                return;
            }

            products.forEach((p) => {
                const card = document.createElement("div");
                card.className = "product-card";

                card.innerHTML = `
          <div class="product-image-wrapper">
            <img src="${p.image_url}" class="product-image" />
          </div>
          <div class="product-title">${p.name}</div>
          <div class="product-desc">${p.description}</div>
          <div class="product-meta">
            <span class="product-price">₹${p.price}</span>
            <span class="product-badge">${p.stock > 0 ? "In Stock" : "Out of Stock"}</span>
          </div>
          <div class="product-actions">
            <button class="btn btn-primary btn-sm addToCartBtn">Add to Cart</button>
          </div>
        `;

                card.querySelector(".addToCartBtn").onclick = () => {
                    addToCart(p.id);
                };

                productsGrid.appendChild(card);
            });
        } catch (err) {
            productsGrid.innerHTML = `<p style="color:red;">Error loading products</p>`;
            console.error(err);
        }
    }

    filterApplyBtn.onclick = loadProducts;

    loadProducts();
}

/* ===========================
   Add to Cart
=========================== */
async function addToCart(productId) {
    try {
        await apiRequest(
            "/api/cart/items",
            "POST",
            { product_id: productId, quantity: 1 },
            true
        );

        showToast("Added to cart");
        updateCartCount();
    } catch (err) {
        showToast("Login required");
        setTimeout(() => {
            location.href = "login.html";
        }, 800);
    }
}

/* ===========================
   Auth Pages Handler
=========================== */
function authPagesInit() {
    const page = document.body.getAttribute("data-page");
    if (page !== "login" && page !== "register") return;

    /* LOGIN PAGE */
    if (page === "login") {
        const form = document.getElementById("loginForm");

        form.onsubmit = async (e) => {
            e.preventDefault();

            const email = form.email.value.trim();
            const password = form.password.value.trim();

            try {
                const res = await apiRequest("/api/auth/login", "POST", {
                    email,
                    password,
                });

                localStorage.setItem("token", res.token);
                localStorage.setItem("user", JSON.stringify(res.user));

                showToast("Login successful");
                setTimeout(() => (location.href = "index.html"), 900);
            } catch (err) {
                showToast(err.message);
            }
        };
    }

    /* REGISTER PAGE */
    if (page === "register") {
        const form = document.getElementById("registerForm");

        form.onsubmit = async (e) => {
            e.preventDefault();

            const name = form.name.value.trim();
            const email = form.email.value.trim();
            const password = form.password.value.trim();
            const phone = form.phone.value.trim();

            try {
                await apiRequest("/api/auth/register", "POST", {
                    name,
                    email,
                    password,
                    phone
                });

                showToast("Account created");
                setTimeout(() => (location.href = "login.html"), 800);
            } catch (err) {
                showToast(err.message);
            }
        };
    }
}

/* ===========================
   Cart Page Logic
=========================== */
async function loadCartPage() {
    const page = document.body.getAttribute("data-page");
    if (page !== "cart") return;

    const cartTable = document.getElementById("cartTable");
    const tbody = document.getElementById("cartItemsBody");
    const emptyState = document.getElementById("cartEmptyState");
    const itemsTotalEl = document.getElementById("cartItemsTotal");
    const grandTotalEl = document.getElementById("cartGrandTotal");
    const goToCheckoutBtn = document.getElementById("goToCheckoutBtn");

    async function refreshCart() {
        try {
            const cart = await apiRequest("/api/cart", "GET", null, true);

            tbody.innerHTML = "";
            let itemsTotal = 0;

            if (!cart.items.length) {
                cartTable.classList.add("hidden");
                emptyState.classList.remove("hidden");
            } else {
                cartTable.classList.remove("hidden");
                emptyState.classList.add("hidden");
            }

            cart.items.forEach((item) => {
                const row = document.createElement("tr");
                const subtotal = item.price * item.quantity;
                itemsTotal += subtotal;

                row.innerHTML = `
          <td>${item.name}</td>
          <td>₹${item.price}</td>
          <td>
            <input 
              type="number" 
              min="1" 
              value="${item.quantity}" 
              class="input input-qty" 
              data-cart-item-id="${item.id}"
            />
          </td>
          <td>₹${subtotal}</td>
          <td>
            <button class="btn btn-light-outline btn-sm" data-remove-id="${item.id}">
              ✕
            </button>
          </td>
        `;

                tbody.appendChild(row);
            });

            itemsTotalEl.textContent = `₹${itemsTotal}`;
            grandTotalEl.textContent = `₹${itemsTotal}`;
            updateCartCount();
        } catch (err) {
            showToast("Login required");
            setTimeout(() => (location.href = "login.html"), 800);
        }
    }

    // Handle qty change & remove
    tbody.addEventListener("change", async (e) => {
        const input = e.target;
        if (input.matches("input[data-cart-item-id]")) {
            const id = input.getAttribute("data-cart-item-id");
            const quantity = parseInt(input.value, 10);

            if (!quantity || quantity < 1) {
                input.value = 1;
                return;
            }

            try {
                await apiRequest(
                    `/api/cart/items/${id}`,
                    "PUT",
                    { quantity },
                    true
                );
                showToast("Cart updated");
                refreshCart();
            } catch (err) {
                showToast("Update failed");
                console.error(err);
            }
        }
    });

    tbody.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-remove-id]");
        if (!btn) return;

        const id = btn.getAttribute("data-remove-id");

        try {
            await apiRequest(`/api/cart/items/${id}`, "DELETE", null, true);
            showToast("Item removed");
            refreshCart();
        } catch (err) {
            showToast("Remove failed");
            console.error(err);
        }
    });

    goToCheckoutBtn.onclick = () => {
        location.href = "checkout.html";
    };

    // Initial load
    refreshCart();
}

/* ===========================
   Checkout Page Logic (With Delivery Address)
=========================== */
async function checkoutPageInit() {
    const page = document.body.getAttribute("data-page");
    if (page !== "checkout") return;

    const tbody = document.getElementById("checkoutItemsBody");
    const table = document.getElementById("checkoutTable");
    const emptyState = document.getElementById("checkoutEmptyState");

    // Summary elements
    const subtotalEl = document.getElementById("checkoutSubtotal");
    const discountRow = document.getElementById("discountRow");
    const discountCodeLabel = document.getElementById("discountCodeLabel");
    const discountAmountLabel = document.getElementById("discountAmountLabel");
    const totalEl = document.getElementById("checkoutTotal");

    // Payment
    const form = document.getElementById("checkoutForm");
    const paymentMethodSelect = document.getElementById("paymentMethod");
    const resultBox = document.getElementById("checkoutResult");

    // CARD elements
    const cardBox = document.getElementById("cardPaymentBox");
    const cardNumber = document.getElementById("cardNumber");
    const cardExpMonth = document.getElementById("cardExpiryMonth");
    const cardExpYear = document.getElementById("cardExpiryYear");
    const cardCVV = document.getElementById("cardCVV");

    // Address
    const addressForm = document.getElementById("addressForm");
    const addrFullName = document.getElementById("addrFullName");
    const addrPhone = document.getElementById("addrPhone");
    const addrLine1 = document.getElementById("addrLine1");
    const addrLine2 = document.getElementById("addrLine2");
    const addrCity = document.getElementById("addrCity");
    const addrState = document.getElementById("addrState");
    const addrPostal = document.getElementById("addrPostal");
    const addrCountry = document.getElementById("addrCountry");

    // Coupon
    const couponInput = document.getElementById("couponInput");
    const applyCouponBtn = document.getElementById("applyCouponBtn");
    const couponResult = document.getElementById("couponResult");

    let appliedCoupon = null;
    let discountAmount = 0;
    let currentTotal = 0;

    /* SHOW / HIDE CARD BOX */
    paymentMethodSelect.onchange = () => {
        if (paymentMethodSelect.value === "card") {
            cardBox.classList.remove("hidden");
        } else {
            cardBox.classList.add("hidden");
        }
    };

    /* LOAD SAVED ADDRESS */
    async function loadSavedAddress() {
        try {
            const saved = await apiRequest("/api/user/address", "GET", null, true);
            if (saved) {
                addrFullName.value = saved.full_name;
                addrPhone.value = saved.phone;
                addrLine1.value = saved.address_line1;
                addrLine2.value = saved.address_line2;
                addrCity.value = saved.city;
                addrState.value = saved.state;
                addrPostal.value = saved.postal_code;
                addrCountry.value = saved.country;
            }
        } catch { }
    }

    /* SAVE ADDRESS */
    addressForm.onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            full_name: addrFullName.value,
            phone: addrPhone.value,
            address_line1: addrLine1.value,
            address_line2: addrLine2.value,
            city: addrCity.value,
            state: addrState.value,
            postal_code: addrPostal.value,
            country: addrCountry.value
        };
        try {
            await apiRequest("/api/user/address", "POST", data, true);
            showToast("Address saved!");
        } catch {
            showToast("Failed to save address");
        }
    };

    /* LOAD CART ITEMS */
    async function loadCheckoutCart() {
        try {
            const cart = await apiRequest("/api/cart", "GET", null, true);

            tbody.innerHTML = "";
            currentTotal = 0;
            discountAmount = 0;
            appliedCoupon = null;

            couponResult.textContent = "";
            discountRow.style.display = "none";
            totalEl.textContent = "₹0";

            if (!cart.items.length) {
                table.classList.add("hidden");
                emptyState.classList.remove("hidden");
                form.classList.add("hidden");
                return;
            }

            table.classList.remove("hidden");
            emptyState.classList.add("hidden");
            form.classList.remove("hidden");

            cart.items.forEach(item => {
                const subtotal = item.price * item.quantity;
                currentTotal += subtotal;

                tbody.innerHTML += `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>₹${item.price}</td>
                        <td>₹${subtotal}</td>
                    </tr>
                `;
            });

            subtotalEl.textContent = `₹${currentTotal}`;
            totalEl.textContent = `₹${currentTotal}`;
        } catch {
            showToast("Login required");
            setTimeout(() => location.href = "login.html", 800);
        }
    }

    /* APPLY COUPON */
    applyCouponBtn.onclick = async () => {
        const code = couponInput.value.trim();
        if (!code) return showToast("Enter a coupon");

        try {
            const res = await apiRequest("/api/coupons/validate", "POST", {
                code,
                cart_total: currentTotal
            }, true);

            appliedCoupon = res.coupon;
            discountAmount = res.discount;

            discountRow.style.display = "flex";
            discountCodeLabel.textContent = appliedCoupon.code;
            discountAmountLabel.textContent = `-₹${discountAmount}`;
            totalEl.textContent = `₹${res.final_total}`;

            couponResult.textContent = `Coupon Applied! You saved ₹${discountAmount}`;
            showToast("Coupon applied");
        } catch (err) {
            appliedCoupon = null;
            discountAmount = 0;

            discountRow.style.display = "none";
            totalEl.textContent = `₹${currentTotal}`;

            couponResult.textContent = "Invalid coupon";
            showToast(err.message);
        }
    };

    /* PLACE ORDER */
    form.onsubmit = async (e) => {
        e.preventDefault();

        // Validate Address
        if (
            !addrFullName.value || !addrPhone.value || !addrLine1.value ||
            !addrCity.value || !addrState.value || !addrPostal.value || !addrCountry.value
        ) {
            showToast("Please enter complete address");
            return;
        }

        // Save address
        await apiRequest("/api/user/address", "POST", {
            full_name: addrFullName.value,
            phone: addrPhone.value,
            address_line1: addrLine1.value,
            address_line2: addrLine2.value,
            city: addrCity.value,
            state: addrState.value,
            postal_code: addrPostal.value,
            country: addrCountry.value
        }, true);

        const payment_method = paymentMethodSelect.value;

        // Build request body
        const reqBody = {
            payment_method,
            coupon_code: appliedCoupon ? appliedCoupon.code : null,
            discount: discountAmount
        };

        // Card Payment
        if (payment_method === "card") {
            reqBody.card = {
                number: cardNumber.value,
                exp_month: cardExpMonth.value,
                exp_year: cardExpYear.value,
                cvv: cardCVV.value
            };
        }

        try {
            const res = await apiRequest("/api/checkout", "POST", reqBody, true);

            showToast("Order placed!");

            resultBox.classList.remove("hidden");
            resultBox.innerHTML = `
                <strong>Success!</strong><br>
                Order ID: ${res.order_id}<br>
                Amount Paid: ₹${res.final_amount}<br>
                Payment: ${res.payment_method}<br>
                ${appliedCoupon ? `Coupon Applied: ${appliedCoupon.code}` : ""}
            `;

            loadCheckoutCart();
            updateCartCount();

            setTimeout(() => location.href = "index.html", 2000);
        } catch (err) {
            showToast(err.message || "Checkout failed");
        }
    };

    loadCheckoutCart();
    loadSavedAddress();
}

/* ============================================================
   ADMIN PANEL — PRODUCT MANAGEMENT
============================================================ */

/* ============================================================
   ADMIN PANEL (FULLY FIXED VERSION)
============================================================ */

function adminPanelInit() {
    const page = document.body.getAttribute("data-page");
    if (page !== "admin") return;

    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (!token || !user || !user.is_admin) {
        showToast("Admin access required");
        setTimeout(() => location.href = "login.html", 1200);
        return;
    }

    /* ---------------- TAB SWITCHING ---------------- */
    document.querySelectorAll(".admin-tab-btn").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".admin-tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".admin-tab").forEach(tab => tab.classList.remove("active"));

            btn.classList.add("active");
            document.getElementById("tab-" + btn.dataset.tab).classList.add("active");

            switch (btn.dataset.tab) {
                case "dashboard": loadAdminDashboard(); break;
                case "products": loadAdminProducts(); break;
                case "categories": loadAdminCategories(); break;
                case "users": loadAdminUsers(); break;
                case "orders": loadAdminOrders(); break;
                case "coupons": loadAdminCoupons(); break;
            }
        };
    });

    /* ---------------- PRODUCT MODAL ---------------- */
    const productModal = document.getElementById("productModal");
    const productForm = document.getElementById("productForm");

    const openProductModal = (edit = false, data = null) => {
        productModal.classList.remove("hidden");

        if (edit) {
            document.getElementById("productModalTitle").textContent = "Edit Product";
            document.getElementById("productId").value = data.id;
            document.getElementById("productName").value = data.name;
            document.getElementById("productDescription").value = data.description;
            document.getElementById("productPrice").value = data.price;
            document.getElementById("productStock").value = data.stock;
            document.getElementById("productCategory").value = data.category_id;
            document.getElementById("productImage").value = data.image_url;
        } else {
            document.getElementById("productModalTitle").textContent = "Add Product";
            productForm.reset();
            document.getElementById("productId").value = "";
        }
    };

    const closeProductModal = () => productModal.classList.add("hidden");
    document.getElementById("closeProductModal").onclick = closeProductModal;

    async function loadAdminCategoriesIntoSelect() {
        const select = document.getElementById("productCategory");
        select.innerHTML = "";
        const categories = await apiRequest("/api/categories");

        categories.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = c.name;
            select.appendChild(opt);
        });
    }

    /* ---------------- LOAD PRODUCTS ---------------- */
    async function loadAdminProducts() {
        await loadAdminCategoriesIntoSelect();

        const container = document.getElementById("adminProductsList");
        container.innerHTML = "<p>Loading...</p>";

        try {
            const products = await apiRequest("/api/products");

            let html = `
            <table class="table">
              <thead>
                <tr>
                  <th>Name</th><th>Price</th><th>Stock</th><th>Category</th><th></th>
                </tr>
              </thead>
              <tbody>
            `;

            products.forEach(p => {
                html += `
                <tr>
                  <td>${p.name}</td>
                  <td>₹${p.price}</td>
                  <td>${p.stock}</td>
                  <td>${p.category_id}</td>
                  <td>
                    <button class="action-btn action-edit" data-edit="${p.id}">Edit</button>
                    <button class="action-btn action-delete" data-delete="${p.id}">Delete</button>
                  </td>
                </tr>`;
            });

            html += "</tbody></table>";
            container.innerHTML = html;

            container.querySelectorAll("[data-edit]").forEach(btn => {
                btn.onclick = async () => {
                    const id = btn.dataset.edit;
                    const product = await apiRequest(`/api/products/${id}`);
                    openProductModal(true, product);
                };
            });

            container.querySelectorAll("[data-delete]").forEach(btn => {
                btn.onclick = async () => {
                    const id = btn.dataset.delete;
                    if (!confirm("Delete product?")) return;

                    await apiRequest(`/api/admin/products/${id}`, "DELETE", null, true);
                    showToast("Product deleted");
                    loadAdminProducts();
                };
            });

        } catch {
            container.innerHTML = "<p style='color:red;'>Failed to load products</p>";
        }
    }

    /* SAVE PRODUCT */
    productForm.onsubmit = async e => {
        e.preventDefault();

        const id = document.getElementById("productId").value;
        const data = {
            name: document.getElementById("productName").value,
            description: document.getElementById("productDescription").value,
            price: Number(document.getElementById("productPrice").value),
            stock: Number(document.getElementById("productStock").value),
            category_id: Number(document.getElementById("productCategory").value),
            image_url: document.getElementById("productImage").value
        };

        if (id) {
            await apiRequest(`/api/admin/products/${id}`, "PUT", data, true);
            showToast("Product updated");
        } else {
            await apiRequest(`/api/admin/products`, "POST", data, true);
            showToast("Product added");
        }

        closeProductModal();
        loadAdminProducts();
    };

    document.getElementById("adminAddProductBtn").onclick = () =>
        openProductModal(false);

    /* ---------------- CATEGORY MODAL + CRUD ---------------- */

    const categoryModal = document.getElementById("categoryModal");
    const categoryForm = document.getElementById("categoryForm");
    const categoryModalTitle = document.getElementById("categoryModalTitle");

    function openCategoryModal(edit = false, data = null) {
        categoryModal.classList.remove("hidden");

        if (edit) {
            categoryModalTitle.textContent = "Edit Category";
            document.getElementById("categoryId").value = data.id;
            document.getElementById("categoryName").value = data.name;
        } else {
            categoryModalTitle.textContent = "Add Category";
            categoryForm.reset();
            document.getElementById("categoryId").value = "";   // 🔥 IMPORTANT
        }
    }

    function closeCategoryModal() {
        categoryModal.classList.add("hidden");
    }
    document.getElementById("closeCategoryModal").onclick = closeCategoryModal;

    async function loadAdminCategories() {
        const container = document.getElementById("adminCategoriesList");
        container.innerHTML = "<p>Loading...</p>";

        try {
            const categories = await apiRequest("/api/categories");

            let html = `
        <table class="table">
          <thead><tr><th>Name</th><th></th></tr></thead>
          <tbody>
        `;

            categories.forEach(c => {
                html += `
            <tr>
              <td>${c.name}</td>
              <td>
                <button class="action-btn action-edit" data-edit-cat="${c.id}">Edit</button>
                <button class="action-btn action-delete" data-delete-cat="${c.id}">Delete</button>
              </td>
            </tr>`;
            });

            html += "</tbody></table>";
            container.innerHTML = html;

            container.querySelectorAll("[data-edit-cat]").forEach(btn => {
                btn.onclick = () => {
                    openCategoryModal(true, {
                        id: btn.dataset.editCat,
                        name: btn.closest("tr").children[0].textContent
                    });
                };
            });

            container.querySelectorAll("[data-delete-cat]").forEach(btn => {
                btn.onclick = async () => {
                    if (!confirm("Delete category?")) return;

                    await apiRequest(`/api/admin/categories/${btn.dataset.deleteCat}`, "DELETE", null, true);
                    showToast("Category deleted");
                    loadAdminCategories();
                };
            });

        } catch {
            container.innerHTML = "<p>Error loading categories</p>";
        }
    }

    categoryForm.onsubmit = async (e) => {
        e.preventDefault();

        const id = document.getElementById("categoryId").value;
        const name = document.getElementById("categoryName").value;

        if (id) {
            await apiRequest(`/api/admin/categories/${id}`, "PUT", { name }, true);
            showToast("Category updated");
        } else {
            await apiRequest(`/api/admin/categories`, "POST", { name }, true);
            showToast("Category added");
        }

        closeCategoryModal();
        loadAdminCategories();
    };

    document.getElementById("adminAddCategoryBtn").onclick = () =>
        openCategoryModal(false);


    /* ---------------- USERS ---------------- */
    async function loadAdminUsers() {
        const box = document.getElementById("adminUsersList");
        box.innerHTML = "<p>Loading...</p>";

        try {
            const users = await apiRequest("/api/admin/users", "GET", null, true);

            let html = `
            <table class="table">
              <thead><tr><th>Name</th><th>Email</th><th>Admin</th></tr></thead>
              <tbody>
            `;

            users.forEach(u => {
                html += `
                <tr>
                  <td>${u.name}</td>
                  <td>${u.email}</td>
                  <td>${u.is_admin ? "Yes" : "No"}</td>
                </tr>`;
            });

            html += "</tbody></table>";
            box.innerHTML = html;

        } catch {
            box.innerHTML = "<p>Error loading users</p>";
        }
    }

    /* ---------------- ORDERS ---------------- */
    /* ============================================================
   ADMIN — ORDERS LIST (UPDATED FOR COUPONS)
============================================================ */
    async function loadAdminOrders() {
        const box = document.getElementById("adminOrdersList");
        box.innerHTML = "<p>Loading...</p>";

        try {
            const orders = await apiRequest("/api/admin/orders", "GET", null, true);

            let html = `
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>User Email</th>
            <th>Subtotal</th>
            <th>Discount</th>
            <th>Final Total</th>
            <th>Payment</th>
            <th>Status</th>
            <th>Update</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
    `;

            const ALL_STATUS = [
                "PLACED",
                "PACKED",
                "SHIPPED",
                "OUT_FOR_DELIVERY",
                "DELIVERED"
            ];

            orders.forEach(o => {
                html += `
        <tr>
          <td>${o.id}</td>
          <td>${o.user_email}</td>
          <td>₹${o.subtotal}</td>
          <td>₹${o.discount}</td>
          <td><strong>₹${o.final_total}</strong></td>
          <td>${o.payment_method || "N/A"}</td>

          <td>
            <span class="badge">${o.status}</span>
          </td>

          <td>
            <select class="input input-select admin-status-select" data-order-id="${o.id}">
              <option value="">-- Change --</option>
              ${ALL_STATUS
                        .map(s => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`)
                        .join("")}
            </select>

            <button class="btn btn-primary btn-sm" data-update-status="${o.id}">
              Save
            </button>
          </td>

          <td>${o.created_at}</td>
        </tr>
      `;
            });

            html += `</tbody></table>`;
            box.innerHTML = html;

            // Handle Status Update Button
            box.querySelectorAll("[data-update-status]").forEach(btn => {
                btn.onclick = async () => {
                    const orderId = btn.dataset.updateStatus;
                    const select = box.querySelector(`select[data-order-id="${orderId}"]`);
                    const newStatus = select.value;

                    if (!newStatus) {
                        showToast("Select a status first");
                        return;
                    }

                    try {
                        await apiRequest(`/api/admin/orders/${orderId}/status`, "PUT", {
                            status: newStatus
                        }, true);

                        showToast("Order status updated");
                        loadAdminOrders(); // Refresh table after update
                    } catch (err) {
                        console.error(err);
                        showToast("Error updating status");
                    }
                };
            });

        } catch (err) {
            console.error(err);
            box.innerHTML = "<p>Error loading orders</p>";
        }
    }


    /* ============================================================
   ADMIN — COUPONS MANAGEMENT
============================================================ */

    function openCouponModal(edit = false, data = null) {
        const modal = document.getElementById("couponModal");
        modal.classList.remove("hidden");
        console.log("Opening coupon modal", edit, data);
        if (edit) {
            document.getElementById("couponModalTitle").textContent = "Edit Coupon";
            document.getElementById("couponId").value = data.id;
            document.getElementById("couponCode").value = data.code;
            document.getElementById("couponType").value = data.discount_type;
            document.getElementById("couponAmount").value = data.discount_value;
            document.getElementById("couponMinValue").value = data.min_amount;
            document.getElementById("couponExpiry").value = data.expires_at;
            document.getElementById("couponStatus").value = data.is_active ? 1 : 0;
        } else {
            document.getElementById("couponModalTitle").textContent = "Add Coupon";
            document.getElementById("couponForm").reset();
            document.getElementById("couponId").value = "";
        }
    }

    document.getElementById("closeCouponModal").onclick = () => {
        document.getElementById("couponModal").classList.add("hidden");
    };

    document.getElementById("adminAddCouponBtn").onclick = () =>
        openCouponModal(false);

    /* LOAD COUPONS TABLE */
    async function loadAdminCoupons() {
        const box = document.getElementById("adminCouponsList");

        box.innerHTML = "<p>Loading...</p>";
        try {
            const coupons = await apiRequest("/api/admin/coupons", "GET", null, true);

            let html = `
      <table class="table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Discount Type</th>
            <th>Discount Value</th>
            <th>Min Cart</th>
            <th>Expiry</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
    `;

            coupons.forEach(c => {
                html += `
        <tr>
          <td>${c.code}</td>
          <td>${c.discount_type}</td>
          <td>₹${c.discount_value}</td>
          <td>₹${c.min_amount}</td>
          <td>${c.expires_at}</td>
          <td>${c.is_active ? "Active" : "Inactive"}</td>
          <td>
            <button class="action-btn action-edit" data-edit-coupon="${c.id}">Edit</button>
            <button class="action-btn action-delete" data-delete-coupon="${c.id}">Delete</button>
          </td>
        </tr>
      `;
            });

            html += `</tbody></table>`;
            box.innerHTML = html;

            // Edit
            box.querySelectorAll("[data-edit-coupon]").forEach(btn => {
                btn.onclick = async () => {
                    const id = btn.dataset.editCoupon;
                    const coupon = await apiRequest(`/api/admin/coupons/${id}`, "GET", null, true);
                    openCouponModal(true, coupon);
                };
            });

            // Delete
            box.querySelectorAll("[data-delete-coupon]").forEach(btn => {
                btn.onclick = async () => {
                    const id = btn.dataset.deleteCoupon;
                    if (!confirm("Delete this coupon?")) return;

                    await apiRequest(`/api/admin/coupons/${id}`, "DELETE", null, true);
                    showToast("Coupon deleted");
                    loadAdminCoupons();
                };
            });

        } catch (err) {
            box.innerHTML = "<p>Error loading coupons</p>";
        }
    }

    /* SAVE COUPON */
    const couponForm = document.getElementById("couponForm");
    couponForm.onsubmit = async (e) => {
        e.preventDefault();

        const id = document.getElementById("couponId").value;

        const data = {
            code: document.getElementById("couponCode").value,
            discount_type: document.getElementById("couponType").value,
            discount_value: parseInt(document.getElementById("couponAmount").value),
            min_amount: parseInt(document.getElementById("couponMinValue").value),
            expires_at: document.getElementById("couponExpiry").value,
            is_active: parseInt(document.getElementById("couponStatus").value)
        };

        try {
            if (id) {
                await apiRequest(`/api/admin/coupons/${id}`, "PUT", data, true);
                showToast("Coupon updated");
            } else {
                await apiRequest("/api/admin/coupons", "POST", data, true);
                showToast("Coupon added");
            }

            document.getElementById("couponModal").classList.add("hidden");
            loadAdminCoupons();

        } catch (err) {
            showToast(err.message);
        }
    };


    /* ---------------- DASHBOARD ---------------- */
    async function loadAdminDashboard() {
        const stats = document.getElementById("adminDashboardStats");
        stats.innerHTML = "<p>Loading...</p>";

        try {
            const s = await apiRequest("/api/admin/dashboard", "GET", null, true);

            stats.innerHTML = `
            <div class="card"><div class="card-body"><h3>Users</h3><p>${s.total_users}</p></div></div>
            <div class="card"><div class="card-body"><h3>Products</h3><p>${s.total_products}</p></div></div>
            <div class="card"><div class="card-body"><h3>Orders</h3><p>${s.total_orders}</p></div></div>
            <div class="card"><div class="card-body"><h3>Revenue</h3><p>₹${s.total_revenue}</p></div></div>`;
        } catch {
            stats.innerHTML = "<p>Error loading dashboard</p>";
        }
    }

    // Load Dashboard initially
    loadAdminDashboard();
}


/* ===========================
   On Page Load
=========================== */
document.addEventListener("DOMContentLoaded", () => {
    applyNavUserState();
    authPagesInit();
    loadProductsPage();
    loadCartPage();
    checkoutPageInit();
    adminPanelInit();   // <-- ADD THIS
    updateCartCount();
    loadUserOrders();
    loadAdminCards();
    profilePageInit();
    forgotPasswordInit();
    resetPasswordInit();

    const footerYear = document.getElementById("footerYear");
    if (footerYear) footerYear.textContent = new Date().getFullYear();
});


function loadUserOrders() {
    const page = document.body.getAttribute("data-page");
    if (page !== "orders") return;

    const ordersBox = document.getElementById("ordersList");

    apiRequest("/api/user/orders", "GET", null, true)
        .then(orders => {
            if (!orders.length) {
                ordersBox.innerHTML = "<p>You have no orders yet.</p>";
                return;
            }

            let html = "";
            orders.forEach(o => {
                html += `
                <div class="order-card">
                    <div>
                        <h4>Order #${o.id}</h4>
                        <p>Date: ${o.created_at}</p>
                        <p>Status: <strong>${o.status}</strong></p>
                    </div>
                    <div>
                        <p>Total: ₹${o.total_amount}</p>
                        <p>Discount: ₹${o.discount}</p>
                        <p><strong>Paid:</strong> ₹${o.final_amount}</p>
                    </div>
                    <button class="btn btn-light-outline" data-view-order="${o.id}">
                        View Items
                    </button>
                </div>
                `;
            });

            ordersBox.innerHTML = html;

            // View details
            document.querySelectorAll("[data-view-order]").forEach(btn => {
                btn.onclick = () => loadOrderItems(btn.dataset.viewOrder);
            });

        })
        .catch(() => {
            ordersBox.innerHTML = "<p>Error loading orders.</p>";
        });
}


function loadOrderItems(orderId) {
    const modal = document.getElementById("orderDetailsModal");
    const box = document.getElementById("orderItemsContainer");

    modal.classList.remove("hidden");
    box.innerHTML = "<p>Loading...</p>";

    apiRequest(`/api/user/orders/${orderId}/items`, "GET", null, true)
        .then(items => {

            if (!items.length) {
                box.innerHTML = "<p>No items found for this order.</p>";
                return;
            }

            let html = "";

            items.forEach(it => {
                html += `
                <div class="order-item">
                    <img src="${it.image_url}" alt="">
                    <div>
                        <p><strong>${it.name}</strong></p>
                        <p>Qty: ${it.quantity}</p>
                        <p>Price: ₹${it.price}</p>
                    </div>
                </div>
                `;
            });

            box.innerHTML = html;
        });

    document.getElementById("closeOrderDetails").onclick = () =>
        modal.classList.add("hidden");
}

function openCardModal(edit = false, data = null) {
    const modal = document.getElementById("cardModal");
    modal.classList.remove("hidden");

    if (edit) {
        document.getElementById("cardModalTitle").textContent = "Edit Credit Card";

        document.getElementById("cardId").value = data.id;
        document.getElementById("cardNumberInput").value = data.card_number;
        document.getElementById("cardHolderInput").value = data.card_holder;
        document.getElementById("cardExpiryMonthInput").value = data.expiry_month;
        document.getElementById("cardExpiryYearInput").value = data.expiry_year;
        document.getElementById("cardCVVInput").value = data.cvv;
        document.getElementById("cardLimitInput").value = data.balance;
        document.getElementById("cardStatusInput").value = data.status;

    } else {
        document.getElementById("cardModalTitle").textContent = "Add Credit Card";
        document.getElementById("cardForm").reset();
        document.getElementById("cardId").value = "";
    }
}

document.getElementById("closeCardModal").onclick = () =>
    document.getElementById("cardModal").classList.add("hidden");

document.getElementById("adminAddCardBtn").onclick = () =>
    openCardModal(false);

async function loadAdminCards() {
    const box = document.getElementById("adminCardsList");
    box.innerHTML = "<p>Loading...</p>";

    try {
        const cards = await apiRequest("/api/admin/cards", "GET", null, true);
        let html = `
        <table class="table">
            <thead>
                <tr>
                    <th>Card Number</th>
                    <th>Holder</th>
                    <th>Expiry</th>
                    <th>Limit</th>
                    <th>Status</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
        `;
        cards.forEach(c => {
            html += `
            <tr>
                <td>${c.card_number}</td>
                <td>${c.card_holder}</td>
                <td>${c.expiry_month}/${c.expiry_year}</td>
                <td>₹${c.balance}</td>
                <td>${c.status}</td>
                <td>
                    <button class="action-btn action-edit" data-edit-card="${c.id}">Edit</button>
                    <button class="action-btn action-delete" data-delete-card="${c.id}">Delete</button>
                </td>
            </tr>
            `;
        });

        html += `</tbody></table>`;
        box.innerHTML = html;

        // Edit button
        box.querySelectorAll("[data-edit-card]").forEach(btn => {
            btn.onclick = async () => {
                const card = await apiRequest(`/api/admin/cards/${btn.dataset.editCard}`, "GET", null, true);
                openCardModal(true, card);
            };
        });

        // Delete
        box.querySelectorAll("[data-delete-card]").forEach(btn => {
            btn.onclick = async () => {
                if (confirm("Delete this card?")) {
                    await apiRequest(`/api/admin/cards/${btn.dataset.deleteCard}`, "DELETE", null, true);
                    showToast("Card deleted");
                    loadAdminCards();
                }
            };
        });

    } catch {
        box.innerHTML = "<p>Error loading credit cards</p>";
    }
}

document.getElementById("cardForm").onsubmit = async (e) => {
    e.preventDefault();

    const id = document.getElementById("cardId").value;

    const data = {
        card_number: document.getElementById("cardNumberInput").value,
        card_holder: document.getElementById("cardHolderInput").value,
        expiry_month: document.getElementById("cardExpiryMonthInput").value,
        expiry_year: document.getElementById("cardExpiryYearInput").value,
        cvv: document.getElementById("cardCVVInput").value,
        balance: parseInt(document.getElementById("cardLimitInput").value),
        status: document.getElementById("cardStatusInput").value
    };

    if (id) {
        await apiRequest(`/api/admin/cards/${id}`, "PUT", data, true);
        showToast("Card updated");
    } else {
        await apiRequest(`/api/admin/cards`, "POST", data, true);
        showToast("Card added");
    }

    document.getElementById("cardModal").classList.add("hidden");
    loadAdminCards();
};

async function profilePageInit() {
    const page = document.body.getAttribute("data-page");
    if (page !== "profile") return;

    try {
        const user = await apiRequest("/api/me", "GET", null, true);
        // Pre-fill existing user data 👇
        document.getElementById("profileName").value = user.name || "";
        document.getElementById("profilePhone").value = user.phone || "";

    } catch (err) {
        showToast("Login required");
        location.href = "login.html";
    }

    /* SAVE PROFILE */
    const profileForm = document.getElementById("profileForm");
    profileForm.onsubmit = async (e) => {
        e.preventDefault();

        const data = {
            name: document.getElementById("profileName").value,
            phone: document.getElementById("profilePhone").value
        };

        try {
            await apiRequest("/api/user/profile", "PUT", data, true);
            showToast("Profile updated");
        } catch (err) {
            showToast(err.message);
        }
    };

    /* CHANGE PASSWORD */
    const passwordForm = document.getElementById("passwordForm");
    passwordForm.onsubmit = async (e) => {
        e.preventDefault();

        const data = {
            old_password: document.getElementById("oldPassword").value,
            new_password: document.getElementById("newPassword").value
        };

        try {
            await apiRequest("/api/user/change-password", "PUT", data, true);
            showToast("Password updated");
            passwordForm.reset();
        } catch (err) {
            showToast(err.message);
        }
    };
}

function forgotPasswordInit() {
    const page = document.body.getAttribute("data-page");
    if (page !== "forgot-password") return;
    const emailInput = document.getElementById("fpEmail");
    const sendBtn = document.getElementById("sendOtpBtn");
    const msg = document.getElementById("fpMessage");

    sendBtn.onclick = async () => {
        const email = emailInput.value.trim();
        if (!email) return showToast("Enter your email");

        try {
            const res = await apiRequest("/api/reset-password/send-otp", "POST", { email });

            msg.innerHTML = `Dummy OTP: <strong>${res.otp}</strong>`;
            localStorage.setItem("reset_email", email);

            showToast("OTP Generated! your OTP  is: " + res.otp,10000);

            setTimeout(() => location.href = "reset-password.html", 1200);

        } catch (err) {
            showToast(err.message);
        }
    };
}

function resetPasswordInit() {
    const page = document.body.getAttribute("data-page");
    if (page !== "reset-password") return;

    const email = localStorage.getItem("reset_email");
    if (!email) return location.href = "forgot-password.html";

    const otpDisplay = document.getElementById("otpDisplay");
    otpDisplay.textContent = `Resetting password for: ${email}`;

    const otpInput = document.getElementById("otpInput");
    const newPass = document.getElementById("newPasswordInput");
    const verifyBtn = document.getElementById("verifyOtpBtn");
    const resendBtn = document.getElementById("resendOtpBtn");
    const timerEl = document.getElementById("timer");

    let timeLeft = 60;
    verifyBtn.disabled = false;

    const countdown = setInterval(() => {
        timerEl.textContent = `Time left: ${timeLeft}s`;
        timeLeft--;

        if (timeLeft < 0) {
            clearInterval(countdown);
            timerEl.textContent = "OTP expired!";
            verifyBtn.disabled = true;
            resendBtn.classList.remove("hidden");
        }
    }, 1000);

    verifyBtn.onclick = async () => {
        const otp = otpInput.value.trim();
        const new_password = newPass.value.trim();

        if (!otp || !new_password) {
            return showToast("Enter OTP & new password");
        }

        try {
            await apiRequest("/api/reset-password/verify", "POST", {
                email,
                otp,
                new_password
            });

            showToast("Password reset successful!");

            setTimeout(() => {
                localStorage.removeItem("reset_email");
                location.href = "login.html";
            }, 1500);

        } catch (err) {
            showToast(err.message);
        }
    };

    resendBtn.onclick = () => {
        location.href = "forgot-password.html";
    };
}

