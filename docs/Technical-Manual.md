# SkillSwap — Project Technical Documentation Manual

**Version:** 1.0
**Date:** June 2026
**Authors:** SkillSwap Development Team

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Database Design (ERD & Data Dictionary)](#5-database-design)
6. [Backend API Reference](#6-backend-api-reference)
7. [User Authentication & Security](#7-user-authentication--security)
8. [Dynamic Dashboards](#8-dynamic-dashboards)
9. [Core Database Transactions](#9-core-database-transactions)
10. [Artificial Intelligence Integration](#10-artificial-intelligence-integration)
11. [Logging Framework](#11-logging-framework)
12. [Mobile Application](#12-mobile-application)
13. [Installation & Setup Guide](#13-installation--setup-guide)
14. [Testing & Verification](#14-testing--verification)
15. [Deployment Notes](#15-deployment-notes)
16. [Appendix: Project Structure](#16-appendix-project-structure)

---

## 1. Introduction

### 1.1 Purpose
SkillSwap is a peer-to-peer **skill-bartering** mobile application. Instead of paying money,
users exchange knowledge: a person who can teach guitar can swap lessons with someone who can
teach web development. The platform matches complementary users, lets them chat, and helps them
schedule learning sessions.

### 1.2 Scope
This manual documents the complete system — the **PHP/MySQL REST API backend** and the
**Expo/React Native mobile client** — covering architecture, the database, every API endpoint,
security measures, the AI integration (Google Gemini), logging, and setup/testing procedures.

### 1.3 Mandatory Deliverables Coverage
| Deliverable | Where it is implemented |
|---|---|
| User Authentication / Secure Login | [Section 7](#7-user-authentication--security) |
| Dynamic Dashboards | [Section 8](#8-dynamic-dashboards) |
| Core Database Transactions | [Section 9](#9-core-database-transactions) |
| Artificial Intelligence API Integration | [Section 10](#10-artificial-intelligence-integration) |
| Technical Documentation Manual | This document |

---

## 2. System Overview

SkillSwap consists of two independently deployable parts:

- **SkillSwapApi** — a PHP 8 backend (custom MVC) served by XAMPP/Apache, talking to a MySQL
  database named `skillswap_db`. It exposes a JSON REST API consumed only by the mobile app.
- **SkillSwap** — an Expo (React Native + TypeScript) app run through Expo Go during development
  and connecting to the backend over the local Wi-Fi network.

```
┌────────────────────┐        HTTPS/JSON        ┌────────────────────────┐
│  SkillSwap Mobile  │  ───── REST API ──────▶   │  SkillSwapApi (PHP)    │
│  (Expo / RN / TS)  │ ◀──── Bearer token ─────  │  custom MVC, Apache    │
└────────────────────┘                          └──────────┬─────────────┘
                                                            │ PDO (prepared)
                                                  ┌─────────▼──────────┐
                                                  │  MySQL skillswap_db │
                                                  └─────────┬──────────┘
                                                            │
                                                  ┌─────────▼──────────┐
                                                  │  Google Gemini API  │
                                                  └─────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| Mobile UI | Expo SDK, React Native, TypeScript, Expo Router (file-based routing) |
| Local storage | `expo-secure-store` (encrypted token storage) |
| Backend | PHP 8.1+ (custom lightweight MVC, no framework/Composer) |
| Database | MySQL / MariaDB (InnoDB, `utf8mb4`) |
| Data access | PDO with prepared statements |
| Auth | Bearer tokens (random 64-char, 30-day expiry) |
| AI | Google Gemini API (`generativelanguage.googleapis.com`) |
| Web server | Apache (XAMPP) |

---

## 4. System Architecture

### 4.1 Backend MVC
The backend follows a minimal Model–View–Controller pattern (views are JSON responses):

- **`public/index.php`** — single front controller. Applies CORS headers, handles `OPTIONS`
  preflight, loads routes, and dispatches via the Router.
- **`app/Core/Router.php`** — regex-based router mapping `METHOD path` → controller method,
  with named parameters (e.g. `/api/matches/{id}/messages`).
- **`app/Core/Controller.php`** — base class with helpers: `json()`, `body()` (parse JSON
  request body), `query()`.
- **`app/Core/Database.php`** — single shared PDO connection; `run/first/all/insert` plus
  transaction helpers.
- **`app/Core/ApiAuth.php`** — issues/validates bearer tokens.
- **`app/Models/*`** — one class per table, encapsulating SQL and building API payloads.
- **`app/Services/*`** — `MatchingService` (deterministic matching) and `GeminiService` (AI).
- **`app/Controllers/ApiController.php`** — all endpoint handlers.

### 4.2 Request Lifecycle
1. Apache rewrites all requests to `public/index.php` (`.htaccess`).
2. CORS headers are sent; `OPTIONS` returns `204`.
3. The Router matches the route and calls the controller method.
4. Protected endpoints call `ApiAuth::requireId()` to resolve the user from the bearer token.
5. The controller uses Models/Services and returns JSON.

### 4.3 Mobile Architecture
- **Expo Router** provides file-based navigation under `src/app`.
- Route groups: `(auth)` for login/register, `(tabs)` for the main app.
- `src/services/api.ts` is the single typed HTTP client; `src/lib/auth.ts` manages the session
  and secure token storage; `src/config.ts` auto-detects the dev backend URL.

---

## 5. Database Design

### 5.1 Entity-Relationship Diagram (text form)

```
users 1───∞ user_skills ∞───1 skills
users 1───∞ api_tokens
users 1───∞ matches (as requester)   matches 1───∞ messages
users 1───∞ matches (as partner)     matches 1───∞ sessions
users 1───∞ ai_logs                  sessions ∞───1 skills (optional)
```

### 5.2 Data Dictionary

**`users`** — registered members
| Column | Type | Notes |
|---|---|---|
| id | INT PK | auto-increment |
| name | VARCHAR(120) | |
| email | VARCHAR(190) | unique, stored lowercase |
| password | VARCHAR(255) | bcrypt hash (`password_hash`) |
| avatar, bio, location | nullable | profile fields |
| is_active | TINYINT | 1 = active |
| created_at | TIMESTAMP | |

**`api_tokens`** — bearer sessions
| Column | Type | Notes |
|---|---|---|
| id | INT PK | |
| user_id | FK → users | ON DELETE CASCADE |
| token | VARCHAR(64) | unique, random hex |
| expires_at | DATETIME | 30 days out |

**`skills`** — shared catalog
| id PK | name | slug (unique) | category |

**`user_skills`** — what each user offers/wants
| Column | Type | Notes |
|---|---|---|
| id PK | | |
| user_id | FK → users | |
| skill_id | FK → skills | |
| type | ENUM('offer','want') | |
| level | ENUM(beginner…expert) | |
| description | VARCHAR(255) | |
| | | UNIQUE(user_id, skill_id, type) |

**`matches`** — swap requests
| id PK | requester_id FK | partner_id FK | status ENUM(pending/accepted/declined) | score DECIMAL | message | created_at | updated_at |

**`messages`** — chat within a match
| id PK | match_id FK | sender_id FK | body TEXT | read_at | created_at |

**`sessions`** — scheduled swap meetings
| id PK | match_id FK | skill_id FK (nullable) | scheduled_at DATETIME | status ENUM(scheduled/completed/cancelled) | notes |

**`ai_logs`** — audit of AI calls
| id PK | user_id FK (nullable) | feature | prompt | response | status | created_at |

The authoritative schema is in [`database/schema.sql`](../../SkillSwapApi/database/schema.sql).

---

## 6. Backend API Reference

Base URL (dev): `http://<LAN-IP>/SkillSwapApi/public`
All bodies are JSON. Protected routes require `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | – | Service + AI status |
| POST | `/api/auth/register` | – | Create account, returns token |
| POST | `/api/auth/login` | – | Login, returns token |
| GET | `/api/auth/me` | ✔ | Current user |
| POST | `/api/auth/logout` | ✔ | Revoke token |
| POST | `/api/profile` | ✔ | Update profile |
| GET | `/api/skills` | – | Skill catalog |
| GET | `/api/my-skills` | ✔ | My offers & wants |
| POST | `/api/my-skills` | ✔ | Add a skill |
| DELETE | `/api/my-skills/{id}` | ✔ | Remove a skill |
| GET | `/api/dashboard` | ✔ | Stats + suggestions |
| GET | `/api/discover` | ✔ | Ranked candidate partners |
| GET | `/api/matches` | ✔ | My swaps |
| POST | `/api/matches` | ✔ | Request a swap |
| POST | `/api/matches/{id}/respond` | ✔ | Accept/decline |
| GET | `/api/matches/{id}/messages` | ✔ | Conversation |
| POST | `/api/matches/{id}/messages` | ✔ | Send message |
| GET | `/api/sessions` | ✔ | My scheduled sessions |
| POST | `/api/sessions` | ✔ | Schedule a session |
| POST | `/api/ai/match-suggestions` | ✔ | AI-ranked matches |
| POST | `/api/ai/assistant` | ✔ | Chatbot reply |

### Example — Login
```http
POST /api/auth/login
Content-Type: application/json

{ "email": "you@example.com", "password": "your-password" }
```
```json
{ "token": "c95a19a4…", "user": { "id": 1, "name": "Your Name", … } }
```

### Example — Request a swap
```http
POST /api/matches
Authorization: Bearer <token>

{ "partner_id": 2, "score": 70, "message": "Guitar for web dev?" }
```

---

## 7. User Authentication & Security

- **Password hashing:** passwords are hashed with PHP `password_hash()` (bcrypt) and verified
  with `password_verify()`. Plaintext passwords are never stored.
- **Token-based sessions:** on login/registration the server issues a cryptographically random
  64-character token (`bin2hex(random_bytes(32))`) stored in `api_tokens` with a 30-day expiry.
  The mobile app stores it in the device's encrypted keystore via `expo-secure-store`.
- **Authorization:** every protected endpoint resolves the user with `ApiAuth::requireId()`,
  returning `401` if the token is missing, invalid, or expired. Disabled accounts (`is_active=0`)
  are rejected.
- **SQL injection protection:** all queries use PDO prepared statements with bound parameters.
- **Ownership checks:** users can only delete their own skills, respond to swaps addressed to
  them, and read/post messages in conversations they belong to (`SwapMatch::involves`).
- **Input validation:** email format, password length (≥ 8), and enum values are validated
  server-side; duplicate emails are rejected.
- **CORS:** the API sets permissive CORS for the mobile client and handles `OPTIONS` preflight.
- **Logout** revokes the token server-side and clears secure storage on the device.

---

## 8. Dynamic Dashboards

`GET /api/dashboard` aggregates **live** data for the signed-in user:

- Counts of skills offered, skills wanted, pending matches, active (accepted) swaps, and
  upcoming sessions — all computed from the database at request time.
- The top 3 AI/algorithm match suggestions.
- The 5 most recent swaps.

The mobile **Home** tab renders these as stat cards and a suggestion list, and refreshes on
focus and pull-to-refresh, so the dashboard always reflects the current database state.

---

## 9. Core Database Transactions

SkillSwap performs full CRUD across multiple related tables:

| Transaction | Endpoint(s) | Tables touched |
|---|---|---|
| Create / Read / Delete skills | `POST/GET/DELETE /api/my-skills` | `skills`, `user_skills` |
| Create swap request | `POST /api/matches` | `matches` |
| Update swap status | `POST /api/matches/{id}/respond` | `matches` |
| Create / Read messages | `…/messages` | `messages` |
| Schedule session | `POST /api/sessions` | `sessions` |
| Read aggregates | `GET /api/dashboard` | multiple (JOIN/COUNT) |

Adding a skill demonstrates a multi-table transaction: the catalog row is found or created
(`skills`), then linked to the user (`user_skills`) using an idempotent
`INSERT … ON DUPLICATE KEY UPDATE`. The `Database` class also exposes
`beginTransaction/commit/rollBack` for atomic multi-statement operations.

---

## 10. Artificial Intelligence Integration

### 10.1 Provider
Google **Gemini** via `generativelanguage.googleapis.com` (`gemini-2.0-flash` by default,
configurable in `.env`).

### 10.2 Features
1. **AI Match Suggestions** (`POST /api/ai/match-suggestions`, also feeding `/discover` and the
   dashboard). The deterministic `MatchingService` first finds complementary users (people who
   offer what you want *and* want what you offer). Gemini then re-ranks them and writes a short,
   human-readable reason for each match.
2. **In-app Assistant** (`POST /api/ai/assistant`). A chatbot scoped to skill-swapping help
   (profiles, sessions, finding matches).

### 10.3 Graceful Fallback
If no `GEMINI_API_KEY` is configured (or the API call fails), the app still works:
`MatchingService` provides the ranking and `GeminiService` synthesizes a sensible reason, while
the assistant returns helpful canned guidance. The `/health` and `/discover` responses report
`"ai": "gemini"` or `"ai": "fallback"` so the UI can label the mode.

### 10.4 Matching Algorithm
For viewer *A* and candidate *B*: `score = 20·(skills B offers that A wants) + 20·(skills B
wants that A offers) + 30 (bonus if both directions are non-empty)`, capped at 100. A non-zero
both-direction score is a true two-way barter.

---

## 11. Logging Framework

Every AI interaction is recorded in the **`ai_logs`** table via `AiLog::record()`:

- `feature` — `assistant`, `match-suggestions`, etc.
- `prompt` / `response` — truncated to 8,000 chars.
- `status` — `ok`, `no_key`, `empty`, or `http_<code>` for failures.
- `user_id` and `created_at` for auditing.

Logging is wrapped in a try/catch so it can never break a user request. Unhandled server errors
are caught by the front controller and returned as JSON (`500`), with the raw message exposed
only when `APP_DEBUG=true`.

---

## 12. Mobile Application

### 12.1 Screens
| Route | Purpose |
|---|---|
| `(auth)/login`, `(auth)/register` | Secure sign-in / sign-up |
| `(tabs)/index` | Dynamic dashboard |
| `(tabs)/discover` | AI-ranked match cards, request a swap |
| `(tabs)/messages` | Swaps list, accept/decline incoming requests |
| `(tabs)/assistant` | Gemini chatbot |
| `(tabs)/account` | Profile, upcoming sessions, logout |
| `skills` | Add/remove offered & wanted skills |
| `match/[id]` | Chat + schedule a session |

### 12.2 Key Design Points
- Responsive layouts with safe-area handling (titles never clipped by the status bar).
- Light/dark theme via `useTheme()`.
- Typed API client with request timeouts and friendly connectivity error messages.
- Token persisted in the encrypted keystore; session auto-restored on launch.

---

## 13. Installation & Setup Guide

### 13.1 Prerequisites
- XAMPP (Apache + MySQL), PHP 8.1+
- Node.js LTS + npm
- Expo Go app on your phone (Android/iOS), phone on the **same Wi-Fi** as the PC

### 13.2 Backend
1. Place `SkillSwapApi` in `C:\xampp\htdocs\` (this project uses `C:\xamppss\htdocs\`).
2. Start **Apache** and **MySQL** from the XAMPP control panel.
3. (Optional AI) Put your Gemini key in `SkillSwapApi/.env`: `GEMINI_API_KEY=...`
4. Create and seed the database:
   ```bash
   php database/migrate.php
   ```
5. Verify: open `http://localhost/SkillSwapApi/public/api/health` — expect `{"status":"ok",…}`.

### 13.3 Mobile App
1. In `SkillSwap/`, install dependencies (already done): `npm install`.
2. Start Expo: `npx expo start`.
3. Scan the QR code with Expo Go. The app auto-detects your PC's LAN IP for the API. If detection
   fails (e.g. tunnel mode), set `FALLBACK_DEV_IP` in `src/config.ts`.

### 13.4 Accounts
Register your own account in the app. The database installer seeds the skills catalog only — no demo users.

**Biometric sign-in:** After your first login, the app offers Face ID (iOS) or fingerprint (Android). Once enabled, you can unlock the app without retyping your password. Toggle this anytime under Profile → Account.

---

## 14. Testing & Verification

### 14.1 Backend smoke test (PowerShell/curl)
```bash
curl http://localhost/SkillSwapApi/public/api/health
# register or login with your account → capture token
curl -X POST http://localhost/SkillSwapApi/public/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"you@example.com\",\"password\":\"your-password\"}"
# authenticated dashboard
curl http://localhost/SkillSwapApi/public/api/dashboard -H "Authorization: Bearer <token>"
```

### 14.2 End-to-end (on device)
| # | Step | Expected |
|---|---|---|
| 1 | Register / log in | Lands on dashboard |
| 2 | Add skills (teach + learn) | Appear under My Skills |
| 3 | Open Discover | See ranked partners with reasons |
| 4 | Request a swap | Status "pending" in Swaps |
| 5 | Log in as partner, accept | Status "accepted" |
| 6 | Exchange messages | Chat updates both sides |
| 7 | Schedule a session | Appears under Account |
| 8 | Ask the Assistant | Receives a reply |

### 14.3 Verified during development
Health, login, dashboard (with live stats), and discover were verified against the running
backend; the matching engine correctly identified the mutual Web-Dev↔Guitar swap (score 70).

---

## 15. Deployment Notes

- For production, set `APP_DEBUG=false`, configure a real `APP_URL`, and serve the `public/`
  directory as the web root over HTTPS.
- Set `PROD_API_BASE_URL` in `src/config.ts` and build the app with EAS.
- Restrict CORS to known origins and rotate the Gemini key via environment variables (never
  commit `.env`).

---

## 16. Appendix: Project Structure

```
SkillSwapApi/                     # PHP backend
├── app/
│   ├── Controllers/ApiController.php
│   ├── Core/{App,Router,Controller,Database,ApiAuth,helpers}.php
│   ├── Models/{User,Skill,UserSkill,SwapMatch,Message,SwapSession,AiLog}.php
│   └── Services/{MatchingService,GeminiService}.php
├── config/config.php
├── database/{schema.sql,migrate.php}
├── routes/api.php
├── public/{index.php,.htaccess}
├── bootstrap.php
└── .env

SkillSwap/                        # Expo mobile app
├── src/
│   ├── app/
│   │   ├── _layout.tsx, index.tsx
│   │   ├── (auth)/{login,register}.tsx
│   │   ├── (tabs)/{_layout,index,discover,messages,assistant,account}.tsx
│   │   ├── skills.tsx
│   │   └── match/[id].tsx
│   ├── services/api.ts
│   ├── lib/{auth,theme}.ts
│   └── config.ts
└── docs/Technical-Manual.md
```
