// @zakkster/lite-smart-observer types

export declare const EASINGS: Record<string, string>;

export interface SmartObserverOptions {
    stagger?: number;
    duration?: number;
    delay?: number;
    once?: boolean;
    threshold?: number;
    rootMargin?: string;
    mode?: 'y' | 'x' | 'scale' | 'fade' | 'scaleUp' | 'rotateIn' | 'flipX' | 'flipY' | 'zoomBlur' | 'none' | 'custom';
    ease?: string;
    y?: number;
    x?: number;
    scale?: number;
    rotation?: number;
    keyframes?: Keyframe[];
    onEnter?: (el: Element) => void;
    onLeave?: (el: Element) => void;
}

export declare class SmartObserver {
    constructor(options?: SmartObserverOptions);
    observe(selectorOrNodeList: string | NodeListOf<Element> | Element[] | Element): void;
    destroy(): void;
}

export default SmartObserver;
