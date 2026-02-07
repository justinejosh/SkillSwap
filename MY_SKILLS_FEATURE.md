# My Skills Page - Feature Documentation

## Overview
A comprehensive skill management system that allows users to manage both the skills they offer to teach and the skills they want to learn, all in one centralized location.

## Page Route
`/my-skills`

## Access Points
1. **Dashboard Sidebar** - "My Skills" button (first sidebar card)
2. **Profile Page** - "Manage all skills →" buttons in both skill sections
3. **Profile Page** - "+ Add Skill" buttons

## Key Features

### 1. Statistics Dashboard
Visual overview cards showing:
- **Skills I Offer**: Total count of teachable skills
- **Skills I Want**: Total count of learning goals
- **Verified Skills**: Number of verified competencies
- **Students Taught**: Total students across all skills
- **Average Rating**: Overall teaching rating

### 2. Dual Tab System

#### Tab 1: Skills I Offer
For skills the user can teach:
- **Skill Name** with custom icon
- **Category Badge** (Technology, Creative, Music, etc.)
- **Skill Level Badge** (Beginner, Intermediate, Advanced, Expert)
  - Color-coded for visual hierarchy
- **Verification Status**
  - Green badge for verified skills
  - "Verify" button for unverified skills
- **Key Metrics**:
  - Years of experience (📅)
  - Number of students taught (👥)
  - Teaching rating with star icon (⭐)
- **Actions**:
  - Edit skill details
  - Delete skill
  - Verify skill (links to Verification page)

#### Tab 2: Skills I Want
For skills the user wants to learn:
- **Skill Name** with custom icon
- **Category Badge**
- **Target Level Badge** (desired proficiency)
- **Priority Badge** (High/Medium/Low)
  - Color-coded by urgency
- **Actions**:
  - Find Teachers (links to Marketplace)
  - Edit skill details
  - Delete skill

### 3. Add New Skill Dialog
Comprehensive form with:
- **Skill Type Selection**: Toggle between "I can teach" and "I want to learn"
- **Skill Name Input**: Free text field
- **Category Dropdown**: 8 predefined categories
  - Technology
  - Creative
  - Music
  - Language
  - Lifestyle
  - Business
  - Academic
  - Other
- **Level Selection**: Dropdown for skill level
- **Conditional Fields**:
  - For Offered Skills: Years of experience
  - For Wanted Skills: Learning priority
- **Description**: Multi-line text area for details

### 4. Skill Categories Overview
Grid display of all 8 categories showing:
- Category icon
- Category name
- Count of offered skills in category
- Count of wanted skills in category
- Hover effect for interactivity

### 5. Quick Actions Banner
Gradient call-to-action section with:
- "Browse Marketplace" button
- "Verify Skills" button with icon
- Encouraging messaging

## Visual Design

### Color Scheme
- **Offered Skills**: Blue gradient (from-blue-50 to-white)
- **Wanted Skills**: Green gradient (from-green-50 to-white)
- **Skill Levels**:
  - Beginner: Green
  - Intermediate: Blue
  - Advanced: Purple
  - Expert: Orange
- **Priority Levels**:
  - High: Red
  - Medium: Yellow
  - Low: Green

### Icons by Category
- **Technology**: Code icon
- **Creative**: Palette icon
- **Music**: Music icon
- **Language**: Globe icon
- **Lifestyle**: Utensils icon
- **Business**: TrendingUp icon
- **Academic**: Brain icon
- **Other**: Lightbulb icon

### Mock Data Included
**3 Offered Skills**:
1. Web Development (Technology, Expert, 5 years, Verified, 12 students, 4.9 rating)
2. Graphic Design (Creative, Intermediate, 3 years, Verified, 8 students, 4.7 rating)
3. Photography (Creative, Advanced, 4 years, Unverified, 5 students, 4.8 rating)

**3 Wanted Skills**:
1. Piano (Music, Target: Intermediate, High Priority)
2. Spanish Language (Language, Target: Advanced, High Priority)
3. Cooking (Lifestyle, Target: Beginner, Medium Priority)

## User Interactions

### Add Skill Flow
1. Click "Add New Skill" button
2. Dialog opens
3. Select "I can teach" or "I want to learn"
4. Fill in skill details
5. Submit form
6. Skill appears in appropriate tab

### Edit Skill Flow
1. Click Edit icon on any skill card
2. Form pre-populated with current values
3. Modify details
4. Save changes

### Delete Skill Flow
1. Click Delete icon
2. Confirmation dialog appears
3. Confirm deletion
4. Skill removed from list

### Verify Skill Flow
1. Click "Verify" button on unverified skill
2. Redirects to `/skill-verification` page
3. Choose verification method
4. Complete verification process

### Find Teachers Flow
1. Click "Find Teachers" on wanted skill
2. Redirects to `/marketplace` page
3. Search filtered by that skill

## Integration Points

### Profile Page
- Skills preview cards show subset of skills
- "+ Add Skill" buttons link to My Skills page
- "Manage all skills →" navigation links

### Dashboard
- Sidebar navigation to My Skills
- Quick access from main menu

### Skill Verification Page
- Direct link from unverified skills
- Return to My Skills after verification

### Marketplace
- Find teachers for wanted skills
- Filter by skill categories

## Technical Implementation

### State Management
- `useState` for offered skills array
- `useState` for wanted skills array
- `useState` for dialog open/close
- `useState` for skill type selection
- `useState` for editing skill ID

### Components Used
- Card, CardContent, CardHeader, CardTitle, CardDescription
- Button
- Badge
- Input
- Label
- Textarea
- Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
- Select, SelectContent, SelectItem, SelectTrigger, SelectValue
- Tabs, TabsContent, TabsList, TabsTrigger
- Lucide React Icons

### Responsive Design
- Grid layouts adapt to screen size
- Mobile-friendly cards
- Touch-optimized buttons
- Readable text at all sizes

## Academic Value

This feature demonstrates:
1. **Data Modeling**: Complex skill taxonomy with multiple attributes
2. **CRUD Operations**: Create, Read, Update, Delete functionality
3. **User Experience**: Intuitive skill management interface
4. **Information Architecture**: Clear categorization and organization
5. **Visual Hierarchy**: Color-coding and badges for quick scanning
6. **Cross-feature Integration**: Links to Marketplace, Verification, Profile

## Future Enhancements

Potential additions:
- Drag-and-drop skill reordering
- Skill grouping/folders
- Import skills from LinkedIn/resume
- Skill suggestion based on profile
- Skill matching algorithm preview
- Bulk edit operations
- Skill history tracking
- Skill endorsements from other users

---

**Status**: ✅ Complete and Integrated

This feature is fully functional, visually polished, and ready for thesis demonstration.
