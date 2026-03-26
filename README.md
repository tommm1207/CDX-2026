# 🏗️ CDX Warehouse & Construction Management System

<div align="center">
  <img src="public/logo.png" width="180" alt="CDX Logo" />
  <p align="center">
  <strong>A modern, professional, and mobile-optimized PWA for managing construction logistics, finance, and HR.</strong>
  </p>

  <p align="center">
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" /></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" /></a>
    <a href="https://web.dev/progressive-web-apps/"><img src="https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" /></a>
  </p>
</div>

---

## ✨ System Philosophy

**CDX Warehouse** is engineered to bring digital transformation to the construction frontlines. By abstracting complex logistics into an intuitive interface, we enable teams to focus on building while our system handles the data integrity.

### 🛡️ Privacy & Security
- **No Data Leakage**: Our public documentation is strictly technical. We do not expose internal UI layouts or sensitive employee data.
- **Robust Permissions**: Granular data access control based on user roles and specific warehouse assignments.
- **Real-time Integrity**: Every transaction is auditable and synchronized via Supabase's secure real-time engine.

---

## 🛠️ Architecture Overview

The system follows a modern decoupled architecture, combining the speed of Vite with the power of Supabase.

```mermaid
graph TD
    A[Mobile/Web Client] -->|React + Vite| B(UI Components)
    B -->|PWA Layers| C{Sync Engine}
    C -->|Real-time| D[Supabase Backend]
    D -->|PostgreSQL| E[(Relational Data)]
    D -->|Auth/Storage| F[Cloud Assets]
```

---

## 🚀 Core Modules

### 📦 Logic-Driven Inventory
- **Smart Stocking**: Automated tracking of multi-warehouse movements.
- **Verification Flow**: Multi-stage approval guards to prevent inventory discrepancies.

### 💰 Financial Intelligence
- **Deep Analytics**: Dynamic cost filtering and categorization.
- **Auditable Records**: Full history of project expenditures with role-based visibility.

### 🏭 Industrial Production
- **BOM Logic**: Complex material consumption modeling for manufacturing.
- **Flow Automation**: Coupled transactions that link raw material export to finished product import.

### 👥 HR & Intelligent Workforce
- **Time-Tracking**: Integrated Lunar-calendar attendance tracking.
- **Payroll Automation**: Dynamic engine for salary, advances, and allowances.

---

## 🛠️ Technology Stack

- **Core**: [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **State Management**: React Hooks & [Supabase Realtime](https://supabase.com/)
- **UI/UX**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)
- **Build Infrastructure**: [Vite](https://vitejs.dev/)

---

## 🔧 Installation & Setup

Follow these steps to get your local development environment up and running.

### 1. Clone & Enter Project
```bash
git clone https://github.com/tommm1207/CDX-Team.git
cd CDX-Team
```

### 2. Dependency Management
Recommended to use **npm** for consistency with the project's `package-lock.json`.
```bash
npm install
```

### 3. Database & Environment Configuration
1. **Supabase Setup**: Ensure your Supabase project is active and follows the required schema (Tables: `inventory`, `costs`, `employees`, `attendance`, etc.).
2. **Environment Variables**: Create a `.env` file in the root directory by copying the example:
```bash
cp .env.example .env
```
3. **Configure Keys**: Open `.env` and fill in your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Development & Production
- **Start Dev Server**: Launch the app with hot-reloading at `http://localhost:5173`.
  ```bash
  npm run dev
  ```
- **Build for Production**: Generate an optimized build in the `dist/` folder.
  ```bash
  npm run build
  ```

---

<div align="center">
  <p>Crafted with ❤️ by <b>CDX TEAM - NGUYỄN KHÔI NGUYÊN (TOM)</b></p>
  <p><i>"Cộng tác để vươn xa" - Innovating Construction Management.</i></p>
</div>
