import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Portal from './Portal';

const Tooltip = ({ children, content, position = 'top', delay = 0.2 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const timeoutRef = useRef(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      updatePosition();
      setIsVisible(true);
    }, delay * 1000);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let top = 0;
    let left = 0;

    // Add scroll offset
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    switch (position) {
      case 'top':
        top = rect.top + scrollY - 8;
        left = rect.left + scrollX + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + scrollY + 8;
        left = rect.left + scrollX + rect.width / 2;
        break;
      case 'left':
        top = rect.top + scrollY + rect.height / 2;
        left = rect.left + scrollX - 8;
        break;
      case 'right':
        top = rect.top + scrollY + rect.height / 2;
        left = rect.right + scrollX + 8;
        break;
      default:
        break;
    }

    setCoords({ top, left });
  };

  useEffect(() => {
    if (isVisible) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible]);

  const getInitialAnimation = () => {
    switch (position) {
      case 'top': return { opacity: 0, y: 5, scale: 0.95 };
      case 'bottom': return { opacity: 0, y: -5, scale: 0.95 };
      case 'left': return { opacity: 0, x: 5, scale: 0.95 };
      case 'right': return { opacity: 0, x: -5, scale: 0.95 };
      default: return { opacity: 0, scale: 0.95 };
    }
  };

  const getTransformOrigin = () => {
    switch (position) {
      case 'top': return 'bottom center';
      case 'bottom': return 'top center';
      case 'left': return 'center right';
      case 'right': return 'center left';
      default: return 'center center';
    }
  };

  const transformStyle = () => {
    switch (position) {
      case 'top': return 'translate(-50%, -100%)';
      case 'bottom': return 'translate(-50%, 0)';
      case 'left': return 'translate(-100%, -50%)';
      case 'right': return 'translate(0, -50%)';
      default: return 'translate(-50%, -100%)';
    }
  };

  return (
    <>
      <div 
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        style={{ display: 'inline-block' }}
      >
        {children}
      </div>

      <AnimatePresence>
        {isVisible && (
          <Portal>
            <motion.div
              initial={getInitialAnimation()}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={getInitialAnimation()}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              style={{
                position: 'absolute',
                top: coords.top,
                left: coords.left,
                transform: transformStyle(),
                transformOrigin: getTransformOrigin(),
                zIndex: 99999,
                pointerEvents: 'none',
                background: 'rgba(15, 23, 42, 0.95)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '500',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                whiteSpace: 'nowrap',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              {content}
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </>
  );
};

export default Tooltip;
