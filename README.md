# COEDULA & LUMI UI

![Version](https://img.shields.io/badge/version-4.0.0-blue.svg)
![Svelte](https://img.shields.io/badge/svelte-5.0.0--runes-orange.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.9-blue.svg)
![License](https://img.shields.io/badge/license-Private-red.svg)

**Coedula** is a futuristic, high-performance dashboard application built with the cutting-edge **Svelte 5 (Runes)** framework and the exclusive **Lumi UI** design system. Designed for scalability, maintainability, and aesthetic perfection, it leverages a clean "Service-Repository" architecture and a glassmorphism-inspired design language.

> **Note for AI Agents:** Please refer to [`AGENTS.md`](./AGENTS.md) for the "Single Source of Truth" regarding coding standards, architectural decisions, and component usage.

---

## 🚀 Key Features

- **Svelte 5 Runes:** Built entirely with the new reactivity model (`$state`, `$derived`, `$props`).
- **Lumi UI Design System:** A custom, token-based design system (no external UI libraries).
- **Glassmorphism Aesthetic:** Clean, minimal, and futuristic UI with native CSS variables.
- **Robust Architecture:** Service-Repository pattern for backend logic.
- **Type-Safe Database:** Kysely query builder with PostgreSQL 16.
- **Secure Authentication:** Custom JWT implementation with session management.

---

## 🛠️ Tech Stack

| Layer               | Technology                                       | Description                                             |
| :------------------ | :----------------------------------------------- | :------------------------------------------------------ |
| **Frontend**        | [Svelte 5](https://svelte.dev)                   | The latest version featuring Runes for reactivity.      |
| **Meta-Framework**  | [SvelteKit](https://kit.svelte.dev)              | Full-stack framework for routing and server-side logic. |
| **Language**        | [TypeScript 5.9](https://www.typescriptlang.org) | Strict typing for reliability.                          |
| **Styling**         | **Lumi UI** (CSS Modules)                        | Custom design system using CSS Variables & Tokens.      |
| **Database**        | [PostgreSQL 16](https://www.postgresql.org)      | Relational database.                                    |
| **ORM/Query**       | [Kysely](https://kysely.dev)                     | Type-safe SQL query builder.                            |
| **Runtime**         | [Node.js](https://nodejs.org)                    | JavaScript runtime environment.                         |
| **Package Manager** | [pnpm](https://pnpm.io)                          | Fast, disk space efficient package manager.             |

---

## 🏁 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:

- **Node.js** (v20.0.0 or higher)
- **pnpm** (v9.0.0 or higher)
- **Docker** & **Docker Compose** (for database)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd coedula
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    ```

3.  **Environment Setup:**
    Copy the example environment file to create your local configuration.
    ```bash
    cp .env.example .env
    ```

---

## � Docker Helper Script (Recommended)

For convenience, a helper script is provided to manage the Docker environment.

1.  **Make the script executable:**

    ```bash
    chmod +x docker/docker.sh
    ```

2.  **Start the environment (App + DB):**

    ```bash
    ./docker/docker.sh up
    ```

3.  **Other useful commands:**
    | Command | Description |
    | :--- | :--- |
    | `./docker/docker.sh down` | Stop all containers. |
    | `./docker/docker.sh restart` | Restart containers. |
    | `./docker/docker.sh logs` | View logs. |
    | `./docker/docker.sh shell` | Open shell in App container. |
    | `./docker/docker.sh db_shell`| Open shell in Database container. |

---

## 💾 Database Setup (Manual / Hybrid)

If you prefer to run the **Node.js app locally** but keep the **Database in Docker**, follow these steps:

### 1. Start the Database Only

```bash
# Start Postgres container in detached mode
docker-compose -f docker/docker-compose.yml up -d postgres
```

### 2. Initialize

Once the database is running, use the included scripts to initialize the schema from `database/init`.

```bash
# Full bootstrap (init if empty, generate types)
pnpm db:up

# Drop schema only (dangerous)
pnpm db:down

# Full rebuild from scratch (reset + init + generate)
pnpm db:rebuild
```

> **Note:** The `database/init/` folder is the schema source of truth and is executed when the Postgres container is created for the first time.

---

## ⚡ Running the Application

### Option A: Full Docker (Easiest)

Run the entire stack using the helper script:

```bash
./docker/docker.sh up
```

Open your browser and navigate to `http://localhost:5173`.

### Option B: Local Development (Hybrid)

1.  Start the database (see "Database Setup" above).
2.  Start the local dev server:
    ```bash
    pnpm dev
    ```
    Open your browser and navigate to `http://localhost:5173`.

---

## 📂 Project Structure

```
coedula/
├── database/               # Database scripts & SQL init source
│   ├── dev/                # Developer utility scripts (setup, init)
│   └── init/               # Full schema source of truth
├── docker/                 # Docker configuration
├── src/
│   ├── lib/
│   │   ├── auth/           # Authentication logic (JWT, Session)
│   │   ├── components/     # 🧩 LUMI UI Component Library
│   │   ├── database/       # Database connection & schema
│   │   ├── stores/         # Global Svelte stores (Toast, Permissions)
│   │   ├── styles/         # 🎨 CSS Tokens & Core Styles
│   │   └── utils/          # Helper functions
│   └── routes/             # SvelteKit Routes (Pages & API)
│       ├── (auth)/         # Public auth pages (Login)
│       └── (dashboard)/    # Protected dashboard pages
├── AGENTS.md               # 🤖 AI Context & Coding Standards
└── package.json            # Project dependencies & scripts
```

---

## 📜 Scripts Reference

| Script             | Description                                     |
| :----------------- | :---------------------------------------------- |
| `pnpm dev`         | Start local development server.                 |
| `pnpm build`       | Build the application for production.           |
| `pnpm check`       | Run Svelte-Check for type validation.           |
| `pnpm lint`        | Run ESLint.                                     |
| `pnpm db:setup`    | Run the database setup shell script.            |
| `pnpm db:up`       | Bootstrap DB (init from snapshot + types).      |
| `pnpm db:down`     | Drop and recreate `public` schema (empty DB).   |
| `pnpm db:reset`    | Interactive reset + rebuild flow.               |
| `pnpm db:rebuild`  | Reset and fully rebuild schema + types.         |
| `pnpm db:status`   | Show initialization status.                     |
| `pnpm db:generate` | Generate TypeScript types from database schema. |

---

## 🤝 Contribution

1.  **Strictly follow `AGENTS.md`**: This file contains the "Golden Path" for creating new entities and components.
2.  **Use Svelte 5 Runes**: Legacy syntax is not allowed.
3.  **Use Lumi UI**: Do not import external UI libraries.

### Creating a New Feature

1.  **Schema:** update `database/init/*.sql` (source of truth).
2.  **Types:** `pnpm db:up` or `pnpm db:rebuild`, then `pnpm db:generate`
3.  **Backend:** Create server load functions and actions.
4.  **Frontend:** Build UI using Lumi UI components (`Card`, `Table`, `PageHeader`).

---

**Coedula** — _Building the Future of Dashboards._
