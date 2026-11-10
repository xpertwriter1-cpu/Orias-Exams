# Oria Exam Supplies — Next.js + MongoDB Atlas

Starter website for Oria Exam Supplies, Kericho, Kenya. Includes a responsive homepage, product catalogue/detail pages, registration/login with hashed passwords and HTTP-only signed sessions, MongoDB-backed printing quote requests, and a protected basic admin dashboard.

## 1. Install requirements
Install Node.js LTS and Visual Studio Code. Extract this ZIP, then open the `oria-exam-supplies` folder in VS Code.

## 2. Create MongoDB Atlas database
1. Sign in at https://www.mongodb.com/atlas and create a free cluster.
2. Create a database user and password.
3. In Network Access, allow your development IP address. Avoid `0.0.0.0/0` for a production database unless you understand the risk.
4. Select Connect → Drivers → Node.js and copy the connection string.

## 3. Configure environment
Copy `.env.example` to `.env.local` and replace the placeholders:
- `MONGODB_URI`: your Atlas connection string
- `MONGODB_DB`: `oria_exam_supplies`
- `SESSION_SECRET`: a long, random secret (32+ characters)
- `ADMIN_EMAIL`: intended admin email (see admin setup below)

Never commit `.env.local` to Git or share your database password.

## 4. Install and run
Open Terminal in VS Code and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## 5. Create the first admin
1. Set `ADMIN_EMAIL` in `.env.local` to your own email.
2. Register on the website using that email.
3. In MongoDB Atlas → Browse Collections → `oria_exam_supplies` → `users`, edit that user's `role` field from `customer` to `admin`.
4. Log out and log in again. Visit http://localhost:3000/admin.

This is a deliberate manual promotion step; public registration never grants admin rights.

## Current functionality
- Homepage and responsive blue/gold theme
- Product catalogue and detail pages (sample catalogue data is in `data/products.ts`)
- Customer registration and login; bcrypt password hashing and signed HTTP-only cookie sessions
- Printing quote request form saved to MongoDB collection `printingRequests`
- Basic admin dashboard protected by session role

## Before public launch
- Replace sample phone/email details with verified business contacts.
- Confirm all product prices, availability, and images with Oria.
- Add full order/cart persistence, order status management, and admin CRUD for products.
- Add rate limiting, email verification, password reset, CSRF/origin protections as appropriate, privacy policy, terms, backups and monitoring.
- Configure HTTPS and deployment environment variables (e.g. Vercel).
- Online payments are not enabled. Add a payment provider only after business account and checkout requirements are confirmed.
- Educational papers listed are revision/mock/internal resources, not official KNEC examination papers.

## Notes
Sample prices and contact details in the UI are placeholders for development and should be confirmed before the site goes live.

## Printing quote email notifications
Printing and order requests are saved in MongoDB and emailed to the `ADMIN_EMAIL` address through Resend. Replies go to the customer's email address.

Set these values in `.env.local` (and your hosting environment):
- `RESEND_API_KEY`: an API key with sending access from your Resend account.
- `RESEND_FROM_EMAIL`: a sender address on a domain verified in Resend, for example `Oria Exam Supplies <quotes@oriaexamsupplies.co.ke>` after verifying that domain.

Restart the development server after configuring the settings. See https://resend.com/docs/api-reference/emails/send-email for the sending API. Email failures leave the request saved with `emailStatus: failed`; the form confirms the saved request without claiming an email was sent. Failed notifications are not automatically retried.

## Basket and M-Pesa payments
Customers add items to a basket and send it as an order. The admin approves it on the dashboard and enters the amount to pay. The customer's message (sent with the Email or WhatsApp button) contains a private link where they pay by M-Pesa: the site sends a payment prompt to their phone.

M-Pesa stays switched off until these settings are added in Vercel (and `.env.local`), then the site is redeployed:
- `MPESA_ENV`: `sandbox` while testing with Safaricom's test system, `production` for real money.
- `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`: from your app on developer.safaricom.co.ke.
- `MPESA_SHORTCODE`, `MPESA_PASSKEY`: your Paybill or store number and its M-Pesa Express passkey from Safaricom.
- `MPESA_TYPE`: `paybill` or `till`. For a till, also set `MPESA_TILL_NUMBER`.

Payment results from Safaricom arrive at a private address made for each payment and are only accepted when they match the payment requested, including the amount. If a result is lost, the customer's page checks with Safaricom. The admin can also record payments made another way with "Mark as paid".
