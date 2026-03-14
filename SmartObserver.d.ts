// lite-smart-observer types
export declare const EASINGS: Record<string, string>;

export interface SmartObserverOptions {
    stagger?: number;
    duration?: number;
    delay?: number;
    once?: boolean;
    threshold?: number;
    rootMargin?: string;
    mode?: 'y' | 'x' | 'scale' | 'fade' | 'none' | 'custom';
    ease?: string;
    y?: number;
    x?: number;
    scale?: number;
    keyframes?: Keyframe[];
    onEnter?: (el: Element) => void;
    onLeave?: (el: Element) => void;
}

export class SmartObserver {
    constructor(options?: SmartObserverOptions);
    observe(selectorOrNodeList: string | NodeListOf<Element> | Element[]): void;
    destroy(): void;
}

export default SmartObserver;
