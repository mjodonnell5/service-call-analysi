import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useKV } from '@github/spark/hooks'
import { CloudArrowUp, ChartBar, CheckCircle, XCircle, TrendingUp, Clock, Microphone, AlertTriangle } from '@phosphor-icons/react'
import { analyzeServiceCall, useRealTranscription, useMockTranscription } from '@/components/CallAnalyzer'
import { InsightsPanel } from '@/components/InsightsPanel'
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
  const [transcriptionConfig, setTranscriptionConfig] = useKV<TranscriptionConfig | null>('transcription-config', {
    provider: 'assemblyai',
    apiKey: '6e1ea8623e884e45b0da2f9b33bb06f9'
  })
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
      
      setCurrentStep('Analyzing conversation with AI...')
      console.log('Starting AI analysis...')
      
      const analysisResult = await analyzeServiceCall(transcript)
      console.log('Analysis completed successfully')
      
      setAnalysis(analysisResult)
      setCurrentStep('')
      console.log('Analysis saved to state')
    } catch (err) {
      console.error('Full error details:', err)
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed with unknown error'
      setError(`Analysis Error: ${errorMessage}`)
      
      // Enhanced debug info
      let debugDetails = ''
      if (err instanceof Error) {
        debugDetails = `Error: ${err.message}\n\nStack Trace:\n${err.stack || 'No stack trace available'}`
        
        // Add additional context if available
        if (err.message.includes('JSON')) {
          debugDetails += '\n\nThis appears to be a JSON parsing error. The AI service may have returned invalid JSON.'
        } else if (err.message.includes('AI service')) {
          debugDetails += '\n\nThis appears to be an AI service error. The Spark AI service may be temporarily unavailable.'
        } else if (err.message.includes('transcription')) {
          debugDetails += '\n\nThis appears to be a transcription error. Check the audio file format and size.'
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
                Production Mode - AssemblyAI Transcription Active
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
                          <div className="space-y-2">
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
                              
                              const analysisResult = await analyzeServiceCall(testTranscript)
                              setAnalysis(analysisResult)
                              setCurrentStep('')
                            } catch (err) {
                              console.error('Test analysis error:', err)
                              const errorMessage = err instanceof Error ? err.message : 'Test analysis failed'
                              setError(`Test Analysis Error: ${errorMessage}`)
                              setDebugInfo(err instanceof Error ? err.stack || 'No stack trace available' : 'Unknown error type')
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
          <Button variant="outline" onClick={() => setAnalysis(null)}>
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="transcript">Transcript & Analysis</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Details</TabsTrigger>
            <TabsTrigger value="sales">Sales Insights</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
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
        </Tabs>
      </div>
    </div>
  )
}

export default App