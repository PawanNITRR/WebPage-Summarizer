async function generateSummary() {
  const contentDiv = document.getElementById('content');
  const spinner = document.getElementById('spinner');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if tab is valid for content scripts
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
      throw new Error('Cannot summarize Chrome system pages');
    }

    let extractionResult;
    try {
      extractionResult = await chrome.tabs.sendMessage(tab.id, { 
        action: 'extractText' 
      });
    } catch (err) {
      // If content script not loaded, try injecting it
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      // Retry message
      extractionResult = await chrome.tabs.sendMessage(tab.id, { 
        action: 'extractText' 
      });
    }
    
    if (!extractionResult || !extractionResult.text || extractionResult.text.trim().length === 0) {
      throw new Error('Page content is empty or inaccessible');
    }

    spinner.style.display = 'block';
    
    const summary = await chrome.runtime.sendMessage({
      action: 'summarize',
      text: extractionResult.text,
      title: tab.title,
      url: tab.url
    });

    spinner.style.display = 'none';
    
    displaySummary(summary);
    
    if (!summary.error) {
      document.getElementById('metadata').innerHTML = 
        `<strong>Source:</strong> ${escapeHtml(tab.title)}<br><strong>Tokens Est.:</strong> ${extractionResult.tokenEstimate}`;
    }
    
  } catch (error) {
    spinner.style.display = 'none';
    contentDiv.innerHTML = `<div class="error">⚠️ ${escapeHtml(error.message)}</div>`;
  }
}

function displaySummary(response) {
  const contentDiv = document.getElementById('content');
  
  try {
    // Handle error response
    if (response && response.error) {
      contentDiv.innerHTML = `<div class="error">⚠️ ${escapeHtml(response.error)}</div>`;
      return;
    }

    // Handle if response is an object (shouldn't happen but guard against it)
    let summary = response;
    if (typeof response === 'object' && response !== null) {
      summary = JSON.stringify(response);
    }

    if (!summary || typeof summary !== 'string') {
      throw new Error('Invalid response format');
    }

    let parsed = null;
    
    // Try to parse as JSON
    try {
      // Look for JSON object in the response
      const jsonMatch = summary.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Not JSON, that's okay
    }
    
    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
      contentDiv.innerHTML = renderStructuredSummary(parsed);
    } else {
      // Display as plain text
      contentDiv.innerHTML = `<div class="summary-box">${escapeHtml(summary)}</div>`;
    }
  } catch (error) {
    contentDiv.innerHTML = `<div class="error">⚠️ Error displaying summary: ${escapeHtml(error.message)}</div>`;
  }
}

function renderStructuredSummary(data) {
  let html = '<div class="summary-box">';
  
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'string' && value.trim()) {
      html += `
        <div class="summary-section">
          <div class="section-title">${formatTitle(key)}</div>
          <div class="section-content">${escapeHtml(value)}</div>
        </div>
      `;
    }
  }
  
  html += '</div>';
  return html;
}

function formatTitle(str) {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^_/, '')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', generateSummary);
