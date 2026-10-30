# MediBuddy Telemedicine Platform - MVP Implementation Plan

## Core Files to Create/Modify (8 files max)

### 1. **src/App.tsx** (Modified)
- Main routing for all 4 portals
- Role-based authentication wrapper
- Language context provider

### 2. **src/pages/AuthPage.tsx** (New)
- Unified login/signup page
- Role selection (Admin/Doctor/Patient/Seller)
- Mobile OTP + Aadhar validation
- Language selection

### 3. **src/pages/PatientPortal.tsx** (New)
- AI Symptom Checker with different recommendations
- Voice assistant integration
- Appointment booking system
- Digital health records viewer
- Medicine availability checker
- Government schemes section
- Emergency booking (ambulance/rickshaw)

### 4. **src/pages/DoctorPortal.tsx** (New)
- Appointment management dashboard
- Patient history viewer
- Video consultation interface
- Digital prescription system

### 5. **src/pages/AdminPortal.tsx** (New)
- Real-time health analytics dashboard
- Village-wise disease tracking
- Resource monitoring
- Report generation (PDF/Excel)

### 6. **src/pages/SellerPortal.tsx** (New)
- Medicine stock management
- Inventory tracking (default 15,000)
- Sales ledger
- Stock reports

### 7. **src/lib/utils.ts** (Modified)
- Text-to-speech functionality
- Language translation utilities
- Data storage helpers
- AI symptom analysis logic

### 8. **index.html** (Modified)
- Update title to "MediBuddy"
- Add meta tags for healthcare app

## Key Features Implementation Priority

1. **Authentication System** - Role-based login with Aadhar validation
2. **Patient Portal** - AI symptom checker with varied responses
3. **Appointment Booking** - Fix non-working booking system
4. **Medicine Management** - Fix seller portal stock updates
5. **Text-to-Speech** - Audio playback for all content
6. **Multilingual Support** - English/Hindi/Punjabi switching
7. **Government Schemes** - Working eligibility checker
8. **Emergency Services** - Ambulance/rickshaw booking

## Design Guidelines
- Color coding: Patient (Green), Doctor (Blue), Admin (Orange), Seller (Purple)
- Icon-driven interface for accessibility
- Mobile-first responsive design
- High contrast mode support
- Dashboard-first layouts

## Technical Stack
- React + TypeScript
- Shadcn-UI components
- Tailwind CSS for styling
- Local storage for offline data
- Web Speech API for voice features