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
          maxOutputTokens: 4096,
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
    // Step 1: Segment and categorize the transcript
    const segmentationPrompt = `
Analyze this service call transcript and categorize each speaker segment into one of these stages:
- introduction: Initial greeting, technician introduces themselves and company
- diagnosis: Understanding the customer's problem, asking diagnostic questions
- solution: Explaining the repair, solution, or service being provided
- upsell: Attempting to sell additional products or services
- maintenance: Offering maintenance plans or long-term service agreements
- closing: Concluding the call, thanking customer, final arrangements

IMPORTANT: You must return ONLY valid JSON with no extra text, markdown formatting, or explanations.

{
  "segments": [
    {
      "speaker": "Technician",
      "text": "exact text from transcript",
      "timestamp": "00:15",
      "stage": "introduction"
    }
  ],
  "callType": "AC Repair Service Call"
}

Transcript to analyze:
${transcript}
`

    console.log('Step 1: Segmenting transcript with Gemini...')
    const segmentationResponse = await this.callGemini(segmentationPrompt)
    
    let segmentationData
    try {
      segmentationData = this.robustJSONParse(segmentationResponse, 'segmentation')
    } catch (error) {
      console.error('Failed to parse segmentation response, using fallback')
      // Fallback to basic parsing
      segmentationData = this.createFallbackSegmentation(transcript)
    }

    // Step 2: Analyze each stage for compliance and quality
    const analysisPrompt = `
Based on this segmented service call transcript, provide a detailed analysis of compliance and sales performance.

Segmented Transcript:
${JSON.stringify(segmentationData.segments, null, 2)}

IMPORTANT: You must return ONLY valid JSON with no extra text, markdown formatting, or explanations.

{
  "overallScore": 85,
  "stages": [
    {
      "stage": "introduction",
      "quality": "Good",
      "notes": "detailed analysis"
    },
    {
      "stage": "diagnosis", 
      "quality": "Excellent",
      "notes": "detailed analysis"
    },
    {
      "stage": "solution",
      "quality": "Good", 
      "notes": "detailed analysis"
    },
    {
      "stage": "upsell",
      "quality": "Fair",
      "notes": "detailed analysis"
    },
    {
      "stage": "maintenance",
      "quality": "Excellent",
      "notes": "detailed analysis"
    },
    {
      "stage": "closing",
      "quality": "Good",
      "notes": "detailed analysis"
    }
  ],
  "salesInsights": {
    "opportunities": ["opportunity 1", "opportunity 2"],
    "successful": ["success 1", "success 2"],
    "missed": ["missed 1", "missed 2"]
  }
}
`

    console.log('Step 2: Analyzing compliance and sales with Gemini...')
    const analysisResponse = await this.callGemini(analysisPrompt)
    
    let analysisData
    try {
      analysisData = this.robustJSONParse(analysisResponse, 'analysis')
    } catch (error) {
      console.error('Failed to parse analysis response, using fallback')
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
  }

  private robustJSONParse(response: string, type: 'segmentation' | 'analysis'): any {
    console.log(`Attempting to parse ${type} response...`)
    console.log('Response length:', response.length)
    console.log('Response preview:', response.substring(0, 300))

    // Method 1: Try direct JSON parse first
    try {
      const parsed = JSON.parse(response.trim())
      console.log(`Method 1 (direct parse) succeeded for ${type}`)
      return parsed
    } catch (e) {
      console.log(`Method 1 failed: ${e}`)
    }

    // Method 2: Extract JSON from markdown or text
    try {
      let cleanResponse = response.trim()
      
      // Remove markdown code blocks
      cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      
      // Remove any text before the first { or [
      const jsonStart = Math.max(cleanResponse.indexOf('{'), cleanResponse.indexOf('['))
      if (jsonStart > 0) {
        cleanResponse = cleanResponse.substring(jsonStart)
      }
      
      // Find the matching end brace/bracket
      let braceCount = 0
      let bracketCount = 0
      let endIndex = -1
      
      for (let i = 0; i < cleanResponse.length; i++) {
        const char = cleanResponse[i]
        if (char === '{') braceCount++
        else if (char === '}') braceCount--
        else if (char === '[') bracketCount++
        else if (char === ']') bracketCount--
        
        if (braceCount === 0 && bracketCount === 0 && (char === '}' || char === ']')) {
          endIndex = i + 1
          break
        }
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

    // Method 3: Try to fix common JSON errors
    try {
      let fixedResponse = response.trim()
      
      // Remove markdown
      fixedResponse = fixedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      
      // Extract JSON portion
      const jsonMatch = fixedResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        fixedResponse = jsonMatch[0]
        
        // Fix common issues
        fixedResponse = fixedResponse
          .replace(/,\s*}/g, '}')  // Remove trailing commas before }
          .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
          .replace(/([{,]\s*)"([^"]*)":\s*"([^"]*)"([^,}\]]*)/g, '$1"$2": "$3"') // Fix malformed strings
          .replace(/\n/g, ' ')  // Replace newlines with spaces
          .replace(/\t/g, ' ')  // Replace tabs with spaces
          .replace(/\s+/g, ' ') // Collapse multiple spaces
        
        const parsed = JSON.parse(fixedResponse)
        console.log(`Method 3 (fixing) succeeded for ${type}`)
        return parsed
      }
    } catch (e) {
      console.log(`Method 3 failed: ${e}`)
    }

    // If all parsing methods fail, throw the original error
    console.error(`All JSON parsing methods failed for ${type}`)
    console.error('Raw response:', response)
    throw new Error(`Failed to parse ${type} JSON after trying multiple methods`)
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