# 🎨 METAPHARSIC ERP - FONT & STYLING FRAMEWORK

**Complete Design System Documentation**

---

## 📝 Typography (Fonts)

### Primary Font
**Name:** Inter  
**Source:** Google Fonts  
**Weights:** 300, 400, 500, 600, 700, 800  
**Usage:** All text throughout the application (sans-serif default)  
**Import:** 
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
```

**Font Applied to:**
- Headings (h1, h2, h3)
- Body text
- Labels
- Buttons
- Tables

### Font Weights Used

| Weight | Size | Usage | Example |
|--------|------|-------|---------|
| **800** | - | - | Not commonly used |
| **700** | - | Bold text, headers | Page titles, section headers |
| **600** | - | Semi-bold | Button labels, important text |
| **500** | - | Medium | Form labels, navigation |
| **400** | - | Regular (default) | Body text, paragraphs |
| **300** | - | Light | Secondary text, descriptions |

---

## 🎯 Styling Framework

### Primary Framework
**Tailwind CSS** (v3+)  
**Method:** CDN-based (via cdn.tailwindcss.com)  
**Located in:** `index.html` (inline script tag)

```html
<script src="https://cdn.tailwindcss.com"></script>
```

---

## 🎨 Color Palette

### Primary Colors (Configured)

```javascript
colors: {
  primary: '#2563eb',      // Royal Blue (primary actions)
  secondary: '#475569',    // Slate 600 (secondary elements)
  success: '#10b981',      // Emerald 500 (success/positive)
  warning: '#f59e0b',      // Amber 500 (warnings/caution)
  danger: '#ef4444',       // Red 500 (errors/dangerous)
  
  metal: {
    900: '#0f172a',        // Darkest (backgrounds)
    800: '#1e293b',        // Very dark (cards, panels)
    700: '#334155',        // Dark (text, borders)
    100: '#f1f5f9',        // Light (backgrounds)
  }
}
```

### Utility Colors (Tailwind Default)

- `slate-*` (100-900) - Grayscale
- `blue-*` (100-900) - Blues
- `emerald-*` - Greens
- `red-*` - Reds
- `amber-*` - Yellows

---

## 📐 Spacing & Layout

### Tailwind Default Spacing Scale

Used throughout components for padding, margins, gaps:

```
sm = 0.5rem (8px)
md = 1rem (16px)
lg = 1.5rem (24px)
xl = 2rem (32px)
2xl = 3rem (48px)
```

### Common Classes Used

**Padding:** `p-4`, `p-6`, `px-4`, `py-2`  
**Margin:** `m-4`, `mb-6`, `mt-2`  
**Gaps:** `gap-2`, `gap-4`, `gap-6`  
**Borders:** `border`, `border-slate-200`, `border-b`  
**Rounded:** `rounded-lg`, `rounded-full`

---

## 🖼️ Component Styling Examples

### Headers & Page Titles

```typescript
// Heading Level 1 (Page Title)
<h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>

// Properties:
// - Size: text-2xl (28px, 1.875rem)
// - Weight: font-bold (weight: 700)
// - Color: text-slate-900 (#0f172a)
```

### Descriptions

```typescript
<p className="text-sm text-slate-500 mt-1">
  Real-time stock levels and expiry tracking
</p>

// Properties:
// - Size: text-sm (14px, 0.875rem)
// - Color: text-slate-500 (muted gray)
// - Margin: mt-1 (top margin)
```

### Buttons

```typescript
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  Refresh
</button>

// Properties:
// - Padding: px-4 py-2 (horizontal 16px, vertical 8px)
// - Background: bg-blue-600 (primary color)
// - Text: text-white
// - Rounded: rounded-lg (border-radius: 0.5rem)
// - Hover: hover:bg-blue-700 (darker on hover)
```

### Table Cells

```typescript
<td className="px-4 py-3 text-slate-600 border-b border-slate-200">
  Product Name
</td>

// Properties:
// - Padding: px-4 py-3 (16px horizontal, 12px vertical)
// - Color: text-slate-600 (medium gray)
// - Border: border-b border-slate-200 (bottom border, light gray)
```

---

## ✨ Special Effects & Utilities

### Glassmorphism (Frosted Glass Effect)

```css
.glass-panel {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.glass-dark {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

### Animations

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0px); }
}

.animate-float {
  animation: float 4s ease-in-out infinite;
}
```

### Scrollbar Styling

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #94a3b8 0%, #64748b 100%);
  border-radius: 4px;
  border: 2px solid #f1f5f9;
}

::-webkit-scrollbar-thumb:hover {
  background: #475569;
}
```

---

## 📱 Responsive Design

### Breakpoints (Tailwind Default)

```
sm  = 640px   (tablets)
md  = 768px   (small laptops)
lg  = 1024px  (desktops)
xl  = 1280px  (large desktops)
2xl = 1536px  (very large displays)
```

### Usage

```typescript
// Example: Different layout on mobile vs desktop
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  {/* 1 column on mobile, 4 columns on md screens and up */}
</div>

// Example: Hidden on mobile, shown on desktop
<div className="hidden md:block">
  {/* Only visible on medium screens and larger */}
</div>
```

---

## 🎯 Typography Scale (From Tailwind)

| Class | Size | Line Height |
|-------|------|-------------|
| `text-xs` | 0.75rem | 1rem |
| `text-sm` | 0.875rem | 1.25rem |
| `text-base` | 1rem | 1.5rem |
| `text-lg` | 1.125rem | 1.75rem |
| `text-xl` | 1.25rem | 1.75rem |
| `text-2xl` | 1.5rem | 2rem |
| `text-3xl` | 1.875rem | 2.25rem |
| `text-4xl` | 2.25rem | 2.5rem |

---

## 🧩 Component-Specific Styling

### ERPLayout (Main Container)

```typescript
<div className="bg-white rounded-lg border border-slate-200 shadow-sm">
  {/* Content */}
</div>

// Classes:
// - bg-white: white background
// - rounded-lg: border-radius 0.5rem
// - border border-slate-200: 1px light gray border
// - shadow-sm: subtle drop shadow
```

### FilterBar

```typescript
<div className="flex gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
  {/* Filter inputs */}
</div>

// Classes:
// - flex: flexbox layout
// - gap-4: 16px spacing between items
// - p-4: 16px padding
// - bg-slate-50: very light gray background
// - rounded-lg border border-slate-200: subtle border
```

### DataTable

```typescript
<table className="w-full">
  <thead className="bg-slate-50 border-b-2 border-slate-200">
    <tr>
      <th className="text-left text-sm font-semibold text-slate-700 px-4 py-3">
        Column Header
      </th>
    </tr>
  </thead>
  <tbody className="divide-y divide-slate-200">
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 text-slate-600">Cell Content</td>
    </tr>
  </tbody>
</table>

// Classes used:
// - w-full: 100% width
// - bg-slate-50: light gray header background
// - border-b-2: 2px bottom border
// - text-left: align text left
// - text-sm: small text
// - font-semibold: weight 600
// - px-4 py-3: padding
// - hover:bg-slate-50: hover effect
// - transition-colors: smooth color transition
// - divide-y: separator between rows
```

### StatCard

```typescript
<div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
  <p className="text-sm text-blue-600 font-medium">Total SKUs</p>
  <p className="text-2xl font-bold text-blue-900 mt-2">125</p>
</div>

// Classes:
// - p-4: padding 16px
// - bg-gradient-to-br: gradient background
// - rounded-lg: rounded corners
// - border border-blue-200: blue border
// - text-sm text-blue-600: small blue label
// - text-2xl font-bold: large bold number
```

---

## 🎨 Current Styling Summary

| Element | Font | Size | Weight | Color | Background |
|---------|------|------|--------|-------|------------|
| **Page Title** | Inter | 28px | 700 | slate-900 | - |
| **Description** | Inter | 14px | 400 | slate-500 | - |
| **Table Header** | Inter | 14px | 600 | slate-700 | slate-50 |
| **Table Cell** | Inter | 14px | 400 | slate-600 | white |
| **Button** | Inter | 14px | 600 | white | primary (blue) |
| **Input Label** | Inter | 14px | 500 | slate-700 | - |
| **Input Field** | Inter | 14px | 400 | slate-900 | white/slate-50 |
| **Badge** | Inter | 12px | 600 | varies | varies |

---

## 🔧 How to Apply These Styles

### To Any Element

```typescript
import className = "
  // Typography
  font-sans           // Use Inter font
  text-sm font-medium // Size and weight
  text-slate-600      // Color
  
  // Spacing
  p-4 m-2             // Padding and margin
  
  // Layout
  flex gap-2          // Flexbox with gap
  
  // Visual
  rounded-lg          // Rounded corners
  border border-slate-200  // Border
  bg-white            // Background
  shadow-sm           // Shadow
  
  // Interactions
  hover:bg-slate-50   // Hover state
  transition-colors   // Smooth transitions
"
```

---

## 📊 Live Styling in Your App

### What You're Currently Seeing

**In the Stock Items / Products page:**

```
┌─ Header (text-2xl font-bold) ─────────────────┐
│ Stock Items / Products                         │
│ Enterprise Inventory Intelligence • 4 ACTIVE   │
├─ FilterBar (flex gap-4 p-4 bg-slate-50) ─────┤
│ [Search Input] [Filter] [Buttons]             │
├─ Statistics (grid cols-4 gap-4) ──────────────┤
│ [Card] [Card] [Card] [Card]                   │
├─ Tabs (border-b) ────────────────────────────┤
│ [Tab] [Tab] [Tab]                            │
├─ DataTable (w-full divide-y) ─────────────────┤
│ ┌─────────────────────────────────────────────┤
│ │ Code │ Name │ Rate │ Stock │ Actions │      │
│ ├─────────────────────────────────────────────┤
│ │ ... │ ... │ ... │ ... │ ... │              │
│ ├─────────────────────────────────────────────┤
│ │ N/A │ Product │ ₹30.00 │ 100 │ ... │       │
│ └─────────────────────────────────────────────┤
├─ Pagination ──────────────────────────────────┤
│ [Previous] Page 1 of 5 [Next]                │
└───────────────────────────────────────────────┘
```

**All using:**
- Font: **Inter** (Google Fonts)
- Framework: **Tailwind CSS** (utility-first)
- Colors: **Custom palette** (blue/slate/emerald)
- Effects: **Gradients, glassmorphism, animations**

---

## 📝 Configuration Files

### index.html (Current Configuration)
- Contains inline Tailwind CDN
- Contains inline color customization
- Contains inline animation definitions
- Contains inline scrollbar styling

### Tailwind Theme Extension

```javascript
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],  // ← Font definition
      },
      colors: {
        primary: '#2563eb',
        secondary: '#475569',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        metal: { /* ... */ }
      },
      backgroundImage: {
        'metallic-dark': '...',
        'metallic-blue': '...',
        'glass': '...'
      }
    }
  }
}
```

---

## 🎓 Quick Reference

### Add to Any New Component

```typescript
// Always start with these:
className="
  font-sans              // Use Inter font
  text-slate-900        // Use slate colors
  
  p-4 m-2               // Use Tailwind spacing
  rounded-lg            // Use Tailwind radii
  border border-slate-200  // Use Tailwind borders
  
  hover:bg-slate-50     // Use hover states
  transition-colors     // Use transitions
"
```

### Colors to Use

**Dark/Important:** `slate-900`, `slate-800`  
**Regular:</strong> `slate-700`, `slate-600`  
**Light/Muted:** `slate-500`, `slate-400`  
**Very Light:** `slate-100`, `slate-50`

**For status:** Use `success`, `warning`, `danger`, `primary`

---

## ✨ Bottom Line

| Aspect | What's Used |
|--------|------------|
| **Font Family** | Inter (Google Fonts) |
| **Font Weights** | 300, 400, 500, 600, 700, 800 |
| **CSS Framework** | Tailwind CSS (utility-first) |
| **Color System** | 5 primary + metal shades |
| **Spacing** | Tailwind default scale (4px units) |
| **Responsive** | Tailwind breakpoints (sm/md/lg/xl/2xl) |
| **Effects** | Gradients, bloomp filters, animations |
| **Scrollbar** | Custom styled (gradient, smooth) |
| **Icons** | Lucide React (24x24px) |

---

**Everything is built with Tailwind CSS utility classes and the Inter font from Google Fonts!**
