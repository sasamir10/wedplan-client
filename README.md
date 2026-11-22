# WedPlan — Wedding Planning Platform

A responsive wedding planning platform that connects customers with wedding professionals. Customers can discover and book services, vendors can manage their services and booking requests, and administrators can manage platform users and moderate service listings.

**Live Preview:** [WedPlan](https://yourwed-plan.vercel.app/)

**Client Repository:** [wedplan-client](https://github.com/sasamir10/wedplan-client)  
**Backend Repository:** [wedplan-server](https://github.com/sasamir10/wedplan-server)

## Features

- **Service Discovery:** Browse wedding services and view service details, pricing, locations, images, and vendor information.
- **Search, Filtering & Sorting:** Search services by name, filter by category and location, and sort results by price.
- **Service Details:** View detailed information about an approved and active service, including its gallery and vendor information.
- **Authentication:** Register and sign in with Better Auth. The interface provides role-aware navigation for customers, vendors, and administrators.
- **Customer Dashboard:** View booking statistics, manage booking requests, and update profile information.
- **Booking Requests:** Submit booking requests for eligible services, view booking status, and cancel pending requests.
- **Vendor Dashboard:** View service and booking statistics and access vendor management features.
- **Vendor Service Management:** Create, edit, activate, deactivate, and manage service listings. Newly created services enter moderation as Pending.
- **Vendor Booking Management:** Review incoming booking requests and accept or reject pending requests.
- **Profile Management:** Update account name and profile image. Profile images are uploaded through the backend image-upload service.
- **Admin Dashboard:** View platform statistics and access user and service management tools.
- **User Management:** Search and filter users, view user details, and block or unblock accounts.
- **Service Moderation:** Review vendor-submitted services and approve or reject listings.
- **Role-Based Navigation:** Display navigation options according to the authenticated user's role.
- **Responsive Interface:** Layouts and navigation adapt to desktop, tablet, and mobile screens.
- **Loading, Empty & Error States:** Provide feedback while data is loading, when no results are available, and when requests fail.

## Tech Stack

- **Framework:** Next.js App Router
- **Frontend:** React, TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** HeroUI v3
- **Animation:** Motion
- **Authentication:** Better Auth
- **Validation:** Zod
- **API Communication:** REST API
- **Backend:** Express 5, TypeScript ([separate repository](https://github.com/sasamir10/wedplan-server))
- **Database:** MongoDB Atlas (Native Driver)
- **Image Hosting:** ImgBB through the backend
- **Deployment:** Vercel
- **Development Tools:** Node.js, npm, Git, GitHub

## Getting Started

### Prerequisites

- Node.js (use a currently supported LTS release)
- npm
- The WedPlan backend running locally or an accessible backend URL

### Installation

Clone the frontend repository and navigate to the project directory:

```bash
git clone https://github.com/sasamir10/wedplan-client.git
cd wedplan-client
```

Install dependencies:

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

This variable points the frontend to the WedPlan Express backend. For local development, make sure the backend is running at `http://localhost:5000`.

For production, the deployed frontend is configured with the production backend URL through the hosting provider's environment-variable settings. Do not commit `.env.local` or expose private server-side secrets in the frontend environment.

### Run Locally

Start the development server:

```bash
npm run dev
```

Open the application in your browser:

```text
http://localhost:3000
```

### Production Build

Create and run a production build locally:

```bash
npm run build
npm start
```

Run the linter:

```bash
npm run lint
```

## Project Structure

The following is a high-level overview of the main frontend directories and routes:

```text
wedplan-client/
├── app/
│   ├── components/
│   │   └── dashboard/
│   ├── admin/
│   │   ├── users/
│   │   └── services/
│   ├── customer/
│   │   ├── bookings/
│   │   └── profile/
│   ├── vendor/
│   │   ├── bookings/
│   │   └── profile/
│   ├── services/
│   │   └── [id]/
│   └── globals.css
├── lib/
│   └── API and authentication utilities
├── public/
│   └── static assets and images
├── package.json
├── tsconfig.json
└── README.md
```

## Application Routes

| Route                | Description                                                 |
| -------------------- | ----------------------------------------------------------- |
| `/`                  | Public homepage                                             |
| `/services`          | Browse, search, filter, and sort available wedding services |
| `/services/[id]`     | View an individual service and its booking information      |
| `/sign-in`           | Sign in to an existing account                              |
| `/customer`          | Customer dashboard overview                                 |
| `/customer/bookings` | View and manage customer booking requests                   |
| `/customer/profile`  | Customer profile settings                                   |
| `/vendor`            | Vendor dashboard overview                                   |
| `/vendor/bookings`   | Review and manage incoming booking requests                 |
| `/vendor/profile`    | Vendor profile settings                                     |
| `/admin`             | Admin dashboard overview                                    |
| `/admin/users`       | Manage platform users                                       |
| `/admin/services`    | Moderate vendor service listings                            |

Dashboard routes require authentication and the appropriate user role.

## Application Architecture

WedPlan uses a separate frontend and backend repository:

- The **Next.js client** renders the public website, authentication screens, service discovery pages, booking interfaces, and role-specific dashboards.
- The **Express backend** provides the REST API, verifies authenticated requests, applies role and blocked-user checks, and handles business logic.
- **MongoDB Atlas** stores users, services, bookings, and related application data. The backend uses the MongoDB Native Driver rather than Mongoose.
- **Better Auth** manages registration, sign-in, and sessions. Administrative privileges are not available through public registration.
- **ImgBB** hosts uploaded service and profile images through backend upload functionality.

The frontend obtains its API base URL from `NEXT_PUBLIC_API_BASE_URL`. User IDs, roles, booking ownership, and subscription state must be verified by the backend rather than trusted from client-submitted values.

## Booking & Service Workflow

### Service Listings

- Vendors create and manage their service listings from the vendor dashboard.
- Newly created services have a Pending moderation status.
- Only approved and active services are available in public service discovery.
- Vendors can manage listing availability and update service information.
- The Free vendor plan is limited to three active services. The backend enforces this limit.

### Booking Requests

- Customers can submit a booking request for an eligible approved and active service.
- Vendors can accept or reject pending requests.
- Customers can cancel their pending booking requests.
- Booking status is managed by the backend and reflected in the relevant dashboards.

## Backend API

The frontend communicates with the separately deployed Express API. The API base URL is configured with `NEXT_PUBLIC_API_BASE_URL`.

The backend provides API functionality for:

- Public service discovery, featured services, and service details
- Vendor service management
- Customer booking creation, listing, and cancellation
- Vendor booking listing, acceptance, and rejection
- Customer, vendor, and admin dashboard statistics
- User profile retrieval, updates, and image uploads
- Admin user management and blocking controls
- Admin service moderation

For backend setup, environment variables, and API implementation details, see the [WedPlan server repository](https://github.com/sasamir10/wedplan-server).

## Deployment

The frontend is deployed on Vercel:

**Production URL:** https://yourwed-plan.vercel.app/

The backend is deployed separately on Render:

**Backend URL:** https://wedplan-server-0m17.onrender.com/

Production environment variables are configured in the Vercel project settings. The backend's production configuration, including authentication origins and secrets, is managed in Render. Never commit credentials, API keys, database connection strings, or authentication secrets to the repository.

## Current Scope

The core service discovery, authentication, booking, vendor management, admin management, and dashboard features are implemented. Stripe checkout and paid Premium subscription activation are not included in the current deployed scope; payment integration is planned as a separate phase.

## Author

**Sabbir Ahmed Samir**

- GitHub: [@sasamir10](https://github.com/sasamir10)
