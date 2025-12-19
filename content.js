chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractText') {
    try {
      const text = extractPageText();
      const tokenEstimate = Math.ceil(text.length / 4);
      
      if (!text || text.trim().length === 0) {
        throw new Error('No text extracted');
      }
      
      sendResponse({
        text: text,
        tokenEstimate: tokenEstimate
      });
    } catch (error) {
      sendResponse({
        text: '',
        tokenEstimate: 0,
        error: error.message
      });
    }
  }
});

function extractPageText() {
  let content = '';
  
  // Try to find main content area
  const mainContent = document.querySelector('main') ||
                      document.querySelector('article') ||
                      document.querySelector('[role="main"]') ||
                      document.querySelector('.main-content') ||
                      document.querySelector('.content') ||
                      document.body;
  
  // Collect text from relevant elements
  const selector = 'p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, span';
  
  mainContent.querySelectorAll(selector).forEach(el => {
    // Skip if element is hidden
    if (el.offsetParent === null) return;
    
    const text = el.textContent.trim();
    
    // Skip empty and very short text
    if (text && text.length > 3) {
      content += text + ' ';
    }
  });
  
  // Clean up whitespace
  content = content
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 10000);
  
  return content;
}