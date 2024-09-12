let previewContainer = null;
let previewContent = null;
let hoverTimer = null;
let spinnerTimeout = null;
let notificationElement = null;
let currentHoveredLink = null;
let copyButton = null;
let openButton = null;

function createPreviewElements() {
  previewContainer = document.createElement('div');
  previewContainer.id = 'link-preview-container';
  
  const spinner = document.createElement('div');
  spinner.id = 'link-preview-spinner';
  spinner.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(spinner);
  
  const header = document.createElement('div');
  header.id = 'link-preview-header';
  
  const title = document.createElement('div');
  title.id = 'link-preview-title';
  
  const buttonsContainer = document.createElement('div');
  buttonsContainer.id = 'link-preview-buttons';
  
  copyButton = document.createElement('button');
  copyButton.id = 'link-preview-copy';
  copyButton.textContent = 'Copy Link (C)';
  copyButton.addEventListener('click', copyLink);
  
  openButton = document.createElement('button');
  openButton.id = 'link-preview-open';
  openButton.textContent = 'Open in New Tab (T)';
  openButton.addEventListener('click', openInNewTab);
  
  const closeButton = document.createElement('button');
  closeButton.id = 'link-preview-close';
  closeButton.textContent = '×';
  closeButton.addEventListener('click', hidePreview);
  
  buttonsContainer.appendChild(copyButton);
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

  notificationElement = document.createElement('div');
  notificationElement.id = 'link-preview-notification';
  notificationElement.textContent = 'Press "O" to open popup view';
  notificationElement.style.display = 'none';
  document.body.appendChild(notificationElement);
}

function showPreview(url, x, y) {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  const previewWidth = Math.min(windowWidth * 0.72, windowWidth - 40);
  const previewHeight = Math.min(windowHeight * 0.72, windowHeight - 40);
  
  previewContainer.style.width = `${previewWidth}px`;
  previewContainer.style.height = `${previewHeight}px`;
  
  let left = Math.min(Math.max(x - previewWidth / 2, 20), windowWidth - previewWidth - 20);
  let top = Math.min(Math.max(y - previewHeight / 2, 20), windowHeight - previewHeight - 20);
  
  previewContainer.style.left = `${left}px`;
  previewContainer.style.top = `${top}px`;
  
  previewContainer.setAttribute('data-url', url);
  
  // Show spinner
  const spinner = document.getElementById('link-preview-spinner');
  spinner.style.display = 'flex';
  spinner.style.left = `${left + previewWidth / 2 - 25}px`;
  spinner.style.top = `${top + previewHeight / 2 - 25}px`;
  spinner.style.opacity = '0';
  
  spinnerTimeout = setTimeout(() => {
    spinner.style.opacity = '1';
  }, 500);
  
  chrome.runtime.sendMessage({action: "fetchContent", url: url}, (response) => {
    clearTimeout(spinnerTimeout);
    spinner.style.display = 'none';
    
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
      previewContent.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          window.open(link.href, '_blank');
        });
      });
      
      const viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      previewContent.insertBefore(viewport, previewContent.firstChild);
      
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
    
    previewContainer.style.display = 'flex';
    previewContainer.style.opacity = '0';
    setTimeout(() => {
      previewContainer.style.opacity = '1';
    }, 10);
  });
}

function hidePreview() {
  if (previewContainer) {
    previewContainer.style.opacity = '0';
    setTimeout(() => {
      previewContainer.style.display = 'none';
      previewContent.innerHTML = '';
    }, 300);
  }
}

function showNotification(x, y) {
  notificationElement.style.left = `${x}px`;
  notificationElement.style.top = `${y}px`;
  notificationElement.style.display = 'block';
}
function hideNotification() {
  notificationElement.style.display = 'none';
}

function copyLink() {
  const url = previewContainer.getAttribute('data-url');
  if (url) {
    navigator.clipboard.writeText(url).then(() => {
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy Link (C)';
      }, 2000);
    });
  }
}

function openInNewTab() {
  const url = previewContainer.getAttribute('data-url');
  if (url) {
    window.open(url, '_blank');
  }
}

function handleMouseEnter(event) {
  const link = event.target.closest('a');
  if (link) {
    const url = link.href;
    const rect = link.getBoundingClientRect();
    currentHoveredLink = link;
    
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      showNotification(rect.right, rect.top);
    }, 500);
  }
}

function handleMouseLeave(event) {
  clearTimeout(hoverTimer);
  hideNotification();
  currentHoveredLink = null;
}

function handleClick(event) {
  if (previewContainer && !previewContainer.contains(event.target)) {
    hidePreview();
  }
}

function handleContextMenu(event) {
  const link = event.target.closest('a');
  if (link) {
    event.preventDefault();
    const url = link.href;
    const rect = link.getBoundingClientRect();
    showPreview(url, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }
}

function handleKeyPress(event) {
  if (event.key === 'o' || event.key === 'O') {
    if (currentHoveredLink) {
      const url = currentHoveredLink.href;
      const rect = currentHoveredLink.getBoundingClientRect();
      showPreview(url, rect.left + rect.width / 2, rect.top + rect.height / 2);
      hideNotification();
    }
  } else if (event.key === 'c' || event.key === 'C') {
    if (previewContainer.style.display !== 'none') {
      copyLink();
    }
  } else if (event.key === 't' || event.key === 'T') {
    if (previewContainer.style.display !== 'none') {
      openInNewTab();
    }
  }
}

createPreviewElements();

document.addEventListener('mouseover', handleMouseEnter);
document.addEventListener('mouseout', handleMouseLeave);
document.addEventListener('click', handleClick);
document.addEventListener('contextmenu', handleContextMenu);
document.addEventListener('keydown', (e) => {
  if (e.key === "Escape") {
    hidePreview();
  }
});
document.addEventListener('keypress', handleKeyPress);
