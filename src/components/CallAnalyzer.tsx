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
      console.log('AI stage distribution is poor, rejecting analysis')
      throw new Error('AI failed to properly distribute conversation stages')
    }
    
    return processedSegments
    
  } catch (parseError) {
    console.error('Segmentation JSON parsing failed:', parseError)
    console.error('Response that failed to parse:', response)
    throw new Error(`AI segmentation failed: ${parseError instanceof Error ? parseError.message : 'JSON parsing error'}`)
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
    throw new Error(`AI compliance analysis failed: ${error instanceof Error ? error.message : 'Parsing error'}`)
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
    throw new Error(`AI sales analysis failed: ${error instanceof Error ? error.message : 'Parsing error'}`)
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
    throw new Error(`AI assessment failed: ${error instanceof Error ? error.message : 'Parsing error'}`)
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
  
  // If no segments provided, they must be generated properly by AI
  if (!Array.isArray(analysis.transcript.segments) || analysis.transcript.segments.length === 0) {
    throw new Error('No segments were provided by AI analysis')
  }
  
  // Validate existing segments
  const validatedSegments = analysis.transcript.segments.map((segment: any, index: number) => {
    return {
      speaker: segment.speaker || 'Unknown',
      timestamp: segment.timestamp || `${Math.floor(index * 15 / 60).toString().padStart(2, '0')}:${(index * 15 % 60).toString().padStart(2, '0')}`,
      text: segment.text || '',
      stage: validStages.includes(segment.stage) ? segment.stage : 'introduction'
    }
  })
  
  analysis.transcript.segments = validatedSegments
  
  return analysis as AnalysisResult
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







