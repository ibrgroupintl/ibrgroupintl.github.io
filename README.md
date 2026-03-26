# premium
Premium Subscriber Dashboard (Accessible via Substack Subscription)

---

## IBR Premium — Content Management Panel

A full-stack backend content panel for IBR Group International's premium subscriber platform, hosted at **[premium.ibrecruitment.com](https://premium.ibrecruitment.com/)**.

### Features

- 🔐 **JWT Authentication** — Secure admin login
- 👔 **People Moves** — Create, edit, publish and delete executive movement articles
- 💡 **Insights** — Create, edit, publish and delete industry analysis articles
- 👥 **Subscribers** — Manage premium subscribers with Substack webhook integration
- 📊 **Dashboard** — Overview statistics and recent content at a glance

---

## Project Structure

```
premium/
├── backend/           # Node.js/Express REST API
│   ├── src/
│   │   ├── app.js            # Express app
│   │   ├── index.js          # Server entry point
│   │   ├── db/database.js    # SQLite database setup
│   │   ├── controllers/      # Route controllers
│   │   │   ├── authController.js
│   │   │   ├── peopleMoveController.js
│   │   │   ├── insightController.js
│   │   │   └── subscriberController.js
│   │   ├── routes/           # Express routers
│   │   └── middleware/       # Auth middleware
│   ├── scripts/seed.js       # Database seeder
│   └── .env.example
│
└── frontend/          # React admin panel (Vite)
    └── src/
        ├── App.jsx
        ├── pages/            # Page components
        │   ├── LoginPage.jsx
        │   ├── DashboardPage.jsx
        │   ├── PeopleMovesPage.jsx
        │   ├── InsightsPage.jsx
        │   └── SubscribersPage.jsx
        ├── components/       # Shared components
        ├── hooks/            # Auth context/hooks
        └── utils/api.js      # API client
```

---

## Getting Started

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your JWT_SECRET and ADMIN_PASSWORD
npm install
npm run seed      # Creates admin user and sample data
npm start         # Starts API on port 3001
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env — set VITE_API_URL to your backend URL
npm install
npm run dev       # Dev server on port 5173
npm run build     # Production build → dist/
```

### Default admin credentials (change immediately!)

```
Email:    admin@ibrecruitment.com
Password: ChangeMe123!
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login (returns JWT) |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/people-moves` | List people moves |
| POST | `/api/people-moves` | Create people move |
| PATCH | `/api/people-moves/:id` | Update people move |
| DELETE | `/api/people-moves/:id` | Delete people move |
| GET | `/api/insights` | List insights |
| POST | `/api/insights` | Create insight |
| PATCH | `/api/insights/:id` | Update insight |
| DELETE | `/api/insights/:id` | Delete insight |
| GET | `/api/subscribers` | List subscribers |
| POST | `/api/subscribers` | Add subscriber |
| PATCH | `/api/subscribers/:id` | Update subscriber |
| DELETE | `/api/subscribers/:id` | Remove subscriber |
| POST | `/api/subscribers/webhook/substack` | Substack webhook |
| GET | `/api/subscribers/stats` | Dashboard statistics |
| GET | `/health` | Health check |

---

## Running Tests

```bash
cd backend
npm test
```

---

## Deployment

1. Set a strong `JWT_SECRET` in `/backend/.env`
2. Set `ALLOWED_ORIGINS=https://premium.ibrecruitment.com` in `/backend/.env`
3. Build the frontend: `npm run build:frontend`
4. Serve the `frontend/dist` directory via a static file server (Nginx, Caddy, etc.)
5. Run the backend with a process manager: `pm2 start backend/src/index.js --name premium-api`

