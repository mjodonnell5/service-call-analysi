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

    let cleaned = response.trim()
    
    // Remove markdown code blocks
    cleaned = cleaned.replace(/^```json\s*\n?/i, '')
    cleaned = cleaned.replace(/^```\s*\n?/, '')
    cleaned = cleaned.replace(/\n?```\s*$/, '')
    cleaned = cleaned.replace(/^json\s*\n?/i, '')
    cleaned = cleaned.trim()
    
    // Extract JSON from response
    const jsonObjectMatch = cleaned.match(/^.*?(\{.*\}).*?$/s)
    const jsonArrayMatch = cleaned.match(/^.*?(\[.*\]).*?$/s)
    
    if (jsonObjectMatch && jsonObjectMatch[1]) {
      try {
        JSON.parse(jsonObjectMatch[1])
        return jsonObjectMatch[1]
      } catch {}
    }
    
    if (jsonArrayMatch && jsonArrayMatch[1]) {
      try {
        JSON.parse(jsonArrayMatch[1])
        return jsonArrayMatch[1]
      } catch {}
    }
    
    // Aggressive extraction
    const firstBrace = cleaned.indexOf('{')
    const firstBracket = cleaned.indexOf('[')
    const lastBrace = cleaned.lastIndexOf('}')
    const lastBracket = cleaned.lastIndexOf(']')
    
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      const objectCandidate = cleaned.substring(firstBrace, lastBrace + 1)
      try {
        JSON.parse(objectCandidate)
        return objectCandidate
      } catch {}
    }
    
    if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < lastBracket) {
      const arrayCandidate = cleaned.substring(firstBracket, lastBracket + 1)
      try {
        JSON.parse(arrayCandidate)
        return arrayCandidate
      } catch {}
    }
    
    throw new Error(`Could not extract valid JSON from response: "${cleaned.substring(0, 100)}..."`)
  }

  private async makeRequest(messages: any[], temperature = 0.3, fastMode = true): Promise<any> {
    // Use faster model for most operations
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
        max_tokens: fastMode ? 2000 : 4000
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
    const prompt = `Analyze this service call transcript and return a JSON array. Each element needs: speaker, timestamp, text, stage.

IMPORTANT SPEAKER IDENTIFICATION:
- Look for introductions like "This is [name] from [company]" = Technician
- Customer typically describes problems, asks questions about cost/timing
- Technician typically explains solutions, offers services, uses technical terms
- DO NOT mix up speakers - maintain consistency throughout

Stages: introduction, diagnosis, solution, upsell, maintenance, closing

Return only valid JSON array starting with [ and ending with ]:

${transcript.length > 8000 ? transcript.substring(0, 8000) + '...[truncated]' : transcript}`

    const messages = [
      { 
        role: 'system', 
        content: 'You are an expert at analyzing service call transcripts. Return only JSON arrays with accurate speaker identification. No markdown, no explanations.' 
      },
      { role: 'user', content: prompt }
    ]

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Fast segmentation attempt ${attempt}/2`)
        const response = await this.makeRequest(messages, 0.1, true)
        
        const cleanedResponse = this.cleanJsonResponse(response)
        const segments = JSON.parse(cleanedResponse)
        
        if (!Array.isArray(segments) || segments.length === 0) {
          throw new Error('Invalid segments returned')
        }
        
        // Post-process to fix speaker consistency issues
        const correctedSegments = this.correctSpeakerAssignments(segments)
        
        console.log(`Successfully parsed ${correctedSegments.length} segments`)
        return correctedSegments
        
      } catch (parseError) {
        console.error(`Fast attempt ${attempt}/2 failed:`, parseError)
        if (attempt === 2) {
          throw new Error(`Fast segmentation failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
        }
      }
    }
    
    throw new Error('Fast segmentation failed after retries')
  }

  private correctSpeakerAssignments(segments: any[]): any[] {
    if (!segments || segments.length === 0) return segments
    
    // Analyze speaker patterns to fix inconsistencies
    let technicianSpeaker: string | null = null
    let customerSpeaker: string | null = null
    
    // First pass: identify likely technician based on introduction patterns
    for (let i = 0; i < Math.min(3, segments.length); i++) {
      const segment = segments[i]
      const text = segment.text?.toLowerCase() || ''
      
      if (text.includes('this is') && text.includes('from') || 
          text.includes('good morning') || text.includes('good afternoon') ||
          text.includes('technician') || text.includes('service')) {
        technicianSpeaker = segment.speaker
        break
      }
    }
    
    // Second pass: identify customer based on problem descriptions
    for (const segment of segments) {
      const text = segment.text?.toLowerCase() || ''
      
      if ((text.includes('my') || text.includes('our')) && 
          (text.includes('problem') || text.includes('issue') || text.includes('broken'))) {
        if (segment.speaker !== technicianSpeaker) {
          customerSpeaker = segment.speaker
          break
        }
      }
    }
    
    // If we couldn't identify clearly, use heuristics
    if (!technicianSpeaker || !customerSpeaker) {
      const speakerCounts = new Map<string, number>()
      segments.forEach(seg => {
        if (seg.speaker) {
          speakerCounts.set(seg.speaker, (speakerCounts.get(seg.speaker) || 0) + 1)
        }
      })
      
      const speakers = Array.from(speakerCounts.keys())
      if (speakers.length >= 2) {
        if (!technicianSpeaker) technicianSpeaker = speakers[0]
        if (!customerSpeaker) customerSpeaker = speakers[1]
      }
    }
    
    console.log('Speaker identification:', { technicianSpeaker, customerSpeaker })
    
    // Third pass: correct speaker assignments based on content
    return segments.map(segment => {
      const text = segment.text?.toLowerCase() || ''
      let correctedSpeaker = segment.speaker
      
      // Strong technician indicators
      if (text.includes('let me') || text.includes('i can') || text.includes('we offer') ||
          text.includes('system') || text.includes('repair') || text.includes('fix') ||
          text.includes('install') || text.includes('maintenance plan') ||
          text.includes('diagnosed') || text.includes('check')) {
        correctedSpeaker = technicianSpeaker || 'Technician'
      }
      // Strong customer indicators  
      else if ((text.includes('how much') || text.includes('cost') || text.includes('price')) ||
               (text.includes('thank you') || text.includes('sounds good')) ||
               (text.includes('my') && (text.includes('problem') || text.includes('issue'))) ||
               (text.includes('allergies') || text.includes('bills'))) {
        correctedSpeaker = customerSpeaker || 'Customer'
      }
      
      return {
        ...segment,
        speaker: correctedSpeaker
      }
    })
  }

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
      { role: 'system', content: 'Return only JSON objects. No markdown, no explanations.' },
      { role: 'user', content: combinedPrompt }
    ]

    const response = await this.makeRequest(messages, 0.1, true)
    
    try {
      const cleanedResponse = this.cleanJsonResponse(response)
      return JSON.parse(cleanedResponse)
    } catch (parseError) {
      throw new Error(`Combined analysis parsing failed: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`)
    }
  }

  async analyzeCompliance(segments: any[]): Promise<CallAnalysis['compliance']> {
    const analysisPrompt = `Analyze service call compliance. Return JSON:
{
  "introduction": {"present": boolean, "quality": "Excellent/Good/Fair/Poor", "notes": string},
  "diagnosis": {"present": boolean, "quality": "Excellent/Good/Fair/Poor", "notes": string},
  "solution": {"present": boolean, "quality": "Excellent/Good/Fair/Poor", "notes": string},
  "upsell": {"present": boolean, "quality": "Excellent/Good/Fair/Poor", "notes": string},
  "maintenance": {"present": boolean, "quality": "Excellent/Good/Fair/Poor", "notes": string},
  "closing": {"present": boolean, "quality": "Excellent/Good/Fair/Poor", "notes": string}
}

Data: ${JSON.stringify(segments.slice(0, 30), null, 0)}`

    const messages = [
      { role: 'system', content: 'Return only JSON objects. No markdown.' },
      { role: 'user', content: analysisPrompt }
    ]

    const response = await this.makeRequest(messages, 0.1, false)
    
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

    const response = await this.makeRequest(messages, 0.1, false)
    
    try {
      const cleanedResponse = this.cleanJsonResponse(response)
      return JSON.parse(cleanedResponse)
    } catch (parseError) {
      throw new Error(`Sales analysis parsing failed: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`)
    }
  }

  async analyzeServiceCall(transcript: string): Promise<CallAnalysis> {
    try {
      console.log('Starting fast OpenAI analysis...')
      
      // Step 1: Fast segmentation
      console.log('Step 1: Fast transcript segmentation...')
      const segments = await this.segmentTranscript(transcript)
      console.log(`Segmented into ${segments.length} parts`)

      // Step 2: Combined fast analysis
      console.log('Step 2: Combined compliance and sales analysis...')
      const combined = await this.analyzeCombined(segments)
      const compliance = combined.compliance
      const salesInsights = combined.salesInsights

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
}

// Test function for API key validation
export async function testOpenAIAPI(apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
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