const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
const PORT = 5000;

// --- CONFIG ---
const JWT_SECRET = "supersecret_jwt_key_change_me"; // change in real projects

app.use(cors());
app.use(express.json());

// --- DB SETUP ---
const db = new sqlite3.Database("./ecommerce.db");

db.serialize(() => {
  // Users
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categories
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `);

  // Products
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category_id INTEGER,
      image_url TEXT,
      stock INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(category_id) REFERENCES categories(id)
    )
  `);

  // Carts
  db.run(`
    CREATE TABLE IF NOT EXISTS carts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'OPEN',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Cart Items
  db.run(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cart_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY(cart_id) REFERENCES carts(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  // Orders
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'PLACED',
      payment_status TEXT DEFAULT 'PENDING',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Order Items
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  seedInitialData();
});

// --- SEED DATA ---
function seedInitialData() {
  // Seed admin + sample user
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (err) return console.error("User count error:", err);
    if (row.count === 0) {
      const adminPassword = bcrypt.hashSync("admin123", 10);
      const userPassword = bcrypt.hashSync("user123", 10);

      db.run(
        "INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)",
        ["Admin", "admin@example.com", adminPassword, 1]
      );
      db.run(
        "INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)",
        ["Test User", "user@example.com", userPassword, 0]
      );

      console.log("Seeded admin and test user:");
      console.log("Admin => email: admin@example.com, password: admin123");
      console.log("User  => email: user@example.com,  password: user123");
    }
  });

  // Seed categories and products
  db.get("SELECT COUNT(*) as count FROM categories", (err, row) => {
    if (err) return console.error("Category count error:", err);

    if (row.count === 0) {
      db.serialize(() => {
        db.run("INSERT INTO categories (name) VALUES (?)", ["Electronics"]);
        db.run("INSERT INTO categories (name) VALUES (?)", ["Clothing"]);
        db.run("INSERT INTO categories (name) VALUES (?)", ["Books"]);

        db.run(
          "INSERT INTO products (name, description, price, category_id, image_url, stock) VALUES (?, ?, ?, ?, ?, ?)",
          [
            "Smartphone",
            "Basic budget smartphone",
            14999,
            1,
            "https://via.placeholder.com/150",
            50,
          ]
        );
        db.run(
          "INSERT INTO products (name, description, price, category_id, image_url, stock) VALUES (?, ?, ?, ?, ?, ?)",
          [
            "Headphones",
            "Wireless over-ear headphones",
            2999,
            1,
            "https://via.placeholder.com/150",
            100,
          ]
        );
        db.run(
          "INSERT INTO products (name, description, price, category_id, image_url, stock) VALUES (?, ?, ?, ?, ?, ?)",
          [
            "T-Shirt",
            "Cotton round-neck t-shirt",
            499,
            2,
            "https://via.placeholder.com/150",
            200,
          ]
        );
        db.run(
          "INSERT INTO products (name, description, price, category_id, image_url, stock) VALUES (?, ?, ?, ?, ?, ?)",
          [
            "Novel",
            "Best-selling fiction novel",
            399,
            3,
            "https://via.placeholder.com/150",
            80,
          ]
        );

        console.log("Seeded categories and products.");
      });
    }
  });
}

// --- AUTH MIDDLEWARE ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Missing token" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// --- HELPER: GET OR CREATE OPEN CART ---
function getOrCreateOpenCart(userId, callback) {
  db.get(
    "SELECT * FROM carts WHERE user_id = ? AND status = 'OPEN'",
    [userId],
    (err, cart) => {
      if (err) return callback(err);
      if (cart) return callback(null, cart);

      db.run(
        "INSERT INTO carts (user_id, status) VALUES (?, 'OPEN')",
        [userId],
        function (err2) {
          if (err2) return callback(err2);
          db.get(
            "SELECT * FROM carts WHERE id = ?",
            [this.lastID],
            (err3, newCart) => {
              if (err3) return callback(err3);
              callback(null, newCart);
            }
          );
        }
      );
    }
  );
}

// --- AUTH ROUTES ---
// Register
app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: "Name, email and password required" });

  const hashed = bcrypt.hashSync(password, 10);

  db.run(
    "INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, 0)",
    [name, email, hashed],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ message: "Email already exists" });
        }
        return res.status(500).json({ message: "Error creating user" });
      }

      res.status(201).json({ id: this.lastID, name, email });
    }
  );
});

// Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: !!user.is_admin },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, is_admin: !!user.is_admin },
    });
  });
});

// Dummy logout (client just drops token)
app.post("/api/auth/logout", (req, res) => {
  res.json({ message: "Logged out (client should delete token)" });
});

// --- PUBLIC ROUTES ---
// Categories
app.get("/api/categories", (req, res) => {
  db.all("SELECT * FROM categories", (err, rows) => {
    if (err) return res.status(500).json({ message: "Error fetching categories" });
    res.json(rows);
  });
});

// Products + Filters: ?category=1&minPrice=100&maxPrice=1000&search=phone
app.get("/api/products", (req, res) => {
  const { category, minPrice, maxPrice, search } = req.query;

  let query = "SELECT * FROM products WHERE 1=1";
  const params = [];

  if (category) {
    query += " AND category_id = ?";
    params.push(category);
  }
  if (minPrice) {
    query += " AND price >= ?";
    params.push(minPrice);
  }
  if (maxPrice) {
    query += " AND price <= ?";
    params.push(maxPrice);
  }
  if (search) {
    query += " AND (name LIKE ? OR description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "Error fetching products" });
    res.json(rows);
  });
});

// Single product
app.get("/api/products/:id", (req, res) => {
  db.get("SELECT * FROM products WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ message: "Error fetching product" });
    if (!row) return res.status(404).json({ message: "Product not found" });
    res.json(row);
  });
});

// --- CART ROUTES (AUTH REQUIRED) ---
// Get current cart
app.get("/api/cart", authenticateToken, (req, res) => {
  getOrCreateOpenCart(req.user.id, (err, cart) => {
    if (err) return res.status(500).json({ message: "Error loading cart" });

    db.all(
      `
      SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.image_url
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = ?
    `,
      [cart.id],
      (err2, items) => {
        if (err2) return res.status(500).json({ message: "Error loading cart items" });

        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        res.json({ cart_id: cart.id, items, total });
      }
    );
  });
});

// Add item to cart
app.post("/api/cart/items", authenticateToken, (req, res) => {
  const { product_id, quantity } = req.body;
  if (!product_id || !quantity)
    return res.status(400).json({ message: "product_id and quantity required" });

  getOrCreateOpenCart(req.user.id, (err, cart) => {
    if (err) return res.status(500).json({ message: "Error loading cart" });

    // Check if already in cart
    db.get(
      "SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?",
      [cart.id, product_id],
      (err2, item) => {
        if (err2) return res.status(500).json({ message: "Error updating cart" });

        if (item) {
          const newQty = item.quantity + quantity;
          db.run(
            "UPDATE cart_items SET quantity = ? WHERE id = ?",
            [newQty, item.id],
            function (err3) {
              if (err3) return res.status(500).json({ message: "Error updating cart" });
              res.json({ id: item.id, cart_id: cart.id, product_id, quantity: newQty });
            }
          );
        } else {
          db.run(
            "INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)",
            [cart.id, product_id, quantity],
            function (err3) {
              if (err3) return res.status(500).json({ message: "Error adding to cart" });
              res.status(201).json({
                id: this.lastID,
                cart_id: cart.id,
                product_id,
                quantity,
              });
            }
          );
        }
      }
    );
  });
});

// Update cart item quantity
app.put("/api/cart/items/:id", authenticateToken, (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1)
    return res.status(400).json({ message: "Quantity must be >= 1" });

  // Ensure item belongs to user's cart
  db.get(
    `
    SELECT ci.*, c.user_id 
    FROM cart_items ci
    JOIN carts c ON ci.cart_id = c.id
    WHERE ci.id = ?
  `,
    [req.params.id],
    (err, item) => {
      if (err) return res.status(500).json({ message: "Error updating cart" });
      if (!item || item.user_id !== req.user.id) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      db.run(
        "UPDATE cart_items SET quantity = ? WHERE id = ?",
        [quantity, req.params.id],
        function (err2) {
          if (err2) return res.status(500).json({ message: "Error updating cart" });
          res.json({ id: req.params.id, quantity });
        }
      );
    }
  );
});

// Delete cart item
app.delete("/api/cart/items/:id", authenticateToken, (req, res) => {
  db.get(
    `
    SELECT ci.*, c.user_id 
    FROM cart_items ci
    JOIN carts c ON ci.cart_id = c.id
    WHERE ci.id = ?
  `,
    [req.params.id],
    (err, item) => {
      if (err) return res.status(500).json({ message: "Error removing item" });
      if (!item || item.user_id !== req.user.id) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      db.run("DELETE FROM cart_items WHERE id = ?", [req.params.id], function (err2) {
        if (err2) return res.status(500).json({ message: "Error removing item" });
        res.json({ message: "Item removed" });
      });
    }
  );
});

// --- CHECKOUT + DUMMY PAYMENT ---
app.post("/api/checkout", authenticateToken, (req, res) => {
  const { payment_method } = req.body; // e.g., "card", "cod" - just for demo

  getOrCreateOpenCart(req.user.id, (err, cart) => {
    if (err) return res.status(500).json({ message: "Error loading cart" });

    db.all(
      `
      SELECT ci.*, p.price 
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = ?
    `,
      [cart.id],
      (err2, items) => {
        if (err2) return res.status(500).json({ message: "Error loading cart items" });
        if (!items || items.length === 0)
          return res.status(400).json({ message: "Cart is empty" });

        const total = items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        // Create order
        db.run(
          "INSERT INTO orders (user_id, total_amount, status, payment_status) VALUES (?, ?, 'PLACED', 'PAID')",
          [req.user.id, total],
          function (err3) {
            if (err3)
              return res.status(500).json({ message: "Error creating order" });

            const orderId = this.lastID;

            // Insert order items
            const stmt = db.prepare(
              "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)"
            );

            items.forEach((item) => {
              stmt.run(orderId, item.product_id, item.quantity, item.price);
            });

            stmt.finalize((err4) => {
              if (err4)
                return res.status(500).json({ message: "Error saving order items" });

              // Mark cart as CHECKED_OUT and clear items
              db.run(
                "UPDATE carts SET status = 'CHECKED_OUT' WHERE id = ?",
                [cart.id],
                (err5) => {
                  if (err5)
                    return res.status(500).json({ message: "Error updating cart" });

                  db.run(
                    "DELETE FROM cart_items WHERE cart_id = ?",
                    [cart.id],
                    (err6) => {
                      if (err6)
                        return res
                          .status(500)
                          .json({ message: "Error clearing cart" });

                      // Dummy payment successful
                      res.json({
                        message: "Order placed & payment successful (dummy)",
                        order_id: orderId,
                        total,
                        payment_method: payment_method || "dummy",
                      });
                    }
                  );
                }
              );
            });
          }
        );
      }
    );
  });
});

// --- ADMIN ROUTES ---
// Simple "admin panel" API
// Admin: manage products, categories, view orders, users
app.get("/api/admin/users", authenticateToken, requireAdmin, (req, res) => {
  db.all(
    "SELECT id, name, email, is_admin, created_at FROM users",
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Error fetching users" });
      res.json(rows);
    }
  );
});

app.get("/api/admin/orders", authenticateToken, requireAdmin, (req, res) => {
  db.all(
    `
    SELECT o.*, u.email as user_email 
    FROM orders o
    JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
  `,
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Error fetching orders" });
      res.json(rows);
    }
  );
});

// Admin: Create product
app.post("/api/admin/products", authenticateToken, requireAdmin, (req, res) => {
  const { name, description, price, category_id, image_url, stock } = req.body;

  if (!name || !price)
    return res.status(400).json({ message: "Name and price required" });

  db.run(
    `
    INSERT INTO products (name, description, price, category_id, image_url, stock)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    [name, description || "", price, category_id || null, image_url || "", stock || 0],
    function (err) {
      if (err) return res.status(500).json({ message: "Error creating product" });
      res.status(201).json({ id: this.lastID, name, price });
    }
  );
});

// Admin: Update product
app.put("/api/admin/products/:id", authenticateToken, requireAdmin, (req, res) => {
  const { name, description, price, category_id, image_url, stock } = req.body;

  db.run(
    `
    UPDATE products
    SET name = ?, description = ?, price = ?, category_id = ?, image_url = ?, stock = ?
    WHERE id = ?
  `,
    [
      name,
      description || "",
      price,
      category_id || null,
      image_url || "",
      stock || 0,
      req.params.id,
    ],
    function (err) {
      if (err) return res.status(500).json({ message: "Error updating product" });
      res.json({ message: "Product updated" });
    }
  );
});

// Admin: Delete product
app.delete(
  "/api/admin/products/:id",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    db.run(
      "DELETE FROM products WHERE id = ?",
      [req.params.id],
      function (err) {
        if (err)
          return res.status(500).json({ message: "Error deleting product" });
        res.json({ message: "Product deleted" });
      }
    );
  }
);

// Admin: Create category
app.post("/api/admin/categories", authenticateToken, requireAdmin, (req, res) => {
    const { name } = req.body;

    if (!name) return res.status(400).json({ message: "Category name required" });

    db.run(
        `INSERT INTO categories (name) VALUES (?)`,
        [name],
        function (err) {
            if (err) return res.status(500).json({ message: "DB error" });

            res.json({
                id: this.lastID,
                name
            });
        }
    );
});


app.put("/api/admin/categories/:id", authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) return res.status(400).json({ message: "Category name required" });

    db.run(
        `UPDATE categories SET name = ? WHERE id = ?`,
        [name, id],
        function (err) {
            if (err) return res.status(500).json({ message: "DB error" });

            res.json({ message: "Category updated" });
        }
    );
});

app.delete("/api/admin/categories/:id", authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;

    db.run(
        `DELETE FROM categories WHERE id = ?`,
        [id],
        function (err) {
            if (err) return res.status(500).json({ message: "DB error" });

            res.json({ message: "Category deleted" });
        }
    );
});


// Simple admin dashboard stats
app.get(
  "/api/admin/dashboard",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const stats = {};

    db.get("SELECT COUNT(*) as count FROM users", (err1, row1) => {
      if (err1) return res.status(500).json({ message: "Error loading stats" });
      stats.total_users = row1.count;

      db.get("SELECT COUNT(*) as count FROM products", (err2, row2) => {
        if (err2) return res.status(500).json({ message: "Error loading stats" });
        stats.total_products = row2.count;

        db.get("SELECT COUNT(*) as count FROM orders", (err3, row3) => {
          if (err3)
            return res.status(500).json({ message: "Error loading stats" });
          stats.total_orders = row3.count;

          db.get(
            "SELECT IFNULL(SUM(total_amount), 0) as revenue FROM orders",
            (err4, row4) => {
              if (err4)
                return res.status(500).json({ message: "Error loading stats" });
              stats.total_revenue = row4.revenue;
              res.json(stats);
            }
          );
        });
      });
    });
  }
);

// --- ROOT ---
app.get("/", (req, res) => {
  res.json({
    message: "Simple E-commerce API",
    docs: {
      auth: [
        "POST /api/auth/register",
        "POST /api/auth/login",
        "POST /api/auth/logout",
      ],
      products: [
        "GET /api/products?category=&minPrice=&maxPrice=&search=",
        "GET /api/products/:id",
      ],
      cart: [
        "GET /api/cart",
        "POST /api/cart/items",
        "PUT /api/cart/items/:id",
        "DELETE /api/cart/items/:id",
      ],
      checkout: ["POST /api/checkout"],
      admin: [
        "GET /api/admin/users",
        "GET /api/admin/orders",
        "GET /api/admin/dashboard",
        "POST /api/admin/products",
        "PUT /api/admin/products/:id",
        "DELETE /api/admin/products/:id",
        "POST /api/admin/categories",
      ],
    },
  });
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
