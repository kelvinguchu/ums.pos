import { useCallback, useEffect, useRef, useState } from "react";

interface UseScrollContainerResult {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  showScrollTop: boolean;
  scrollToTop: () => void;
  preserveScrollPosition: (action: () => void) => void;
}

export function useScrollContainer(
  threshold: number = 200
): UseScrollContainerResult {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      setShowScrollTop(container.scrollTop > threshold);
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [threshold]);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const preserveScrollPosition = useCallback((action: () => void) => {
    const currentScroll = scrollRef.current?.scrollTop ?? 0;
    action();
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = currentScroll;
      }
    });
  }, []);

  return { scrollRef, showScrollTop, scrollToTop, preserveScrollPosition };
}
