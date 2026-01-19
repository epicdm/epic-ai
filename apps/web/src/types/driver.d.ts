declare module 'driver.js' {
  interface DriverOptions {
    animate?: boolean;
    opacity?: number;
    padding?: number;
    allowClose?: boolean;
    overlayClickNext?: boolean;
    doneBtnText?: string;
    closeBtnText?: string;
    nextBtnText?: string;
    prevBtnText?: string;
    onHighlightStarted?: (element: Element) => void;
    onHighlighted?: (element: Element) => void;
    onDeselected?: (element: Element) => void;
    onReset?: (element: Element) => void;
  }

  interface Driver {
    new (options?: DriverOptions): Driver;
    highlight(step: { element: string | Element, popover?: { title?: string, description?: string, position?: string } }): void;
    reset(): void;
    hasNextStep(): boolean;
    moveNext(): void;
    movePrevious(): void;
    isActivated(): boolean;
  }

  const driver: Driver;
  export default driver;
}
