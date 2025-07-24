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

  private async makeRequest(messages: any[], temperature = 0.3): Promise<any> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature,
        max_tokens: 4000
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
    const prompt = `You are an expert at analyzing service call transcripts. Your task is to segment this transcript by conversation stages.

CRITICAL: You must respond with ONLY a valid JSON array. Do not include:
- Markdown formatting (no \`\`\`json or \`\`\`)
- Explanatory text before or after the JSON
- Code blocks
- Any other text

The response must start with [ and end with ]. Each array element must have these exact fields:
- speaker: "Technician" or "Customer" 
- timestamp: estimated time like "00:15" 
- text: the actual spoken text
- stage: one of "introduction", "diagnosis", "solution", "upsell", "maintenance", "closing"

Stages definition:
- introduction: Greetings, introductions, initial pleasantries
- diagnosis: Understanding the problem, asking questions about the issue
- solution: Explaining what's wrong and how to fix it
- upsell: Offering additional products or services beyond the main repair
- maintenance: Discussing service plans, future maintenance, warranties
- closing: Wrapping up, thank yous, scheduling follow-ups

Here's the transcript to analyze:
${transcript}

Remember: ONLY return the JSON array, nothing else.`

    const messages = [
      {
        role: 'system',
        content: 'You are a JSON-only response system. You must ONLY return valid JSON arrays without any markdown formatting, explanations, or additional text. Your entire response must be parseable as JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]

    // Try up to 3 times in case of JSON parsing issues
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Segmentation attempt ${attempt}/3`)
        const response = await this.makeRequest(messages, 0.1) // Lower temperature for more consistent output
        console.log(`Raw response received, length: ${response?.length || 0}`)
        
        const cleanedResponse = this.cleanJsonResponse(response)
        const segments = JSON.parse(cleanedResponse)
        
        if (!Array.isArray(segments)) {
          throw new Error('Response is not an array')
        }
        
        // Validate that segments have required fields
        for (const segment of segments) {
          if (!segment.speaker || !segment.text || !segment.stage) {
            throw new Error('Segment missing required fields')
          }
        }
        
        console.log(`Successfully parsed ${segments.length} segments`)
        return segments
        
      } catch (parseError) {
        lastError = parseError instanceof Error ? parseError : new Error(String(parseError))
        console.error(`Attempt ${attempt}/3 failed to parse OpenAI segmentation response:`, parseError)
        
        if (attempt === 3) {
          // Provide more helpful error context
          throw new Error(`Failed to parse OpenAI segmentation response after 3 attempts: ${lastError.message}. The AI may be returning non-JSON content or there could be formatting issues.`)
        }
        
        // Add a small delay before retry and modify prompt to be more explicit
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Make the prompt even more explicit for retry attempts
        if (attempt === 2) {
          messages[1].content = `${prompt}\n\nIMPORTANT: Your previous response was not valid JSON. Please ensure your response is ONLY a JSON array with no other text.`
        }
      }
    }
    
    // This should never be reached due to the throw in the loop, but TypeScript needs it
    throw new Error('Failed to parse segmentation after 3 attempts')
  }

  async analyzeCompliance(segments: any[]): Promise<CallAnalysis['compliance']> {
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
      console.log('Starting OpenAI analysis...')
      
      // Step 1: Segment the transcript
      console.log('Step 1: Segmenting transcript...')
      let segments
      
      try {
        segments = await this.segmentTranscript(transcript)
        console.log(`Segmented into ${segments.length} parts`)
      } catch (segmentError) {
        console.error('Failed to segment transcript, creating fallback segments:', segmentError)
        
        // Create basic segments from transcript as fallback
        const lines = transcript.split('\n').filter(line => line.trim())
        segments = lines.map((line, index) => {
          const timeMinutes = Math.floor(index * 0.5) // Estimate 30 seconds per exchange
          const timeSeconds = (index * 30) % 60
          const timestamp = `${timeMinutes.toString().padStart(2, '0')}:${timeSeconds.toString().padStart(2, '0')}`
          
          // Simple speaker detection
          const speaker = line.toLowerCase().includes('technician') || line.toLowerCase().includes('mike') || line.toLowerCase().includes('tech') 
            ? 'Technician' 
            : 'Customer'
          
          // Simple stage detection based on content
          let stage = 'diagnosis' // default
          if (index < 2) stage = 'introduction'
          else if (line.toLowerCase().includes('fix') || line.toLowerCase().includes('repair')) stage = 'solution'
          else if (line.toLowerCase().includes('upsell') || line.toLowerCase().includes('additional')) stage = 'upsell'
          else if (line.toLowerCase().includes('maintenance') || line.toLowerCase().includes('plan')) stage = 'maintenance'
          else if (index > lines.length - 3) stage = 'closing'
          
          return {
            speaker,
            timestamp,
            text: line.trim(),
            stage
          }
        })
        
        console.log(`Created ${segments.length} fallback segments`)
      }

      // Step 2: Analyze compliance
      console.log('Step 2: Analyzing compliance...')
      let compliance
      
      try {
        compliance = await this.analyzeCompliance(segments)
      } catch (complianceError) {
        console.error('Failed to analyze compliance, using fallback:', complianceError)
        
        // Fallback compliance analysis
        compliance = {
          introduction: { present: segments.some(s => s.stage === 'introduction'), quality: 'Fair', notes: 'Basic analysis - detailed analysis failed' },
          diagnosis: { present: segments.some(s => s.stage === 'diagnosis'), quality: 'Fair', notes: 'Basic analysis - detailed analysis failed' },
          solution: { present: segments.some(s => s.stage === 'solution'), quality: 'Fair', notes: 'Basic analysis - detailed analysis failed' },
          upsell: { present: segments.some(s => s.stage === 'upsell'), quality: 'Fair', notes: 'Basic analysis - detailed analysis failed' },
          maintenance: { present: segments.some(s => s.stage === 'maintenance'), quality: 'Fair', notes: 'Basic analysis - detailed analysis failed' },
          closing: { present: segments.some(s => s.stage === 'closing'), quality: 'Fair', notes: 'Basic analysis - detailed analysis failed' }
        }
      }

      // Step 3: Analyze sales insights
      console.log('Step 3: Analyzing sales insights...')
      let salesInsights
      
      try {
        salesInsights = await this.analyzeSalesInsights(segments)
      } catch (salesError) {
        console.error('Failed to analyze sales insights, using fallback:', salesError)
        
        // Fallback sales analysis
        salesInsights = {
          opportunities: ['Unable to analyze - parsing error occurred'],
          successful: ['Unable to analyze - parsing error occurred'],
          missed: ['Unable to analyze - parsing error occurred']
        }
      }

      // Calculate overall score
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

      // Determine call type
      const hasRepair = segments.some(s => 
        s.text.toLowerCase().includes('repair') || 
        s.text.toLowerCase().includes('fix') ||
        s.text.toLowerCase().includes('broken')
      )
      const hasInstall = segments.some(s => 
        s.text.toLowerCase().includes('install') || 
        s.text.toLowerCase().includes('installation')
      )
      const hasMaintenance = segments.some(s => 
        s.text.toLowerCase().includes('maintenance') || 
        s.text.toLowerCase().includes('service')
      )

      let callType = 'Service Call'
      if (hasRepair) callType = 'Repair Call'
      else if (hasInstall) callType = 'Installation Call'
      else if (hasMaintenance) callType = 'Maintenance Call'

      const result: CallAnalysis = {
        callType,
        overallScore,
        compliance,
        salesInsights,
        transcript: { segments }
      }

      console.log('OpenAI analysis completed successfully')
      return result

    } catch (error) {
      console.error('OpenAI analysis failed:', error)
      throw new Error(`OpenAI AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Test function for API key validation
export async function testOpenAIAPI(apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const analyzer = new OpenAIAnalyzer(apiKey)
    
    // Simple test request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test message - respond with just "OK"' }],
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