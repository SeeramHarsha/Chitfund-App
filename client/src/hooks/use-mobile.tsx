import { useState, useEffect } from "react";

/**
 * A hook to detect if the current viewport is mobile sized
 * @param breakpoint The width to consider as mobile breakpoint (default: 768px)
 * @returns boolean indicating if the viewport is mobile size
 */
export function useMobileDetector(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Check initially
    setIsMobile(window.innerWidth < breakpoint);

    // Add resize listener
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener("resize", handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [breakpoint]);

  return isMobile;
}
