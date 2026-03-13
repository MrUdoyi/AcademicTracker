# Personalized Academic Progress Tracker (PAPT)

## Project Summary / Requirements

This Personalized Academic Progress Tracker (PAPT) is designed for students to monitor their academic performance.  
Key requirements include:

- User authentication for students only  
- Dashboard showing courses, grades, and progress  
- Ability to update and track completed assignments and exams  
- Responsive design for both desktop and mobile  
- Optional notifications or reminders for upcoming tasks or deadlines

## Purpose / Objective
The Personalized Academic Progress Tracker (PAPT) helps students monitor and organize their academic performance, keeping track of courses, grades, and overall progress.

## Key Features
- Track course enrollment and completion  
- Monitor grades and GPA  
- View academic progress over time  
- User-friendly dashboard for quick insights  
- PDF transcript export with comprehensive reports
- Interactive charts and analytics
- AI-powered insights (Google Gemini)

## Quick Start

```bash
# Using bun
bun install
bun dev

# Or using npm
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Setup

Create `.env.local` in the project root:

```bash
GEMINI_API_KEY=your_api_key_here  # Optional - for AI insights
```

Get API key: [Google AI Studio](https://makersuite.google.com/app/apikey)

### Support / Contact
This is a proprietary internal project. For feedback, bug reports, or access requests, contact the project maintainers directly.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4 + DaisyUI 5
- Valibot (validation)
- Recharts (charts)
- Lucide React (icons)
- jsPDF + jspdf-autotable (PDF generation)
- Google Generative AI

## Project Structure

```
app/
├── components/      # UI components
├── lib/
│   ├── actions/     # Server functions
│   ├── schemas/     # Validation schemas
│   ├── storage/     # Storage layer
│   ├── utils/       # Utilities
│   └── hooks/       # React hooks
└── (routes)/        # Pages
```

## Scripts

```bash
# Using bun
bun install       # Install dependencies
bun dev           # Development server
bun run build     # Production build
bun start         # Production server
bun run lint      # Lint check
bun test          # Run tests

# Using npm
npm install       # Install dependencies
npm run dev       # Development server
npm run build     # Production build
npm start         # Production server
npm run lint      # Lint check
npm test          # Run tests
```

## License

UNLICENSED

---

**Note**: App works without Gemini API key but AI insights won't be available.
