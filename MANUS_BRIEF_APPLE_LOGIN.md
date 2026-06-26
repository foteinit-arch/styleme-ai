# StyleMe AI - Apple Login Implementation Brief for Manus.ai

## Project Overview
- **App Name:** StyleMe AI (Base44 App)
- **Repository:** foteinit-arch/styleme-ai
- **Framework:** React + Vite
- **Platform:** Web application built with Base44 SDK
- **Status:** In development, actively being deployed

## Current Issue

### Problem Statement
Apple login/authentication is not working. The App Store is rejecting the app with a message stating:
- Apple login is not available/configured
- Requires Xcode configuration on a MacBook
- Developer is on Windows (Dell), cannot access Mac

### Business Constraint
- No Mac available for native Xcode setup
- Requires web-based solution or alternative approach

## Tech Stack Details

### Core Dependencies
- **Framework:** React 18.2.0 + Vite 6.1.0
- **Backend:** Base44 SDK (@base44/sdk ^0.8.34)
- **Build Tool:** @base44/vite-plugin ^1.0.23
- **UI Components:** Radix UI (full suite)
- **Forms:** React Hook Form + Zod validation
- **State Management:** TanStack React Query 5.84.1
- **Styling:** TailwindCSS 3.4.17

### Payment/Auth-Related
- Stripe integration present (@stripe/react-stripe-js, @stripe/stripe-js)
- React Router DOM for navigation
- Environment-based configuration (.env.local file)

## Project Structure
- Built on Base44 low-code platform
- GitHub-synced deployment (changes pushed to repo reflect in Base44 Builder)
- Environment variables: `VITE_BASE44_APP_ID`, `VITE_BASE44_APP_BASE_URL`
- Development setup: `npm install` → `npm run dev`
- Production: `npm run build`

## What Needs Fixing

### Apple Login Implementation Required
1. **Scope:** Apple Sign-In for web (not native iOS)
2. **Integration Points:** 
   - Authentication flow in the app
   - Provider configuration
   - Callback/redirect handling
   - Token validation
3. **Constraints:**
   - Must work without Xcode/Mac development
   - Must integrate with existing Stripe payment setup
   - Must respect Base44 platform constraints
   - Must work with current React/Vite stack

## Questions for Manus.ai
1. Can you implement Apple Sign-In for web (JavaScript/Web API approach)?
2. Should this be configured via Base44's native auth system or custom integration?
3. Are there App Store submission requirements beyond code that need addressing?
4. What Apple developer account configuration do we need on the web?

## Deliverables Expected
- Working Apple login flow
- Integration with existing auth/payment system
- Documentation of setup steps
- Ready for App Store submission
- Windows-compatible development workflow

---

**Last Updated:** 2026-06-26  
**Developer:** foteinit-arch  
**Primary Issue:** Apple authentication not working, requires web-based solution (Windows dev environment)
