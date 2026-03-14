// ==== LiteSmartObserver.test.js ====
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock IntersectionObserver
let ioCallback;
globalThis.IntersectionObserver = vi.fn(function (cb, opts) {
    ioCallback = cb;
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
});

// Mock Element.animate
const mockAnim = { onfinish: null, cancel: vi.fn(), reverse: vi.fn() };
HTMLElement.prototype.animate = vi.fn(() => ({ ...mockAnim, onfinish: null, cancel: vi.fn(), reverse: vi.fn() }));

import { SmartObserver, EASINGS } from './SmartObserver.d.ts';

describe('👁️ SmartObserver', () => {
    let so;
    beforeEach(() => { vi.clearAllMocks(); });
    afterEach(() => { so?.destroy(); });

    it('creates IntersectionObserver with options', () => {
        so = new SmartObserver({ threshold: 0.5, rootMargin: '50px' });
        expect(IntersectionObserver).toHaveBeenCalledWith(expect.any(Function), { threshold: 0.5, rootMargin: '50px' });
    });

    it('observe() sets initial styles and starts observing', () => {
        so = new SmartObserver();
        const el = document.createElement('div');
        so.observe([el]);
        expect(el.style.opacity).toBe('0');
        expect(so._elements.has(el)).toBe(true);
    });

    it('builds y keyframes by default', () => {
        so = new SmartObserver({ y: 60 });
        expect(so._keyframes[0].transform).toContain('60px');
    });

    it('builds x keyframes', () => {
        so = new SmartObserver({ mode: 'x', x: 30 });
        expect(so._keyframes[0].transform).toContain('30px');
    });

    it('builds scale keyframes', () => {
        so = new SmartObserver({ mode: 'scale', scale: 0.5 });
        expect(so._keyframes[0].transform).toContain('scale(0.5)');
    });

    it('builds fade keyframes', () => {
        so = new SmartObserver({ mode: 'fade' });
        expect(so._keyframes[0].opacity).toBe(0);
        expect(so._keyframes[0].transform).toBeUndefined();
    });

    it('accepts custom keyframes', () => {
        const frames = [{ opacity: 0 }, { opacity: 1 }];
        so = new SmartObserver({ mode: 'custom', keyframes: frames });
        expect(so._keyframes).toBe(frames);
    });

    it('throws on custom mode without keyframes', () => {
        expect(() => new SmartObserver({ mode: 'custom' })).toThrow(/keyframes/);
    });

    it('warns on unknown easing', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        so = new SmartObserver({ ease: 'nonexistent' });
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('exports EASINGS map', () => {
        expect(EASINGS['power2.out']).toBeDefined();
        expect(EASINGS['back.out']).toBeDefined();
    });

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
});
