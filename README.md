# RAYEN — Ready Project

A React + Vite community chat starter with Supabase email authentication and a local Ollama AI Teacher.

## 1. Install and run

Open this folder in VS Code. Open Terminal and run:

```bash
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

## 2. Supabase setup (real accounts)

Create a file named `.env.local` in the project root (same level as `package.json`) and add:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Use the project's **Publishable** key only. Never put a Supabase secret/service-role key in frontend code.

Restart Vite after creating or changing `.env.local` (`Ctrl+C`, then `npm.cmd run dev`).

If Supabase is not configured, the app opens in local guest mode so you can check the interface. Guest mode does not create accounts.

## 3. AI Teacher (optional)

Install Ollama, download the model, then run:

```bash
ollama run llama3.2:1b
```

Keep Ollama running. The AI Teacher calls `http://localhost:11434/api/chat` from the same computer.

## Important current limitations

- Chat messages are saved in this browser's local storage only. They are **not** shared across devices or users yet.
- The channels in this starter are visible interface channels, not private Supabase channels.
- Supabase authentication supports account creation and sign-in when configured. Database-backed chat, private-channel membership, invitations, and production-ready Row Level Security still need to be implemented and tested.
- This project intentionally does not claim that private channels or multi-device chat are complete.

## Project structure

```text
RAYEN_Ready/
  index.html
  package.json
  vite.config.js
  .env.example
  src/
    main.jsx
    App.jsx
    Auth.jsx
    supabaseClient.js
    index.css
    App.css
```
