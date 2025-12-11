# E-Commerce API Documentation

## Table of Contents
1. [Authentication Endpoints](#authentication-endpoints)
2. [Public Endpoints](#public-endpoints)
3. [Cart Endpoints](#cart-endpoints)
4. [Checkout & Orders](#checkout--orders)
5. [User Profile](#user-profile)
6. [Address Management](#address-management)
7. [Coupon Management](#coupon-management)
8. [Admin Endpoints](#admin-endpoints)
9. [Password Reset](#password-reset)

---

## Authentication Endpoints

### 1. Register User
**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Error Responses:**
- `400` - Missing required fields or email already exists
- `500` - Server error

---

### 2. Login
**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "name": "John Doe",
    "is_admin": false
  }
}
```

**Error Responses:**
- `401` - Invalid credentials
- `500` - Server error

---

### 3. Logout
**Endpoint:** `POST /api/auth/logout`

**Response (200 OK):**
```json
{
  "message": "Logged out (client should delete token)"
}
```

---

## Public Endpoints

### 4. Get Categories
**Endpoint:** `GET /api/categories`

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Electronics"
  },
  {
    "id": 2,
    "name": "Home Appliances"
  }
]
```

---

### 5. Get Products
**Endpoint:** `GET /api/products`

**Query Parameters:**
- `category` (optional) - Filter by category ID
- `minPrice` (optional) - Minimum price filter
- `maxPrice` (optional) - Maximum price filter
- `search` (optional) - Search in name/description

**Example:** `GET /api/products?category=1&minPrice=100&search=phone`

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "iPhone 15",
    "description": "Latest iPhone",
    "price": 79999,
    "category_id": 1,
    "image_url": "https://source.unsplash.com/600x600/?iphone",
    "stock": 25,
    "created_at": "2024-01-01 10:00:00"
  }
]
```

---

### 6. Get Single Product
**Endpoint:** `GET /api/products/:id`

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "iPhone 15",
  "description": "Latest iPhone",
  "price": 79999,
  "category_id": 1,
  "image_url": "https://source.unsplash.com/600x600/?iphone",
  "stock": 25,
  "created_at": "2024-01-01 10:00:00"
}
```

**Error Responses:**
- `404` - Product not found

---

## Cart Endpoints
*Requires Authentication*

### 7. Get Cart
**Endpoint:** `GET /api/cart`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "cart_id": 1,
  "items": [
    {
      "id": 1,
      "product_id": 1,
      "quantity": 2,
      "name": "iPhone 15",
      "price": 79999,
      "image_url": "https://source.unsplash.com/600x600/?iphone"
    }
  ],
  "total": 159998
}
```

---

### 8. Add Item to Cart
**Endpoint:** `POST /api/cart/items`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "product_id": 1,
  "quantity": 2
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "cart_id": 1,
  "product_id": 1,
  "quantity": 2
}
```

**Error Responses:**
- `400` - Missing required fields
- `500` - Server error

---

### 9. Update Cart Item Quantity
**Endpoint:** `PUT /api/cart/items/:id`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "quantity": 3
}
```

**Error Responses:**
- `400` - Invalid quantity
- `404` - Cart item not found

---

### 10. Remove Cart Item
**Endpoint:** `DELETE /api/cart/items/:id`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "message": "Item removed"
}
```

---

## Checkout & Orders

### 11. Checkout
**Endpoint:** `POST /api/checkout`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "payment_method": "card",
  "coupon_code": "WELCOME10",
  "discount": 0,
  "card": {
    "number": "4111111111111111",
    "exp_month": 12,
    "exp_year": 2025,
    "cvv": "123"
  }
}
```

**Response (200 OK):**
```json
{
  "message": "Order placed successfully",
  "order_id": 1,
  "subtotal": 159998,
  "discount": 15999.8,
  "final_amount": 143998.2,
  "payment_method": "card"
}
```

**Error Responses:**
- `400` - Cart is empty, invalid card, insufficient balance, etc.
- `500` - Server error

---

### 12. Get User Orders
**Endpoint:** `GET /api/user/orders`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "total_amount": 159998,
    "discount": 15999.8,
    "final_amount": 143998.2,
    "payment_method": "card",
    "status": "PLACED",
    "created_at": "2024-01-01 10:00:00"
  }
]
```

---

### 13. Get Order Items
**Endpoint:** `GET /api/user/orders/:id/items`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
[
  {
    "product_id": 1,
    "quantity": 2,
    "price": 79999,
    "name": "iPhone 15",
    "image_url": "https://source.unsplash.com/600x600/?iphone"
  }
]
```

---

## User Profile

### 14. Get User Profile
**Endpoint:** `GET /api/me`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9999999999"
}
```

---

### 15. Update Profile
**Endpoint:** `PUT /api/user/profile`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "name": "John Smith",
  "phone": "8888888888"
}
```

**Response (200 OK):**
```json
{
  "message": "Profile updated successfully"
}
```

---

### 16. Change Password
**Endpoint:** `PUT /api/user/change-password`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "old_password": "oldpassword",
  "new_password": "newpassword"
}
```

**Response (200 OK):**
```json
{
  "message": "Password updated successfully"
}
```

**Error Responses:**
- `400` - Incorrect old password

---

## Address Management

### 17. Get User Address
**Endpoint:** `GET /api/user/address`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "user_id": 1,
  "full_name": "John Doe",
  "phone": "9999999999",
  "address_line1": "123 Main St",
  "address_line2": "Apt 4B",
  "city": "New York",
  "state": "NY",
  "postal_code": "10001",
  "country": "USA",
  "created_at": "2024-01-01 10:00:00",
  "updated_at": "2024-01-01 10:00:00"
}
```

---

### 18. Save/Update Address
**Endpoint:** `POST /api/user/address`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "full_name": "John Doe",
  "phone": "9999999999",
  "address_line1": "123 Main St",
  "address_line2": "Apt 4B",
  "city": "New York",
  "state": "NY",
  "postal_code": "10001",
  "country": "USA"
}
```

**Response (200 OK):**
```json
{
  "message": "Address saved"
}
```

---

## Coupon Management

### 19. Validate Coupon
**Endpoint:** `POST /api/coupons/validate`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "code": "WELCOME10",
  "cart_total": 1000
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "discount": 100,
  "final_total": 900,
  "coupon": {
    "id": 1,
    "code": "WELCOME10",
    "discount_type": "percent",
    "discount_value": 10,
    "min_amount": 0,
    "expires_at": "2024-12-31T23:59:59.000Z",
    "is_active": 1
  }
}
```

**Error Responses:**
- `400` - Invalid coupon, expired, or minimum amount not met

---

## Admin Endpoints
*Requires Admin Privileges*

### 20. Admin Dashboard Stats
**Endpoint:** `GET /api/admin/dashboard`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "total_users": 150,
  "total_products": 200,
  "total_orders": 500,
  "total_revenue": 2500000
}
```

---

### 21. Get All Users (Admin)
**Endpoint:** `GET /api/admin/users`

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Admin",
    "email": "admin@example.com",
    "is_admin": 1,
    "created_at": "2024-01-01 10:00:00"
  }
]
```

---

### 22. Get All Orders (Admin)
**Endpoint:** `GET /api/admin/orders`

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "user_email": "john@example.com",
    "subtotal": 159998,
    "discount": 15999.8,
    "final_total": 143998.2,
    "payment_method": "card",
    "status": "PLACED",
    "created_at": "2024-01-01 10:00:00"
  }
]
```

---

### 23. Update Order Status (Admin)
**Endpoint:** `PUT /api/admin/orders/:id/status`

**Request Body:**
```json
{
  "status": "SHIPPED"
}
```

**Response (200 OK):**
```json
{
  "message": "Status updated"
}
```

**Valid Status Values:** `["PLACED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"]`

---

### 24. Create Product (Admin)
**Endpoint:** `POST /api/admin/products`

**Request Body:**
```json
{
  "name": "New Product",
  "description": "Product description",
  "price": 999,
  "category_id": 1,
  "image_url": "https://example.com/image.jpg",
  "stock": 100
}
```

**Response (201 Created):**
```json
{
  "id": 201,
  "name": "New Product",
  "price": 999
}
```

---

### 25. Update Product (Admin)
**Endpoint:** `PUT /api/admin/products/:id`

**Request Body:**
```json
{
  "name": "Updated Product",
  "description": "Updated description",
  "price": 899,
  "category_id": 1,
  "image_url": "https://example.com/new-image.jpg",
  "stock": 80
}
```

**Response (200 OK):**
```json
{
  "message": "Product updated"
}
```

---

### 26. Delete Product (Admin)
**Endpoint:** `DELETE /api/admin/products/:id`

**Response (200 OK):**
```json
{
  "message": "Product deleted"
}
```

---

### 27. Create Category (Admin)
**Endpoint:** `POST /api/admin/categories`

**Request Body:**
```json
{
  "name": "New Category"
}
```

**Response (200 OK):**
```json
{
  "id": 11,
  "name": "New Category"
}
```

---

### 28. Update Category (Admin)
**Endpoint:** `PUT /api/admin/categories/:id`

**Request Body:**
```json
{
  "name": "Updated Category"
}
```

**Response (200 OK):**
```json
{
  "message": "Category updated"
}
```

---

### 29. Delete Category (Admin)
**Endpoint:** `DELETE /api/admin/categories/:id`

**Response (200 OK):**
```json
{
  "message": "Category deleted"
}
```

---

### 30. Credit Card Management (Admin)

#### Get All Cards
**Endpoint:** `GET /api/admin/cards`

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "card_number": "4111111111111111",
    "card_holder": "John Doe",
    "expiry_month": 12,
    "expiry_year": 2025,
    "cvv": "123",
    "balance": 50000,
    "status": "ACTIVE",
    "created_at": "2024-01-01 10:00:00"
  }
]
```

#### Get Single Card
**Endpoint:** `GET /api/admin/cards/:id`

#### Create Card
**Endpoint:** `POST /api/admin/cards`

**Request Body:**
```json
{
  "card_number": "5555555555554444",
  "card_holder": "Jane Smith",
  "expiry_month": 6,
  "expiry_year": 2026,
  "cvv": "456",
  "balance": 30000,
  "status": "ACTIVE"
}
```

#### Update Card
**Endpoint:** `PUT /api/admin/cards/:id`

#### Delete Card
**Endpoint:** `DELETE /api/admin/cards/:id`

---

### 31. Coupon Management (Admin)

#### Get All Coupons
**Endpoint:** `GET /api/admin/coupons`

#### Get Single Coupon
**Endpoint:** `GET /api/admin/coupons/:id`

#### Create Coupon
**Endpoint:** `POST /api/admin/coupons`

**Request Body:**
```json
{
  "code": "NEWYEAR30",
  "discount_type": "percent",
  "discount_value": 30,
  "min_amount": 2000,
  "expires_at": "2024-12-31T23:59:59.000Z",
  "is_active": 1
}
```

#### Update Coupon
**Endpoint:** `PUT /api/admin/coupons/:id`

#### Delete Coupon
**Endpoint:** `DELETE /api/admin/coupons/:id`

---

## Password Reset

### 32. Send OTP
**Endpoint:** `POST /api/reset-password/send-otp`

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "OTP generated",
  "otp": 123456
}
```

**Error Responses:**
- `400` - Email not found

---

### 33. Verify OTP and Reset Password
**Endpoint:** `POST /api/reset-password/verify`

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": 123456,
  "new_password": "newpassword123"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset successful"
}
```

**Error Responses:**
- `400` - Invalid OTP, expired, or not requested
- `500` - Server error

---

## Root Endpoint

### 34. API Documentation
**Endpoint:** `GET /`

**Response (200 OK):**
```json
{
  "message": "Simple E-commerce API",
  "docs": {
    "auth": [
      "POST /api/auth/register",
      "POST /api/auth/login",
      "POST /api/auth/logout"
    ],
    "products": [
      "GET /api/products?category=&minPrice=&maxPrice=&search=",
      "GET /api/products/:id"
    ],
    "cart": [
      "GET /api/cart",
      "POST /api/cart/items",
      "PUT /api/cart/items/:id",
      "DELETE /api/cart/items/:id"
    ],
    "checkout": ["POST /api/checkout"],
    "admin": [
      "GET /api/admin/users",
      "GET /api/admin/orders",
      "GET /api/admin/dashboard",
      "POST /api/admin/products",
      "PUT /api/admin/products/:id",
      "DELETE /api/admin/products/:id",
      "POST /api/admin/categories"
    ]
  }
}
```

---

## Authentication Requirements

Most endpoints require JWT authentication. Include the token in the request header:
```
Authorization: Bearer <jwt_token>
```

Admin endpoints require both authentication and admin privileges (`is_admin = 1`).

---

## Default Credentials

After seeding:
- **Admin:** `admin@example.com` / `admin123`
- **User:** `user@example.com` / `user123`

---

## Notes
1. All prices are in Indian Rupees (₹)
2. JWT tokens expire in 1 hour
3. Images use Unsplash placeholder URLs
4. Database is SQLite with file `ecommerce.db`
5. Server runs on port 5000 by default
