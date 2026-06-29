# SkillSwap Mobile Application
## User Manual & Instructions

**Version:** 1.0  
**Date:** June 2026  
**Platform:** Android / iOS (Expo React Native)

---

## Table of Contents

| Section | Page |
|---------|------|
| **Introduction** | |
| &nbsp;&nbsp;&nbsp;&nbsp;System Introduction | 1 |
| &nbsp;&nbsp;&nbsp;&nbsp;System Significance | 1 |
| &nbsp;&nbsp;&nbsp;&nbsp;System Beneficiaries and Features | 2 |
| **Getting Started** | |
| &nbsp;&nbsp;&nbsp;&nbsp;System Requirements | 3 |
| &nbsp;&nbsp;&nbsp;&nbsp;Installation Guide | 3 |
| &nbsp;&nbsp;&nbsp;&nbsp;Using the App for the First Time | 4 |
| **How to Use the App** | |
| &nbsp;&nbsp;&nbsp;&nbsp;Creating an Account (Registration) | 5 |
| &nbsp;&nbsp;&nbsp;&nbsp;Signing In | 6 |
| &nbsp;&nbsp;&nbsp;&nbsp;Home Dashboard | 7 |
| &nbsp;&nbsp;&nbsp;&nbsp;Managing Your Skills | 8 |
| &nbsp;&nbsp;&nbsp;&nbsp;Discovering Swap Partners | 9–10 |
| &nbsp;&nbsp;&nbsp;&nbsp;Messages and Chat | 11 |
| &nbsp;&nbsp;&nbsp;&nbsp;Voice and Video Calls | 12 |
| &nbsp;&nbsp;&nbsp;&nbsp;Scheduling a Swap Session | 13 |
| &nbsp;&nbsp;&nbsp;&nbsp;AI Assistant | 14 |
| &nbsp;&nbsp;&nbsp;&nbsp;Profile and Account Settings | 15 |
| **All Rights Reserved** | 16 |

---

## INTRODUCTION

### System Introduction

**SkillSwap** is a peer-to-peer **skill-bartering** mobile application designed to help people exchange knowledge without money. Instead of paying for lessons, users trade what they know: for example, someone who can teach guitar can swap lessons with someone who can teach web development or cooking.

The app connects to a secure backend server that stores user profiles, skills, swap requests, chat messages, and scheduled learning sessions. Users browse potential partners on **Discover**, send **swap requests**, **chat** like a messenger app, and optionally start **voice or video calls** to plan their skill exchange. An **AI Assistant** (powered by Google Gemini when configured) can also help with skill-matching tips and general guidance.

SkillSwap is built for adults **18 years and older**. Registration requires a valid date of birth, and accounts for minors are not accepted.

---

### System Significance

The implementation of SkillSwap provides several advantages for learners and teachers in a community:

- **Affordable learning** — exchange skills instead of paying for every lesson  
- **Smart matching** — find people whose skills complement yours (what you offer vs. what they want)  
- **Direct communication** — text chat, voice call, and video call with swap partners  
- **Organized scheduling** — plan swap sessions with date, time, and notes  
- **Secure access** — account login, optional Face ID / fingerprint unlock, and human verification on sign-in  
- **AI support** — optional AI-ranked partner suggestions and an in-app assistant  

---

### System Beneficiaries and Features

#### Registered Users

All registered users can:

| Feature | Description |
|---------|-------------|
| **Account registration & login** | Create an account with name, email, birthdate (18+), location, and password |
| **My Skills** | Add skills you can **teach** and skills you **want to learn** |
| **Discover** | Browse AI-ranked or smart-matched swap partners |
| **Request swap** | Send a swap request to another user (requires at least one skill on your profile) |
| **Messages** | View swap conversations and send text messages |
| **Voice / video call** | Start a call room with a swap partner from the chat screen |
| **Schedule sessions** | Set a date, time, and notes for an accepted swap |
| **AI Assistant** | Chat with the built-in AI helper |
| **Profile** | Upload a photo, edit bio, enable biometrics, view upcoming sessions, sign out |

#### App Navigation (Bottom Tabs)

| Tab | Purpose |
|-----|---------|
| **Home** | Dashboard with stats and top match suggestions |
| **Discover** | Find and request swap partners |
| **Messages** | Open chats with swap partners |
| **AI** | AI Assistant chat |
| **Profile** | Account settings and sessions |

---

## GETTING STARTED

### System Requirements

#### Mobile Device (User)

| Requirement | Details |
|-------------|---------|
| **Device** | Android or iOS smartphone |
| **OS** | Android 8.0+ / iOS 13+ recommended |
| **Storage** | At least 100 MB free space |
| **Network** | Wi‑Fi or mobile data (required for login, matching, chat, and calls) |
| **Permissions** | Camera & microphone (profile photo and calls); biometrics (optional) |

#### Development / Server Setup (Administrator)

| Requirement | Details |
|-------------|---------|
| **XAMPP** | Apache + MySQL running |
| **PHP** | 8.1 or higher |
| **Node.js** | For Expo mobile app |
| **Expo Go** | On phone, or Android/iOS emulator |

---

### Installation Guide

SkillSwap runs as two parts: the **mobile app** and the **API server**.

#### Step 1 — Start the backend (XAMPP)

1. Open **XAMPP Control Panel**.  
2. Start **Apache** and **MySQL**.  
3. Run the database installer (one time):

   ```text
   C:\xamppss\php\php.exe C:\xamppss\htdocs\SkillSwapApi\database\migrate.php
   ```

4. Confirm the API is running by opening in a browser:

   ```text
   http://localhost/SkillSwapApi/public/api/health
   ```

   You should see `"status": "ok"`.

#### Step 2 — Install and run the mobile app

1. Open a terminal in the SkillSwap folder:

   ```text
   cd C:\xamppss\htdocs\SkillSwap
   ```

2. Install dependencies (first time only):

   ```text
   npm install
   ```

3. Start Expo:

   ```text
   npx expo start --clear
   ```

4. Scan the **QR code** with **Expo Go** on your phone (same Wi‑Fi as the PC), or press `a` for Android emulator / `i` for iOS simulator.

> **Note:** The phone must reach your PC’s API address. On a physical device, the app auto-detects your computer’s local IP. If login fails, check that Apache is running and both devices are on the same network.

---

### Using the App for the First Time

When you open SkillSwap for the first time:

1. The **splash screen** loads, then you see **Login** or **Create an account**.  
2. Tap **Create an account** to register (you must be **18+**).  
3. After signing in, go to **Home** → **Manage my skills** and add at least one skill.  
4. Open **Discover** to find partners and tap **Request swap**.  
5. Open **Messages** to chat with your swap partner.

Without skills on your profile, you **cannot** request a new swap (existing chats still work).

---

## HOW TO USE THE APP

### 1. Creating an Account (Registration)

**Path:** Login screen → **Create an account**

**Steps:**

1. Tap **Create an account** on the login screen.  
2. Fill in the form:
   - **Full name**
   - **Email**
   - **Date of birth** — tap the date field; only users **18 years or older** can register (latest allowed date is exactly 18 years ago from today)
   - **Location** (e.g. city)
   - **Password** — at least 8 characters  
3. Tap **Create account**.  
4. After success, you may be asked to enable **Face ID** or **fingerprint** for faster sign-in next time.

---

### 2. Signing In

**Path:** App launch → **Login**

**Steps:**

1. Enter your **email** and **password**.  
2. Complete **Verify you are human** (tap the checkbox; a short puzzle may appear).  
3. Tap **Sign in**.  
4. On return visits, if biometrics are enabled, you may unlock the app with Face ID or fingerprint instead of typing your password (full login is still required after **Sign out**).

---

### 3. Home Dashboard

**Path:** Bottom tab → **Home**

The home screen shows:

- Welcome message with your first name  
- **Stats:** skills offered, skills wanted, pending swaps, active swaps  
- **Manage my skills** — shortcut to add or remove skills  
- **Top matches** — preview of suggested partners; tap **See all →** for Discover  

Pull down to refresh stats.

---

### 4. Managing Your Skills

**Path:** Home → **Manage my skills** — or Profile → **My Skills**

**Steps:**

1. Choose **I can teach** or **I want to learn**.  
2. Type a skill name (e.g. *Guitar*, *Web Development*, *Cooking*).  
3. Select a level: beginner, intermediate, advanced, or expert.  
4. Tap **Add skill**.  
5. To remove a skill, tap the **trash** icon next to it.

**Important:** You need **at least one skill** before you can request a swap on Discover.

---

### 5. Discovering Swap Partners

**Path:** Bottom tab → **Discover**

**Steps:**

1. Scroll through suggested partners (ranked by skill compatibility; AI ranking when Gemini is configured).  
2. Each card shows:
   - Name and location  
   - Match score (%)  
   - Skills they can teach you  
   - Skills they want from you  
3. If you have **no skills**, a banner appears: **Add skills to start swapping** — tap it to go to My Skills.  
4. Tap **Request swap** to send a request.  
5. Choose **Open chat** in the confirmation dialog, or find the conversation later under **Messages**.  
6. If you already requested a swap with someone, the button changes to **Open chat**.

---

### 6. Messages and Chat

**Path:** Bottom tab → **Messages**

**Steps:**

1. Tap a swap to open the chat.  
2. Type a message and tap **Send** (paper plane icon).  
3. If you **received** a request, tap **Accept** or **Decline** on the Messages list.  
4. When a swap is **accepted**, you can schedule a session from the chat banner.

Messages update automatically every few seconds while the chat is open.

---

### 7. Voice and Video Calls

**Path:** Messages → open a chat → header icons

**Steps:**

1. Open a conversation with a swap partner.  
2. Tap the **phone** icon for a **voice call**, or the **video camera** icon for a **video call**.  
3. A call room opens (Jitsi Meet). Your partner can join by opening the same chat and tapping the same button.  
4. A message is sent in chat when you start a call so your partner knows to join.

**Tip:** Use a real device with microphone/camera permissions granted for best results.

---

### 8. Scheduling a Swap Session

**Path:** Messages → chat (swap must be **accepted**)

**Steps:**

1. Tap **Schedule** in the chat banner.  
2. Enter **Date & time** (e.g. `2026-07-01 15:00`).  
3. Add optional **Notes** (what you will cover).  
4. Tap **Confirm session**.  
5. View upcoming sessions on **Profile**.

---

### 9. AI Assistant

**Path:** Bottom tab → **AI**

**Steps:**

1. Type a question about skills, swapping, or learning.  
2. Tap send.  
3. The assistant replies using Google Gemini when configured, or a built-in fallback message when the API quota is unavailable.

---

### 10. Profile and Account Settings

**Path:** Bottom tab → **Profile**

You can:

- **Change profile photo** — gallery or camera  
- Edit **bio** and save  
- Toggle **Face ID / fingerprint** sign-in  
- Open **My Skills**  
- Open **AI Assistant**  
- View **Upcoming sessions**  
- **Sign out** (clears biometric quick-unlock; next login requires email, password, and verification)

---

## ALL RIGHTS RESERVED

**SkillSwap System — User Manual**

All rights reserved. © 2026 SkillSwap. Unauthorized reproduction or distribution of this manual, or any portion thereof, is strictly prohibited without written permission.

This manual describes the SkillSwap peer-to-peer skill-bartering mobile application and its companion API backend.

---

*End of User Manual*
