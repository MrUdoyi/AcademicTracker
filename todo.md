### TODO – Academic Progress Tracker (Group C)

## Phase 1 — Project Setup

- [x] Create project repository & initialize version control
- [x] Set up backend environment (Next.js server functions)
- [x] Initialize frontend (Next.js 16 + React 19)
- [x] Prepare .env.example environment template
- [ ] Set up production database (migrate from localStorage)

## Phase 2 — User Authentication

- [x] Implement Registration (email + password)
- [x] Implement Login with authentication middleware
- [x] Create login & registration UI pages
- [x] Add form validation & error handling (Valibot)
- [ ] Implement secure session/token storage (backend required)

## Phase 3 — Course Management

- [x] API to add new course (course code, title, units, semester)
- [x] API to edit existing course
- [x] API to delete a course
- [x] API to fetch all courses for a user
- [x] Frontend form to add/edit/delete courses
- [x] Input validation (duplicate codes, empty fields)

## Phase 4 — GPA & CGPA Calculation

- [x] Implement grade-to-point conversion
- [x] Implement GPA calculation per semester
- [x] Implement CGPA calculation overall
- [x] Display GPA & CGPA dynamically on dashboard
- [x] Ensure recalculation when grades change

## Phase 5 — Visualization

- [x] Integrate chart library (Recharts)
- [x] GPA trend chart
- [x] Progress-to-graduation progress bar
- [x] Ensure charts load in under 3 seconds

## Phase 6 — AI Insights

- [x] Build AI or rule-based insights engine (Gemini + rule-based)
- [x] Generate academic improvement suggestions
- [x] Display insights on user dashboard
- [x] Ensure insights update dynamically after grade changes

## Phase 7 — PDF Export

- [x] Create PDF report layout (courses, GPA, CGPA, insights, graphs)
- [x] Implement PDF generator (jsPDF or similar)
- [x] Connect "Export Transcript" button to PDF generator
- [x] Validate PDF formatting & accuracy

## Phase 8 — Testing & Quality

- [x] Unit tests for GPA utilities (22 tests)
- [x] Unit tests for PDF generation (10 tests)
- [ ] Frontend component tests
- [ ] Integration testing (auth → course management → dashboard)
- [ ] Performance testing (loading time < 3 seconds)
- [ ] Accessibility audit (WCAG 2.1 AA compliance)

## Phase 9 — Deployment

- [ ] Deploy to production (Vercel/Netlify)
- [ ] Set up production environment variables
- [ ] Migrate to production database
- [ ] Final end-to-end testing
- [x] Write user documentation (README.md)

---

## Current Status

**Phases 3-7 Complete** ✅
- All core features (Course Management, GPA Calculation, Visualization, AI Insights, PDF Export) are fully functional
- localStorage storage layer abstracted for easy database migration
- Modern UI with Lucide React icons and DaisyUI components
- PDF transcript export with jsPDF including academic summary, semester performance, course details, and insights

**Next Priorities:**
1. Implement secure authentication backend
2. Set up production database (Supabase)
3. Add frontend component tests
4. Deploy to production