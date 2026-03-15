# @zakkster/lite-smart-observer

[![npm version](https://img.shields.io/npm/v/@zakkster/lite-smart-observer.svg?style=for-the-badge&color=latest)](https://www.npmjs.com/package/@zakkster/lite-smart-observer)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@zakkster/lite-smart-observer?style=for-the-badge)](https://bundlephobia.com/result?p=@zakkster/lite-smart-observer)
[![npm downloads](https://img.shields.io/npm/dm/@zakkster/lite-smart-observer?style=for-the-badge&color=blue)](https://www.npmjs.com/package/@zakkster/lite-smart-observer)
[![npm total downloads](https://img.shields.io/npm/dt/@zakkster/lite-smart-observer?style=for-the-badge&color=blue)](https://www.npmjs.com/package/@zakkster/lite-smart-observer)
![TypeScript](https://img.shields.io/badge/TypeScript-Types-informational)
![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

Zero-dependency staggered scroll revelations using `IntersectionObserver` + `Web Animations API`.

**No JavaScript animation loops. No layout thrashing. No dependencies. Just CSS-level performance with JS-level control.**

## 🎬 Live Demo (SmartObserver)
https://codepen.io/Zahari-Shinikchiev/debug/OPRpJwm

## Why This Library?

| Library | Allocations | CPU Cost | Re-run Animations | Stagger Quality | Dependencies |
|---|---|---|---|---|---|
| **SmartObserver** | **0** | **Very Low** | **Yes** | **Perfect** | **None** |
| ScrollTrigger | Medium | Medium | Yes | Good | GSAP |
| Framer Motion | High | High | Yes | Good | React |
| AOS | High | Medium | No | Poor | None |

- **Zero JavaScript animation loops** — delegates entirely to the browser's compositor via Web Animations API
- **Observation-order staggering** — elements animate in the order they enter the viewport, not DOM order. Grids look choreographed.
- **GSAP-style easing presets** — `power2.out`, `back.out`, `expo.out` — no GSAP dependency
- **`willChange` lifecycle** — sets on observe, clears on finish. No leaked compositor layers.
- **Re-entry support** — set `once: false` for elements that re-animate on scroll back
- **Zero dependencies, < 2KB**

## Installation

```bash
npm install @zakkster/lite-smart-observer
```

## Quick Start

```javascript
import { SmartObserver } from '@zakkster/lite-smart-observer';

const observer = new SmartObserver({
    stagger: 0.08,
    duration: 0.6,
    ease: 'power2.out',
});

observer.observe('.card');  // CSS selector
// or
observer.observe(document.querySelectorAll('.card'));
```

## Options

```javascript
const observer = new SmartObserver({
    stagger: 0.1,         // Delay between elements in a batch (seconds)
    duration: 0.6,        // Animation duration (seconds)
    delay: 0,             // Initial delay (seconds)
    once: true,           // false = re-animate on scroll back
    threshold: 0.15,      // Intersection ratio to trigger
    rootMargin: '0px',    // Viewport margin (e.g. '50px 0px' to trigger early)
    mode: 'y',            // 'y', 'x', 'scale', 'fade', 'none', 'custom'
    ease: 'power2.out',   // Easing preset
    y: 40,                // Starting Y offset (pixels)
    x: 40,                // Starting X offset (pixels)
    scale: 0.8,           // Starting scale (for 'scale' mode)
    keyframes: null,      // Custom keyframes (for 'custom' mode)
    onEnter: (el) => {},  // Callback when element enters
    onLeave: (el) => {},  // Callback when element exits (once: false only)
});
```

## Animation Modes

```javascript
// Slide up (default)
new SmartObserver({ mode: 'y', y: 60 });

// Slide from right
new SmartObserver({ mode: 'x', x: 80 });

// Scale in
new SmartObserver({ mode: 'scale', scale: 0.5 });

// Fade only
new SmartObserver({ mode: 'fade' });

// Full custom keyframes
new SmartObserver({
    mode: 'custom',
    keyframes: [
        { opacity: 0, transform: 'rotate(-10deg) scale(0.8)' },
        { opacity: 1, transform: 'rotate(0) scale(1)' },
    ],
});
```

## Recipes

### Product Grid Reveal

```javascript
const grid = new SmartObserver({
    stagger: 0.06,
    duration: 0.5,
    mode: 'y',
    y: 30,
    ease: 'power3.out',
});
grid.observe('.product-card');
```

### Hero Section with Cascade

```javascript
const hero = new SmartObserver({
    stagger: 0.15,
    duration: 0.8,
    delay: 0.3,
    mode: 'y',
    y: 50,
    ease: 'expo.out',
});
hero.observe('.hero-title, .hero-subtitle, .hero-cta');
```

### Sidebar Navigation Slide-In

```javascript
const nav = new SmartObserver({
    mode: 'x',
    x: -40,
    stagger: 0.05,
    duration: 0.4,
    ease: 'power2.out',
});
nav.observe('.nav-item');
```

### Infinite Scroll with Re-Entry

```javascript
const feed = new SmartObserver({
    once: false,        // Re-animate when scrolling back
    mode: 'fade',
    duration: 0.3,
    threshold: 0.3,
    onEnter: (el) => el.classList.add('visible'),
    onLeave: (el) => el.classList.remove('visible'),
});
feed.observe('.feed-item');
```

### Lazy Image Reveal

```javascript
const images = new SmartObserver({
    mode: 'scale',
    scale: 0.9,
    duration: 0.5,
    ease: 'back.out',
    rootMargin: '100px 0px',  // Start loading 100px before viewport
    onEnter: (el) => {
        const img = el.querySelector('img[data-src]');
        if (img) img.src = img.dataset.src;
    },
});
images.observe('.image-container');
```

## Available Easings

| Key | CSS Value |
|-----|-----------|
| `linear` | `linear` |
| `ease` | `ease` |
| `power1.out` | `cubic-bezier(0.17, 0.84, 0.44, 1)` |
| `power2.out` | `cubic-bezier(0.25, 1, 0.5, 1)` |
| `power3.out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `power4.out` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `expo.out` | `cubic-bezier(0.19, 1, 0.22, 1)` |
| `back.out` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |

## TypeScript

```typescript
import { SmartObserver, EASINGS, type SmartObserverOptions } from '@zakkster/lite-smart-observer';
```

## License

MIT
