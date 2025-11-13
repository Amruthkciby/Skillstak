# Learning Goal Notes System

## Overview
A clean, integrated system for managing and viewing learning goal notes with automatic activity note logging.

## How It Works

### Backend (Django REST Framework)

#### 1. **Automatic Note Appending** (`mainapp/views.py`)

When a user logs a learning activity with notes:

- **Activity Created**: Notes are automatically appended to the parent Learning Goal's notes field
  - Format: `[YYYY-MM-DD HH:MM] activity_note_text`
  - Separator: Double newline between entries for clarity
  - Location: `LearningActivityViewSet.perform_create()`

- **Activity Updated**: If notes are modified, the entry is updated in the goal's notes
  - Tagged as `(updated)` in the timeline for clarity
  - Location: `LearningActivityViewSet.perform_update()`

- **Activity Deleted**: Associated notes are removed from goal notes
  - Keeps goal notes clean when activities are deleted
  - Location: `LearningActivityViewSet.perform_destroy()`

#### 2. **Note Storage Structure**

Learning Goal notes field contains:
```
Main notes (optional)

[2025-11-13 14:30] Activity note 1
[2025-11-13 15:45] Activity note 2 (with updates)
[2025-11-14 09:00] Another activity note
```

- Main notes: User-written goal context (optional)
- Activity notes: Timestamped entries from logged activities
- Parser automatically separates and displays them differently in the UI

---

### Frontend (React)

#### 1. **Note Viewing Modal** (`components/dashboard.jsx`)

Replaces simple text input with an interactive modal:

- **Cleaner UI**: Button-based access instead of inline text fields
- **Visual Distinction**: 
  - "Add Notes" button (gray) if no notes exist
  - "📝 View Notes" button (highlighted) if notes exist

#### 2. **Note Display** (Modal Content)

Two distinct sections:

**Main Notes Section**
- Editable textarea for your personal goal context
- Always visible at top
- Separate from activity notes

**Activity Notes Timeline**
- Read-only timeline of activity entries
- Sorted newest-first (reverse chronological)
- Shows timestamp for each entry
- "Updated" badge highlights edited activity notes
- Clear indicator: "Notes are automatically added when you log learning activities"

#### 3. **Note Parsing Utility** (`parseGoalNotes()`)

```javascript
parseGoalNotes(notesText) -> { entries, mainNotes }
```

- Extracts timestamped entries using regex: `[YYYY-MM-DD HH:MM]`
- Separates main notes from activity entries
- Sorts entries by timestamp (newest first)
- Returns structured data for clean display

---

## User Workflow

### Creating a Learning Goal
1. Fill in skill name, platform, difficulty, target hours
2. Optionally add main notes (context, resources, goals)
3. Save goal

### Logging Activities
1. Select goal from dropdown
2. Choose date and hours spent
3. Add notes about what you worked on
4. Submit

**Result**: Notes automatically appear in the goal's note history with timestamp

### Viewing Goal Notes
1. In "Your Learning Goals" table, click "📝 View Notes" button
2. Modal opens showing:
   - Main notes (editable)
   - Activity notes timeline (read-only, timestamped)
3. Can edit main notes and save
4. Activity notes are automatically managed

### Updating Activity Notes
1. Edit activity through the API or UI
2. Changes are tracked with "(updated)" tag
3. Updated entry appears in goal's note history

### Deleting an Activity
1. Delete activity
2. Associated notes are removed from goal's note history
3. Main notes remain untouched

---

## Technical Details

### Database
- **LearningGoal.notes** (TextField): Stores all notes including activity entries
- **LearningActivity.notes** (TextField): Original activity notes

### API Behavior
- POST `/learning-activities/`: Appends notes to goal
- PUT `/learning-activities/{id}/`: Updates notes entry if changed
- DELETE `/learning-activities/{id}/`: Removes notes from goal
- GET returns combined notes in goal.notes field

### Frontend States
- `viewingGoalNotes`: Current goal whose notes are being viewed (null if modal closed)
- Manages modal lifecycle independently from goal data

---

## Benefits

✅ **Clean Integration**: Notes automatically sync without user interaction  
✅ **Structured History**: Timestamped entries for audit trail  
✅ **Flexible Editing**: Main notes separate from activity timeline  
✅ **Visual Clarity**: Distinct sections with appropriate permissions (edit/read-only)  
✅ **Data Preservation**: Main notes untouched when activities are modified  
✅ **Professional Look**: Modal-based UI with modern styling  
✅ **Easy Accessibility**: Quick view button in goals table  

---

## Example

### Goal Created
- Skill: "React Hooks"
- Main Notes: "Learning React's hook system. Focus on useState, useEffect"

### Activity 1 Logged
- Date: 2025-11-13
- Hours: 2
- Notes: "Completed useState tutorial and hooks rules"
- **Result**: Added to goal notes with timestamp

### Activity 2 Logged
- Date: 2025-11-14
- Hours: 1.5
- Notes: "Practiced custom hooks with two examples"
- **Result**: Appended with new timestamp

### Goal Notes Display
```
Main Notes Section:
Learning React's hook system. Focus on useState, useEffect

Activity Notes:
[2025-11-14 09:30] Practiced custom hooks with two examples
[2025-11-13 14:30] Completed useState tutorial and hooks rules
```

---

## Clean Code Principles Applied

- ✅ **Separation of Concerns**: Main notes vs activity notes
- ✅ **DRY**: Single source of truth (goal.notes field)
- ✅ **KISS**: Simple timestamp format, clear UI
- ✅ **Testability**: Parsing logic is pure function
- ✅ **Maintainability**: Clear structure and documentation
