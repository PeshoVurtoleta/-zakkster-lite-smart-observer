/**
 * @zakkster/lite-smart-observer — Zero-Dependency Staggered Scroll Revelations
 *
 * High-performance intersection observer for grid/list animations.
 * Uses native Web Animations API and observation-order staggering.
 *
 * Features:
 * - IntersectionObserver + Web Animations API (no JS animation loops)
 * - Observation-order staggering (elements animate in the order they enter the viewport)
 * - Multiple animation modes: y, x, scale, fade, custom keyframes
 * - GSAP-style easing presets
 * - Optional re-entry animations (once: false)
 * - onEnter/onLeave lifecycle callbacks
 * - Zero dependencies, zero allocations per frame
 */

const DONE = Symbol('done');

const EASINGS = {
    "linear":      "linear",
    "ease":        "ease",
    "power1.out":  "cubic-bezier(0.17, 0.84, 0.44, 1)",
    "power2.out":  "cubic-bezier(0.25, 1, 0.5, 1)",
    "power3.out":  "cubic-bezier(0.22, 1, 0.36, 1)",
    "power4.out":  "cubic-bezier(0.16, 1, 0.3, 1)",
    "expo.out":    "cubic-bezier(0.19, 1, 0.22, 1)",
    "back.out":    "cubic-bezier(0.34, 1.56, 0.64, 1)",
    "elastic.out": "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

export { EASINGS };

export class SmartObserver {
    /**
     * @param {Object}   options
     * @param {number}   [options.stagger=0.1]     Delay between batched elements (seconds)
     * @param {number}   [options.duration=0.6]    Animation duration (seconds)
     * @param {number}   [options.delay=0]         Initial delay (seconds)
     * @param {boolean}  [options.once=true]       If false, re-animates on scroll back
     * @param {number}   [options.threshold=0.15]  Intersection ratio to trigger
     * @param {string}   [options.rootMargin="0px"] CSS margin around viewport
     * @param {string}   [options.mode="y"]        "y", "x", "scale", "fade", "none", "custom"
     * @param {string}   [options.ease="power2.out"] Easing preset key
     * @param {number}   [options.y=40]            Starting Y offset (pixels)
     * @param {number}   [options.x=40]            Starting X offset (pixels)
     * @param {number}   [options.scale=0.8]       Starting scale
     * @param {Array}    [options.keyframes]       Custom keyframes (mode: "custom")
     * @param {Function} [options.onEnter]         Called when element enters
     * @param {Function} [options.onLeave]         Called when element exits
     */
    constructor(options = {}) {
        this._stagger   = (options.stagger || 0.1) * 1000;
        this._duration  = (options.duration || 0.6) * 1000;
        this._delay     = (options.delay || 0) * 1000;
        this._once      = options.once !== undefined ? options.once : true;
        this._threshold = options.threshold || 0.15;
        this._rootMargin = options.rootMargin || "0px";

        this._mode         = options.mode || "y";
        this._customFrames = options.keyframes || null;
        this._y     = options.y || 40;
        this._x     = options.x || 40;
        this._scale = options.scale !== undefined ? options.scale : 0.8;

        this._onEnter = options.onEnter || null;
        this._onLeave = options.onLeave || null;

        if (options.ease && !EASINGS[options.ease]) {
            console.warn(`SmartObserver: Unknown easing "${options.ease}". Falling back to "power2.out".`);
        }
        this._ease = EASINGS[options.ease] || EASINGS["power2.out"];

        if (this._mode === "custom" && !Array.isArray(this._customFrames)) {
            throw new Error("SmartObserver: 'custom' mode requires a valid keyframes array.");
        }

        this._keyframes = this._buildKeyframes();
        this._startTransform = this._keyframes[0].transform || "none";

        this._elements = new Map();
        this._destroyed = false;

        this._observer = new IntersectionObserver(
            this._handleIntersect.bind(this),
            { threshold: this._threshold, rootMargin: this._rootMargin }
        );
    }

    /** @private */
    _buildKeyframes() {
        if (this._mode === "custom" && this._customFrames) return this._customFrames;

        switch (this._mode) {
            case "fade":
            case "none":
                return [{ opacity: 0 }, { opacity: 1 }];
            case "scale":
                return [
                    { opacity: 0, transform: `scale(${this._scale})` },
                    { opacity: 1, transform: "scale(1)" },
                ];
            case "x":
                return [
                    { opacity: 0, transform: `translate3d(${this._x}px, 0, 0)` },
                    { opacity: 1, transform: "translate3d(0, 0, 0)" },
                ];
            case "y":
            default:
                return [
                    { opacity: 0, transform: `translate3d(0, ${this._y}px, 0)` },
                    { opacity: 1, transform: "translate3d(0, 0, 0)" },
                ];
        }
    }

    /**
     * Start observing elements for intersection.
     * @param {string|NodeList|HTMLElement[]} selectorOrNodeList CSS selector or node list
     */
    observe(selectorOrNodeList) {
        if (this._destroyed) return;

        const nodes = typeof selectorOrNodeList === "string"
            ? document.querySelectorAll(selectorOrNodeList)
            : selectorOrNodeList;

        const willChangeVal = this._startTransform === "none" ? "opacity" : "opacity, transform";

        for (const el of nodes) {
            el.style.opacity = "0";
            if (this._startTransform !== "none") {
                el.style.transform = this._startTransform;
            }
            el.style.willChange = willChangeVal;

            this._elements.set(el, null);
            this._observer.observe(el);
        }
    }

    /** @private */
    _handleIntersect(entries) {
        if (this._destroyed) return;

        const entered = [];
        const exited = [];

        for (const e of entries) {
            if (e.isIntersecting) entered.push(e);
            else exited.push(e);
        }

        // ── Exits ──
        if (!this._once) {
            for (const entry of exited) {
                const el = entry.target;
                const anim = this._elements.get(el);

                if (anim && anim !== DONE) {
                    if (this._onLeave) this._onLeave(el);
                    try { anim.reverse(); } catch { anim.cancel(); }
                }
            }
        }

        // ── Entrances ──
        for (let i = 0; i < entered.length; i++) {
            const entry = entered[i];
            const el = entry.target;
            const state = this._elements.get(el);

            if (this._once && state === DONE) continue;
            if (this._once) this._observer.unobserve(el);

            if (state && state !== DONE) state.cancel();

            if (this._onEnter) this._onEnter(el);

            const delay = this._delay + i * this._stagger;

            const anim = el.animate(this._keyframes, {
                duration: this._duration,
                delay,
                easing: this._ease,
                fill: "forwards",
            });

            anim.onfinish = () => {
                // Clean up willChange to release compositor layer
                el.style.willChange = "auto";
                if (this._once) this._elements.set(el, DONE);
            };

            this._elements.set(el, anim);
        }
    }

    /**
     * Disconnect observer, cancel animations, release references.
     * Idempotent.
     */
    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;

        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }

        for (const [el, anim] of this._elements) {
            if (anim && anim !== DONE) anim.cancel();
            // Clean up inline styles
            el.style.willChange = "";
        }

        this._elements.clear();
        this._onEnter = null;
        this._onLeave = null;
    }
}

export default SmartObserver;
