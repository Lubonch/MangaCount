# CSS/SCSS Styling Guide for Angular Migration

## Overview
This document provides a comprehensive guide for migrating the CSS styling system from the React application to Angular with SCSS, including theme management, component styles, and responsive design patterns.

## Table of Contents
1. [Current CSS System Analysis](#current-css-system-analysis)
2. [SCSS Architecture for Angular](#scss-architecture-for-angular)
3. [Theme System Migration](#theme-system-migration)
4. [Component Styling Patterns](#component-styling-patterns)
5. [Global Styles](#global-styles)
6. [Responsive Design](#responsive-design)
7. [Animation and Transitions](#animation-and-transitions)

---

## Current CSS System Analysis

### Existing CSS Structure
```
mangacount.client/src/
??? App.css                    # Main app styles with CSS variables
??? index.css                  # Global styles
??? components/
    ??? AddEntryModal.css      # Modal styles
    ??? AddMangaModal.css      # Modal styles
    ??? AddProfileModal.css    # Modal styles
    ??? CollectionView.css     # Main collection display
    ??? LoadBearingCheck.css   # Infrastructure check styles
    ??? LoadingSpinner.css     # Loading animations
    ??? NukeDataModal.css      # Danger zone styles
    ??? ProfileSelector.css    # Profile selection styles
    ??? Sidebar.css            # Sidebar styles
    ??? ThemeToggle.css        # Theme switch styles
```

### Current CSS Variables System
The React app uses CSS custom properties for theming:

```css
/* Dark Theme (Default) */
:root[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --bg-tertiary: #404040;
  --text-primary: #e8e8e8;
  --text-secondary: #b8b8b8;
  --text-muted: #888888;
  --border-color: #404040;
  /* ... more variables */
}

/* Light Theme */
:root[data-theme="light"] {
  --bg-primary: #f5f5f5;
  --bg-secondary: #ffffff;
  --bg-tertiary: #fafafa;
  --text-primary: #2c3e50;
  /* ... more variables */
}
```

---

## SCSS Architecture for Angular

### Recommended SCSS Structure
```
src/
??? styles.scss                           # Global styles entry point
??? assets/
?   ??? styles/
?       ??? abstracts/
?       ?   ??? _variables.scss           # SCSS variables
?       ?   ??? _mixins.scss              # Reusable mixins
?       ?   ??? _functions.scss           # SCSS functions
?       ?   ??? _index.scss               # Export all abstracts
?       ??? base/
?       ?   ??? _reset.scss               # CSS reset/normalize
?       ?   ??? _typography.scss          # Font definitions
?       ?   ??? _base.scss                # Base element styles
?       ?   ??? _index.scss               # Export all base
?       ??? themes/
?       ?   ??? _theme-variables.scss     # Theme-specific variables
?       ?   ??? _dark-theme.scss          # Dark theme implementation
?       ?   ??? _light-theme.scss         # Light theme implementation
?       ?   ??? _index.scss               # Export all themes
?       ??? components/
?       ?   ??? _buttons.scss             # Button styles
?       ?   ??? _forms.scss               # Form styles
?       ?   ??? _modals.scss              # Modal styles
?       ?   ??? _cards.scss               # Card components
?       ?   ??? _tables.scss              # Table styles
?       ?   ??? _index.scss               # Export all components
?       ??? layout/
?       ?   ??? _grid.scss                # Grid system
?       ?   ??? _sidebar.scss             # Sidebar layout
?       ?   ??? _header.scss              # Header layout
?       ?   ??? _index.scss               # Export all layout
?       ??? utilities/
?           ??? _helpers.scss             # Helper classes
?           ??? _animations.scss          # Animation utilities
?           ??? _index.scss               # Export all utilities
??? app/
    ??? [component-folders]/
        ??? component.scss                # Component-specific styles
```

### Main SCSS Entry Point
```scss
// styles.scss
@import 'assets/styles/abstracts';
@import 'assets/styles/base';
@import 'assets/styles/themes';
@import 'assets/styles/layout';
@import 'assets/styles/components';
@import 'assets/styles/utilities';
```

---

## Theme System Migration

### SCSS Variables Definition
```scss
// assets/styles/abstracts/_variables.scss

// Base spacing and sizing
$spacing-xs: 0.25rem;
$spacing-sm: 0.5rem;
$spacing-md: 1rem;
$spacing-lg: 1.5rem;
$spacing-xl: 2rem;
$spacing-xxl: 3rem;

// Border radius
$border-radius-sm: 4px;
$border-radius-md: 6px;
$border-radius-lg: 8px;
$border-radius-xl: 12px;

// Shadows
$shadow-light: 0 2px 4px rgba(0, 0, 0, 0.1);
$shadow-medium: 0 4px 8px rgba(0, 0, 0, 0.15);
$shadow-heavy: 0 8px 16px rgba(0, 0, 0, 0.2);

// Transitions
$transition-fast: 0.15s ease-in-out;
$transition-normal: 0.3s ease-in-out;
$transition-slow: 0.5s ease-in-out;

// Breakpoints
$breakpoint-xs: 480px;
$breakpoint-sm: 768px;
$breakpoint-md: 992px;
$breakpoint-lg: 1200px;
$breakpoint-xl: 1400px;

// Z-index scale
$z-index-dropdown: 1000;
$z-index-modal: 1050;
$z-index-tooltip: 1100;
$z-index-fixed: 1030;
```

### Theme Variable Mapping
```scss
// assets/styles/themes/_theme-variables.scss

// Theme color maps
$dark-theme: (
  // Background colors
  bg-primary: #1a1a1a,
  bg-secondary: #2d2d2d,
  bg-tertiary: #404040,
  
  // Text colors
  text-primary: #e8e8e8,
  text-secondary: #b8b8b8,
  text-muted: #888888,
  
  // Border colors
  border-color: #404040,
  border-light: #505050,
  
  // Shadows
  shadow: rgba(0, 0, 0, 0.3),
  shadow-hover: rgba(0, 0, 0, 0.4),
  
  // Sidebar specific
  sidebar-bg: #1e1e1e,
  sidebar-text: #e8e8e8,
  sidebar-text-muted: #b8b8b8,
  sidebar-accent: #2a2a2a,
  sidebar-accent-hover: #353535,
  sidebar-border: #404040,
  
  // Status colors
  color-complete: #2ecc71,
  color-priority: #f1c40f,
  color-incomplete: #e74c3c,
  color-info: #3498db,
  
  // Status backgrounds
  bg-complete: rgba(46, 204, 113, 0.1),
  bg-priority: rgba(241, 196, 15, 0.1),
  bg-incomplete: rgba(231, 76, 60, 0.1),
  bg-pending: rgba(241, 196, 15, 0.15)
);

$light-theme: (
  // Background colors
  bg-primary: #f5f5f5,
  bg-secondary: #ffffff,
  bg-tertiary: #fafafa,
  
  // Text colors
  text-primary: #2c3e50,
  text-secondary: #7f8c8d,
  text-muted: #95a5a6,
  
  // Border colors
  border-color: #e5e5e5,
  border-light: #ecf0f1,
  
  // Shadows
  shadow: rgba(0, 0, 0, 0.1),
  shadow-hover: rgba(0, 0, 0, 0.15),
  
  // Sidebar specific (keep dark for contrast)
  sidebar-bg: #2c3e50,
  sidebar-text: #ecf0f1,
  sidebar-text-muted: #bdc3c7,
  sidebar-accent: #34495e,
  sidebar-accent-hover: #3e5266,
  sidebar-border: #34495e,
  
  // Status colors (same as dark)
  color-complete: #27ae60,
  color-priority: #f39c12,
  color-incomplete: #e74c3c,
  color-info: #3498db,
  
  // Status backgrounds
  bg-complete: #f8fff8,
  bg-priority: #fffef8,
  bg-incomplete: #fffafa,
  bg-pending: #fef9e7
);
```

### Theme Implementation Functions
```scss
// assets/styles/abstracts/_functions.scss

@use 'sass:map';
@use '../themes/theme-variables' as themes;

// Function to get theme value
@function theme($key, $theme-name: null) {
  $theme-map: null;
  
  @if $theme-name == 'light' {
    $theme-map: themes.$light-theme;
  } @else {
    $theme-map: themes.$dark-theme;
  }
  
  @if map.has-key($theme-map, $key) {
    @return map.get($theme-map, $key);
  } @else {
    @error 'Theme key `#{$key}` not found in theme map';
  }
}

// CSS custom property function
@function theme-var($key) {
  @return var(--#{$key});
}
```

### Theme Mixins
```scss
// assets/styles/abstracts/_mixins.scss

// Generate CSS custom properties for a theme
@mixin generate-theme-properties($theme-map, $theme-name) {
  [data-theme="#{$theme-name}"] {
    @each $key, $value in $theme-map {
      --#{$key}: #{$value};
    }
  }
}

// Apply theme properties to root
@mixin apply-themes() {
  :root {
    // Default to dark theme
    @each $key, $value in themes.$dark-theme {
      --#{$key}: #{$value};
    }
  }
  
  @include generate-theme-properties(themes.$light-theme, 'light');
  @include generate-theme-properties(themes.$dark-theme, 'dark');
}

// Responsive mixins
@mixin mobile-only {
  @media screen and (max-width: #{$breakpoint-sm - 1px}) {
    @content;
  }
}

@mixin tablet-up {
  @media screen and (min-width: #{$breakpoint-sm}) {
    @content;
  }
}

@mixin desktop-up {
  @media screen and (min-width: #{$breakpoint-md}) {
    @content;
  }
}

// Button style mixin
@mixin button-style($bg-color, $text-color: white, $hover-darken: 10%) {
  background-color: $bg-color;
  color: $text-color;
  border: none;
  border-radius: $border-radius-md;
  padding: $spacing-sm $spacing-md;
  cursor: pointer;
  transition: all $transition-normal;
  font-weight: 500;
  
  &:hover {
    background-color: darken($bg-color, $hover-darken);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
}

// Card style mixin
@mixin card-style($padding: $spacing-md) {
  background-color: theme-var('bg-secondary');
  border: 1px solid theme-var('border-color');
  border-radius: $border-radius-md;
  padding: $padding;
  box-shadow: $shadow-light;
  transition: all $transition-normal;
  
  &:hover {
    box-shadow: $shadow-medium;
    transform: translateY(-2px);
  }
}

// Loading animation
@mixin loading-pulse {
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
  
  animation: pulse 1.5s infinite;
}

// Scrollbar styling
@mixin custom-scrollbar($width: 6px, $track-color: transparent, $thumb-color: theme-var('border-color')) {
  &::-webkit-scrollbar {
    width: $width;
  }
  
  &::-webkit-scrollbar-track {
    background: $track-color;
  }
  
  &::-webkit-scrollbar-thumb {
    background: $thumb-color;
    border-radius: $width / 2;
    
    &:hover {
      background: darken($thumb-color, 10%);
    }
  }
}
```

---

## Component Styling Patterns

### Angular Component SCSS Structure
Each Angular component should follow this pattern:

```scss
// app/features/collection/components/sidebar/sidebar.component.scss
@use 'src/assets/styles/abstracts' as *;

.sidebar {
  width: 300px;
  background-color: theme-var('sidebar-bg');
  color: theme-var('sidebar-text');
  padding: $spacing-lg;
  overflow-y: auto;
  flex-shrink: 0;
  transition: background-color $transition-normal;
  border-right: 1px solid theme-var('sidebar-border');
  
  @include custom-scrollbar();
  
  @include mobile-only {
    width: 100%;
    position: fixed;
    top: 0;
    left: 0;
    z-index: $z-index-fixed;
  }
  
  &__header {
    margin-bottom: $spacing-xl;
    
    h2 {
      color: theme-var('sidebar-text');
      margin-bottom: $spacing-lg;
      text-align: center;
      border-bottom: 2px solid theme-var('sidebar-border');
      padding-bottom: $spacing-md;
    }
  }
  
  &__section {
    margin-bottom: $spacing-xl;
    
    h3 {
      color: theme-var('sidebar-text-muted');
      margin-bottom: $spacing-sm;
      font-size: 1.1em;
    }
  }
  
  &__quick-actions {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
    margin-bottom: $spacing-sm;
  }
  
  &__action-button {
    @include button-style(theme-var('color-complete'));
    
    &--add-entry {
      background-color: theme-var('color-complete');
      
      &:hover {
        background-color: #219a52;
      }
    }
    
    &--add-manga {
      background-color: #9b59b6;
      
      &:hover {
        background-color: #8e44ad;
      }
    }
  }
}
```

### Modal Component Pattern
```scss
// app/features/modals/add-entry-modal/add-entry-modal.component.scss
@use 'src/assets/styles/abstracts' as *;

.modal {
  &__overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: $z-index-modal;
    padding: $spacing-md;
  }
  
  &__content {
    @include card-style($spacing-lg);
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    
    @include mobile-only {
      max-width: 100%;
      max-height: 100%;
      margin: $spacing-sm;
    }
  }
  
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-lg;
    padding-bottom: $spacing-md;
    border-bottom: 1px solid theme-var('border-color');
    
    h2 {
      margin: 0;
      color: theme-var('text-primary');
    }
  }
  
  &__close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: theme-var('text-muted');
    padding: $spacing-xs;
    
    &:hover {
      color: theme-var('text-primary');
    }
  }
  
  &__actions {
    display: flex;
    gap: $spacing-md;
    justify-content: flex-end;
    margin-top: $spacing-lg;
    padding-top: $spacing-md;
    border-top: 1px solid theme-var('border-color');
    
    @include mobile-only {
      flex-direction: column;
    }
  }
  
  &__cancel-button {
    @include button-style(theme-var('bg-tertiary'), theme-var('text-primary'));
  }
  
  &__submit-button {
    @include button-style(theme-var('color-info'));
  }
}

.form {
  &__group {
    margin-bottom: $spacing-md;
  }
  
  &__label {
    display: block;
    margin-bottom: $spacing-xs;
    color: theme-var('text-primary');
    font-weight: 500;
  }
  
  &__input,
  &__select,
  &__textarea {
    width: 100%;
    padding: $spacing-sm;
    border: 1px solid theme-var('border-color');
    border-radius: $border-radius-sm;
    background-color: theme-var('bg-secondary');
    color: theme-var('text-primary');
    font-size: 1rem;
    transition: border-color $transition-fast;
    
    &:focus {
      outline: none;
      border-color: theme-var('color-info');
      box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }
    
    &:disabled {
      background-color: theme-var('bg-tertiary');
      color: theme-var('text-muted');
      cursor: not-allowed;
    }
  }
  
  &__error {
    color: theme-var('color-incomplete');
    font-size: 0.9rem;
    margin-top: $spacing-xs;
  }
  
  &__help {
    color: theme-var('text-muted');
    font-size: 0.85rem;
    margin-top: $spacing-xs;
  }
}
```

---

## Global Styles

### Base Styles
```scss
// assets/styles/base/_base.scss
@use '../abstracts' as *;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-size: 16px;
  
  @include mobile-only {
    font-size: 14px;
  }
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  line-height: 1.5;
  background-color: theme-var('bg-primary');
  color: theme-var('text-primary');
  transition: background-color $transition-normal, color $transition-normal;
  min-height: 100vh;
}

// Apply themes
@include apply-themes();
```

### Utility Classes
```scss
// assets/styles/utilities/_helpers.scss

// Spacing utilities
@for $i from 0 through 5 {
  .m-#{$i} { margin: #{$i * 0.5}rem !important; }
  .mt-#{$i} { margin-top: #{$i * 0.5}rem !important; }
  .mr-#{$i} { margin-right: #{$i * 0.5}rem !important; }
  .mb-#{$i} { margin-bottom: #{$i * 0.5}rem !important; }
  .ml-#{$i} { margin-left: #{$i * 0.5}rem !important; }
  
  .p-#{$i} { padding: #{$i * 0.5}rem !important; }
  .pt-#{$i} { padding-top: #{$i * 0.5}rem !important; }
  .pr-#{$i} { padding-right: #{$i * 0.5}rem !important; }
  .pb-#{$i} { padding-bottom: #{$i * 0.5}rem !important; }
  .pl-#{$i} { padding-left: #{$i * 0.5}rem !important; }
}

// Display utilities
.d-none { display: none !important; }
.d-block { display: block !important; }
.d-flex { display: flex !important; }
.d-grid { display: grid !important; }

// Flex utilities
.flex-column { flex-direction: column !important; }
.flex-row { flex-direction: row !important; }
.justify-center { justify-content: center !important; }
.justify-between { justify-content: space-between !important; }
.align-center { align-items: center !important; }
.flex-1 { flex: 1 !important; }

// Text utilities
.text-center { text-align: center !important; }
.text-left { text-align: left !important; }
.text-right { text-align: right !important; }

.text-muted { color: theme-var('text-muted') !important; }
.text-primary { color: theme-var('text-primary') !important; }
.text-secondary { color: theme-var('text-secondary') !important; }

// Status utilities
.status-complete { color: theme-var('color-complete') !important; }
.status-priority { color: theme-var('color-priority') !important; }
.status-incomplete { color: theme-var('color-incomplete') !important; }
.status-info { color: theme-var('color-info') !important; }

// Visibility utilities
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
```

---

## Responsive Design

### Grid System
```scss
// assets/styles/layout/_grid.scss
@use '../abstracts' as *;

.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 $spacing-md;
  
  @include tablet-up {
    padding: 0 $spacing-lg;
  }
  
  @include desktop-up {
    padding: 0 $spacing-xl;
  }
}

.row {
  display: flex;
  flex-wrap: wrap;
  margin: 0 (-$spacing-sm);
}

.col {
  flex: 1;
  padding: 0 $spacing-sm;
  
  @for $i from 1 through 12 {
    &-#{$i} {
      flex: 0 0 percentage($i / 12);
      max-width: percentage($i / 12);
    }
    
    @include tablet-up {
      &-md-#{$i} {
        flex: 0 0 percentage($i / 12);
        max-width: percentage($i / 12);
      }
    }
    
    @include desktop-up {
      &-lg-#{$i} {
        flex: 0 0 percentage($i / 12);
        max-width: percentage($i / 12);
      }
    }
  }
}
```

### Responsive Component Example
```scss
// Collection view responsive design
.collection-view {
  padding: $spacing-md;
  
  @include tablet-up {
    padding: $spacing-lg;
  }
  
  &__controls {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
    margin-bottom: $spacing-lg;
    
    @include tablet-up {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }
  
  &__filters {
    display: grid;
    grid-template-columns: 1fr;
    gap: $spacing-sm;
    
    @include mobile-only {
      grid-template-columns: 1fr;
    }
    
    @include tablet-up {
      grid-template-columns: repeat(3, 1fr);
    }
    
    @include desktop-up {
      grid-template-columns: repeat(4, 1fr);
    }
  }
  
  &__grid {
    display: grid;
    gap: $spacing-md;
    
    // Cards view
    &--cards {
      grid-template-columns: 1fr;
      
      @include tablet-up {
        grid-template-columns: repeat(2, 1fr);
      }
      
      @include desktop-up {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    
    // Compact view
    &--compact {
      grid-template-columns: 1fr;
      
      @include tablet-up {
        grid-template-columns: repeat(3, 1fr);
      }
      
      @include desktop-up {
        grid-template-columns: repeat(4, 1fr);
      }
    }
  }
}
```

---

## Animation and Transitions

### Animation Utilities
```scss
// assets/styles/utilities/_animations.scss

// Loading animations
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Animation classes
.animate-spin {
  animation: spin 1s linear infinite;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

.animate-slide-in-up {
  animation: slideInUp 0.3s ease-out;
}

.animate-slide-in-down {
  animation: slideInDown 0.3s ease-out;
}

// Hover effects
.hover-lift {
  transition: transform $transition-normal;
  
  &:hover {
    transform: translateY(-2px);
  }
}

.hover-scale {
  transition: transform $transition-normal;
  
  &:hover {
    transform: scale(1.05);
  }
}

// Loading skeleton
.skeleton {
  background: linear-gradient(90deg, 
    theme-var('bg-tertiary') 25%, 
    theme-var('bg-secondary') 50%, 
    theme-var('bg-tertiary') 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: $border-radius-sm;
  
  @keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
}
```

This comprehensive styling guide provides everything needed to migrate the CSS system from React to Angular with SCSS, maintaining the exact visual appearance while improving maintainability and scalability.