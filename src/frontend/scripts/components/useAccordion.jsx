import { useState, useRef, useEffect } from "react";

const useAccordion = () => {
  const [expanded, setExpanded] = useState(false);

  const contentWrapperRef = useRef(null);
  const transitionRef = useRef(null);

  useEffect(() => {
    const selector = () => {
      if (contentWrapperRef?.current?.contains(document.getSelection().anchorNode)) {
        setExpanded(true);
      }
    };
    document.addEventListener("selectionchange", selector);
    return () => {
      document.removeEventListener("selectionchange", selector);
    };
  }, []);

  useEffect(() => {
    const close = () => {
      setExpanded(false);
    };
    document.addEventListener("close-accordion", close);
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
    const el = transitionRef?.current;
    if (el) el.addEventListener("transitionend", handleHeightChange);
    return () => {
      if (el) el.removeEventListener("transitionend", handleHeightChange);
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
