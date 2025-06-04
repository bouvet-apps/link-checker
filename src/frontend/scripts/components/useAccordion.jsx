import { useState, useRef, useEffect } from "react";

const useAccordion = () => {
  const [expanded, setExpanded] = useState(false);

  const contentWrapperRef = useRef(null);
  const transitionRef = useRef(null);

  useEffect(() => {
    const selector = document.addEventListener("selectionchange", () => {
      if (contentWrapperRef?.current?.contains(document.getSelection().anchorNode)) {
        setExpanded(true);
      }
    });
    return () => {
      document.removeEventListener("selectionchange", selector);
    };
  }, []);

  useEffect(() => {
    const close = document.addEventListener("close-accordion", () => {
      setExpanded(false);
    });
    return () => {
      document.removeEventListener("close-accordion", close);
    };
  }, []);

  const height = contentWrapperRef.current ? `${contentWrapperRef.current.clientHeight}px` : "auto";
  useEffect(() => {
    if (transitionRef?.current) {
      if (expanded || transitionRef.current.style.height === "auto") transitionRef.current.style.height = height;
      if (!expanded) {
        setTimeout(() => {
          transitionRef.current.style.height = 0;
        }, 32);
      }
    }
  }, [expanded]);

  const handleHeightChange = (e) => {
    if (e.target === transitionRef?.current && expanded && e.target.style.height !== "0px") {
      e.target.style.height = "auto";
    }
  };

  useEffect(() => {
    let transitioner;
    if (transitionRef?.current) {
      transitioner = transitionRef.current?.addEventListener("transitionend", handleHeightChange);
    }
    return () => {
      if (transitioner) {
        document.removeEventListener("selectionchange", transitioner);
      }
    };
  }, [transitionRef?.current, expanded]);

  const closeAllAccordions = () => {
    document.dispatchEvent(new Event("close-accordion"));
  };

  return {
    expanded,
    setExpanded,
    contentWrapperRef,
    transitionRef,
    closeAllAccordions
  };
};

export default useAccordion;
