// file: content.js

let previewContainer = null;
let previewContent = null;
let hoverTimer = null;

function createPreviewElements() {
  previewContainer = document.createElement('div');
  previewContainer.id = 'link-preview-container';
  
  const header = document.createElement('div');
  header.id = 'link-preview-header';
  
  const title = document.createElement('div');
  title.id = 'link-preview-title';
  
  const buttonsContainer = document.createElement('div');
  buttonsContainer.id = 'link-preview-buttons';
  
  const openButton = document.createElement('button');
  openButton.id = 'link-preview-open';
  openButton.textContent = 'Open in New Tab';
  openButton.addEventListener('click', () => {
    const url = previewContainer.getAttribute('data-url');
    if (url) {
      window.open(url, '_blank');
    }
  });
  
  const closeButton = document.createElement('button');
  closeButton.id = 'link-preview-close';
  closeButton.textContent = '×';
  closeButton.addEventListener('click', hidePreview);
  
  buttonsContainer.appendChild(openButton);
  buttonsContainer.appendChild(closeButton);
  
  header.appendChild(title);
  header.appendChild(buttonsContainer);
  
  previewContent = document.createElement('div');
  previewContent.id = 'link-preview-content';
  
  previewContainer.appendChild(header);
  previewContainer.appendChild(previewContent);
  document.body.appendChild(previewContainer);
  
  // Make the preview window draggable
  let isDragging = false;
  let dragStartX, dragStartY;
  
  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX - previewContainer.offsetLeft;
    dragStartY = e.clientY - previewContainer.offsetTop;
  });
  
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const left = e.clientX - dragStartX;
      const top = e.clientY - dragStartY;
      previewContainer.style.left = `${left}px`;
      previewContainer.style.top = `${top}px`;
    }
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

function showPreview(url, x, y) {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // Increase the size by 20%
  const previewWidth = Math.min(windowWidth * 0.72, windowWidth - 40);  // 0.6 * 1.2 = 0.72
  const previewHeight = Math.min(windowHeight * 0.72, windowHeight - 40);
  
  previewContainer.style.width = `${previewWidth}px`;
  previewContainer.style.height = `${previewHeight}px`;
  
  // Adjust positioning to prevent spilling out of the window
  let left = Math.min(Math.max(x - previewWidth / 2, 20), windowWidth - previewWidth - 20);
  let top = Math.min(Math.max(y - previewHeight / 2, 20), windowHeight - previewHeight - 20);
  
  previewContainer.style.left = `${left}px`;
  previewContainer.style.top = `${top}px`;
  
  previewContainer.setAttribute('data-url', url);
  
  chrome.runtime.sendMessage({action: "fetchContent", url: url}, (response) => {
    if (response.content) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.content, 'text/html');
      const pageTitle = doc.querySelector('title')?.textContent || url;
      document.getElementById('link-preview-title').textContent = pageTitle;
      
      previewContent.innerHTML = response.content;
      previewContent.querySelectorAll('script').forEach(script => script.remove());
      previewContent.querySelectorAll('[src], [href]').forEach(el => {
        ['src', 'href'].forEach(attr => {
          if (el.hasAttribute(attr)) {
            el.setAttribute(attr, new URL(el.getAttribute(attr), url).href);
          }
        });
      });
      // Add event listener to open links in new tabs
      previewContent.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          window.open(link.href, '_blank');
        });
      });
      
      // Set viewport meta tag for responsive design
      const viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      previewContent.insertBefore(viewport, previewContent.firstChild);
      
      // Add custom styles for responsiveness
      const style = document.createElement('style');
      style.textContent = `
        body { 
          width: 100% !important; 
          max-width: 100% !important; 
          margin: 0 !important; 
          padding: 0 !important; 
          overflow-x: hidden !important;
        }
        img, video, iframe { 
          max-width: 100% !important; 
          height: auto !important; 
        }
      `;
      previewContent.insertBefore(style, previewContent.firstChild);
    } else {
      previewContent.innerHTML = '<p>Failed to load content. Please try opening the link in a new tab.</p>';
    }
  });
  
  previewContainer.style.display = 'flex';
}

function hidePreview() {
  if (previewContainer) {
    previewContainer.style.display = 'none';
    previewContent.innerHTML = '';
  }
}

function handleMouseEnter(event) {
  const link = event.target.closest('a');
  if (link) {
    const url = link.href;
    const rect = link.getBoundingClientRect();
    
    hoverTimer = setTimeout(() => {
      showPreview(url, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }, 2000);
  }
}

function handleMouseLeave(event) {
  clearTimeout(hoverTimer);
}

function handleClick(event) {
  if (previewContainer && !previewContainer.contains(event.target)) {
    hidePreview();
  }
}

createPreviewElements();

document.addEventListener('mouseover', handleMouseEnter);
document.addEventListener('mouseout', handleMouseLeave);
document.addEventListener('click', handleClick);
// Escape Key Functionality
document.addEventListener('keydown', (e) => {
  if (e.key === "Escape") {
    hidePreview();
  }
});