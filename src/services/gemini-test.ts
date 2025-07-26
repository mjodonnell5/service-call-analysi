// Simplified Gemini API test for debugging
export async function testGeminiAPI(apiKey: string): Promise<{success: boolean, error?: string, response?: string}> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
    
    const testPrompt = "Analyze this service call: 'Technician: Hello. Customer: Thank you.' Return JSON with callType and score only."
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: testPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200,
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${errorText}` 
      }
    }

    const data = await response.json()
    
    if (!data.candidates || data.candidates.length === 0) {
      return { 
        success: false, 
        error: 'No candidates in response' 
      }
    }

    const content = data.candidates[0].content?.parts?.[0]?.text
    if (!content) {
      return { 
        success: false, 
        error: 'No content in response' 
      }
    }

    return { 
      success: true, 
      response: content 
    }

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}