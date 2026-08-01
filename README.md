# RonoHub LR Mobile V2

Production-grade React Native mobile application for managing Lorry Receipts (LR), built with Expo and TypeScript.

## Features Implemented

### Authentication Flow
- **Onboarding**: 3-screen onboarding flow with smooth animations
  - Paperless Lorry Receipts
  - Connected Drivers & Operations
  - Track Every Delivery
- **Login**: OTP-based authentication with individual digit inputs
- **Persistent Session**: Auto-login on app restart

### Main Application
- **Dashboard**: Overview with stats cards and recent LRs list
- **LRs**: Manage all lorry receipts
- **Executives**: Team management
- **Reports**: Analytics and insights
- **Profile**: User profile with logout
- **Notifications**: In-app notifications

## Tech Stack

- **Framework**: Expo 52 + React Native
- **Navigation**: Expo Router (file-based routing)
- **Language**: TypeScript
- **State Management**: React Context (Auth)
- **Storage**: AsyncStorage
- **Animation**: React Native Reanimated
- **UI**: Custom components matching Figma design

## Project Structure

```
lr-mobile-v2/
├── app/
│   ├── (auth)/
│   │   ├── onboarding.tsx
│   │   └── login.tsx
│   ├── (tabs)/
│   │   ├── index.tsx (Dashboard)
│   │   ├── lrs.tsx
│   │   ├── executives.tsx
│   │   ├── reports.tsx
│   │   ├── profile.tsx
│   │   └── notifications.tsx
│   ├── _layout.tsx
│   └── index.tsx
├── lib/
│   ├── api.ts
│   ├── auth.tsx
│   └── onboarding.ts
├── types/
│   └── index.ts
├── constants/
│   └── theme.ts
└── assets/
    └── images/
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (Mac only) or Android Emulator

### Installation

```bash
cd lr-mobile-v2
npm install --legacy-peer-deps
```

### Running the App

```bash
# Start the development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on Web
npm run web
```

## Environment Variables

Create a `.env` file:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Design System

### Colors
- Primary: `#5B21B6` (Purple)
- Background: `#FFFFFF` (White)
- Text: `#1E1E1E` (Dark Gray)
- Success: `#10B981` (Green)
- Error: `#EF4444` (Red)

### Spacing
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

### Typography
- xs: 10px
- sm: 12px
- md: 14px
- lg: 16px
- xl: 18px
- xxl: 20px
- xxxl: 24px
- huge: 32px

## API Integration

The app connects to the backend API defined in `lib/api.ts`:

### Endpoints
- `/api/auth/send-otp` - Send OTP
- `/api/auth/verify-otp` - Verify OTP
- `/api/company/dashboard` - Get dashboard data
- `/api/lr` - LR CRUD operations
- `/api/executives` - Executive management
- `/api/notifications` - Get notifications

## Key Features

### Dashboard Screen
- Purple gradient header with user greeting
- 4 stat cards (Pending, Rejected, Approved, Delivered)
- Recent LRs list with status badges
- Search and filter functionality
- Pull to refresh

### Onboarding
- Show only once (stored in AsyncStorage)
- Skip functionality
- Smooth page transitions
- High-quality illustrations

### Login
- Individual OTP digit inputs with auto-focus
- Auto-submit when all digits entered
- Resend OTP with countdown timer
- Loading states

## Production Considerations

### Performance
- Lazy loading for heavy components
- Optimized list rendering with FlatList
- Image optimization
- Memoization where needed

### Security
- Secure token storage (AsyncStorage)
- API error handling
- Input validation
- Safe navigation guards

### Code Quality
- TypeScript for type safety
- Consistent code structure
- Reusable components
- Clean separation of concerns
- Proper error boundaries

## Testing

```bash
# Run type check
npx tsc --noEmit

# Run linter
npm run lint
```

## Building for Production

### iOS

```bash
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

## Deployment

The app uses Expo's EAS (Expo Application Services) for building and deployment:

1. Create an Expo account
2. Configure `eas.json`
3. Run builds with EAS CLI
4. Submit to App Store / Play Store

## Contributing

1. Create a feature branch
2. Make changes
3. Test on both iOS and Android
4. Submit PR with description

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact the development team.
