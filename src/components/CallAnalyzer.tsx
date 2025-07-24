import { useState } from 'react'

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

export async function analyzeServiceCall(transcript: string): Promise<AnalysisResult> {
  const analysisPrompt = spark.llmPrompt`
You are an expert service call analyst. Analyze this service call transcript and provide a comprehensive evaluation.

TRANSCRIPT:
${transcript}

Please analyze this call and return a JSON response with the following structure:

{
  "callType": "Brief description of the type of service call",
  "overallScore": number (0-100),
  "compliance": {
    "introduction": {
      "present": boolean,
      "quality": "Poor" | "Fair" | "Good" | "Excellent",
      "notes": "Specific observations about introduction quality"
    },
    "diagnosis": {
      "present": boolean,
      "quality": "Poor" | "Fair" | "Good" | "Excellent", 
      "notes": "How well did technician diagnose the problem"
    },
    "solution": {
      "present": boolean,
      "quality": "Poor" | "Fair" | "Good" | "Excellent",
      "notes": "Quality of solution explanation"
    },
    "upsell": {
      "present": boolean,
      "quality": "Poor" | "Fair" | "Good" | "Excellent",
      "notes": "Any upsell attempts made"
    },
    "maintenance": {
      "present": boolean,
      "quality": "Poor" | "Fair" | "Good" | "Excellent", 
      "notes": "Maintenance plan offerings"
    },
    "closing": {
      "present": boolean,
      "quality": "Poor" | "Fair" | "Good" | "Excellent",
      "notes": "How professionally was the call concluded"
    }
  },
  "salesInsights": {
    "opportunities": ["List of sales opportunities identified"],
    "successful": ["List of successful sales actions"],
    "missed": ["List of missed opportunities"]
  },
  "transcript": {
    "segments": [
      {
        "speaker": "Technician" or "Customer",
        "timestamp": "MM:SS",
        "text": "What was said",
        "stage": "introduction" | "diagnosis" | "solution" | "upsell" | "maintenance" | "closing"
      }
    ]
  }
}

Focus on:
1. Professional standards compliance
2. Sales opportunity identification 
3. Customer satisfaction indicators
4. Areas for improvement
5. Specific coaching recommendations

Be thorough but constructive in your analysis.
  `

  try {
    const response = await spark.llm(analysisPrompt, 'gpt-4o', true)
    const analysis = JSON.parse(response)
    return analysis
  } catch (error) {
    console.error('Analysis failed:', error)
    throw new Error('Failed to analyze the call')
  }
}

export function useMockTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false)

  const transcribeAudio = async (file: File): Promise<string> => {
    setIsTranscribing(true)
    
    // Simulate transcription delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsTranscribing(false)
    
    // Return mock transcript - in real implementation this would call a transcription service
    return `Technician: Good morning! This is Mike from AirFlow Solutions. I'm here about your air conditioning service request. Am I speaking with Mrs. Johnson?

Customer: Yes, that's me. Thank you for coming out so quickly. The AC stopped working completely yesterday evening.

Technician: I understand how frustrating that must be, especially with this heat. Can you tell me what happened right before it stopped working? Any unusual sounds or behaviors?

Customer: Well, it's been making this grinding noise for about a week. Then yesterday it just shut off completely. We've had so many issues with this unit lately. Our energy bills have been through the roof too.

Technician: A grinding noise often indicates a motor bearing issue. Let me check the unit. How old is this system, and when was it last serviced?

Customer: It's about 12 years old. Honestly, we haven't had it serviced in probably 3 years. My husband has allergies and we've noticed the air quality isn't great either.

Technician: I've found the problem. The compressor motor bearing has failed. I can replace it today for $485, which includes labor and the part. This should get you back up and running.

Customer: That sounds reasonable. How long will it take? And is this something that's likely to happen again?

Technician: About 2 hours for the repair. This particular failure isn't common, but regular maintenance can prevent most issues. We do offer a maintenance plan that includes bi-annual check-ups.

Customer: What does that cost?

Technician: It's $199 annually. But let me get started on this repair first.

Technician: All done! Your system is running perfectly now. Everything looks good. Do you have any questions about the repair?

Customer: No, it feels much cooler already. Thank you so much!

Technician: You're very welcome! Here's my card with our 24/7 service number. If you have any issues, don't hesitate to call. Have a great day!`
  }

  return { transcribeAudio, isTranscribing }
}