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
    console.log('Raw response length:', cleaned.length)
    console.log('Raw response preview:', cleaned.substring(0, 500) + (cleaned.length > 500 ? '...' : ''))
    
    // Step 1: Remove markdown code blocks completely
    cleaned = cleaned.replace(/```json\s*\n?/gi, '')
    cleaned = cleaned.replace(/```\s*\n?/g, '')
    cleaned = cleaned.replace(/^json\s*\n?/gmi, '')
    cleaned = cleaned.trim()
    
    // Step 2: Find JSON boundaries more reliably
    let jsonStart = -1
    let jsonEnd = -1
    
    // Look for array start
    const arrayStart = cleaned.indexOf('[')
    const objectStart = cleaned.indexOf('{')
    
    if (arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart)) {
      jsonStart = arrayStart
      // Find matching closing bracket
      let depth = 0
      for (let i = arrayStart; i < cleaned.length; i++) {
        if (cleaned[i] === '[') depth++
        else if (cleaned[i] === ']') {
          depth--
          if (depth === 0) {
            jsonEnd = i
            break
          }
        }
      }
    } else if (objectStart !== -1) {
      jsonStart = objectStart
      // Find matching closing brace
      let depth = 0
      for (let i = objectStart; i < cleaned.length; i++) {
        if (cleaned[i] === '{') depth++
        else if (cleaned[i] === '}') {
          depth--
          if (depth === 0) {
            jsonEnd = i
            break
          }
        }
      }
    }
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1)
    }
    
    // Step 3: Fix common JSON syntax issues
    cleaned = this.fixCommonJsonIssues(cleaned)
    
    // Step 4: Validate and return
    try {
      const parsed = JSON.parse(cleaned)
      console.log('Successfully parsed JSON:', typeof parsed, Array.isArray(parsed) ? `array with ${parsed.length} items` : 'object')
      return cleaned
    } catch (parseError) {
      console.error('JSON parse error after cleaning:', parseError)
      console.log('Failed JSON content:', cleaned.substring(0, 1000))
      
      // Last resort: try to repair truncated JSON
      const repaired = this.repairTruncatedJson(cleaned)
      if (repaired) {
        console.log('Successfully repaired truncated JSON')
        return repaired
      }
      
      throw new Error(`Could not parse JSON response. Error: ${parseError instanceof Error ? parseError.message : 'Unknown'}. Content preview: "${cleaned.substring(0, 300)}..."`)
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

  private repairTruncatedAnalysis(json: string): string | null {
    try {
      console.log('Attempting to repair truncated analysis JSON...')
      
      // Common structure for analysis response
      const template = {
        compliance: {
          introduction: { present: true, quality: "Fair", notes: "Analysis incomplete" },
          diagnosis: { present: true, quality: "Fair", notes: "Analysis incomplete" },
          solution: { present: true, quality: "Fair", notes: "Analysis incomplete" },
          upsell: { present: false, quality: "Poor", notes: "Analysis incomplete" },
          maintenance: { present: false, quality: "Poor", notes: "Analysis incomplete" },
          closing: { present: true, quality: "Fair", notes: "Analysis incomplete" }
        },
        salesInsights: {
          opportunities: [],
          successful: [],
          missed: []
        }
      }
      
      // Try to parse partially and fill in missing parts
      let repaired = json.trim()
      
      // If it starts with { but doesn't end properly, try to close it
      if (repaired.startsWith('{')) {
        let depth = 0
        let lastValidIndex = -1
        
        for (let i = 0; i < repaired.length; i++) {
          const char = repaired[i]
          if (char === '{') depth++
          else if (char === '}') {
            depth--
            if (depth >= 0) lastValidIndex = i
          }
        }
        
        // Truncate to last valid closing brace and try to parse
        if (lastValidIndex > 0) {
          const truncated = repaired.substring(0, lastValidIndex + 1)
          try {
            const partial = JSON.parse(truncated)
            
            // Merge with template to fill missing parts
            const merged = {
              compliance: { ...template.compliance, ...(partial.compliance || {}) },
              salesInsights: { ...template.salesInsights, ...(partial.salesInsights || {}) }
            }
            
            console.log('Successfully repaired truncated JSON with template merge')
            return JSON.stringify(merged)
          } catch (e) {
            console.log('Template merge approach failed')
          }
        }
      }
      
      // If all else fails, return minimal valid structure
      console.log('Using minimal fallback structure')
      return JSON.stringify(template)
      
    } catch (error) {
      console.error('Repair failed:', error)
      return null
    }
  }

  private repairTruncatedJson(json: string): string | null {
    try {
      // For arrays - try to close properly
      if (json.startsWith('[')) {
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
      
      // For objects - delegate to analysis repair method
      return this.repairTruncatedAnalysis(json)
      
    } catch (error) {
      console.log('Basic JSON repair failed:', error)
      return null
    }
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

  /**
   * Parse markdown transcript into structured segments
   */
  private async parseMarkdownTranscript(markdown: string): Promise<any[]> {
    console.log('Parsing markdown transcript into segments...')
    console.log('Markdown input length:', markdown.length)
    console.log('Markdown preview:', markdown.substring(0, 500))
    
    const lines = markdown.split('\n')
    const segments: any[] = []
    let currentSpeaker = ''
    let currentText = ''
    let currentTimestamp = ''
    let exchangeIndex = 0
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Skip empty lines and certain markdown formatting
      if (!trimmed || trimmed.startsWith('#') || trimmed === '---') {
        continue
      }
      
      // Check for exchange headers like "### Exchange 1: Technician"
      const exchangeMatch = trimmed.match(/^### Exchange \d+: (Technician|Customer)/)
      if (exchangeMatch) {
        // Save previous segment if exists
        if (currentSpeaker && currentText.trim()) {
          segments.push({
            speaker: currentSpeaker,
            text: currentText.trim(),
            timestamp: currentTimestamp || `${Math.floor(exchangeIndex * 0.5)}:${(exchangeIndex * 30 % 60).toString().padStart(2, '0')}`,
            stage: this.determineStage(currentText, exchangeIndex, segments.length)
          })
          exchangeIndex++
        }
        
        // Start new segment
        currentSpeaker = exchangeMatch[1]
        currentText = ''
        currentTimestamp = ''
        console.log(`Found exchange header: ${exchangeMatch[1]}`)
        continue
      }
      
      // Check for timestamp lines like "**Time:** 1:30"
      const timeMatch = trimmed.match(/^\*\*Time:\*\* (.+)/)
      if (timeMatch) {
        currentTimestamp = timeMatch[1]
        console.log(`Found timestamp: ${timeMatch[1]}`)
        continue
      }
      
      // Skip other markdown metadata lines
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        continue
      }
      
      // Regular content line - add to current text
      if (currentSpeaker && trimmed) {
        if (currentText) currentText += ' '
        currentText += trimmed
      }
    }
    
    // Don't forget the last segment
    if (currentSpeaker && currentText.trim()) {
      segments.push({
        speaker: currentSpeaker,
        text: currentText.trim(),
        timestamp: currentTimestamp || `${Math.floor(exchangeIndex * 0.5)}:${(exchangeIndex * 30 % 60).toString().padStart(2, '0')}`,
        stage: this.determineStage(currentText, exchangeIndex, segments.length)
      })
    }
    
    console.log(`Parsed ${segments.length} segments from markdown`)
    if (segments.length === 0) {
      console.error('No segments parsed! Debugging markdown structure...')
      console.log('Lines containing "Exchange":', lines.filter(l => l.includes('Exchange')))
      console.log('Lines containing "Technician":', lines.filter(l => l.includes('Technician')))
      console.log('Lines containing "Customer":', lines.filter(l => l.includes('Customer')))
      console.log('First 20 lines:', lines.slice(0, 20))
    } else {
      console.log('Sample parsed segments:', segments.slice(0, 2).map(s => ({
        speaker: s.speaker,
        timestamp: s.timestamp,
        stage: s.stage,
        text_preview: s.text.substring(0, 100) + '...'
      })))
    }
    
    return segments
  }

  /**
   * Determine the likely stage for a text segment based on content and position
   */
  private determineStage(text: string, index: number, totalSegments: number): string {
    const lowerText = text.toLowerCase()
    const position = totalSegments > 0 ? index / Math.max(totalSegments - 1, 1) : 0
    
    // Introduction indicators
    if (lowerText.includes('hello') || lowerText.includes('good morning') || 
        lowerText.includes('this is') || lowerText.includes('from') ||
        index === 0) {
      return 'introduction'
    }
    
    // Closing indicators
    if (lowerText.includes('thank you') || lowerText.includes('goodbye') || 
        lowerText.includes('take care') || lowerText.includes('have a') ||
        position > 0.8) {
      return 'closing'
    }
    
    // Problem diagnosis indicators
    if (lowerText.includes('problem') || lowerText.includes('issue') || 
        lowerText.includes('not working') || lowerText.includes('broken') ||
        lowerText.includes('what seems')) {
      return 'diagnosis'
    }
    
    // Solution indicators
    if (lowerText.includes('fix') || lowerText.includes('repair') || 
        lowerText.includes('replace') || lowerText.includes('solution') ||
        lowerText.includes('install')) {
      return 'solution'
    }
    
    // Upsell indicators
    if (lowerText.includes('additional') || lowerText.includes('upgrade') || 
        lowerText.includes('also recommend') || lowerText.includes('better option') ||
        lowerText.includes('premium')) {
      return 'upsell'
    }
    
    // Maintenance indicators
    if (lowerText.includes('maintenance') || lowerText.includes('service plan') || 
        lowerText.includes('regular') || lowerText.includes('annual') ||
        lowerText.includes('prevent')) {
      return 'maintenance'
    }
    
    // Default based on position
    if (position < 0.2) return 'introduction'
    if (position < 0.4) return 'diagnosis'
    if (position < 0.6) return 'solution'
    if (position < 0.8) return 'upsell'
    return 'closing'
  }

  async segmentTranscript(transcript: string): Promise<any[]> {
    if (!transcript || transcript.trim().length === 0) {
      console.warn('Empty transcript provided to segmentTranscript')
      return this.createBasicSegments(transcript)
    }
    
    console.log(`Starting transcript segmentation. Length: ${transcript.length} chars`)
    
    // If transcript is very long, break it into smaller chunks
    const maxInputLength = 5000 // Smaller chunks for more reliable processing
    
    if (transcript.length > maxInputLength) {
      console.log(`Transcript too long (${transcript.length} chars), processing in chunks...`)
      try {
        const chunks = await this.segmentTranscriptInChunks(transcript, maxInputLength)
        if (chunks.length > 0) {
          console.log(`Successfully processed ${chunks.length} segments from chunks`)
          return chunks
        } else {
          console.warn('Chunk processing returned empty, falling back to basic segmentation')
          return this.createBasicSegments(transcript)
        }
      } catch (chunkError) {
        console.error('Chunk processing failed:', chunkError)
        console.log('Falling back to basic segmentation due to chunk error')
        return this.createBasicSegments(transcript)
      }
    }
    
    // Enhanced prompt with better structure for reliability
    const prompt = `Parse this service call transcript and return a JSON array of segments.

CRITICAL: Return ONLY the JSON array. No markdown, no explanations.

Example format:
[
  {"speaker": "Technician", "timestamp": "0:00", "text": "Hello, this is John from ABC Service", "stage": "introduction"},
  {"speaker": "Customer", "timestamp": "0:05", "text": "Hi, my system isn't working", "stage": "diagnosis"}
]

Requirements:
- speaker: "Technician" or "Customer" only
- timestamp: format "MM:SS" 
- text: actual spoken words (under 300 chars)
- stage: "introduction", "diagnosis", "solution", "upsell", "maintenance", or "closing" only
- Create 4-20 segments total (aim for meaningful exchanges)

Transcript to parse:
${transcript.substring(0, 4500)}`

    const messages = [
      { 
        role: 'system', 
        content: 'You are a strict JSON-only response system. Return ONLY valid JSON arrays. Never use markdown formatting, code blocks, explanations, or any text outside the JSON structure.' 
      },
      { role: 'user', content: prompt }
    ]

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`AI segmentation attempt ${attempt}/3`)
        const response = await this.makeRequest(messages, 0.05, true) // Very low temperature for consistency
        
        if (!response || response.trim().length === 0) {
          throw new Error('Empty response from OpenAI')
        }
        
        console.log('Raw AI response length:', response.length)
        console.log('Raw AI response preview:', response.substring(0, 200))
        
        const cleanedResponse = this.cleanJsonResponse(response)
        const segments = JSON.parse(cleanedResponse)
        
        if (!Array.isArray(segments)) {
          throw new Error(`Expected array, got ${typeof segments}`)
        }
        
        if (segments.length === 0) {
          throw new Error('Empty segments array returned from AI')
        }
        
        console.log(`AI returned ${segments.length} raw segments`)
        
        // Validate and clean segment structure
        const validSegments = this.validateAndCleanSegments(segments)
        
        if (validSegments.length === 0) {
          throw new Error('No valid segments found after validation')
        }
        
        console.log(`${validSegments.length} segments passed validation`)
        
        // Post-process to fix speaker consistency and improve stage assignments
        const correctedSegments = this.correctSpeakerAssignments(validSegments)
        const finalSegments = this.improveStageAssignments(correctedSegments)
        
        // Debug stage distribution
        const stageDistribution = finalSegments.reduce((acc, seg) => {
          acc[seg.stage] = (acc[seg.stage] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        console.log('Final AI stage distribution:', stageDistribution)
        
        if (finalSegments.length === 0) {
          throw new Error('Post-processing resulted in no segments')
        }
        
        console.log(`Successfully processed ${finalSegments.length} segments via AI`)
        return finalSegments
        
      } catch (parseError) {
        console.error(`AI segmentation attempt ${attempt}/3 failed:`, parseError)
        
        if (attempt === 3) {
          console.log('All AI attempts failed, falling back to basic segmentation...')
          const basicSegments = this.createBasicSegments(transcript)
          console.log(`Basic segmentation produced ${basicSegments.length} segments`)
          return basicSegments
        }
        
        // Exponential backoff before retry
        const delay = 1000 * attempt
        console.log(`Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    // This should never be reached due to the fallback in the loop, but just in case
    console.error('Segmentation completely failed, creating emergency fallback')
    return this.createBasicSegments(transcript)
  }

  private createBasicSegments(transcript: string): any[] {
    // Fallback segmentation when AI fails
    console.log('Creating basic segments from transcript...')
    console.log('Transcript input length:', transcript?.length || 0)
    console.log('Transcript preview:', transcript?.substring(0, 200) || 'Empty transcript')
    
    if (!transcript || transcript.trim().length === 0) {
      console.warn('Empty transcript, creating minimal fallback segment')
      return [{
        speaker: 'Technician',
        timestamp: '0:00',
        text: 'Empty transcript provided',
        stage: 'introduction'
      }]
    }
    
    // Try multiple splitting strategies to handle different transcript formats
    let lines: string[] = []
    
    // Strategy 1: Split by lines
    lines = transcript.split('\n').filter(line => line.trim())
    
    // Strategy 2: If not many lines, try splitting by periods or double spaces
    if (lines.length < 3) {
      const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10)
      if (sentences.length > lines.length) {
        lines = sentences
        console.log('Using sentence-based splitting')
      }
    }
    
    // Strategy 3: If still not many pieces, try speaker patterns from AssemblyAI
    if (lines.length < 3) {
      const speakerPattern = /Speaker [AB12]:/gi
      if (speakerPattern.test(transcript)) {
        lines = transcript.split(speakerPattern).filter(s => s.trim().length > 5)
        console.log('Using speaker pattern splitting')
      }
    }
    
    // Strategy 4: If all else fails, split by length
    if (lines.length < 3) {
      const chunkSize = Math.max(100, Math.floor(transcript.length / 8))
      lines = []
      for (let i = 0; i < transcript.length; i += chunkSize) {
        const chunk = transcript.substring(i, i + chunkSize).trim()
        if (chunk.length > 10) {
          lines.push(chunk)
        }
      }
      console.log('Using length-based splitting')
    }
    
    console.log(`Processing ${lines.length} text segments`)
    
    const segments: any[] = []
    let timeOffset = 0
    
    // Ensure we have at least one segment
    if (lines.length === 0) {
      console.warn('No processable lines found, creating single segment from full transcript')
      lines = [transcript.substring(0, 500)] // Take first 500 chars
    }
    
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim()
      if (!trimmed || trimmed.length < 3) continue
      
      // Simple speaker detection with more patterns
      let speaker = 'Customer'
      let text = trimmed
      
      // Check for existing speaker labels (multiple formats)
      const speakerMatch = trimmed.match(/^(Technician|Customer|Tech|Cust|Agent|Service|Rep|Speaker [AB12]|[\[\(]?\d{1,3}:\d{2}[\]\)]?):\s*(.+)/)
      if (speakerMatch) {
        const speakerType = speakerMatch[1].toLowerCase()
        speaker = (speakerType.includes('tech') || speakerType.includes('service') || 
                   speakerType.includes('agent') || speakerType.includes('rep')) ? 'Technician' : 'Customer'
        text = speakerMatch[2]
      } else {
        // Infer speaker based on content with more patterns
        const lowerText = text.toLowerCase()
        if (lowerText.includes('this is') && (lowerText.includes('from') || lowerText.includes('with')) || 
            lowerText.includes('service') || lowerText.includes('technician') ||
            lowerText.includes('company') || lowerText.includes('repair') ||
            lowerText.includes('let me') || lowerText.includes('i can') ||
            lowerText.includes('we offer') || lowerText.includes('our service') ||
            lowerText.includes('schedule') || lowerText.includes('diagnosis')) {
          speaker = 'Technician'
        }
      }
      
      // Enhanced stage detection based on position and content
      let stage = 'diagnosis' // Default
      const lowerText = text.toLowerCase()
      const isEarly = i < lines.length * 0.3
      const isLate = i > lines.length * 0.7
      const isMid = !isEarly && !isLate
      
      // Introduction (early in call)
      if (isEarly && (lowerText.includes('hello') || lowerText.includes('good morning') || 
          lowerText.includes('good afternoon') || lowerText.includes('this is') || 
          lowerText.includes('calling from') || lowerText.includes('my name is'))) {
        stage = 'introduction'
      }
      // Closing (late in call)
      else if (isLate && (lowerText.includes('thank') || lowerText.includes('goodbye') || 
          lowerText.includes('have a great') || lowerText.includes('take care') ||
          lowerText.includes('appreciate') || lowerText.includes('pleasure') ||
          lowerText.includes('have a good'))) {
        stage = 'closing'
      }
      // Problem discussion
      else if (lowerText.includes('problem') || lowerText.includes('issue') || 
               lowerText.includes('broken') || lowerText.includes('not working') ||
               lowerText.includes('wrong') || lowerText.includes('stopped') ||
               lowerText.includes('error') || lowerText.includes('fault')) {
        stage = 'diagnosis'
      }
      // Solution discussion
      else if (lowerText.includes('fix') || lowerText.includes('repair') || 
               lowerText.includes('replace') || lowerText.includes('install') ||
               lowerText.includes('solution') || lowerText.includes('found') ||
               lowerText.includes('needs') || lowerText.includes('recommend') ||
               lowerText.includes('should') || lowerText.includes('will')) {
        stage = 'solution'
      }
      // Upsell opportunities
      else if (lowerText.includes('additional') || lowerText.includes('upgrade') || 
               lowerText.includes('also offer') || lowerText.includes('while i\'m here') ||
               lowerText.includes('consider') || lowerText.includes('package') ||
               lowerText.includes('might want') || lowerText.includes('other')) {
        stage = 'upsell'
      }
      // Maintenance discussion
      else if (lowerText.includes('maintenance') || lowerText.includes('service plan') ||
               lowerText.includes('annual') || lowerText.includes('preventive') ||
               lowerText.includes('agreement') || lowerText.includes('schedule') ||
               lowerText.includes('regular') || lowerText.includes('contract')) {
        stage = 'maintenance'
      }
      
      segments.push({
        speaker,
        timestamp: `${Math.floor(timeOffset / 60)}:${(timeOffset % 60).toString().padStart(2, '0')}`,
        text: text.substring(0, 400), // Increased for more context
        stage
      })
      
      timeOffset += Math.max(10, Math.floor(300 / Math.max(lines.length, 1))) // Dynamic timing
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
        console.log('Forced first segment to introduction')
      }
      
      // If we have no closing, force the last segment to be closing if it makes sense
      if (!stageCount.closing && segments.length > 1) {
        const lastSegment = segments[segments.length - 1]
        const lastText = lastSegment.text.toLowerCase()
        if (lastText.includes('thank') || lastText.includes('good') || lastText.includes('bye') ||
            lastText.includes('pleasure') || lastText.includes('care')) {
          lastSegment.stage = 'closing'
          console.log('Forced last segment to closing')
        }
      }
      
      // Ensure at least some variety in stages
      const uniqueStages = new Set(segments.map(s => s.stage))
      if (uniqueStages.size < 3 && segments.length > 3) {
        // Add some variety by changing middle segments
        const midPoint = Math.floor(segments.length / 2)
        if (segments[midPoint]) {
          segments[midPoint].stage = 'solution'
        }
        if (segments.length > 4 && segments[midPoint + 1]) {
          segments[midPoint + 1].stage = 'upsell'
        }
        console.log('Added stage variety for better distribution')
      }
    }
    
    console.log(`Created ${segments.length} basic segments`)
    
    // Guarantee we return at least one segment
    if (segments.length === 0) {
      console.warn('No segments created, providing emergency fallback')
      return [{
        speaker: 'Technician',
        timestamp: '0:00',
        text: transcript.substring(0, 200) || 'Service call transcript processed',
        stage: 'introduction'
      }]
    }
    
    return segments
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
    if (!transcript || transcript.trim().length === 0) {
      console.warn('Empty transcript provided to chunk processing')
      return this.createBasicSegments(transcript)
    }
    
    console.log(`Chunking transcript (${transcript.length} chars) with chunk size ${chunkSize}`)
    
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
    
    // If we couldn't split into chunks properly, fall back to basic segmentation
    if (chunks.length === 0) {
      console.warn('Could not create chunks, falling back to basic segmentation')
      return this.createBasicSegments(transcript)
    }
    
    console.log(`Processing transcript in ${chunks.length} chunks`)
    
    const allSegments: any[] = []
    let timeOffset = 0
    let successfulChunks = 0
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`)
      
      try {
        const chunkSegments = await this.segmentSingleChunk(chunks[i], timeOffset)
        
        if (chunkSegments && chunkSegments.length > 0) {
          allSegments.push(...chunkSegments)
          successfulChunks++
          
          // Update time offset for next chunk
          const lastTimestamp = chunkSegments[chunkSegments.length - 1].timestamp
          const [minutes, seconds] = lastTimestamp.split(':').map(Number)
          timeOffset = minutes * 60 + seconds + 15 // Add 15 seconds buffer
        } else {
          console.warn(`Chunk ${i + 1} produced no segments`)
        }
        
      } catch (error) {
        console.error(`Chunk ${i + 1} failed:`, error)
        
        // Try basic segmentation on this chunk as fallback
        try {
          console.log(`Attempting basic segmentation on chunk ${i + 1}`)
          const basicSegments = this.createBasicSegments(chunks[i])
          if (basicSegments.length > 0) {
            // Adjust timestamps for these segments
            basicSegments.forEach(seg => {
              seg.timestamp = this.adjustTimestamp(seg.timestamp, timeOffset)
            })
            allSegments.push(...basicSegments)
            timeOffset += basicSegments.length * 20 // Rough time estimate
          }
        } catch (basicError) {
          console.error(`Basic segmentation also failed for chunk ${i + 1}:`, basicError)
          // Continue with other chunks
        }
      }
    }
    
    console.log(`Combined ${allSegments.length} segments from ${chunks.length} chunks (${successfulChunks} successful)`)
    
    // If we got very few segments, fall back to basic segmentation of entire transcript
    if (allSegments.length < 3) {
      console.warn(`Only ${allSegments.length} segments from chunking, falling back to basic segmentation`)
      return this.createBasicSegments(transcript)
    }
    
    return allSegments
  }

  private async segmentSingleChunk(chunk: string, timeOffset: number): Promise<any[]> {
    if (!chunk || chunk.trim().length === 0) {
      console.warn('Empty chunk provided to segmentSingleChunk')
      return []
    }
    
    const prompt = `Parse this service call excerpt and return ONLY a JSON array of segments.

Required format (NO other text):
[
  {"speaker": "Technician", "timestamp": "0:00", "text": "Hello there", "stage": "introduction"},
  {"speaker": "Customer", "timestamp": "0:05", "text": "Hi, I need help", "stage": "diagnosis"}
]

Rules:
- speaker: "Technician" or "Customer" only
- timestamp: "MM:SS" format
- stage: "introduction", "diagnosis", "solution", "upsell", "maintenance", or "closing"
- Return 1-8 segments per chunk

Call excerpt:
${chunk.substring(0, 3000)}`

    const messages = [
      { 
        role: 'system', 
        content: 'Return ONLY JSON arrays. No markdown, no explanations, no code blocks. Just the raw JSON array starting with [ and ending with ].' 
      },
      { role: 'user', content: prompt }
    ]

    try {
      const response = await this.makeRequest(messages, 0.1, true)
      
      if (!response || response.trim().length === 0) {
        throw new Error('Empty response from OpenAI for chunk')
      }
      
      const cleanedResponse = this.cleanJsonResponse(response)
      const segments = JSON.parse(cleanedResponse)
      
      if (!Array.isArray(segments)) {
        throw new Error(`Expected array for chunk, got ${typeof segments}`)
      }
      
      if (segments.length === 0) {
        console.warn('AI returned empty array for chunk, falling back to basic segmentation')
        return this.createBasicSegments(chunk).map(seg => ({
          ...seg,
          timestamp: this.adjustTimestamp(seg.timestamp, timeOffset)
        }))
      }
      
      // Validate segments
      const validSegments = this.validateAndCleanSegments(segments)
      
      // Adjust timestamps if needed
      const adjustedSegments = validSegments.map((seg: any) => ({
        ...seg,
        timestamp: this.adjustTimestamp(seg.timestamp, timeOffset)
      }))
      
      console.log(`Chunk processed successfully: ${adjustedSegments.length} segments`)
      return adjustedSegments
      
    } catch (error) {
      console.error('Single chunk AI processing failed:', error)
      console.log('Falling back to basic segmentation for this chunk')
      
      // Fallback to basic segmentation for this chunk
      const basicSegments = this.createBasicSegments(chunk)
      return basicSegments.map(seg => ({
        ...seg,
        timestamp: this.adjustTimestamp(seg.timestamp, timeOffset)
      }))
    }
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

  async analyzeCombined(segments: any[], markdownContext?: string): Promise<{
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

Call segments: ${JSON.stringify(limitedSegments)}${markdownContext ? `\n\nOriginal transcript note: Analysis is based on first 10 exchanges (truncated for processing).` : ''}`

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

  async analyzeServiceCall(markdownTranscript: string): Promise<CallAnalysis> {
    if (!markdownTranscript || markdownTranscript.trim().length === 0) {
      throw new Error('Empty transcript provided')
    }

    console.log('=== OpenAI Analysis Starting (Markdown Mode) ===')
    console.log('Input markdown length:', markdownTranscript.length)
    console.log('Input preview (first 500 chars):', markdownTranscript.substring(0, 500))
    console.log('Contains markdown headers:', markdownTranscript.includes('###') || markdownTranscript.includes('##'))
    console.log('Contains speaker labels:', markdownTranscript.includes('Technician') || markdownTranscript.includes('Customer'))
    console.log('Number of lines:', markdownTranscript.split('\n').length)

    try {
      console.log('Starting fast OpenAI analysis with markdown input...')
      
      // Step 1: Parse markdown into segments  
      console.log('Step 1: Parsing markdown transcript...')
      let segments = await this.parseMarkdownTranscript(markdownTranscript)
      console.log(`Parsed into ${segments.length} segments`)
      
      // If markdown parsing failed, try direct transcript segmentation
      if (segments.length === 0) {
        console.log('Markdown parsing failed, attempting direct transcript segmentation...')
        
        // Extract raw transcript from markdown
        const rawTranscript = markdownTranscript
          .replace(/^#.*$/gm, '') // Remove headers
          .replace(/^\*\*.*\*\*$/gm, '') // Remove bold text
          .replace(/^---$/gm, '') // Remove dividers
          .replace(/\n{3,}/g, '\n\n') // Normalize spacing
          .trim()
        
        console.log('Extracted raw transcript:', rawTranscript.substring(0, 300))
        
        segments = await this.segmentTranscript(rawTranscript)
        console.log(`Direct segmentation produced ${segments.length} segments`)
      }
      
      if (segments.length === 0) {
        throw new Error('No segments generated from markdown transcript')
      }
      
      // Debug: Show sample segments
      console.log('Sample segments:')
      segments.slice(0, 3).forEach((seg, i) => {
        console.log(`  ${i + 1}. ${seg.speaker} [${seg.stage}]: ${seg.text.substring(0, 100)}...`)
      })
      
      // Stage distribution check
      const stageDistribution = segments.reduce((acc, seg) => {
        acc[seg.stage] = (acc[seg.stage] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      console.log('Stage distribution:', stageDistribution)

      // Step 2: Combined fast analysis with markdown context
      console.log('Step 2: AI analysis of parsed segments...')
      const combined = await this.analyzeCombined(segments, markdownTranscript)
      const compliance = combined.compliance
      const salesInsights = combined.salesInsights
      
      console.log('Analysis completed - checking results...')
      console.log('Compliance stages found:', Object.keys(compliance))
      console.log('Sales insights:', {
        opportunities: salesInsights.opportunities.length,
        successful: salesInsights.successful.length,
        missed: salesInsights.missed.length
      })

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
      const text = markdownTranscript.toLowerCase()
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

      console.log('=== OpenAI Analysis Complete ===')
      console.log('Call type:', callType)
      console.log('Overall score:', overallScore)
      console.log('Final segments:', segments.length)
      
      return result

    } catch (error) {
      console.error('=== OpenAI Analysis Failed ===')
      console.error('Error details:', error)
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
      throw new Error(`OpenAI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
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