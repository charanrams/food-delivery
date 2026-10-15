A3 Kitchen — Complete Food Delivery App & Website Plan
A3 Kitchen
Individual Kitchen Food Ordering & Delivery Platform
A3 Kitchen will be a food ordering and delivery platform inspired by Zomato, but designed specifically for one individual kitchen or food business, rather than a marketplace with multiple restaurants.
Customers browse food categories, place orders, track delivery, and confirm receipt using an OTP. The admin manages the kitchen and orders, while delivery partners handle assigned deliveries.












1. App name and purpose
App name: A3 Kitchen
Tagline: Freshly Prepared. Delivered with Care.
Business model: Single-kitchen food ordering and delivery.
Platforms to build:
- Customer website — browse, order, pay, and track deliveries.
- Customer mobile app — Flutter for Android and iOS.
- Admin dashboard — manage products, orders, customers, delivery partners, and reports.
- Delivery partner dashboard — view assigned orders, update delivery status, and verify delivery OTP.
- Backend API — Node.js and Express.js.
- Database — MongoDB with Mongoose.
App purpose
The primary purpose is to help A3 Kitchen sell its food directly to customers through its own website and mobile app. The platform should provide a smooth ordering experience, centralized order management, and a controlled delivery process from kitchen preparation to customer handover.
2. Target audience









Customers
People, families, students, and working professionals who want to order meals from A3 Kitchen.












Kitchen administrator
The owner or staff member who manages the menu, stock, orders, preparation, payments, and delivery assignments.












Delivery partners
Delivery staff who accept assigned tasks, collect prepared food, and deliver orders to customers.



3. Brand identity and colour palette
Your uploaded logo uses a copper-orange colour with a white background and an elegant circular border. The application should preserve this identity across the website, dashboards, and Flutter app.

Copper Orange — Primary
Brand identity, main buttons, highlights
#C8793E

 Copy


Deep Copper — Secondary
Hover states, active navigation, emphasis
#A95727

 Copy


Warm Cream — Background
Website sections, page backgrounds
#FFF8F1

 Copy


White — Surface
Cards, modals, product panels
#FFFFFF

 Copy


Charcoal — Text
Headings, body text, dark elements
#29231F

 Copy

Use green for successful payments and delivered orders, red for errors and cancellations, and muted grey for secondary text. Keep copper orange as the primary brand colour rather than using it on every element.
4. Key features
The application should have three separate role-based dashboards, with a customer-facing website and mobile app.

A. Customer dashboard
Website + Flutter mobile app


Sign up and login


Home page and offers


Browse food categories


Search and filters


Food details and variants


Cart and quantity control


Address management


Online and cash payment options


Order placement


Live order status


Order history and reorder


OTP delivery confirmation


Ratings and reviews


Profile and notifications


Wishlist and favourites


Coupons and discounts





B. Admin dashboard
Complete kitchen operations management


Dashboard overview and KPIs


Create, edit and delete food items


Manage categories and food images


Set prices and availability


Receive new orders


Accept or reject orders


Manage preparation status


Assign delivery partners


Track active deliveries


Manage customer accounts


Manage delivery staff


Coupons and promotional banners


Payment and refund records


Delivery charges and service areas


Sales and order reports


Customer feedback management


Kitchen operating hours


Notifications and business settings


Role permissions and audit logs





C. Delivery partner dashboard
Mobile-first interface for delivery staff


Secure login


Online/offline toggle


Assigned orders list


Customer delivery address


Accept assigned task


Pickup instructions


Order pickup confirmation


Open navigation in Maps


Call customer


Update delivery status


OTP verification


Delivery history


Daily completed orders


Earnings summary


Availability and profile





5. Complete order workflow
This is the most important business logic in A3 Kitchen. The admin controls acceptance and assignment; the delivery partner controls pickup and delivery updates; the customer verifies the final handover.
01

Customer places an order

Selects food, address, payment method and confirms checkout.

02

Order reaches the admin

The new order appears in the kitchen dashboard with payment status.

03

Admin accepts or rejects

The kitchen checks stock, availability and preparation capacity.

04

Food preparation begins

Admin updates the order to Preparing.

05

Delivery partner is assigned

Admin assigns an available delivery partner to the order.

06

Partner picks up the food

Partner confirms collection and updates the status to Picked Up.

07

Customer receives an OTP

A secure, order-specific code is available to the customer for handover.

08

Partner verifies the OTP

The server validates the code and marks the order Delivered only if valid.


Important OTP rules
- Generate a random six-digit OTP when the order is ready for delivery, or immediately before handover according to your chosen workflow.
- Show the OTP only to the authenticated customer for that order.
- The delivery partner must enter the OTP in their app.
- Validate the OTP on the backend, not just in Flutter or React.
- Expire the OTP after a short period, limit incorrect attempts, and prevent reuse.
- Mark the order as Delivered only after successful verification.
- Record the verification time, delivery partner and order ID.
- Provide a controlled admin exception process for genuine OTP issues, with an audit log.
The customer should not be able to mark an order as delivered just by clicking a button.
6. Order status system
Use a consistent status system across the customer, admin and delivery interfaces.
Status	Who updates it?
PLACED	System
ACCEPTED	Admin
REJECTED	Admin
PREPARING	Admin
READY_FOR_PICKUP	Admin
ASSIGNED	Admin/system
PICKED_UP	Delivery partner
OUT_FOR_DELIVERY	Delivery partner
DELIVERED	Backend after valid OTP
CANCELLED	Authorized action, subject to policy
REFUND_PENDING	Payment/refund workflow
REFUNDED	Backend after payment provider confirms refund
Enforce allowed status transitions on the backend. For example, an order cannot jump from PLACED directly to DELIVERED.
7. Recommended website and app screens









Customer website
- Home and promotional hero section
- Category navigation and food listing
- Search results and product details
- Cart, checkout and payment
- Order tracking and OTP display
- Login, registration and profile
- Order history, reviews and support












Admin web dashboard
- Overview and sales metrics
- Live order queue
- Food menu and category CRUD
- Order details and preparation updates
- Delivery assignment and partner availability
- Customer and staff management
- Payments, reports and settings












Delivery mobile app
- Login and availability toggle
- Assigned order cards
- Pickup details and navigation
- Customer contact and address
- Delivery status controls
- OTP verification and delivery history



8. Recommended technology stack
Use one shared backend for the website and both mobile experiences. Do not create separate business logic for each client.
Layer	Technology
Customer website	React + Vite + TypeScript
Admin dashboard	React + Vite + TypeScript
Delivery partner app	Flutter
Customer mobile app	Flutter
Styling	Tailwind CSS for React; Flutter Material 3 for mobile
Backend	Node.js + Express.js + TypeScript
Database	MongoDB + Mongoose
Authentication	JWT access tokens, refresh-token rotation
Live order updates	Socket.IO
Image storage	AWS S3 or Cloudinary
Payments	Razorpay, with server-side verification
Maps and navigation	Google Maps or another map provider
Notifications	Firebase Cloud Messaging
Email	Nodemailer with SMTP
API documentation	Swagger / OpenAPI
Testing	Vitest or Jest, Supertest, Flutter tests
Deployment	AWS EC2 or container hosting, Nginx, Docker and CI/CD
React Context can manage frontend authentication and cart state without Redux. The backend remains the source of truth for prices, stock, permissions, payment status and order transitions.
9. Database design — MongoDB
Start with these collections. They support the MVP and leave room for future features.
Collection	Purpose
users	Customers, admins and delivery partner accounts
addresses	Customer delivery addresses
categories	Food categories and category images
products	Food name, description, images, price and availability
carts	Temporary customer cart data
orders	Items, price snapshot, customer, address and status
payments	Payment attempts, transaction IDs and refunds
deliveryAssignments	Assigned partner, pickup and delivery information
deliveryOtps	Hashed OTP, expiry, attempts and verification time
coupons	Discount codes, validity and usage limits
reviews	Customer ratings and feedback
notifications	In-app notifications and delivery updates
settings	Delivery fees, tax settings, service areas and kitchen hours
auditLogs	Important administrative and order actions
Important schema decisions
- Store money as integer paise to avoid floating-point rounding issues.
- Store product name, selected variant, quantity and price snapshots in each order. Historical orders should not change when the menu price changes.
- Store OTP hashes, not plaintext OTPs.
- Use MongoDB indexes for order number, customer ID, status, creation date and delivery partner ID.
- Use transactions where appropriate for stock reservation, payment and order creation, provided your MongoDB deployment supports transactions.
- Keep payment provider secrets and JWT secrets exclusively on the backend.
10. Backend API structure
Use a versioned REST API under /api/v1.
Authentication
/auth/register · /auth/login · /auth/refresh · /auth/logout · /auth/forgot-password


Customer and profile
/users/me · /addresses · /users/me/orders


Menu and categories
/categories · /products · /products/:id


Cart and checkout
/cart · /orders/checkout · /orders/:id


Admin operations
/admin/orders · /admin/products · /admin/categories · /admin/reports


Order lifecycle
/orders/:id/accept · /orders/:id/reject · /orders/:id/status


Delivery management
/delivery/assignments · /delivery/availability · /delivery/orders/:id/pickup


OTP and completion
/delivery/orders/:id/verify-otp


Payments
/payments/create · /payments/verify · /payments/webhook


Notifications
/notifications · /notifications/:id/read



These are proposed API contracts, not ready-to-use endpoints. Implement request validation, role authorization, error handling, pagination and rate limits consistently across them.
11. Automatic delivery assignment
For the initial version, I recommend admin-controlled assignment with automatic suggestions.
1. Admin accepts the order.
2. Kitchen starts preparation.
3. Admin sees delivery partners who are online and eligible.
4. The system suggests partners based on workload, location (if enabled) and active assignments.
5. Admin selects a partner.
6. The partner receives a notification.
7. The partner picks up the order and updates its progress.
Later, you can introduce automatic assignment based on estimated distance, partner capacity, delivery zones and preparation time.
Do not assign orders to offline partners or create duplicate active assignments. If a partner declines or becomes unavailable, the system should allow reassignment with a recorded reason.
12. Real-time tracking
Use Socket.IO for events such as:
- order:created
- order:accepted
- order:preparing
- delivery:assigned
- delivery:picked_up
- delivery:location_updated
- order:delivered
Only authorized users should receive events for the relevant order. A customer should not receive another customer's order data.
For live GPS tracking, the Flutter delivery app can periodically send location updates while a delivery is active and the partner has granted permission. This is a later-stage feature; basic order status tracking can work without live GPS.
13. Security and reliability requirements
Treat these as mandatory for production.
- Role-based access control for admin, customer and delivery partner.
- Password hashing using bcrypt or Argon2.
- Short-lived access tokens and secure refresh-token handling.
- Server-side price and coupon calculations.
- Payment signature verification and idempotent webhook processing.
- OTP expiration, attempt limits and replay protection.
- Request validation using Zod or an equivalent validation library.
- Rate limiting for login, checkout, OTP and payment endpoints.
- Secure HTTP headers, CORS restrictions, HTTPS and secret management.
- Audit logging for refunds, cancellations, order reassignment and administrative overrides.
- Automated backups, error monitoring and structured logs.
- Privacy-conscious handling of phone numbers, addresses and delivery location.
Do not trust the amount sent by a mobile app, a client-side payment success screen, or a delivery status supplied without server-side authorization.
14. Development roadmap: A to Z
Build the platform in phases instead of trying to implement everything at once.
Phase 1
Week 1

Foundation and design
Finalize requirements, create the logo assets and design system, define database schemas, API conventions and project structure.


Phase 2
Week 2

Authentication and menu
Implement login, roles, categories, food CRUD, product images, search, filters and availability.


Phase 3
Weeks 3–4

Customer ordering
Build website home, product details, cart, addresses, checkout, order creation and order history.


Phase 4
Week 5

Admin and kitchen operations
Build dashboard KPIs, incoming order queue, acceptance/rejection, preparation status, staff management and reports.


Phase 5
Week 6

Delivery and OTP
Implement partner login, assignments, pickup updates, delivery status, OTP verification and order completion.


Phase 6
Week 7

Payments and notifications
Integrate a payment gateway, verify webhooks, add push notifications and live order status.


Phase 7
Weeks 8–9

Flutter applications
Build customer and delivery apps using the same backend, including mobile navigation, forms, order screens and notifications.


Phase 8
Week 10

Testing and deployment
Test role permissions, payment failures, OTP abuse, order transitions, responsive layouts, backups and production deployment.



Estimated timeline: approximately 10 weeks for a focused initial implementation. Actual timing depends on team size, experience, testing requirements and third-party integration approvals.
15. What should be included in the MVP?
Start with a functional, end-to-end delivery experience before adding complex features.
MVP implementation checklist
19/19



Customer
[x] Register and login
[x] Browse categories and food
[x] Cart and checkout
[x] Manage delivery addresses
[x] Place orders and view status

Admin
[x] Manage menu and categories
[x] Accept or reject orders
[x] Update preparation status
[x] Assign delivery partners
[x] View orders and basic reports

Delivery
[x] Login and online/offline status
[x] View assigned orders
[x] Confirm pickup
[x] Verify delivery OTP

Platform
[x] Secure role-based access
[x] Payment integration or clearly labelled test mode
[x] Order notifications
[x] Server-side order validation
[x] Deployment and error logging

 Copy checklistCreate implementation plan

16. Recommended project folder structure
a3-kitchen/
├── apps/
│   ├── customer-web/       # React + Vite + Tailwind
│   ├── admin-web/          # React admin dashboard
│   ├── customer-mobile/    # Flutter customer app
│   └── delivery-mobile/    # Flutter delivery app
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── validators/
│   │   ├── sockets/
│   │   ├── jobs/
│   │   └── utils/
│   ├── tests/
│   └── package.json
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── DESIGN_SYSTEM.md
│   ├── SECURITY.md
│   └── IMPLEMENTATION_PLAN.md
├── docker-compose.yml
└── README.md


17. Future enhancements
Once the core application is stable, consider adding:
- Automatic delivery assignment and delivery-zone management.
- GPS-based tracking and estimated delivery times.
- Scheduled orders and repeat ordering.
- Loyalty points, referral codes and membership plans.
- Inventory deductions and low-stock alerts.
- Kitchen preparation-time analytics.
- WhatsApp notifications, where supported and consented to.
- Multiple languages, including Telugu and English.
- PWA support for customers who do not want to install an app.
- Customer support tickets and refund workflows.
My recommendation: Build A3 Kitchen as a single-kitchen platform first. Finish the menu, checkout, admin order workflow, delivery assignment and OTP verification before investing in advanced GPS tracking or automatic dispatch. This gives you a complete, testable business workflow with less complexity.
The next step is to create the full A3 Kitchen PRD, architecture, database schemas, API specification and implementation plan so the development can proceed module by module. 











For building the A3 Kitchen app idea into a working website and mobile app, consider a no-code app builder option.


Emergent Labs


Build Real Apps Without Code
Describe your idea, Emergent builds a production-ready app in minutes. Free — 10 credits included.



Ad
Ad options
















Create a detailed implementation plan for the A3 Kitchen food delivery platform using MERN, TypeScript and Flutter. Use the MVP checklist selected by me: Customer: DONE: Register and login, DONE: Browse categories and food, DONE: Cart and checkout, DONE: Manage delivery addresses, DONE: Place orders and view status; Admin: DONE: Manage menu and categories, DONE: Accept or reject orders, DONE: Update preparation status, DONE: Assign delivery partners, DONE: View orders and basic reports; Delivery: DONE: Login and online/offline status, DONE: View assigned orders, DONE: Confirm pickup, DONE: Verify delivery OTP; Platform: DONE: Secure role-based access, DONE: Payment integration or clearly labelled test mode, DONE: Order notifications, DONE: Server-side order validation, DONE: Deployment and error logging. Include project folder structure, MongoDB schemas, API contracts, order state machine, security, tests and phased coding tasks.












Worked for 1m 11s
Personalized recommendations around your MERN and Flutter preferences













A3 Kitchen — Detailed Implementation Plan
Project blueprint · MERN + TypeScript + Flutter · Single-kitchen food delivery · MVP scope
This document defines how to implement A3 Kitchen from project setup through production deployment. It is structured so you can use it as the main development reference or give it to Claude to implement the project module by module.
Important: The items you marked DONE are treated as selected MVP requirements, not as proof that the features have already been implemented or tested. Each feature must pass its acceptance tests before it is considered complete.
1. Project overview

A3 Kitchen
Freshly Prepared. Delivered with Care.
Single-kitchen food ordering and delivery platform inspired by Zomato.



Customer experience
React website + Flutter app

Operations
React admin dashboard

Delivery
Flutter delivery app

Backend
Node.js + Express + TypeScript

Database
MongoDB + Mongoose

Real-time updates
Socket.IO + push notifications



Primary business workflow
1. The customer registers, browses food and adds items to the cart.
2. The customer selects a delivery address, payment method and places an order.
3. The server validates the order and saves it.
4. The admin accepts or rejects the order.
5. The kitchen prepares the food and marks it ready.
6. The admin assigns an eligible delivery partner.
7. The delivery partner picks up the order and updates its status.
8. The customer provides the delivery OTP.
9. The backend verifies the OTP and marks the order delivered.
10. The system records payment, notifications, order history and audit information.
Architecture rule: Use one backend API and one source of truth for business rules. The website, admin dashboard and Flutter applications must not implement separate versions of the order or payment logic.
2. Final technology choices
Area	Technology
Customer website	React, Vite, TypeScript
Admin dashboard	React, Vite, TypeScript
Web styling	Tailwind CSS
Frontend routing	React Router
Server-state management	TanStack Query
Small client-state management	React Context and local component state
Mobile applications	Flutter, Dart
Backend	Node.js, Express, TypeScript
Database	MongoDB, Mongoose
Request validation	Zod
Authentication	JWT access tokens + refresh-token rotation
Live updates	Socket.IO
Image storage	S3 or Cloudinary
Payment gateway	Razorpay, or an explicitly labelled sandbox
Push notifications	Firebase Cloud Messaging
API documentation	OpenAPI / Swagger
Web testing	Vitest, React Testing Library, Supertest
Backend testing	Jest or Vitest, Supertest
Flutter testing	Flutter test framework
Deployment	Docker, Nginx, HTTPS, CI/CD
Monitoring	Structured logs, error tracking and health checks
Use React Context rather than Redux for basic client state. Use TanStack Query for API data, caching, loading states and invalidation. Keep cart persistence and authentication handling deliberate rather than duplicating server data across multiple state stores. 
3. Repository structure
Use a monorepo so the applications and backend remain organized in one repository. Keep the Flutter apps independently buildable.

a3-kitchen/
├── apps/
│   ├── customer-web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── catalog/
│   │   │   │   ├── cart/
│   │   │   │   ├── checkout/
│   │   │   │   ├── orders/
│   │   │   │   └── profile/
│   │   │   ├── hooks/
│   │   │   ├── layouts/
│   │   │   ├── lib/
│   │   │   ├── routes/
│   │   │   └── main.tsx
│   │   └── package.json
│   ├── admin-web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── orders/
│   │   │   │   ├── menu/
│   │   │   │   ├── delivery/
│   │   │   │   ├── customers/
│   │   │   │   ├── reports/
│   │   │   │   └── settings/
│   │   │   ├── layouts/
│   │   │   └── routes/
│   │   └── package.json
│   ├── customer-mobile/
│   │   └── lib/
│   │       ├── core/
│   │       ├── features/
│   │       ├── routing/
│   │       └── main.dart
│   └── delivery-mobile/
│       └── lib/
│           ├── core/
│           ├── features/
│           ├── routing/
│           └── main.dart
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── addresses/
│   │   │   ├── categories/
│   │   │   ├── products/
│   │   │   ├── cart/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   ├── delivery/
│   │   │   ├── notifications/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   ├── middleware/
│   │   ├── sockets/
│   │   ├── jobs/
│   │   ├── utils/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
├── packages/
│   └── contracts/
│       └── src/
│           ├── auth.ts
│           ├── products.ts
│           ├── orders.ts
│           └── index.ts
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── ORDER_STATE_MACHINE.md
│   ├── SECURITY.md
│   ├── TEST_PLAN.md
│   └── DEPLOYMENT.md
├── infra/
│   ├── docker/
│   └── nginx/
├── .env.example
├── docker-compose.yml
├── package.json
└── README.md



Use the shared contracts package for API request/response types and common enums. Do not import Mongoose models into frontend code. The server should own database-specific types and serialization.
4. Database design and MongoDB schemas
4.1 User
Purpose: represent customers, administrators and delivery partners.
type UserRole = "CUSTOMER" | "ADMIN" | "DELIVERY_PARTNER";

type UserStatus = "ACTIVE" | "SUSPENDED" | "PENDING";

interface User {
  _id: ObjectId;
  name: string;
  email?: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}


Requirements:
- Normalize phone numbers and emails before lookup.
- Use unique indexes on normalized phone and, when present, email.
- Keep the role server-controlled; registration must never accept ADMIN or DELIVERY_PARTNER as a customer-selected role.
- Use a separate refresh-token/session collection if persistent sessions and token revocation are required.
4.2 Address
interface Address {
  _id: ObjectId;
  userId: ObjectId;
  label: "HOME" | "WORK" | "OTHER";
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}


Create a 2dsphere index only if location-based delivery eligibility or distance calculations are implemented. Validate the postal code and ensure the address belongs to the authenticated customer before checkout.
4.3 Category
interface Category {
  _id: ObjectId;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}


Use unique slugs and prevent deletion of categories that still contain active products unless products are reassigned or the deletion workflow handles them safely.
4.4 Product
interface Product {
  _id: ObjectId;
  categoryId: ObjectId;
  name: string;
  slug: string;
  description: string;
  images: string[];
  pricePaise: number;
  compareAtPricePaise?: number;
  isAvailable: boolean;
  isVegetarian?: boolean;
  preparationTimeMinutes?: number;
  variants?: {
    name: string;
    pricePaise: number;
    isAvailable: boolean;
  }[];
  createdAt: Date;
  updatedAt: Date;
}


Validate that prices are non-negative integers. If food sizes or customizations affect pricing, store the chosen variant and any customization selections in the order snapshot.
4.5 Order
type OrderStatus =
  | "PLACED"
  | "ACCEPTED"
  | "REJECTED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "ASSIGNED"
  | "PICKED_UP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "FAILED"
  | "REFUND_PENDING"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";

interface Order {
  _id: ObjectId;
  orderNumber: string;
  customerId: ObjectId;

  items: {
    productId: ObjectId;
    productName: string;
    imageUrl?: string;
    variantName?: string;
    quantity: number;
    unitPricePaise: number;
    lineTotalPaise: number;
  }[];

  deliveryAddress: {
    recipientName: string;
    phone: string;
    line1: string;
    line2?: string;
    landmark?: string;
    city: string;
    state: string;
    postalCode: string;
  };

  subtotalPaise: number;
  discountPaise: number;
  deliveryFeePaise: number;
  taxPaise: number;
  totalPaise: number;

  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: "COD" | "RAZORPAY" | "TEST";
  deliveryAssignmentId?: ObjectId;

  acceptedAt?: Date;
  readyAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;

  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}


The delivery address and item prices must be copied into the order at checkout. This preserves historical accuracy when a customer changes their address or the kitchen updates a menu item.
4.6 Delivery assignment
type PartnerAvailability = "ONLINE" | "OFFLINE";
type AssignmentStatus =
  | "ASSIGNED"
  | "ACCEPTED"
  | "PICKED_UP"
  | "COMPLETED"
  | "DECLINED"
  | "CANCELLED";

interface DeliveryAssignment {
  _id: ObjectId;
  orderId: ObjectId;
  partnerId: ObjectId;
  status: AssignmentStatus;
  assignedBy: ObjectId;
  assignedAt: Date;
  acceptedAt?: Date;
  pickedUpAt?: Date;
  completedAt?: Date;
  declinedAt?: Date;
  declineReason?: string;
}


Maintain a separate delivery partner profile containing availability and eligibility details. Online status alone must not mean the partner is free; check active assignments before allocating another order.
4.7 Delivery OTP
interface DeliveryOtp {
  _id: ObjectId;
  orderId: ObjectId;
  customerId: ObjectId;
  partnerId: ObjectId;
  otpHash: string;
  expiresAt: Date;
  failedAttempts: number;
  verifiedAt?: Date;
  createdAt: Date;
}


Use a cryptographically secure random OTP generator. Expire OTP documents automatically after their retention period, and keep the verification audit record separately if business or dispute requirements need long-term evidence.
4.8 Payment
interface Payment {
  _id: ObjectId;
  orderId: ObjectId;
  customerId: ObjectId;
  provider: "RAZORPAY" | "TEST" | "COD";
  providerOrderId?: string;
  providerPaymentId?: string;
  amountPaise: number;
  status: PaymentStatus;
  idempotencyKey?: string;
  paidAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}


Add separate webhook-event records with unique provider event IDs to prevent duplicate payment processing. Store only necessary provider identifiers and never store card numbers, CVVs or payment secrets.
4.9 Supporting collections
Collection	Key responsibilities
refreshSessions	Hashed refresh tokens, expiration and revocation
notifications	User, type, message, related order, read status
auditLogs	Actor, action, entity, timestamp and safe metadata
settings	Kitchen hours, delivery fees, serviceable postal codes, tax settings
coupons	Discount type, amount, validity and usage limits
Essential indexes
- users: unique normalized phone; unique normalized email when present.
- categories: unique slug.
- products: category and availability; unique slug.
- orders: unique order number; customer plus creation date; status plus creation date.
- deliveryAssignments: partner plus status; order plus assignment history.
- payments: provider event ID uniqueness in the webhook event collection.
- deliveryOtps: order and verification state; TTL index for expiry.
Add indexes based on actual query patterns, and validate the query plans before production.
5. API contracts
Base URL:
/api/v1


All protected routes require authentication. Admin routes additionally require the ADMIN role, and delivery routes require DELIVERY_PARTNER plus order-assignment checks.
5.1 Authentication and user APIs
Method	Endpoint	Access	Purpose
POST	/auth/register	Public	Register customer
POST	/auth/login	Public	Login
POST	/auth/refresh	Session	Refresh access token
POST	/auth/logout	Authenticated	Revoke session
GET	/users/me	Authenticated	Get profile
PATCH	/users/me	Authenticated	Update profile
GET	/addresses	Customer	List own addresses
POST	/addresses	Customer	Add address
PATCH	/addresses/:id	Customer	Update own address
DELETE	/addresses/:id	Customer	Delete own address
5.2 Menu APIs
Method	Endpoint	Access	Purpose
GET	/categories	Public	List active categories
GET	/products	Public	Search and filter food
GET	/products/:id	Public	Product details
POST	/admin/categories	Admin	Create category
PATCH	/admin/categories/:id	Admin	Update category
DELETE	/admin/categories/:id	Admin	Deactivate or delete category
POST	/admin/products	Admin	Create product
PATCH	/admin/products/:id	Admin	Update product
PATCH	/admin/products/:id/availability	Admin	Toggle availability
DELETE	/admin/products/:id	Admin	Archive product
Use query parameters such as categoryId, search, minPrice, maxPrice, sort, page and limit. Validate and cap pagination limits.
5.3 Cart and checkout APIs
Method	Endpoint	Access	Purpose
GET	/cart	Customer	Read cart
PUT	/cart/items	Customer	Add or update item
DELETE	/cart/items/:productId	Customer	Remove item
POST	/orders/checkout	Customer	Validate and create order
GET	/orders	Customer	List own orders
GET	/orders/:id	Customer	Get own order details
POST	/orders/:id/cancel	Customer	Request cancellation
The checkout request should contain only product IDs, quantities, selected variants, address ID, payment method and an idempotency key. It must not accept a client-calculated total as authoritative.
Example request:
{
  "items": [
    {
      "productId": "PRODUCT_OBJECT_ID",
      "quantity": 2,
      "variantId": "VARIANT_ID"
    }
  ],
  "addressId": "ADDRESS_OBJECT_ID",
  "paymentMethod": "RAZORPAY"
}


Example response:
{
  "success": true,
  "data": {
    "orderId": "ORDER_OBJECT_ID",
    "orderNumber": "A3-20261014-0001",
    "status": "PLACED",
    "paymentStatus": "PENDING",
    "totalPaise": 39800
  }
}


The IDs and amount above are illustrative. Generate unique order numbers and calculate the actual total on the server.
5.4 Admin order APIs
Method	Endpoint	Purpose
GET	/admin/orders	Paginated order queue
GET	/admin/orders/:id	Full order details
POST	/admin/orders/:id/accept	Accept order
POST	/admin/orders/:id/reject	Reject with reason
POST	/admin/orders/:id/prepare	Start preparation
POST	/admin/orders/:id/ready	Mark ready for pickup
POST	/admin/orders/:id/assign-delivery	Assign delivery partner
GET	/admin/delivery-partners	List eligible partners
GET	/admin/reports/summary	Revenue and order KPIs
GET	/admin/reports/orders	Order report with date filters
Use action endpoints for important state transitions rather than allowing arbitrary status changes through a generic update endpoint.
5.5 Delivery APIs
Method	Endpoint	Purpose
GET	/delivery/me	Delivery partner profile
PATCH	/delivery/availability	Set online/offline
GET	/delivery/assignments	List own assignments
POST	/delivery/assignments/:id/accept	Accept assignment
POST	/delivery/assignments/:id/decline	Decline assignment
POST	/delivery/orders/:id/pickup	Confirm pickup
POST	/delivery/orders/:id/out-for-delivery	Start delivery
POST	/delivery/orders/:id/verify-otp	Verify customer OTP
GET	/delivery/history	Delivery history
A delivery partner must not be able to access another partner's assignment or verify an OTP for an order not assigned to them.
5.6 Payment APIs
Method	Endpoint	Purpose
POST	/payments/create-order	Create payment-provider order
POST	/payments/verify	Verify payment response
POST	/payments/webhooks/razorpay	Process signed provider events
GET	/payments/:id	Read authorized payment status
POST	/admin/payments/:id/refund	Initiate authorized refund
For online payment, use the payment provider's server-side API and signed webhooks. A frontend success callback alone must never set an order to paid.
Standard error response
{
  "success": false,
  "error": {
    "code": "INVALID_ORDER_TRANSITION",
    "message": "This order cannot be moved to the requested status."
  }
}


Use consistent HTTP status codes: 400 for invalid input, 401 for unauthenticated requests, 403 for forbidden actions, 404 for inaccessible or missing resources, 409 for conflicts, 422 for validly formatted but semantically invalid data where appropriate, and 500 for unexpected server errors.
6. Order state machine
The order workflow should be implemented as a backend service, not as independent status updates scattered across controllers.
#chatgpt-mermaid-_r_vt_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(13, 13, 13);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-_r_vt_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-_r_vt_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-_r_vt_ .error-icon{fill:rgb(243, 243, 243);}#chatgpt-mermaid-_r_vt_ .error-text{fill:rgb(13, 13, 13);stroke:rgb(13, 13, 13);}#chatgpt-mermaid-_r_vt_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-_r_vt_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-_r_vt_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-_r_vt_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-_r_vt_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-_r_vt_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-_r_vt_ .marker{fill:rgb(143, 143, 143);stroke:rgb(143, 143, 143);}#chatgpt-mermaid-_r_vt_ .marker.cross{stroke:rgb(143, 143, 143);}#chatgpt-mermaid-_r_vt_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-_r_vt_ p{margin:0;}#chatgpt-mermaid-_r_vt_ defs [id$="-barbEnd"]{fill:rgb(143, 143, 143);stroke:rgb(143, 143, 143);}#chatgpt-mermaid-_r_vt_ g.stateGroup text{fill:rgb(83, 154, 248);stroke:none;font-size:10px;}#chatgpt-mermaid-_r_vt_ g.stateGroup text{fill:rgb(13, 13, 13);stroke:none;font-size:10px;}#chatgpt-mermaid-_r_vt_ g.stateGroup .state-title{font-weight:bolder;fill:rgb(13, 13, 13);}#chatgpt-mermaid-_r_vt_ g.stateGroup rect{fill:rgb(222, 234, 251);stroke:rgb(83, 154, 248);}#chatgpt-mermaid-_r_vt_ g.stateGroup line{stroke:rgb(143, 143, 143);stroke-width:1;}#chatgpt-mermaid-_r_vt_ .transition{stroke:rgb(143, 143, 143);stroke-width:1;fill:none;}#chatgpt-mermaid-_r_vt_ .stateGroup .composit{fill:transparent;border-bottom:1px;}#chatgpt-mermaid-_r_vt_ .stateGroup .alt-composit{fill:#e0e0e0;border-bottom:1px;}#chatgpt-mermaid-_r_vt_ .state-note{stroke:rgb(107, 198, 127);fill:rgb(243, 243, 243);}#chatgpt-mermaid-_r_vt_ .state-note text{fill:rgb(13, 13, 13);stroke:none;font-size:10px;}#chatgpt-mermaid-_r_vt_ .stateLabel .box{stroke:none;stroke-width:0;fill:rgb(222, 234, 251);opacity:0.5;}#chatgpt-mermaid-_r_vt_ .edgeLabel .label rect{fill:rgb(222, 234, 251);opacity:0.5;}#chatgpt-mermaid-_r_vt_ .edgeLabel{background-color:rgb(252, 252, 252);text-align:center;}#chatgpt-mermaid-_r_vt_ .edgeLabel p{background-color:rgb(252, 252, 252);}#chatgpt-mermaid-_r_vt_ .edgeLabel rect{opacity:0.5;background-color:rgb(252, 252, 252);fill:rgb(252, 252, 252);}#chatgpt-mermaid-_r_vt_ .edgeLabel .label text{fill:rgb(13, 13, 13);}#chatgpt-mermaid-_r_vt_ .label div .edgeLabel{color:rgb(13, 13, 13);}#chatgpt-mermaid-_r_vt_ .stateLabel text{fill:rgb(13, 13, 13);font-size:10px;font-weight:bold;}#chatgpt-mermaid-_r_vt_ .node circle.state-start{fill:rgb(143, 143, 143);stroke:rgb(143, 143, 143);}#chatgpt-mermaid-_r_vt_ .node .fork-join{fill:rgb(143, 143, 143);stroke:rgb(143, 143, 143);}#chatgpt-mermaid-_r_vt_ .node circle.state-end{fill:rgb(83, 154, 248);stroke:transparent;stroke-width:1.5;}#chatgpt-mermaid-_r_vt_ .end-state-inner{fill:transparent;stroke-width:1.5;}#chatgpt-mermaid-_r_vt_ .node rect{fill:rgb(222, 234, 251);stroke:rgb(83, 154, 248);stroke-width:1px;}#chatgpt-mermaid-_r_vt_ .node polygon{fill:rgb(222, 234, 251);stroke:rgb(83, 154, 248);stroke-width:1px;}#chatgpt-mermaid-_r_vt_ [id$="-barbEnd"]{fill:rgb(143, 143, 143);}#chatgpt-mermaid-_r_vt_ .statediagram-cluster rect{fill:rgb(222, 234, 251);stroke:rgb(83, 154, 248);stroke-width:1px;}#chatgpt-mermaid-_r_vt_ .cluster-label,#chatgpt-mermaid-_r_vt_ .nodeLabel{color:rgb(13, 13, 13);}#chatgpt-mermaid-_r_vt_ .statediagram-cluster rect.outer{rx:5px;ry:5px;}#chatgpt-mermaid-_r_vt_ .statediagram-state .divider{stroke:rgb(83, 154, 248);}#chatgpt-mermaid-_r_vt_ .statediagram-state .title-state{rx:5px;ry:5px;}#chatgpt-mermaid-_r_vt_ .statediagram-cluster.statediagram-cluster .inner{fill:transparent;}#chatgpt-mermaid-_r_vt_ .statediagram-cluster.statediagram-cluster-alt .inner{fill:rgb(243, 243, 243);}#chatgpt-mermaid-_r_vt_ .statediagram-cluster .inner{rx:0;ry:0;}#chatgpt-mermaid-_r_vt_ .statediagram-state rect.basic{rx:5px;ry:5px;}#chatgpt-mermaid-_r_vt_ .statediagram-state rect.divider{stroke-dasharray:10,10;fill:rgb(243, 243, 243);}#chatgpt-mermaid-_r_vt_ .note-edge{stroke-dasharray:5;}#chatgpt-mermaid-_r_vt_ .statediagram-note rect{fill:rgb(243, 243, 243);stroke:rgb(107, 198, 127);stroke-width:1px;rx:0;ry:0;}#chatgpt-mermaid-_r_vt_ .statediagram-note rect{fill:rgb(243, 243, 243);stroke:rgb(107, 198, 127);stroke-width:1px;rx:0;ry:0;}#chatgpt-mermaid-_r_vt_ .statediagram-note text{fill:rgb(13, 13, 13);}#chatgpt-mermaid-_r_vt_ .statediagram-note .nodeLabel{color:rgb(13, 13, 13);}#chatgpt-mermaid-_r_vt_ .statediagram .edgeLabel{color:red;}#chatgpt-mermaid-_r_vt_ [id$="-dependencyStart"],#chatgpt-mermaid-_r_vt_ [id$="-dependencyEnd"]{fill:rgb(143, 143, 143);stroke:rgb(143, 143, 143);stroke-width:1;}#chatgpt-mermaid-_r_vt_ .statediagramTitleText{text-anchor:middle;font-size:18px;fill:rgb(13, 13, 13);}#chatgpt-mermaid-_r_vt_ [data-look="neo"].statediagram-cluster rect{fill:rgb(222, 234, 251);stroke:url(#chatgpt-mermaid-_r_vt_-gradient);stroke-width:1;}#chatgpt-mermaid-_r_vt_ [data-look="neo"].statediagram-cluster rect.outer{rx:5px;ry:5px;filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_vt_ .node .neo-node{stroke:rgb(83, 154, 248);}#chatgpt-mermaid-_r_vt_ [data-look="neo"].node rect,#chatgpt-mermaid-_r_vt_ [data-look="neo"].cluster rect,#chatgpt-mermaid-_r_vt_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-_r_vt_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_vt_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-_r_vt_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-_r_vt_-gradient);stroke-width:1px;}#chatgpt-mermaid-_r_vt_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_vt_ [data-look="neo"].node .neo-line path{stroke:rgb(83, 154, 248);filter:none;}#chatgpt-mermaid-_r_vt_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-_r_vt_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_vt_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-_r_vt_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-_r_vt_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_vt_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-_r_vt_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_vt_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}PLACEDACCEPTEDREJECTEDCANCELLEDPREPARINGREADY_FOR_PICKUPASSIGNEDPICKED_UPOUT_FOR_DELIVERYDELIVEREDAdmin acceptsAdmin rejectsAuthorized cancellationKitchen startsAuthorized cancellationFood readyAuthorized exceptionPartner assignedAssignment cancelledPartner confirms pickupPartner starts deliveryValid OTP





Transition rules
Current status	Allowed next status	Required authority
PLACED	ACCEPTED, REJECTED, CANCELLED	Admin or permitted cancellation policy
ACCEPTED	PREPARING, CANCELLED	Admin
PREPARING	READY_FOR_PICKUP, CANCELLED	Admin
READY_FOR_PICKUP	ASSIGNED	Admin
ASSIGNED	READY_FOR_PICKUP, PICKED_UP	Authorized reassignment or assigned partner
PICKED_UP	OUT_FOR_DELIVERY	Assigned partner
OUT_FOR_DELIVERY	DELIVERED	Backend after valid OTP
Treat the table as the MVP's intended transition policy. If an order must be cancelled after pickup, implement a separate exception and return workflow rather than allowing arbitrary cancellation.
Safe transition implementation
Each state-changing request should:
1. Authenticate the actor.
2. Verify their role and ownership or assignment.
3. Validate the current order status and requested action.
4. Check payment, stock and assignment constraints where applicable.
5. Apply the change atomically where necessary.
6. Record actor, timestamp and previous/new state in the audit trail.
7. Emit a real-time event and enqueue a notification.
8. Return the authoritative updated order.
Prevent concurrent admin actions from accepting and rejecting the same order. Use conditional MongoDB updates or transactions where required.
7. Authentication and authorization
Use a shared identity system across the website, admin dashboard and Flutter applications.
Recommended authentication flow
- Customer registration creates a CUSTOMER account only.
- Admin and delivery accounts are created or approved through a privileged process.
- Passwords are hashed using Argon2 or bcrypt.
- Short-lived access tokens authorize API requests.
- Refresh tokens are rotated and revocable.
- Web access and mobile access use appropriate secure token storage.
- Logout revokes the refresh session.
- Password reset tokens expire and are single-use.
For browser clients, prefer secure, HttpOnly, Secure, appropriately SameSite refresh-token cookies with CSRF protection when needed. For Flutter, use platform-secure storage for refresh tokens. Never put long-lived tokens or provider secrets in source code or ordinary browser local storage.
Role permissions
Feature	Customer	Admin	Delivery partner
Browse menu	Yes	Yes	Limited
Manage menu	No	Yes	No
Place order	Yes	No	No
Accept/reject order	No	Yes	No
Assign partner	No	Yes	No
View own order	Yes	Authorized orders	Assigned orders
Update pickup status	No	Exception access	Assigned orders
Verify delivery OTP	No	Audited exception only	Assigned order
View sales reports	No	Yes	Own delivery summary
Enforce authorization in backend middleware and service methods. Hiding a button in the frontend is not authorization.
8. Payment implementation plan
Implement payment in two distinct stages: test mode first, then production payment integration.
Stage A — Sandbox / test mode
- Add a clearly labelled payment test environment.
- Simulate successful, failed and cancelled payments.
- Verify that checkout creates only one order for repeated requests.
- Test payment failures, delayed confirmations and duplicate webhook events.
- Ensure the interface never describes simulated payments as real transactions.
Stage B — Production Razorpay
1. Backend validates cart, address, product availability and pricing.
2. Backend creates the order and an internal payment record.
3. Backend creates the Razorpay order using server-held credentials.
4. Client opens the payment interface using the returned provider order ID.
5. Backend verifies the payment signature.
6. A verified webhook reconciles the payment status.
7. The system updates the internal payment and order according to the payment state.
8. Admin and customer receive the appropriate status notification.
Important design decision: Decide whether the kitchen accepts orders only after successful online payment or accepts payment-pending orders as well. For online orders, do not dispatch delivery until the payment and order are in an allowed state.
For cash on delivery, record the method separately and define when the payment becomes collected. Do not mark COD as paid merely because the order was delivered.
Refunds require their own state transitions, authorization, provider confirmation and audit trail.
9. Frontend implementation plan
9.1 Customer website
Build the customer-facing experience in this order:
1. Global layout, navigation, responsive footer and theme.
2. Registration, login and session handling.
3. Homepage, category listing and promotional sections.
4. Product cards, product detail page, variants and availability.
5. Search, filtering, sorting and pagination.
6. Cart with quantity controls and server-reconciled pricing.
7. Address creation, selection and validation.
8. Checkout, payment and order confirmation.
9. Order tracking timeline and live updates.
10. Order history, profile, reviews and notifications.
Use TanStack Query for server data and React Context for lightweight shared client state. Keep each feature in its own directory, with components, hooks, API methods, schemas and tests grouped together.
9.2 Admin dashboard
Recommended navigation:
- Overview
- Orders
- Food categories
- Menu items
- Delivery partners
- Customers
- Payments and refunds
- Reports
- Settings
The order-management screen should include status tabs, search, date filters, order details, item quantities, payment state, preparation actions and delivery assignment. Use confirmation dialogs for destructive or irreversible actions.
Dashboard metrics should be calculated from database records, with clearly defined date ranges and payment statuses. Revenue should not include failed payments, and refunded amounts should be accounted for explicitly.
9.3 Flutter customer app
Implement these feature modules:
- auth
- home
- categories
- products
- cart
- addresses
- checkout
- payments
- orders
- notifications
- profile
Suggested Flutter architecture: feature-first folders, repository classes for API access, typed models, a routing layer, reusable widgets and a small state-management solution. Keep UI widgets separate from network and business logic.
9.4 Flutter delivery app
Implement:
- Authentication and session management.
- Online/offline availability.
- Assigned order list.
- Order detail and pickup instructions.
- Pickup confirmation.
- Customer contact and navigation.
- Out-for-delivery status.
- OTP input and verification.
- Delivery history and basic summary.
The delivery app should provide clear retry states for network failures. A failed network request must not show a successful pickup or delivery until the backend confirms it.
10. Real-time order updates and notifications
Use Socket.IO for live web updates and FCM for mobile push notifications.
Event contract
Event	Recipient	Payload
order.created	Admin	Order ID, number, status
order.updated	Authorized customer/admin	Order ID, new status, timestamp
delivery.assigned	Assigned partner	Assignment ID, order ID
delivery.accepted	Admin	Assignment ID, partner ID
delivery.picked_up	Customer/admin	Order ID, pickup timestamp
delivery.location_updated	Authorized tracking viewers	Order ID, coordinates and timestamp
order.delivered	Customer/admin	Order ID, delivery timestamp
Treat event names as an application contract; implement and document the corresponding event handlers.
Requirements:
- Authenticate Socket.IO connections.
- Authorize room membership per user and order.
- Never broadcast private addresses, OTPs or payment secrets to broad rooms.
- Persist important notifications before delivery attempts.
- Use a transactional outbox or another reliable event-publication strategy when lost events would create inconsistent operations.
- Provide REST polling or refresh as a fallback if real-time connectivity is unavailable.
Live GPS tracking is optional for the first release. Start with real-time status updates and add location tracking after the core delivery lifecycle is stable.
11. Security implementation checklist
The following requirements should be built into the implementation, not postponed until launch.
Authentication
[x] Hash passwords and validate credentials
[x] Rotate and revoke refresh tokens
[x] Rate-limit login, password reset and OTP endpoints
[x] Use secure session handling for web and mobile


Authorization
[x] Enforce role-based access on the backend
[x] Verify customer ownership of orders and addresses
[x] Verify partner assignment before delivery actions
[x] Restrict administrative account creation and privileges


Business logic
[ ] Recalculate prices, tax and delivery fees on the server
[ ] Validate order state transitions
[ ] Use idempotency for checkout and payment processing
[ ] Protect stock and assignment updates against concurrency


Application and infrastructure
[ ] Validate all request bodies and query parameters
[ ] Configure CORS, secure headers and HTTPS
[ ] Keep credentials in secret management
[ ] Redact sensitive data from logs
[ ] Back up the database and test restoration


OTP and payments
[ ] Hash OTPs and enforce expiry
[ ] Limit verification attempts and prevent replay
[ ] Verify payment signatures and webhook authenticity
[ ] Reconcile payment failures and refunds
[ ] Audit exceptional delivery overrides


8 of 22 requirements reviewed
 Copy checklist

Additional implementation rules
- Apply request validation before data reaches business services.
- Use MongoDB projections to avoid returning password hashes, internal tokens or private payment metadata.
- Sanitize user-generated content before rendering it in contexts where injection is possible.
- Restrict image uploads by MIME type, file size and actual content; use generated object names.
- Use least-privilege database and cloud credentials.
- Configure retention for logs, notifications and personal data.
- Do not expose stack traces or internal database errors to clients.
12. Testing strategy
Every module should include unit tests, integration tests and the relevant end-to-end tests. Use seeded test data and a separate test database.
Module	Essential tests
Authentication	Valid/invalid login, role assignment, token refresh and revocation
Catalog	Search, filters, inactive items and invalid category references
Cart and checkout	Price tampering, unavailable items, invalid quantities and duplicate submissions
Orders	Accept/reject conflicts, invalid transitions and unauthorized access
Delivery assignment	Offline partner, duplicate assignment and concurrent allocation
OTP	Wrong code, expired code, repeated attempts, replay and wrong partner
Payments	Signature verification, duplicate webhooks, failed payment and refund reconciliation
Notifications	Correct recipient, retry behavior and no private-data leakage
Reports	Date filters, pagination and correct revenue calculations
Flutter	Login, navigation, form validation, network errors and order lifecycle
Deployment	Health checks, environment configuration, database connectivity and backup restoration
Critical end-to-end test
Test this complete scenario in a staging environment:
1. Register a customer and create a delivery address.
2. Add an available food item to the cart.
3. Attempt checkout with a tampered price; the backend must reject the manipulated amount and calculate the actual price.
4. Complete a valid test payment, or select the supported COD flow.
5. Confirm the order appears in the admin dashboard.
6. Accept the order and move it through preparation.
7. Assign an online delivery partner.
8. Confirm pickup and start delivery.
9. Submit an incorrect OTP; delivery must remain incomplete.
10. Submit an expired OTP; delivery must remain incomplete.
11. Submit the correct OTP; the order must become delivered exactly once.
12. Confirm that the customer, admin and partner see the correct final status.
13. Retry the checkout request and payment webhook; no duplicate order or payment should be created.
Acceptance criteria
A module is complete only when:
- Its documented API contract is implemented.
- Unauthorized requests are rejected.
- Input validation and error handling are in place.
- Unit and integration tests pass.
- UI loading, empty, success and failure states work.
- Responsive web layouts and Flutter screens work on supported devices.
- Logs and monitoring capture actionable failures without exposing sensitive information.
- The relevant end-to-end test passes in staging.
13. Phased coding tasks
Use the following sequence as the development backlog. The week numbers are planning estimates; work can overlap when different team members own separate modules.
Week 1

Phase 1 — Foundation
- Initialize monorepo and application packages.
- Configure TypeScript, linting, formatting and environment validation.
- Connect MongoDB and configure logging.
- Define schemas, shared contracts and OpenAPI conventions.
- Create CI checks and initial deployment environments.
Deliverable: all apps start successfully and the API health check passes.



Week 2

Phase 2 — Authentication and catalog
- Implement registration, login, refresh sessions and RBAC.
- Add product and category CRUD.
- Implement public product browsing and filters.
- Build the customer catalog and admin menu screens.
- Add tests for authorization and catalog queries.
Deliverable: customers can browse food and admins can maintain the menu.



Weeks 3–4

Phase 3 — Customer ordering
- Implement address management and cart persistence.
- Build authoritative checkout pricing.
- Create orders and payment records.
- Add customer order history and order details.
- Test stock availability, idempotency and duplicate submissions.
Deliverable: an order can be created and displayed correctly across the customer and admin experiences.



Week 5

Phase 4 — Kitchen operations
- Build the admin order queue.
- Implement accept, reject, prepare and ready actions.
- Implement the order state machine.
- Add delivery partner management and assignment.
- Build order summary reports and audit records.
Deliverable: the admin controls the complete kitchen workflow up to delivery assignment.



Week 6

Phase 5 — Delivery and OTP
- Implement partner availability and assignment views.
- Build pickup and out-for-delivery actions.
- Implement OTP generation, hashing, expiry and verification.
- Prevent unauthorized status transitions.
- Test reassignment and failed OTP scenarios.
Deliverable: an order reaches Delivered only after authorized verification.



Week 7

Phase 6 — Payments and real-time updates
- Integrate Razorpay sandbox and webhook handling.
- Implement payment reconciliation and refund states.
- Add Socket.IO order events.
- Add FCM notifications and delivery updates.
- Test retries, duplicated events and disconnected clients.
Deliverable: reliable payment and notification workflows.



Weeks 8–9

Phase 7 — Flutter applications
- Build customer authentication, catalog, cart and checkout.
- Build delivery login, assignments, pickup and OTP screens.
- Connect both apps to the same backend.
- Add secure token storage and error handling.
- Test on Android devices and supported iOS devices.
Deliverable: both mobile applications complete the same core workflows as the backend supports.



Week 10

Phase 8 — QA and production
- Run full end-to-end and security tests.
- Optimize slow queries and inspect indexes.
- Configure production secrets, HTTPS and database backups.
- Deploy the website, admin dashboard and API.
- Build mobile release artifacts and verify production payment configuration.
- Complete a staging-to-production release checklist.
Deliverable: a tested release candidate ready for controlled production launch.



14. Deployment architecture
#chatgpt-mermaid-_r_128_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(13, 13, 13);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-_r_128_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-_r_128_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-_r_128_ .error-icon{fill:rgb(243, 243, 243);}#chatgpt-mermaid-_r_128_ .error-text{fill:rgb(13, 13, 13);stroke:rgb(13, 13, 13);}#chatgpt-mermaid-_r_128_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-_r_128_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-_r_128_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-_r_128_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-_r_128_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-_r_128_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-_r_128_ .marker{fill:rgb(143, 143, 143);stroke:rgb(143, 143, 143);}#chatgpt-mermaid-_r_128_ .marker.cross{stroke:rgb(143, 143, 143);}#chatgpt-mermaid-_r_128_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-_r_128_ p{margin:0;}#chatgpt-mermaid-_r_128_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(13, 13, 13);}#chatgpt-mermaid-_r_128_ .cluster-label text{fill:rgb(13, 13, 13);}#chatgpt-mermaid-_r_128_ .cluster-label span{color:rgb(13, 13, 13);}#chatgpt-mermaid-_r_128_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-_r_128_ .label text,#chatgpt-mermaid-_r_128_ span{fill:rgb(13, 13, 13);color:rgb(13, 13, 13);}#chatgpt-mermaid-_r_128_ .node rect,#chatgpt-mermaid-_r_128_ .node circle,#chatgpt-mermaid-_r_128_ .node ellipse,#chatgpt-mermaid-_r_128_ .node polygon,#chatgpt-mermaid-_r_128_ .node path{fill:rgb(222, 234, 251);stroke:rgb(83, 154, 248);stroke-width:1px;}#chatgpt-mermaid-_r_128_ .rough-node .label text,#chatgpt-mermaid-_r_128_ .node .label text,#chatgpt-mermaid-_r_128_ .image-shape .label,#chatgpt-mermaid-_r_128_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-_r_128_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-_r_128_ .rough-node .label,#chatgpt-mermaid-_r_128_ .node .label,#chatgpt-mermaid-_r_128_ .image-shape .label,#chatgpt-mermaid-_r_128_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-_r_128_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-_r_128_ .root .anchor path{fill:rgb(143, 143, 143)!important;stroke-width:0;stroke:rgb(143, 143, 143);}#chatgpt-mermaid-_r_128_ .arrowheadPath{fill:rgb(143, 143, 143);}#chatgpt-mermaid-_r_128_ .edgePath .path{stroke:rgb(143, 143, 143);stroke-width:1px;}#chatgpt-mermaid-_r_128_ .flowchart-link{stroke:rgb(143, 143, 143);fill:none;}#chatgpt-mermaid-_r_128_ .edgeLabel{background-color:rgb(252, 252, 252);text-align:center;}#chatgpt-mermaid-_r_128_ .edgeLabel p{background-color:rgb(252, 252, 252);}#chatgpt-mermaid-_r_128_ .edgeLabel rect{opacity:0.5;background-color:rgb(252, 252, 252);fill:rgb(252, 252, 252);}#chatgpt-mermaid-_r_128_ .labelBkg{background-color:rgba(252, 252, 252, 0.5);}#chatgpt-mermaid-_r_128_ .cluster rect{fill:rgb(243, 243, 243);stroke:rgba(0, 0, 0, 0.1);stroke-width:1px;}#chatgpt-mermaid-_r_128_ .cluster text{fill:rgb(13, 13, 13);}#chatgpt-mermaid-_r_128_ .cluster span{color:rgb(13, 13, 13);}#chatgpt-mermaid-_r_128_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(243, 243, 243);border:1px solid rgba(0, 0, 0, 0.1);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-_r_128_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(13, 13, 13);}#chatgpt-mermaid-_r_128_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-_r_128_ .icon-shape,#chatgpt-mermaid-_r_128_ .image-shape{background-color:rgb(252, 252, 252);text-align:center;}#chatgpt-mermaid-_r_128_ .icon-shape p,#chatgpt-mermaid-_r_128_ .image-shape p{background-color:rgb(252, 252, 252);padding:2px;}#chatgpt-mermaid-_r_128_ .icon-shape .label rect,#chatgpt-mermaid-_r_128_ .image-shape .label rect{opacity:0.5;background-color:rgb(252, 252, 252);fill:rgb(252, 252, 252);}#chatgpt-mermaid-_r_128_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-_r_128_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-_r_128_ .node .neo-node{stroke:rgb(83, 154, 248);}#chatgpt-mermaid-_r_128_ [data-look="neo"].node rect,#chatgpt-mermaid-_r_128_ [data-look="neo"].cluster rect,#chatgpt-mermaid-_r_128_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-_r_128_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_128_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-_r_128_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-_r_128_-gradient);stroke-width:1px;}#chatgpt-mermaid-_r_128_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_128_ [data-look="neo"].node .neo-line path{stroke:rgb(83, 154, 248);filter:none;}#chatgpt-mermaid-_r_128_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-_r_128_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_128_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-_r_128_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-_r_128_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_128_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-_r_128_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_128_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(0, 79, 153);}#chatgpt-mermaid-_r_128_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(0, 79, 153);}#chatgpt-mermaid-_r_128_ .node tspan[font-weight="normal"],#chatgpt-mermaid-_r_128_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-_r_128_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(245, 250, 255);stroke:rgb(206, 219, 229);stroke-width:1px;}#chatgpt-mermaid-_r_128_ .node rect,#chatgpt-mermaid-_r_128_ .node circle,#chatgpt-mermaid-_r_128_ .node ellipse,#chatgpt-mermaid-_r_128_ .node polygon,#chatgpt-mermaid-_r_128_ .node path{fill:rgb(229, 243, 255);stroke:rgba(0, 0, 0, 0.1);stroke-width:1px;}#chatgpt-mermaid-_r_128_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-_r_128_ .node.mermaid-decision .label-container{fill:rgb(245, 250, 255);stroke:rgb(206, 219, 229);stroke-dasharray:2,2;}#chatgpt-mermaid-_r_128_ .edgePaths .flowchart-link{stroke:rgb(143, 143, 143);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-_r_128_ .marker{fill:rgb(143, 143, 143);stroke:rgb(143, 143, 143);}#chatgpt-mermaid-_r_128_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}BackendExpress REST APISocket.IOBackground JobsCustomer WebsiteAdmin DashboardFlutter Customer AppFlutter Delivery AppMongoDBRazorpayObject StorageFirebase Cloud Messaging





Production setup
- Deploy the React customer website and admin dashboard using static hosting or Nginx.
- Deploy the Express API and Socket.IO server with HTTPS behind Nginx or a managed load balancer.
- Use MongoDB Atlas or a properly secured managed MongoDB deployment.
- Store food images in S3 or Cloudinary.
- Configure FCM for mobile notifications.
- Store payment credentials in environment-specific secret management.
- Run automated database backups and periodically test recovery.
- Add API health checks, uptime monitoring and error tracking.
- Configure CI/CD to run linting, type checks and tests before deployment.
Use separate development, staging and production environments. Never use production customer information in ordinary test fixtures.
15. Final release checklist
Production readiness
0/16

Functional readiness
[ ] Customer can complete the full ordering workflow
[ ] Admin can manage the kitchen and assign deliveries
[ ] Delivery partner can complete a delivery with OTP
[ ] Order history and reports show consistent data


Payment readiness
[ ] Sandbox success and failure cases pass
[ ] Production payment credentials are configured securely
[ ] Webhook verification and duplicate-event handling pass
[ ] Refund and cancellation policies are tested


Security readiness
[ ] RBAC and ownership checks pass
[ ] OTP abuse and replay tests pass
[ ] HTTPS, secret management and rate limiting are enabled
[ ] Database backups and recovery are verified


Release readiness
[ ] Website and dashboards work on mobile and desktop
[ ] Flutter builds pass device testing
[ ] Monitoring and error logging are active
[ ] Production smoke tests and rollback procedures are documented


 Copy release checklist
16. Master prompt for Claude
Use the following prompt when you are ready to implement the project. It instructs Claude to inspect the repository, preserve working code and proceed module by module rather than generating the entire application in one step.