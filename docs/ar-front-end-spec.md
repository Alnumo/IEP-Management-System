# UI/UX Specification: RTL Alignment Correction

## 1. Overview
This specification details the user experience and interface requirements for implementing Right-to-Left (RTL) language support, specifically for Arabic. The core principle is to mirror the interface horizontally to ensure a natural and intuitive experience for RTL users.

## 2. Global Layout and Directionality
* **Trigger:** When the application's language is set to Arabic.
* **Behavior:** The entire application layout must flip to a right-to-left orientation. The primary navigation (sidebar), which is on the left in the LTR (English) view, should move to the right side of the screen. The main content area will occupy the space to its left.
* **Technical Note:** This should be controlled by setting the `dir="rtl"` attribute on the root `<html>` element.

## 3. Component-Level Alignment

### 3.1. Text
* **Rule:** All text content, including headers, paragraphs, labels, and button text, must be right-aligned.
* **Example:** In a card component, the `CardHeader` title and `CardContent` text must align to the right.

### 3.2. Icons
* **Rule:** Icons that indicate directionality (e.g., back/forward arrows, chevrons for accordions/dropdowns) must be horizontally mirrored.
* **Example:** An icon like `>` should become `<` in RTL mode.

### 3.3. Forms and Inputs
* **Rule:** Labels for form fields should appear to the right of the input. Text entered into input fields should start from the right side.

### 3.4. Tables
* **Rule:** The column order in data tables should be reversed. The primary or first column in LTR should become the last column in RTL.

## 4. Visual Consistency
The visual design (colors, fonts, spacing, branding) must remain identical between the LTR and RTL versions. The changes are strictly related to the horizontal flow and alignment of elements.

## 5. Summary of Changes
* **English (LTR):** No changes. The layout remains as is.
* **Arabic (RTL):**
    * Sidebar moves to the right.
    * All text is right-aligned.
    * Directional icons are flipped.
    * The horizontal flow of all content is mirrored.

    # Frontend Architecture: RTL Language Support

## 1. Overview
This document outlines the technical implementation plan for adding Right-to-Left (RTL) language support to the frontend application. The goal is to create a maintainable and efficient solution that dynamically adjusts the UI's text direction based on the selected language without impacting the existing Left-to-Right (LTR) styles.

## 2. Technical Approach
The solution is divided into two core components:
1.  **Dynamic Direction Control:** We will use a React `useEffect` hook in the main `App.tsx` component to set the `dir` attribute on the `<html>` element.
2.  **Conditional CSS Styling:** We will add RTL-specific CSS rules to the global stylesheet (`src/index.css`). These rules will be scoped using the `[dir="rtl"]` attribute selector, ensuring they only apply when the Arabic language is active.

## 3. Implementation Details

### 3.1. File to Modify: `src/App.tsx`
**Objective:** Add a `useEffect` hook to dynamically set the `dir` attribute on the `<html>` tag based on the language context.

**Code to Add:**
```tsx
import { useEffect } from 'react';
import { useLanguage } from './hooks/useLanguage'; // Ensure this import path is correct

// ... other imports

function App() {
  const { language } = useLanguage();

  useEffect(() => {
    const html = document.documentElement;
    if (language === 'ar') {
      html.setAttribute('dir', 'rtl');
    } else {
      html.setAttribute('dir', 'ltr');
    }
  }, [language]);

  // ... rest of the component
  return (
    // ... JSX
  );
}

export default App;

3.2. File to Modify: src/index.css
Objective: Add new CSS rules to handle the layout and text alignment for RTL.

Code to Add (at the end of the file):

CSS

/*
============================================
== RIGHT-TO-LEFT (RTL) STYLES FOR ARABIC  ==
============================================
*/

/* 1. Global Text Alignment */
[dir="rtl"] body {
  text-align: right;
}

/* 2. Sidebar Layout & Alignment */
/* This rule will move the sidebar to the right side of the screen */
[dir="rtl"] .sidebar { /* Assuming a class 'sidebar' on your main aside element */
  left: auto;
  right: 0;
}

/* Adjust main content padding to account for the sidebar on the right */
[dir="rtl"] .main-content { /* Assuming a class on your main content wrapper */
  padding-left: 0;
  padding-right: 250px; /* Adjust this value to match your sidebar's width */
}

/* Ensure text within sidebar links is right-aligned */
[dir="rtl"] aside nav a div {
    text-align: right;
}

/* 3. Card Component Alignment */
[dir="rtl"] .card-header,
[dir="rtl"] .card-content,
[dir="rtl"] .card-footer {
    text-align: right;
}

/* 4. Generic Text Alignment Helper */
/* A utility to force right-alignment on shadcn/ui or other components if needed */
[dir="rtl"] [class*="text-"] {
    text-align: right !important;
}
4. Rationale
Centralized Control: Managing the direction in App.tsx provides a single source of truth for the entire application's layout direction.

CSS Specificity: Using [dir="rtl"] is a standard and robust way to apply conditional styles. It avoids cluttering component logic with style-related conditionals and is highly performant.

Non-Intrusive: This approach requires minimal changes to existing component files and adds new CSS rather than modifying existing rules, lowering the risk of regressions in the LTR layout.