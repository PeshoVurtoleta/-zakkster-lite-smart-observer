/**
 * @zakkster/lite-smart-observer — Zero-Dependency Staggered Scroll Revelations
 *
 * High-performance intersection observer for grid/list animations.
 * Uses native Web Animations API and observation-order staggering.
 *
 * Features:
 * - IntersectionObserver + Web Animations API (no JS animation loops)
 * - Observation-order staggering across layout frames
 * - 10 animation modes + GSAP-style easing presets
 * - Safe WAAPI lifecycle: commitStyles() + cancel() on finish
 * - Just-in-time willChange promotion (not on observe, on animate)
 * - Clean re-entry (once: false) — no reverse(), full state reset
 * - Zero dependencies
 */

export const EASINGS = {
    "linear":      "linear",
    "ease":        "ease",
    "power1.out":  "cubic-bezier(0.17, 0.84, 0.44, 1)",
    "power2.out":  "cubic-bezier(0.25, 1, 0.5, 1)",
    "power3.out":  "cubic-bezier(0.22, 1, 0.36, 1)",
    "power4.out":  "cubic-bezier(0.16, 1, 0.3, 1)",
    "expo.out":    "cubic-bezier(0.19, 1, 0.22, 1)",
    "back.out":    "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

export class SmartObserver {
    /**
     * @param {Object}   options
     * @param {number}   [options.stagger=0.1]             Delay between batched elements (seconds)
     * @param {number}   [options.duration=0.6]            Animation duration (seconds)
     * @param {number}   [options.delay=0]                 Initial delay (seconds)
     * @param {boolean}  [options.once=true]                If false, re-animates on scroll back
     * @param {number}   [options.threshold=0.15]           Intersection ratio to trigger
     * @param {string}   [options.rootMargin="0px 0px -50px 0px"] Viewport margin
     * @param {string}   [options.mode="y"]                 Animation mode
     * @param {string}   [options.ease="power2.out"]        Easing preset key
     * @param {number}   [options.y=40]                     Starting Y offset (pixels)
     * @param {number}   [options.x=40]                     Starting X offset (pixels)
     * @param {number}   [options.scale=0.8]                Starting scale
     * @param {number}   [options.rotation=15]              Starting rotation (degrees)
     * @param {Array}    [options.keyframes]                Custom WAAPI keyframes (mode: "custom")
     * @param {Function} [options.onEnter]                  Called when element enters viewport
     * @param {Function} [options.onLeave]                  Called when element exits viewport
     */
    constructor(options = {}) {
        this._stagger    = (options.stagger || 0.1) * 1000;
        this._duration   = (options.duration || 0.6) * 1000;
        this._delay      = (options.delay || 0) * 1000;
        this._once       = options.once !== undefined ? options.once : true;
        this._threshold  = options.threshold || 0.15;
        this._rootMargin = options.rootMargin || "0px 0px -50px 0px";

        this._mode         = options.mode || "y";
        this._customFrames = options.keyframes || null;
        this._y        = options.y || 40;
        this._x        = options.x || 40;
        this._scale    = options.scale !== undefined ? options.scale : 0.8;
        this._rotation = options.rotation !== undefined ? options.rotation : 15;

        this._onEnter = options.onEnter || null;
        this._onLeave = options.onLeave || null;

        if (options.ease && !EASINGS[options.ease]) {
            console.warn(`SmartObserver: Unknown easing "${options.ease}". Falling back to "power2.out".`);
        }
        this._ease = EASINGS[options.ease] || EASINGS["power2.out"];

        if (this._mode === "custom" && !Array.isArray(this._customFrames)) {
            throw new Error("SmartObserver: 'custom' mode requires a valid keyframes array.");
        }

        // Pre-compute default keyframes for speed
        this._defaultKeyframes = this._buildKeyframes(
            this._mode, this._y, this._x, this._scale, this._rotation
        );

        // Stagger state — persistent counter bridges IO callbacks across layout frames
        this._staggerCounter = 0;
        this._staggerTimer = null;

        this._elements = new Map();
        this._destroyed = false;

        this._observer = new IntersectionObserver(
            this._handleIntersect.bind(this),
            { threshold: this._threshold, rootMargin: this._rootMargin }
        );
    }

    /** @private Build WAAPI keyframes for a given mode + parameters. */
    _buildKeyframes(mode, y, x, scale, rot, transformOrigin = null) {
        if (mode === "custom" && this._customFrames) return this._customFrames;

        let frames;

        switch (mode) {
            case "fade":
            case "none":
                frames = [{ opacity: 0 }, { opacity: 1 }];
                break;

            case "scale":
                frames = [
                    { opacity: 0, transform: `scale(${scale})` },
                    { opacity: 1, transform: "scale(1)" },
                ];
                break;

            case "x":
                frames = [
                    { opacity: 0, transform: `translate3d(${x}px, 0, 0)` },
                    { opacity: 1, transform: "translate3d(0, 0, 0)" },
                ];
                break;

            case "scaleUp":
                frames = [
                    { opacity: 0, transform: `translate3d(0, ${y}px, 0) scale(${scale})` },
                    { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
                ];
                break;

            case "rotateIn":
                frames = [
                    { opacity: 0, transform: `rotate(${rot}deg) scale(${scale})` },
                    { opacity: 1, transform: "rotate(0deg) scale(1)" },
                ];
                break;

            case "flipX":
                frames = [
                    { opacity: 0, transform: "perspective(600px) rotateX(90deg)" },
                    { opacity: 1, transform: "perspective(600px) rotateX(0deg)" },
                ];
                break;

            case "flipY":
                frames = [
                    { opacity: 0, transform: "perspective(600px) rotateY(90deg)" },
                    { opacity: 1, transform: "perspective(600px) rotateY(0deg)" },
                ];
                break;

            case "zoomBlur":
                frames = [
                    { opacity: 0, transform: `scale(${scale > 1 ? scale : 1.5})`, filter: "blur(8px)" },
                    { opacity: 1, transform: "scale(1)", filter: "blur(0px)" },
                ];
                break;

            case "y":
            default:
                frames = [
                    { opacity: 0, transform: `translate3d(0, ${y}px, 0)` },
                    { opacity: 1, transform: "translate3d(0, 0, 0)" },
                ];
                break;
        }

        if (transformOrigin) frames[0].transformOrigin = transformOrigin;
        return frames;
    }

    /**
     * Start observing elements for intersection.
     * Accepts a CSS selector, NodeList, Array of elements, or a single element.
     * @param {string|NodeList|HTMLElement[]|HTMLElement} selectorOrNodeList
     */
    observe(selectorOrNodeList) {
        if (this._destroyed) return;

        const nodes = typeof selectorOrNodeList === "string"
            ? document.querySelectorAll(selectorOrNodeList)
            : (selectorOrNodeList.length !== undefined
                ? selectorOrNodeList
                : [selectorOrNodeList]);

        for (const el of nodes) {
            const mode = el.dataset.revealMode || this._mode;
            // Pre-hide elements that will be WAAPI animated.
            // willChange is set just-in-time in _handleIntersect, not here —
            // avoids wasting compositor memory on off-screen elements.
            if (mode !== "none") el.style.opacity = "0";
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

        // ── Entrances ──
        for (const entry of entered) {
            const el = entry.target;
            const mode = el.dataset.revealMode || this._mode;

            if (this._once) this._observer.unobserve(el);

            // Cancel any in-flight animation (re-entry after partial exit)
            const prev = this._elements.get(el);
            if (prev && prev !== "DONE") {
                prev.onfinish = null;
                prev.cancel();
            }

            const delay = this._delay + (this._staggerCounter * this._stagger);
            this._staggerCounter++;

            // Fire lifecycle callback respecting stagger delay
            if (this._onEnter) {
                setTimeout(() => this._onEnter(el), delay);
            }

            if (mode !== "none") {
                // Use cached default keyframes unless element has data-* overrides
                let keyframes = this._defaultKeyframes;
                const hasOverrides = el.dataset.revealY || el.dataset.revealX
                    || el.dataset.revealScale || el.dataset.revealRotate
                    || el.dataset.revealOrigin || el.dataset.revealMode;

                if (hasOverrides) {
                    keyframes = this._buildKeyframes(
                        mode,
                        Number(el.dataset.revealY ?? this._y),
                        Number(el.dataset.revealX ?? this._x),
                        Number(el.dataset.revealScale ?? this._scale),
                        Number(el.dataset.revealRotate ?? this._rotation),
                        el.dataset.revealOrigin || null,
                    );
                }

                const rawDur = el.dataset.revealDuration;
                const duration = rawDur !== undefined ? Number(rawDur) : this._duration;

                // Just-in-time compositor promotion
                el.style.willChange = mode === "zoomBlur"
                    ? "opacity, transform, filter"
                    : "opacity, transform";

                const anim = el.animate(keyframes, {
                    duration: Math.max(0, duration),
                    delay,
                    easing: this._ease,
                    fill: "both", // Applies start state during delay — prevents flash
                });

                this._elements.set(el, anim);

                anim.onfinish = () => {
                    // Guard: ignore if this animation was cancelled/replaced
                    if (this._elements.get(el) !== anim) return;

                    // Bake final state into inline styles, then kill the animation.
                    // This releases the WAAPI timeline so CSS hover transforms work.
                    try { anim.commitStyles(); } catch (e) { /* Safari edge case */ }
                    anim.cancel();
                    this._elements.set(el, "DONE");
                    el.style.willChange = "";
                };
            }
        }

        // Reset stagger counter after a gap between IO callback batches.
        // max(50, stagger*0.75) bridges rapid-fire layout frames while
        // resetting between distinct scroll gestures.
        if (entered.length > 0) {
            clearTimeout(this._staggerTimer);
            this._staggerTimer = setTimeout(() => {
                this._staggerCounter = 0;
            }, Math.max(50, this._stagger * 0.75));
        }

        // ── Exits (once: false only) ──
        if (!this._once) {
            for (const entry of exited) {
                const el = entry.target;
                const mode = el.dataset.revealMode || this._mode;

                if (this._onLeave) this._onLeave(el);

                if (mode !== "none") {
                    const anim = this._elements.get(el);
                    if (anim && anim !== "DONE") {
                        anim.onfinish = null;
                        anim.cancel();
                    }

                    this._elements.set(el, null);

                    // Full state reset — clean slate for next intersection
                    el.style.opacity = "0";
                    el.style.transform = "";
                    el.style.transformOrigin = "";
                    el.style.filter = "";
                    el.style.willChange = "";
                }
            }
        }
    }

    /**
     * Disconnect observer, cancel live animations, clean inline styles.
     * Idempotent.
     */
    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;

        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }

        clearTimeout(this._staggerTimer);

        // Cancel any in-flight animations and clean up inline styles
        for (const [el, anim] of this._elements) {
            if (anim && anim !== "DONE") {
                anim.onfinish = null;
                anim.cancel();
            }
            el.style.opacity = "";
            el.style.transform = "";
            el.style.filter = "";
            el.style.willChange = "";
        }

        this._elements.clear();
        this._onEnter = null;
        this._onLeave = null;
    }
}

export default SmartObserver;
