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
      model: 'gemini-1.5-flash-latest',
      ...config
    }
  }

  private async callGemini(prompt: string): Promise<string> {
    const url = `${this.baseUrl}/${this.config.model}:generateContent?key=${this.config.apiKey}`
    
    // Check prompt length and truncate if necessary
    const maxPromptLength = 20000 // Conservative limit
    let truncatedPrompt = prompt
    if (prompt.length > maxPromptLength) {
      console.log(`Prompt too long (${prompt.length} chars), truncating to ${maxPromptLength}`)
      truncatedPrompt = prompt.substring(0, maxPromptLength) + "\n\n[Transcript truncated due to length...]"
    }
    
    const response = await fetch(url, {
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
          topP: 1,
          maxOutputTokens: 2048, // Reduced to prevent oversized responses
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

    if (!response.ok) {
      const error = await response.text()
      console.error('Gemini API error response:', error)
      throw new Error(`Gemini API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    
    // Better error handling for Gemini responses
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No candidates returned from Gemini API')
    }
    
    const candidate = data.candidates[0]
    if (candidate.finishReason === 'SAFETY') {
      throw new Error('Gemini response blocked due to safety filters')
    }
    
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error('No content returned from Gemini API')
    }
    
    const responseText = candidate.content.parts[0].text || ''
    if (!responseText.trim()) {
      throw new Error('Empty response from Gemini API')
    }
    
    return responseText
  }

  async analyzeServiceCall(transcript: string): Promise<GeminiAnalysisResult> {
    try {
      // Step 1: Segment and categorize the transcript
      const segmentationPrompt = `
You are a service call analyzer. Convert this transcript into structured JSON with speaker segments.

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON - no explanations, markdown, or extra text
2. Each speaker statement becomes a separate segment
3. Assign realistic timestamps starting at 00:15, incrementing by 15-45 seconds
4. Categorize each segment into exactly one stage: introduction, diagnosis, solution, upsell, maintenance, closing

Required JSON format:
{
  "segments": [
    {"speaker": "Technician", "text": "Good morning! This is Mike from AirFlow Solutions.", "timestamp": "00:15", "stage": "introduction"},
    {"speaker": "Customer", "text": "Hello, thank you for coming.", "timestamp": "00:30", "stage": "introduction"}
  ],
  "callType": "AC Repair Service Call"
}

Stage definitions:
- introduction: Greetings, names, company intro, service confirmation
- diagnosis: Problem questions, understanding issues, system inspection
- solution: Explaining repairs, pricing, technical solutions
- upsell: Additional services, optional products, upgrades
- maintenance: Service plans, agreements, preventive measures  
- closing: Thanks, wrap-up, scheduling, final arrangements

Transcript:
${transcript}

JSON RESPONSE:
`

      console.log('Step 1: Segmenting transcript with Gemini...')
      const segmentationResponse = await this.callGemini(segmentationPrompt)
      
      let segmentationData
      try {
        segmentationData = this.robustJSONParse(segmentationResponse, 'segmentation')
      } catch (error) {
        console.error('Failed to parse Gemini segmentation response:', error)
        console.error('Segmentation response that failed:', segmentationResponse.substring(0, 1000))
        // Fallback to basic parsing
        segmentationData = this.createFallbackSegmentation(transcript)
      }

      // Step 2: Analyze each stage for compliance and quality
      const analysisPrompt = `
Analyze this segmented service call for compliance and sales performance.

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON - no explanations, markdown, or extra text
2. Quality must be exactly: "Poor", "Fair", "Good", or "Excellent"
3. Provide specific, actionable notes for each stage

Required JSON format:
{
  "overallScore": 85,
  "stages": [
    {"stage": "introduction", "quality": "Good", "notes": "Professional greeting with company name"},
    {"stage": "diagnosis", "quality": "Excellent", "notes": "Thorough questioning about the problem"},
    {"stage": "solution", "quality": "Good", "notes": "Clear explanation with pricing"},
    {"stage": "upsell", "quality": "Fair", "notes": "Some additional services offered"},
    {"stage": "maintenance", "quality": "Excellent", "notes": "Maintenance plan clearly presented"},
    {"stage": "closing", "quality": "Good", "notes": "Professional conclusion with thanks"}
  ],
  "salesInsights": {
    "opportunities": ["Customer mentioned allergies - air purifier opportunity"],
    "successful": ["Successfully sold maintenance plan"],
    "missed": ["Could have emphasized cost savings more"]
  }
}

Segmented data:
${JSON.stringify(segmentationData.segments, null, 2)}

JSON RESPONSE:
`

      console.log('Step 2: Analyzing compliance and sales with Gemini...')
      const analysisResponse = await this.callGemini(analysisPrompt)
      
      let analysisData
      try {
        analysisData = this.robustJSONParse(analysisResponse, 'analysis')
      } catch (error) {
        console.error('Failed to parse Gemini analysis response:', error)
        console.error('Analysis response that failed:', analysisResponse.substring(0, 1000))
        // Fallback analysis
        analysisData = this.createFallbackAnalysis(segmentationData.segments)
      }

      // Combine the results
      return {
        callType: segmentationData.callType,
        overallScore: analysisData.overallScore,
        stages: analysisData.stages,
        salesInsights: analysisData.salesInsights,
        segmentedTranscript: segmentationData.segments
      }
    } catch (error) {
      console.error('Gemini analysis failed:', error)
      
      // Provide more specific error information
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Add context for common errors
        if (errorMessage.includes('JSON')) {
          errorMessage += '. Gemini returned malformed JSON response.'
        } else if (errorMessage.includes('API error')) {
          errorMessage += '. Check your Gemini API key and quota.'
        } else if (errorMessage.includes('safety')) {
          errorMessage += '. Content blocked by Gemini safety filters.'
        }
      }
      
      throw new Error(`Gemini AI analysis failed: ${errorMessage}`)
    }
  }

  private robustJSONParse(response: string, type: 'segmentation' | 'analysis'): any {
    console.log(`Attempting to parse ${type} response...`)
    console.log('Response length:', response.length)
    console.log('Response preview:', response.substring(0, 500))

    // Method 1: Try direct JSON parse first
    try {
      const parsed = JSON.parse(response.trim())
      console.log(`Method 1 (direct parse) succeeded for ${type}`)
      return parsed
    } catch (e) {
      console.log(`Method 1 failed: ${e}`)
    }

    // Method 2: Extract JSON from markdown or text with better cleaning
    try {
      let cleanResponse = response.trim()
      
      // Remove markdown code blocks
      cleanResponse = cleanResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
      
      // Remove any explanatory text before JSON
      const jsonStart = Math.max(cleanResponse.indexOf('{'), cleanResponse.indexOf('['))
      if (jsonStart > 0) {
        cleanResponse = cleanResponse.substring(jsonStart)
      }
      
      // More aggressive JSON extraction - find complete JSON object/array
      let braceCount = 0
      let bracketCount = 0
      let inString = false
      let escaped = false
      let endIndex = -1
      
      for (let i = 0; i < cleanResponse.length; i++) {
        const char = cleanResponse[i]
        const prevChar = i > 0 ? cleanResponse[i - 1] : ''
        
        // Handle string escapes
        if (char === '\\' && !escaped) {
          escaped = true
          continue
        }
        
        if (char === '"' && !escaped) {
          inString = !inString
        }
        
        if (!inString) {
          if (char === '{') braceCount++
          else if (char === '}') braceCount--
          else if (char === '[') bracketCount++
          else if (char === ']') bracketCount--
          
          // Found complete JSON structure
          if (braceCount === 0 && bracketCount === 0 && (char === '}' || char === ']')) {
            endIndex = i + 1
            break
          }
        }
        
        escaped = false
      }
      
      if (endIndex > 0) {
        cleanResponse = cleanResponse.substring(0, endIndex)
      }
      
      const parsed = JSON.parse(cleanResponse)
      console.log(`Method 2 (extraction) succeeded for ${type}`)
      return parsed
    } catch (e) {
      console.log(`Method 2 failed: ${e}`)
    }

    // Method 3: Advanced JSON repair attempts
    try {
      let fixedResponse = response.trim()
      
      // Remove markdown and extra text
      fixedResponse = fixedResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
      fixedResponse = fixedResponse.replace(/^[^{\[]*/, '') // Remove leading non-JSON text
      
      // Extract just the JSON portion using regex
      const jsonMatch = fixedResponse.match(/[\{\[][\s\S]*[\}\]]/)
      if (jsonMatch) {
        fixedResponse = jsonMatch[0]
        
        // Advanced JSON fixes
        fixedResponse = fixedResponse
          .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
          .replace(/([{,]\s*)"([^"]*)"(\s*:\s*)"([^"]*)"([^,}\]]*)/g, '$1"$2"$3"$4"') // Fix malformed strings
          .replace(/\n+/g, ' ')  // Replace multiple newlines
          .replace(/\t+/g, ' ')  // Replace tabs
          .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
          .replace(/"\s*:\s*"/g, '":"') // Compact key-value pairs
          .replace(/,\s*,/g, ',') // Remove duplicate commas
          .replace(/([{,]\s*)"([^"]*)"(\s*:\s*)([^",}\]]+)([,}\]])/g, (match, p1, p2, p3, p4, p5) => {
            // Quote unquoted values that aren't numbers/booleans
            if (!/^(true|false|null|\d+\.?\d*)$/.test(p4.trim())) {
              return `${p1}"${p2}"${p3}"${p4.trim()}"${p5}`
            }
            return match
          })
        
        // Try to parse the fixed JSON
        const parsed = JSON.parse(fixedResponse)
        console.log(`Method 3 (advanced fixing) succeeded for ${type}`)
        return parsed
      }
    } catch (e) {
      console.log(`Method 3 failed: ${e}`)
    }

    // Method 4: Try chunk-by-chunk parsing (for truncated responses)
    try {
      let workingResponse = response.trim()
      
      // Find JSON boundaries
      const openBrace = workingResponse.indexOf('{')
      const openBracket = workingResponse.indexOf('[')
      const jsonStart = Math.max(openBrace, openBracket)
      
      if (jsonStart >= 0) {
        workingResponse = workingResponse.substring(jsonStart)
        
        // Try progressively smaller chunks until we get valid JSON
        for (let length = workingResponse.length; length > 100; length -= 100) {
          try {
            const chunk = workingResponse.substring(0, length)
            
            // Try to close any open structures
            let testChunk = chunk
            if (chunk.includes('{') && !chunk.endsWith('}')) {
              testChunk = chunk + '}'
            }
            if (chunk.includes('[') && !chunk.endsWith(']')) {
              testChunk = chunk + ']'
            }
            
            const parsed = JSON.parse(testChunk)
            console.log(`Method 4 (chunking) succeeded for ${type} with length ${length}`)
            return parsed
          } catch (e) {
            // Continue to next chunk size
          }
        }
      }
    } catch (e) {
      console.log(`Method 4 failed: ${e}`)
    }

    // If all parsing methods fail, provide detailed error info
    console.error(`All JSON parsing methods failed for ${type}`)
    console.error('Raw response (first 1000 chars):', response.substring(0, 1000))
    console.error('Raw response (last 500 chars):', response.substring(Math.max(0, response.length - 500)))
    
    throw new Error(`Failed to parse Gemini ${type} response: ${response.substring(14300, 14400)}... (showing problematic section)`)
  }

  private createFallbackSegmentation(transcript: string): any {
    console.log('Creating fallback segmentation...')
    
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
    
    return {
      segments,
      callType: 'Service Call (Fallback Analysis)'
    }
  }

  private createFallbackAnalysis(segments: any[]): any {
    console.log('Creating fallback analysis...')
    
    const stageCount = segments.reduce((acc, seg) => {
      acc[seg.stage] = (acc[seg.stage] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      overallScore: 75,
      stages: [
        {
          stage: 'introduction',
          quality: stageCount.introduction > 0 ? 'Good' : 'Missing',
          notes: stageCount.introduction > 0 ? 'Introduction elements present in transcript' : 'No clear introduction identified'
        },
        {
          stage: 'diagnosis',
          quality: stageCount.diagnosis > 0 ? 'Good' : 'Fair',
          notes: stageCount.diagnosis > 0 ? 'Problem diagnosis discussion identified' : 'Limited diagnostic conversation'
        },
        {
          stage: 'solution',
          quality: stageCount.solution > 0 ? 'Good' : 'Fair',
          notes: stageCount.solution > 0 ? 'Solution explanation provided' : 'Basic solution discussion present'
        },
        {
          stage: 'upsell',
          quality: stageCount.upsell > 0 ? 'Fair' : 'Missing',
          notes: stageCount.upsell > 0 ? 'Some upselling attempts identified' : 'No clear upselling identified'
        },
        {
          stage: 'maintenance',
          quality: stageCount.maintenance > 0 ? 'Good' : 'Missing',
          notes: stageCount.maintenance > 0 ? 'Maintenance options discussed' : 'No maintenance plan offered'
        },
        {
          stage: 'closing',
          quality: stageCount.closing > 0 ? 'Good' : 'Fair',
          notes: stageCount.closing > 0 ? 'Professional closing identified' : 'Basic call conclusion'
        }
      ],
      salesInsights: {
        opportunities: ['Fallback analysis - manual review recommended for accurate opportunity identification'],
        successful: ['Basic service delivery completed'],
        missed: ['Detailed analysis unavailable - manual review needed']
      }
    }
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