# 🌲 Tree Flipper - Full-Stack Puzzle Game

A full-stack algorithmic puzzle game built with **React**, **FastAPI**, and **Neon Serverless PostgreSQL**, architected for a **strict $0/month budget** utilizing forever-free tiers on [Render](https://render.com) and [Neon](https://neon.tech).

---

## 🎮 Game Mechanics

- **The Board**: Displays two trees side-by-side (or top/bottom on mobile): the **Target Tree** and the **Current Tree**.
- **The Nodes**: Nodes are either **Red** or **Blue**. Initially, all nodes in the Current Tree are Red.
- **The Goal**: Flip node colors in the Current Tree until it perfectly matches the Target Tree pattern.
- **Standard Move**: Clicking any node flips the color of that node **AND all nodes in its entire subtree** (Red ↔ Blue).
- **Special Move ("Single Flip")**: Toggleable power-up button allowing you to flip **ONLY** that single node without affecting its descendants. Limited to **3 uses per level**.
- **Player Progress**: Automatically saved in the browser's `localStorage` and highlighted on the Level Selection screen.

---

## 🏗️ Architecture & Zero-Cost Breakdown

| Component | Technology | Free Tier Provider | Cost |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 18 (Vite, TailwindCSS, Lucide) | **Render Static Site** | **$0 / month** |
| **Backend** | Python (FastAPI, SQLAlchemy, Pydantic) | **Render Web Service** (Free Tier) | **$0 / month** |
| **Database** | PostgreSQL Serverless | **Neon DB** (M0 Free Tier, 0.5 GiB storage) | **$0 / month** |
| **State** | Browser `localStorage` | Client Browser | **$0 / month** |

> **Note on Render's Ephemeral Disk**: Render free web services do not have persistent local disks. By connecting to **Neon Serverless Postgres**, all level creations, edits, and deletions persist forever without wiping when Render spins down or restarts.

---

## 📁 Project Structure

```
TreeFlipperGame/
├── backend/
│   ├── auth.py             # Admin Key header authentication (X-Admin-Key)
│   ├── config.py           # Pydantic Settings & environment variables
│   ├── database.py         # SQLAlchemy engine & session manager (Neon / SQLite)
│   ├── main.py             # FastAPI application, CORS & public/admin endpoints
│   ├── models.py           # Level database model (id, name, tree_data JSON)
│   ├── schemas.py          # Pydantic validation schemas
│   ├── seed.py             # Default initial levels auto-seeded on fresh DB
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminDashboard.jsx  # Level creator, visual color painter & JSON editor
│   │   │   ├── GameBoard.jsx       # Interactive game board, subtree & single-flip logic
│   │   │   ├── LevelSelect.jsx     # Level selection screen with progress indicators
│   │   │   └── TreeView.jsx        # SVG tree renderer with dynamic depth layout
│   │   ├── utils/
│   │   │   ├── api.js              # Fetch client for backend API endpoints
│   │   │   └── treeUtils.js        # Subtree DFS traversal & layout algorithms
│   │   ├── App.jsx                 # Main application controller & local progress store
│   │   ├── main.jsx                # React DOM entry point
│   │   └── index.css               # Tailwind & custom glow styling
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── render.yaml             # Render Blueprint file for 1-click free deployment
└── README.md
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Python 3.9+**
- **Node.js 18+** & **npm**

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env

# Run FastAPI server (runs on http://localhost:8000 by default)
uvicorn main:app --reload --port 8000
```

> **Local DB**: By default, `.env` points to `sqlite:///./treeflipper.db` for instant offline testing. To test with your remote Neon DB locally, replace `DATABASE_URL` in `.env`.
> When Neon CLI has been initialized and deployed from the project root, its `.env.local` connection settings are loaded automatically and take precedence over `backend/.env`.

From the project root, `npm run build` builds the frontend.

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server (runs on http://localhost:3000)
npm run dev
```

Visit **http://localhost:3000** in your browser. The Vite proxy forwards `/api` requests directly to `http://localhost:8000`.

---

## 🗄️ Setting Up Free Neon Serverless Postgres

1. Go to [neon.tech](https://neon.tech) and create a free account (no credit card required).
2. Create a new project (e.g. `tree-flipper-db`).
3. Under the **Dashboard**, copy your connection string (format: `postgresql://user:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require`).
4. Paste this into your Backend `.env` as `DATABASE_URL` or inject it into Render's environment settings.
5. On the first run, the backend will automatically initialize the database schema and seed the initial levels!

---

## 🌐 Deploying to Render for Free

### Option A: 1-Click Blueprint (Recommended)
1. Push this repository to your GitHub/GitLab account.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** -> **Blueprint**.
3. Select your repository. Render will automatically read `render.yaml` and configure both the backend and frontend.
4. When prompted for environment variables:
   - `DATABASE_URL`: Paste your Neon Postgres connection string.
   - `ADMIN_KEY`: Set your secret admin passcode.
5. Click **Apply**. Render will deploy both services on free tiers!

### Option B: Manual Setup on Render
1. **Deploy Backend**:
   - Create **New Web Service**.
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Plan: **Free**
   - Environment Variables:
     - `DATABASE_URL`: `<your-neon-postgres-url>`
     - `ADMIN_KEY`: `<your-secret-password>`
     - `CORS_ORIGINS`: `*`
2. **Deploy Frontend**:
   - Create **New Static Site**.
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Plan: **Free**
   - Environment Variable:
     - `VITE_API_URL`: `https://your-backend-service.onrender.com/api`
     - A bare backend hostname is also accepted; the frontend adds `https://` and `/api`.

---

## 🔒 Admin Management Portal

1. Click the **Admin** button in the header.
2. Enter the secret **Admin Key** (matches `ADMIN_KEY` configured in backend environment).
3. Features:
   - **Visual Tree Builder**: Click nodes to switch target colors directly.
   - **Level Numbering**: Assign a non-negative level number; new levels default to the next number.
   - **Node Branching**: Click "Add Child Node" to dynamically expand any node in the tree.
   - **Raw JSON Editor**: Modify tree structures and custom properties directly.
   - **Delete/Update Levels**: Manage and test live game levels in the database.
   - Existing levels receive Level Number `0` when the backend adds the field at startup; the Starter Puzzle is seeded as Level Number `0`.
   - The level list renders a saved browser copy immediately and refreshes it in the background; admin changes clear the saved copy.

The backend caches level summaries for five seconds and clears that cache after create, edit, or delete operations.
