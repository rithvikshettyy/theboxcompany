import type { CSSProperties, JSX } from "react";

/** Types for the vendored React Bits FlexCarousel (FlexCarousel.jsx, kept as shipped). */
export type FlexCarouselItem = { src: string; alt?: string; title?: string; subtitle?: string };

export type FlexCarouselProps = {
  items?: readonly FlexCarouselItem[];
  preset?: "liquid" | "ribbon" | "vortex" | "arch";
  intro?: "rise" | "bloom" | "spin" | "deal" | "fade" | "none";
  /** Card height as a fraction of the container height. */
  cardHeight?: number;
  gap?: number;
  radius?: number;
  fit?: "natural" | "portrait" | "square" | "landscape";
  lensWidth?: number;
  lensHeight?: number;
  tilt?: number;
  roundness?: number;
  bend?: number;
  reach?: number;
  curl?: "twist" | "rise";
  dispersion?: number;
  liquid?: number;
  followCursor?: boolean;
  squeeze?: number;
  focusOnClick?: boolean;
  autoplay?: boolean;
  interval?: number;
  captions?: boolean;
  /** When false, vertical wheel scrolling passes through to the page. */
  captureWheel?: boolean;
  onChange?: (index: number, item: FlexCarouselItem) => void;
  onSelect?: (index: number, item: FlexCarouselItem) => void;
  className?: string;
  style?: CSSProperties;
};

declare function FlexCarousel(props: FlexCarouselProps): JSX.Element;
export default FlexCarousel;
