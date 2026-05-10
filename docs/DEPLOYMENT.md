# Deploying PathIQ

PathIQ is two pieces: a **static React app** (Vite build) and a **Python API** (FastAPI on port 8000). In production they usually live on different hosts; the UI calls the API using `VITE_API_URL`.

---

## 1. Environment variables

| Where | Variable | Purpose |
|--------|----------|---------|
| **Frontend build** | `VITE_API_URL` | Public base URL of the API, e.g. `https://pathiq-api.onrender.com` (no trailing slash). |
| **API** | `PATHIQ_CORS_ORIGINS` | Comma-separated browser origins allowed to call the API, e.g. `https://pathiq.vercel.app`. If unset, the API allows `*` without credentials (fine for local dev; set this in production). |
| **API** | `PATHIQ_DB_PATH` | SQLite file path for workflow users/cases. Default `data/pathiq_workflow.db`. On Render, point at a path **on a persistent disk** (see below). |

JWT and workflow features use the same API origin as `VITE_API_URL`.

---

## 2. Deploy the API (Docker)

The repo root **Dockerfile** builds the backend. It does **not** include `backend/model/artifacts/*.keras` (gitignored). Without weights:

- `/health`, `/docs`, and **`/workflow/*`** routes work.
- **`/analyze`** (and related image routes) return **503** until weights exist.

### Option A — [Render](https://render.com)

1. New **Blueprint** → connect this GitHub repo → Render reads `render.yaml`.
2. In the dashboard, set **`PATHIQ_CORS_ORIGINS`** to your frontend origin(s), e.g. `https://your-app.vercel.app`.
3. On the **free** tier, SQLite under the default path is **ephemeral** (data resets when the instance is redeployed or cycled). For durable workflow DBs, use a paid plan with a **persistent disk** and set **`PATHIQ_DB_PATH`** to a file under that mount.
4. After deploy, open `https://<service>.onrender.com/docs` and try `GET /health`.

**Optional — enable `/analyze` in the cloud**

- **Shell** on the Render service (or a one-off job), from `/app`:

  ```bash
  python scripts/bootstrap_minimal_demo.py
  ```

  That trains small demo weights (can take many minutes; needs enough RAM/CPU on your plan).

- Or upload artifacts from CI and bake them into a custom image layer.

### Option B — Any Docker host (Fly.io, Railway, ECS, a VPS)

```bash
docker build -t pathiq-api .
docker run -p 8000:8000 \
  -e PATHIQ_CORS_ORIGINS=https://your-frontend.example.com \
  -e PATHIQ_DB_PATH=/data/pathiq_workflow.db \
  -v pathiq-sqlite:/data \
  pathiq-api
```

### Local parity

```bash
docker compose up --build
```

Then `cd frontend && npm run dev` with `VITE_API_URL=http://127.0.0.1:8000` in `.env` or `.env.local`.

### Local: `docker: command not found` (macOS)

That means the **Docker CLI is not installed** or **Docker Desktop is not running** (on Mac, `docker` ships with Docker Desktop).

- **Install:** [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/) (pick Apple Chip vs Intel). Open the app and wait until it says Docker is running, then **open a new terminal** and run `docker --version`.
- **Deploy without local Docker:** you do **not** need Docker on your laptop for Render—Render builds the image in the cloud from the repo `Dockerfile` after you connect GitHub.
- **CLI-only alternative:** [Colima](https://github.com/abiosoft/colima) plus the Docker CLI, then `colima start`.

---

## 3. Deploy the frontend (static hosting)

Build once with the **production** API URL baked in (Vite inlines `import.meta.env.VITE_API_URL` at build time).

```bash
cd frontend
echo 'VITE_API_URL=https://your-api.onrender.com' > .env.production
npm ci && npm run build
```

The output is **`frontend/dist/`**.

### [Vercel](https://vercel.com)

1. Import the GitHub repo.
2. **Root Directory:** `frontend`
3. **Framework preset:** Vite (or Other: build `npm run build`, output `dist`).
4. **Environment variables** (Production): `VITE_API_URL` = your public API URL.
5. Redeploy whenever the API URL changes.

`frontend/vercel.json` adds SPA **rewrites** so client-side routes (e.g. `/dashboard`) refresh correctly.

### [Cloudflare Pages](https://pages.cloudflare.com)

Same idea: root `frontend`, build `npm run build`, publish `dist`, set `VITE_API_URL` in the project environment, trigger a rebuild.

---

## 4. Checklist before sharing a URL

- [ ] `PATHIQ_CORS_ORIGINS` lists the exact frontend origin (scheme + host + port if non-default).
- [ ] `VITE_API_URL` matches the API’s public HTTPS URL.
- [ ] Landing / login flow tested against the deployed API (server mode).
- [ ] If you need image analysis in prod, confirm models exist and `/analyze` returns 200 on `/docs` “Try it”.

---

## 5. Cold starts and cost

Render **free/starter** web services spin down when idle; first request can be slow, and **large TensorFlow** images make cold starts heavier. For a smoother demo, use a paid instance or a lighter deployment that omits TensorFlow until you need `/analyze`.

---

## 6. Security note

Demo users (e.g. from `seed_demo_users_if_empty`) are for pilots only. Change passwords, restrict sign-up, or integrate your IdP before any sensitive data.
