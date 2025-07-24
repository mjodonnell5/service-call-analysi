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
    
    // Check prompt length and truncate if necessary (more conservative limit)
    const maxPromptLength = 15000 // Reduced for better reliability
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
          topP: 0.95,
          maxOutputTokens: 1500, // Reduced to prevent oversized/malformed responses
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
    
    if (candidate.finishReason === 'MAX_TOKENS') {
      console.warn('Gemini response was truncated due to token limit')
    }
    
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error('No content returned from Gemini API')
    }
    
    const responseText = candidate.content.parts[0].text || ''
    if (!responseText.trim()) {
      throw new Error('Empty response from Gemini API')
    }
    
    console.log(`Gemini response length: ${responseText.length} chars`)
    console.log(`Gemini finish reason: ${candidate.finishReason || 'STOP'}`)
    
    return responseText
  }

  async analyzeServiceCall(transcript: string): Promise<GeminiAnalysisResult> {
    try {
      // Step 1: Segment and categorize the transcript
      const segmentationPrompt = `
Analyze this service call transcript and return structured JSON only.

TRANSCRIPT:
${transcript}

Return this exact JSON structure (no markdown, no explanations):
{
  "segments": [
    {"speaker": "Technician", "text": "exact quote from transcript", "timestamp": "MM:SS", "stage": "introduction"},
    {"speaker": "Customer", "text": "exact quote from transcript", "timestamp": "MM:SS", "stage": "diagnosis"}
  ],
  "callType": "descriptive call type"
}

STAGE RULES - assign each segment to exactly one:
- introduction: greetings, names, company intro
- diagnosis: problem questions, issue investigation  
- solution: repair explanation, pricing, technical details
- upsell: additional services, optional products
- maintenance: service plans, agreements, preventive care
- closing: thanks, wrap-up, final arrangements

Use sequential timestamps starting at 00:15, adding 15-45 seconds per segment.
`

      console.log('Step 1: Segmenting transcript with Gemini...')
      const segmentationResponse = await this.callGemini(segmentationPrompt)
      
      let segmentationData
      try {
        segmentationData = this.robustJSONParse(segmentationResponse, 'segmentation')
        
        // Validate segmentation result
        if (!segmentationData.segments || !Array.isArray(segmentationData.segments)) {
          throw new Error('Invalid segments array in response')
        }
        
        if (segmentationData.segments.length === 0) {
          throw new Error('No segments found in response')
        }
        
        console.log(`Successfully parsed ${segmentationData.segments.length} segments`)
      } catch (error) {
        console.error('Failed to parse Gemini segmentation response:', error)
        console.error('Segmentation response preview:', segmentationResponse.substring(0, 1000))
        // Use fallback segmentation
        segmentationData = this.createFallbackSegmentation(transcript)
      }

      // Step 2: Analyze each stage for compliance and quality
      const analysisPrompt = `
Analyze this segmented service call for compliance and sales performance.

SEGMENTS BY STAGE:
${segmentationData.segments.map((s: any) => `[${s.stage}] ${s.speaker}: ${s.text}`).join('\n')}

Return this exact JSON structure (no markdown, no explanations):
{
  "overallScore": 85,
  "stages": [
    {"stage": "introduction", "quality": "Good", "notes": "specific analysis notes"},
    {"stage": "diagnosis", "quality": "Excellent", "notes": "specific analysis notes"},
    {"stage": "solution", "quality": "Good", "notes": "specific analysis notes"},
    {"stage": "upsell", "quality": "Fair", "notes": "specific analysis notes"},
    {"stage": "maintenance", "quality": "Good", "notes": "specific analysis notes"},
    {"stage": "closing", "quality": "Good", "notes": "specific analysis notes"}
  ],
  "salesInsights": {
    "opportunities": ["specific opportunity 1", "specific opportunity 2"],
    "successful": ["specific success 1", "specific success 2"],
    "missed": ["specific missed opportunity 1"]
  }
}

Quality must be exactly: "Poor", "Fair", "Good", or "Excellent".
OverallScore must be a number between 0-100.
`

      console.log('Step 2: Analyzing compliance and sales with Gemini...')
      const analysisResponse = await this.callGemini(analysisPrompt)
      
      let analysisData
      try {
        analysisData = this.robustJSONParse(analysisResponse, 'analysis')
        
        // Validate analysis result
        if (typeof analysisData.overallScore !== 'number') {
          analysisData.overallScore = 75
        }
        
        if (!Array.isArray(analysisData.stages)) {
          throw new Error('Invalid stages array in analysis response')
        }
        
        // Ensure all required stages are present
        const requiredStages = ['introduction', 'diagnosis', 'solution', 'upsell', 'maintenance', 'closing']
        for (const stage of requiredStages) {
          if (!analysisData.stages.find((s: any) => s.stage === stage)) {
            analysisData.stages.push({
              stage,
              quality: 'Fair',
              notes: `Stage analysis not provided by Gemini`
            })
          }
        }
        
        if (!analysisData.salesInsights) {
          analysisData.salesInsights = { opportunities: [], successful: [], missed: [] }
        }
        
        console.log('Analysis data validated successfully')
      } catch (error) {
        console.error('Failed to parse Gemini analysis response:', error)
        console.error('Analysis response preview:', analysisResponse.substring(0, 1000))
        // Use fallback analysis
        analysisData = this.createFallbackAnalysis(segmentationData.segments)
      }

      // Combine the results
      return {
        callType: segmentationData.callType || 'Service Call (Gemini Analysis)',
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

    // Method 2: Clean and extract JSON more aggressively
    try {
      let cleanResponse = response.trim()
      
      // Remove markdown code blocks and common prefixes
      cleanResponse = cleanResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
      cleanResponse = cleanResponse.replace(/^JSON RESPONSE:\s*/gi, '')
      cleanResponse = cleanResponse.replace(/^Here's the JSON response:\s*/gi, '')
      cleanResponse = cleanResponse.replace(/^Response:\s*/gi, '')
      
      // Find JSON boundaries more reliably
      const openBrace = cleanResponse.indexOf('{')
      const openBracket = cleanResponse.indexOf('[')
      let jsonStart = -1
      let jsonEnd = -1
      
      if (openBrace >= 0 && (openBracket < 0 || openBrace < openBracket)) {
        jsonStart = openBrace
        // Find matching closing brace
        let braceCount = 0
        let inString = false
        let escaped = false
        
        for (let i = jsonStart; i < cleanResponse.length; i++) {
          const char = cleanResponse[i]
          
          if (char === '\\' && !escaped) {
            escaped = true
            continue
          }
          
          if (char === '"' && !escaped) {
            inString = !inString
          }
          
          if (!inString) {
            if (char === '{') braceCount++
            else if (char === '}') {
              braceCount--
              if (braceCount === 0) {
                jsonEnd = i + 1
                break
              }
            }
          }
          
          escaped = false
        }
      } else if (openBracket >= 0) {
        jsonStart = openBracket
        // Find matching closing bracket
        let bracketCount = 0
        let inString = false
        let escaped = false
        
        for (let i = jsonStart; i < cleanResponse.length; i++) {
          const char = cleanResponse[i]
          
          if (char === '\\' && !escaped) {
            escaped = true
            continue
          }
          
          if (char === '"' && !escaped) {
            inString = !inString
          }
          
          if (!inString) {
            if (char === '[') bracketCount++
            else if (char === ']') {
              bracketCount--
              if (bracketCount === 0) {
                jsonEnd = i + 1
                break
              }
            }
          }
          
          escaped = false
        }
      }
      
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd)
        
        // Additional cleaning for common issues
        cleanResponse = cleanResponse
          .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
          .replace(/\n/g, ' ')           // Replace newlines with spaces
          .replace(/\t/g, ' ')           // Replace tabs with spaces
          .replace(/\s{2,}/g, ' ')       // Collapse multiple spaces
          .replace(/,\s*,/g, ',')        // Remove duplicate commas
        
        const parsed = JSON.parse(cleanResponse)
        console.log(`Method 2 (boundary extraction) succeeded for ${type}`)
        return parsed
      }
    } catch (e) {
      console.log(`Method 2 failed: ${e}`)
    }

    // Method 3: Regex-based extraction with repair
    try {
      const jsonPattern = /\{[\s\S]*?\}|\[[\s\S]*?\]/g
      const matches = response.match(jsonPattern)
      
      if (matches && matches.length > 0) {
        // Try each match until one parses successfully
        for (const match of matches) {
          try {
            let fixedMatch = match
              .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
              .replace(/\n/g, ' ')           // Replace newlines
              .replace(/\t/g, ' ')           // Replace tabs
              .replace(/\s{2,}/g, ' ')       // Collapse spaces
              .replace(/([{,]\s*)"([^"]*)"(\s*:\s*)([^",}\]]+)([,}\]])/g, (full, p1, p2, p3, p4, p5) => {
                // Quote unquoted non-numeric values
                const trimmed = p4.trim()
                if (!/^(true|false|null|-?\d+\.?\d*)$/.test(trimmed)) {
                  return `${p1}"${p2}"${p3}"${trimmed}"${p5}`
                }
                return full
              })
            
            const parsed = JSON.parse(fixedMatch)
            console.log(`Method 3 (regex + repair) succeeded for ${type}`)
            return parsed
          } catch (e) {
            continue // Try next match
          }
        }
      }
    } catch (e) {
      console.log(`Method 3 failed: ${e}`)
    }

    // Method 4: Progressive truncation
    try {
      let workingResponse = response.trim()
      const openBrace = workingResponse.indexOf('{')
      const openBracket = workingResponse.indexOf('[')
      const jsonStart = Math.max(openBrace, openBracket)
      
      if (jsonStart >= 0) {
        workingResponse = workingResponse.substring(jsonStart)
        
        // Try progressively smaller chunks
        for (let percent = 100; percent >= 30; percent -= 10) {
          try {
            const length = Math.floor(workingResponse.length * percent / 100)
            let chunk = workingResponse.substring(0, length)
            
            // Try to complete the JSON structure
            if (chunk.startsWith('{') && !chunk.endsWith('}')) {
              // Count open braces
              const openBraces = (chunk.match(/\{/g) || []).length
              const closeBraces = (chunk.match(/\}/g) || []).length
              chunk += '}'.repeat(Math.max(0, openBraces - closeBraces))
            } else if (chunk.startsWith('[') && !chunk.endsWith(']')) {
              // Count open brackets  
              const openBrackets = (chunk.match(/\[/g) || []).length
              const closeBrackets = (chunk.match(/\]/g) || []).length
              chunk += ']'.repeat(Math.max(0, openBrackets - closeBrackets))
            }
            
            // Clean up common issues
            chunk = chunk
              .replace(/,(\s*[}\]])/g, '$1')
              .replace(/\n/g, ' ')
              .replace(/\s{2,}/g, ' ')
            
            const parsed = JSON.parse(chunk)
            console.log(`Method 4 (progressive truncation) succeeded for ${type} at ${percent}%`)
            return parsed
          } catch (e) {
            continue
          }
        }
      }
    } catch (e) {
      console.log(`Method 4 failed: ${e}`)
    }

    // If all parsing methods fail, provide detailed error info and fallback
    console.error(`All JSON parsing methods failed for ${type}`)
    console.error('Raw response (first 1000 chars):', response.substring(0, 1000))
    console.error('Raw response (last 500 chars):', response.substring(Math.max(0, response.length - 500)))
    
    // Return fallback structure instead of throwing
    if (type === 'segmentation') {
      console.log('Returning fallback segmentation structure')
      return this.createFallbackSegmentation('Failed to parse Gemini response')
    } else {
      console.log('Returning fallback analysis structure')
      return this.createFallbackAnalysis([])
    }
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