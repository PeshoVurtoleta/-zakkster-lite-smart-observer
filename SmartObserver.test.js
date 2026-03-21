import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock IntersectionObserver ──
let ioCallback;
globalThis.IntersectionObserver = vi.fn(function (cb, opts) {
    ioCallback = cb;
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
});

// ── Mock Element.animate with commitStyles support ──
HTMLElement.prototype.animate = vi.fn(() => ({
    onfinish: null,
    cancel: vi.fn(),
    commitStyles: vi.fn(),
}));

import { SmartObserver, EASINGS } from './SmartObserver.js';

describe('SmartObserver', () => {
    let so;
    beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); });
    afterEach(() => { so?.destroy(); vi.useRealTimers(); });

    // ══════════════════════════════════════════
    // Constructor & Options
    // ══════════════════════════════════════════

    it('creates IntersectionObserver with options', () => {
        so = new SmartObserver({ threshold: 0.5, rootMargin: '50px' });
        expect(IntersectionObserver).toHaveBeenCalledWith(
            expect.any(Function),
            { threshold: 0.5, rootMargin: '50px' }
        );
    });

    it('uses default rootMargin with -50px bottom offset', () => {
        so = new SmartObserver();
        expect(IntersectionObserver).toHaveBeenCalledWith(
            expect.any(Function),
            expect.objectContaining({ rootMargin: '0px 0px -50px 0px' })
        );
    });

    it('converts seconds to milliseconds', () => {
        so = new SmartObserver({ stagger: 0.2, duration: 0.8, delay: 0.5 });
        expect(so._stagger).toBe(200);
        expect(so._duration).toBe(800);
        expect(so._delay).toBe(500);
    });

    it('defaults once to true', () => {
        so = new SmartObserver();
        expect(so._once).toBe(true);
    });

    it('accepts once: false', () => {
        so = new SmartObserver({ once: false });
        expect(so._once).toBe(false);
    });

    it('defaults rotation to 15', () => {
        so = new SmartObserver();
        expect(so._rotation).toBe(15);
    });

    // ══════════════════════════════════════════
    // Easing
    // ══════════════════════════════════════════

    it('exports EASINGS map with all presets', () => {
        expect(EASINGS['power2.out']).toBeDefined();
        expect(EASINGS['back.out']).toBeDefined();
        expect(EASINGS['expo.out']).toBeDefined();
    });

    it('does not include elastic.out', () => {
        expect(EASINGS['elastic.out']).toBeUndefined();
    });

    it('warns on unknown easing and falls back to power2.out', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        so = new SmartObserver({ ease: 'nonexistent' });
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('nonexistent'));
        expect(so._ease).toBe(EASINGS['power2.out']);
        spy.mockRestore();
    });

    // ══════════════════════════════════════════
    // Original Modes (keyframes)
    // ══════════════════════════════════════════

    it('builds y keyframes by default', () => {
        so = new SmartObserver({ y: 60 });
        expect(so._defaultKeyframes[0].transform).toContain('60px');
        expect(so._defaultKeyframes[1].transform).toBe('translate3d(0, 0, 0)');
    });

    it('builds x keyframes', () => {
        so = new SmartObserver({ mode: 'x', x: 30 });
        expect(so._defaultKeyframes[0].transform).toContain('30px');
    });

    it('builds scale keyframes', () => {
        so = new SmartObserver({ mode: 'scale', scale: 0.5 });
        expect(so._defaultKeyframes[0].transform).toContain('scale(0.5)');
    });

    it('builds fade keyframes (no transform)', () => {
        so = new SmartObserver({ mode: 'fade' });
        expect(so._defaultKeyframes[0].opacity).toBe(0);
        expect(so._defaultKeyframes[0].transform).toBeUndefined();
    });

    it('accepts custom keyframes', () => {
        const frames = [{ opacity: 0 }, { opacity: 1 }];
        so = new SmartObserver({ mode: 'custom', keyframes: frames });
        expect(so._defaultKeyframes).toBe(frames);
    });

    it('throws on custom mode without keyframes', () => {
        expect(() => new SmartObserver({ mode: 'custom' })).toThrow(/keyframes/);
    });

    // ══════════════════════════════════════════
    // Compound Modes
    // ══════════════════════════════════════════

    it('builds scaleUp keyframes (translate + scale)', () => {
        so = new SmartObserver({ mode: 'scaleUp', y: 50, scale: 0.9 });
        expect(so._defaultKeyframes[0].transform).toContain('50px');
        expect(so._defaultKeyframes[0].transform).toContain('scale(0.9)');
        expect(so._defaultKeyframes[1].transform).toContain('scale(1)');
    });

    it('builds rotateIn keyframes (rotate + scale)', () => {
        so = new SmartObserver({ mode: 'rotateIn', rotation: 20, scale: 0.85 });
        expect(so._defaultKeyframes[0].transform).toContain('rotate(20deg)');
        expect(so._defaultKeyframes[0].transform).toContain('scale(0.85)');
    });

    it('rotateIn uses default rotation=15', () => {
        so = new SmartObserver({ mode: 'rotateIn' });
        expect(so._defaultKeyframes[0].transform).toContain('rotate(15deg)');
    });

    it('builds flipX keyframes (perspective + rotateX)', () => {
        so = new SmartObserver({ mode: 'flipX' });
        expect(so._defaultKeyframes[0].transform).toContain('perspective(600px)');
        expect(so._defaultKeyframes[0].transform).toContain('rotateX(90deg)');
    });

    it('builds flipY keyframes (perspective + rotateY)', () => {
        so = new SmartObserver({ mode: 'flipY' });
        expect(so._defaultKeyframes[0].transform).toContain('rotateY(90deg)');
    });

    it('builds zoomBlur keyframes (scale + filter)', () => {
        so = new SmartObserver({ mode: 'zoomBlur' });
        expect(so._defaultKeyframes[0].filter).toContain('blur(8px)');
        expect(so._defaultKeyframes[1].filter).toContain('blur(0px)');
    });

    it('zoomBlur uses scale override when > 1', () => {
        so = new SmartObserver({ mode: 'zoomBlur', scale: 2.0 });
        expect(so._defaultKeyframes[0].transform).toContain('scale(2)');
    });

    it('zoomBlur falls back to 1.5 when scale <= 1', () => {
        so = new SmartObserver({ mode: 'zoomBlur', scale: 0.8 });
        expect(so._defaultKeyframes[0].transform).toContain('scale(1.5)');
    });

    // ══════════════════════════════════════════
    // Observe
    // ══════════════════════════════════════════

    it('observe() sets opacity:0 and tracks element', () => {
        so = new SmartObserver();
        const el = document.createElement('div');
        so.observe([el]);
        expect(el.style.opacity).toBe('0');
        expect(so._elements.has(el)).toBe(true);
    });

    it('observe() accepts CSS selector string', () => {
        so = new SmartObserver();
        const el = document.createElement('div');
        el.className = 'test-reveal';
        document.body.appendChild(el);
        so.observe('.test-reveal');
        expect(so._elements.has(el)).toBe(true);
        document.body.removeChild(el);
    });

    it('observe() accepts single element', () => {
        so = new SmartObserver();
        const el = document.createElement('div');
        so.observe(el);
        expect(so._elements.has(el)).toBe(true);
    });

    it('mode "none" does not set opacity:0', () => {
        so = new SmartObserver({ mode: 'none' });
        const el = document.createElement('div');
        so.observe([el]);
        expect(el.style.opacity).toBe('');
    });

    it('does not set willChange on observe (just-in-time promotion)', () => {
        so = new SmartObserver();
        const el = document.createElement('div');
        so.observe([el]);
        expect(el.style.willChange).toBe('');
    });

    // ══════════════════════════════════════════
    // Intersection Handling
    // ══════════════════════════════════════════

    it('calls onEnter (with stagger delay via setTimeout)', () => {
        const onEnter = vi.fn();
        so = new SmartObserver({ onEnter, delay: 0, stagger: 0.1 });
        const el = document.createElement('div');
        so.observe([el]);

        ioCallback([{ target: el, isIntersecting: true }]);
        vi.advanceTimersByTime(0); // First element delay = 0
        expect(onEnter).toHaveBeenCalledWith(el);
    });

    it('triggers WAAPI animate with fill:"both"', () => {
        so = new SmartObserver();
        const el = document.createElement('div');
        so.observe([el]);

        ioCallback([{ target: el, isIntersecting: true }]);
        expect(el.animate).toHaveBeenCalledWith(
            so._defaultKeyframes,
            expect.objectContaining({ fill: 'both', easing: so._ease })
        );
    });

    it('sets willChange just-in-time on animate', () => {
        so = new SmartObserver();
        const el = document.createElement('div');
        so.observe([el]);

        ioCallback([{ target: el, isIntersecting: true }]);
        expect(el.style.willChange).toBe('opacity, transform');
    });

    it('zoomBlur sets willChange with filter', () => {
        so = new SmartObserver({ mode: 'zoomBlur' });
        const el = document.createElement('div');
        so.observe([el]);

        ioCallback([{ target: el, isIntersecting: true }]);
        expect(el.style.willChange).toBe('opacity, transform, filter');
    });

    it('unobserves element after enter when once=true', () => {
        so = new SmartObserver({ once: true });
        const el = document.createElement('div');
        so.observe([el]);

        ioCallback([{ target: el, isIntersecting: true }]);
        expect(so._observer.unobserve).toHaveBeenCalledWith(el);
    });

    it('does not unobserve when once=false', () => {
        so = new SmartObserver({ once: false });
        const el = document.createElement('div');
        so.observe([el]);

        ioCallback([{ target: el, isIntersecting: true }]);
        expect(so._observer.unobserve).not.toHaveBeenCalled();
    });

    // ══════════════════════════════════════════
    // Stagger Batching
    // ══════════════════════════════════════════

    it('stagger counter persists across IO callback batches', () => {
        so = new SmartObserver({ stagger: 0.1, delay: 0 });
        const el1 = document.createElement('div');
        const el2 = document.createElement('div');
        const el3 = document.createElement('div');
        so.observe([el1, el2, el3]);

        // Frame 1: first 2 elements enter
        ioCallback([
            { target: el1, isIntersecting: true },
            { target: el2, isIntersecting: true },
        ]);
        // Counter is now 2

        // Frame 2 (< 50ms later): third element enters
        vi.advanceTimersByTime(10);
        ioCallback([{ target: el3, isIntersecting: true }]);

        // el3 should have been called with stagger index 2 (delay = 200ms)
        expect(el3.animate).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ delay: 200 })
        );
    });

    it('stagger counter resets after timeout', () => {
        so = new SmartObserver({ stagger: 0.1 });
        const el1 = document.createElement('div');
        const el2 = document.createElement('div');
        so.observe([el1, el2]);

        ioCallback([{ target: el1, isIntersecting: true }]);
        // Wait for reset
        vi.advanceTimersByTime(200);

        ioCallback([{ target: el2, isIntersecting: true }]);
        // el2 should start from stagger index 0
        expect(el2.animate).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ delay: 0 })
        );
    });

    // ══════════════════════════════════════════
    // commitStyles + cancel (fill trap)
    // ══════════════════════════════════════════

    it('commitStyles + cancel on animation finish', () => {
        so = new SmartObserver();
        const el = document.createElement('div');
        so.observe([el]);

        ioCallback([{ target: el, isIntersecting: true }]);
        const anim = el.animate.mock.results[0].value;

        // Simulate onfinish
        anim.onfinish();
        expect(anim.commitStyles).toHaveBeenCalled();
        expect(anim.cancel).toHaveBeenCalled();
        expect(so._elements.get(el)).toBe('DONE');
        expect(el.style.willChange).toBe('');
    });

    it('onfinish guard: ignores stale animation', () => {
        so = new SmartObserver();
        const el = document.createElement('div');
        so.observe([el]);

        ioCallback([{ target: el, isIntersecting: true }]);
        const anim = el.animate.mock.results[0].value;

        // Replace the animation (simulating re-entry)
        so._elements.set(el, 'replaced');

        // Stale onfinish should be ignored
        anim.onfinish();
        expect(anim.commitStyles).not.toHaveBeenCalled();
    });

    // ══════════════════════════════════════════
    // Re-entry (once: false)
    // ══════════════════════════════════════════

    it('exit resets element state when once=false', () => {
        so = new SmartObserver({ once: false });
        const el = document.createElement('div');
        so.observe([el]);

        // Enter
        ioCallback([{ target: el, isIntersecting: true }]);
        const anim = el.animate.mock.results[0].value;

        // Exit
        ioCallback([{ target: el, isIntersecting: false }]);
        expect(anim.cancel).toHaveBeenCalled();
        expect(el.style.opacity).toBe('0');
        expect(el.style.transform).toBe('');
        expect(el.style.willChange).toBe('');
        expect(so._elements.get(el)).toBeNull();
    });

    it('exit calls onLeave callback', () => {
        const onLeave = vi.fn();
        so = new SmartObserver({ once: false, onLeave });
        const el = document.createElement('div');
        so.observe([el]);

        ioCallback([{ target: el, isIntersecting: true }]);
        ioCallback([{ target: el, isIntersecting: false }]);
        expect(onLeave).toHaveBeenCalledWith(el);
    });

    // ══════════════════════════════════════════
    // data-* Overrides
    // ══════════════════════════════════════════

    it('uses data-reveal-mode override per element', () => {
        so = new SmartObserver({ mode: 'y' });
        const el = document.createElement('div');
        el.dataset.revealMode = 'flipX';
        so.observe([el]);

        ioCallback([{ target: el, isIntersecting: true }]);
        const call = el.animate.mock.calls[0];
        expect(call[0][0].transform).toContain('perspective');
    });

    // ══════════════════════════════════════════
    // Destroy
    // ══════════════════════════════════════════

    it('destroy is idempotent', () => {
        so = new SmartObserver();
        so.destroy();
        expect(() => so.destroy()).not.toThrow();
    });

    it('observe is no-op after destroy', () => {
        so = new SmartObserver();
        so.destroy();
        const el = document.createElement('div');
        so.observe([el]);
        expect(so._elements.size).toBe(0);
    });

    it('destroy cancels live animations', () => {
        so = new SmartObserver();
        const el = document.createElement('div');
        so.observe([el]);

        ioCallback([{ target: el, isIntersecting: true }]);
        const anim = el.animate.mock.results[0].value;

        so.destroy();
        expect(anim.cancel).toHaveBeenCalled();
    });

    it('destroy clears inline styles on all tracked elements', () => {
        so = new SmartObserver();
        const el = document.createElement('div');
        so.observe([el]);

        so.destroy();
        expect(el.style.opacity).toBe('');
        expect(el.style.willChange).toBe('');
    });
});
