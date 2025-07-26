import { useState } from 'react'
import { transcriptionService, TranscriptionConfig, TranscriptionResult } from '@/services/transcription'
import { createGeminiAnalyzer, GeminiAnalysisResult } from '@/services/gemini'
import { OpenAIAnalyzer } from '@/services/openai-simple'
import { TranscriptProcessor } from '@/services/transcript-processor'

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

// Simplified analysis using OpenAI API
export async function analyzeServiceCallWithOpenAI(transcript: string, openaiApiKey: string): Promise<AnalysisResult> {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Empty transcript provided for analysis')
  }

  if (!openaiApiKey || openaiApiKey.trim().length === 0) {
    throw new Error('OpenAI API key is required for enhanced analysis')
  }

  console.log('Starting simplified OpenAI analysis...')
  console.log('Input length:', transcript.length, 'characters')
  
  try {
    // Convert transcript to markdown format if needed
    let processedMarkdown: string
    
    if (transcript.includes('# Service Call Transcript') || transcript.includes('### Exchange')) {
      console.log('Input is already markdown format')
      processedMarkdown = transcript
    } else {
      console.log('Converting to markdown format...')
      const processedResult = TranscriptProcessor.processAssemblyAITranscript(transcript)
      processedMarkdown = processedResult.markdown
    }

    // Send to OpenAI for analysis
    console.log('Analyzing with OpenAI...')
    const openaiAnalyzer = new OpenAIAnalyzer(openaiApiKey)
    const result = await openaiAnalyzer.analyzeServiceCall(processedMarkdown)
    
    console.log('OpenAI analysis completed successfully')
    console.log('Segments processed:', result.transcript.segments.length)
    
    return result
  } catch (error) {
    console.error('OpenAI analysis failed:', error)
    throw new Error(`OpenAI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Enhanced analysis using Gemini API for better stage categorization
export async function analyzeServiceCallWithGemini(transcript: string, geminiApiKey: string): Promise<AnalysisResult> {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Empty transcript provided for analysis')
  }

  if (!geminiApiKey || geminiApiKey.trim().length === 0) {
    throw new Error('Gemini API key is required for enhanced analysis')
  }

  console.log('Starting Gemini AI analysis...')
  console.log('Input length:', transcript.length, 'characters')
  console.log('Using API key:', geminiApiKey.substring(0, 8) + '...')
  
  try {
    // Check if the input is already processed markdown or raw transcript
    const isMarkdown = transcript.includes('# Service Call Transcript') || transcript.includes('### Exchange')
    
    let inputForAnalysis: string
    
    if (isMarkdown) {
      console.log('Input appears to be processed markdown, using directly...')
      inputForAnalysis = transcript
    } else {
      console.log('Input appears to be raw transcript, using as-is for Gemini...')
      inputForAnalysis = transcript
    }
    
    const geminiAnalyzer = createGeminiAnalyzer(geminiApiKey)
    const result = await geminiAnalyzer.analyzeServiceCall(inputForAnalysis)
    
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
    
    // Defensive check for Gemini result
    if (!analysisResult.transcript || !Array.isArray(analysisResult.transcript.segments)) {
      console.error('Invalid Gemini result structure:', analysisResult)
      throw new Error('Gemini analysis returned invalid result structure')
    }
    
    console.log('Final result segments:', analysisResult.transcript.segments.length)
    console.log('Final result compliance stages:', Object.keys(analysisResult.compliance))
    
    return analysisResult
  } catch (error) {
    console.error('Gemini analysis failed:', error)
    throw new Error(`Gemini AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Production transcription hook
export function useRealTranscription(config: TranscriptionConfig | null) {
  const [isTranscribing, setIsTranscribing] = useState(false)

  const transcribeAudio = async (file: File): Promise<TranscriptionResult> => {
    if (!config) {
      throw new Error('Transcription service not configured. Please configure an API key first.')
    }

    setIsTranscribing(true)
    
    try {
      console.log(`Starting real transcription with ${config.provider}...`)
      console.log(`File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
      
      const result = await transcriptionService.transcribe(file, config.apiKey, config.provider)
      
      if (!result.transcript || result.transcript.trim().length === 0) {
        throw new Error('Transcription completed but no text was returned')
      }
      
      console.log('Transcription completed successfully')
      return result
      
    } catch (error) {
      console.error('Real transcription error:', error)
      throw error
    } finally {
      setIsTranscribing(false)
    }
  }

  return { transcribeAudio, isTranscribing }
}
