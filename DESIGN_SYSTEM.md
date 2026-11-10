# Booka — Design System & Visual Specification

**Version:** 1.0  
**Project:** Booka Service Platform  
**Date:** November 2026  

---

## 1. Color Foundations

### 1.1 Core Brand Tokens

| Token | Name | Hex Code | Primary Usage |
|-------|------|----------|---------------|
| `--brand` | Brand Coral | `#D46B4F` | Primary actions, CTA buttons, active accents |
| `--foreground` | Ink / Espresso | `#1E1C1A` | Navbars, headers, dark sidebars, primary text |
| `--background` | Canvas | `#F8F5F0` | Main application background |
| `--success` | Success Sage | `#528361` | Confirmed bookings, positive indicators |
| `--accent-plum` | Plum Accent | `#7253CB` | Category accents (Barbing, specialties) |

---

### 1.2 Surface & Elevation Tokens

| Token | Hex Code | Role |
|-------|----------|------|
| `--surface` | `#FBFAF7` | Main card background, elevated widgets |
| `--surface-muted`| `#F1ECE5` | Subtle container background |
| `Dashboard Canvas` | `#F3EFE9` | Backoffice main layout canvas |
| `Panel Pure` | `#FFFDF9` | Detailed metrics and schedule widgets |
| `Dark Surface` | `#1E1C1A` | Sidebar and dark stat modules |

---

### 1.3 Extended Brand Spectrum

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Coral 100 | `#FFF8F5` | Selected service card background |
| Coral 200 | `#F4D9CE` | Soft badge backgrounds |
| Warm Peach | `#E89B80` | Accent text on dark surfaces |
| Light Salmon | `#EFB49F` | Eyebrow labels on dark surfaces |
| Coral 500 | `#DD7658` | Notification indicators / dots |
| Dark Coral | `#9E503B` | Deep coral icons and text |
| Blush Pill | `#F0DED4` | Avatar and badge backgrounds |

---

### 1.4 Neutral Text Scale

| Scale | Hex Code | Description |
|-------|----------|-------------|
| Primary Text | `#1E1C1A` | High-contrast headings and body |
| Secondary Text | `#3E3935` | Secondary labels and button outlines |
| Muted Body | `#756F69` | Explanatory copy, descriptions |
| Subtle Text | `#8C847C` | Meta information, timestamps, captions |
| Light Muted | `#A59D94` | Arrows, inactive iconography |
| Soft Label | `#B0A69C` | Optional field hints |

---

### 1.5 Semantic Statuses

| State | Foreground Hex | Background Hex | Label Example |
|-------|----------------|----------------|---------------|
| Confirmed | `#528361` | `#E7F2EA` | `CONFIRMED` |
| Paid | `#528361` | `#E7F2EA` | `PAID` |
| Pending | `#A47328` | `#FFF0D7` | `PENDING` |
| System Health | `#4E7D5D` | `#E6F1E8` | `All systems healthy` |

---

## 2. Typography

### 2.1 Font Families

- **Display & Headlines:** `Fraunces`, Georgia, serif (Weight: 500)
- **Interface & Body:** `DM Sans`, Arial, sans-serif (Weights: 400, 500, 600, 700)

### 2.2 Scale & Hierarchy

| Role | Size | Line Height | Tracking | Weight | Example |
|------|------|-------------|----------|--------|---------|
| **Hero** | `clamp(3.5rem, 7vw, 6.4rem)` | `0.9` | `-0.075em` | 500 | "Make time for you." |
| **Display** | `48px` / `text-5xl` | `0.95` | `-0.07em` | 500 | "Build your place on Booka." |
| **Section H1** | `36px` / `text-4xl` | `0.98` | `-0.06em` | 500 | "Good morning, [Owner Name]." |
| **Section H2** | `28px` / `text-3xl` | `1.1` | `-0.06em` | 600 | "Your backoffice is ready." |
| **Card Heading**| `24px` / `text-2xl` | `1.2` | `-0.05em` | 600 | "Bookings & paid sessions" |
| **Subhead** | `20px` / `text-xl` | `1.2` | `-0.04em` | 600 | "Today's schedule" |
| **Body Large** | `18px` / `text-lg` | `1.5` | `normal` | 400 | Hero paragraph copy |
| **Body** | `16px` / `text-base` | `1.5` | `normal` | 400 | General descriptive text |
| **UI Button** | `14px` / `text-sm` | `1.0` | `normal` | 600 | Action triggers |
| **Caption** | `12px` / `text-xs` | `1.4` | `normal` | 400 | Subtext & status labels |
| **Eyebrow** | `10px` | `1.0` | `+0.14em` | 700 | `01 / YOUR DETAILS` |

---

## 3. Radii, Elevation & Spacing

### 3.1 Border Radius

- `rounded-xl` (`12px`): Standard form inputs, buttons, category badges.
- `rounded-[14px]` (`14px`): `.field` form inputs.
- `rounded-[22px]` (`22px`): KPI metric and listing cards.
- `rounded-[28px]` (`28px`): Main dashboard cards and modal panels.
- `rounded-full` (`9999px`): Pill buttons, tags, circular avatar badges.

### 3.2 Elevation & Shadows

- `--shadow-card`: `0 18px 40px rgba(30, 28, 26, 0.08)`
- `--shadow-float`: `0 24px 80px rgba(30, 28, 26, 0.18)`
- Modal Drop: `0 24px 80px rgba(0, 0, 0, 0.30)`

---

## 4. How to Export to PDF

1. **Option A (Browser Print to PDF):**
   - Open [`DESIGN_SYSTEM.html`](file:///c:/Users/User/Downloads/booka/DESIGN_SYSTEM.html) in your browser.
   - Press `Ctrl + P` (or `Cmd + P` on Mac).
   - Select Destination: **Save as PDF**.
   - Check **Background graphics** under More Settings.
   - Click **Save**.

2. **Option B (Markdown Viewer / VS Code):**
   - Open [`DESIGN_SYSTEM.md`](file:///c:/Users/User/Downloads/booka/DESIGN_SYSTEM.md) in your editor and use the *Markdown: Print to PDF* extension.

