import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Bug, Download, Eye, Code } from '@phosphor-icons/react'
import { useState } from 'react'

interface DebugPanelProps {
  analysis: any
  transcript?: string
}

export function DebugPanel({ analysis, transcript }: DebugPanelProps) {
  const [showRaw, setShowRaw] = useState(false)
  
  const downloadDebugData = () => {
    const debugData = {
      timestamp: new Date().toISOString(),
      analysis,
      transcript,
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stages">Stage Analysis</TabsTrigger>
            <TabsTrigger value="segments">Segments</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
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
                  <p><strong>Total Distribution:</strong> {Object.values(stageDistribution).reduce((sum: number, count: any) => sum + count, 0)} segments</p>
                  <p><strong>Most Common Stage:</strong> {Object.entries(stageDistribution).sort(([,a]: any, [,b]: any) => b - a)[0]?.[0] || 'None'}</p>
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
              {analysis?.transcript?.segments?.map((segment: any, index: number) => (
                <div key={index} className="border rounded p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline">{segment.speaker}</Badge>
                    <Badge variant="secondary">{segment.stage}</Badge>
                    <span className="text-muted-foreground">{segment.timestamp}</span>
                  </div>
                  <p className="text-sm">{segment.text || <em className="text-muted-foreground">No text</em>}</p>
                </div>
              )) || <p className="text-muted-foreground">No segments available</p>}
            </div>
          </TabsContent>
          
          <TabsContent value="raw">
            {showRaw ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Analysis Object</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-64">
                      {JSON.stringify(analysis, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
                
                {transcript && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Original Transcript</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-64">
                        {transcript}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  Click "Show Raw" above to view the complete analysis object and original transcript data.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}