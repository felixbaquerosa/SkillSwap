# SkillSwap

**SkillSwap** is a peer-to-peer skill-bartering mobile app — people teach what they know and learn what they need, without money. Built with **React Native (Expo)** for the mobile app and a **PHP + MySQL** REST API for the backend.

This repository contains everything needed to run the project:

```
SkillSwap/                 # Mobile app (React Native + Expo + TypeScript)
├── src/                   # App source code (screens, components, services)
├── assets/                # Images and icons
├── SkillSwapApi/          # Backend REST API (PHP 8 + MySQL)
├── database/
│   └── skillswap_db.sql   # Full MySQL database dump (schema + sample data)
└── README.md              # This file
```

---

## Features

- Email registration with **18+ age verification** and biometric (fingerprint/Face ID) sign-in
- Add skills you **offer** and **want to learn**; edit, enable, or disable them
- **Discover** matches with complementary skills, shown with **star ratings**
- **Request swaps**, accept/decline, and chat in real time
- **Read receipts** (Sent / Delivered / Read), **online status**, and **archive/delete** conversations
- **Voice & video calls** that run **inside the app** (no extra download)
- **Schedule sessions** with a date & time picker and **appointment reminders**
- **Rate** your swap partner after an accepted swap
- **AI Assistant** (Google Gemini) with a built-in offline fallback guide

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| [XAMPP](https://www.apachefriends.org/) | PHP 8+ / MySQL (MariaDB) | Runs the backend API and database |
| [Node.js](https://nodejs.org/) | 18 LTS or newer | Runs the Expo mobile app |
| [Expo Go](https://expo.dev/go) | Latest | Install on your phone to run the app |

The phone (with Expo Go) and the computer running XAMPP must be on the **same Wi-Fi network**.

---

## 1. Backend setup (PHP API)

1. Copy the **`SkillSwapApi`** folder from this repo into your XAMPP web root, e.g.:

   ```
   C:\xampp\htdocs\SkillSwapApi
   ```

2. Create the API config file. Inside `SkillSwapApi`, copy `.env.example` to `.env`:

   ```bash
   copy .env.example .env
   ```

   The defaults work with a standard XAMPP install (MySQL user `root`, no password). Leave `GEMINI_API_KEY` empty — the AI Assistant falls back to a built-in guide.

3. Start **Apache** and **MySQL** from the XAMPP Control Panel.

---

## 2. Database setup

Import the included database dump using **phpMyAdmin** (easiest):

1. Open `http://localhost/phpmyadmin`
2. Click **Import** → choose **`database/skillswap_db.sql`** → **Go**

This creates the `skillswap_db` database with all tables and sample data.

> **Alternative (command line):**
> ```bash
> C:\xampp\mysql\bin\mysql.exe -u root < database\skillswap_db.sql
> ```
>
> **Fresh empty database instead?** Run the installer:
> ```bash
> C:\xampp\php\php.exe C:\xampp\htdocs\SkillSwapApi\database\migrate.php
> ```

Verify the API is running by visiting:

```
http://localhost/SkillSwapApi/public/api/health
```

You should see a JSON response with `"status": "ok"`.

---

## 3. Mobile app setup

1. From the project root (the `SkillSwap` folder), install dependencies:

   ```bash
   npm install
   ```

2. Point the app at the computer running XAMPP. The app **auto-detects** the LAN IP from the Expo dev server, so usually no change is needed. If detection fails, set the fallback IP in `src/config.ts`:

   ```ts
   const FALLBACK_DEV_IP = '192.168.x.x'; // your computer's Wi-Fi IPv4 address
   ```

   (Find it with `ipconfig` on Windows → "IPv4 Address".)

3. Start the app:

   ```bash
   npx expo start
   ```

4. Scan the QR code with **Expo Go** on your phone (same Wi-Fi). The app loads on your device.

---

## Quick test flow

1. **Register** a new account (must be 18+).
2. Open **My Skills** and add at least one skill you can teach and one you want to learn.
3. Go to **Discover** and **Request a swap** with another user.
4. Accept the swap, then open the **chat** to message, call, schedule a session, and rate your partner.

> The included database already has sample users and skills so matches appear immediately.

---

## Tech stack

- **Mobile:** TypeScript, React Native, Expo SDK 54, Expo Router
- **Backend:** PHP 8, MySQL (MariaDB), custom lightweight REST framework
- **AI:** Google Gemini API (with offline fallback)
- **Calls:** Jitsi Meet embedded in-app via WebView

---

## Notes

- The real API key and local secrets (`SkillSwapApi/.env`) are **not** included for security. Copy `.env.example` to `.env` as described above.
- Voice/video calls require granting **camera** and **microphone** permissions on the phone.
