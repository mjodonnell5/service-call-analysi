import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, TrendUp, Warning, Lightbulb } from '@phosphor-icons/react'

interface InsightsPanelProps {
  analysis: {
    callType: string
    overallScore: number
    compliance: Record<string, { present: boolean; quality: string; notes: string }>
    detailedRecommendations?: {
      compliance: Array<{ priority: string; text: string }>
      salesTraining: Array<{ priority: string; text: string }>
      communication: Array<{ priority: string; text: string }>
      processOptimization: Array<{ priority: string; text: string }>
      coachingPriorities: Array<{ priority: string; text: string }>
    }
    salesInsights: {
      opportunities: string[]
      successful: string[]
      missed: string[]
    }
  }
}

export function InsightsPanel({ analysis }: InsightsPanelProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'default'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return <Warning className="h-4 w-4" />
      case 'medium': return <TrendUp className="h-4 w-4" />
      case 'low': return <Lightbulb className="h-4 w-4" />
      default: return <Lightbulb className="h-4 w-4" />
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-destructive'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    return 'Needs Improvement'
  }

  const renderRecommendationSection = (title: string, recommendations: Array<{ priority: string; text: string }>, icon: React.ReactNode) => {
    if (!recommendations || recommendations.length === 0) return null

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendations.map((rec, index) => (
            <Alert key={index} className="border-l-4">
              <div className="flex items-start gap-3">
                {getPriorityIcon(rec.priority)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getPriorityColor(rec.priority)} className="text-xs">
                      {rec.priority.toUpperCase()}
                    </Badge>
                  </div>
                  <AlertDescription className="text-sm leading-relaxed">
                    {rec.text}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Fallback to simple recommendations if detailed ones aren't available
  const getSimpleRecommendations = () => {
    const recommendations: Array<{
      type: string
      priority: string
      message: string
      stage: string
    }> = []
    
    Object.entries(analysis.compliance).forEach(([stage, data]) => {
      if (!data.present) {
        recommendations.push({
          type: 'compliance',
          priority: 'high',
          message: `Missing ${stage} stage - ensure technicians follow complete call protocol`,
          stage
        })
      } else if (data.quality === 'Poor' || data.quality === 'Fair') {
        recommendations.push({
          type: 'improvement',
          priority: 'medium',
          message: `Improve ${stage} quality - ${data.notes.toLowerCase()}`,
          stage
        })
      }
    })

    if (analysis.salesInsights.missed.length > 0) {
      recommendations.push({
        type: 'sales',
        priority: 'high',
        message: `${analysis.salesInsights.missed.length} sales opportunities missed - provide additional sales training`,
        stage: 'sales'
      })
    }

    if (analysis.salesInsights.opportunities.length > 0) {
      recommendations.push({
        type: 'opportunity',
        priority: 'medium',
        message: `${analysis.salesInsights.opportunities.length} potential opportunities identified - train technicians to recognize these signals`,
        stage: 'training'
      })
    }

    return recommendations
  }

  return (
    <div className="space-y-6">
      {/* Call Score Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Call Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {analysis.overallScore}/100
                </span>
                <Badge variant={analysis.overallScore >= 80 ? 'default' : analysis.overallScore >= 60 ? 'secondary' : 'destructive'}>
                  {getScoreLabel(analysis.overallScore)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Overall service call performance score
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Opportunities</p>
                <p className="text-2xl font-bold text-green-600">{analysis.salesInsights.opportunities.length}</p>
              </div>
              <TrendUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold text-blue-600">{analysis.salesInsights.successful.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Missed</p>
                <p className="text-2xl font-bold text-red-600">{analysis.salesInsights.missed.length}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Recommendations */}
      {analysis.detailedRecommendations ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Detailed Recommendations</h2>
          
          {renderRecommendationSection(
            'Compliance Improvements',
            analysis.detailedRecommendations.compliance,
            <CheckCircle className="h-5 w-5 text-blue-600" />
          )}
          
          {renderRecommendationSection(
            'Sales Training',
            analysis.detailedRecommendations.salesTraining,
            <TrendUp className="h-5 w-5 text-green-600" />
          )}
          
          {renderRecommendationSection(
            'Communication Enhancement',
            analysis.detailedRecommendations.communication,
            <Lightbulb className="h-5 w-5 text-purple-600" />
          )}
          
          {renderRecommendationSection(
            'Process Optimization',
            analysis.detailedRecommendations.processOptimization,
            <Warning className="h-5 w-5 text-orange-600" />
          )}
          
          {renderRecommendationSection(
            'Coaching Priorities',
            analysis.detailedRecommendations.coachingPriorities,
            <XCircle className="h-5 w-5 text-red-600" />
          )}
        </div>
      ) : (
        /* Fallback Simple Recommendations */
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recommendations</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Improvement Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getSimpleRecommendations().length > 0 ? (
                  getSimpleRecommendations().map((rec, index) => (
                    <Alert key={index}>
                      <div className="flex items-start gap-3">
                        {rec.priority === 'high' ? (
                          <Warning className="h-4 w-4 text-red-500" />
                        ) : (
                          <TrendUp className="h-4 w-4 text-yellow-500" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={rec.priority === 'high' ? 'destructive' : 'default'}>
                              {rec.priority.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">{rec.type}</Badge>
                          </div>
                          <AlertDescription>{rec.message}</AlertDescription>
                        </div>
                      </div>
                    </Alert>
                  ))
                ) : (
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription>
                      Excellent performance! All key areas are performing well.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
