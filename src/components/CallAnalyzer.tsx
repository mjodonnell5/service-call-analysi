import { useState } from 'react'
import { transcriptionService, TranscriptionConfig } from '@/services/transcription'
import { createGeminiAnalyzer, GeminiAnalysisResult } from '@/services/gemini'
import { OpenAIAnalyzer } from '@/services/openai'

interface AnalysisResult {
  callType: string
  overallScore: number
  compliance: {
    introduction: { present: boolean; quality: string; notes: string }
    diagnosis: { present: boolean; quality: string; notes: string }
    solution: { present: boolean; quality: string; notes: string }
    upsell: { present: boolean; quality: string; notes: string }
    maintenance: { present: boolean; quality: string; notes: string }
    closing: { present: boolean; quality: string; notes: string }
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

// Enhanced analysis using OpenAI API for better stage categorization and analysis
export async function analyzeServiceCallWithOpenAI(transcript: string, openaiApiKey: string): Promise<AnalysisResult> {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Empty transcript provided for analysis')
  }

  if (!openaiApiKey || openaiApiKey.trim().length === 0) {
    throw new Error('OpenAI API key is required for enhanced analysis')
  }

  console.log('Starting OpenAI analysis of transcript...')
  console.log('Transcript length:', transcript.length, 'characters')
  console.log('Using API key:', openaiApiKey.substring(0, 8) + '...')
  
  const openaiAnalyzer = new OpenAIAnalyzer(openaiApiKey)
  const result = await openaiAnalyzer.analyzeServiceCall(transcript)
  
  console.log('OpenAI analysis completed successfully')
  console.log('Final result segments:', result.transcript.segments.length)
  console.log('Final result compliance stages:', Object.keys(result.compliance))
  
  return result
}

// Enhanced analysis using Gemini API for better stage categorization
export async function analyzeServiceCallWithGemini(transcript: string, geminiApiKey: string): Promise<AnalysisResult> {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Empty transcript provided for analysis')
  }

  if (!geminiApiKey || geminiApiKey.trim().length === 0) {
    throw new Error('Gemini API key is required for enhanced analysis')
  }

  console.log('Starting Gemini AI analysis of transcript...')
  console.log('Transcript length:', transcript.length, 'characters')
  console.log('Using API key:', geminiApiKey.substring(0, 8) + '...')
  
  const geminiAnalyzer = createGeminiAnalyzer(geminiApiKey)
  const result = await geminiAnalyzer.analyzeServiceCall(transcript)
  
  console.log('Gemini raw result structure:')
  console.log('- Call Type:', result.callType)
  console.log('- Overall Score:', result.overallScore)
  console.log('- Stages count:', result.stages?.length || 0)
  console.log('- Segments count:', result.segmentedTranscript?.length || 0)
  console.log('- Sales insights:', Object.keys(result.salesInsights || {}))
  
  // Convert Gemini result to our expected format with better validation
  const stageMapping = {
    introduction: result.stages?.find(s => s.stage === 'introduction'),
    diagnosis: result.stages?.find(s => s.stage === 'diagnosis'),
    solution: result.stages?.find(s => s.stage === 'solution'),
    upsell: result.stages?.find(s => s.stage === 'upsell'),
    maintenance: result.stages?.find(s => s.stage === 'maintenance'),
    closing: result.stages?.find(s => s.stage === 'closing')
  }
  
  const analysisResult: AnalysisResult = {
    callType: result.callType,
    overallScore: result.overallScore,
    compliance: {
      introduction: {
        present: stageMapping.introduction?.quality !== 'Missing',
        quality: stageMapping.introduction?.quality || 'Fair',
        notes: stageMapping.introduction?.notes || 'Gemini analysis: Introduction stage processed'
      },
      diagnosis: {
        present: stageMapping.diagnosis?.quality !== 'Missing',
        quality: stageMapping.diagnosis?.quality || 'Fair',
        notes: stageMapping.diagnosis?.notes || 'Gemini analysis: Diagnosis stage processed'
      },
      solution: {
        present: stageMapping.solution?.quality !== 'Missing',
        quality: stageMapping.solution?.quality || 'Fair',
        notes: stageMapping.solution?.notes || 'Gemini analysis: Solution stage processed'
      },
      upsell: {
        present: stageMapping.upsell?.quality !== 'Missing',
        quality: stageMapping.upsell?.quality || 'Fair',
        notes: stageMapping.upsell?.notes || 'Gemini analysis: Upsell stage processed'
      },
      maintenance: {
        present: stageMapping.maintenance?.quality !== 'Missing',
        quality: stageMapping.maintenance?.quality || 'Fair',
        notes: stageMapping.maintenance?.notes || 'Gemini analysis: Maintenance stage processed'
      },
      closing: {
        present: stageMapping.closing?.quality !== 'Missing',
        quality: stageMapping.closing?.quality || 'Fair',
        notes: stageMapping.closing?.notes || 'Gemini analysis: Closing stage processed'
      }
    },
    salesInsights: result.salesInsights,
    transcript: {
      segments: result.segmentedTranscript
    }
  }

  console.log('Gemini analysis completed successfully')
  console.log('Final result segments:', analysisResult.transcript.segments.length)
  console.log('Final result compliance stages:', Object.keys(analysisResult.compliance))
  
  return analysisResult
}

export async function analyzeServiceCall(transcript: string): Promise<AnalysisResult> {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Empty transcript provided for analysis')
  }

  console.log('Starting comprehensive AI analysis of transcript...')
  console.log('Transcript length:', transcript.length, 'characters')
  
  try {
    // Stage 1: Parse and segment the transcript with stage identification
    console.log('Stage 1: Segmenting transcript and identifying stages...')
    const segments = await segmentTranscriptWithAI(transcript)
    console.log(`Stage 1 complete: ${segments.length} segments identified`)
    
    // Verify we have segments before proceeding
    if (!segments || segments.length === 0) {
      throw new Error('No segments were identified from the transcript')
    }
    
    // Stage 2: Analyze compliance for each stage
    console.log('Stage 2: Analyzing compliance for each stage...')
    const compliance = await analyzeComplianceWithAI(transcript, segments)
    console.log('Stage 2 complete: Compliance analysis finished')
    
    // Stage 3: Identify sales insights
    console.log('Stage 3: Analyzing sales opportunities...')
    const salesInsights = await analyzeSalesInsightsWithAI(transcript, segments)
    console.log('Stage 3 complete: Sales insights identified')
    
    // Stage 4: Generate overall assessment
    console.log('Stage 4: Generating overall assessment...')
    const overallAssessment = await generateOverallAssessmentWithAI(transcript, compliance, salesInsights)
    console.log('Stage 4 complete: Overall assessment generated')
    
    const analysis: AnalysisResult = {
      callType: overallAssessment.callType,
      overallScore: overallAssessment.score,
      compliance,
      salesInsights,
      transcript: { segments }
    }
    
    // Enhanced validation and logging
    const stageDistribution = segments.reduce((acc, segment) => {
      acc[segment.stage] = (acc[segment.stage] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log('Final analysis summary:')
    console.log('- Call Type:', analysis.callType)
    console.log('- Overall Score:', analysis.overallScore)
    console.log('- Segments:', segments.length)
    console.log('- Stage Distribution:', stageDistribution)
    console.log('- Sales Opportunities:', salesInsights.opportunities.length)
    console.log('- Sales Successes:', salesInsights.successful.length)
    console.log('- Missed Opportunities:', salesInsights.missed.length)
    
    // Final validation to ensure quality
    return validateAndSanitizeAnalysis(analysis, transcript)
    
  } catch (error) {
    console.error('Multi-stage analysis failed with error:', error)
    
    // Enhanced error reporting for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        transcriptLength: transcript.length,
        transcriptPreview: transcript.substring(0, 200)
      })
    }
    
    console.log('Providing enhanced fallback analysis due to AI failure')
    return createFallbackAnalysis(transcript, error)
  }
}

// Stage 1: Segment transcript and identify conversation stages
async function segmentTranscriptWithAI(transcript: string) {
  const segmentPrompt = spark.llmPrompt`
You are an expert service call analyzer. Parse this transcript into speaker segments and categorize by conversation stage.

TRANSCRIPT TO ANALYZE:
${transcript}

STAGE CATEGORIES (assign EVERY segment to exactly one):
- "introduction": Greetings, names, company intro, initial pleasantries, service confirmation
- "diagnosis": Problem questions, symptom investigation, system inspection, issue identification  
- "solution": Explaining found problems, repair details, pricing, technical solutions
- "upsell": Additional services, optional products, upgrades, extra features
- "maintenance": Service plans, future care, agreements, preventive measures
- "closing": Final thanks, wrap-up, scheduling, contact info, goodbyes

CRITICAL INSTRUCTIONS:
1. Parse EVERY speaker statement into separate segments
2. Distribute segments across ALL 6 stages - don't put everything in one stage
3. Use actual speaker names from transcript (Technician, Customer, etc.)
4. Generate sequential timestamps starting 00:15, adding 15-45 seconds per segment
5. Include complete spoken text for each segment

Return ONLY valid JSON array:
[
  {
    "speaker": "Technician",
    "timestamp": "00:15", 
    "text": "Good morning! This is Mike from AirFlow Solutions.",
    "stage": "introduction"
  },
  {
    "speaker": "Customer",
    "timestamp": "00:30",
    "text": "Hello, thank you for coming.",
    "stage": "introduction"  
  }
]

VALIDATION: Ensure stages are distributed logically across conversation flow. Early statements = introduction/diagnosis, middle = solution/upsell, end = maintenance/closing.`
  
  const response = await spark.llm(segmentPrompt, 'gpt-4o', true)
  
  if (!response || response.trim() === '') {
    throw new Error('Empty response from segmentation AI')
  }
  
  try {
    console.log('Raw AI response length:', response.length)
    console.log('Raw AI response preview:', response.substring(0, 200))
    
    // Enhanced JSON extraction and cleaning
    let cleanResponse = response.trim()
    
    // Remove any markdown formatting
    cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '')
    
    // Find the JSON array bounds more robustly
    const arrayStart = cleanResponse.indexOf('[')
    const arrayEnd = cleanResponse.lastIndexOf(']')
    
    if (arrayStart === -1 || arrayEnd === -1 || arrayEnd <= arrayStart) {
      console.error('No valid JSON array found in response')
      throw new Error('Invalid JSON structure in AI response')
    }
    
    cleanResponse = cleanResponse.substring(arrayStart, arrayEnd + 1)
    console.log('Cleaned JSON length:', cleanResponse.length)
    
    const segments = JSON.parse(cleanResponse)
    
    if (!Array.isArray(segments)) {
      throw new Error('Response is not an array')
    }
    
    if (segments.length === 0) {
      throw new Error('AI returned empty segments array')
    }
    
    console.log(`Successfully parsed ${segments.length} segments from AI`)
    
    // Enhanced validation and normalization
    const validStages = ['introduction', 'diagnosis', 'solution', 'upsell', 'maintenance', 'closing']
    const processedSegments = segments.map((segment: any, index: number) => {
      const processed = {
        speaker: segment.speaker || `Speaker${index + 1}`,
        timestamp: segment.timestamp || `${Math.floor(index * 20 / 60).toString().padStart(2, '0')}:${(index * 20 % 60).toString().padStart(2, '0')}`,
        text: segment.text || '',
        stage: validStages.includes(segment.stage) ? segment.stage : determineStage(index, segment.text || '', segments.length)
      }
      
      // Log stage assignment for debugging
      if (!validStages.includes(segment.stage)) {
        console.log(`Fixed invalid stage "${segment.stage}" to "${processed.stage}" for segment ${index}`)
      }
      
      return processed
    })
    
    // Validate stage distribution to ensure good categorization
    const stageCount = processedSegments.reduce((acc, seg) => {
      acc[seg.stage] = (acc[seg.stage] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log('AI stage distribution:', stageCount)
    
    // Check if AI did a poor job distributing stages
    const totalSegments = processedSegments.length
    const emptyStages = validStages.filter(stage => !stageCount[stage]).length
    const largestStageCount = Math.max(...Object.values(stageCount))
    
    if (emptyStages > 3 || largestStageCount > totalSegments * 0.6) {
      console.log('AI stage distribution is poor, applying rule-based correction...')
      
      // Re-assign stages using rule-based approach
      return processedSegments.map((segment, index) => ({
        ...segment,
        stage: determineStage(index, segment.text, totalSegments)
      }))
    }
    
    return processedSegments
    
  } catch (parseError) {
    console.error('Segmentation JSON parsing failed:', parseError)
    console.error('Response that failed to parse:', response)
    console.log('Falling back to rule-based segmentation...')
    return parseTranscriptToSegments(transcript)
  }
}

// Stage 2: Analyze compliance for each conversation stage
async function analyzeComplianceWithAI(transcript: string, segments: any[]) {
  const compliancePrompt = spark.llmPrompt`
Analyze this service call for compliance with standard procedures. Focus on how well the technician performed in each stage.

FULL TRANSCRIPT:
${transcript}

CONVERSATION SEGMENTS BY STAGE:
${segments.map(s => `[${s.stage.toUpperCase()}] ${s.speaker}: ${s.text}`).join('\n')}

Evaluate each stage for presence and quality. Return ONLY this JSON structure:

{
  "introduction": {
    "present": true,
    "quality": "Excellent",
    "notes": "Technician properly introduced themselves and company. Professional greeting."
  },
  "diagnosis": {
    "present": true,
    "quality": "Good",
    "notes": "Good questioning technique to understand the problem. Could have asked more follow-up questions."
  },
  "solution": {
    "present": true,
    "quality": "Excellent", 
    "notes": "Clear explanation of the problem and solution. Pricing provided upfront."
  },
  "upsell": {
    "present": true,
    "quality": "Good",
    "notes": "Offered relevant additional services. Could have been more persuasive."
  },
  "maintenance": {
    "present": true,
    "quality": "Excellent",
    "notes": "Maintenance plan clearly explained with benefits and pricing."
  },
  "closing": {
    "present": true,
    "quality": "Good", 
    "notes": "Professional closing with thanks. Could have included follow-up contact info."
  }
}

Quality must be exactly one of: "Poor", "Fair", "Good", "Excellent"
Be specific and constructive in your notes.
  `
  
  const response = await spark.llm(compliancePrompt, 'gpt-4o', true)
  
  try {
    const compliance = JSON.parse(response.trim())
    
    // Validate structure and provide defaults
    const stages = ['introduction', 'diagnosis', 'solution', 'upsell', 'maintenance', 'closing']
    const validQualities = ['Poor', 'Fair', 'Good', 'Excellent']
    
    for (const stage of stages) {
      if (!compliance[stage]) {
        compliance[stage] = { present: true, quality: 'Fair', notes: 'Analysis pending' }
      } else {
        if (!validQualities.includes(compliance[stage].quality)) {
          compliance[stage].quality = 'Fair'
        }
        if (typeof compliance[stage].present !== 'boolean') {
          compliance[stage].present = true
        }
        if (!compliance[stage].notes) {
          compliance[stage].notes = 'No specific analysis available'
        }
      }
    }
    
    return compliance
  } catch (error) {
    console.error('Compliance analysis parsing failed:', error)
    
    // Return reasonable defaults
    return {
      introduction: { present: true, quality: 'Good', notes: 'Professional introduction observed' },
      diagnosis: { present: true, quality: 'Good', notes: 'Problem investigation present' },
      solution: { present: true, quality: 'Good', notes: 'Solution explanation provided' },
      upsell: { present: true, quality: 'Fair', notes: 'Some additional services mentioned' },
      maintenance: { present: true, quality: 'Good', notes: 'Maintenance discussion included' },
      closing: { present: true, quality: 'Good', notes: 'Professional call conclusion' }
    }
  }
}

// Stage 3: Analyze sales opportunities and performance
async function analyzeSalesInsightsWithAI(transcript: string, segments: any[]) {
  const salesPrompt = spark.llmPrompt`
Analyze this service call for sales performance and opportunities. Focus on what the technician did well and what they missed.

TRANSCRIPT:
${transcript}

UPSELL & MAINTENANCE SEGMENTS:
${segments.filter(s => s.stage === 'upsell' || s.stage === 'maintenance').map(s => `${s.speaker}: ${s.text}`).join('\n')}

Return ONLY this JSON structure:

{
  "opportunities": [
    "Customer mentioned allergies - good opportunity for air purification system",
    "High energy bills indicate potential for efficiency upgrades"
  ],
  "successful": [
    "Successfully offered maintenance plan with clear benefits",
    "Provided competitive pricing for repair"
  ],
  "missed": [
    "Could have emphasized long-term cost savings of maintenance plan",
    "Didn't ask about other HVAC units in the home"
  ]
}

Focus on:
- Specific sales opportunities based on customer pain points
- What sales techniques worked well
- Missed opportunities for additional revenue
- Customer buying signals that were or weren't addressed
  `
  
  const response = await spark.llm(salesPrompt, 'gpt-4o', true)
  
  try {
    const insights = JSON.parse(response.trim())
    
    // Ensure arrays exist
    return {
      opportunities: Array.isArray(insights.opportunities) ? insights.opportunities : [],
      successful: Array.isArray(insights.successful) ? insights.successful : [],
      missed: Array.isArray(insights.missed) ? insights.missed : []
    }
  } catch (error) {
    console.error('Sales insights parsing failed:', error)
    
    return {
      opportunities: ['Manual review recommended for sales opportunity identification'],
      successful: ['Basic service delivery completed'],
      missed: ['Analysis failed - manual review needed']
    }
  }
}

// Stage 4: Generate overall call assessment and score
async function generateOverallAssessmentWithAI(transcript: string, compliance: any, salesInsights: any) {
  const assessmentPrompt = spark.llmPrompt`
Based on this compliance analysis and sales performance, provide an overall assessment of the service call.

COMPLIANCE SCORES:
${Object.entries(compliance).map(([stage, data]: [string, any]) => `${stage}: ${data.quality} (Present: ${data.present})`).join('\n')}

SALES PERFORMANCE:
- Opportunities identified: ${salesInsights.opportunities.length}
- Successful actions: ${salesInsights.successful.length}  
- Missed opportunities: ${salesInsights.missed.length}

Return ONLY this JSON structure:

{
  "callType": "HVAC Repair Service Call",
  "score": 85
}

The call type should be descriptive (e.g., "HVAC Repair Service Call", "Plumbing Installation", "Appliance Maintenance").
The score should be 0-100 based on overall performance considering compliance and sales effectiveness.
  `
  
  const response = await spark.llm(assessmentPrompt, 'gpt-4o', true)
  
  try {
    const assessment = JSON.parse(response.trim())
    
    return {
      callType: assessment.callType || 'Service Call',
      score: typeof assessment.score === 'number' && assessment.score >= 0 && assessment.score <= 100 
        ? assessment.score 
        : 75
    }
  } catch (error) {
    console.error('Overall assessment parsing failed:', error)
    
    return {
      callType: 'Service Call',
      score: 75
    }
  }
}

function validateAndSanitizeAnalysis(analysis: any, transcript: string): AnalysisResult {
  const validQualities = ['Poor', 'Fair', 'Good', 'Excellent']
  const validStages = ['introduction', 'diagnosis', 'solution', 'upsell', 'maintenance', 'closing']
  
  // Ensure all required fields exist
  if (!analysis.callType) analysis.callType = "Service Call"
  if (typeof analysis.overallScore !== 'number') analysis.overallScore = 75
  if (!analysis.compliance) analysis.compliance = {}
  if (!analysis.salesInsights) analysis.salesInsights = { opportunities: [], successful: [], missed: [] }
  if (!analysis.transcript) analysis.transcript = { segments: [] }
  
  // Validate compliance fields
  for (const stage of validStages) {
    if (!analysis.compliance[stage]) {
      analysis.compliance[stage] = { present: true, quality: 'Good', notes: 'Analysis pending' }
    } else {
      if (!validQualities.includes(analysis.compliance[stage].quality)) {
        analysis.compliance[stage].quality = 'Good'
      }
      if (typeof analysis.compliance[stage].present !== 'boolean') {
        analysis.compliance[stage].present = true
      }
      if (!analysis.compliance[stage].notes) {
        analysis.compliance[stage].notes = 'No specific notes available'
      }
    }
  }
  
  // Ensure arrays exist
  if (!Array.isArray(analysis.salesInsights.opportunities)) analysis.salesInsights.opportunities = []
  if (!Array.isArray(analysis.salesInsights.successful)) analysis.salesInsights.successful = []
  if (!Array.isArray(analysis.salesInsights.missed)) analysis.salesInsights.missed = []
  
  // If no segments provided or they're poorly categorized, parse transcript properly
  if (!Array.isArray(analysis.transcript.segments) || analysis.transcript.segments.length === 0) {
    console.log('No segments in AI response, parsing transcript manually...')
    analysis.transcript.segments = parseTranscriptToSegments(transcript)
  } else {
    // Validate existing segments and ensure proper stage distribution
    let stageCount = { introduction: 0, diagnosis: 0, solution: 0, upsell: 0, maintenance: 0, closing: 0 }
    
    analysis.transcript.segments = analysis.transcript.segments.map((segment: any, index: number) => {
      const validatedSegment = {
        speaker: segment.speaker || 'Unknown',
        timestamp: segment.timestamp || `${Math.floor(index * 15 / 60).toString().padStart(2, '0')}:${(index * 15 % 60).toString().padStart(2, '0')}`,
        text: segment.text || '',
        stage: validStages.includes(segment.stage) ? segment.stage : determineStage(index, segment.text || '', analysis.transcript.segments.length)
      }
      
      stageCount[validatedSegment.stage as keyof typeof stageCount]++
      return validatedSegment
    })
    
    // If AI poorly distributed stages (e.g., everything in one stage), re-categorize
    const totalSegments = analysis.transcript.segments.length
    const emptyStages = Object.values(stageCount).filter(count => count === 0).length
    
    if (emptyStages > 3 || stageCount.introduction > totalSegments * 0.7) {
      console.log('AI stage distribution is poor, re-categorizing segments...')
      analysis.transcript.segments = analysis.transcript.segments.map((segment: any, index: number) => ({
        ...segment,
        stage: determineStage(index, segment.text, totalSegments)
      }))
    }
  }
  
  return analysis as AnalysisResult
}

function createFallbackAnalysis(transcript: string, error: any): AnalysisResult {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
  
  return {
    callType: "Service Call (Manual Analysis)",
    overallScore: 75,
    compliance: {
      introduction: { present: true, quality: "Good", notes: `Basic analysis shows introduction appears present. AI analysis failed: ${errorMessage}` },
      diagnosis: { present: true, quality: "Good", notes: "Basic analysis suggests diagnosis stage present. Full AI analysis failed - manual review recommended." },
      solution: { present: true, quality: "Good", notes: "Basic analysis indicates solution explanation provided. AI analysis failed - verify details manually." },
      upsell: { present: true, quality: "Fair", notes: "Basic analysis shows some upselling attempts. AI analysis failed - verify sales performance manually." },
      maintenance: { present: true, quality: "Good", notes: "Basic analysis indicates maintenance discussion present. AI analysis failed - manual review needed." },
      closing: { present: true, quality: "Good", notes: "Basic analysis shows professional closing present. AI analysis failed - verify closing quality manually." }
    },
    salesInsights: {
      opportunities: [
        "AI analysis failed - manual transcript review needed for opportunity identification",
        `Error: ${errorMessage}`
      ],
      successful: [
        "Basic service delivery appears completed (AI analysis failed - verify manually)"
      ],
      missed: [
        "AI analysis failed - comprehensive manual review required for missed opportunity assessment"
      ]
    },
    transcript: {
      segments: parseTranscriptToSegments(transcript)
    }
  }
}

// Production transcription hook
export function useRealTranscription(config: TranscriptionConfig | null) {
  const [isTranscribing, setIsTranscribing] = useState(false)

  const transcribeAudio = async (file: File): Promise<string> => {
    if (!config) {
      throw new Error('Transcription service not configured. Please configure an API key first.')
    }

    setIsTranscribing(true)
    
    try {
      console.log(`Starting real transcription with ${config.provider}...`)
      console.log(`File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
      
      const transcript = await transcriptionService.transcribe(file, config.apiKey, config.provider)
      
      if (!transcript || transcript.trim().length === 0) {
        throw new Error('Transcription completed but no text was returned')
      }
      
      console.log('Transcription completed successfully')
      return transcript
      
    } catch (error) {
      console.error('Real transcription error:', error)
      throw error
    } finally {
      setIsTranscribing(false)
    }
  }

  return { transcribeAudio, isTranscribing }
}

// Mock transcription for demo/testing purposes
export function useMockTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false)

  const transcribeAudio = async (file: File): Promise<string> => {
    setIsTranscribing(true)
    
    try {
      // Validate file type
      if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
        throw new Error('Please upload an audio or video file')
      }
      
      // Check file size (max 50MB for demo)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('Audio file too large (max 50MB)')
      }
      
      console.log(`Processing audio file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
      
      // Simulate realistic transcription delay based on file size
      const delay = Math.min(Math.max(file.size / (1024 * 1024) * 1000, 2000), 8000)
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Return mock transcript - comprehensive service call example with clear stage indicators
      return `Technician: Good morning! This is Mike from AirFlow Solutions. I'm here about your air conditioning service request. Am I speaking with Mrs. Johnson?

Customer: Yes, that's me. Thank you for coming out so quickly.

Technician: My pleasure, Mrs. Johnson. I understand your AC stopped working completely yesterday evening. Can you tell me what happened right before it stopped working? Any unusual sounds or behaviors?

Customer: Well, it's been making this grinding noise for about a week. Then yesterday it just shut off completely. We've had so many issues with this unit lately. Our energy bills have been through the roof too.

Technician: A grinding noise often indicates a motor bearing issue. Let me check the unit first and run some diagnostics. How old is this system, and when was it last serviced?

Customer: It's about 12 years old. Honestly, we haven't had it serviced in probably 3 years. My husband has allergies and we've noticed the air quality isn't great either.

Technician: I see the problem now. The compressor motor bearing has failed completely, which explains the grinding noise and shutdown. I can replace the bearing and get you back up and running today for $485, which includes labor and the part.

Customer: That sounds reasonable. How long will it take? And is this something that's likely to happen again?

Technician: About 2 hours for the repair. This particular failure isn't common, but I noticed your air filter is completely clogged, which puts extra strain on the system. I also want to mention we have a UV air purifier system that would significantly improve your indoor air quality, especially helpful for your husband's allergies.

Customer: How much would that cost?

Technician: The UV system is $350 installed. It kills bacteria, mold, and allergens right in your ductwork. Many of our customers with allergy sufferers see immediate improvement in their symptoms.

Customer: That's interesting. What about preventing future breakdowns like this?

Technician: Great question! We offer a comprehensive maintenance plan that includes bi-annual check-ups, filter changes, and priority scheduling. The plan is $199 annually, which works out to less than $17 per month, and includes a 15% discount on any repairs.

Customer: Let me think about the UV system, but the maintenance plan sounds like a good idea. Can you just do the repair for now?

Technician: Absolutely. I'll get started on the compressor repair right away. I'll leave you some information about our services to review when you're ready.

Technician: All done! Your system is running perfectly now. I've tested everything and the temperatures are back to normal. I also replaced your air filter as a courtesy since it was completely blocked.

Customer: Wow, it feels much cooler already. Thank you so much! You know what, I think we should sign up for that maintenance plan. This repair scared us.

Technician: That's a great decision! I can set that up right now. I'll also leave you my direct number so you can call me personally if you decide on that UV system later. Here's your invoice and the maintenance agreement.

Customer: Perfect. Do you have any other questions for me?

Technician: No, I think we're all set. Thanks again for the excellent service! You really know what you're doing.

Technician: You're very welcome, Mrs. Johnson! I'll be back in the spring for your first tune-up. Have a great day and stay cool!`
      
    } catch (error) {
      console.error('Mock transcription error:', error)
      throw error
    } finally {
      setIsTranscribing(false)
    }
  }

  return { transcribeAudio, isTranscribing }
}

function parseTranscriptToSegments(transcript: string) {
  const lines = transcript.split('\n').filter(line => line.trim() !== '')
  const segments = []
  let timestamp = 0
  
  for (const line of lines) {
    if (line.includes(':')) {
      const [speaker, ...textParts] = line.split(':')
      const text = textParts.join(':').trim()
      
      if (text) {
        const minutes = Math.floor(timestamp / 60)
        const seconds = timestamp % 60
        
        segments.push({
          speaker: speaker.trim(),
          timestamp: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
          text: text,
          stage: determineStage(segments.length, text, lines.length)
        })
        
        // Estimate 4-8 seconds per segment based on text length
        const wordsInText = text.split(' ').length
        timestamp += Math.max(3, Math.min(12, Math.floor(wordsInText / 3)))
      }
    }
  }
  
  return segments
}

function determineStage(index: number, text: string, totalLines: number): string {
  const progress = index / Math.max(totalLines, 1)
  const lowerText = text.toLowerCase()
  
  // Enhanced keyword-based detection with better patterns
  
  // Introduction indicators - greetings, names, company introduction
  if (lowerText.includes('good morning') || lowerText.includes('good afternoon') || 
      lowerText.includes('hello') || lowerText.includes('this is') || 
      lowerText.includes('my name is') || lowerText.includes('speaking with') ||
      lowerText.includes('thank you for') && index < 5) {
    return 'introduction'
  }
  
  // Diagnosis indicators - problem investigation, questions about issue
  if (lowerText.includes('problem') || lowerText.includes('issue') || 
      lowerText.includes('what happened') || lowerText.includes('tell me about') ||
      lowerText.includes('when did') || lowerText.includes('sounds') || 
      lowerText.includes('noise') || lowerText.includes('check') || 
      lowerText.includes('diagnose') || lowerText.includes('how long') ||
      lowerText.includes('stopped working') || lowerText.includes('not working') ||
      lowerText.includes('what\'s wrong') || lowerText.includes('can you describe')) {
    return 'diagnosis'
  }
  
  // Solution indicators - explaining fixes, pricing, technical details
  if (lowerText.includes('found the problem') || lowerText.includes('i can fix') ||
      lowerText.includes('replace') || lowerText.includes('repair') ||
      lowerText.includes('fix') || lowerText.includes('solution') || 
      lowerText.includes('cost') || lowerText.includes('price') ||
      lowerText.includes('$') || lowerText.includes('labor') ||
      lowerText.includes('parts') || lowerText.includes('install') ||
      lowerText.includes('get you back up')) {
    return 'solution'
  }
  
  // Upsell indicators - additional services, optional extras
  if (lowerText.includes('also offer') || lowerText.includes('additional') || 
      lowerText.includes('upgrade') || lowerText.includes('would you like') ||
      lowerText.includes('we also have') || lowerText.includes('another option') ||
      lowerText.includes('air purifier') || lowerText.includes('uv system') ||
      lowerText.includes('filter') || lowerText.includes('improve') ||
      lowerText.includes('allergies') || lowerText.includes('air quality')) {
    return 'upsell'
  }
  
  // Maintenance indicators - service plans, future care
  if (lowerText.includes('maintenance') || lowerText.includes('plan') || 
      lowerText.includes('annual') || lowerText.includes('service agreement') || 
      lowerText.includes('check-up') || lowerText.includes('tune-up') ||
      lowerText.includes('bi-annual') || lowerText.includes('spring and fall') ||
      lowerText.includes('discount on repairs') || lowerText.includes('priority') ||
      lowerText.includes('per month') || lowerText.includes('yearly')) {
    return 'maintenance'
  }
  
  // Closing indicators - wrap up, thanks, final instructions
  if (lowerText.includes('all done') || lowerText.includes('you\'re welcome') || 
      lowerText.includes('thank you') || lowerText.includes('have a great') ||
      lowerText.includes('goodbye') || lowerText.includes('call if') ||
      lowerText.includes('any questions') || lowerText.includes('stay cool') ||
      lowerText.includes('have a good') || lowerText.includes('take care') ||
      progress > 0.85) {
    return 'closing'
  }
  
  // Enhanced fallback based on conversation flow
  // Introduction phase (first 10-15% of conversation)
  if (progress < 0.12) return 'introduction'
  
  // Diagnosis phase (next 25% - understanding the problem)
  if (progress < 0.35) return 'diagnosis'
  
  // Solution phase (next 25% - explaining the fix)  
  if (progress < 0.55) return 'solution'
  
  // Upsell phase (next 15% - additional offerings)
  if (progress < 0.70) return 'upsell'
  
  // Maintenance phase (next 15% - service plans)
  if (progress < 0.85) return 'maintenance'
  
  // Closing phase (final 15%)
  return 'closing'
}