import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Bug, Download, Eye, Code, Microphone, FileText } from '@phosphor-icons/react'
import { useState } from 'react'
import { ProcessedTranscript, TranscriptProcessor } from '@/services/transcript-processor'

interface DebugPanelProps {
  analysis: any
  transcript?: string
  processedTranscript?: ProcessedTranscript
  rawAssemblyAI?: any
}

export function DebugPanel({ analysis, transcript, processedTranscript, rawAssemblyAI }: DebugPanelProps) {
  const [showRaw, setShowRaw] = useState(false)
  
  const downloadDebugData = () => {
    const debugData = {
      timestamp: new Date().toISOString(),
      analysis,
      transcript,
      processedTranscript,
      rawAssemblyAI,
      stageDistribution: getStageDistribution(),
      segmentStats: getSegmentStats()
    }
    
    const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `call-analysis-debug-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }
  
  const getStageDistribution = () => {
    if (!analysis?.transcript?.segments) return {}
    
    return analysis.transcript.segments.reduce((acc: any, segment: any) => {
      acc[segment.stage] = (acc[segment.stage] || 0) + 1
      return acc
    }, {})
  }
  
  const getSegmentStats = () => {
    if (!analysis?.transcript?.segments) return {}
    
    const segments = analysis.transcript.segments
    const speakers = segments.reduce((acc: any, seg: any) => {
      acc[seg.speaker] = (acc[seg.speaker] || 0) + 1
      return acc
    }, {})
    
    return {
      totalSegments: segments.length,
      speakers,
      averageTextLength: segments.reduce((sum: number, seg: any) => sum + (seg.text?.length || 0), 0) / segments.length,
      emptySegments: segments.filter((seg: any) => !seg.text || seg.text.trim() === '').length
    }
  }
  
  const stageDistribution = getStageDistribution()
  const segmentStats = getSegmentStats()
  const validStages = ['introduction', 'diagnosis', 'solution', 'upsell', 'maintenance', 'closing']
  const emptyStages = validStages.filter(stage => !stageDistribution[stage] || stageDistribution[stage] === 0)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug size={20} />
          Analysis Debug Panel
        </CardTitle>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadDebugData}
            className="flex items-center gap-1"
          >
            <Download size={16} />
            Export Debug Data
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowRaw(!showRaw)}
            className="flex items-center gap-1"
          >
            {showRaw ? <Eye size={16} /> : <Code size={16} />}
            {showRaw ? 'Hide Raw' : 'Show Raw'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="processed">Processed</TabsTrigger>
            <TabsTrigger value="stages">Stage Analysis</TabsTrigger>
            <TabsTrigger value="segments">Segments</TabsTrigger>
            <TabsTrigger value="raw">Data Summary</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Segment Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Segments:</span>
                    <Badge variant="outline">{segmentStats.totalSegments}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Empty Segments:</span>
                    <Badge variant={segmentStats.emptySegments > 0 ? "destructive" : "default"}>
                      {segmentStats.emptySegments}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Text Length:</span>
                    <Badge variant="outline">{Math.round(segmentStats.averageTextLength || 0)} chars</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quality Indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Empty Stages:</span>
                    <Badge variant={emptyStages.length > 3 ? "destructive" : emptyStages.length > 1 ? "secondary" : "default"}>
                      {emptyStages.length}/6
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Speakers Identified:</span>
                    <Badge variant="outline">{Object.keys(segmentStats.speakers || {}).length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Call Type:</span>
                    <Badge variant="outline">{analysis?.callType || 'Unknown'}</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Data Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Transcription Provider:</span>
                    <Badge variant="outline">{rawAssemblyAI?.provider || rawAssemblyAI ? 'AssemblyAI' : 'Unknown'}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Raw AssemblyAI Data:</span>
                    <Badge variant={rawAssemblyAI ? "default" : "destructive"}>
                      {rawAssemblyAI ? 'Available' : 'Missing'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Speaker Diarization:</span>
                    <Badge variant={rawAssemblyAI?.utterances?.length > 0 ? "default" : "destructive"}>
                      {rawAssemblyAI?.utterances?.length > 0 ? 'Success' : rawAssemblyAI ? 'Failed' : 'N/A'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {emptyStages.length > 0 && (
              <Alert>
                <AlertDescription>
                  <strong>Empty Stages Detected:</strong> {emptyStages.join(', ')}
                  <br />
                  This suggests the AI may have poorly categorized segments. Check the Stage Analysis tab for details.
                </AlertDescription>
              </Alert>
            )}
            
            {segmentStats.emptySegments > 0 && (
              <Alert>
                <AlertDescription>
                  <strong>Empty Segments Found:</strong> {segmentStats.emptySegments} segments have no text content.
                  This may indicate parsing issues with the transcript.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="processed" className="space-y-4">
            {processedTranscript ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText size={16} />
                        Processing Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Original Length:</span>
                        <Badge variant="outline">{processedTranscript.originalLength.toLocaleString()} chars</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Processed Length:</span>
                        <Badge variant="outline">{processedTranscript.truncatedLength.toLocaleString()} chars</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Exchange Count:</span>
                        <Badge variant="outline">{processedTranscript.exchangeCount}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Was Truncated:</span>
                        <Badge variant={processedTranscript.truncated ? "destructive" : "default"}>
                          {processedTranscript.truncated ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Processing Benefits</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(() => {
                        const stats = TranscriptProcessor.getProcessingStats(processedTranscript)
                        return (
                          <>
                            <div className="flex justify-between">
                              <span className="text-sm">Size Reduction:</span>
                              <Badge variant="secondary">{stats.compressionRatio}</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Exchange Density:</span>
                              <Badge variant="outline">{stats.exchangeDensity}</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Avg Exchange Length:</span>
                              <Badge variant="outline">{stats.avgExchangeLength}</Badge>
                            </div>
                          </>
                        )
                      })()}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Processing Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{processedTranscript.summary}</p>
                    
                    <div className="mt-4 flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => TranscriptProcessor.downloadMarkdown(processedTranscript)}
                        className="flex items-center gap-1"
                      >
                        <Download size={14} />
                        Download Markdown
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Processed Markdown Info</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Markdown Length:</span>
                        <Badge variant="outline">{processedTranscript.markdown.length.toLocaleString()} chars</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">First Exchange:</span>
                        <Badge variant="outline">
                          {processedTranscript.markdown.includes('### Exchange 1:') ? 'Found' : 'Missing'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Download the full markdown file to view complete content. Preview removed to prevent UI crashes.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Alert>
                <AlertDescription>
                  No processed transcript data available. This may indicate the analysis was performed with an older version of the system.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="stages" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {validStages.map(stage => (
                <Card key={stage}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm capitalize">{stage}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {stageDistribution[stage] || 0}
                      </span>
                      <Badge variant={
                        !stageDistribution[stage] ? "destructive" : 
                        stageDistribution[stage] > segmentStats.totalSegments * 0.5 ? "secondary" : 
                        "default"
                      }>
                        {Math.round(((stageDistribution[stage] || 0) / segmentStats.totalSegments) * 100)}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Stage Distribution Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p><strong>Total Distribution:</strong> {String(Object.values(stageDistribution).reduce((sum: number, count: unknown) => sum + (typeof count === 'number' ? count : 0), 0))} segments</p>
                  <p><strong>Most Common Stage:</strong> {String(Object.entries(stageDistribution).sort(([,a]: any, [,b]: any) => b - a)[0]?.[0] || 'None')}</p>
                  <p><strong>Distribution Quality:</strong> 
                    <Badge className="ml-2" variant={
                      emptyStages.length > 3 ? "destructive" : 
                      emptyStages.length > 1 ? "secondary" : 
                      "default"
                    }>
                      {emptyStages.length > 3 ? 'Poor' : emptyStages.length > 1 ? 'Fair' : 'Good'}
                    </Badge>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="segments">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(() => {
                const segments = analysis?.transcript?.segments || []
                const maxDisplaySegments = 50 // Limit to prevent crashes
                const displaySegments = segments.slice(0, maxDisplaySegments)
                
                return (
                  <>
                    {segments.length > maxDisplaySegments && (
                      <Alert>
                        <AlertDescription>
                          Showing first {maxDisplaySegments} of {segments.length} segments to prevent UI crashes. 
                          Use Export Debug Data to access all segments.
                        </AlertDescription>
                      </Alert>
                    )}
                    {displaySegments.map((segment: any, index: number) => (
                      <div key={index} className="border rounded p-3 space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="outline">{segment.speaker}</Badge>
                          <Badge variant="secondary">{segment.stage}</Badge>
                          <span className="text-muted-foreground">{segment.timestamp}</span>
                        </div>
                        <p className="text-sm">
                          {segment.text?.length > 200 
                            ? `${segment.text.substring(0, 200)}...` 
                            : segment.text || <em className="text-muted-foreground">No text</em>
                          }
                        </p>
                      </div>
                    ))}
                    {displaySegments.length === 0 && (
                      <p className="text-muted-foreground">No segments available</p>
                    )}
                  </>
                )
              })()}
            </div>
          </TabsContent>
          
          <TabsContent value="raw">
            {showRaw ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Analysis Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Call Type:</span>
                        <Badge variant="outline">{analysis?.callType || 'Unknown'}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Overall Score:</span>
                        <Badge variant="outline">{analysis?.overallScore || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Segments Count:</span>
                        <Badge variant="outline">{analysis?.transcript?.segments?.length || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Sales Opportunities:</span>
                        <Badge variant="outline">{analysis?.salesInsights?.opportunities?.length || 0}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-4">
                        Full analysis object and transcript display removed to prevent UI crashes. Use Export Debug Data to download complete information.
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Transcript Info</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Original Length:</span>
                        <Badge variant="outline">{transcript?.length?.toLocaleString() || 0} chars</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Contains Exchanges:</span>
                        <Badge variant="outline">
                          {transcript?.includes('### Exchange') ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Original transcript display removed to prevent crashes. Use Export Debug Data to access full content.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  Click "Show Raw" above to view analysis and transcript summaries. Full content removed to prevent UI crashes.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}