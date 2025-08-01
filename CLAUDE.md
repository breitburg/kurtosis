# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `bun run dev` - Start development server with hot reload
- `bun run build` - Build for production using Vite
- `bun run lint` - Run ESLint to check for code issues
- `bun run preview` - Preview production build locally

## Project Architecture

### Core Application Structure
This is a React + Vite application that interfaces with KU Leuven's KURT (reservation system) API to display study space availability. The app is client-side only and communicates directly with the KURT API.

### Key Components
- **MainPage** (`src/components/MainPage.jsx`) - Main application container handling state management, library selection, date selection, slot management, and user authentication
- **SeatTable** (`src/components/SeatTable.jsx`) - Displays seat availability in a grid format with time slots
- **SelectedSlotsPanel** (`src/components/SelectedSlotsPanel.jsx`) - Shows selected time slots and generates booking links
- **OnboardingScreen** (`src/components/OnboardingScreen.jsx`) - User authentication flow for R-number entry
- **Contributors** (`src/components/Contributors.jsx`) - Modal displaying project contributors from GitHub
- **LanguageSwitcher** (`src/components/LanguageSwitcher.jsx`) - Dynamic language selection dropdown with globe icon that automatically detects available languages from i18n resources

### Data Models
- **Slot** (`src/models/Slot.js`) - Represents a time slot for a specific seat/resource
- **SlotStatus** (`src/models/SlotStatus.js`) - Enumeration of slot states (AVAILABLE, BUSY, UNAVAILABLE)

### API Integration
- **KurtApi** (`src/services/KurtApi.js`) - Service class that interfaces with KU Leuven's KURT API
  - Fetches availability data for resources on specific dates
  - Generates booking links for the official KURT system
  - Base URL: `https://wsrt.ghum.kuleuven.be/service1.asmx`

### Data Configuration
- **studyspaces.json** (`public/studyspaces.json`) - Contains mapping of library buildings, study spaces, and their resource IDs
  - Each entry has `buildingName`, `spaceName`, `locationId`, `pid`, and `seats` (resource ID to seat name mapping)

### Internationalization (i18n)
- **react-i18next** for translation management with browser language detection
- **Supported Languages**: Dutch (default), English, French, German
- **Dynamic Language Support**: Languages automatically detected from i18n resources configuration
- **Translation Files**: `src/i18n/locales/[lang].json` - add new language files to automatically extend support
- **Language Display Names**: Each translation file must include `languageDisplayName` key with native language name
- **Automatic Detection**: LanguageSwitcher component dynamically populates from available translation files
- **Language Persistence**: User's language choice saved to localStorage as `selectedLanguage`
- **Localized Date Formatting**: Uses raw language IDs (e.g., 'en', 'nl', 'fr', 'de') for native date formatting
- **Configuration**: `src/i18n/i18n.js` handles language detection, imports, and resource mapping

#### Adding New Languages
1. Create translation file: `src/i18n/locales/[lang-code].json`
2. Include `languageDisplayName` key with native language name
3. Import and add to resources object in `src/i18n/i18n.js`
4. Language will automatically appear in switcher dropdown

### State Management
Uses React hooks for state management:
- R-number authentication (stored in localStorage)
- Library and date selection (library preference persisted)
- Language preference (stored in localStorage)
- Slot selection for booking multiple time ranges
- Responsive mobile drawer for booking links

### User Authentication
- Requires valid R-number, U-number, or B-number (KU Leuven student/staff ID)
- Format validation: single letter followed by 7 digits
- Credentials are stored locally and passed to KURT API for authentication

### Styling Architecture
- **Tailwind CSS v4** with `@apply` directives in `src/index.css`
- **No transitions or animations** - all UI changes are instant
- **Dark mode support** via CSS `prefers-color-scheme` and Tailwind `dark:` variants

### Deployment
- Uses Cloudflare Pages (wrangler.jsonc configuration)
- Static site deployment with assets served from `./dist/` directory

## Code Style Guidelines

### ESLint Configuration
- Uses modern ESLint flat config with React hooks and React refresh plugins
- Allows unused variables starting with uppercase (constants pattern)
- Ignores `dist` directory

### Styling Standards
- Use Tailwind CSS classes exclusively - no custom CSS except in `index.css`
- Use `@apply` directive for reusable styles in `index.css`
- No transitions or animations anywhere in the codebase
- Support both light and dark modes with `dark:` variants