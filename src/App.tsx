import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useKV } from '@github/spark/hooks'
import { CloudArrowUp, ChartBar, CheckCircle, XCircle, TrendingUp, Clock, Microphone, AlertTriangle, Bug } from '@phosphor-icons/react'
import { analyzeServiceCall, analyzeServiceCallWithGemini, analyzeServiceCallWithOpenAI, useRealTranscription, useMockTranscription } from '@/components/CallAnalyzer'
import { InsightsPanel } from '@/components/InsightsPanel'
import { DebugPanel } from '@/components/DebugPanel'
import { TranscriptionConfig } from '@/services/transcription'

interface CallAnalysis {
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

function App() {
  const [analysis, setAnalysis] = useKV<CallAnalysis | null>('call-analysis', null)
  const [originalTranscript, setOriginalTranscript] = useKV<string | null>('original-transcript', null)
  const [transcriptionConfig, setTranscriptionConfig] = useKV<TranscriptionConfig | null>('transcription-config', {
    provider: 'assemblyai',
    apiKey: '6e1ea8623e884e45b0da2f9b33bb06f9'
  })
  const [geminiApiKey, setGeminiApiKey] = useKV<string | null>('gemini-api-key', 'AIzaSyAXkbkoculIKMISxHFkP1j7NunKeOYJAlM')
  const [openaiApiKey, setOpenaiApiKey] = useKV<string | null>('openai-api-key', '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')
  const [aiProvider, setAiProvider] = useKV<'spark' | 'gemini' | 'openai'>('ai-provider', 'openai')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentStep, setCurrentStep] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  
  // Use real transcription if configured, fallback to mock
  const { transcribeAudio: realTranscribe, isTranscribing: isRealTranscribing } = useRealTranscription(transcriptionConfig)
  const { transcribeAudio: mockTranscribe, isTranscribing: isMockTranscribing } = useMockTranscription()
  
  const isTranscribing = transcriptionConfig ? isRealTranscribing : isMockTranscribing
  const transcribeAudio = transcriptionConfig ? realTranscribe : mockTranscribe

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setDebugInfo(null)
    setIsAnalyzing(true)
    
    try {
      console.log('Starting file upload process...')
      setCurrentStep('Transcribing audio...')
      
      const transcript = await transcribeAudio(file)
      console.log('Transcription completed, length:', transcript.length)
      
      // Store the original transcript for debugging
      setOriginalTranscript(transcript)
      
      setCurrentStep('Analyzing conversation with AI...')
      console.log('Starting AI analysis...')
      
      let analysisResult
      if (aiProvider === 'openai' && openaiApiKey) {
        setCurrentStep('Analyzing with OpenAI (enhanced stage categorization)...')
        console.log('Using OpenAI for enhanced analysis...')
        analysisResult = await analyzeServiceCallWithOpenAI(transcript, openaiApiKey)
        console.log('OpenAI analysis completed successfully')
      } else if (aiProvider === 'gemini' && geminiApiKey) {
        setCurrentStep('Analyzing with Gemini AI (enhanced stage categorization)...')
        console.log('Using Gemini AI for enhanced analysis...')
        analysisResult = await analyzeServiceCallWithGemini(transcript, geminiApiKey)
        console.log('Gemini analysis completed successfully')
      } else {
        setCurrentStep('Analyzing with Spark AI...')
        console.log('Using Spark AI for analysis...')
        analysisResult = await analyzeServiceCall(transcript)
      }
      
      console.log('Analysis completed successfully')
      
      setAnalysis(analysisResult)
      setCurrentStep('')
      console.log('Analysis saved to state')
    } catch (err) {
      console.error('Full error details:', err)
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed with unknown error'
      setError(`Analysis Error: ${errorMessage}`)
      
      // Enhanced debug info with suggestions
      let debugDetails = ''
      if (err instanceof Error) {
        debugDetails = `Error: ${err.message}\n\nStack Trace:\n${err.stack || 'No stack trace available'}`
        
        // Add specific context and suggestions based on error type
        if (err.message.includes('Invalid OpenAI API key')) {
          debugDetails += '\n\nSUGGESTION: Your OpenAI API key appears to be invalid. Please:'
          debugDetails += '\n1. Check that your API key starts with "sk-proj-" or "sk-"'
          debugDetails += '\n2. Ensure you copied the full key from OpenAI Platform'
          debugDetails += '\n3. Try the "Test" button to verify your API key'
        } else if (err.message.includes('Invalid Gemini API key')) {
          debugDetails += '\n\nSUGGESTION: Your Gemini API key appears to be invalid. Please:'
          debugDetails += '\n1. Check that your API key starts with "AIza"'
          debugDetails += '\n2. Ensure you copied the full key from Google AI Studio'
          debugDetails += '\n3. Try the "Test" button to verify your API key'
        } else if (err.message.includes('quota') || err.message.includes('billing')) {
          debugDetails += '\n\nSUGGESTION: Your API quota may be exceeded. Please:'
          debugDetails += '\n1. Check your usage at your API provider dashboard'
          debugDetails += '\n2. Verify your billing settings (free tier has limits)'
          debugDetails += '\n3. Try again later if you hit rate limits'
          debugDetails += '\n4. Consider using Spark AI instead (switch AI provider)'
        } else if (err.message.includes('JSON') || err.message.includes('parse')) {
          debugDetails += '\n\nSUGGESTION: This appears to be a JSON parsing error from the AI service.'
          debugDetails += '\n1. Try using Spark AI instead (switch AI provider above)'
          debugDetails += '\n2. The AI response may have been malformed or incomplete'
          debugDetails += '\n3. Try again as this could be a temporary issue'
          debugDetails += '\n4. If using OpenAI, check that your account has sufficient credits'
        } else if (err.message.includes('Network error')) {
          debugDetails += '\n\nSUGGESTION: Network connection issue.'
          debugDetails += '\n1. Check your internet connection'
          debugDetails += '\n2. Try again in a few moments'
        } else if (err.message.includes('transcription')) {
          debugDetails += '\n\nSUGGESTION: This appears to be a transcription error.'
          debugDetails += '\n1. Check that your audio file is supported (MP3, WAV, MP4, etc.)'
          debugDetails += '\n2. Ensure file size is under 50MB'
          debugDetails += '\n3. Try the demo button for testing'
        }
      } else {
        debugDetails = `Unknown error type: ${typeof err}\nValue: ${String(err)}`
      }
      
      setDebugInfo(debugDetails)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getComplianceIcon = (present: boolean, quality: string) => {
    if (!present) return <XCircle className="text-destructive" weight="fill" />
    if (quality === "Excellent" || quality === "Good") return <CheckCircle className="text-green-600" weight="fill" />
    return <CheckCircle className="text-yellow-600" weight="fill" />
  }

  const getStageSegments = (stage: string) => {
    return analysis?.transcript.segments.filter(segment => segment.stage === stage) || []
  }

  const getProgressValue = () => {
    if (isTranscribing) return 20
    if (isAnalyzing) {
      if (currentStep.includes('Stage 1')) return 35
      if (currentStep.includes('Stage 2')) return 50
      if (currentStep.includes('Stage 3')) return 65
      if (currentStep.includes('Stage 4')) return 80
      if (currentStep.includes('Analyzing')) return 40
    }
    return 100
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Service Call Analysis Dashboard</h1>
            <p className="text-muted-foreground">Upload a service call recording to analyze technician performance and sales opportunities</p>
            <div className="mt-4 flex justify-center">
              <Badge variant="default" className="bg-green-600">
                {aiProvider === 'openai' && openaiApiKey ? 'OpenAI Enhanced Analysis' : 
                 aiProvider === 'gemini' && geminiApiKey ? 'Gemini AI Enhanced Analysis' : 
                 'AssemblyAI + Spark AI Analysis'}
              </Badge>
            </div>
          </div>

            <div className="space-y-6">
              <Card className="max-w-md mx-auto">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <CloudArrowUp size={24} />
                    Upload Recording
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isAnalyzing || isTranscribing ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        <Microphone size={48} className="text-primary animate-pulse" />
                      </div>
                      <div>
                        <Progress value={getProgressValue()} className="mb-2" />
                        <p className="text-sm text-center text-muted-foreground">
                          {currentStep || 'Processing...'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {error && (
                        <Alert className="border-destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-2">
                              <p>{error}</p>
                              {debugInfo && (
                                <details className="mt-2">
                                  <summary className="text-xs cursor-pointer">Technical Details</summary>
                                  <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-auto max-h-32">
                                    {debugInfo}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                        <CloudArrowUp size={48} className="mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-4">
                          Select an audio or video file to begin analysis
                        </p>
                        <input
                          type="file"
                          accept="audio/*,video/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="audio-upload"
                        />
                        <Button asChild>
                          <label htmlFor="audio-upload" className="cursor-pointer">
                            Choose File
                          </label>
                        </Button>
                      </div>
                      
                      <Alert>
                        <AlertDescription>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <strong>Analysis Configuration</strong>
                              <Badge variant="secondary">
                                {aiProvider === 'openai' && openaiApiKey ? 'OPENAI' : 
                                 aiProvider === 'gemini' && geminiApiKey ? 'GEMINI AI' : 'SPARK AI'}
                              </Badge>
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-medium">AI Provider:</label>
                                <div className="mt-2 space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      id="provider-spark"
                                      name="aiProvider"
                                      checked={aiProvider === 'spark'}
                                      onChange={() => setAiProvider('spark')}
                                      className="rounded border-gray-300"
                                    />
                                    <label htmlFor="provider-spark" className="text-sm">
                                      Spark AI (Built-in analysis)
                                    </label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      id="provider-openai"
                                      name="aiProvider"
                                      checked={aiProvider === 'openai'}
                                      onChange={() => setAiProvider('openai')}
                                      className="rounded border-gray-300"
                                    />
                                    <label htmlFor="provider-openai" className="text-sm">
                                      OpenAI (Enhanced analysis with GPT-4)
                                    </label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      id="provider-gemini"
                                      name="aiProvider"
                                      checked={aiProvider === 'gemini'}
                                      onChange={() => setAiProvider('gemini')}
                                      className="rounded border-gray-300"
                                    />
                                    <label htmlFor="provider-gemini" className="text-sm">
                                      Gemini AI (Google's AI model)
                                    </label>
                                  </div>
                                </div>
                              </div>
                              
                               {aiProvider === 'openai' && (
                                <div>
                                  <label className="text-xs text-muted-foreground">OpenAI API Key:</label>
                                  <div className="flex gap-2 mt-1">
                                    <input
                                      type="password"
                                      value={openaiApiKey || ''}
                                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                                      placeholder="Enter OpenAI API key (sk-proj-...)"
                                      className="flex-1 px-2 py-1 text-xs border rounded"
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        if (!openaiApiKey || openaiApiKey.trim().length === 0) {
                                          setError('Please enter an OpenAI API key first')
                                          return
                                        }
                                        
                                        setError(null)
                                        setDebugInfo(null)
                                        
                                        try {
                                          setCurrentStep('Testing OpenAI API connection...')
                                          console.log('Testing OpenAI API key...')
                                          
                                          const { testOpenAIAPI } = await import('@/services/openai')
                                          const testResult = await testOpenAIAPI(openaiApiKey)
                                          
                                          if (testResult.success) {
                                            setCurrentStep('✅ OpenAI API key is valid!')
                                            setTimeout(() => setCurrentStep(''), 3000)
                                          } else {
                                            throw new Error(testResult.error || 'API test failed')
                                          }
                                          
                                        } catch (err) {
                                          console.error('OpenAI API test failed:', err)
                                          const errorMessage = err instanceof Error ? err.message : 'API test failed'
                                          setError(`API Test Failed: ${errorMessage}`)
                                          setCurrentStep('')
                                          
                                          if (err instanceof Error && err.message.includes('Invalid OpenAI API key')) {
                                            setDebugInfo('Please check that your API key is correct and has the format: sk-proj-...')
                                          } else if (err instanceof Error && err.message.includes('quota')) {
                                            setDebugInfo('Your OpenAI API quota may be exceeded. Check your OpenAI billing and usage.')
                                          } else if (err instanceof Error && err.message.includes('403')) {
                                            setDebugInfo('API key may not have proper permissions. Ensure you\'re using a valid OpenAI API key.')
                                          }
                                        }
                                      }}
                                      disabled={!openaiApiKey || openaiApiKey.trim().length === 0}
                                      className="text-xs"
                                    >
                                      Test
                                    </Button>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Get your API key from{' '}
                                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" className="text-primary underline">
                                      OpenAI Platform
                                    </a>
                                  </p>
                                </div>
                               )}

                               {aiProvider === 'gemini' && (
                                <div>
                                  <label className="text-xs text-muted-foreground">Gemini API Key (Free Tier):</label>
                                  <div className="flex gap-2 mt-1">
                                    <input
                                      type="password"
                                      value={geminiApiKey || ''}
                                      onChange={(e) => setGeminiApiKey(e.target.value)}
                                      placeholder="Enter Gemini API key (AIzaSy...)"
                                      className="flex-1 px-2 py-1 text-xs border rounded"
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        if (!geminiApiKey || geminiApiKey.trim().length === 0) {
                                          setError('Please enter a Gemini API key first')
                                          return
                                        }
                                        
                                        setError(null)
                                        setDebugInfo(null)
                                        
                                        try {
                                          setCurrentStep('Testing Gemini API connection...')
                                          console.log('Testing Gemini API key...')
                                          
                                          const { testGeminiAPI } = await import('@/services/gemini-test')
                                          const testResult = await testGeminiAPI(geminiApiKey)
                                          
                                          if (testResult.success) {
                                            setCurrentStep('✅ Gemini API key is valid!')
                                            setTimeout(() => setCurrentStep(''), 3000)
                                          } else {
                                            throw new Error(testResult.error || 'API test failed')
                                          }
                                          
                                        } catch (err) {
                                          console.error('Gemini API test failed:', err)
                                          const errorMessage = err instanceof Error ? err.message : 'API test failed'
                                          setError(`API Test Failed: ${errorMessage}`)
                                          setCurrentStep('')
                                          
                                          if (err instanceof Error && err.message.includes('Invalid Gemini API key')) {
                                            setDebugInfo('Please check that your API key is correct and has the format: AIzaSy...')
                                          } else if (err instanceof Error && err.message.includes('quota')) {
                                            setDebugInfo('Your Gemini API quota may be exceeded. Check your Google AI Studio billing and usage.')
                                          } else if (err instanceof Error && err.message.includes('403')) {
                                            setDebugInfo('API key may not have proper permissions. Ensure you\'re using a Google AI Studio API key, not a Google Cloud API key.')
                                          }
                                        }
                                      }}
                                      disabled={!geminiApiKey || geminiApiKey.trim().length === 0}
                                      className="text-xs"
                                    >
                                      Test
                                    </Button>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Free tier has quota limits. Get your key from{' '}
                                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" className="text-primary underline">
                                      Google AI Studio
                                    </a>
                                  </p>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between">
                                <strong>AssemblyAI Transcription Active</strong>
                                <Badge variant="secondary">
                                  PRODUCTION
                                </Badge>
                              </div>
                              <p className="text-sm">
                                Using AssemblyAI with speaker identification for production-quality results.
                              </p>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>

                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">For testing purposes:</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={async () => {
                            setError(null)
                            setDebugInfo(null)
                            setIsAnalyzing(true)
                            setCurrentStep('Stage 1: Parsing test transcript...')
                            
                            try {
                              const testTranscript = `Technician: Good morning! This is Mike from AirFlow Solutions. I'm here about your air conditioning service request. Am I speaking with Mrs. Johnson?

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

Customer: Perfect. Thank you for the excellent service! You really know what you're doing.

Technician: You're very welcome, Mrs. Johnson! I'll be back in the spring for your first tune-up. Have a great day and stay cool!`
                              
                              // Store the test transcript for debugging
                              setOriginalTranscript(testTranscript)
                              
                              let analysisResult
                              if (aiProvider === 'openai' && openaiApiKey) {
                                setCurrentStep('Test analysis: Using OpenAI...')
                                console.log('Using OpenAI for test analysis...')
                                analysisResult = await analyzeServiceCallWithOpenAI(testTranscript, openaiApiKey)
                                console.log('OpenAI test analysis completed successfully')
                              } else if (aiProvider === 'gemini' && geminiApiKey) {
                                setCurrentStep('Test analysis: Using Gemini AI...')
                                console.log('Using Gemini AI for test analysis...')
                                analysisResult = await analyzeServiceCallWithGemini(testTranscript, geminiApiKey)
                                console.log('Gemini test analysis completed successfully')
                              } else {
                                setCurrentStep('Test analysis: Using Spark AI...')
                                console.log('Using Spark AI for test analysis...')
                                analysisResult = await analyzeServiceCall(testTranscript)
                              }
                              
                              setAnalysis(analysisResult)
                              setCurrentStep('')
                            } catch (err) {
                              console.error('Test analysis error:', err)
                              const errorMessage = err instanceof Error ? err.message : 'Test analysis failed'
                              setError(`Test Analysis Error: ${errorMessage}`)
                              
                              let debugDetails = ''
                              if (err instanceof Error) {
                                debugDetails = `Error: ${err.message}\n\nStack Trace:\n${err.stack || 'No stack trace available'}`
                                
                                if (err.message.includes('Invalid Gemini API key')) {
                                  debugDetails += '\n\nSUGGESTION: API key validation failed. Use the "Test" button first.'
                                } else if (err.message.includes('quota')) {
                                  debugDetails += '\n\nSUGGESTION: Check your Gemini API quota at https://aistudio.google.com/'
                                }
                              } else {
                                debugDetails = 'Unknown error type'
                              }
                              
                              setDebugInfo(debugDetails)
                            } finally {
                              setIsAnalyzing(false)
                            }
                          }}
                          className="w-full"
                        >
                          Test AI Analysis (Demo)
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Call Analysis Results</h1>
            <p className="text-muted-foreground">AI-powered performance and sales opportunity assessment</p>
          </div>
          <Button variant="outline" onClick={() => {
            setAnalysis(null)
            setOriginalTranscript(null)
            setError(null)
            setDebugInfo(null)
            console.log('Analysis data cleared')
          }}>
            Analyze New Call
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartBar size={20} />
                Call Overview
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={aiProvider !== 'spark' ? "default" : "secondary"}>
                  {aiProvider === 'openai' && openaiApiKey ? 'OpenAI Analysis' : 
                   aiProvider === 'gemini' && geminiApiKey ? 'Gemini AI Analysis' : 'Spark AI Analysis'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Call Type</p>
                <p className="text-lg font-semibold">{analysis.callType}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall Score</p>
                <div className="flex items-center gap-2">
                  <Progress value={analysis.overallScore} className="flex-1" />
                  <span className="text-lg font-bold">{analysis.overallScore}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Segments</p>
                <p className="flex items-center gap-1">
                  <Clock size={16} />
                  {analysis.transcript.segments.length} exchanges
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Check</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analysis.compliance).map(([stage, data]) => (
                  <div key={stage} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{stage}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={data.quality === "Excellent" ? "default" : data.quality === "Good" ? "secondary" : "destructive"}>
                        {data.quality}
                      </Badge>
                      {getComplianceIcon(data.present, data.quality)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={20} />
                Sales Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Opportunities Identified</p>
                <p className="text-2xl font-bold text-accent">{analysis.salesInsights.opportunities.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Successful Actions</p>
                <p className="text-2xl font-bold text-green-600">{analysis.salesInsights.successful.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Missed Opportunities</p>
                <p className="text-2xl font-bold text-destructive">{analysis.salesInsights.missed.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="transcript" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="transcript">Transcript & Analysis</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Details</TabsTrigger>
            <TabsTrigger value="sales">Sales Insights</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="debug" className="flex items-center gap-1">
              <Bug size={16} />
              Debug
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transcript" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Call Transcript by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="introduction" orientation="horizontal">
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="introduction">Intro</TabsTrigger>
                    <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
                    <TabsTrigger value="solution">Solution</TabsTrigger>
                    <TabsTrigger value="upsell">Upsell</TabsTrigger>
                    <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                    <TabsTrigger value="closing">Closing</TabsTrigger>
                  </TabsList>

                  {["introduction", "diagnosis", "solution", "upsell", "maintenance", "closing"].map(stage => (
                    <TabsContent key={stage} value={stage} className="mt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold capitalize">{stage}</h3>
                          <Badge variant={analysis.compliance[stage as keyof typeof analysis.compliance].quality === "Excellent" ? "default" : "secondary"}>
                            {analysis.compliance[stage as keyof typeof analysis.compliance].quality}
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          {getStageSegments(stage).length > 0 ? (
                            getStageSegments(stage).map((segment, index) => (
                              <div key={index} className="border-l-4 border-primary/20 pl-4 py-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {segment.speaker}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">{segment.timestamp}</span>
                                </div>
                                <p className="text-sm">{segment.text}</p>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <p>No content identified for this stage</p>
                            </div>
                          )}
                        </div>

                        <Separator />
                        
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <h4 className="font-medium mb-2">Analysis Notes</h4>
                          <p className="text-sm text-muted-foreground">
                            {analysis.compliance[stage as keyof typeof analysis.compliance].notes}
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(analysis.compliance).map(([stage, data]) => (
                <Card key={stage}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="capitalize">{stage}</span>
                      {getComplianceIcon(data.present, data.quality)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Present:</span>
                      <Badge variant={data.present ? "default" : "destructive"}>
                        {data.present ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Quality:</span>
                      <Badge variant={data.quality === "Excellent" ? "default" : data.quality === "Good" ? "secondary" : "destructive"}>
                        {data.quality}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Notes:</p>
                      <p className="text-sm text-muted-foreground">{data.notes}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-accent">Opportunities Identified</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.salesInsights.opportunities.length > 0 ? (
                      analysis.salesInsights.opportunities.map((opportunity, index) => (
                        <div key={index} className="p-3 bg-accent/10 rounded-lg">
                          <p className="text-sm">{opportunity}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No opportunities identified</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Successful Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.salesInsights.successful.length > 0 ? (
                      analysis.salesInsights.successful.map((success, index) => (
                        <div key={index} className="p-3 bg-green-50 rounded-lg">
                          <p className="text-sm">{success}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No successful actions noted</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-destructive">Missed Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.salesInsights.missed.length > 0 ? (
                      analysis.salesInsights.missed.map((missed, index) => (
                        <div key={index} className="p-3 bg-destructive/10 rounded-lg">
                          <p className="text-sm">{missed}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No missed opportunities identified</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recommendations">
            <InsightsPanel analysis={analysis} />
          </TabsContent>

          <TabsContent value="debug">
            <DebugPanel analysis={analysis} transcript={originalTranscript || undefined} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App