# Pillar Design System

A complete UI component library built for the SmartDispenser frontend, following the Pillar Design System principles — accessible, calm, and professional.

## Philosophy

Pillar is built for people with neurodivergency and disabilities. Every component prioritizes:

- **Accessibility**: WCAG AA contrast, 44px minimum touch targets, focus always visible
- **Calm aesthetics**: Warm canvas, soft shadows, generous spacing
- **Semantic clarity**: Color + icon + label (never color alone)
- **Neurodivergent-friendly**: Lexend for dyslexia, Atkinson Hyperlegible for numerals, reduced motion support
- **Plainspoken voice**: Clear prop names, no jargon

## Installation

Components are already integrated into this project. Import from `@/components/ui`:

```tsx
import { Button, Input, Card } from '@/components/ui';
```

## Components

### Button

Primary action component with multiple variants and states.

```tsx
import { Button } from '@/components/ui';

<Button variant="primary" leftIcon="ph-duotone ph-check">
  Log this dose
</Button>
```

**Variants**: `primary`, `secondary`, `ghost`, `danger`, `link`
**Sizes**: `small`, `default`, `large`
**States**: `loading`, `disabled`

### Input

Text input with label, error handling, and icon support.

```tsx
import { Input } from '@/components/ui';

<Input
  label="Medication name"
  icon="ph-duotone ph-pill"
  error="This field is required"
/>
```

**Features**: Label, helper text, error state, icons, number/email/password types

### Card

Container for grouped content with header, content, and footer sections.

```tsx
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui';

<Card variant="elevated">
  <CardHeader eyebrow="Up next" title="Metformin · 500 mg" />
  <CardContent>
    <p>Take 1 tablet with breakfast</p>
  </CardContent>
  <CardFooter>
    <Button>Log this dose</Button>
  </CardFooter>
</Card>
```

**Variants**: `default`, `elevated`, `interactive`

### Toast

Temporary notification system with context provider.

```tsx
import { ToastProvider, useToast } from '@/components/ui';

// Wrap your app with ToastProvider
<ToastProvider>
  <App />
</ToastProvider>

// Use in components
const toast = useToast();
toast.success("Dose logged successfully");
toast.warning("Medication due in 15 minutes");
```

**Variants**: `success`, `warning`, `danger`, `info`

### Alert

Inline messaging for important information.

```tsx
import { Alert } from '@/components/ui';

<Alert
  variant="warning"
  title="Dose due soon"
  description="Your 8:00 AM medication is in 25 minutes"
  action={<Button variant="link">View details</Button>}
/>
```

**Variants**: `success`, `warning`, `danger`, `info`

### Sidebar

Collapsible navigation sidebar.

```tsx
import { Sidebar } from '@/components/ui';

<Sidebar
  isOpen={isOpen}
  onToggle={() => setIsOpen(!isOpen)}
  navItems={[
    { id: 'home', label: 'Home', icon: 'ph-duotone ph-house', active: true },
    { id: 'schedule', label: 'Schedule', icon: 'ph-duotone ph-calendar' }
  ]}
/>
```

## Design Tokens

All components use CSS variables from `src/styles/design-tokens.css`:

### Colors

- `--primary`: Still Blue (#2B5F8A)
- `--success`: Green for "taken" states
- `--warning`: Ochre for attention
- `--danger`: Red for errors/missed doses
- `--canvas`: Warm off-white background (#F7F9FB)

### Typography

- **Base size**: 17px (not 16)
- **Font**: Lexend for text, Atkinson Hyperlegible for numerals
- **Line height**: 1.55 for body, 1.35 for headings

### Spacing

- 4px base grid, most UI snaps to 8px
- `--space-1` through `--space-11` (4px to 96px)
- `--target-min`: 44px minimum touch target

### Motion

- Durations: `--dur-fast` (120ms), `--dur` (200ms), `--dur-slow` (320ms)
- Easings: `--ease-out`, `--ease-in`, `--ease-spring`
- Respects `prefers-reduced-motion` (collapses all durations to 0ms)

## Icons

Uses [Phosphor Icons](https://phosphoricons.com/) duotone weight:

```tsx
<i className="ph-duotone ph-pill" />
<i className="ph-duotone ph-check-circle" />
```

**Common icons**: `ph-pill`, `ph-clock`, `ph-check-circle`, `ph-warning-octagon`, `ph-bell-ringing`

## Utilities

Helper functions in `src/lib/utils.ts`:

```tsx
import { cn, formatTime, formatDose } from '@/lib/utils';

cn("btn", isActive && "btn-active"); // Conditional classes
formatTime(new Date()); // "8:00 AM"
formatDose(500, "mg"); // "500 mg" (with non-breaking space)
```

## Storybook

View all components in Storybook:

```bash
npm run storybook
```

Visit [http://localhost:6006](http://localhost:6006) to explore components with interactive controls and accessibility tests.

## Accessibility

All components meet WCAG AA standards:

- ✅ 4.5:1 contrast for body text
- ✅ 44px minimum touch targets
- ✅ Double-ring focus indicators (always visible)
- ✅ Keyboard navigation support
- ✅ Screen reader friendly with proper ARIA labels
- ✅ Reduced motion support

## Contributing

When adding new components:

1. Follow Pillar Design System principles
2. Use design tokens (CSS variables) for all styling
3. Include TypeScript types
4. Write Storybook stories with accessibility checks
5. Test with keyboard navigation and screen readers
6. Document props and usage examples

## License

Part of the SmartDispenser project.
