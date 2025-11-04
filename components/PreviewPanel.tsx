import React, { useEffect, useRef } from 'react';

interface PreviewPanelProps {
  htmlContent: string;
  isEditMode: boolean;
}

const selectionScript = `
  let highlightedElement = null;
  let lastSelection = '';

  function getCssSelector(el) {
    if (!(el instanceof Element)) return;
    const path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.nodeName.toLowerCase();
        if (el.id) {
            selector += '#' + el.id;
            path.unshift(selector);
            break; 
        } else {
            let sib = el, nth = 1;
            while (sib = sib.previousElementSibling) {
                if (sib.nodeName.toLowerCase() == selector)
                   nth++;
            }
            if (nth != 1)
                selector += ":nth-of-type("+nth+")";
        }
        path.unshift(selector);
        el = el.parentNode;
    }
    return path.join(" > ");
  }

  function highlight(el) {
    if (highlightedElement) {
        highlightedElement.style.outline = '';
        highlightedElement.style.outlineOffset = '';
        highlightedElement.style.cursor = '';
    }
    if (el) {
        el.style.outline = '2px dashed #0891b2';
        el.style.outlineOffset = '2px';
        el.style.cursor = 'pointer';
    }
    highlightedElement = el;
  }

  document.body.addEventListener('mouseover', (e) => {
    highlight(e.target);
  });

  document.body.addEventListener('mouseout', (e) => {
    highlight(null);
  });
  
  document.addEventListener('mouseup', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      if (selectedText) {
          lastSelection = selectedText;
          const anchorNode = selection.anchorNode;
          const parentElement = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
          const selector = getCssSelector(parentElement);
          window.parent.postMessage({ 
            type: 'textSelected', 
            text: selectedText,
            selector: selector
          }, '*');
      }
  }, true);

  document.body.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Prevent click event firing immediately after a text selection
      if (lastSelection) {
        lastSelection = '';
        return;
      }
      
      const selector = getCssSelector(e.target);
      window.parent.postMessage({ 
        type: 'elementSelected', 
        selector: selector,
      }, '*');
  }, true);
`;


export const PreviewPanel: React.FC<PreviewPanelProps> = ({ htmlContent, isEditMode }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const srcDoc = isEditMode
    ? `${htmlContent}<script>${selectionScript}<\/script>`
    : htmlContent;

  return (
    <div className="w-full h-full bg-white">
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        title="Website Preview"
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};
