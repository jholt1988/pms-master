# Property Management Suite - Tenant Portal App

**Version:** 0.1.0  
**Design System:** Digital Twin OS (Dark, Glassmorphic)

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm start
```

App runs on `http://localhost:3000`  
Backend proxy configured to `http://localhost:3001`

### Build

```bash
npm run build
```

### Testing

```bash
npm test
```

---

## Design System: Digital Twin OS

### Overview

The application uses a futuristic "Digital Twin OS" design system with:
- **Dark mode only** - Deep space backgrounds (#030712 → #0f172a)
- **Glassmorphic surfaces** - Transparent cards with backdrop blur
- **Neon accents** - Blue (#00f0ff), Purple (#7000ff), Pink (#ff0099)
- **Monospace data** - All numbers and codes use monospace font
- **OS-like navigation** - Floating dock (bottom) + HUD topbar

### Key Components

#### GlassCard
Reusable glassmorphic card wrapper:
```tsx
<GlassCard glowColor="blue" title="Title" subtitle="Subtitle">
  Content
</GlassCard>
```

#### DockNavigation
macOS-style floating dock with 6 core actions:
- Dashboard
- Maintenance
- Payments
- Messages
- Leases
- Properties

#### Topbar
HUD-style topbar with:
- Brand logo (PMS.OS)
- Quick search
- AI Orb (centered)
- User profile
- Notifications

### Tailwind Theme Tokens

#### Colors
```typescript
deep-900: "#030712"  // Main background
deep-800: "#0f172a"  // Secondary background
neon-blue: "#00f0ff"  // Primary actions
neon-purple: "#7000ff" // AI/Intelligence
neon-pink: "#ff0099"  // Alerts/Critical
glass-surface: "rgba(255,255,255,0.05)"
glass-border: "rgba(255,255,255,0.1)"
```

#### Typography
```typescript
font-sans: ['Exo 2', 'Montserrat']  // Headers
font-mono: ['JetBrains Mono']        // Data/numbers
```

#### Utilities
- `bg-grid-pattern` - Subtle grid overlay
- `bg-deep-space` - Animated gradient
- `backdrop-blur-xl` - Glass effect
- `no-scrollbar` - Hide scrollbars

---

## Mock Services

### Development Mode

The app includes mock services for offline development:

#### Stripe Mock
```typescript
import { stripeMock } from './mocks/stripeMock';

if (stripeMock.isMock()) {
  const intent = await stripeMock.createPaymentIntent(1000);
}
```

#### API Fixtures
```typescript
import { getMockMaintenanceRequests, shouldUseMockData } from './mocks/apiFixtures';

if (shouldUseMockData()) {
  const requests = await getMockMaintenanceRequests();
}
```

### Environment Variables

```bash
# Force mock mode
VITE_USE_MOCK_DATA=true
VITE_USE_STRIPE_MOCK=true

# API Configuration
VITE_API_URL=http://localhost:3001

# Stripe (production)
VITE_STRIPE_PUBLISHABLE_KEY=pk_...
```

### Mock Mode Banner

When running in mock mode, a yellow banner appears at the top indicating simulated services are active.

---

## Project Structure

```
src/
├── components/ui/       # UI components (GlassCard, Dock, Topbar, etc.)
├── domains/             # Domain-driven structure
│   ├── tenant/          # Tenant features
│   ├── property-manager/# PM features
│   └── shared/          # Shared features
├── mocks/               # Mock services for dev
├── pages/               # Page components
├── services/            # API client, services
└── hooks/               # Custom React hooks
```

---

## Key Features

### Tenant Features
- Dashboard
- View Lease
- Submit Maintenance Requests
- Make Payments
- View Payment History
- Setup Autopay
- Messaging
- Inspections

### Property Manager Features
- Dashboard (Bento Grid)
- Property Management
- Lease Management
- Maintenance Management
- Rental Applications
- Payment Processing
- Expense Tracking
- Rent Optimization (AI)
- Document Management
- Reporting

---

## API Integration

### API Client

Use the centralized API client:

```typescript
import { apiFetch } from './services/apiClient';

const data = await apiFetch('/maintenance', { 
  token, 
  method: 'GET' 
});
```

### Error Handling

All API calls should include error handling:

```typescript
try {
  const data = await apiFetch('/endpoint', { token });
} catch (error) {
  // Handle error with user-friendly message
  console.error('API Error:', error);
}
```

---

## Testing

### Running Tests

```bash
npm test
```

### Test Structure

- Unit tests: `*.test.tsx` alongside components
- Integration tests: `pages/*.test.tsx`
- Mock services: `mocks/*.ts`

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });
});
```

---

## Styling Guidelines

### Component Styling

1. **Use GlassCard wrapper** for all cards
2. **Monospace for data** - All numbers, IDs, codes
3. **Uppercase labels** - `text-[10px] uppercase tracking-wider`
4. **Neon accents** - Use sparingly for emphasis
5. **Hover effects** - Subtle glow and border changes

### Typography Hierarchy

- **Page Headers:** `text-3xl font-sans font-light`
- **Section Headers:** `text-lg font-sans font-light`
- **Data Values:** `font-mono text-lg` or larger
- **Labels:** `text-[10px] uppercase tracking-wider font-mono`
- **Body Text:** `text-sm font-sans`

### Color Usage

- **Primary Actions:** `text-neon-blue`
- **AI/Intelligence:** `text-neon-purple`
- **Alerts/Critical:** `text-neon-pink`
- **Secondary Text:** `text-gray-400`
- **Muted Text:** `text-gray-500`

---

## Development Workflow

### Adding New Features

1. Create component in appropriate domain folder
2. Use GlassCard for card components
3. Follow Digital Twin OS styling guidelines
4. Add mock data if needed
5. Write tests
6. Update documentation

### Code Style

- TypeScript strict mode (target)
- Functional components with hooks
- Tailwind CSS for styling
- Lucide React for icons
- Consistent naming: PascalCase for components

---

## Troubleshooting

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### API Connection Issues

- Check backend is running on port 3001
- Verify `VITE_API_URL` in `.env`
- Use mock mode for offline development

### Styling Issues

- Ensure Tailwind config is loaded
- Check for conflicting CSS
- Verify class names are correct

---

## Contributing

### Before Committing

1. Run tests: `npm test`
2. Check build: `npm run build`
3. Verify no console errors
4. Follow Digital Twin OS design guidelines

### PR Checklist

- [ ] Tests pass
- [ ] Build succeeds
- [ ] No console errors
- [ ] Follows design system
- [ ] Documentation updated

---

## License

ISC

---

**Last Updated:** January 2025  
**Design System:** Digital Twin OS v1.0

