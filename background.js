const GEMINI_API_KEY = 'YOUR_API_KEY_HERE';
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'summarize') {
    summarizeWithGemini(request.text, request.title, request.url)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({ error: error.message });
      });
    return true;
  }
});

async function summarizeWithGemini(text, title, url) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('API key not configured. Add your Gemini API key to background.js (line 1)');
  }

  const maxChars = 8000;
  const truncatedText = text.substring(0, maxChars);
  
  const systemPrompt = `You are a high-density content summarizer. Extract the most important information from webpages and present it in a structured, concise format.

Rules:
- Keep summary to under 150 words total
- Extract only actionable, key information
- Use a JSON structure with keys: keyPoints, mainIdea, actionItems
- Be precise and dense - every word counts
- No fluff or filler
- Focus on what matters`;

  const userPrompt = `Summarize this webpage:
Title: ${title}

Content:
${truncatedText}

Return ONLY valid JSON with this structure: { "keyPoints": "...", "mainIdea": "...", "actionItems": "..." }`;

  try {
    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            parts: [{ text: userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          maxOutputTokens: 200,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_CIVIC_INTEGRITY',
            threshold: 'BLOCK_NONE'
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!summary || typeof summary !== 'string') {
      throw new Error('No valid response from Gemini API');
    }

    // Return the summary text as a string
    return summary;
    
  } catch (error) {
    throw new Error(`Summarization failed: ${error.message}`);
  }
}
