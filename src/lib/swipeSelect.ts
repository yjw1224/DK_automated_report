export function swipeSelect(node: HTMLElement, options: {
  onToggle: (name: string, forceState?: boolean) => void;
  getState: (name: string) => boolean;
}) {
  let isDragging = false;
  let hasDragged = false;
  let targetState = false;
  let handledNames = new Set<string>();

  let startX = 0;
  let startY = 0;
  let startName: string | null = null;
  const DRAG_THRESHOLD = 8;

  function getCoords(e: Event) {
    if (typeof window !== 'undefined' && window.TouchEvent && e instanceof TouchEvent) {
      if (e.touches.length === 0) return null;
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e instanceof MouseEvent) {
      return { x: e.clientX, y: e.clientY };
    }
    return null;
  }

  function getButtonNameFromCoords(x: number, y: number) {
    const el = document.elementFromPoint(x, y);
    const btn = el?.closest('button[data-name]');
    return btn ? btn.getAttribute('data-name') : null;
  }

  function handleDown(e: Event) {
    const coords = getCoords(e);
    if (!coords) return;
    
    // Find if we clicked on a valid button
    let el = e.target as HTMLElement;
    let btn = el.closest('button[data-name]');
    let name = btn ? btn.getAttribute('data-name') : null;
    
    if (!name) return;

    isDragging = true;
    hasDragged = false;
    startX = coords.x;
    startY = coords.y;
    startName = name;
    handledNames.clear();
  }

  function handleMove(e: Event) {
    if (!isDragging) return;
    const coords = getCoords(e);
    if (!coords) return;

    if (!hasDragged) {
      const dx = Math.abs(coords.x - startX);
      const dy = Math.abs(coords.y - startY);
      if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
        hasDragged = true;
        if (startName) {
          targetState = !options.getState(startName);
          options.onToggle(startName, targetState);
          handledNames.add(startName);
        }
      } else {
        return; // wait until distance is crossed
      }
    }

    // Now we are actively dragging
    const name = getButtonNameFromCoords(coords.x, coords.y);
    if (name && !handledNames.has(name)) {
      options.onToggle(name, targetState);
      handledNames.add(name);
    }
    
    if (hasDragged && e.cancelable) {
       e.preventDefault();
    }
  }

  function handleUp() {
    isDragging = false;
    startName = null;
  }

  function preventClick(e: Event) {
    if (hasDragged) {
      e.stopPropagation();
      e.preventDefault();
      hasDragged = false; 
    }
  }

  node.addEventListener('mousedown', handleDown);
  node.addEventListener('mousemove', handleMove, { passive: false });
  window.addEventListener('mouseup', handleUp);

  node.addEventListener('touchstart', handleDown, { passive: true });
  node.addEventListener('touchmove', handleMove, { passive: false });
  window.addEventListener('touchend', handleUp);
  window.addEventListener('touchcancel', handleUp);
  
  node.addEventListener('click', preventClick, { capture: true });

  node.style.touchAction = 'pan-y';

  return {
    update(newOptions: typeof options) {
      options = newOptions;
    },
    destroy() {
      node.removeEventListener('mousedown', handleDown);
      node.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);

      node.removeEventListener('touchstart', handleDown);
      node.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('touchcancel', handleUp);
      
      node.removeEventListener('click', preventClick, { capture: true });
    }
  };
}
