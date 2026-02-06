# Academic Progress Tracker - System Documentation

## Document Information
- **Project Name:** Academic Progress Tracker
- **Group:** Arid Stone Group - Group C
- **Version:** 1.0
- **Date:** November 2025

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Database Design](#3-database-design)
4. [API Specifications](#4-api-specifications)
5. [AI Module Design](#5-ai-module-design)
6. [User Interface Design](#6-user-interface-design)
7. [Security Implementation](#7-security-implementation)
8. [MVP Scope & Implementation Plan](#8-mvp-scope--implementation-plan)
9. [Deployment Strategy](#9-deployment-strategy)
10. [Testing Strategy](#10-testing-strategy)

---

## 1. Executive Summary

The Academic Progress Tracker is a web-based application designed to help university students monitor, analyze, and optimize their academic performance. The system provides automated CGPA calculation, progress visualization, and AI-powered insights to help students make informed decisions about their academic journey.

### 1.1 Core Features
- User authentication and profile management
- Course and grade tracking
- Automatic CGPA calculation
- Progress visualization
- AI-powered performance analysis and recommendations
- Administrative dashboard

### 1.2 Technology Stack

**Frontend:**
- React.js or Next.js
- Tailwind CSS
- Recharts (lightweight visualization)

**Backend:**
- Supabase (Database + Authentication all-in-one)

**AI/Analytics:**
- Google Gemini API
- Simple prompt engineering for analysis

**Deployment:**
- Vercel or Cloudflare Pages

**Why This Stack:**
- Supabase handles auth + database → no need for separate auth library
- Elysia.js is faster and cleaner than Express
- Gemini API removes need for custom ML models
- Single deployment platform simplifies DevOps
- Minimal setup, maximum productivity

---

## 2. System Architecture

### 2.1 Simplified High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                             │
│                    React/Next.js App                         │
│                   (Hosted on Vercel)                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                    HTTPS/REST API
                          │
┌─────────────────────────▼───────────────────────────────────┐
│              BACKEND LAYER (Elysia.js)                       │
│               (Hosted on Vercel/Cloudflare)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Routes                                           │  │
│  │  • /courses - CRUD operations                        │  │
│  │  • /profile - User profile management                │  │
│  │  • /dashboard - Analytics data                       │  │
│  │  • /analysis - AI insights (Gemini API wrapper)      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                    │
        ▼                                    ▼
┌───────────────────┐            ┌──────────────────────┐
│    SUPABASE       │            │   GEMINI API         │
├───────────────────┤            ├──────────────────────┤
│ • Authentication  │            │ • Performance        │
│ • PostgreSQL DB   │            │   Analysis           │
│ • Row Level       │            │ • Recommendations    │
│   Security (RLS)  │            │ • CGPA Predictions   │
│ • Real-time       │            └──────────────────────┘
│   subscriptions   │
└───────────────────┘
```

### 2.2 Why This Architecture?

**Supabase Benefits:**
- Built-in authentication (email/password, OAuth)
- PostgreSQL database with automatic APIs
- Row Level Security (RLS) for data isolation
- No need for custom JWT implementation
- Real-time capabilities (optional future feature)

**Elysia.js Benefits:**
- 10x faster than Express.js
- TypeScript-first with excellent type safety
- Built-in validation
- Cleaner, more modern API design
- Smaller bundle size

**Gemini API Benefits:**
- No ML model training required
- Sophisticated analysis via prompt engineering
- Cost-effective (generous free tier)
- Easy to implement and iterate
- Handles complex reasoning out-of-the-box

---

## 3. Database Design

### 3.1 Entity Relationship Diagram (ERD)

```
┌─────────────────┐
│     USERS       │
├─────────────────┤
│ user_id (PK)    │
│ email           │
│ password_hash   │
│ first_name      │
│ last_name       │
│ role            │
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │
         │ 1:1
         │
┌────────▼────────┐
│  USER_PROFILES  │
├─────────────────┤
│ profile_id (PK) │
│ user_id (FK)    │
│ degree_program  │
│ grading_scale   │
│ total_credits   │
│ target_cgpa     │
│ enrollment_year │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐
│    COURSES      │
├─────────────────┤
│ course_id (PK)  │
│ user_id (FK)    │
│ course_code     │
│ course_title    │
│ credit_units    │
│ semester        │
│ year            │
│ status          │
│ grade           │
│ grade_point     │
│ created_at      │
│ updated_at      │
└─────────────────┘

┌─────────────────┐
│   AUDIT_LOGS    │
├─────────────────┤
│ log_id (PK)     │
│ user_id (FK)    │
│ action          │
│ entity_type     │
│ entity_id       │
│ old_value       │
│ new_value       │
│ timestamp       │
└─────────────────┘

┌─────────────────┐
│ AI_INSIGHTS     │
├─────────────────┤
│ insight_id (PK) │
│ user_id (FK)    │
│ insight_type    │
│ content         │
│ generated_at    │
│ is_active       │
└─────────────────┘

┌─────────────────┐
│SYSTEM_SETTINGS  │
├─────────────────┤
│ setting_id (PK) │
│ key             │
│ value           │
│ description     │
│ updated_at      │
└─────────────────┘
```

### 3.2 Database Schema (Supabase PostgreSQL)

#### 3.2.1 Users Table
**Note:** Supabase handles this automatically via `auth.users`. We just need to extend it.

```sql
-- Supabase auth.users is already created
-- We create a profiles table for additional data

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    degree_program VARCHAR(255) NOT NULL,
    grading_scale DECIMAL(3,1) DEFAULT 5.0 CHECK (grading_scale IN (4.0, 5.0)),
    total_credits_required INTEGER NOT NULL,
    target_cgpa DECIMAL(3,2),
    enrollment_year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only access their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
```

#### 3.2.2 Courses Table (Simplified)

```sql
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_code VARCHAR(50) NOT NULL,
    course_title VARCHAR(255) NOT NULL,
    credit_units INTEGER NOT NULL CHECK (credit_units > 0),
    semester VARCHAR(20) NOT NULL,
    year INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'in_progress' 
        CHECK (status IN ('completed', 'in_progress', 'to_be_taken')),
    grade VARCHAR(5),
    grade_point DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, course_code, semester, year)
);

-- Enable Row Level Security
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own courses
CREATE POLICY "Users can view own courses"
    ON courses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own courses"
    ON courses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own courses"
    ON courses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own courses"
    ON courses FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_courses_user ON courses(user_id);
CREATE INDEX idx_courses_status ON courses(status);
```

#### 3.2.3 That's It!

For MVP, we only need these two tables:
- `profiles` - Extended user information
- `courses` - Course and grade data

**No need for:**
- Separate users table (Supabase auth.users handles it)
- Audit logs table (can add later)
- AI insights table (Gemini responses are stateless)
- System settings table (use environment variables)

### 3.3 Grade Point Conversion Logic

The system will support both 4.0 and 5.0 grading scales:

**5.0 Scale:**
- A = 5.0
- B = 4.0
- C = 3.0
- D = 2.0
- E = 1.0
- F = 0.0

**4.0 Scale:**
- A = 4.0
- B = 3.0
- C = 2.0
- D = 1.0
- F = 0.0

**CGPA Calculation Formula:**
```
CGPA = Σ(Grade Point × Credit Units) / Σ(Credit Units)
```

---

## 4. API Specifications (Elysia.js)

### 4.1 Why Elysia.js?

Elysia provides built-in validation, type safety, and is significantly faster than Express. Here's how endpoints look:

```typescript
import { Elysia, t } from 'elysia'
import { createClient } from '@supabase/supabase-js'

const app = new Elysia()

// Authentication is handled by Supabase
// Just verify the JWT from headers
```

### 4.2 Authentication (Supabase Built-in)

**Register/Login handled by Supabase client-side:**
```typescript
// Frontend (React)
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Register
const { data, error } = await supabase.auth.signUp({
  email: 'student@university.edu',
  password: 'SecurePass123!'
})

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'student@university.edu',
  password: 'SecurePass123!'
})
```

No backend auth endpoints needed! Supabase handles everything.

### 4.3 Profile Endpoints

#### POST /api/profile
**Description:** Create/Update user profile
```typescript
app.post('/api/profile', async ({ body, headers }) => {
  const token = headers.authorization?.split('Bearer ')[1]
  const { data: { user } } = await supabase.auth.getUser(token)
  
  // Supabase auto-handles RLS, so we just insert
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      degree_program: body.degreeProgram,
      grading_scale: body.gradingScale,
      total_credits_required: body.totalCreditsRequired,
      target_cgpa: body.targetCGPA,
      enrollment_year: body.enrollmentYear
    })
  
  return { success: true, data }
}, {
  body: t.Object({
    degreeProgram: t.String(),
    gradingScale: t.Number(),
    totalCreditsRequired: t.Number(),
    targetCGPA: t.Optional(t.Number()),
    enrollmentYear: t.Number()
  })
})
```

#### GET /api/profile
**Description:** Get user profile
```typescript
app.get('/api/profile', async ({ headers }) => {
  const token = headers.authorization?.split('Bearer ')[1]
  const { data: { user } } = await supabase.auth.getUser(token)
  
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  return data
})
```

### 4.4 Course Endpoints

#### POST /api/courses
**Description:** Add a new course
```typescript
app.post('/api/courses', async ({ body, headers }) => {
  const token = headers.authorization?.split('Bearer ')[1]
  const { data: { user } } = await supabase.auth.getUser(token)
  
  const { data, error } = await supabase
    .from('courses')
    .insert({
      user_id: user.id,
      ...body
    })
    .select()
  
  return { success: true, data }
}, {
  body: t.Object({
    courseCode: t.String(),
    courseTitle: t.String(),
    creditUnits: t.Number(),
    semester: t.String(),
    year: t.Number(),
    status: t.String(),
    grade: t.Optional(t.String()),
    gradePoint: t.Optional(t.Number())
  })
})
```

#### GET /api/courses
**Description:** Get all user courses
```typescript
app.get('/api/courses', async ({ headers, query }) => {
  const token = headers.authorization?.split('Bearer ')[1]
  const { data: { user } } = await supabase.auth.getUser(token)
  
  let request = supabase
    .from('courses')
    .select('*')
    .eq('user_id', user.id)
  
  if (query.status) request = request.eq('status', query.status)
  
  const { data } = await request.order('created_at', { ascending: false })
  
  return { success: true, data }
})
```

#### PUT /api/courses/:id
**Description:** Update course
```typescript
app.put('/api/courses/:id', async ({ params, body, headers }) => {
  const token = headers.authorization?.split('Bearer ')[1]
  const { data: { user } } = await supabase.auth.getUser(token)
  
  const { data } = await supabase
    .from('courses')
    .update(body)
    .eq('id', params.id)
    .eq('user_id', user.id) // RLS ensures this
    .select()
  
  return { success: true, data }
})
```

#### DELETE /api/courses/:id
**Description:** Delete course
```typescript
app.delete('/api/courses/:id', async ({ params, headers }) => {
  const token = headers.authorization?.split('Bearer ')[1]
  const { data: { user } } = await supabase.auth.getUser(token)
  
  await supabase
    .from('courses')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)
  
  return { success: true }
})
```

### 4.5 Dashboard Endpoint

#### GET /api/dashboard
**Description:** Calculate and return all dashboard metrics
```typescript
app.get('/api/dashboard', async ({ headers }) => {
  const token = headers.authorization?.split('Bearer ')[1]
  const { data: { user } } = await supabase.auth.getUser(token)
  
  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  // Get all courses
  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('user_id', user.id)
  
  // Calculate CGPA
  const completedCourses = courses.filter(c => c.status === 'completed')
  const totalPoints = completedCourses.reduce((sum, c) => 
    sum + (c.grade_point * c.credit_units), 0)
  const totalCredits = completedCourses.reduce((sum, c) => 
    sum + c.credit_units, 0)
  const currentCGPA = totalCredits > 0 ? totalPoints / totalCredits : 0
  
  return {
    currentCGPA: parseFloat(currentCGPA.toFixed(2)),
    totalCreditsCompleted: totalCredits,
    totalCreditsRequired: profile.total_credits_required,
    completionPercentage: (totalCredits / profile.total_credits_required) * 100,
    coursesCompleted: completedCourses.length,
    coursesInProgress: courses.filter(c => c.status === 'in_progress').length,
    coursesToBeTaken: courses.filter(c => c.status === 'to_be_taken').length
  }
})
```

### 4.6 AI Analysis Endpoint (Gemini API Wrapper)

#### POST /api/analysis
**Description:** Generate AI insights using Gemini
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

app.post('/api/analysis', async ({ headers }) => {
  const token = headers.authorization?.split('Bearer ')[1]
  const { data: { user } } = await supabase.auth.getUser(token)
  
  // Get user's courses
  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'completed')
  
  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  // Prepare data for Gemini
  const prompt = `
You are an academic advisor AI. Analyze this student's performance and provide insights.

Student Profile:
- Degree: ${profile.degree_program}
- Grading Scale: ${profile.grading_scale}
- Target CGPA: ${profile.target_cgpa || 'Not set'}
- Credits Required: ${profile.total_credits_required}

Completed Courses:
${courses.map(c => `- ${c.course_code}: ${c.course_title} (${c.credit_units} credits, Grade: ${c.grade})`).join('\n')}

Please provide:
1. Current CGPA calculation
2. Weakest subject areas (identify patterns in lower grades)
3. Predicted graduation CGPA (based on current trend)
4. 3 specific, actionable recommendations for improvement

Format your response as JSON with this structure:
{
  "currentCGPA": number,
  "weakestAreas": [
    {
      "subject": string,
      "averageGrade": number,
      "courses": string[],
      "concern": string
    }
  ],
  "predictedGraduationCGPA": {
    "optimistic": number,
    "realistic": number,
    "pessimistic": number
  },
  "recommendations": [
    {
      "priority": "high" | "medium" | "low",
      "title": string,
      "description": string,
      "actionSteps": string[]
    }
  ]
}
`

  // Call Gemini API
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()
  
  // Parse JSON response
  const analysis = JSON.parse(text.replace(/```json|```/g, '').trim())
  
  return { success: true, data: analysis }
})
```


---

## 5. AI Module Design (Simplified with Gemini)

### 5.1 Why Gemini Instead of Custom ML?

**Advantages:**
- ✅ No model training required
- ✅ No Python/Flask microservice needed
- ✅ Sophisticated reasoning out-of-the-box
- ✅ Easy to iterate on prompts
- ✅ Generous free tier (60 requests/minute)
- ✅ Can handle complex academic analysis
- ✅ JSON mode for structured responses

**What we avoid:**
- ❌ Setting up Python environment
- ❌ Training ML models
- ❌ Managing separate AI service
- ❌ Complex deployment pipeline
- ❌ Data preprocessing pipelines
- ❌ Model versioning and updates

### 5.2 Gemini Integration

**Setup:**
```bash
npm install @google/generative-ai
```

**Environment Variable:**
```env
GEMINI_API_KEY=your_api_key_here
```

**Get free API key:** https://makersuite.google.com/app/apikey

### 5.3 Analysis Capabilities via Prompting

Gemini can handle all our analysis needs through well-crafted prompts:

#### 5.3.1 Weakness Identification
The prompt instructs Gemini to:
- Calculate average grades per subject
- Identify subjects below student's overall average
- Detect patterns in performance
- Compare across semesters

#### 5.3.2 CGPA Prediction
Gemini analyzes:
- Current performance trends
- Recent semester performance
- Course difficulty patterns
- Credit distribution

Then provides optimistic, realistic, and pessimistic scenarios.

#### 5.3.3 Recommendations
Gemini generates:
- Prioritized action items
- Subject-specific study strategies
- Course selection advice
- Goal-oriented milestones

### 5.4 Sample Prompt Engineering

**For better results, structure prompts like this:**

```typescript
const prompt = `
You are an experienced academic advisor at a university.
Analyze this student's transcript and provide specific, actionable insights.

STUDENT DATA:
${JSON.stringify(studentData, null, 2)}

YOUR TASK:
1. Calculate the exact CGPA
2. Identify 2-3 weakest subject areas with evidence
3. Predict graduation CGPA with confidence levels
4. Provide 3 specific recommendations

IMPORTANT:
- Be specific with course codes and grades
- Base predictions on actual trends, not assumptions
- Recommendations must be actionable and measurable
- Format response as valid JSON matching this schema: {...}

Respond ONLY with valid JSON, no markdown formatting.
`
```

### 5.5 Response Caching (Optional)

To save API calls, you can cache analysis results:

```typescript
// Simple in-memory cache (or use Redis for production)
const analysisCache = new Map()

const cacheKey = `analysis_${userId}_${lastUpdated}`
if (analysisCache.has(cacheKey)) {
  return analysisCache.get(cacheKey)
}

// Generate new analysis
const analysis = await generateWithGemini(prompt)
analysisCache.set(cacheKey, analysis)

return analysis
```

### 5.6 Cost Estimate

**Gemini Pro Free Tier:**
- 60 requests per minute
- 1,500 requests per day
- Free forever

**For MVP:** Completely free

### 5.7 Future AI Enhancements (Post-MVP)

Once MVP is working, you can:
- Add course difficulty predictions
- Generate personalized study schedules
- Provide exam preparation strategies
- Compare with peer performance (anonymized)
- Suggest optimal course combinations

---

## 6. User Interface Design

### 6.1 Key Screens

#### 6.1.1 Dashboard (Main Screen)
**Components:**
- CGPA Display Card (large, prominent)
- Progress Bar (credit completion percentage)
- Quick Stats Grid (courses completed, in progress, remaining)
- Semester Performance Chart (line/bar chart)
- Recent Activity Feed
- Quick Actions (Add Course, View Analysis)

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Header: Logo | Dashboard | Courses | Profile │
├─────────────────────────────────────────────┤
│                                              │
│  ┌──────────────┐  ┌──────────────────┐   │
│  │              │  │  Progress: 37.5%  │   │
│  │  CGPA: 4.35  │  │  ███████░░░░░░░   │   │
│  │              │  │  45/120 Credits   │   │
│  └──────────────┘  └──────────────────┘   │
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │Completed │ │In Progress│ │Remaining │   │
│  │    15    │ │     5     │ │    20    │   │
│  └──────────┘ └──────────┘ └──────────┘   │
│                                              │
│  ┌─────────────────────────────────────┐   │
│  │   Semester GPA Trend (Chart)        │   │
│  │                                      │   │
│  └─────────────────────────────────────┘   │
│                                              │
│  [+ Add Course]  [View AI Analysis]         │
│                                              │
└─────────────────────────────────────────────┘
```

#### 6.1.2 Course Management Screen
**Features:**
- Filterable course list (by status, semester, year)
- Search functionality
- Add/Edit/Delete course modals
- Bulk actions
- Export to CSV

**Course Card Design:**
```
┌──────────────────────────────────┐
│ CS101 - Intro to Programming     │
│ Credits: 3 | Grade: A (5.0)      │
│ Fall 2024 | Status: Completed    │
│ [Edit] [Delete]                  │
└──────────────────────────────────┘
```

#### 6.1.3 AI Analysis Screen
**Sections:**
1. **Weakness Analysis**
   - Visual indicators (color-coded)
   - Subject breakdown charts
   - Trend graphs

2. **Predictions**
   - Graduation CGPA forecast
   - Confidence intervals
   - Scenario comparison

3. **Recommendations**
   - Prioritized action items
   - Expandable details
   - Progress tracking

#### 6.1.4 Profile Setup Screen
**Form Fields:**
- Degree Program (text input)
- Grading Scale (radio: 4.0 / 5.0)
- Total Credits Required (number)
- Target CGPA (optional, number)
- Enrollment Year (dropdown)

#### 6.1.5 Admin Dashboard
**Components:**
- User management table
- System statistics
- Audit log viewer
- Configuration settings
- Backup/restore tools

### 6.2 Design Principles

1. **Simplicity:** Clean, uncluttered interface
2. **Responsiveness:** Mobile-first design
3. **Accessibility:** WCAG 2.1 Level AA compliance
4. **Consistency:** Uniform color scheme and typography
5. **Feedback:** Clear loading states and error messages

### 6.3 Color Scheme

**Primary Colors:**
- Primary Blue: `#2563eb`
- Success Green: `#10b981`
- Warning Yellow: `#f59e0b`
- Danger Red: `#ef4444`
- Neutral Gray: `#6b7280`

**Grade Color Coding:**
- A (5.0): Green `#10b981`
- B (4.0): Blue `#3b82f6`
- C (3.0): Yellow `#f59e0b`
- D (2.0): Orange `#f97316`
- F (0.0): Red `#ef4444`

---

## 7. Security Implementation

### 7.1 Authentication & Authorization (Supabase Handles It!)

**What Supabase provides out-of-the-box:**
- ✅ Secure password hashing (bcrypt)
- ✅ JWT token generation and validation
- ✅ Session management
- ✅ Email verification
- ✅ Password reset flows
- ✅ Row Level Security (RLS) policies

**What you DON'T need to implement:**
- ❌ Custom JWT logic
- ❌ Password hashing
- ❌ Session storage
- ❌ Token refresh mechanisms

### 7.2 Row Level Security (RLS)

RLS ensures users can only access their own data at the database level:

```sql
-- Already implemented in our schema
CREATE POLICY "Users can view own courses"
    ON courses FOR SELECT
    USING (auth.uid() = user_id);
```

Even if someone tries to manipulate API requests, the database enforces access control.

### 7.3 Data Protection

#### 7.3.1 Encryption
- **In Transit:** HTTPS (enforced by Vercel/Cloudflare)
- **At Rest:** Supabase encrypts database by default
- **Passwords:** Never stored plain-text (Supabase handles hashing)

#### 7.3.2 Input Validation (Elysia Built-in)

Elysia provides type-safe validation:
```typescript
app.post('/api/courses', async ({ body }) => {
  // Validation happens automatically
}, {
  body: t.Object({
    courseCode: t.String({ minLength: 2, maxLength: 20 }),
    creditUnits: t.Number({ minimum: 1, maximum: 6 }),
    grade: t.Optional(t.String({ pattern: '^[A-F]

---

## 8. MVP Scope & Implementation Plan (Simplified)

### 8.1 MVP Features

**Setup & Authentication
- [ ] Set up Supabase project
- [ ] Create database tables (profiles, courses)
- [ ] Implement RLS policies
- [ ] Set up React project with Tailwind CSS
- [ ] Implement Supabase auth (signup/login) in frontend
- [ ] Create basic protected routes

**Core Features
- [ ] Set up Elysia.js backend
- [ ] Create API endpoints:
  - Profile CRUD
  - Courses CRUD
  - Dashboard data
- [ ] Frontend: Add/Edit/Delete courses
- [ ] Frontend: Profile setup form
- [ ] Auto-calculate CGPA

**Dashboard & Visualization
- [ ] Dashboard layout with CGPA display
- [ ] Progress bar (credit completion)
- [ ] Course list with filters
- [ ] Add Recharts for basic visualization
- [ ] Semester GPA chart

**AI Analysis
- [ ] Set up Gemini API
- [ ] Create analysis endpoint
- [ ] Design analysis prompt
- [ ] Display AI insights on dashboard
- [ ] Loading states and error handling

**Polish & Deploy
- [ ] Mobile responsiveness
- [ ] Error messages and validation
- [ ] Deploy backend to Vercel/Cloudflare
- [ ] Deploy frontend to Vercel
- [ ] Test in production
- [ ] Bug fixes

### 8.2 What We're NOT Building (Post-MVP)

**Features to skip for now:**
- ❌ Admin panel
- ❌ Audit logs
- ❌ Email notifications
- ❌ Course recommendations
- ❌ CGPA simulator (what-if scenarios)
- ❌ Peer comparisons
- ❌ Export to PDF
- ❌ Advanced analytics
- ❌ Course difficulty ratings

### 8.4 MVP Development Approach

**Agile Methodology:**
- Work in short sprints (1 week each)
- Daily standups to track progress
- Continuous integration and deployment
- Regular code reviews via GitHub pull requests

**Best Practices:**
- Commit early, commit often
- Write clear commit messages
- Test features before merging to main
- Keep documentation updated
- Use GitHub Issues for task tracking

### 8.5 Minimal Tech Stack

**Frontend:**
- React (create-react-app or Vite)
- Tailwind CSS
- Supabase client
- Recharts
- React Router

**Backend:**
- Elysia.js
- Supabase client
- Gemini API client

**Database & Auth:**
- Supabase (handles everything)

**Deployment:**
- Vercel or Cloudflare Pages (everything in one place)

---

## 9. Deployment Strategy (Super Simple)

### 9.1 Prerequisites

**Accounts needed:**
- [ ] GitHub account
- [ ] Supabase account (free tier)
- [ ] Vercel account (free tier) OR Cloudflare account
- [ ] Google AI Studio account (for Gemini API key)

### 9.2 Supabase Setup

**Step 1: Create Project**
1. Go to https://supabase.com
2. Create new project
3. Wait for database to provision (~2 minutes)

**Step 2: Run SQL Scripts**
Copy-paste the SQL from Section 3.2 into Supabase SQL Editor

**Step 3: Get Credentials**
- Project URL: `https://xxxxx.supabase.co`
- Anon Key: Found in Settings > API
- Save these for environment variables

### 9.3 Local Development

**Project Structure:**
```
academic-progress-tracker/
├── frontend/           # React app
│   ├── src/
│   ├── .env.local
│   └── package.json
├── backend/            # Elysia.js API
│   ├── index.ts
│   ├── .env
│   └── package.json
└── README.md
```

**Frontend Setup:**
```bash
cd frontend
npm install
# Create .env.local with:
# REACT_APP_SUPABASE_URL=your_url
# REACT_APP_SUPABASE_ANON_KEY=your_key
npm start
```

**Backend Setup:**
```bash
cd backend
npm install
# Create .env with:
# SUPABASE_URL=your_url
# SUPABASE_SERVICE_KEY=your_service_key
# GEMINI_API_KEY=your_gemini_key
npm run dev
```

### 9.4 Deployment to Vercel

**Option 1: Deploy via GitHub (Recommended)**

1. Push code to GitHub
2. Go to vercel.com
3. Click "New Project"
4. Import your GitHub repository
5. Vercel auto-detects framework settings

**Frontend:**
- Framework Preset: React (or Next.js)
- Build Command: `npm run build`
- Output Directory: `build` (or `dist`)
- Environment Variables: Add SUPABASE_URL and SUPABASE_ANON_KEY

**Backend:**
- Framework Preset: Other
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables: Add all .env variables

**Option 2: Deploy via Vercel CLI**
```bash
npm i -g vercel
cd frontend
vercel
# Follow prompts

cd backend
vercel
# Follow prompts
```

### 9.5 Deployment to Cloudflare Pages

**Frontend:**
```bash
npm install -g wrangler
cd frontend
npm run build
wrangler pages deploy build --project-name=apt-frontend
```

**Backend (Cloudflare Workers):**
```bash
cd backend
npm run build
wrangler deploy
```

### 9.6 Environment Variables

**Frontend (.env.local):**
```env
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
REACT_APP_API_URL=https://your-backend.vercel.app
```

**Backend (.env):**
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=https://your-frontend.vercel.app
```

### 9.7 Post-Deployment Checklist

- [ ] Test user registration
- [ ] Test login
- [ ] Test adding courses
- [ ] Test CGPA calculation
- [ ] Test AI analysis
- [ ] Verify RLS works (try accessing other users' data)
- [ ] Check CORS settings
- [ ] Test on mobile device

### 9.8 Continuous Deployment

Vercel/Cloudflare automatically deploys when you push to `main` branch:

```bash
git add .
git commit -m "feature: add course filtering"
git push origin main
# Auto-deploys to production!
```

---

## 10. Testing Strategy (Simplified)

### 10.1 Manual Testing First

For MVP, focus on manual testing:

**Test Checklist:**

**Authentication:**
- [ ] Can register with valid email
- [ ] Can't register with duplicate email
- [ ] Can login with correct credentials
- [ ] Can't login with wrong password
- [ ] Stays logged in after page refresh
- [ ] Can logout successfully

**Profile:**
- [ ] Can set up profile on first login
- [ ] Can update profile information
- [ ] Profile data persists

**Courses:**
- [ ] Can add a new course
- [ ] Can edit course details
- [ ] Can delete a course
- [ ] Can't see other users' courses
- [ ] CGPA updates automatically
- [ ] Progress bar updates correctly

**Dashboard:**
- [ ] CGPA displays correctly
- [ ] Chart shows semester data
- [ ] All metrics are accurate
- [ ] AI analysis loads properly
- [ ] AI recommendations are relevant

**UI/UX:**
- [ ] Works on mobile (responsive)
- [ ] Works on tablet
- [ ] Works on desktop
- [ ] No console errors
- [ ] Loading states show properly
- [ ] Error messages are clear

### 10.2 Automated Testing (Optional)

If time permits, add basic tests:

**Frontend Tests (Jest + React Testing Library):**
```javascript
// Example: Test CGPA calculation
test('calculates CGPA correctly', () => {
  const courses = [
    { gradePoint: 5.0, creditUnits: 3 },
    { gradePoint: 4.0, creditUnits: 4 }
  ]
  const cgpa = calculateCGPA(courses)
  expect(cgpa).toBe(4.43)
})
```

**Backend Tests (Elysia Testing):**
```typescript
import { describe, expect, it } from 'bun:test'
import { app } from './index'

describe('Elysia', () => {
  it('should return dashboard data', async () => {
    const response = await app
      .handle(new Request('http://localhost/api/dashboard'))
      .then(res => res.json())

    expect(response.currentCGPA).toBeDefined()
  })
})
```

### 10.3 User Acceptance Testing

**Week 5: Get feedback from 3-5 students:**
- Have them use the app for real
- Ask them to add their actual courses
- Note any confusion or bugs
- Fix critical issues before final submission

### 10.4 Performance Testing (Quick Check)

**Use Browser DevTools:**
- Network tab: API calls should be < 500ms
- Performance tab: Page load should be < 3s
- Lighthouse score: Aim for 80+ on Performance

### 10.5 Security Testing (Basics)

**Manual checks:**
1. Try to access another user's courses by manipulating the URL
2. Try SQL injection in form inputs (e.g., `'; DROP TABLE courses;--`)
3. Try XSS in course titles (e.g., `<script>alert('XSS')</script>`)
4. Verify Supabase RLS blocks unauthorized access

If RLS is configured correctly, these should all fail gracefully.

---

## 11. Quick Start Guide

### 11.1 Get Started in 30 Minutes

**Step 1: Clone & Install (5 min)**
```bash
git clone https://github.com/BU-SENG/foss-project-arid-stone
cd foss-project-arid-stone

# Install dependencies
cd frontend && npm install
cd ../backend && npm install
```

**Step 2: Set Up Supabase (10 min)**
1. Create account at supabase.com
2. Create new project
3. Go to SQL Editor and run:
```sql
-- Copy the entire schema from Section 3.2
```
4. Get your credentials from Settings > API:
   - Project URL
   - Anon Key
   - Service Role Key (for backend)

**Step 3: Configure Environment (5 min)**

**Frontend `.env.local`:**
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

**Backend `.env`:**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_key
```

Get Gemini key from: https://makersuite.google.com/app/apikey

**Step 4: Run Development Servers (2 min)**
```bash
# Terminal 1: Frontend
cd frontend
npm start

# Terminal 2: Backend
cd backend
npm run dev
```

**Step 5: Test It Out (8 min)**
1. Open http://localhost:3000
2. Register a new account
3. Set up your profile
4. Add a few courses
5. Check dashboard
6. Generate AI analysis

### 11.2 Project Structure

```
academic-progress-tracker/
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── utils/            # Helper functions
│   │   ├── App.js
│   │   └── index.js
│   ├── .env.local
│   └── package.json
│
├── backend/
│   ├── routes/               # API routes
│   ├── services/             # Business logic
│   ├── index.ts              # Main server file
│   ├── .env
│   └── package.json
│
└── README.md
```

### 11.3 Common Commands

```bash
# Development
npm run dev          # Start backend dev server
npm start            # Start frontend dev server

# Build
npm run build        # Build for production

# Deploy
vercel               # Deploy to Vercel
git push origin main # Auto-deploy via GitHub
```

### 11.4 Troubleshooting

**Problem: Supabase connection fails**
- Solution: Check if URL and keys are correct in .env files
- Verify Supabase project is active

**Problem: RLS blocks all queries**
- Solution: Make sure RLS policies are created (Section 3.2)
- Check if user is authenticated properly

**Problem: Gemini API returns errors**
- Solution: Verify API key is correct
- Check if you've exceeded free tier limits (60 req/min)

**Problem: CORS errors**
- Solution: Add frontend URL to backend CORS config
- In Elysia: `app.use(cors({ origin: 'http://localhost:3000' }))`

---

## 12. Cost Analysis (Free Tier!)

### 12.1 Monthly Costs for MVP

| Service        | Free Tier                          | Cost for MVP |                 Notes             |
|----------------|------------------------------------|--------------|-----------------------------------|
| **Supabase**   | 500MB DB, 50K monthly active users | **$0**       | More than enough for MVP          |
| **Vercel**     | 100GB bandwidth, unlimited sites   | **$0**       | Perfect for student projects      |
| **Gemini API** | 60 req/min, 1500 req/day           | **$0**       | Generous free tier                |
| **Domain**     | N/A                                | $12/year     | Use free Vercel subdomain instead |
| **Total**      |                                    | **$0/month** | Everything runs on free tiers     |

### 12.2 Scaling Costs (Post-MVP)

**If we hit 1000+ users:**
- Supabase: Might need Pro plan ($25/month)
- Vercel: Still free (unless 100GB bandwidth exceeded)
- Gemini: Still mostly free
- **Total: ~$25/month**

### 12.3 Cost Optimization Tips

1. **Use Supabase RLS** instead of complex auth logic
2. **Cache Gemini responses** to reduce API calls
3. **Optimize images** and assets
4. **Use Vercel Analytics** (free) instead of Google Analytics

---

## 13. Success Metrics

### 13.1 Technical Goals
- [ ] 100% of core features working
- [ ] Page load time < 3 seconds
- [ ] Zero critical bugs at launch
- [ ] Mobile responsive on all screens
- [ ] AI analysis response time < 5 seconds

### 13.2 User Experience Goals
- [ ] 90%+ of users successfully register
- [ ] 80%+ complete profile setup
- [ ] Average session: 5+ minutes
- [ ] At least 5 courses added per user
- [ ] Positive feedback from test users

### 13.3 Project Delivery Goals
- [ ] MVP completed in 5 weeks
- [ ] Documentation complete
- [ ] Deployed to production
- [ ] Demo-ready presentation
- [ ] All team members can explain the system

---

## 14. Future Enhancements (After MVP)

### 14.1 Phase 2 Features (If Time Permits)
- Course difficulty predictions
- CGPA simulator (what-if scenarios)
- Email notifications for milestones
- Export transcript to PDF
- Dark mode
- Multiple grading scales support

### 14.2 Phase 3 Features (Post-Submission)
- Admin dashboard
- Bulk course import (CSV)
- Academic advisor access
- Study time recommendations
- Peer performance comparison (anonymized)
- Mobile app (React Native)

---

## 15. Conclusion

This simplified documentation provides everything your team needs to build a minimal but functional Academic Progress Tracker in 5 weeks.

**Key Simplifications Made:**
1. ✅ Supabase replaces custom auth + database setup
2. ✅ Elysia.js replaces Express (faster, cleaner)
3. ✅ Gemini API replaces custom ML/Python service
4. ✅ Single deployment platform (Vercel/Cloudflare)
5. ✅ Minimal database schema (2 tables only)
6. ✅ No admin panel for MVP
7. ✅ No audit logs for MVP
8. ✅ Focus on core features only


**Next Immediate Steps:**
1. [ ] Review this doc with team
2. [ ] Create GitHub repository at https://github.com/BU-SENG/foss-project-arid-stone
3. [ ] Set up Supabase project
4. [ ] Divide tasks among team members
5. [ ] Begin development sprint

**Communication Channels:**
- Code: GitHub (https://github.com/BU-SENG/foss-project-arid-stone)
- Tasks: GitHub Issues and Projects
- Documentation: GitHub Wiki

---

## 16. Quick Reference

### 16.1 Important Links
- **Supabase Docs:** https://supabase.com/docs
- **Elysia.js Docs:** https://elysiajs.com
- **Gemini API:** https://ai.google.dev/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Recharts:** https://recharts.org

### 16.2 Useful Code Snippets

**Calculate CGPA:**
```typescript
function calculateCGPA(courses: Course[]): number {
  const completed = courses.filter(c => c.status === 'completed')
  const totalPoints = completed.reduce((sum, c) => 
    sum + (c.gradePoint * c.creditUnits), 0)
  const totalCredits = completed.reduce((sum, c) => 
    sum + c.creditUnits, 0)
  return totalCredits > 0 ? totalPoints / totalCredits : 0
}
```

**Supabase Auth (Frontend):**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
)

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: email,
  password: password
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password
})

// Get current user
const { data: { user } } = await supabase.auth.getUser()
```

**Protected Route (React):**
```typescript
function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}
```

### 16.3 Grade Conversion Helper

```typescript
const GRADE_SCALE_5 = {
  'A': 5.0, 'B': 4.0, 'C': 3.0, 
  'D': 2.0, 'E': 1.0, 'F': 0.0
}

const GRADE_SCALE_4 = {
  'A': 4.0, 'B': 3.0, 'C': 2.0, 
  'D': 1.0, 'F': 0.0
}

function getGradePoint(grade: string, scale: number): number {
  return scale === 5.0 
    ? GRADE_SCALE_5[grade] 
    : GRADE_SCALE_4[grade]
}
```



Invalid requests are rejected before reaching your code.

#### 7.3.3 Environment Variables

Never commit sensitive keys:
```env
# .env.local (DO NOT COMMIT)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
GEMINI_API_KEY=your_gemini_key
```

Add `.env.local` to `.gitignore`

### 7.4 Security Checklist

**Before Deployment:**
- [ ] Enable RLS on all tables
- [ ] Test RLS policies (try accessing other users' data)
- [ ] Verify environment variables are not exposed
- [ ] Enable HTTPS (Vercel/Cloudflare do this automatically)
- [ ] Set up CORS properly
- [ ] Add rate limiting (Vercel/Cloudflare provide this)

---

## 8. MVP Scope & Implementation Plan

### 8.1 MVP Features (Must-Have)

**Phase 1: Core Functionality**

#### Authentication & Setup
- ✓ User registration and login
- ✓ Password hashing with bcrypt
- ✓ JWT token generation
- ✓ Basic profile setup (degree program, grading scale, total credits)

#### Course Management
- ✓ Add course functionality
- ✓ Edit course functionality
- ✓ Delete course functionality
- ✓ List all courses
- ✓ Mark course status (completed, in progress, to be taken)

#### Dashboard & CGPA Calculation
- ✓ Automatic CGPA calculation
- ✓ Display completed courses
- ✓ Progress bar (credit completion percentage)
- ✓ Basic dashboard layout with key metrics

#### Basic AI Analysis
- ✓ Identify weakest subject areas (simple average calculation)
- ✓ Basic CGPA prediction (linear projection)
- ✓ Display analysis results on dashboard

**Phase 2: Enhanced Features**

#### Visualization & UX
- ✓ Interactive charts (semester GPA trends)
- ✓ Responsive design for mobile
- ✓ Improved UI/UX with better styling
- ✓ Loading states and error handling

#### Admin Panel (Basic)
- ✓ Admin login
- ✓ View all users
- ✓ Deactivate/activate user accounts
- ✓ Basic audit log viewing

### 8.2 Post-MVP Features (Future Releases)

**Phase 3: Advanced AI & Analytics**
- Advanced trend analysis with machine learning
- Personalized study recommendations
- CGPA simulator (what-if scenarios)
- Semester-by-semester performance comparison
- Course difficulty ratings

**Phase 4: Collaboration & Social**
- Share progress with academic advisors
- Compare anonymous performance with peers
- Study group recommendations
- Achievement badges and milestones

**Phase 5: Integration & Advanced Admin**
- University LMS integration
- Automated grade import
- Email notifications
- Advanced backup/restore features
- System health monitoring dashboard
- Bulk user management

### 8.3 Development Timeline

```
Week 1-2:  Backend Setup + Authentication + Database
Week 3-4:  Core Features (Courses, CGPA, Dashboard)
Week 5:    AI Module (Basic Analysis)
Week 6:    Frontend Polish + Visualization
Week 7:    Admin Panel + Testing
Week 8:    Bug Fixes + Deployment + Documentation
```

### 8.4 Team Roles Recommendation

**For a 8-9 Person Team:**

1. **Backend Developer (1-2 people)**
   - API development
   - Database design
   - Authentication system
   - Server deployment

2. **Frontend Developer (1-2 people)**
   - React components
   - UI/UX implementation
   - Chart integration
   - Responsive design

3. **AI/Data Developer (1 person)**
   - AI module development
   - Analysis algorithms
   - Prediction models
   - Data processing

4. **Full-Stack/DevOps (1-3 people)**
   - System integration
   - Deployment pipeline
   - Testing
   - Documentation

### 8.5 Technology Stack for MVP

**Frontend:**
- React.js
- Tailwind CSS
- Recharts (for visualizations)
- Axios (API calls)
- React Router (navigation)

**Backend:**
- Node.js + Express.js
- PostgreSQL
- bcrypt (password hashing)
- jsonwebtoken (JWT)
- cors, helmet (security)

**AI Module:**
- Gemini API

**Deployment:**
- Frontend: Vercel/Netlify
- Backend: Render
- Database: Render PostgreSQL

---

## 9. Deployment Strategy

### 9.1 Development Environment

**Local Setup:**
```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run dev

# Frontend
cd frontend
npm install
npm start

# AI Module
cd ai-service
pip install -r requirements.txt
python app.py
```

**Environment Variables:**
```env
# Backend .env
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/apt_db
JWT_SECRET=your_super_secret_key_here
NODE_ENV=development
AI_SERVICE_URL=http://localhost:5001

# Frontend .env
REACT_APP_API_URL=http://localhost:5000/api
```

### 9.2 Production Deployment

#### 9.2.1 Database (Render PostgreSQL)
1. Create PostgreSQL instance on Render
2. Note connection string
3. Run migration scripts
4. Set up automated backups (daily)

#### 9.2.2 Backend API (Render)
```yaml
# render.yaml
services:
  - type: web
    name: apt-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: apt-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: NODE_ENV
        value: production
```

#### 9.2.3 Frontend (Vercel)
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "framework": "create-react-app",
  "env": {
    "REACT_APP_API_URL": "https://apt-backend.onrender.com/api"
  }
}
```

#### 9.2.4 AI Service (Render)
```dockerfile
# Dockerfile for AI Service
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["gunicorn", "-b", "0.0.0.0:5001", "app:app"]
```

### 9.3 CI/CD Pipeline

**GitHub Actions Workflow:**
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: npm test
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Render
        run: curl ${{ secrets.RENDER_DEPLOY_HOOK }}
```

### 9.4 Monitoring & Maintenance

**Monitoring Tools:**
- Render built-in metrics
- Sentry (error tracking)
- Google Analytics (user analytics)

**Backup Strategy:**
- Automated daily database backups
- Retention: 30 days
- Manual backup before major updates

**Health Checks:**
```javascript
// Backend health endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime(),
        database: 'connected'
    });
});
```

---

## 10. Testing Strategy

### 10.1 Testing Levels

#### 10.1.1 Unit Testing
**Backend (Jest + Supertest):**
```javascript
describe('CGPA Calculation', () => {
    test('should calculate correct CGPA for multiple courses', () => {
        const courses = [
            { gradePoint: 5.0, creditUnits: 3 },
            { gradePoint: 4.0, creditUnits: 4 },
            { gradePoint: 4.5, creditUnits: 2 }
        ];
        const cgpa = calculateCGPA(courses);
        expect(cgpa).toBeCloseTo(4.39, 2);
    });
});
```

**Frontend (Jest + React Testing Library):**
```javascript
test('renders dashboard with CGPA', () => {
    render(<Dashboard cgpa={4.35} />);
    expect(screen.getByText(/4.35/i)).toBeInTheDocument();
});
```

#### 10.1.2 Integration Testing
- API endpoint testing
- Database integration tests
- Authentication flow testing
- AI module integration

#### 10.1.3 End-to-End Testing (Cypress)
```javascript
describe('Course Management Flow', () => {
    it('should add a new course successfully', () => {
        cy.login('student@test.com', 'password');
        cy.visit('/courses');
        cy.get('[data-cy=add-course-btn]').click();
        cy.get('[data-cy=course-code]').type('CS101');
        cy.get('[data-cy=course-title]').type('Intro to Programming');
        cy.get('[data-cy=submit]').click();
        cy.contains('CS101').should('be.visible');
    });
});
```

### 10.2 Test Coverage Goals

- **Backend:** 80% code coverage
- **Frontend:** 70% code coverage
- **Critical Paths:** 100% coverage (authentication, CGPA calculation)

### 10.3 Testing Checklist

**Functional Testing:**
- [ ] User registration and login
- [ ] Profile setup
- [ ] Add/Edit/Delete courses
- [ ] CGPA calculation accuracy
- [ ] Dashboard data display
- [ ] AI analysis generation
- [ ] Admin functionalities

**Security Testing:**
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] Authentication bypass attempts
- [ ] Authorization checks
- [ ] Password strength enforcement

**Performance Testing:**
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Handle 100 concurrent users
- [ ] Database query optimization

**Usability Testing:**
- [ ] Mobile responsiveness
- [ ] Form validation feedback
- [ ] Error message clarity
- [ ] Navigation intuitiveness

**Browser Compatibility:**
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

---

## 11. Documentation Deliverables

### 11.1 Technical Documentation
- ✓ System Architecture Document (this document)
- API Documentation (Swagger/OpenAPI)
- Database Schema Documentation
- Deployment Guide
- Code Comments and README files

### 11.2 User Documentation
- User Manual
- Quick Start Guide
- FAQ Section
- Video Tutorials (optional)

### 11.3 Project Management
- Project Charter
- Sprint Plans
- Meeting Minutes
- Risk Assessment

---

## 12. Risk Management

### 12.1 Technical Risks

| Risk                         | Impact | Probability | Mitigation                                       |
|------------------------------|--------|-------------|--------------------------------------------------|
| Database performance issues  | High   | Medium      | Implement indexing, query optimization, caching  |
| AI module latency            | Medium | Medium      | Use asynchronous processing, optimize algorithms |
| Security vulnerabilities     | High   | Low         | Regular security audits, follow best practices   |
| Third-party service downtime | Medium | Low         | Choose reliable providers, implement fallbacks   |

### 12.2 Project Risks

| Risk                       | Impact | Probability | Mitigation                                    |
|----------------------------|--------|-------------|-----------------------------------------------|
| Scope creep                | High   | High        | Strict MVP definition, change control process |
| Timeline delays            | Medium | Medium      | Buffer time in schedule, prioritize features  |
| Team member unavailability | Medium | Medium      | Cross-training, documentation                 |
| Technology learning curve  | Low    | Medium      | Early research, prototyping, tutorials        |

---

## 13. Success Metrics

### 13.1 Technical Metrics
- System uptime: >99%
- Average response time: <500ms
- Error rate: <1%
- Test coverage: >75%

### 13.2 User Metrics
- User registration rate
- Daily active users
- Average session duration
- Feature adoption rate (courses added, AI analysis views)

### 13.3 Business Metrics
- User satisfaction score
- Retention rate
- Bug report frequency
- Support ticket volume

---

## 14. Future Enhancements

### 14.1 Short-term (Next 6 months)
- Mobile app (React Native)
- Email notifications
- Export reports to PDF
- Multi-language support

### 14.2 Long-term (1+ year)
- Machine learning for better predictions
- Integration with university systems
- Peer comparison features
- Academic advisor portal
- Course recommendation system

---

## 15. Conclusion

This System Documentation provides a comprehensive foundation for the Academic Progress Tracker project. The modular architecture, clear API specifications, and detailed implementation plan ensure that the team can build a robust, scalable, and user-friendly application.

**Key Takeaways:**
1. Focus on MVP features first (authentication, course management, CGPA calculation, basic AI)
2. Follow security best practices from day one
3. Maintain clean, well-documented code
4. Test thoroughly before deployment
5. Iterate based on user feedback

**Next Steps:**
1. Review and approve this documentation with the team
2. Set up development environment
3. Create project repository and folder structure
4. Begin Sprint 1 (Backend setup + Authentication)
5. Schedule weekly stand-ups and progress reviews

---

## 16. Appendix

### 16.1 Glossary
- **CGPA:** Cumulative Grade Point Average
- **JWT:** JSON Web Token
- **API:** Application Programming Interface
- **CRUD:** Create, Read, Update, Delete
- **MVP:** Minimum Viable Product
- **ORM:** Object-Relational Mapping

### 16.2 References
- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

### 16.3 Project Information
- **Project Lead:** Okeowo Ameenat
- **Technical Lead:** Okorocha Conrad
- **Repository:** https://github.com/BU-SENG/foss-project-arid-stone
- **Group:** Arid Stone Group - Group C

---

**Document Version:** 1.3  
**Last Updated:** 19, November 2025  
**Prepared by:** Okoh Perfection - Arid Stone Group - Group C