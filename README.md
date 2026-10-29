# SEI-RPPS | Sistema de Gerenciamento de Caixa de Previdência

## Table of Contents

* [What it does](#what-it-does)
* [Features](#features)
* [Stack](#stack)
* [Architecture & Structure](#architecture--structure)
* [Getting Started](#getting-started)
  * [Prerequisites](#prerequisites)
  * [Installation](#installation)
  * [Environment Variables](#environment-variables)
  * [Running the Application](#running-the-application)
* [Commands](#commands)
* [Tests](#tests)
* [License](#license)

## What it does

**SEI-RPPS** is a comprehensive management platform designed for Brazilian Social Security Funds (RPPS). It streamlines administrative routines, handles financial contributions, manages social security guides (guias), tracks payment flows, processes organizational units (órgãos, centros de custo), and generates financial reports and PDFs.

## Features

| Module / Area | Description | 
| ----- | ----- | 
| **Dashboard** | Centralized financial overview and key indicators for the social security fund. | 
| **Caixas de Previdência** | Multi-fund support with quick context switching (`CaixaSwitcher`). | 
| **Guias & PDF Reports** | Generation, import, and PDF rendering of social security collection guides with automated calculations (contributions, interest/acréscimos). | 
| **Payment Management** | Tracking and launching payments (`LancarPagamento`), historical statements, and processing sheets (`NovaFolha`). | 
| **Organizational Units** | Administration of public bodies (`Órgãos`) and cost centers (`Centros de Custo`). | 
| **User Administration** | Role-based permission routing and administrative user provisioning via Supabase Edge Functions. | 

## Stack

* **Framework:** React 18+ with TypeScript (Strict mode)
* **Build Tool:** Vite
* **Styling & UI:** Tailwind CSS, shadcn/ui component primitives, Lucide React icons
* **Backend & Database:** Supabase (PostgreSQL, Auth, Edge Functions)
* **State Management & Routing:** React Router, Context API (`AuthContext`)
* **Testing:** Vitest

## Architecture & Structure

The repository follows a clean, modular component-driven layout inside `src/`:

```
src/
├── assets/             Images and logos
├── components/         Reusable UI components, layouts, and route guards
│   └── ui/             shadcn/ui design system primitives
├── contexts/           Global state providers (e.g., AuthContext)
├── hooks/              Custom application hooks (`useCaixa`, `useCadastros`, etc.)
├── integrations/       External services configuration (Supabase client and types)
├── lib/                Core business calculations, formatters, and PDF generators
├── pages/              View components mapped to application routes
└── test/               Unit and integration testing files
supabase/
├── functions/          Supabase Edge Functions (admin user creation, spreadsheet analysis)
└── migrations/         SQL database migration history
```

## Getting Started

### Prerequisites

* **Node.js:** Managed via `nvm` (Node Version Manager)
* **npm:** Package manager (bundled with Node.js)

Ensure you have Node.js installed using `nvm`:

```bash
nvm install node
nvm use node
```

### Installation

Clone the repository and install dependencies:

```bash
npm install
```

### Environment Variables

Create a `.env` file at the root of the project with your Supabase configurations:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Running the Application

Start the local development server:

```bash
npm run dev
```

The application will launch locally at `http://localhost:5173`.

## Commands

| Command | Description | 
| ----- | ----- | 
| `npm install` | Installs dependencies. | 
| `npm run dev` | Starts the Vite development server. | 
| `npm run build` | Compiles the production application bundle. | 
| `npm run lint` | Runs ESLint code quality checks. | 
| `npm test` | Executes the Vitest test suite. | 

## Tests

The project includes unit tests for core social security calculations (contributions, interest/acréscimos, and PDF generation logic) located under `src/test/`.

Run the tests using:

```bash
npm test
```

## License

Private project. All rights reserved.