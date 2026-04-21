import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const Portal = ({ children, id = 'portal-root' }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  let portalRoot = document.getElementById(id);
  
  if (!portalRoot) {
    // Fallback: create the element if it doesn't exist
    portalRoot = document.createElement('div');
    portalRoot.id = id;
    document.body.appendChild(portalRoot);
  }

  return createPortal(children, portalRoot);
};

export default Portal;
