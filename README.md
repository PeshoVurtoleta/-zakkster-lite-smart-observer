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

## Live Demo
https://codepen.io/Zahari-Shinikchiev/debug/OPRpJwm

## Why This Library?

| Library | Allocations | CPU Cost | Re-run Animations | Stagger Quality | Dependencies |
|---|---|---|---|---|---|
| **SmartObserver** | **0** | **Very Low** | **Yes** | **Perfect** | **None** |
| ScrollTrigger | Medium | Medium | Yes | Good | GSAP |
| Framer Motion | High | High | Yes | Good | React |
| AOS | High | Medium | No | Poor | None |

- **Zero JavaScript animation loops** — delegates entirely to the browser's compositor via Web Animations API
- **Cross-frame stagger batching** — persistent counter bridges IntersectionObserver callbacks across layout frames, so fast-scrolling users see correctly sequenced reveals
- **10 animation modes** — from simple fades to 3D flips and blur effects, all hardware-accelerated
- **Safe WAAPI lifecycle** — `commitStyles()` + `cancel()` on finish bakes inline styles and releases the animation timeline, so CSS hover effects work after reveal
- **Just-in-time compositor promotion** — `willChange` is set right before animation, not on observe. No wasted GPU memory for off-screen elements
- **Clean re-entry** — `once: false` mode cancels animations and fully resets state on exit (no janky `reverse()`)
- **GSAP-style easing presets** — `power2.out`, `back.out`, `expo.out` — no GSAP dependency
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

observer.observe('.card');
```

## Options

```javascript
const observer = new SmartObserver({
    stagger: 0.1,                  // Delay between elements in a batch (seconds)
    duration: 0.6,                 // Animation duration (seconds)
    delay: 0,                      // Initial delay (seconds)
    once: true,                    // false = re-animate on scroll back
    threshold: 0.15,               // Intersection ratio to trigger
    rootMargin: '0px 0px -50px 0px', // Viewport margin
    mode: 'y',                     // Animation mode (see below)
    ease: 'power2.out',            // Easing preset
    y: 40,                         // Starting Y offset in px (y, scaleUp modes)
    x: 40,                         // Starting X offset in px (x mode)
    scale: 0.8,                    // Starting scale (scale, scaleUp, rotateIn, zoomBlur modes)
    rotation: 15,                  // Starting rotation in degrees (rotateIn mode)
    keyframes: null,               // Custom WAAPI keyframes (custom mode)
    onEnter: (el) => {},           // Callback when element enters viewport
    onLeave: (el) => {},           // Callback when element exits (once: false only)
});
```

## Animation Modes

### Basic Modes

```javascript
// Slide up (default)
new SmartObserver({ mode: 'y', y: 60 });

// Slide from side
new SmartObserver({ mode: 'x', x: 80 });

// Scale in
new SmartObserver({ mode: 'scale', scale: 0.5 });

// Fade only
new SmartObserver({ mode: 'fade' });
```

### Compound Modes (New in 1.1)

Five new modes that combine multiple CSS transforms in a single hardware-accelerated animation. Still zero JS per frame — pure WAAPI compositor.

```javascript
// Slide up + scale (great for cards and product grids)
new SmartObserver({ mode: 'scaleUp', y: 30, scale: 0.9 });

// Rotation + scale (playful, editorial layouts)
new SmartObserver({ mode: 'rotateIn', rotation: 12, scale: 0.85 });

// 3D flip on X axis (card reveals, notifications)
new SmartObserver({ mode: 'flipX' });

// 3D flip on Y axis (sidebar items, navigation)
new SmartObserver({ mode: 'flipY' });

// Zoom out + blur dissolve (hero images, galleries)
new SmartObserver({ mode: 'zoomBlur' });
```

### Custom Keyframes

```javascript
new SmartObserver({
    mode: 'custom',
    keyframes: [
        { opacity: 0, transform: 'rotate(-10deg) scale(0.8) translateY(20px)' },
        { opacity: 1, transform: 'rotate(0) scale(1) translateY(0)' },
    ],
});
```

### Per-Element Overrides via `data-*` Attributes

Mix animation modes and parameters within a single observer using `data-*` attributes:

```html
<div class="card" data-reveal-mode="flipX">Flips on X</div>
<div class="card" data-reveal-mode="scaleUp" data-reveal-y="60">Slides up 60px</div>
<div class="card" data-reveal-duration="1000">Slower reveal</div>
<div class="card" data-reveal-rotate="30" data-reveal-origin="top left">Custom origin</div>
```

```javascript
// One observer, mixed animations
const observer = new SmartObserver({ mode: 'y' });
observer.observe('.card');
```

Available data attributes: `data-reveal-mode`, `data-reveal-y`, `data-reveal-x`, `data-reveal-scale`, `data-reveal-rotate`, `data-reveal-duration`, `data-reveal-origin`.

## Mode Reference

| Mode | Transform | Properties Animated | Best For |
|---|---|---|---|
| `y` | `translate3d(0, Ypx, 0)` | opacity, transform | Cards, lists, grids |
| `x` | `translate3d(Xpx, 0, 0)` | opacity, transform | Sidebars, navigation |
| `scale` | `scale(S)` | opacity, transform | Thumbnails, avatars |
| `fade` | none | opacity | Subtle text reveals |
| `scaleUp` | `translate3d + scale` | opacity, transform | Product grids, dashboards |
| `rotateIn` | `rotate + scale` | opacity, transform | Editorial, playful layouts |
| `flipX` | `perspective + rotateX` | opacity, transform | Card reveals, notifications |
| `flipY` | `perspective + rotateY` | opacity, transform | Menu items, sidebar nav |
| `zoomBlur` | `scale + blur` | opacity, transform, filter | Hero images, galleries |
| `none` | — | — | Detection only (onEnter) |
| `custom` | user-defined | user-defined | Anything else |

## Recipes

### Product Grid with Scale+Slide

```javascript
const grid = new SmartObserver({
    mode: 'scaleUp',
    stagger: 0.06,
    duration: 0.5,
    y: 30,
    scale: 0.95,
    ease: 'power3.out',
});
grid.observe('.product-card');
```

### 3D Card Flip Gallery

```javascript
const gallery = new SmartObserver({
    mode: 'flipX',
    stagger: 0.08,
    duration: 0.7,
    ease: 'back.out',
});
gallery.observe('.gallery-card');
```

### Cinematic Hero Image

```javascript
const hero = new SmartObserver({
    mode: 'zoomBlur',
    duration: 1.0,
    ease: 'power2.out',
});
hero.observe('.hero-image');
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

### Playful Editorial Rotation

```javascript
const editorial = new SmartObserver({
    mode: 'rotateIn',
    rotation: 8,
    scale: 0.9,
    stagger: 0.1,
    duration: 0.6,
    ease: 'back.out',
});
editorial.observe('.article-card');
```

### Infinite Scroll with Re-Entry

```javascript
const feed = new SmartObserver({
    once: false,
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
    rootMargin: '100px 0px -50px 0px',
    onEnter: (el) => {
        const img = el.querySelector('img[data-src]');
        if (img) img.src = img.dataset.src;
    },
});
images.observe('.image-container');
```

### Choreographed Sequences (with @zakkster/lite-timeline)

For multi-step animations where elements need to sequence (first card scales in, THEN title fades, THEN badge slides), use SmartObserver for viewport detection and lite-timeline for sequencing:

```javascript
import { SmartObserver } from '@zakkster/lite-smart-observer';
import { createTimeline } from '@zakkster/lite-timeline';
import { lerp, easeOut } from '@zakkster/lite-lerp';

const reveal = new SmartObserver({
    mode: 'none', // Detection only — timeline handles the animation
    onEnter: (el) => {
        const tl = createTimeline();
        tl.add({ duration: 400, ease: easeOut, onUpdate: t => {
            el.style.transform = `scale(${lerp(0.8, 1, t)})`;
            el.style.opacity = t;
        }})
        .add({ duration: 300, onUpdate: t => {
            el.querySelector('.title').style.opacity = t;
        }}, '+=100')
        .play();
    },
});
reveal.observe('.card');
```

SmartObserver owns viewport detection + staggering. lite-timeline owns sequencing. Neither gets bloated.

## Available Easings

| Key | CSS Value | Character |
|-----|-----------|-----------|
| `linear` | `linear` | Constant speed |
| `ease` | `ease` | Browser default |
| `power1.out` | `cubic-bezier(0.17, 0.84, 0.44, 1)` | Gentle deceleration |
| `power2.out` | `cubic-bezier(0.25, 1, 0.5, 1)` | Smooth deceleration (default) |
| `power3.out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Strong deceleration |
| `power4.out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Very strong deceleration |
| `expo.out` | `cubic-bezier(0.19, 1, 0.22, 1)` | Dramatic deceleration |
| `back.out` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Slight overshoot |

## Architecture

SmartObserver solves three WAAPI traps that cause bugs in naive implementations:

**1. Cross-frame stagger batching.** IntersectionObserver may fire across multiple layout frames during fast scrolling (2 elements in frame 1, then 4 in frame 2). A naive `i` index resets to 0 per callback, breaking the stagger illusion. SmartObserver uses a persistent `_staggerCounter` with a timeout-based reset to bridge IO callbacks across frames.

**2. The `fill: "forwards"` trap.** Keeping a WAAPI animation alive with `fill: "forwards"` permanently overrides CSS specificity. CSS hover transforms won't work because the animation timeline is still asserting control. SmartObserver uses `commitStyles()` to bake the final state into inline styles, then `cancel()` to release the animation.

**3. Clean re-entry.** `anim.reverse()` on scroll-out causes snapping and desyncs during rapid scrolling. SmartObserver cancels the animation, nulls all inline styles, and resets `opacity: 0` for a clean slate.

## TypeScript

```typescript
import { SmartObserver, EASINGS } from '@zakkster/lite-smart-observer';
import type { SmartObserverOptions } from '@zakkster/lite-smart-observer';
```

Full type definitions included. The `mode` option is typed as a union of all 11 valid strings.

## Changelog

### 1.1.0

**New Features:**
- 5 compound animation modes: `scaleUp`, `rotateIn`, `flipX`, `flipY`, `zoomBlur`
- All compound modes are pure WAAPI — zero JS per frame, hardware-accelerated
- `rotation` option for `rotateIn` mode (default: 15°)
- `zoomBlur` scale respects custom `scale` option when > 1, falls back to 1.5 otherwise
- Per-element `data-*` attribute overrides: `data-reveal-mode`, `data-reveal-y`, `data-reveal-x`, `data-reveal-scale`, `data-reveal-rotate`, `data-reveal-duration`, `data-reveal-origin`
- `mode: 'none'` documented as detection-only pattern for custom animation logic

**Architecture:**
- Cross-frame stagger batching via persistent counter + timeout reset
- `commitStyles()` + `cancel()` on animation finish (fixes CSS hover specificity)
- Just-in-time `willChange` promotion (set on animate, not observe)
- Clean re-entry for `once: false` — cancel + full style reset, no `reverse()`
- `fill: "both"` prevents flash of unstyled content during stagger delay
- `destroy()` cancels live animations and cleans inline styles on all tracked elements
- Removed `elastic.out` easing (identical to `back.out` — CSS cannot express true elastic)

### 1.0.2

- Initial stable release
- 5 animation modes: y, x, scale, fade, custom
- GSAP-style easing presets
- Observation-order staggering
- `once: false` re-entry support

## License

MIT
