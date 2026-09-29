# 🎀 Pretty Pennies

A cute, private, local-first money diary. Blues, yellows, and whites — soft and coquette.

Built with **Vite + React + TypeScript**. No cloud, no accounts, no paid third parties (no Supabase, no Claude). Everything lives on your own device.

## Privacy

- On first launch you set a **PIN**.
- Your whole ledger is **encrypted at rest** (AES-GCM, key derived from your PIN with PBKDF2) and stored in the browser's **IndexedDB** — all via the built-in Web Crypto API.
- The PIN is never stored and never leaves the device. Without it, no one can read your money info.
- "Lock diary" clears the key from memory; the data on disk stays encrypted.

> Because the PIN is the only key, there is no recovery if you forget it. Keep a backup (see below).

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck + production build
npm run preview  # preview the production build
```

## Architecture

```
src/
  domain/         # framework-agnostic types + defaults (the vocabulary)
  repository/     # the storage gateway
    crypto.ts     #   PIN -> key, encrypt/decrypt (Web Crypto)
    idb.ts        #   tiny IndexedDB key/value wrapper
    LedgerRepository.ts  # the single API the app talks to
  store/          # useLedger hook — React <-> repository lifecycle
  lib/            # pure helpers: formatting, selectors, backup
  components/     # UI: LockScreen, Sidebar, Dashboard, Accounts, modal, toast
  styles/         # coquette theme tokens + component styles
```

The **repository** is the only thing that knows about storage. Swapping the
engine later (or adding sync) means changing one file, not the whole app.

## Backup & restore

Use **Export backup** in the sidebar to save a JSON file, and **Import backup**
to restore it. Backups are plain JSON so you can keep them wherever you like.
