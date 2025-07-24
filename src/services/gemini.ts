// Gemini AI service for enhanced transcript analysis
export interface GeminiConfig {
  apiKey: string
  model?: string
}

export interface AnalysisStage {
  stage: string
  content: string[]
  quality: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Missing'
  notes: string
}

export interface GeminiAnalysisResult {
  callType: string
  overallScore: number
  stages: AnalysisStage[]
  salesInsights: {
    opportunities: string[]
    successful: string[]
    missed: string[]
  }
  segmentedTranscript: Array<{
    speaker: string
    text: string
    timestamp: string
    stage: string
  }>
}

export class GeminiAnalyzer {
  private config: GeminiConfig
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models'

  constructor(config: GeminiConfig) {
    this.config = {
      model: 'gemini-1.5-flash',
      ...config
    }
  }

  private async callGemini(prompt: string): Promise<string> {
    // Validate API key format
    if (!this.config.apiKey || this.config.apiKey.trim().length === 0) {
      throw new Error('Gemini API key is required')
    }
    
    // Basic API key format validation for Google AI Studio keys
    if (!this.config.apiKey.startsWith('AIza') || this.config.apiKey.length < 35) {
      throw new Error('Invalid Gemini API key format. Please check your API key.')
    }
    
    const url = `${this.baseUrl}/${this.config.model}:generateContent?key=${this.config.apiKey}`
    
    // Check prompt length and truncate if necessary (conservative limit for free tier)
    const maxPromptLength = 8000 // Reduced for free tier reliability
    let truncatedPrompt = prompt
    if (prompt.length > maxPromptLength) {
      console.log(`Prompt too long (${prompt.length} chars), truncating to ${maxPromptLength}`)
      truncatedPrompt = prompt.substring(0, maxPromptLength) + "\n\n[Transcript truncated due to length...]"
    }
    
    console.log(`Making Gemini API request to: ${this.baseUrl}/${this.config.model}:generateContent`)
    console.log(`Using API key: ${this.config.apiKey.substring(0, 8)}...${this.config.apiKey.substring(this.config.apiKey.length - 4)}`)
    
    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: truncatedPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.95,
            maxOutputTokens: 1500, // Reduced for free tier
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE"
            }
          ]
        })
      })
    } catch (networkError) {
      if (networkError instanceof TypeError && networkError.message.includes('fetch')) {
        throw new Error('Network error accessing Gemini API. Please check your internet connection.')
      }
      // Re-throw any other fetch errors
      throw new Error(`Network request failed: ${networkError instanceof Error ? networkError.message : 'Unknown error'}`)
    }

    // Check response status
    if (!response.ok) {
      let errorText: string
      try {
        errorText = await response.text()
      } catch {
        errorText = 'Unable to read error response'
      }
      
      console.error('Gemini API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      
      // Provide more specific error messages
      if (response.status === 400) {
        if (errorText.includes('API_KEY_INVALID') || errorText.includes('invalid API key')) {
          throw new Error('Invalid Gemini API key. Please check your API key is correct.')
        } else if (errorText.includes('quota') || errorText.includes('QUOTA_EXCEEDED')) {
          throw new Error('Gemini API quota exceeded. Please check your billing and usage limits.')
        } else {
          throw new Error(`Gemini API request error: ${errorText}`)
        }
      } else if (response.status === 403) {
        throw new Error('Gemini API access forbidden. Check your API key permissions and billing status.')
      } else if (response.status === 429) {
        throw new Error('Gemini API rate limit exceeded. Please wait before trying again.')
      } else {
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
      }
    }

    // Parse response JSON
    let data: any
    try {
      data = await response.json()
    } catch (jsonError) {
      throw new Error('Failed to parse Gemini API response as JSON')
    }
    
    // Better error handling for Gemini responses
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No candidates returned from Gemini API')
    }
    
    const candidate = data.candidates[0]
    if (candidate.finishReason === 'SAFETY') {
      throw new Error('Gemini response blocked due to safety filters')
    }
    
    if (candidate.finishReason === 'MAX_TOKENS') {
      console.warn('Gemini response was truncated due to token limit')
    }
    
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error('No content returned from Gemini API')
    }
    
    const responseText = candidate.content.parts[0].text
    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Empty text response from Gemini API')
    }
    
    console.log(`Gemini response length: ${responseText.length} chars`)
    console.log(`Gemini finish reason: ${candidate.finishReason || 'STOP'}`)
    
    return responseText
  }

  async analyzeServiceCall(transcript: string): Promise<GeminiAnalysisResult> {
    try {
      console.log('Starting single-step Gemini analysis...')
      
      // Simplified analysis prompt optimized for free tier
      const analysisPrompt = `
Analyze this service call transcript and return ONLY valid JSON (no markdown).

TRANSCRIPT:
${transcript.substring(0, 4000)} // Truncate for free tier

Return this exact JSON structure:
{
  "callType": "Service Call",
  "overallScore": 80,
  "segments": [
    {"speaker": "Technician", "text": "Hello", "timestamp": "00:15", "stage": "introduction"}
  ],
  "stages": [
    {"stage": "introduction", "quality": "Good", "notes": "Professional greeting"},
    {"stage": "diagnosis", "quality": "Good", "notes": "Problem investigation"},
    {"stage": "solution", "quality": "Good", "notes": "Solution provided"},
    {"stage": "upsell", "quality": "Fair", "notes": "Some additional services"},
    {"stage": "maintenance", "quality": "Good", "notes": "Maintenance discussed"},
    {"stage": "closing", "quality": "Good", "notes": "Professional closing"}
  ],
  "salesInsights": {
    "opportunities": ["Potential for additional services"],
    "successful": ["Service completed professionally"],
    "missed": ["Manual review recommended"]
  }
}

Requirements:
- Parse speaker statements into segments
- Assign stages: introduction, diagnosis, solution, upsell, maintenance, closing
- Quality: Poor, Fair, Good, Excellent
- Overall score 0-100
`

      const response = await this.callGemini(analysisPrompt)
      console.log('Gemini response received, parsing...')
      
      if (!response || response.trim().length === 0) {
        throw new Error('Empty response from Gemini API')
      }
      
      // Simple, robust JSON parsing
      let result
      try {
        // Clean the response
        let cleanResponse = response.trim()
        
        // Remove any markdown formatting
        cleanResponse = cleanResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
        cleanResponse = cleanResponse.replace(/^.*?({[\s\S]*}).*$/s, '$1')
        
        // Parse the JSON
        result = JSON.parse(cleanResponse)
        console.log('Successfully parsed Gemini response')
        
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError)
        console.error('Response that failed:', response.substring(0, 1000))
        throw new Error(`Failed to parse Gemini segmentation response: ${parseError}`)
      }
      
      // Validate and fix the result structure
      const validated = this.validateGeminiResult(result, transcript)
      
      console.log('Gemini analysis completed successfully')
      console.log('- Call Type:', validated.callType)
      console.log('- Segments:', validated.segmentedTranscript.length)
      console.log('- Overall Score:', validated.overallScore)
      
      return validated
      
    } catch (error) {
      console.error('Gemini analysis failed:', error)
      
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Don't modify the error message if it's already descriptive
        if (errorMessage.includes('Invalid Gemini API key') || 
            errorMessage.includes('quota exceeded') ||
            errorMessage.includes('access forbidden') ||
            errorMessage.includes('rate limit') ||
            errorMessage.includes('Network error')) {
          // Keep the original message - it's already descriptive
        } else if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
          errorMessage = 'Failed to parse Gemini response: Invalid JSON format'
        } else if (errorMessage.includes('safety')) {
          errorMessage = 'Content blocked by Gemini safety filters'
        } else if (errorMessage.includes('API error') && !errorMessage.includes('Check your API key')) {
          errorMessage = 'Gemini API error: Check your API key and quota'
        }
      }
      
      throw new Error(`Gemini AI analysis failed: ${errorMessage}`)
    }
  }

  private validateGeminiResult(result: any, transcript: string): GeminiAnalysisResult {
    console.log('Validating Gemini result structure...')
    
    // Ensure basic structure exists
    const validated: GeminiAnalysisResult = {
      callType: (result.callType && !result.callType.includes('Fallback')) ? result.callType : 'HVAC Service Call',
      overallScore: typeof result.overallScore === 'number' ? Math.max(0, Math.min(100, result.overallScore)) : 75,
      stages: [],
      salesInsights: {
        opportunities: Array.isArray(result.salesInsights?.opportunities) ? result.salesInsights.opportunities : [],
        successful: Array.isArray(result.salesInsights?.successful) ? result.salesInsights.successful : [],
        missed: Array.isArray(result.salesInsights?.missed) ? result.salesInsights.missed : []
      },
      segmentedTranscript: []
    }
    
    // Validate stages
    const requiredStages = ['introduction', 'diagnosis', 'solution', 'upsell', 'maintenance', 'closing']
    const validQualities = ['Poor', 'Fair', 'Good', 'Excellent']
    
    for (const stage of requiredStages) {
      const stageData = Array.isArray(result.stages) 
        ? result.stages.find((s: any) => s.stage === stage)
        : null
      
      validated.stages.push({
        stage,
        content: [], // Not used in our interface
        quality: validQualities.includes(stageData?.quality) ? stageData.quality : 'Fair',
        notes: stageData?.notes || `${stage} stage analysis`
      })
    }
    
    // Validate segments
    if (Array.isArray(result.segments) && result.segments.length > 0) {
      validated.segmentedTranscript = result.segments
        .filter((s: any) => s.speaker && s.text && s.text.trim().length > 0)
        .map((s: any, index: number) => ({
          speaker: s.speaker,
          text: s.text,
          timestamp: s.timestamp || `${Math.floor(index * 20 / 60).toString().padStart(2, '0')}:${(index * 20 % 60).toString().padStart(2, '0')}`,
          stage: requiredStages.includes(s.stage) ? s.stage : this.determineStageFromText(index, s.text, result.segments.length)
        }))
    } else {
      // No valid segments - this is an analysis failure
      throw new Error('Gemini AI failed to generate valid transcript segments')
    }
    
    // Ensure we have some segments
    if (validated.segmentedTranscript.length === 0) {
      throw new Error('Gemini AI analysis produced no usable segments')
    }
    
    console.log('Validation complete')
    console.log('- Stages:', validated.stages.length)
    console.log('- Segments:', validated.segmentedTranscript.length)
    console.log('- Opportunities:', validated.salesInsights.opportunities.length)
    
    return validated
  }

  private parseTranscriptToSegments(transcript: string) {
    const lines = transcript.split('\n').filter(line => line.trim() !== '')
    const segments = []
    let timestamp = 15 // Start at 15 seconds
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [speaker, ...textParts] = line.split(':')
        const text = textParts.join(':').trim()
        
        if (text) {
          const minutes = Math.floor(timestamp / 60)
          const seconds = timestamp % 60
          
          segments.push({
            speaker: speaker.trim(),
            text: text,
            timestamp: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
            stage: this.determineStageFromText(segments.length, text, lines.length)
          })
          
          // Estimate timing based on text length
          const wordCount = text.split(' ').length
          timestamp += Math.max(10, Math.min(45, wordCount * 2))
        }
      }
    }
    
    return segments
  }



  private determineStageFromText(index: number, text: string, totalLines: number): string {
    const progress = index / Math.max(totalLines, 1)
    const lowerText = text.toLowerCase()
    
    // Introduction indicators
    if (lowerText.includes('good morning') || lowerText.includes('hello') || 
        lowerText.includes('this is') || lowerText.includes('speaking with') ||
        progress < 0.15) {
      return 'introduction'
    }
    
    // Diagnosis indicators
    if (lowerText.includes('problem') || lowerText.includes('issue') || 
        lowerText.includes('what happened') || lowerText.includes('noise') ||
        lowerText.includes('stopped working')) {
      return 'diagnosis'
    }
    
    // Solution indicators
    if (lowerText.includes('fix') || lowerText.includes('repair') ||
        lowerText.includes('replace') || lowerText.includes('cost') ||
        lowerText.includes('$')) {
      return 'solution'
    }
    
    // Upsell indicators
    if (lowerText.includes('also offer') || lowerText.includes('additional') ||
        lowerText.includes('air purifier') || lowerText.includes('upgrade')) {
      return 'upsell'
    }
    
    // Maintenance indicators
    if (lowerText.includes('maintenance') || lowerText.includes('plan') ||
        lowerText.includes('check-up') || lowerText.includes('annual')) {
      return 'maintenance'
    }
    
    // Closing indicators
    if (lowerText.includes('thank you') || lowerText.includes('all done') ||
        lowerText.includes('have a great') || progress > 0.85) {
      return 'closing'
    }
    
    // Fallback based on position
    if (progress < 0.25) return 'diagnosis'
    if (progress < 0.5) return 'solution'
    if (progress < 0.75) return 'upsell'
    return 'maintenance'
  }
}

export function createGeminiAnalyzer(apiKey: string): GeminiAnalyzer {
  return new GeminiAnalyzer({ apiKey })
}