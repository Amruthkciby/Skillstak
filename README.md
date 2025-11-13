# SkillTrack

SkillTrack is a full‑stack learning tracker built with a React + Vite frontend and a Django REST backend. It helps learners plan goals, log activities, and generate weekly summaries, while offering a clean, themeable UI and JWT-secured APIs.

---

## Project Structure

```
backend/
└── Skillstack/           # Django project & app code
    ├── mainapp/          # REST endpoints, serializers, models
    └── manage.py

frontend/
└── my-react-app/         # React + Vite single-page app
    ├── src/
    │   ├── components/   # Feature components (login, dashboard, etc.)
    │   ├── themeContext  # Global dark/light theme provider
    │   └── App.jsx       # Router setup
    └── package.json
```

The frontend and backend run as independent services and communicate over HTTP.

---

## Requirements

### Backend
- Python 3.10+
- pip / virtualenv (or poetry)

### Frontend
- Node.js 18+
- npm (or yarn/pnpm)

---

## Getting Started

### Backend Setup
```bash
cd backend
python -m venv myenv
source myenv/bin/activate  # Windows: myenv\scripts\activate
pip install -r requirements.txt
cd Skillstack

# Apply migrations and launch the API
python manage.py migrate
python manage.py runserver
```
The Django server listens on `http://127.0.0.1:8000/`.

### Frontend Setup
```bash
cd frontend/my-react-app
npm install
npm run dev
```
The Vite dev server opens on `http://127.0.0.1:5173/` by default.

---

## Authentication Flow
1. Register via `POST /mainapp/register/`.
2. Obtain JWT tokens from `POST /mainapp/token/`.
3. Store `access_token` + `refresh_token` in the browser (the app handles this).
4. Authenticated requests include `Authorization: Bearer <access_token>`.
5. Refresh tokens through `POST /mainapp/token/refresh/` when necessary.

The dashboard auto-redirects to `/login` if tokens expire or a request returns 401/403.

---

## Key API Endpoints

| Method | Endpoint                                      | Description                          | Auth |
|--------|-----------------------------------------------|--------------------------------------|------|
| GET    | `/mainapp/hello/`                             | info ping                            | No   |
| POST   | `/mainapp/register/`                          | Create a user account                | No   |
| POST   | `/mainapp/token/`                             | Obtain access/refresh tokens         | No   |
| GET    | `/mainapp/profile/`                           | Current user profile                 | Yes  |
| GET/POST| `/mainapp/learning-goals/`                   | List or create goals                 | Yes  |
| PATCH/DELETE | `/mainapp/learning-goals/{id}/`         | Update or delete a goal              | Yes  |
| GET/POST| `/mainapp/learning-activities/`              | List or log learning activities      | Yes  |
| POST   | `/mainapp/course-import/`                     | Import course metadata by URL        | Yes  |
| POST   | `/mainapp/learning-summary/send-weekly/`      | Generate (mock) weekly summary email | Yes  |
| POST   | `/mainapp/ai/resource-recommendations/`       | Get AI-powered learning recommendations | Yes  |
| POST   | `/mainapp/ai/note-summarization/`             | Generate summaries from learning notes | Yes  |

All authenticated endpoints rely on the JWT access token.

---

## Frontend Highlights
- **Dark/Light Theme Toggle** via a global `ThemeProvider`; preference persists in `localStorage`.
- **Responsive Layouts** with clean cards, forms, and tables.
- **Dashboard** features goal CRUD, activity logging, course imports, insights, and a timeline view.
- **AI-Powered Tools** with two dedicated features:
  - **Resource Recommendations**: Analyzes your learning history to suggest new resources, skills, and platforms tailored to your level and preferences.
  - **Note Summarization**: Automatically extracts key takeaways and topics from your learning notes across activities.
- **User Menu** shows username only (no icon); dropdown displays email and logout button.
- **API Integration** with built-in error handling, token storage, and redirects on auth failure.

---

## AI-Powered Learning Features

### Resource Recommendations
Access via the **"AI-Powered Learning Tools"** section on the dashboard or navigate directly to `/ai-features`.

**What it does:**
- Analyzes your learning goals and activity history
- Identifies your top skills and learning patterns
- Suggests platforms and resource types based on your preferences
- Recommends difficulty progression paths
- Advises on learning consistency

**How it works:**
1. Click **"Get Recommendations"** button on the dashboard
2. AI engine analyzes: skill frequencies, platform preferences, difficulty ratings, resource types, and activity patterns
3. Receive personalized recommendations with actionable insights
4. View your learning profile statistics (total goals, activities, unique skills, average difficulty)

### Note Summarization
Access via the same `/ai-features` page.

**What it does:**
- Automatically summarizes your learning notes from activities
- Extracts key topics and learnings
- Groups summaries by skill (optional goal-specific summaries)
- Provides learning timeline overview

**How it works:**
1. Click **"Summarize Notes"** button on the dashboard
2. Optionally select a specific goal or leave empty for all goals
3. AI generates:
   - Total hours spent and session count
   - Main topics covered
   - Key learnings extracted from notes
   - Detailed learning timeline
4. Use insights to reinforce knowledge and identify gaps

---

## Dark Mode
The theme toggle appears in the navbar and dashboard header. Switching themes updates:
- Backgrounds, cards, text, and shadows
- Inputs, badges, and buttons
- Navigation and dropdowns

The active theme is applied via CSS custom properties and inline palettes.

---

## Weekly Summary (Mock Email)
When you trigger the summary from the dashboard:
1. Frontend calls `POST /mainapp/learning-summary/send-weekly/`.
2. Backend compiles stats scoped to the authenticated user.
3. A console log simulates an email send and returns the summary payload (including `sent_to` address) to the UI.

---

## Environment Variables (Frontend)
For development, API URLs are hardcoded to `http://127.0.0.1:8000/`. To adjust:
1. Create `frontend/my-react-app/.env`:
   ```
   VITE_API_BASE_URL=http://localhost:8000/mainapp
   ```
2. Update API constants in the components to use `import.meta.env.VITE_API_BASE_URL`.

---

## Testing Tips
- Use the browser dev tools network tab to confirm JWT headers.
- Monitor the Django console for weekly-summary mock emails.
- Verify dashboard filtering by logging in with multiple accounts.

---

## Production Considerations
- Serve the compiled React app (via `npm run build`) behind a CDN or reverse proxy.
- Configure HTTPS and secure cookie/token storage.
- Swap inline styles for a design system or CSS-in-JS library if preferred.
- Add background tasks or actual email sending for the weekly summary.

---

## License
This project started from the Vite React template. Adapt and extend as needed for your organization or personal use.
