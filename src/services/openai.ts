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
    // Remove markdown code blocks if present
    let cleaned = response.trim()
    
    // Remove opening ```json or ``` 
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7)
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3)
    }
    
    // Remove closing ```
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3)
    }
    
    // Remove any remaining leading/trailing whitespace
    cleaned = cleaned.trim()
    
    // If the response contains text before or after JSON, try to extract just the JSON part
    const jsonStart = cleaned.indexOf('{')
    const jsonArrayStart = cleaned.indexOf('[')
    
    if (jsonStart === -1 && jsonArrayStart === -1) {
      throw new Error('No JSON found in response')
    }
    
    // Try to parse the entire cleaned response first
    try {
      JSON.parse(cleaned)
      return cleaned
    } catch {
      // If that fails, try to extract JSON boundaries
    }
    
    // Determine if it's an object or array and find the appropriate boundaries
    let startIndex = -1
    let startChar = ''
    let endChar = ''
    
    if (jsonStart !== -1 && (jsonArrayStart === -1 || jsonStart < jsonArrayStart)) {
      startIndex = jsonStart
      startChar = '{'
      endChar = '}'
    } else {
      startIndex = jsonArrayStart
      startChar = '['
      endChar = ']'
    }
    
    // Find the matching closing bracket/brace with proper handling of nested structures
    let bracketCount = 0
    let endIndex = -1
    let inString = false
    let escapeNext = false
    
    for (let i = startIndex; i < cleaned.length; i++) {
      const char = cleaned[i]
      
      if (escapeNext) {
        escapeNext = false
        continue
      }
      
      if (char === '\\' && inString) {
        escapeNext = true
        continue
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString
        continue
      }
      
      if (!inString) {
        if (char === startChar) {
          bracketCount++
        } else if (char === endChar) {
          bracketCount--
          if (bracketCount === 0) {
            endIndex = i
            break
          }
        }
      }
    }
    
    if (endIndex === -1) {
      // Try to find the last occurrence of the end character as a fallback
      const lastEndChar = cleaned.lastIndexOf(endChar)
      if (lastEndChar > startIndex) {
        endIndex = lastEndChar
      } else {
        throw new Error('Malformed JSON: could not find closing bracket')
      }
    }
    
    const extracted = cleaned.substring(startIndex, endIndex + 1)
    
    // Validate the extracted JSON
    try {
      JSON.parse(extracted)
      return extracted
    } catch {
      throw new Error('Extracted text is not valid JSON')
    }
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
    const prompt = `Analyze this service call transcript and segment it by conversation stages. Return a JSON array where each element represents a part of the conversation with these fields:
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

Here's the transcript:
${transcript}

IMPORTANT: Return ONLY a valid JSON array, no markdown formatting, no explanation text, no code blocks. Start with [ and end with ].`

    const messages = [
      {
        role: 'system',
        content: 'You are an expert at analyzing service call transcripts. Always return valid JSON arrays as requested, with no markdown formatting or additional text. Your response must be parseable JSON.'
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
        const response = await this.makeRequest(messages, 0.1) // Lower temperature for more consistent output
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
        
        return segments
        
      } catch (parseError) {
        lastError = parseError instanceof Error ? parseError : new Error(String(parseError))
        console.error(`Attempt ${attempt}/3 failed to parse OpenAI segmentation response:`, parseError)
        
        if (attempt === 3) {
          // Try to provide more helpful error messages based on the response content
          let errorMessage = 'Invalid JSON'
          if (lastError) {
            errorMessage = lastError.message
            errorMessage += `. Failed after 3 attempts. This may be due to incomplete AI response or network issues.`
          }
          
          throw new Error(`Failed to parse OpenAI segmentation response: ${errorMessage}`)
        }
        
        // Add a small delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000))
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

    const analysisPrompt = `Analyze each stage of this service call for compliance with best practices. For each stage, determine:
1. present: true/false if the stage occurred
2. quality: "Excellent", "Good", "Fair", or "Poor" 
3. notes: specific observations about what was done well or missed

Stage segments:
${JSON.stringify(stageSegments, null, 2)}

Return a JSON object with this exact structure:
{
  "introduction": {"present": boolean, "quality": string, "notes": string},
  "diagnosis": {"present": boolean, "quality": string, "notes": string},
  "solution": {"present": boolean, "quality": string, "notes": string},
  "upsell": {"present": boolean, "quality": string, "notes": string},
  "maintenance": {"present": boolean, "quality": string, "notes": string},
  "closing": {"present": boolean, "quality": string, "notes": string}
}

IMPORTANT: Return ONLY the JSON object, no markdown formatting, no explanation text, no code blocks. Start with { and end with }.`

    const messages = [
      {
        role: 'system',
        content: 'You are an expert service call quality analyst. Evaluate each stage objectively and provide actionable feedback. Return only valid JSON without any markdown formatting.'
      },
      {
        role: 'user',
        content: analysisPrompt
      }
    ]

    const response = await this.makeRequest(messages, 0.1) // Lower temperature for consistent output
    
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
    const salesPrompt = `Analyze this service call transcript for sales performance. Identify:

1. opportunities: potential sales opportunities mentioned or hinted at by the customer
2. successful: sales techniques or offers that worked well
3. missed: opportunities the technician could have capitalized on but didn't

Transcript segments:
${JSON.stringify(segments, null, 2)}

Return a JSON object:
{
  "opportunities": ["string array of opportunities identified"],
  "successful": ["string array of successful sales actions"], 
  "missed": ["string array of missed opportunities"]
}

IMPORTANT: Return ONLY the JSON object, no markdown formatting, no explanation text, no code blocks. Start with { and end with }.`

    const messages = [
      {
        role: 'system',
        content: 'You are a sales performance analyst specializing in service calls. Focus on concrete, actionable insights. Return only valid JSON without any markdown formatting.'
      },
      {
        role: 'user',
        content: salesPrompt
      }
    ]

    const response = await this.makeRequest(messages, 0.1) // Lower temperature for consistent output
    
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