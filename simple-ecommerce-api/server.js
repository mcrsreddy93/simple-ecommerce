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
  // add user address table
  db.run(`
    CREATE TABLE IF NOT EXISTS user_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    full_name TEXT,
    phone TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
  `);

  seedInitialData();
});

function seedInitialData() {
  console.log("Checking and seeding initial data...");
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
        console.log("Seeding realistic categories and products...");

        // 10 realistic categories
        const categories = [
          "Electronics",
          "Home Appliances",
          "Fashion",
          "Sports & Fitness",
          "Books",
          "Groceries & Food",
          "Beauty & Personal Care",
          "Toys & Games",
          "Furniture & Home Decor",
          "Automotive & Bike Accessories",
        ];

        const catStmt = db.prepare(
          "INSERT INTO categories (name) VALUES (?)"
        );
        categories.forEach((c) => catStmt.run(c));
        catStmt.finalize();

        // Helper to make Unsplash keyword URLs
        const img = (keywords) =>
          `https://source.unsplash.com/600x600/?${keywords}`;

        // 200 REALISTIC PRODUCTS (20 per category)
        const products = [
          // -------------------- 1. ELECTRONICS --------------------
          {
            name: "Apple iPhone 15 128GB",
            description:
              "Latest generation Apple iPhone 15 with A16 Bionic chip and 6.1-inch display.",
            price: 79999,
            category_id: 1,
            image_url: img("iphone,smartphone,apple"),
            stock: 25,
          },
          {
            name: "Samsung Galaxy S23 256GB",
            description:
              "Samsung flagship with Dynamic AMOLED 2X display and triple rear camera.",
            price: 74999,
            category_id: 1,
            image_url: img("samsung,android,smartphone"),
            stock: 30,
          },
          {
            name: "OnePlus 12R 5G 256GB",
            description:
              "OnePlus 12R with Snapdragon flagship processor and fast charging.",
            price: 39999,
            category_id: 1,
            image_url: img("oneplus,smartphone,android"),
            stock: 40,
          },
          {
            name: "Xiaomi Redmi Note 13 Pro",
            description:
              "Redmi Note series phone with high-refresh AMOLED display and large battery.",
            price: 24999,
            category_id: 1,
            image_url: img("redmi,smartphone,android"),
            stock: 60,
          },
          {
            name: "Realme Narzo 70 5G",
            description:
              "Budget 5G smartphone with powerful processor and big battery.",
            price: 18999,
            category_id: 1,
            image_url: img("realme,smartphone,5g"),
            stock: 70,
          },
          {
            name: "Apple MacBook Air M2 13-inch",
            description:
              "MacBook Air with Apple M2 chip, 8GB RAM and 256GB SSD, ideal for productivity.",
            price: 109990,
            category_id: 1,
            image_url: img("macbook,laptop,apple"),
            stock: 15,
          },
          {
            name: "HP Pavilion 14 i5 12th Gen",
            description:
              "HP Pavilion thin and light laptop with Intel Core i5 and 16GB RAM.",
            price: 69990,
            category_id: 1,
            image_url: img("hp,laptop,office"),
            stock: 20,
          },
          {
            name: "Lenovo IdeaPad Slim 3",
            description:
              "Lenovo IdeaPad Slim 3 with Ryzen processor and FHD display.",
            price: 54990,
            category_id: 1,
            image_url: img("lenovo,laptop,notebook"),
            stock: 25,
          },
          {
            name: "Dell Inspiron 15 3520",
            description:
              "Dell Inspiron everyday laptop with 15.6-inch display and SSD storage.",
            price: 58990,
            category_id: 1,
            image_url: img("dell,laptop,work"),
            stock: 22,
          },
          {
            name: "Samsung 55-inch Crystal 4K UHD Smart TV",
            description:
              "4K Ultra HD Smart TV with HDR support and popular streaming apps built-in.",
            price: 52990,
            category_id: 1,
            image_url: img("4k,tv,smart-tv"),
            stock: 18,
          },
          {
            name: "LG 43-inch 4K UHD Smart LED TV",
            description:
              "LG 4K Smart TV with WebOS and AI ThinQ voice assistant.",
            price: 37990,
            category_id: 1,
            image_url: img("lg,tv,living-room"),
            stock: 20,
          },
          {
            name: "Sony WH-1000XM5 Wireless Headphones",
            description:
              "Sony flagship noise-cancelling over-ear wireless headphones.",
            price: 29990,
            category_id: 1,
            image_url: img("headphones,sony,audio"),
            stock: 35,
          },
          {
            name: "boAt Airdopes 141 TWS Earbuds",
            description:
              "True wireless earbuds with low-latency mode and long playback.",
            price: 1499,
            category_id: 1,
            image_url: img("earbuds,wireless,audio"),
            stock: 120,
          },
          {
            name: "JBL Flip 6 Bluetooth Speaker",
            description:
              "Portable Bluetooth speaker with deep bass and IP67 rating.",
            price: 10999,
            category_id: 1,
            image_url: img("bluetooth,speaker,jbl"),
            stock: 45,
          },
          {
            name: "Logitech MX Master 3S Mouse",
            description:
              "Premium wireless mouse with ergonomic design and multi-device support.",
            price: 8999,
            category_id: 1,
            image_url: img("mouse,logitech,office"),
            stock: 50,
          },
          {
            name: "Logitech K380 Bluetooth Keyboard",
            description:
              "Compact multi-device Bluetooth keyboard for laptops, tablets and phones.",
            price: 3495,
            category_id: 1,
            image_url: img("keyboard,wireless,logitech"),
            stock: 70,
          },
          {
            name: "Mi Box 4K Streaming Device",
            description:
              "Android TV-based 4K streaming device with Chromecast built-in.",
            price: 3799,
            category_id: 1,
            image_url: img("streaming,tv,remote"),
            stock: 65,
          },
          {
            name: "TP-Link Archer AX55 Wi-Fi 6 Router",
            description:
              "Dual-band Wi-Fi 6 router suitable for high-speed home internet.",
            price: 8999,
            category_id: 1,
            image_url: img("router,wifi,internet"),
            stock: 40,
          },
          {
            name: "SanDisk Extreme 1TB Portable SSD",
            description:
              "Rugged portable SSD with high-speed USB-C interface.",
            price: 11999,
            category_id: 1,
            image_url: img("ssd,portable,storage"),
            stock: 30,
          },
          {
            name: "Seagate Expansion 2TB External HDD",
            description:
              "2TB USB 3.0 external hard drive for backup and storage.",
            price: 6499,
            category_id: 1,
            image_url: img("hard-drive,external,storage"),
            stock: 50,
          },

          // -------------------- 2. HOME APPLIANCES --------------------
          {
            name: "LG 1.5 Ton 5 Star Inverter Split AC",
            description:
              "Energy-efficient LG split AC with dual inverter compressor.",
            price: 38990,
            category_id: 2,
            image_url: img("ac,air-conditioner,living-room"),
            stock: 18,
          },
          {
            name: "Voltas 1.5 Ton 3 Star Split AC",
            description:
              "Voltas split AC suitable for medium-sized rooms with turbo cooling.",
            price: 32990,
            category_id: 2,
            image_url: img("ac,voltas,home"),
            stock: 20,
          },
          {
            name: "Samsung 253L 3 Star Double Door Refrigerator",
            description:
              "Frost-free double door fridge with digital inverter compressor.",
            price: 27990,
            category_id: 2,
            image_url: img("refrigerator,kitchen,fridge"),
            stock: 22,
          },
          {
            name: "LG 260L 3 Star Frost-Free Refrigerator",
            description:
              "LG double door refrigerator with multi-air flow cooling.",
            price: 28990,
            category_id: 2,
            image_url: img("fridge,double-door,kitchen"),
            stock: 18,
          },
          {
            name: "Whirlpool 7kg Fully Automatic Top Load Washing Machine",
            description:
              "Top load washing machine with multiple wash programs.",
            price: 17990,
            category_id: 2,
            image_url: img("washing-machine,top-load,laundry"),
            stock: 25,
          },
          {
            name: "IFB 7kg Front Load Washing Machine",
            description:
              "Front load washing machine with 1200 RPM and in-built heater.",
            price: 31990,
            category_id: 2,
            image_url: img("washing-machine,front-load"),
            stock: 16,
          },
          {
            name: "Bosch 8kg Washer Dryer Combo",
            description:
              "Bosch front-load washer dryer combination for compact homes.",
            price: 52990,
            category_id: 2,
            image_url: img("washer-dryer,laundry"),
            stock: 10,
          },
          {
            name: "Panasonic 23L Convection Microwave Oven",
            description:
              "23L convection microwave oven ideal for grilling, baking and reheating.",
            price: 12990,
            category_id: 2,
            image_url: img("microwave,oven,kitchen"),
            stock: 30,
          },
          {
            name: "Philips HL7756 Mixer Grinder 750W",
            description:
              "750W mixer grinder with 3 stainless steel jars for grinding and blending.",
            price: 3999,
            category_id: 2,
            image_url: img("mixer,grinder,kitchen"),
            stock: 50,
          },
          {
            name: "Prestige Induction Cooktop 2000W",
            description:
              "Induction cooktop with preset Indian menu options.",
            price: 3199,
            category_id: 2,
            image_url: img("induction,cooktop,kitchen"),
            stock: 45,
          },
          {
            name: "Kent Grand RO+UV Water Purifier",
            description:
              "Wall-mount RO+UV+UF water purifier with mineral RO technology.",
            price: 16999,
            category_id: 2,
            image_url: img("water-purifier,ro,kitchen"),
            stock: 20,
          },
          {
            name: "Philips Air Fryer XL 4.1L",
            description:
              "Healthy air fryer to fry, bake and grill with little or no oil.",
            price: 9990,
            category_id: 2,
            image_url: img("air-fryer,kitchen"),
            stock: 28,
          },
          {
            name: "Dyson V8 Cordless Vacuum Cleaner",
            description:
              "High-suction cordless vacuum cleaner for deep home cleaning.",
            price: 32900,
            category_id: 2,
            image_url: img("vacuum,cordless,cleaning"),
            stock: 8,
          },
          {
            name: "Eureka Forbes Quick Clean DX Vacuum Cleaner",
            description:
              "Portable vacuum cleaner with multiple attachments.",
            price: 6499,
            category_id: 2,
            image_url: img("vacuum,home,cleaner"),
            stock: 25,
          },
          {
            name: "Havells 1200mm Ceiling Fan",
            description:
              "High-speed ceiling fan with efficient motor and stylish design.",
            price: 2699,
            category_id: 2,
            image_url: img("ceiling-fan,room"),
            stock: 80,
          },
          {
            name: "Usha Mist Air Table Fan",
            description:
              "Table fan with three speed settings and oscillation.",
            price: 2199,
            category_id: 2,
            image_url: img("table-fan,fan"),
            stock: 70,
          },
          {
            name: "Crompton 15L Storage Water Geyser",
            description:
              "15-litre storage geyser suitable for bathroom use.",
            price: 7499,
            category_id: 2,
            image_url: img("geyser,water-heater,bathroom"),
            stock: 30,
          },
          {
            name: "Bajaj Room Heater RX 11",
            description:
              "Compact room heater for small rooms during winter.",
            price: 2599,
            category_id: 2,
            image_url: img("room-heater,winter"),
            stock: 40,
          },
          {
            name: "Philips Air Purifier Series 1000",
            description:
              "Air purifier with HEPA filter for clean indoor air.",
            price: 11999,
            category_id: 2,
            image_url: img("air-purifier,filter"),
            stock: 18,
          },
          {
            name: "Prestige Electric Kettle 1.5L",
            description:
              "Stainless steel electric kettle with auto shut-off.",
            price: 1599,
            category_id: 2,
            image_url: img("electric-kettle,tea,water"),
            stock: 90,
          },

          // -------------------- 3. FASHION --------------------
          {
            name: "Levi's 511 Slim Fit Men Jeans",
            description:
              "Levi's 511 slim-fit mid-rise stretchable denim jeans.",
            price: 2499,
            category_id: 3,
            image_url: img("jeans,denim,men"),
            stock: 60,
          },
          {
            name: "U.S. Polo Assn. Men Polo T-Shirt",
            description:
              "Cotton polo t-shirt with logo embroidery on chest.",
            price: 1499,
            category_id: 3,
            image_url: img("polo,shirt,men"),
            stock: 80,
          },
          {
            name: "Allen Solly Men Slim Fit Formal Shirt",
            description:
              "Solid color formal shirt suitable for office wear.",
            price: 1799,
            category_id: 3,
            image_url: img("formal-shirt,office,men"),
            stock: 55,
          },
          {
            name: "Peter England Men Slim Fit Trousers",
            description:
              "Slim-fit flat-front formal trousers for men.",
            price: 1999,
            category_id: 3,
            image_url: img("trousers,formal,men"),
            stock: 50,
          },
          {
            name: "H&M Oversized Hoodie Unisex",
            description:
              "Comfortable oversized hoodie with kangaroo pocket.",
            price: 2299,
            category_id: 3,
            image_url: img("hoodie,sweatshirt"),
            stock: 70,
          },
          {
            name: "Nike Revolution 6 Men Running Shoes",
            description:
              "Lightweight running shoes with cushioned sole.",
            price: 3995,
            category_id: 3,
            image_url: img("running-shoes,nike"),
            stock: 45,
          },
          {
            name: "Adidas Lite Racer Men Sneakers",
            description:
              "Everyday sneakers with breathable mesh upper.",
            price: 3499,
            category_id: 3,
            image_url: img("sneakers,adidas,shoes"),
            stock: 50,
          },
          {
            name: "Puma Smash v2 Leather Sneakers",
            description:
              "Classic low-top sneakers with leather upper.",
            price: 3199,
            category_id: 3,
            image_url: img("sneakers,puma,leather"),
            stock: 55,
          },
          {
            name: "Bata Men Formal Leather Shoes",
            description:
              "Timeless formal lace-up leather shoes for office.",
            price: 2599,
            category_id: 3,
            image_url: img("formal-shoes,leather,men"),
            stock: 40,
          },
          {
            name: "Crocs Classic Unisex Clogs",
            description:
              "Comfortable and lightweight clogs for casual wear.",
            price: 3495,
            category_id: 3,
            image_url: img("crocs,clogs,shoes"),
            stock: 65,
          },
          {
            name: "Biba Women Anarkali Kurta",
            description:
              "Printed Anarkali kurta suited for festive occasions.",
            price: 2699,
            category_id: 3,
            image_url: img("kurta,indian,ethnic"),
            stock: 45,
          },
          {
            name: "W for Women Straight Kurta",
            description:
              "Straight-fit kurta with elegant prints.",
            price: 1999,
            category_id: 3,
            image_url: img("indian,kurta,women"),
            stock: 50,
          },
          {
            name: "Zara Women Mom Fit Jeans",
            description:
              "High-rise mom-fit denim jeans for women.",
            price: 2990,
            category_id: 3,
            image_url: img("jeans,women,denim"),
            stock: 40,
          },
          {
            name: "H&M Women Floral Summer Dress",
            description:
              "Knee-length printed summer dress for casual outings.",
            price: 2499,
            category_id: 3,
            image_url: img("summer-dress,floral"),
            stock: 55,
          },
          {
            name: "Reebok Women Training Tights",
            description:
              "Stretchable tights designed for workouts and running.",
            price: 2299,
            category_id: 3,
            image_url: img("leggings,fitness,women"),
            stock: 60,
          },
          {
            name: "Jockey Men Briefs Pack of 3",
            description:
              "Cotton stretch briefs for everyday comfort.",
            price: 899,
            category_id: 3,
            image_url: img("innerwear,men,briefs"),
            stock: 120,
          },
          {
            name: "Jockey Women Sports Bra",
            description:
              "Medium-impact sports bra for gym and running.",
            price: 1099,
            category_id: 3,
            image_url: img("sports-bra,fitness,women"),
            stock: 80,
          },
          {
            name: "Wildcraft 35L Backpack",
            description:
              "Durable backpack suitable for travel and college.",
            price: 2199,
            category_id: 3,
            image_url: img("backpack,bag,travel"),
            stock: 70,
          },
          {
            name: "Skybags Casual Backpack",
            description:
              "Lightweight printed backpack with multiple compartments.",
            price: 1999,
            category_id: 3,
            image_url: img("backpack,school,bag"),
            stock: 75,
          },
          {
            name: "Ray-Ban Wayfarer Sunglasses",
            description:
              "Classic wayfarer sunglasses with UV protection lenses.",
            price: 6290,
            category_id: 3,
            image_url: img("sunglasses,rayban,eyewear"),
            stock: 30,
          },

          // -------------------- 4. SPORTS & FITNESS --------------------
          {
            name: "Yonex Muscle Power 29 Badminton Racket",
            description:
              "Graphite badminton racket ideal for intermediate players.",
            price: 2499,
            category_id: 4,
            image_url: img("badminton,racket,yonex"),
            stock: 55,
          },
          {
            name: "Nivia Classic Football Size 5",
            description:
              "Durable size 5 football suitable for turf and grass.",
            price: 899,
            category_id: 4,
            image_url: img("football,soccer,ball"),
            stock: 80,
          },
          {
            name: "Cosco Milano Basketball Size 7",
            description:
              "Rubber basketball for outdoor and indoor courts.",
            price: 999,
            category_id: 4,
            image_url: img("basketball,ball,sports"),
            stock: 70,
          },
          {
            name: "SG Kashmir Willow Cricket Bat",
            description:
              "Kashmir willow cricket bat for leather ball.",
            price: 2199,
            category_id: 4,
            image_url: img("cricket,bat,sports"),
            stock: 40,
          },
          {
            name: "MRF Genius Grand Edition Cricket Bat",
            description:
              "Premium English willow cricket bat for advanced players.",
            price: 12999,
            category_id: 4,
            image_url: img("cricket,bat,professional"),
            stock: 15,
          },
          {
            name: "GM Cricket Kit Bag with Wheels",
            description:
              "Large cricket kit bag with separate compartments.",
            price: 3499,
            category_id: 4,
            image_url: img("sports-bag,cricket,kit"),
            stock: 35,
          },
          {
            name: "Nivia Volleyball",
            description:
              "Synthetic leather volleyball for training and matches.",
            price: 799,
            category_id: 4,
            image_url: img("volleyball,sports,ball"),
            stock: 60,
          },
          {
            name: "Cosco Tennis Balls Pack of 6",
            description:
              "Pack of 6 soft tennis balls for practice.",
            price: 599,
            category_id: 4,
            image_url: img("tennis,balls,sports"),
            stock: 90,
          },
          {
            name: "Stag Table Tennis Racket",
            description:
              "Ready-to-play TT racket for recreational players.",
            price: 899,
            category_id: 4,
            image_url: img("table-tennis,racket,pingpong"),
            stock: 50,
          },
          {
            name: "Fitness Mantra Yoga Mat 6mm",
            description:
              "Anti-slip yoga mat suitable for home workouts.",
            price: 999,
            category_id: 4,
            image_url: img("yoga-mat,fitness"),
            stock: 120,
          },
          {
            name: "Strauss Resistance Bands Set of 5",
            description:
              "Set of resistance bands with different tension levels.",
            price: 699,
            category_id: 4,
            image_url: img("resistance-bands,workout"),
            stock: 90,
          },
          {
            name: "Cockatoo Home Use Motorized Treadmill",
            description:
              "Foldable treadmill with multiple workout programs.",
            price: 24999,
            category_id: 4,
            image_url: img("treadmill,gym,fitness"),
            stock: 10,
          },
          {
            name: "Durafit Stationary Exercise Bike",
            description:
              "Adjustable resistance indoor exercise bike.",
            price: 14999,
            category_id: 4,
            image_url: img("exercise-bike,cardio"),
            stock: 12,
          },
          {
            name: "Domyos Hex Dumbbells 5kg Pair",
            description:
              "Rubber-coated hex dumbbells for strength training.",
            price: 2199,
            category_id: 4,
            image_url: img("dumbbells,gym,weights"),
            stock: 50,
          },
          {
            name: "HRX Skipping Rope",
            description:
              "Adjustable PVC skipping rope for cardio workouts.",
            price: 399,
            category_id: 4,
            image_url: img("skipping-rope,fitness"),
            stock: 150,
          },
          {
            name: "Nike Guard Stay Shin Guards",
            description:
              "Shin guards for football and soccer players.",
            price: 1199,
            category_id: 4,
            image_url: img("shin-guard,football"),
            stock: 25,
          },
          {
            name: "Adidas Training Gloves",
            description:
              "Padded training gloves for gym workouts.",
            price: 1399,
            category_id: 4,
            image_url: img("gym-gloves,fitness"),
            stock: 40,
          },
          {
            name: "Puma Sports Cap",
            description:
              "Adjustable sports cap for sun protection.",
            price: 799,
            category_id: 4,
            image_url: img("cap,hat,sports"),
            stock: 70,
          },
          {
            name: "Quechua Hiking Backpack 30L",
            description:
              "Decathlon hiking backpack suitable for treks and travel.",
            price: 2999,
            category_id: 4,
            image_url: img("hiking-backpack,trek"),
            stock: 30,
          },
          {
            name: "Decathlon Trekking Pole Single",
            description:
              "Lightweight aluminum trekking pole with adjustable height.",
            price: 1499,
            category_id: 4,
            image_url: img("trekking-pole,hiking"),
            stock: 25,
          },

          // -------------------- 5. BOOKS --------------------
          {
            name: "Atomic Habits by James Clear",
            description:
              "Bestselling self-help book about building good habits and breaking bad ones.",
            price: 599,
            category_id: 5,
            image_url: img("book,reading,self-help"),
            stock: 120,
          },
          {
            name: "The Psychology of Money by Morgan Housel",
            description:
              "Book on timeless lessons on wealth, greed and happiness.",
            price: 499,
            category_id: 5,
            image_url: img("book,finance,money"),
            stock: 100,
          },
          {
            name: "Rich Dad Poor Dad by Robert Kiyosaki",
            description:
              "Classic personal finance book about financial education.",
            price: 399,
            category_id: 5,
            image_url: img("book,rich-dad,finance"),
            stock: 140,
          },
          {
            name: "Ikigai: The Japanese Secret to a Long and Happy Life",
            description:
              "Book exploring the concept of Ikigai and purpose.",
            price: 399,
            category_id: 5,
            image_url: img("book,ikigai,japan"),
            stock: 90,
          },
          {
            name: "The Alchemist by Paulo Coelho",
            description:
              "Famous novel about following one's dreams and destiny.",
            price: 350,
            category_id: 5,
            image_url: img("book,novel,alchemist"),
            stock: 110,
          },
          {
            name: "Wings of Fire by A.P.J. Abdul Kalam",
            description:
              "Autobiography of Dr. A.P.J. Abdul Kalam, former President of India.",
            price: 299,
            category_id: 5,
            image_url: img("book,india,biography"),
            stock: 100,
          },
          {
            name: "India 2020 by A.P.J. Abdul Kalam",
            description:
              "Visionary book on transforming India into a developed nation.",
            price: 275,
            category_id: 5,
            image_url: img("book,india,future"),
            stock: 80,
          },
          {
            name: "The 5 AM Club by Robin Sharma",
            description:
              "Self-help book about morning routines and productivity.",
            price: 499,
            category_id: 5,
            image_url: img("book,morning,productivity"),
            stock: 95,
          },
          {
            name: "Deep Work by Cal Newport",
            description:
              "Book on rules for focused success in a distracted world.",
            price: 550,
            category_id: 5,
            image_url: img("book,focus,work"),
            stock: 80,
          },
          {
            name: "Clean Code by Robert C. Martin",
            description:
              "Handbook of agile software craftsmanship for developers.",
            price: 799,
            category_id: 5,
            image_url: img("book,code,programming"),
            stock: 60,
          },
          {
            name: "Java: The Complete Reference",
            description:
              "Comprehensive reference guide for Java programming.",
            price: 999,
            category_id: 5,
            image_url: img("book,java,programming"),
            stock: 50,
          },
          {
            name: "Head First Java",
            description:
              "Brain-friendly guide to learning Java with visuals and examples.",
            price: 799,
            category_id: 5,
            image_url: img("book,java,learning"),
            stock: 70,
          },
          {
            name: "Introduction to Algorithms (CLRS)",
            description:
              "Standard textbook on algorithms widely used in CS programs.",
            price: 1499,
            category_id: 5,
            image_url: img("book,algorithms,cs"),
            stock: 40,
          },
          {
            name: "You Don’t Know JS Yet",
            description:
              "Series on deep dive into core mechanisms of JavaScript.",
            price: 599,
            category_id: 5,
            image_url: img("book,javascript,code"),
            stock: 60,
          },
          {
            name: "Cracking the Coding Interview",
            description:
              "189 programming questions and solutions for interviews.",
            price: 999,
            category_id: 5,
            image_url: img("book,interview,code"),
            stock: 55,
          },
          {
            name: "Mahabharata (Abridged Edition)",
            description:
              "Abridged retelling of the Indian epic Mahabharata.",
            price: 499,
            category_id: 5,
            image_url: img("book,epic,india"),
            stock: 75,
          },
          {
            name: "Ramayana by C. Rajagopalachari",
            description:
              "Classic English retelling of the Ramayana.",
            price: 399,
            category_id: 5,
            image_url: img("book,ramayana,india"),
            stock: 80,
          },
          {
            name: "Chanakya Neeti",
            description:
              "Collection of aphorisms and strategies attributed to Chanakya.",
            price: 249,
            category_id: 5,
            image_url: img("book,india,philosophy"),
            stock: 90,
          },
          {
            name: "The Monk Who Sold His Ferrari",
            description:
              "Spiritual fable about fulfilling your dreams and reaching destiny.",
            price: 399,
            category_id: 5,
            image_url: img("book,monk,spiritual"),
            stock: 100,
          },
          {
            name: "The Subtle Art of Not Giving a F*ck",
            description:
              "Counterintuitive approach to living a good life by Mark Manson.",
            price: 499,
            category_id: 5,
            image_url: img("book,self-help,orange"),
            stock: 90,
          },

          // -------------------- 6. GROCERIES & FOOD --------------------
          {
            name: "Aashirvaad Whole Wheat Atta 10kg",
            description:
              "High-quality whole wheat flour for soft rotis and chapatis.",
            price: 549,
            category_id: 6,
            image_url: img("wheat,atta,flour"),
            stock: 200,
          },
          {
            name: "Fortune Chakki Fresh Atta 5kg",
            description:
              "Chakki-fresh atta for authentic taste and texture.",
            price: 289,
            category_id: 6,
            image_url: img("atta,flour,food"),
            stock: 180,
          },
          {
            name: "Tata Salt Iodized 1kg",
            description:
              "Vacuum evaporated iodized salt for everyday cooking.",
            price: 25,
            category_id: 6,
            image_url: img("salt,white,spice"),
            stock: 400,
          },
          {
            name: "Fortune Sunlite Sunflower Oil 1L",
            description:
              "Refined sunflower oil suitable for frying and cooking.",
            price: 149,
            category_id: 6,
            image_url: img("sunflower-oil,cooking"),
            stock: 250,
          },
          {
            name: "Saffola Gold Blended Oil 1L",
            description:
              "Blended rice bran and safflower oil for heart health.",
            price: 199,
            category_id: 6,
            image_url: img("cooking-oil,bottle"),
            stock: 220,
          },
          {
            name: "Amul Butter 500g",
            description:
              "Salted table butter ideal for toast, parathas and baking.",
            price: 270,
            category_id: 6,
            image_url: img("butter,amul,toast"),
            stock: 150,
          },
          {
            name: "Nestlé Everyday Dairy Whitener 400g",
            description:
              "Dairy whitener for a rich and creamy tea experience.",
            price: 210,
            category_id: 6,
            image_url: img("milk-powder,tea"),
            stock: 130,
          },
          {
            name: "Brooke Bond Red Label Tea 1kg",
            description:
              "Strong, aromatic black tea blend for daily use.",
            price: 459,
            category_id: 6,
            image_url: img("black-tea,indian,chai"),
            stock: 140,
          },
          {
            name: "Taj Mahal Tea 500g",
            description:
              "Premium tea with rich flavor and aroma.",
            price: 299,
            category_id: 6,
            image_url: img("tea,cup,steam"),
            stock: 120,
          },
          {
            name: "Bru Gold Instant Coffee 200g",
            description:
              "Premium instant coffee with rich flavor.",
            price: 299,
            category_id: 6,
            image_url: img("coffee,instant,mug"),
            stock: 100,
          },
          {
            name: "Nescafé Classic Coffee 200g",
            description:
              "Classic instant coffee granules with signature taste.",
            price: 325,
            category_id: 6,
            image_url: img("coffee,nescafe,jar"),
            stock: 110,
          },
          {
            name: "Kellogg's Corn Flakes 1.2kg",
            description:
              "Breakfast cereal made from corn, served with milk.",
            price: 399,
            category_id: 6,
            image_url: img("cornflakes,cereal,breakfast"),
            stock: 130,
          },
          {
            name: "Quaker Oats 1kg",
            description:
              "Wholegrain oats for a healthy breakfast porridge.",
            price: 199,
            category_id: 6,
            image_url: img("oats,porridge,healthy"),
            stock: 140,
          },
          {
            name: "Maggi 2-Minute Noodles 12 Pack",
            description:
              "Instant masala noodles ready in 2 minutes.",
            price: 180,
            category_id: 6,
            image_url: img("noodles,maggi,instant"),
            stock: 220,
          },
          {
            name: "Kissan Mixed Fruit Jam 700g",
            description:
              "Mixed fruit jam for spreading on bread and parathas.",
            price: 185,
            category_id: 6,
            image_url: img("jam,bread,breakfast"),
            stock: 130,
          },
          {
            name: "Nutella Hazelnut Spread 350g",
            description:
              "Chocolate hazelnut spread for bread, pancakes and desserts.",
            price: 399,
            category_id: 6,
            image_url: img("nutella,chocolate,spread"),
            stock: 80,
          },
          {
            name: "Lay's Classic Salted Chips Multipack",
            description:
              "Pack of 5 Lay's Classic Salted potato chips.",
            price: 99,
            category_id: 6,
            image_url: img("potato-chips,snacks"),
            stock: 200,
          },
          {
            name: "Parle-G Biscuits Family Pack 1kg",
            description:
              "Classic glucose biscuits perfect with tea.",
            price: 120,
            category_id: 6,
            image_url: img("biscuits,tea,snack"),
            stock: 260,
          },
          {
            name: "Coca-Cola Soft Drink 2.25L",
            description:
              "Carbonated soft drink best served chilled.",
            price: 110,
            category_id: 6,
            image_url: img("soft-drink,coke,bottle"),
            stock: 180,
          },
          {
            name: "Amul Taaza Toned Milk 1L",
            description:
              "Long-life tetra pack toned milk.",
            price: 72,
            category_id: 6,
            image_url: img("milk,glass,dairy"),
            stock: 140,
          },

          // -------------------- 7. BEAUTY & PERSONAL CARE --------------------
          {
            name: "Dove Intense Repair Shampoo 650ml",
            description:
              "Shampoo for damaged hair with nourishing formula.",
            price: 499,
            category_id: 7,
            image_url: img("shampoo,bathroom,dove"),
            stock: 90,
          },
          {
            name: "Pantene Hair Fall Control Shampoo 650ml",
            description:
              "Shampoo aimed at reducing hair fall due to breakage.",
            price: 475,
            category_id: 7,
            image_url: img("shampoo,hair-care"),
            stock: 85,
          },
          {
            name: "Clinic Plus Strong & Long Shampoo 650ml",
            description:
              "Shampoo for strong, long and manageable hair.",
            price: 399,
            category_id: 7,
            image_url: img("shampoo,blue,bottle"),
            stock: 100,
          },
          {
            name: "Head & Shoulders Anti-Dandruff Shampoo 650ml",
            description:
              "Anti-dandruff shampoo for scalp care.",
            price: 525,
            category_id: 7,
            image_url: img("shampoo,anti-dandruff"),
            stock: 80,
          },
          {
            name: "L'Oréal Paris Total Repair 5 Conditioner",
            description:
              "Hair conditioner that helps repair damaged hair.",
            price: 349,
            category_id: 7,
            image_url: img("conditioner,hair,loreal"),
            stock: 75,
          },
          {
            name: "Mamaearth Onion Hair Oil 250ml",
            description:
              "Onion hair oil for reducing hair fall and boosting growth.",
            price: 599,
            category_id: 7,
            image_url: img("hair-oil,onion,beauty"),
            stock: 70,
          },
          {
            name: "Parachute 100% Pure Coconut Oil 600ml",
            description:
              "Edible grade coconut oil for hair and cooking.",
            price: 260,
            category_id: 7,
            image_url: img("coconut-oil,bottle"),
            stock: 120,
          },
          {
            name: "Nivea Nourishing Body Lotion 400ml",
            description:
              "Body lotion for dry skin with deep moisture serum.",
            price: 399,
            category_id: 7,
            image_url: img("body-lotion,nivea,skin"),
            stock: 110,
          },
          {
            name: "Vaseline Intensive Care Body Lotion 400ml",
            description:
              "Body lotion that provides deep moisturization for skin.",
            price: 379,
            category_id: 7,
            image_url: img("body-lotion,vaseline"),
            stock: 100,
          },
          {
            name: "Lakmé 9 to 5 Primer + Matte Lip Color",
            description:
              "Long-lasting matte lipstick with built-in primer.",
            price: 499,
            category_id: 7,
            image_url: img("lipstick,makeup,lakme"),
            stock: 80,
          },
          {
            name: "Maybelline Colossal Kajal 0.35g",
            description:
              "Smudge-resistant black kajal for everyday eye makeup.",
            price: 199,
            category_id: 7,
            image_url: img("kajal,eyeliner,makeup"),
            stock: 150,
          },
          {
            name: "Lakmé Perfecting Liquid Foundation",
            description:
              "Liquid foundation for natural looking coverage.",
            price: 199,
            category_id: 7,
            image_url: img("foundation,makeup,beauty"),
            stock: 90,
          },
          {
            name: "Garnier Micellar Cleansing Water 400ml",
            description:
              "Makeup remover and cleanser suitable for sensitive skin.",
            price: 399,
            category_id: 7,
            image_url: img("micellar-water,skincare"),
            stock: 80,
          },
          {
            name: "Ponds Super Light Gel Oil Free Moisturizer",
            description:
              "Gel-based moisturizer with hyaluronic acid and vitamin E.",
            price: 299,
            category_id: 7,
            image_url: img("moisturizer,cream,face"),
            stock: 120,
          },
          {
            name: "Biotique Bio Morning Nectar Face Cream",
            description:
              "Ayurvedic face moisturizer for all skin types.",
            price: 249,
            category_id: 7,
            image_url: img("face-cream,beauty,ayurveda"),
            stock: 90,
          },
          {
            name: "Gillette Mach3 Razor with 2 Cartridges",
            description:
              "Triple-blade razor for a smooth shave.",
            price: 399,
            category_id: 7,
            image_url: img("razor,shaving,gillette"),
            stock: 110,
          },
          {
            name: "Gillette Classic Shaving Foam 418g",
            description:
              "Shaving foam for a rich and smooth lather.",
            price: 299,
            category_id: 7,
            image_url: img("shaving-foam,bathroom"),
            stock: 130,
          },
          {
            name: "Nivea Men Fresh Active Deodorant 150ml",
            description:
              "Long-lasting deodorant spray for men.",
            price: 229,
            category_id: 7,
            image_url: img("deodorant,nivea,men"),
            stock: 120,
          },
          {
            name: "Set Wet Vertical Hold Hair Gel 250ml",
            description:
              "Hair styling gel for long-lasting hold.",
            price: 199,
            category_id: 7,
            image_url: img("hair-gel,styling"),
            stock: 100,
          },
          {
            name: "Colgate Total Advanced Toothpaste 150g",
            description:
              "Fluoride toothpaste for complete oral care.",
            price: 155,
            category_id: 7,
            image_url: img("toothpaste,oral-care"),
            stock: 200,
          },

          // -------------------- 8. TOYS & GAMES --------------------
          {
            name: "LEGO Classic Bricks and Eyes Set",
            description:
              "Lego brick set to spark kids' creative building.",
            price: 1999,
            category_id: 8,
            image_url: img("lego,blocks,toy"),
            stock: 60,
          },
          {
            name: "Hot Wheels 5-Car Gift Pack",
            description:
              "Pack of 5 die-cast Hot Wheels cars.",
            price: 699,
            category_id: 8,
            image_url: img("toy-cars,hotwheels"),
            stock: 90,
          },
          {
            name: "Barbie Dreamhouse Doll",
            description:
              "Barbie doll with dreamy outfit and accessories.",
            price: 2499,
            category_id: 8,
            image_url: img("barbie,doll,toy"),
            stock: 45,
          },
          {
            name: "Nerf Elite Disruptor Blaster",
            description:
              "Nerf dart blaster with rotating drum and quick-draw design.",
            price: 1499,
            category_id: 8,
            image_url: img("nerf,blaster,toy"),
            stock: 50,
          },
          {
            name: "Monopoly Classic Board Game",
            description:
              "Classic property trading board game for families.",
            price: 1499,
            category_id: 8,
            image_url: img("board-game,monopoly"),
            stock: 70,
          },
          {
            name: "Scrabble Original Board Game",
            description:
              "Classic word making board game for 2-4 players.",
            price: 1399,
            category_id: 8,
            image_url: img("board-game,scrabble,letters"),
            stock: 60,
          },
          {
            name: "UNO Card Game",
            description:
              "Fast-paced matching card game suitable for all ages.",
            price: 249,
            category_id: 8,
            image_url: img("uno,card-game,toy"),
            stock: 120,
          },
          {
            name: "Jenga Classic Block Game",
            description:
              "Stacking tower game requiring skill and precision.",
            price: 899,
            category_id: 8,
            image_url: img("jenga,blocks,game"),
            stock: 75,
          },
          {
            name: "Original Rubik's Cube 3x3",
            description:
              "3x3 Rubik's Cube puzzle with smooth rotation.",
            price: 499,
            category_id: 8,
            image_url: img("rubiks-cube,puzzle,toy"),
            stock: 100,
          },
          {
            name: "Funskool Activity Ball for Toddlers",
            description:
              "Colorful activity ball with multiple learning features.",
            price: 699,
            category_id: 8,
            image_url: img("baby-toy,activity,ball"),
            stock: 80,
          },
          {
            name: "PlayShifu Orboot Globe AR Toy",
            description:
              "Interactive globe with augmented reality app for learning.",
            price: 2499,
            category_id: 8,
            image_url: img("globe,educational,toy"),
            stock: 40,
          },
          {
            name: "Remote Control Racing Car",
            description:
              "High-speed RC car with rechargeable battery.",
            price: 1699,
            category_id: 8,
            image_url: img("rc-car,toy,racing"),
            stock: 60,
          },
          {
            name: "Wooden Train Set with Tracks",
            description:
              "Wooden toy train with tracks and accessories.",
            price: 1499,
            category_id: 8,
            image_url: img("toy-train,wooden"),
            stock: 50,
          },
          {
            name: "Kids Kitchen Play Set",
            description:
              "Mini kitchen set with utensils and stove for pretend play.",
            price: 1299,
            category_id: 8,
            image_url: img("kitchen-toy,children"),
            stock: 70,
          },
          {
            name: "Teddy Bear 3 Feet Soft Toy",
            description:
              "Large soft teddy bear stuffed toy for kids.",
            price: 1799,
            category_id: 8,
            image_url: img("teddy-bear,soft-toy"),
            stock: 40,
          },
          {
            name: "Stuffed Panda Soft Toy",
            description:
              "Cute panda soft toy made with plush fabric.",
            price: 899,
            category_id: 8,
            image_url: img("panda,soft-toy,cute"),
            stock: 60,
          },
          {
            name: "Play-Doh Modeling Compound Pack of 6",
            description:
              "Set of 6 colorful Play-Doh tubs for creative play.",
            price: 599,
            category_id: 8,
            image_url: img("playdoh,clay,children"),
            stock: 90,
          },
          {
            name: "Spider-Man Action Figure",
            description:
              "Posable Spider-Man action figure for kids above 4 years.",
            price: 999,
            category_id: 8,
            image_url: img("spiderman,action-figure,toy"),
            stock: 65,
          },
          {
            name: "Marvel Avengers Puzzle 500 Pieces",
            description:
              "500-piece jigsaw puzzle featuring Avengers artwork.",
            price: 799,
            category_id: 8,
            image_url: img("puzzle,jigsaw,marvel"),
            stock: 55,
          },
          {
            name: "Mini Foosball Table Game",
            description:
              "Tabletop foosball game for home and office fun.",
            price: 1599,
            category_id: 8,
            image_url: img("foosball,table,game"),
            stock: 35,
          },

          // -------------------- 9. FURNITURE & HOME DECOR --------------------
          {
            name: "Nilkamal Plastic Armless Chair",
            description:
              "Durable molded plastic chair for indoor and outdoor use.",
            price: 899,
            category_id: 9,
            image_url: img("chair,plastic,home"),
            stock: 120,
          },
          {
            name: "Godrej Interio Mid-Back Office Chair",
            description:
              "Ergonomic office chair with breathable mesh back.",
            price: 6999,
            category_id: 9,
            image_url: img("office-chair,desk"),
            stock: 40,
          },
          {
            name: "Green Soul Monster Gaming Chair",
            description:
              "Reclining gaming chair with adjustable armrests and lumbar support.",
            price: 17999,
            category_id: 9,
            image_url: img("gaming-chair,pc,desk"),
            stock: 20,
          },
          {
            name: "Wakefit Orthopedic Memory Foam Mattress Queen",
            description:
              "Memory foam mattress providing orthopaedic support for sound sleep.",
            price: 13999,
            category_id: 9,
            image_url: img("mattress,bedroom,bed"),
            stock: 25,
          },
          {
            name: "Sleepyhead Original Foam Mattress",
            description:
              "Medium-firm foam mattress with breathable fabric.",
            price: 12499,
            category_id: 9,
            image_url: img("bed,mattress,home"),
            stock: 22,
          },
          {
            name: "Durian Study Table Engineered Wood",
            description:
              "Compact study table with storage shelves.",
            price: 5999,
            category_id: 9,
            image_url: img("study-table,desk,home-office"),
            stock: 35,
          },
          {
            name: "Urban Ladder Coffee Table",
            description:
              "Modern coffee table for living room with storage space.",
            price: 7499,
            category_id: 9,
            image_url: img("coffee-table,living-room"),
            stock: 30,
          },
          {
            name: "Home Centre TV Unit",
            description:
              "TV unit with open shelves and cabinets for storage.",
            price: 11999,
            category_id: 9,
            image_url: img("tv-unit,entertainment"),
            stock: 20,
          },
          {
            name: "IKEA Lack Side Table",
            description:
              "Simple and minimalist side table for living room.",
            price: 1999,
            category_id: 9,
            image_url: img("side-table,ikea,home"),
            stock: 40,
          },
          {
            name: "Nilkamal Freedom Mini Shoe Rack",
            description:
              "Compact shoe rack with multiple tiers.",
            price: 2499,
            category_id: 9,
            image_url: img("shoe-rack,entryway"),
            stock: 45,
          },
          {
            name: "Flipkart Perfect Homes Bookshelf 5-Shelf",
            description:
              "Engineered wood bookshelf with five open shelves.",
            price: 4999,
            category_id: 9,
            image_url: img("bookshelf,books,furniture"),
            stock: 30,
          },
          {
            name: "Solimo 3-Seater Fabric Sofa",
            description:
              "Comfortable fabric sofa with cushions for living room.",
            price: 18999,
            category_id: 9,
            image_url: img("sofa,living-room,couch"),
            stock: 18,
          },
          {
            name: "Solimo Engineered Wood Wardrobe 3-Door",
            description:
              "Three-door wardrobe with hanging space and drawers.",
            price: 16999,
            category_id: 9,
            image_url: img("wardrobe,closet,clothes"),
            stock: 15,
          },
          {
            name: "Ceiling Pendant Light Fixture",
            description:
              "Modern ceiling pendant light for dining or living area.",
            price: 3499,
            category_id: 9,
            image_url: img("pendant-light,ceiling,decor"),
            stock: 40,
          },
          {
            name: "Wall Mounted Floating Shelves Set of 3",
            description:
              "Set of decorative floating shelves for home decor.",
            price: 1799,
            category_id: 9,
            image_url: img("wall-shelf,decor"),
            stock: 60,
          },
          {
            name: "XXL Bean Bag with Beans",
            description:
              "Comfortable bean bag chair with filled beans.",
            price: 2999,
            category_id: 9,
            image_url: img("bean-bag,chair,lounge"),
            stock: 35,
          },
          {
            name: "Blackout Curtains Set 7 Feet",
            description:
              "Pair of blackout curtains for bedroom or living room.",
            price: 2299,
            category_id: 9,
            image_url: img("curtains,window,home"),
            stock: 50,
          },
          {
            name: "Wooden Floor Lamp Tripod Stand",
            description:
              "Tripod floor lamp with fabric shade for ambient lighting.",
            price: 3999,
            category_id: 9,
            image_url: img("floor-lamp,lighting,home"),
            stock: 20,
          },
          {
            name: "Cotton Double Bedsheet with 2 Pillow Covers",
            description:
              "Printed cotton double bedsheet set.",
            price: 1299,
            category_id: 9,
            image_url: img("bedsheet,bedroom,linen"),
            stock: 80,
          },
          {
            name: "Decorative Wall Clock for Living Room",
            description:
              "Large designer wall clock for home decor.",
            price: 1999,
            category_id: 9,
            image_url: img("wall-clock,home-decor"),
            stock: 45,
          },

          // -------------------- 10. AUTOMOTIVE & BIKE ACCESSORIES --------------------
          {
            name: "Hero Splendor Plus Full Bike Cover",
            description:
              "Water-resistant bike cover suitable for Hero Splendor and similar bikes.",
            price: 699,
            category_id: 10,
            image_url: img("bike-cover,motorcycle,parking"),
            stock: 90,
          },
          {
            name: "Honda Activa 6G Seat Cover",
            description:
              "Padded seat cover designed for Honda Activa scooters.",
            price: 899,
            category_id: 10,
            image_url: img("scooter-seat,cover"),
            stock: 60,
          },
          {
            name: "Vega Crux Flip-Up Helmet Black",
            description:
              "ISI-certified flip-up full face helmet with scratch-resistant visor.",
            price: 1699,
            category_id: 10,
            image_url: img("helmet,motorcycle,safety"),
            stock: 70,
          },
          {
            name: "Steelbird SBA-2 Full Face Helmet",
            description:
              "Aggressive styled full face helmet with tinted visor.",
            price: 2399,
            category_id: 10,
            image_url: img("helmet,bike,rider"),
            stock: 50,
          },
          {
            name: "Castrol Power1 4T 10W-40 Engine Oil 1L",
            description:
              "Synthetic engine oil for 4-stroke motorcycles.",
            price: 499,
            category_id: 10,
            image_url: img("engine-oil,motorbike"),
            stock: 120,
          },
          {
            name: "Motul 3100 4T Gold 10W-40 Engine Oil 1L",
            description:
              "Premium semi-synthetic engine oil for bikes.",
            price: 599,
            category_id: 10,
            image_url: img("motul,engine-oil,bike"),
            stock: 110,
          },
          {
            name: "Bosch Clear Advantage Wiper Blade 16 inch",
            description:
              "High-quality wiper blade for cars with clear wiping performance.",
            price: 599,
            category_id: 10,
            image_url: img("wiper-blade,car,rain"),
            stock: 80,
          },
          {
            name: "Philips X-tremeVision Plus H4 Headlight Bulbs",
            description:
              "Halogen headlight bulbs providing extra brightness.",
            price: 1499,
            category_id: 10,
            image_url: img("headlight,car,bulb"),
            stock: 40,
          },
          {
            name: "Turtle Wax Car Shampoo 1L",
            description:
              "Foaming car wash shampoo safe for all paint finishes.",
            price: 499,
            category_id: 10,
            image_url: img("car-wash,shampoo,cleaning"),
            stock: 90,
          },
          {
            name: "3M Car Care Dashboard Dresser 500ml",
            description:
              "Protects and shines car dashboards and interiors.",
            price: 399,
            category_id: 10,
            image_url: img("car-dashboard,cleaner"),
            stock: 100,
          },
          {
            name: "Michelin Digital Tyre Inflator",
            description:
              "Portable digital tyre inflator for cars and bikes.",
            price: 3699,
            category_id: 10,
            image_url: img("tyre-inflator,air-pump"),
            stock: 25,
          },
          {
            name: "Amaron 35Ah Car Battery (Generic Model)",
            description:
              "Maintenance-free 35Ah car battery suitable for hatchbacks.",
            price: 4599,
            category_id: 10,
            image_url: img("car-battery,engine-bay"),
            stock: 15,
          },
          {
            name: "iGrip Anti-Skid 3D Car Mats Full Set",
            description:
              "Set of 3D anti-skid car mats for front and rear seats.",
            price: 3299,
            category_id: 10,
            image_url: img("car-mats,interior,floor"),
            stock: 30,
          },
          {
            name: "Godrej Steering Wheel Lock",
            description:
              "Anti-theft steering lock for added car security.",
            price: 1899,
            category_id: 10,
            image_url: img("steering-lock,car-security"),
            stock: 25,
          },
          {
            name: "Motul Chain Lube Road 150ml",
            description:
              "Spray chain lubricant suitable for motorcycles.",
            price: 449,
            category_id: 10,
            image_url: img("chain-lube,motorcycle"),
            stock: 80,
          },
          {
            name: "Car Mobile Holder for Dashboard and Windshield",
            description:
              "Adjustable mobile holder for car dashboard and windshield.",
            price: 799,
            category_id: 10,
            image_url: img("car-phone-holder,mobile,accessory"),
            stock: 140,
          },
          {
            name: "Dual USB Fast Car Charger 36W",
            description:
              "Fast charging car charger with dual USB ports.",
            price: 699,
            category_id: 10,
            image_url: img("car-charger,usb,fast"),
            stock: 130,
          },
          {
            name: "Microfiber Cleaning Cloth Set of 6",
            description:
              "Pack of 6 microfiber cloths for car and home cleaning.",
            price: 399,
            category_id: 10,
            image_url: img("microfiber-cloth,cleaning,car"),
            stock: 200,
          },
          {
            name: "Rain-X Anti Fog Interior Glass Treatment",
            description:
              "Anti-fog solution for car interior glass and mirrors.",
            price: 699,
            category_id: 10,
            image_url: img("car-window,anti-fog"),
            stock: 60,
          },
          {
            name: "Premium Car Perfume Gel",
            description:
              "Long-lasting car air freshener gel fragrance.",
            price: 349,
            category_id: 10,
            image_url: img("car-perfume,air-freshener"),
            stock: 150,
          },
        ];

        const productStmt = db.prepare(
          "INSERT INTO products (name, description, price, category_id, image_url, stock) VALUES (?, ?, ?, ?, ?, ?)"
        );

        products.forEach((p) => {
          productStmt.run([
            p.name,
            p.description,
            p.price,
            p.category_id,
            p.image_url,
            p.stock,
          ]);
        });

        productStmt.finalize();

        console.log("Seeded 10 realistic categories and 200 realistic products.");
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

app.get("/api/user/address", authenticateToken, (req, res) => {
    db.get(`SELECT * FROM user_addresses WHERE user_id = ?`, [req.user.id], (err, row) => {
        if (err) return res.status(500).json({ message: "DB error" });
        res.json(row || null);
    });
});

app.post("/api/user/address", authenticateToken, (req, res) => {
    const {
        full_name,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country
    } = req.body;

    db.get(`SELECT id FROM user_addresses WHERE user_id = ?`, [req.user.id], (err, row) => {
        if (row) {
            // Update
            db.run(`
                UPDATE user_addresses 
                SET full_name=?, phone=?, address_line1=?, address_line2=?, city=?, state=?, postal_code=?, country=?, updated_at=CURRENT_TIMESTAMP  
                WHERE user_id=?
            `, [full_name, phone, address_line1, address_line2, city, state, postal_code, country, req.user.id]);

            res.json({ message: "Address updated" });
        } else {
            // Insert
            db.run(`
                INSERT INTO user_addresses 
                (user_id, full_name, phone, address_line1, address_line2, city, state, postal_code, country)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [req.user.id, full_name, phone, address_line1, address_line2, city, state, postal_code, country]);

            res.json({ message: "Address saved" });
        }
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
