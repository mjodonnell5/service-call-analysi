interface ComplianceStage {
  present: boolean
  quality: string
  notes: string
}

interface CallAnalysis {
  callType: string
  overallScore: number
  compliance: {
    introduction: ComplianceStage
    diagnosis: ComplianceStage
    solution: ComplianceStage
    upsell: ComplianceStage
    maintenance: ComplianceStage
    closing: ComplianceStage
  }
  salesInsights: {
    opportunities: string[]
    successful: string[]
    missed: string[]
  }
  transcript: {
    segments: Array<{
      speaker: string
      timestamp: string
      text: string
      stage: string
    }>
  }
}

export class OpenAIAnalyzer {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim()
  }

  private cleanJsonResponse(response: string): string {
    if (!response || response.trim().length === 0) {
      throw new Error('Empty response from OpenAI')
    }

    // Log the raw response for debugging
    console.log('Raw OpenAI response length:', response.length)
    console.log('Raw OpenAI response preview:', response.substring(0, 200))

    let cleaned = response.trim()
    
    // Remove multiple types of markdown code block indicators
    const codeBlockPatterns = [
      /^```json\s*\n?/i,
      /^```\s*\n?/,
      /\n?```\s*$/,
      /^json\s*\n?/i
    ]
    
    for (const pattern of codeBlockPatterns) {
      cleaned = cleaned.replace(pattern, '')
    }
    
    // Remove any leading/trailing whitespace again
    cleaned = cleaned.trim()
    
    // Handle cases where the AI includes explanatory text before/after JSON
    // Look for the first { or [ and last } or ]
    const jsonObjectMatch = cleaned.match(/^.*?(\{.*\}).*?$/s)
    const jsonArrayMatch = cleaned.match(/^.*?(\[.*\]).*?$/s)
    
    if (jsonObjectMatch && jsonObjectMatch[1]) {
      const candidate = jsonObjectMatch[1].trim()
      try {
        JSON.parse(candidate)
        console.log('Successfully extracted JSON object')
        return candidate
      } catch {
        console.log('Failed to parse extracted JSON object')
      }
    }
    
    if (jsonArrayMatch && jsonArrayMatch[1]) {
      const candidate = jsonArrayMatch[1].trim()
      try {
        JSON.parse(candidate)
        console.log('Successfully extracted JSON array')
        return candidate
      } catch {
        console.log('Failed to parse extracted JSON array')
      }
    }
    
    // Try to parse the entire cleaned response as a fallback
    try {
      JSON.parse(cleaned)
      console.log('Successfully parsed entire cleaned response')
      return cleaned
    } catch (parseError) {
      console.error('Failed to parse cleaned response:', parseError)
    }
    
    // More aggressive cleaning - look for JSON boundaries
    const firstBrace = cleaned.indexOf('{')
    const firstBracket = cleaned.indexOf('[')
    const lastBrace = cleaned.lastIndexOf('}')
    const lastBracket = cleaned.lastIndexOf(']')
    
    // Try object extraction
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      const objectCandidate = cleaned.substring(firstBrace, lastBrace + 1)
      try {
        JSON.parse(objectCandidate)
        console.log('Successfully extracted object with aggressive parsing')
        return objectCandidate
      } catch {
        console.log('Aggressive object extraction failed')
      }
    }
    
    // Try array extraction
    if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < lastBracket) {
      const arrayCandidate = cleaned.substring(firstBracket, lastBracket + 1)
      try {
        JSON.parse(arrayCandidate)
        console.log('Successfully extracted array with aggressive parsing')
        return arrayCandidate
      } catch {
        console.log('Aggressive array extraction failed')
      }
    }
    
    // If all else fails, log the problematic response and throw a descriptive error
    console.error('Failed to extract valid JSON from response:')
    console.error('Cleaned response:', cleaned.substring(0, 500))
    
    throw new Error(`Could not extract valid JSON from OpenAI response. Response preview: "${cleaned.substring(0, 100)}..."`)
  }

  private async makeRequest(messages: any[], temperature = 0.3, fastMode = true): Promise<any> {
    // Use faster model for most operations, fallback to gpt-4o-mini for complex analysis
    const model = fastMode ? 'gpt-3.5-turbo' : 'gpt-4o-mini'
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: fastMode ? 2000 : 4000 // Smaller tokens for faster response
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key - check your API key is correct')
      } else if (response.status === 429) {
        throw new Error('OpenAI API quota exceeded - check your billing and usage limits')
      } else if (response.status === 403) {
        throw new Error('OpenAI API access forbidden - verify your account has API access')
      } else {
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      }
    }

    const data = await response.json()
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenAI API')
    }

    return data.choices[0].message.content
  }

  async segmentTranscript(transcript: string): Promise<any[]> {
    // Fast segmentation with simplified prompt
    const prompt = `Analyze this service call transcript and return a JSON array. Each element needs: speaker, timestamp, text, stage.

Stages: introduction, diagnosis, solution, upsell, maintenance, closing

Return only valid JSON array starting with [ and ending with ]:

${transcript.length > 8000 ? transcript.substring(0, 8000) + '...[truncated]' : transcript}`

    const messages = [
      {
        role: 'system',
        content: 'Return only JSON arrays. No markdown, no explanations.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]

    // Use fast mode with retry logic
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= 2; attempt++) { // Reduced attempts for speed
      try {
        console.log(`Fast segmentation attempt ${attempt}/2`)
        const response = await this.makeRequest(messages, 0.1, true) // Fast mode
        
        const cleanedResponse = this.cleanJsonResponse(response)
        const segments = JSON.parse(cleanedResponse)
        
        if (!Array.isArray(segments)) {
          throw new Error('Response is not an array')
        }
        
        // Quick validation
        if (segments.length === 0) {
          throw new Error('No segments returned')
        }
        
        console.log(`Successfully parsed ${segments.length} segments`)
        return segments
        
      } catch (parseError) {
        lastError = parseError instanceof Error ? parseError : new Error(String(parseError))
        console.error(`Fast attempt ${attempt}/2 failed:`, parseError)
        
        if (attempt === 2) {
          throw new Error(`Fast segmentation failed: ${lastError.message}`)
        }
      }
    }
    
    throw new Error('Fast segmentation failed after retries')
  }

  // New combined analysis method for speed
  async analyzeCombined(segments: any[]): Promise<{
    compliance: CallAnalysis['compliance'],
    salesInsights: CallAnalysis['salesInsights']
  }> {
    const combinedPrompt = `Analyze this service call for compliance and sales performance. Return JSON with exact structure:

{
  "compliance": {
    "introduction": {"present": boolean, "quality": string, "notes": string},
    "diagnosis": {"present": boolean, "quality": string, "notes": string},
    "solution": {"present": boolean, "quality": string, "notes": string},
    "upsell": {"present": boolean, "quality": string, "notes": string},
    "maintenance": {"present": boolean, "quality": string, "notes": string},
    "closing": {"present": boolean, "quality": string, "notes": string}
  },
  "salesInsights": {
    "opportunities": ["array of strings"],
    "successful": ["array of strings"], 
    "missed": ["array of strings"]
  }
}

Quality levels: "Excellent", "Good", "Fair", "Poor"

Segments: ${JSON.stringify(segments.slice(0, 50), null, 0)}`

    const messages = [
      {
        role: 'system',
        content: 'Return only JSON objects. No markdown, no explanations.'
      },
      {
        role: 'user',
        content: combinedPrompt
      }
    ]

    const response = await this.makeRequest(messages, 0.1, true) // Fast mode
    
    try {
      const cleanedResponse = this.cleanJsonResponse(response)
      return JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('Combined analysis parse error:', parseError)
      throw new Error(`Combined analysis parsing failed: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`)
    }
  }
    const stageSegments = {
      introduction: segments.filter(s => s.stage === 'introduction'),
      diagnosis: segments.filter(s => s.stage === 'diagnosis'),
      solution: segments.filter(s => s.stage === 'solution'),
      upsell: segments.filter(s => s.stage === 'upsell'),
      maintenance: segments.filter(s => s.stage === 'maintenance'),
      closing: segments.filter(s => s.stage === 'closing')
    }

    const analysisPrompt = `You are a service call quality analyst. Analyze each stage for compliance with best practices.

CRITICAL: You must respond with ONLY a valid JSON object. Do not include:
- Markdown formatting (no \`\`\`json or \`\`\`)
- Explanatory text before or after the JSON
- Code blocks
- Any other text

The response must start with { and end with }. For each stage, determine:
1. present: true/false if the stage occurred
2. quality: "Excellent", "Good", "Fair", or "Poor" 
3. notes: specific observations about what was done well or missed

Stage segments to analyze:
${JSON.stringify(stageSegments, null, 2)}

You must return this exact JSON structure:
{
  "introduction": {"present": boolean, "quality": string, "notes": string},
  "diagnosis": {"present": boolean, "quality": string, "notes": string},
  "solution": {"present": boolean, "quality": string, "notes": string},
  "upsell": {"present": boolean, "quality": string, "notes": string},
  "maintenance": {"present": boolean, "quality": string, "notes": string},
  "closing": {"present": boolean, "quality": string, "notes": string}
}

Remember: ONLY return the JSON object, nothing else.`

    const messages = [
      {
        role: 'system',
        content: 'You are a JSON-only response system. You must ONLY return valid JSON objects without any markdown formatting, explanations, or additional text. Your entire response must be parseable as JSON.'
      },
      {
        role: 'user',
        content: analysisPrompt
      }
    ]

    const response = await this.makeRequest(messages, 0.1)
    
    try {
      const cleanedResponse = this.cleanJsonResponse(response)
      return JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('Failed to parse OpenAI compliance response:', parseError)
      console.error('Raw response length:', response?.length || 0)
      console.error('Raw response preview:', response?.substring(0, 500) || 'No response')
      throw new Error(`Failed to parse OpenAI compliance response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`)
    }
  }

  async analyzeSalesInsights(segments: any[]): Promise<CallAnalysis['salesInsights']> {
    const salesPrompt = `You are a sales performance analyst. Analyze this service call transcript for sales performance.

CRITICAL: You must respond with ONLY a valid JSON object. Do not include:
- Markdown formatting (no \`\`\`json or \`\`\`)
- Explanatory text before or after the JSON
- Code blocks
- Any other text

The response must start with { and end with }. Identify:
1. opportunities: potential sales opportunities mentioned or hinted at by the customer
2. successful: sales techniques or offers that worked well
3. missed: opportunities the technician could have capitalized on but didn't

Transcript segments to analyze:
${JSON.stringify(segments, null, 2)}

You must return this exact JSON structure:
{
  "opportunities": ["string array of opportunities identified"],
  "successful": ["string array of successful sales actions"], 
  "missed": ["string array of missed opportunities"]
}

Remember: ONLY return the JSON object, nothing else.`

    const messages = [
      {
        role: 'system',
        content: 'You are a JSON-only response system. You must ONLY return valid JSON objects without any markdown formatting, explanations, or additional text. Your entire response must be parseable as JSON.'
      },
      {
        role: 'user',
        content: salesPrompt
      }
    ]

    const response = await this.makeRequest(messages, 0.1)
    
    try {
      const cleanedResponse = this.cleanJsonResponse(response)
      return JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('Failed to parse OpenAI sales response:', parseError)
      console.error('Raw response length:', response?.length || 0)
      console.error('Raw response preview:', response?.substring(0, 500) || 'No response')
      throw new Error(`Failed to parse OpenAI sales response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`)
    }
  }

  async analyzeServiceCall(transcript: string): Promise<CallAnalysis> {
    try {
      console.log('Starting fast OpenAI analysis...')
      
      // Step 1: Fast segmentation
      console.log('Step 1: Fast transcript segmentation...')
      let segments
      
      try {
        segments = await this.segmentTranscript(transcript)
        console.log(`Segmented into ${segments.length} parts`)
      } catch (segmentError) {
        console.error('Fast segmentation failed, using fallback:', segmentError)
        
        // Quick fallback segmentation
        const lines = transcript.split('\n').filter(line => line.trim())
        segments = lines.map((line, index) => {
          const timeMinutes = Math.floor(index * 0.5)
          const timeSeconds = (index * 30) % 60
          const timestamp = `${timeMinutes.toString().padStart(2, '0')}:${timeSeconds.toString().padStart(2, '0')}`
          
          const speaker = line.toLowerCase().includes('technician') || line.toLowerCase().includes('mike') 
            ? 'Technician' : 'Customer'
          
          let stage = 'diagnosis'
          if (index < 2) stage = 'introduction'
          else if (line.toLowerCase().includes('fix') || line.toLowerCase().includes('repair')) stage = 'solution'
          else if (line.toLowerCase().includes('upsell') || line.toLowerCase().includes('additional')) stage = 'upsell'
          else if (line.toLowerCase().includes('maintenance') || line.toLowerCase().includes('plan')) stage = 'maintenance'
          else if (index > lines.length - 3) stage = 'closing'
          
          return { speaker, timestamp, text: line.trim(), stage }
        })
      }

      // Step 2: Combined fast analysis
      console.log('Step 2: Combined compliance and sales analysis...')
      let compliance, salesInsights
      
      try {
        const combined = await this.analyzeCombined(segments)
        compliance = combined.compliance
        salesInsights = combined.salesInsights
      } catch (combinedError) {
        console.error('Combined analysis failed, using individual analysis:', combinedError)
        
        // Fallback to individual analysis
        try {
          compliance = await this.analyzeCompliance(segments)
        } catch {
          compliance = {
            introduction: { present: segments.some(s => s.stage === 'introduction'), quality: 'Fair', notes: 'Analysis fallback' },
            diagnosis: { present: segments.some(s => s.stage === 'diagnosis'), quality: 'Fair', notes: 'Analysis fallback' },
            solution: { present: segments.some(s => s.stage === 'solution'), quality: 'Fair', notes: 'Analysis fallback' },
            upsell: { present: segments.some(s => s.stage === 'upsell'), quality: 'Fair', notes: 'Analysis fallback' },
            maintenance: { present: segments.some(s => s.stage === 'maintenance'), quality: 'Fair', notes: 'Analysis fallback' },
            closing: { present: segments.some(s => s.stage === 'closing'), quality: 'Fair', notes: 'Analysis fallback' }
          }
        }
        
        try {
          salesInsights = await this.analyzeSalesInsights(segments)
        } catch {
          salesInsights = {
            opportunities: ['Analysis error - using fallback'],
            successful: ['Analysis error - using fallback'],
            missed: ['Analysis error - using fallback']
          }
        }
      }

      // Fast scoring
      const complianceScores = Object.values(compliance).map(stage => {
        if (!stage.present) return 0
        switch (stage.quality) {
          case 'Excellent': return 100
          case 'Good': return 80
          case 'Fair': return 60
          case 'Poor': return 30
          default: return 50
        }
      })
      const overallScore = Math.round(complianceScores.reduce((a, b) => a + b, 0) / complianceScores.length)

      // Quick call type determination
      const text = transcript.toLowerCase()
      let callType = 'Service Call'
      if (text.includes('repair') || text.includes('fix') || text.includes('broken')) callType = 'Repair Call'
      else if (text.includes('install')) callType = 'Installation Call'
      else if (text.includes('maintenance')) callType = 'Maintenance Call'

      const result: CallAnalysis = {
        callType,
        overallScore,
        compliance,
        salesInsights,
        transcript: { segments }
      }

      console.log('Fast OpenAI analysis completed successfully')
      return result

    } catch (error) {
      console.error('Fast OpenAI analysis failed:', error)
      throw new Error(`OpenAI AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Keep the original methods as fallbacks
  async analyzeCompliance(segments: any[]): Promise<CallAnalysis['compliance']> {
    const stageSegments = {
      introduction: segments.filter(s => s.stage === 'introduction'),
      diagnosis: segments.filter(s => s.stage === 'diagnosis'),
      solution: segments.filter(s => s.stage === 'solution'),
      upsell: segments.filter(s => s.stage === 'upsell'),
      maintenance: segments.filter(s => s.stage === 'maintenance'),
      closing: segments.filter(s => s.stage === 'closing')
    }

    const analysisPrompt = `Analyze service call compliance. Return JSON:
{
  "introduction": {"present": boolean, "quality": "Excellent/Good/Fair/Poor", "notes": string},
  "diagnosis": {"present": boolean, "quality": "Excellent/Good/Fair/Poor", "notes": string},
  "solution": {"present": boolean, "quality": "Excellent/Good/Fair/Poor", "notes": string},
  "upsell": {"present": boolean, "quality": "Excellent/Good/Fair/Poor", "notes": string},
  "maintenance": {"present": boolean, "quality": "Excellent/Good/Fair/Poor", "notes": string},
  "closing": {"present": boolean, "quality": "Excellent/Good/Fair/Poor", "notes": string}
}

Data: ${JSON.stringify(stageSegments, null, 0)}`

    const messages = [
      { role: 'system', content: 'Return only JSON objects. No markdown.' },
      { role: 'user', content: analysisPrompt }
    ]

    const response = await this.makeRequest(messages, 0.1, false) // Fallback mode
    
    try {
      const cleanedResponse = this.cleanJsonResponse(response)
      return JSON.parse(cleanedResponse)
    } catch (parseError) {
      throw new Error(`Compliance analysis parsing failed: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`)
    }
  }

  async analyzeSalesInsights(segments: any[]): Promise<CallAnalysis['salesInsights']> {
    const salesPrompt = `Analyze sales performance. Return JSON:
{
  "opportunities": ["array of potential sales opportunities"],
  "successful": ["array of successful sales actions"], 
  "missed": ["array of missed opportunities"]
}

Segments: ${JSON.stringify(segments.slice(0, 20), null, 0)}`

    const messages = [
      { role: 'system', content: 'Return only JSON objects. No markdown.' },
      { role: 'user', content: salesPrompt }
    ]

    const response = await this.makeRequest(messages, 0.1, false) // Fallback mode
    
    try {
      const cleanedResponse = this.cleanJsonResponse(response)
      return JSON.parse(cleanedResponse)
    } catch (parseError) {
      throw new Error(`Sales analysis parsing failed: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`)
    }
  }
}

// Test function for API key validation
export async function testOpenAIAPI(apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Simple fast test request using gpt-3.5-turbo for speed
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test - respond with just "OK"' }],
        max_tokens: 5
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (response.status === 401) {
        return { success: false, error: 'Invalid OpenAI API key' }
      } else if (response.status === 429) {
        return { success: false, error: 'OpenAI API quota exceeded - check your billing' }
      } else if (response.status === 403) {
        return { success: false, error: 'OpenAI API access forbidden' }
      } else {
        return { success: false, error: `OpenAI API error: ${response.status}` }
      }
    }

    return { success: true }
    
  } catch (error) {
    console.error('OpenAI API test error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    }
  }
}