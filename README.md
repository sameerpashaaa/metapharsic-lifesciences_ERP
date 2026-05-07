# Metapharsic Lifesciences ERP

Metapharsic Lifesciences ERP is a Vite + React application with a Node backend for inventory, accounting, CRM, compliance, documents, and operational workflows.

## Prerequisites

- Node.js 20 or newer
- npm
- PostgreSQL access for the backend

## Quick Start

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create local environment files:

   ```powershell
   Copy-Item .env.frontend.example .env.local
   Copy-Item .env.example server\.env
   ```

3. Run the project doctor:

   ```powershell
   npm run doctor
   ```

4. Start the frontend and backend together:

   ```powershell
   npm run start-all
   ```

## Common Commands

- `npm run dev` starts the Vite frontend.
- `npm run start-backend` starts the backend from `server/`.
- `npm run start-all` starts both processes together.
- `npm run build` creates a production frontend build.
- `npm run type-check` runs TypeScript validation.
- `npm test` runs the Vitest suite.
- `npm run doctor` checks whether the local project setup is ready.

## Starter Task Added

This starter task adds `npm run doctor`, a dependency-free setup check that confirms the Node version, installed dependencies, expected environment files, and key npm scripts before you try to run the full app.
