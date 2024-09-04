chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchContent") {
    fetch(request.url)
      .then(response => response.text())
      .then(content => {
        sendResponse({ content: content });
      })
      .catch(error => {
        console.error('Error fetching content:', error);
        sendResponse({ content: null });
      });
    return true;  // Indicates we wish to send a response asynchronously
  }
});
