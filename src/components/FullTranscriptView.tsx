import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface TranscriptSegment {
  speaker: string
  timestamp: string
  text: string
  stage: string
  annotation?: string
  highlight?: 'success' | 'opportunity' | 'concern' | 'neutral'
}

interface FullTranscriptViewProps {
  segments: TranscriptSegment[]
  compliance: Record<string, { present: boolean; quality: string; notes: string }>
}

const STAGES = [
  { id: 'introduction', label: 'Intro' },
  { id: 'diagnosis', label: 'Diagnosis' },
  { id: 'solution', label: 'Solution' },
  { id: 'upsell', label: 'Upsell' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'closing', label: 'Closing' }
]

const getHighlightColors = (highlight?: string, isActive?: boolean) => {
  if (!isActive) return 'opacity-40'
  
  switch (highlight) {
    case 'success':
      return 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20'
    case 'opportunity':
      return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
    case 'concern':
      return 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20'
    default:
      return 'border-l-gray-300 bg-gray-50/50 dark:bg-gray-950/20'
  }
}

const getStageColor = (stage: string, quality: string) => {
  if (quality === 'Excellent') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  if (quality === 'Good') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  if (quality === 'Fair') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
}

export function FullTranscriptView({ segments, compliance }: FullTranscriptViewProps) {
  const [activeStage, setActiveStage] = useState<string>('all')

  const getStageCount = (stageId: string) => {
    return segments.filter(segment => segment.stage === stageId).length
  }

  const isSegmentActive = (segment: TranscriptSegment) => {
    return activeStage === 'all' || segment.stage === activeStage
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Call Transcript</CardTitle>
        <div className="text-sm text-muted-foreground">
          Click on a stage below to highlight relevant portions of the conversation
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stage Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeStage === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveStage('all')}
            className="h-8"
          >
            All Segments ({segments.length})
          </Button>
          {STAGES.map(stage => {
            const count = getStageCount(stage.id)
            const stageCompliance = compliance[stage.id]
            return (
              <Button
                key={stage.id}
                variant={activeStage === stage.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveStage(stage.id)}
                className={cn(
                  "h-8 relative",
                  activeStage === stage.id && getStageColor(stage.id, stageCompliance?.quality || 'Poor')
                )}
              >
                {stage.label}
                {count > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-2 h-4 px-1 text-xs"
                  >
                    {count}
                  </Badge>
                )}
                {count === 0 && (
                  <div className="ml-2 w-2 h-2 rounded-full bg-red-500" />
                )}
              </Button>
            )
          })}
        </div>

        <Separator />

        {/* Stage Analysis Note */}
        {activeStage !== 'all' && compliance[activeStage] && (
          <div className="bg-muted/50 p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium capitalize">{activeStage} Analysis</h4>
              <Badge className={getStageColor(activeStage, compliance[activeStage].quality)}>
                {compliance[activeStage].quality}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {compliance[activeStage].notes}
            </p>
          </div>
        )}

        {/* Full Transcript with Highlighting */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {segments.length > 0 ? (
            segments.map((segment, index) => {
              const isActive = isSegmentActive(segment)
              return (
                <div
                  key={index}
                  className={cn(
                    "border-l-4 pl-4 py-3 rounded-r-lg transition-all duration-300",
                    getHighlightColors(segment.highlight, isActive),
                    !isActive && "transition-opacity duration-300"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        segment.speaker === 'Technician' ? 'border-blue-300 text-blue-700' : 'border-green-300 text-green-700'
                      )}
                    >
                      {segment.speaker}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {segment.timestamp}
                    </span>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs capitalize",
                        isActive && "ring-2 ring-primary/20"
                      )}
                    >
                      {segment.stage}
                    </Badge>
                    {segment.highlight && segment.highlight !== 'neutral' && (
                      <Badge 
                        variant="outline"
                        className={cn(
                          "text-xs",
                          segment.highlight === 'success' && "border-green-400 text-green-700",
                          segment.highlight === 'opportunity' && "border-blue-400 text-blue-700",
                          segment.highlight === 'concern' && "border-red-400 text-red-700"
                        )}
                      >
                        {segment.highlight}
                      </Badge>
                    )}
                  </div>
                  
                  <p className={cn(
                    "text-sm leading-relaxed",
                    !isActive && "text-muted-foreground"
                  )}>
                    {segment.text}
                  </p>
                  
                  {segment.annotation && isActive && (
                    <div className="mt-2 p-2 bg-primary/5 rounded text-xs text-primary border border-primary/20">
                      <span className="font-medium">💡 Analysis:</span> {segment.annotation}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No transcript segments available</p>
            </div>
          )}
        </div>

        {/* Stage Summary */}
        {activeStage === 'all' && (
          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Conversation Overview</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {STAGES.map(stage => {
                const count = getStageCount(stage.id)
                const stageCompliance = compliance[stage.id]
                return (
                  <div key={stage.id} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{stage.label}:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{count} segments</span>
                      <Badge 
                        variant="outline"
                        className={cn(
                          "text-xs",
                          getStageColor(stage.id, stageCompliance?.quality || 'Poor')
                        )}
                      >
                        {stageCompliance?.quality || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
