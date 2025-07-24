import { useState } from 'react'
import { transcriptionService, TranscriptionConfig, TranscriptionResult } from '@/services/transcription'
import { createGeminiAnalyzer, GeminiAnalysisResult } from '@/services/gemini'
import { OpenAIAnalyzer } from '@/services/openai'
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

// Enhanced analysis using OpenAI API with transcript processing and markdown conversion
export async function analyzeServiceCallWithOpenAI(transcript: string, openaiApiKey: string): Promise<AnalysisResult> {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Empty transcript provided for analysis')
  }

  if (!openaiApiKey || openaiApiKey.trim().length === 0) {
    throw new Error('OpenAI API key is required for enhanced analysis')
  }

  console.log('Starting OpenAI analysis with transcript processing...')
  console.log('Original transcript length:', transcript.length, 'characters')
  console.log('Using API key:', openaiApiKey.substring(0, 8) + '...')
  
  try {
    // Step 1: Process and truncate the AssemblyAI transcript
    console.log('Processing AssemblyAI transcript (truncating to first 10 exchanges)...')
    const processedTranscript = TranscriptProcessor.processAssemblyAITranscript(transcript, 10)
    
    console.log('Transcript processing completed:')
    console.log(`- Original length: ${processedTranscript.originalLength} chars`)
    console.log(`- Processed length: ${processedTranscript.truncatedLength} chars`)
    console.log(`- Exchange count: ${processedTranscript.exchangeCount}`)
    console.log(`- Was truncated: ${processedTranscript.truncated}`)
    console.log(`- Summary: ${processedTranscript.summary}`)
    
    // Step 2: Analyze the markdown transcript with OpenAI
    console.log('Analyzing processed markdown with OpenAI...')
    const openaiAnalyzer = new OpenAIAnalyzer(openaiApiKey)
    const result = await openaiAnalyzer.analyzeServiceCall(processedTranscript.markdown)
    
    console.log('OpenAI analysis completed successfully')
    console.log('Final result segments:', result.transcript.segments.length)
    console.log('Final result compliance stages:', Object.keys(result.compliance))
    
    return result
  } catch (error) {
    console.error('OpenAI analysis failed:', error)
    throw new Error(`OpenAI AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

  console.log('Starting Gemini AI analysis of transcript...')
  console.log('Transcript length:', transcript.length, 'characters')
  console.log('Using API key:', geminiApiKey.substring(0, 8) + '...')
  
  try {
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
