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
import { analyzeServiceCall, useMockTranscription } from '@/components/CallAnalyzer'
import { InsightsPanel } from '@/components/InsightsPanel'

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
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentStep, setCurrentStep] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  
  const { transcribeAudio, isTranscribing } = useMockTranscription()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setDebugInfo(null)
    setIsAnalyzing(true)
    
    try {
      setCurrentStep('Transcribing audio...')
      const transcript = await transcribeAudio(file)
      
      setCurrentStep('Analyzing conversation...')
      const analysisResult = await analyzeServiceCall(transcript)
      
      setAnalysis(analysisResult)
      setCurrentStep('')
    } catch (err) {
      console.error('Full error details:', err)
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed with unknown error'
      setError(`Analysis Error: ${errorMessage}`)
      setDebugInfo(err instanceof Error ? err.stack || 'No stack trace available' : 'Unknown error type')
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
    if (isTranscribing) return 30
    if (isAnalyzing && currentStep.includes('Analyzing')) return 70
    return 100
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Service Call Analysis Dashboard</h1>
            <p className="text-muted-foreground">Upload a service call recording to analyze technician performance and sales opportunities</p>
          </div>

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
                      Select an audio file to begin analysis
                    </p>
                    <input
                      type="file"
                      accept="audio/*"
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
                      <strong>AI-Powered Analysis:</strong> This tool uses advanced AI to transcribe and analyze service calls, identifying compliance issues and sales opportunities.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
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