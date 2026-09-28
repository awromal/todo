# ⚡ TaskFlow — Production-Ready MERN Backend API

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/awromal/todo)

A complete, production-ready MERN (MongoDB, Express, React/Responsive UI, Node.js) REST backend application featuring structured MVC architecture, CRUD operations, aggregation metrics, automated resilience fallback, and multi-platform deployment configs.

---

## 🌟 Key Features

- **Express 5 & Node.js 24+**: Fast, modern, asynchronous request pipeline.
- **MongoDB & Mongoose**: Object Data Modeling with schema validation, indexes, and aggregation.
- **Resilient Database Layer**: Automatically connects to MongoDB Atlas or local MongoDB; seamlessly provides an in-memory development fallback so the API never crashes if MongoDB is not yet configured.
- **Security & Best Practices**:
  - `helmet` for secure HTTP headers.
  - `cors` for cross-origin client integration.
  - `morgan` for developer-friendly request logging.
  - Centralized error-handling middleware (proper HTTP status codes for Mongoose CastError, ValidationError, DuplicateKey).
- **Interactive Web Dashboard**: Built-in responsive dashboard served from `/` allowing instant manual testing of all endpoints directly in the browser.
- **Cloud-Ready**: Preconfigured with `render.yaml` (Render), `vercel.json` (Vercel), and `Procfile` (Railway/Heroku).

---

## 📁 Project Structure

```
├── api/
│   └── index.js              # Serverless entrypoint (for Vercel)
├── public/                   # Interactive Client UI & API Explorer
│   ├── index.html
│   ├── style.css
│   └── app.js
├── src/
│   ├── config/
│   │   └── db.js             # Mongoose connection & fallback logic
│   ├── controllers/
│   │   └── taskController.js # REST endpoint handlers
│   ├── middleware/
│   │   └── errorHandler.js   # 404 & Centralized error handling
│   ├── models/
│   │   └── Task.js           # Mongoose task schema & indexes
│   ├── routes/
│   │   └── taskRoutes.js     # Express route definitions
│   ├── app.js                # Express app configuration & middlewares
│   └── server.js             # Node.js HTTP server listener
├── .env.example              # Environment variables template
├── Procfile                  # Railway / Heroku process declaration
├── render.yaml               # Render Blueprint service declaration
├── vercel.json               # Vercel serverless build and routing
└── package.json
```

---

## 🚀 Quick Start (Local Run)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(If `MONGODB_URI` is omitted or local MongoDB is not running, TaskFlow will automatically run in local fallback mode so you can test all endpoints immediately).*

### 3. Start Server
```bash
# Normal start
npm start

# Watch mode (auto-restarts on file changes)
npm run dev
```

Visit **http://localhost:5000** in your browser!

---

## 📡 REST API Reference

| Method | Endpoint | Description | Query / Body Parameters |
|---|---|---|---|
| `GET` | `/health` | Server uptime & DB connection status | None |
| `GET` | `/api` | Root API documentation schema | None |
| `GET` | `/api/tasks` | List all tasks | `?status=todo` `&priority=high` `&search=term` `&sortBy=createdAt` |
| `GET` | `/api/tasks/:id` | Get single task by ID | URL parameter `:id` |
| `POST` | `/api/tasks` | Create new task | `{ "title": "Required", "description": "", "priority": "medium", "status": "todo", "dueDate": "2026-10-01" }` |
| `PUT` | `/api/tasks/:id` | Update task | Partial or full task object |
| `DELETE` | `/api/tasks/:id` | Delete task | URL parameter `:id` |
| `GET` | `/api/tasks/stats/summary` | Get aggregated task metrics | None |

---

## ☁️ Deployment Guide

### Option 1: Deploy to Render (Recommended for MERN)
1. Push your code to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "feat: complete TaskFlow MERN backend"
   # Create a repo on GitHub, then:
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git branch -M main
   git push -u origin main
   ```
2. Log into [Render.com](https://render.com).
3. Click **New +** > **Web Service**.
4. Select your GitHub repository. Render will automatically detect the settings from `render.yaml`!
5. In the **Environment Variables** section on Render, add:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `NODE_ENV`: `production`
6. Click **Deploy Web Service**. Your live backend URL will be provided (e.g., `https://taskflow-mern.onrender.com`).

---

### Option 2: Deploy to Vercel (Instant Serverless)
1. Install or run Vercel CLI:
   ```bash
   npx vercel
   ```
2. Follow the terminal prompts to link your project and deploy.
3. In your Vercel Project Settings > **Environment Variables**, add:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `NODE_ENV`: `production`
4. Redeploy with `npx vercel --prod`.

---

### Option 3: Deploy to Railway
1. Go to [Railway.app](https://railway.app).
2. Click **New Project** > **Deploy from GitHub repo**.
3. Railway will automatically detect the `Procfile` (`web: node src/server.js`).
4. Add a MongoDB plugin or add `MONGODB_URI` under **Variables**.

---

### 🗄️ Setting Up Free MongoDB Atlas (2 Minutes)
1. Visit [MongoDB Atlas](https://cloud.mongodb.com) and create a free M0 cluster.
2. Under **Database Access**, create a database user (username and password).
3. Under **Network Access**, click **Add IP Address** > Choose **Allow Access from Anywhere** (`0.0.0.0/0`) so cloud servers can connect.
4. Go to **Database** > **Connect** > **Drivers** (Node.js) and copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/taskflow?retryWrites=true&w=majority
   ```
5. Paste this string as `MONGODB_URI` in your `.env` or cloud deployment environment variables.
