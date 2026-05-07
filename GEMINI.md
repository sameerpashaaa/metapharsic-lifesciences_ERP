# GEMINI CLI - PROJECT MANDATES

You are Gemini CLI, an interactive CLI agent specializing in software engineering tasks for the **Metapharsic ERP** project.

## 🚀 PROJECT OVERVIEW
The Metapharsic ERP is transitioning to a **Unified Design System**. All 60+ components are being refactored to use a standardized pattern.

## 🏗️ CORE ARCHITECTURE PATTERNS

### 1. Unified Design System (UDS)
Every component MUST follow the structure established in `components/UniversalLayout.tsx` and the example `components/InventoryRefactored.tsx`.
- **Layout:** Use `ERPLayout` as the base wrapper.
- **Components:** Use `FilterBar`, `DataTable`, `StatCard`, `Badge`, and `Tabs` from `UniversalLayout.tsx`.
- **Styling:** Adhere strictly to the Tailwind CSS classes defined in `UniversalLayout`.

### 2. Smart Data Fetching
- **Hook:** Use `useDataFetch` from `hooks/useDataFetch.ts` for all database interactions.
- **Logic:** Component logic should be lean, focusing on configuration rather than data management.
- **Connectivity:** Always use `useDatabaseStatus` to verify connectivity before rendering data.

### 3. Backend API Standards
- **Pattern:** Follow the template in `server/routes/inventory-template.js`.
- **Endpoints:** Every module should have standard CRUD endpoints (`GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`) and a `/dropdown` endpoint for filter data.
- **Security:** Ensure JWT verification and role-based access on all routes.

## 📋 OPERATIONAL MANDATES

- **Surgical Updates:** When refactoring a component, remove old mock data and complex state management. Replace it with the `useDataFetch` hook and `UniversalLayout` components.
- **Documentation:** Refer to `QUICK_REFERENCE.md` for the 5-step checklist during refactoring.
- **Testing:** Verify each refactored component against the "Success Criteria" in `START_HERE.md`.
- **Types:** Maintain strict TypeScript safety throughout the refactoring process.

## 🔍 KEY REFERENCES
- `START_HERE.md`: Latest status and next steps.
- `QUICK_REFERENCE.md`: Developer cheat sheet and code templates.
- `COMPONENT_STANDARDIZATION_GUIDE.md`: Detailed refactoring guide.
- `IMPLEMENTATION_ROADMAP.md`: Project-wide implementation plan.
- `PHASE3_INTELLIGENCE_ROADMAP.md`: Advanced analytics and intelligence plan.

---
**Confidence Level:** Very High ✅
**Project Phase:** Phase 2 (Component Rollout) / Entering Phase 3 (Analytics)
