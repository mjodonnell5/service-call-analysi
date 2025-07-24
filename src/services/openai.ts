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
    console.log('Raw response from OpenAI:', cleaned.substring(0, 200) + '...')
    
    // Remove markdown code blocks more aggressively
    cleaned = cleaned.replace(/^```json\s*\n?/gmi, '')
    cleaned = cleaned.replace(/^```\s*\n?/gm, '')
    cleaned = cleaned.replace(/\n?```\s*$/gm, '')
    cleaned = cleaned.replace(/^json\s*\n?/gmi, '')
    cleaned = cleaned.trim()
    
    // Remove any leading/trailing text that isn't JSON
    const jsonStart = Math.max(cleaned.indexOf('{'), cleaned.indexOf('['))
    const jsonEndBrace = cleaned.lastIndexOf('}')
    const jsonEndBracket = cleaned.lastIndexOf(']')
    const jsonEnd = Math.max(jsonEndBrace, jsonEndBracket)
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1)
    }
    
    // Fix common JSON issues
    cleaned = this.fixCommonJsonIssues(cleaned)
    
    // Try to parse the cleaned version
    try {
      JSON.parse(cleaned)
      console.log('Successfully cleaned JSON, length:', cleaned.length)
      return cleaned
    } catch (parseError) {
      console.log('Initial parse failed, attempting repairs...')
      
      // Attempt more aggressive repairs
      const repaired = this.repairTruncatedJson(cleaned)
      if (repaired) {
        console.log('Successfully repaired JSON')
        return repaired
      }
      
      console.error('All JSON repair attempts failed')
      throw new Error(`Could not extract valid JSON. Raw response: "${response.substring(0, 300)}..."`)
    }
  }

  private fixCommonJsonIssues(json: string): string {
    // Fix trailing commas
    json = json.replace(/,(\s*[}\]])/g, '$1')
    
    // Fix missing quotes around keys
    json = json.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    
    // Fix single quotes to double quotes
    json = json.replace(/'/g, '"')
    
    // Fix escaped quotes issues
    json = json.replace(/\\"/g, '\\"')
    
    return json
  }

  private repairTruncatedJson(json: string): string | null {
    try {
      // If it's an array, try to close it properly
      if (json.startsWith('[')) {
        // Find the last complete object
        let depth = 0
        let lastCompleteIndex = -1
        
        for (let i = 0; i < json.length; i++) {
          const char = json[i]
          if (char === '{') depth++
          else if (char === '}') {
            depth--
            if (depth === 0) {
              lastCompleteIndex = i
            }
          }
        }
        
        if (lastCompleteIndex > 0) {
          const truncated = json.substring(0, lastCompleteIndex + 1) + ']'
          JSON.parse(truncated) // Test if valid
          return truncated
        }
      }
      
      // If it's an object, try to close it properly
      if (json.startsWith('{')) {
        let depth = 0
        let lastCompleteIndex = -1
        
        for (let i = 0; i < json.length; i++) {
          const char = json[i]
          if (char === '{') depth++
          else if (char === '}') {
            depth--
            if (depth === 0) {
              lastCompleteIndex = i
              break
            }
          }
        }
        
        if (lastCompleteIndex > 0) {
          const truncated = json.substring(0, lastCompleteIndex + 1)
          JSON.parse(truncated) // Test if valid
          return truncated
        }
      }
      
    } catch (error) {
      console.log('Repair attempt failed:', error)
    }
    
    return null
  }

  private async makeRequest(messages: any[], temperature = 0.3, fastMode = true): Promise<any> {
    // Use faster model for most operations but increase token limits significantly
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
        max_tokens: fastMode ? 4096 : 4096 // Maximum tokens for complete responses
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
    // If transcript is very long, break it into smaller chunks
    const maxInputLength = 6000 // Reduced for better reliability
    
    if (transcript.length > maxInputLength) {
      console.log(`Transcript too long (${transcript.length} chars), processing in chunks...`)
      return await this.segmentTranscriptInChunks(transcript, maxInputLength)
    }
    
    // Enhanced prompt with stricter formatting requirements
    const prompt = `Segment this service call transcript into stages. Return ONLY a JSON array:

[
  {"speaker": "Technician", "timestamp": "0:00", "text": "Hello, this is John from ABC Service.", "stage": "introduction"},
  {"speaker": "Customer", "timestamp": "0:05", "text": "Hi, my system isn't working.", "stage": "diagnosis"}
]

STRICT RULES:
1. ONLY return the JSON array - NO markdown, NO explanations
2. Speaker: "Technician" or "Customer" only
3. Stages: MUST use one of: "introduction", "diagnosis", "solution", "upsell", "maintenance", "closing"
4. Every segment MUST have a valid stage
5. Keep text under 150 characters per segment
6. Use simple timestamps (M:SS format)

STAGE GUIDELINES:
- "introduction": Greetings, introductions, basic pleasantries
- "diagnosis": Problem identification, issue discussion, troubleshooting
- "solution": Fixing, repairing, explaining what was done
- "upsell": Additional services, upgrades, extra products offered
- "maintenance": Service plans, maintenance agreements, preventive care
- "closing": Thank yous, goodbyes, call wrap-up

IMPORTANT: Assign every segment to the most appropriate stage. If unsure, use:
- Early segments → "introduction" or "diagnosis"
- Middle segments → "diagnosis" or "solution"  
- Late segments → "solution", "upsell", "maintenance", or "closing"

TRANSCRIPT:
${transcript.substring(0, 5000)}`

    const messages = [
      { 
        role: 'system', 
        content: 'Return ONLY valid JSON arrays. No markdown, no explanations, no extra text.' 
      },
      { role: 'user', content: prompt }
    ]

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Segmentation attempt ${attempt}/3`)
        const response = await this.makeRequest(messages, 0.05, true) // Lower temperature for consistency
        
        const cleanedResponse = this.cleanJsonResponse(response)
        const segments = JSON.parse(cleanedResponse)
        
        if (!Array.isArray(segments)) {
          throw new Error(`Expected array, got ${typeof segments}`)
        }
        
        if (segments.length === 0) {
          throw new Error('Empty segments array returned')
        }
        
        // Validate and clean segment structure
        const validSegments = this.validateAndCleanSegments(segments)
        
        if (validSegments.length === 0) {
          throw new Error('No valid segments found after validation')
        }
        
        console.log('Valid segments before processing:', validSegments.length)
        console.log('Sample valid segment:', validSegments[0])
        
        // Post-process to fix speaker consistency and improve stage assignments
        const correctedSegments = this.correctSpeakerAssignments(validSegments)
        console.log('Segments after speaker correction:', correctedSegments.length)
        
        const finalSegments = this.improveStageAssignments(correctedSegments)
        console.log('Final segments after stage improvement:', finalSegments.length)
        
        // Debug stage distribution
        const stageDistribution = finalSegments.reduce((acc, seg) => {
          acc[seg.stage] = (acc[seg.stage] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        console.log('Final stage distribution:', stageDistribution)
        
        console.log(`Successfully parsed ${finalSegments.length} segments`)
        return finalSegments
        
      } catch (parseError) {
        console.error(`Attempt ${attempt}/3 failed:`, parseError)
        if (attempt === 3) {
          // Fallback to basic segmentation
          console.log('Falling back to basic segmentation...')
          return this.createBasicSegments(transcript)
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
    
    throw new Error('Segmentation failed after all retries')
  }

  private createBasicSegments(transcript: string): any[] {
    // Fallback segmentation when AI fails
    console.log('Creating basic segments from transcript...')
    
    const lines = transcript.split('\n').filter(line => line.trim())
    const segments: any[] = []
    let timeOffset = 0
    
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim()
      if (!trimmed || trimmed.length < 5) continue
      
      // Simple speaker detection
      let speaker = 'Customer'
      let text = trimmed
      
      // Check if line already has speaker label
      const speakerMatch = trimmed.match(/^(Technician|Customer|Tech|Cust|Speaker [AB12]|[\[\(]?\d{1,3}:\d{2}[\]\)]?):\s*(.+)/)
      if (speakerMatch) {
        const speakerType = speakerMatch[1].toLowerCase()
        speaker = speakerType.includes('tech') ? 'Technician' : 'Customer'
        text = speakerMatch[2]
      } else {
        // Infer speaker based on content
        const lowerText = text.toLowerCase()
        if (lowerText.includes('this is') || lowerText.includes('from') || 
            lowerText.includes('service') || lowerText.includes('technician') ||
            lowerText.includes('company') || lowerText.includes('repair') ||
            lowerText.includes('let me') || lowerText.includes('i can')) {
          speaker = 'Technician'
        }
      }
      
      // Enhanced stage detection based on position and content
      let stage = 'diagnosis' // Default
      const lowerText = text.toLowerCase()
      const isEarly = i < lines.length * 0.25
      const isLate = i > lines.length * 0.75
      
      // Introduction (early in call)
      if (isEarly && (lowerText.includes('hello') || lowerText.includes('good morning') || 
          lowerText.includes('good afternoon') || lowerText.includes('this is') || 
          lowerText.includes('calling from'))) {
        stage = 'introduction'
      }
      // Closing (late in call)
      else if (isLate && (lowerText.includes('thank') || lowerText.includes('goodbye') || 
          lowerText.includes('have a great') || lowerText.includes('take care') ||
          lowerText.includes('appreciate'))) {
        stage = 'closing'
      }
      // Problem discussion (early-mid call)
      else if (lowerText.includes('problem') || lowerText.includes('issue') || 
               lowerText.includes('broken') || lowerText.includes('not working') ||
               lowerText.includes('wrong') || lowerText.includes('stopped')) {
        stage = 'diagnosis'
      }
      // Solution discussion (mid call)
      else if (lowerText.includes('fix') || lowerText.includes('repair') || 
               lowerText.includes('replace') || lowerText.includes('install') ||
               lowerText.includes('solution') || lowerText.includes('found') ||
               lowerText.includes('needs') || lowerText.includes('recommend')) {
        stage = 'solution'
      }
      // Upsell opportunities
      else if (lowerText.includes('additional') || lowerText.includes('upgrade') || 
               lowerText.includes('also offer') || lowerText.includes('while i\'m here') ||
               lowerText.includes('consider') || lowerText.includes('package')) {
        stage = 'upsell'
      }
      // Maintenance discussion
      else if (lowerText.includes('maintenance') || lowerText.includes('service plan') ||
               lowerText.includes('annual') || lowerText.includes('preventive') ||
               lowerText.includes('agreement') || lowerText.includes('schedule')) {
        stage = 'maintenance'
      }
      
      segments.push({
        speaker,
        timestamp: `${Math.floor(timeOffset / 60)}:${(timeOffset % 60).toString().padStart(2, '0')}`,
        text: text.substring(0, 300), // Increased length for better context
        stage
      })
      
      timeOffset += 15 // Add 15 seconds per segment
    }
    
    // Post-process to ensure we have a better distribution of stages
    if (segments.length > 0) {
      const stageCount = segments.reduce((acc, seg) => {
        acc[seg.stage] = (acc[seg.stage] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      console.log('Basic stage distribution:', stageCount)
      
      // If we have no introduction, force the first segment to be introduction
      if (!stageCount.introduction && segments.length > 0) {
        segments[0].stage = 'introduction'
      }
      
      // If we have no closing, force the last segment to be closing if it makes sense
      if (!stageCount.closing && segments.length > 1) {
        const lastSegment = segments[segments.length - 1]
        const lastText = lastSegment.text.toLowerCase()
        if (lastText.includes('thank') || lastText.includes('good') || lastText.includes('bye')) {
          lastSegment.stage = 'closing'
        }
      }
    }
    
    console.log(`Created ${segments.length} basic segments`)
    return segments.length > 0 ? segments : [{
      speaker: 'Technician',
      timestamp: '0:00',
      text: 'Service call transcript processed',
      stage: 'introduction'
    }]
  }

  private validateAndCleanSegments(segments: any[]): any[] {
    return segments.filter(seg => {
      // Must have required fields
      if (!seg || typeof seg !== 'object') return false
      if (!seg.speaker || typeof seg.speaker !== 'string') return false
      if (!seg.text || typeof seg.text !== 'string') return false
      
      // Clean and normalize
      seg.speaker = seg.speaker.trim()
      seg.text = seg.text.trim()
      seg.timestamp = seg.timestamp || '00:00'
      
      // Ensure stage is valid - default to 'diagnosis' if missing or invalid
      const validStages = ['introduction', 'diagnosis', 'solution', 'upsell', 'maintenance', 'closing']
      if (!seg.stage || !validStages.includes(seg.stage)) {
        seg.stage = 'diagnosis' // Safe default
      }
      
      // Normalize speaker names
      const speaker = seg.speaker.toLowerCase()
      if (speaker.includes('tech') || speaker.includes('service') || speaker.includes('rep') ||
          speaker.includes('agent') || speaker.includes('field')) {
        seg.speaker = 'Technician'
      } else if (speaker.includes('customer') || speaker.includes('client') || speaker.includes('caller') ||
                 speaker.includes('homeowner') || speaker.includes('user')) {
        seg.speaker = 'Customer'
      } else {
        // Auto-detect based on content
        const text = seg.text.toLowerCase()
        if (text.includes('this is') && text.includes('from') || 
            text.includes('i can') || text.includes('we offer') ||
            text.includes('let me') || text.includes('system') ||
            text.includes('repair') || text.includes('service') ||
            text.includes('fix') || text.includes('install')) {
          seg.speaker = 'Technician'
        } else {
          seg.speaker = 'Customer'
        }
      }
      
      return seg.text.length > 3 // Filter out very short segments
    })
  }

  private improveStageAssignments(segments: any[]): any[] {
    // Use content analysis to improve stage assignments with more aggressive detection
    const processedSegments = segments.map((segment, index) => {
      const text = segment.text.toLowerCase()
      const isEarly = index < segments.length * 0.25
      const isLate = index > segments.length * 0.75
      const isMidEarly = index >= segments.length * 0.25 && index < segments.length * 0.5
      const isMidLate = index >= segments.length * 0.5 && index < segments.length * 0.75
      
      let stage = segment.stage || 'diagnosis' // Default fallback
      let confidence = 0
      
      // Introduction stage indicators (with higher priority in early segments)
      if (text.includes('hello') || text.includes('good morning') || text.includes('good afternoon') ||
          text.includes('this is') || text.includes('from') || text.includes('calling from') ||
          text.includes('my name is') || text.includes('i\'m')) {
        stage = 'introduction'
        confidence = isEarly ? 10 : 5
      }
      
      // Closing stage indicators (with higher priority in late segments)
      else if (text.includes('thank you') || text.includes('thanks') || text.includes('goodbye') ||
               text.includes('have a') || text.includes('take care') || text.includes('good day') ||
               text.includes('pleasure') || text.includes('appreciate')) {
        stage = 'closing'
        confidence = isLate ? 10 : 3
      }
      
      // Diagnosis stage indicators (strong throughout)
      else if (text.includes('problem') || text.includes('issue') || text.includes('wrong') ||
               text.includes('broken') || text.includes('not working') || text.includes('stopped') ||
               text.includes('won\'t') || text.includes('doesn\'t') || text.includes('trouble') ||
               text.includes('what\'s wrong') || text.includes('what happened')) {
        stage = 'diagnosis'
        confidence = 8
      }
      
      // Solution stage indicators (mid-conversation)
      else if (text.includes('fix') || text.includes('repair') || text.includes('replace') ||
               text.includes('install') || text.includes('solution') || text.includes('found') ||
               text.includes('diagnosed') || text.includes('identified') || text.includes('needs') ||
               text.includes('recommend') || text.includes('suggest') || text.includes('can do')) {
        stage = 'solution'
        confidence = isMidEarly || isMidLate ? 8 : 5
      }
      
      // Upsell stage indicators
      else if (text.includes('also offer') || text.includes('upgrade') || text.includes('additional') ||
               text.includes('while i\'m here') || text.includes('might want') || text.includes('consider') ||
               text.includes('could also') || text.includes('other services') || text.includes('package')) {
        stage = 'upsell'
        confidence = 7
      }
      
      // Maintenance stage indicators
      else if (text.includes('maintenance') || text.includes('service plan') || text.includes('agreement') ||
               text.includes('annual') || text.includes('yearly') || text.includes('regular') ||
               text.includes('preventive') || text.includes('schedule') || text.includes('check-up')) {
        stage = 'maintenance'
        confidence = 7
      }
      
      // Customer response patterns for better stage context
      else if (segment.speaker === 'Customer') {
        if (text.includes('how much') || text.includes('cost') || text.includes('price') ||
            text.includes('expensive') || text.includes('bill')) {
          // Customer asking about pricing - likely in solution/upsell phase
          stage = isMidLate ? 'upsell' : 'solution'
          confidence = 6
        } else if (text.includes('yes') || text.includes('okay') || text.includes('sounds good') ||
                   text.includes('that works') || text.includes('go ahead')) {
          // Customer agreement - maintain current stage or default
          confidence = 3
        }
      }
      
      return { ...segment, stage, confidence }
    })
    
    // Second pass: Use neighboring context to improve assignments
    return processedSegments.map((segment, index) => {
      // Look at neighboring segments for context
      const prevSegment = index > 0 ? processedSegments[index - 1] : null
      const nextSegment = index < processedSegments.length - 1 ? processedSegments[index + 1] : null
      
      // If this segment has low confidence, inherit from high-confidence neighbors
      if (segment.confidence < 4) {
        if (prevSegment && prevSegment.confidence > 6) {
          // Inherit from previous if it's high confidence and same speaker type
          if (prevSegment.speaker === segment.speaker) {
            segment.stage = prevSegment.stage
          }
        } else if (nextSegment && nextSegment.confidence > 6) {
          // Or inherit from next segment
          if (nextSegment.speaker === segment.speaker) {
            segment.stage = nextSegment.stage
          }
        }
      }
      
      // Remove confidence property before returning
      const { confidence, ...finalSegment } = segment
      return finalSegment
    })
  }

  private async segmentTranscriptInChunks(transcript: string, chunkSize: number): Promise<any[]> {
    const lines = transcript.split('\n').filter(line => line.trim())
    const chunks: string[] = []
    let currentChunk = ''
    
    // Split into chunks while trying to keep speaker turns together
    for (const line of lines) {
      if (currentChunk.length + line.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim())
        currentChunk = line
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }
    
    console.log(`Processing transcript in ${chunks.length} chunks`)
    
    const allSegments: any[] = []
    let timeOffset = 0
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}`)
      
      try {
        const chunkSegments = await this.segmentSingleChunk(chunks[i], timeOffset)
        allSegments.push(...chunkSegments)
        
        // Update time offset for next chunk
        if (chunkSegments.length > 0) {
          const lastTimestamp = chunkSegments[chunkSegments.length - 1].timestamp
          const [minutes, seconds] = lastTimestamp.split(':').map(Number)
          timeOffset = minutes * 60 + seconds + 10 // Add 10 seconds buffer
        }
        
      } catch (error) {
        console.error(`Chunk ${i + 1} failed:`, error)
        // Continue with other chunks
      }
    }
    
    console.log(`Combined ${allSegments.length} segments from ${chunks.length} chunks`)
    return allSegments
  }

  private async segmentSingleChunk(chunk: string, timeOffset: number): Promise<any[]> {
    const prompt = `Analyze this service call excerpt and return a JSON array. Each element needs: speaker, timestamp, text, stage.

Return ONLY a valid JSON array starting with [ and ending with ]. NO extra text:

${chunk}`

    const messages = [
      { 
        role: 'system', 
        content: 'Return only JSON arrays. No markdown, no explanations.' 
      },
      { role: 'user', content: prompt }
    ]

    const response = await this.makeRequest(messages, 0.1, true)
    const cleanedResponse = this.cleanJsonResponse(response)
    const segments = JSON.parse(cleanedResponse)
    
    // Adjust timestamps if needed
    return segments.map((seg: any) => ({
      ...seg,
      timestamp: this.adjustTimestamp(seg.timestamp, timeOffset)
    }))
  }

  private adjustTimestamp(timestamp: string, offset: number): string {
    if (!timestamp || typeof timestamp !== 'string') {
      return `${Math.floor(offset / 60)}:${(offset % 60).toString().padStart(2, '0')}`
    }
    
    const [minutes = 0, seconds = 0] = timestamp.split(':').map(Number)
    const totalSeconds = minutes * 60 + seconds + offset
    
    return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`
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
    // Use smaller segment set to avoid token limits - focus on key segments
    const limitedSegments = this.selectKeySegments(segments, 20)
    
    const combinedPrompt = `Analyze this service call transcript for compliance and sales. Return ONLY valid JSON:

{
  "compliance": {
    "introduction": {"present": true, "quality": "Good", "notes": "Brief analysis"},
    "diagnosis": {"present": true, "quality": "Good", "notes": "Brief analysis"},
    "solution": {"present": true, "quality": "Good", "notes": "Brief analysis"},
    "upsell": {"present": false, "quality": "Poor", "notes": "Brief analysis"},
    "maintenance": {"present": false, "quality": "Poor", "notes": "Brief analysis"},
    "closing": {"present": true, "quality": "Good", "notes": "Brief analysis"}
  },
  "salesInsights": {
    "opportunities": ["Brief opportunity 1", "Brief opportunity 2"],
    "successful": ["Brief success 1"],
    "missed": ["Brief missed opportunity 1"]
  }
}

RULES:
- Quality: "Excellent", "Good", "Fair", "Poor" only
- Notes: under 40 chars each
- ONLY return JSON - no markdown, no explanations
- Arrays can be empty []

Call segments: ${JSON.stringify(limitedSegments)}`

    const messages = [
      { 
        role: 'system', 
        content: 'You are a JSON-only response system. Return ONLY valid JSON objects without markdown formatting, explanations, or additional text. Your entire response must be parseable as JSON.' 
      },
      { role: 'user', content: combinedPrompt }
    ]

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Combined analysis attempt ${attempt}/3`)
        const response = await this.makeRequest(messages, 0.1, true)
        
        // Enhanced JSON cleaning for truncated responses
        const cleanedResponse = this.cleanJsonResponse(response)
        
        // Try to parse, with fallback for truncated responses
        let parsed
        try {
          parsed = JSON.parse(cleanedResponse)
        } catch (parseError) {
          console.log('Direct parse failed, attempting truncation repair...')
          const repairedJson = this.repairTruncatedAnalysis(cleanedResponse)
          if (repairedJson) {
            parsed = JSON.parse(repairedJson)
          } else {
            throw parseError
          }
        }
        
        // Validate structure and provide defaults
        const result = this.validateAndFixCombinedAnalysis(parsed)
        console.log('Combined analysis completed successfully')
        return result
        
      } catch (parseError) {
        console.error(`Combined analysis attempt ${attempt}/3 failed:`, parseError)
        if (attempt === 3) {
          console.log('All attempts failed, using fallback analysis...')
          return this.createFallbackCombinedAnalysis(segments)
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
    
    throw new Error('Combined analysis failed after all retries')
  }

  private selectKeySegments(segments: any[], maxSegments: number): any[] {
    if (segments.length <= maxSegments) {
      return segments
    }
    
    // Prioritize segments that contain key information
    const prioritySegments: any[] = []
    const regularSegments: any[] = []
    
    segments.forEach(segment => {
      const text = segment.text?.toLowerCase() || ''
      const isKeySegment = 
        text.includes('hello') || text.includes('good morning') || // Introduction
        text.includes('problem') || text.includes('issue') || // Diagnosis
        text.includes('fix') || text.includes('repair') || // Solution
        text.includes('additional') || text.includes('upgrade') || // Upsell
        text.includes('maintenance') || text.includes('service plan') || // Maintenance
        text.includes('thank you') || text.includes('goodbye') // Closing
      
      if (isKeySegment) {
        prioritySegments.push(segment)
      } else {
        regularSegments.push(segment)
      }
    })
    
    // Include all priority segments plus fill remainder with regular segments
    const result = [...prioritySegments]
    const remainingSlots = maxSegments - prioritySegments.length
    if (remainingSlots > 0) {
      // Take segments from beginning, middle, and end for balanced coverage
      const step = Math.max(1, Math.floor(regularSegments.length / remainingSlots))
      for (let i = 0; i < regularSegments.length && result.length < maxSegments; i += step) {
        result.push(regularSegments[i])
      }
    }
    
    return result.slice(0, maxSegments)
  }

  private repairTruncatedAnalysis(jsonStr: string): string | null {
    try {
      // If the JSON is truncated, try to complete it
      if (!jsonStr.includes('"salesInsights"')) {
        // Find the last complete compliance stage
        let lastCompleteStage = ''
        const stages = ['introduction', 'diagnosis', 'solution', 'upsell', 'maintenance', 'closing']
        
        for (const stage of stages.reverse()) {
          if (jsonStr.includes(`"${stage}"`)) {
            lastCompleteStage = stage
            break
          }
        }
        
        if (lastCompleteStage) {
          // Try to find the end of the last complete stage
          const stagePattern = new RegExp(`"${lastCompleteStage}"\\s*:\\s*{[^}]*}`, 'g')
          const matches = jsonStr.match(stagePattern)
          if (matches) {
            const lastMatch = matches[matches.length - 1]
            const endIndex = jsonStr.lastIndexOf(lastMatch) + lastMatch.length
            
            // Complete the truncated JSON
            let completed = jsonStr.substring(0, endIndex)
            
            // Add missing stages
            const missingStages = stages.filter(s => !completed.includes(`"${s}"`))
            for (const stage of missingStages) {
              completed += `,\n    "${stage}": {"present": false, "quality": "Poor", "notes": "Not detected"}`
            }
            
            // Add sales insights
            completed += `\n  },\n  "salesInsights": {\n    "opportunities": [],\n    "successful": [],\n    "missed": []\n  }\n}`
            
            // Test if valid
            JSON.parse(completed)
            return completed
          }
        }
      }
      
      // If it has compliance but truncated salesInsights
      if (jsonStr.includes('"compliance"') && !jsonStr.includes('"missed"')) {
        // Find where to add the closing
        const lastBrace = jsonStr.lastIndexOf('}')
        if (lastBrace > 0) {
          let completed = jsonStr.substring(0, lastBrace)
          
          // Ensure compliance is properly closed
          if (!completed.includes('"salesInsights"')) {
            completed += `\n  },\n  "salesInsights": {\n    "opportunities": [],\n    "successful": [],\n    "missed": []\n  }\n}`
          } else {
            completed += '\n  }\n}'
          }
          
          // Test if valid
          JSON.parse(completed)
          return completed
        }
      }
      
    } catch (error) {
      console.log('Repair attempt failed:', error)
    }
    
    return null
  }

  private validateAndFixCombinedAnalysis(parsed: any): {
    compliance: CallAnalysis['compliance'],
    salesInsights: CallAnalysis['salesInsights']
  } {
    const defaultStage = { present: false, quality: "Poor", notes: "Not detected in call" }
    const stages = ['introduction', 'diagnosis', 'solution', 'upsell', 'maintenance', 'closing']
    
    // Fix compliance structure
    const compliance: any = {}
    for (const stage of stages) {
      if (parsed.compliance && parsed.compliance[stage]) {
        const existing = parsed.compliance[stage]
        compliance[stage] = {
          present: Boolean(existing.present),
          quality: ['Excellent', 'Good', 'Fair', 'Poor'].includes(existing.quality) ? existing.quality : 'Poor',
          notes: String(existing.notes || '').substring(0, 100) || 'No analysis available'
        }
      } else {
        compliance[stage] = { ...defaultStage }
      }
    }
    
    // Fix sales insights structure
    const salesInsights = {
      opportunities: Array.isArray(parsed.salesInsights?.opportunities) ? 
        parsed.salesInsights.opportunities.slice(0, 10) : [],
      successful: Array.isArray(parsed.salesInsights?.successful) ? 
        parsed.salesInsights.successful.slice(0, 10) : [],
      missed: Array.isArray(parsed.salesInsights?.missed) ? 
        parsed.salesInsights.missed.slice(0, 10) : []
    }
    
    return { compliance, salesInsights }
  }

  private createFallbackCombinedAnalysis(segments: any[]): {
    compliance: CallAnalysis['compliance'],
    salesInsights: CallAnalysis['salesInsights']
  } {
    console.log('Creating fallback combined analysis from segments...')
    
    // Basic content analysis for fallback
    const fullText = segments.map(s => s.text).join(' ').toLowerCase()
    
    const compliance = {
      introduction: {
        present: fullText.includes('hello') || fullText.includes('this is') || fullText.includes('good'),
        quality: "Fair" as const,
        notes: "Basic greeting detected"
      },
      diagnosis: {
        present: fullText.includes('problem') || fullText.includes('issue') || fullText.includes('wrong'),
        quality: "Fair" as const,
        notes: "Problem discussion identified"
      },
      solution: {
        present: fullText.includes('fix') || fullText.includes('repair') || fullText.includes('solution'),
        quality: "Fair" as const,
        notes: "Solution discussion present"
      },
      upsell: {
        present: fullText.includes('also') || fullText.includes('additional') || fullText.includes('upgrade'),
        quality: "Poor" as const,
        notes: "Limited upsell activity"
      },
      maintenance: {
        present: fullText.includes('maintenance') || fullText.includes('service plan'),
        quality: "Poor" as const,
        notes: "Maintenance not prominently discussed"
      },
      closing: {
        present: fullText.includes('thank') || fullText.includes('goodbye') || fullText.includes('take care'),
        quality: "Fair" as const,
        notes: "Call closure present"
      }
    }
    
    const salesInsights = {
      opportunities: fullText.includes('additional') ? ["Additional service opportunities mentioned"] : [],
      successful: fullText.includes('thank') ? ["Customer satisfaction indicated"] : [],
      missed: ["Detailed analysis not available in fallback mode"]
    }
    
    return { compliance, salesInsights }
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