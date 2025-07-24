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
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 4096,
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
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

Return ONLY a JSON object with this exact structure:
{
  "segments": [
    {
      "speaker": "Technician" or "Customer",
      "text": "exact text from transcript",
      "timestamp": "estimated time like '00:30'",
      "stage": "one of the stage names above"
    }
  ],
  "callType": "brief description of call type (e.g., 'AC Repair Service Call')"
}

Transcript to analyze:
${transcript}
`

    console.log('Step 1: Segmenting transcript with Gemini...')
    const segmentationResponse = await this.callGemini(segmentationPrompt)
    
    let segmentationData
    try {
      // Clean up the response to extract JSON
      const jsonMatch = segmentationResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response')
      }
      segmentationData = JSON.parse(jsonMatch[0])
    } catch (error) {
      console.error('Failed to parse segmentation response:', segmentationResponse)
      throw new Error(`Failed to parse Gemini segmentation response: ${error}`)
    }

    // Step 2: Analyze each stage for compliance and quality
    const analysisPrompt = `
Based on this segmented service call transcript, provide a detailed analysis of compliance and sales performance.

Segmented Transcript:
${JSON.stringify(segmentationData.segments, null, 2)}

Return ONLY a JSON object with this exact structure:
{
  "overallScore": number between 0-100,
  "stages": [
    {
      "stage": "introduction",
      "quality": "Excellent|Good|Fair|Poor|Missing",
      "notes": "detailed analysis of this stage"
    },
    {
      "stage": "diagnosis", 
      "quality": "Excellent|Good|Fair|Poor|Missing",
      "notes": "detailed analysis of this stage"
    },
    {
      "stage": "solution",
      "quality": "Excellent|Good|Fair|Poor|Missing", 
      "notes": "detailed analysis of this stage"
    },
    {
      "stage": "upsell",
      "quality": "Excellent|Good|Fair|Poor|Missing",
      "notes": "detailed analysis of this stage"
    },
    {
      "stage": "maintenance",
      "quality": "Excellent|Good|Fair|Poor|Missing",
      "notes": "detailed analysis of this stage"
    },
    {
      "stage": "closing",
      "quality": "Excellent|Good|Fair|Poor|Missing",
      "notes": "detailed analysis of this stage"
    }
  ],
  "salesInsights": {
    "opportunities": ["list of sales opportunities mentioned or implied"],
    "successful": ["list of successful sales tactics used"],
    "missed": ["list of missed sales opportunities"]
  }
}

Evaluate each stage based on:
- Introduction: Professional greeting, clear identification, rapport building
- Diagnosis: Thorough questioning, active listening, understanding root cause
- Solution: Clear explanation, customer education, value demonstration
- Upsell: Natural integration, customer benefit focus, not pushy
- Maintenance: Preventive value, cost-benefit explanation, future relationship building
- Closing: Professional wrap-up, customer satisfaction check, clear next steps
`

    console.log('Step 2: Analyzing compliance and sales with Gemini...')
    const analysisResponse = await this.callGemini(analysisPrompt)
    
    let analysisData
    try {
      // Clean up the response to extract JSON
      const jsonMatch = analysisResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in analysis response')
      }
      analysisData = JSON.parse(jsonMatch[0])
    } catch (error) {
      console.error('Failed to parse analysis response:', analysisResponse)
      throw new Error(`Failed to parse Gemini analysis response: ${error}`)
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
}

export function createGeminiAnalyzer(apiKey: string): GeminiAnalyzer {
  return new GeminiAnalyzer({ apiKey })
}