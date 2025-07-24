import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, TrendingUp, AlertTriangle, Lightbulb } from '@phosphor-icons/react'

interface InsightsPanelProps {
  analysis: {
    callType: string
    overallScore: number
    compliance: Record<string, { present: boolean; quality: string; notes: string }>
    salesInsights: {
      opportunities: string[]
      successful: string[]
      missed: string[]
    }
  }
}

export function InsightsPanel({ analysis }: InsightsPanelProps) {
  const getRecommendations = () => {
    const recommendations = []
    
    // Compliance recommendations
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

    // Sales recommendations
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

  const recommendations = getRecommendations()

  return (
    <div className="space-y-6">
      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={20} />
            Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium">Overall Performance</span>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                {analysis.overallScore}%
              </span>
              <Badge variant={analysis.overallScore >= 80 ? "default" : analysis.overallScore >= 60 ? "secondary" : "destructive"}>
                {getScoreLabel(analysis.overallScore)}
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              <span>{Object.values(analysis.compliance).filter(c => c.present).length}/6 Stages Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-accent" />
              <span>{analysis.salesInsights.opportunities.length} Sales Opportunities</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              <span>{analysis.salesInsights.successful.length} Successful Actions</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle size={16} className="text-destructive" />
              <span>{analysis.salesInsights.missed.length} Missed Opportunities</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb size={20} />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendations.length > 0 ? (
            recommendations.map((rec, index) => (
              <Alert key={index} className={
                rec.priority === 'high' ? 'border-destructive/20 bg-destructive/5' :
                rec.priority === 'medium' ? 'border-yellow-500/20 bg-yellow-50' :
                'border-blue-500/20 bg-blue-50'
              }>
                <div className="flex items-start gap-2">
                  {rec.priority === 'high' && <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />}
                  {rec.priority === 'medium' && <TrendingUp className="h-4 w-4 text-yellow-600 mt-0.5" />}
                  {rec.priority === 'low' && <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {rec.type.toUpperCase()}
                      </Badge>
                      <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'secondary' : 'default'} className="text-xs">
                        {rec.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <AlertDescription>{rec.message}</AlertDescription>
                  </div>
                </div>
              </Alert>
            ))
          ) : (
            <Alert className="border-green-500/20 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Excellent performance! This call demonstrates strong adherence to protocols and effective sales practices.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3">
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm font-medium text-primary mb-1">Call Type Analysis</p>
              <p className="text-sm text-muted-foreground">
                This {analysis.callType.toLowerCase()} shows typical patterns for service interactions. 
                Consider industry-specific training modules to optimize performance.
              </p>
            </div>
            
            {analysis.salesInsights.opportunities.length > 0 && (
              <div className="p-3 bg-accent/5 rounded-lg border border-accent/20">
                <p className="text-sm font-medium text-accent mb-1">Revenue Potential</p>
                <p className="text-sm text-muted-foreground">
                  Multiple upsell opportunities were identified. Implementing structured sales prompts 
                  could increase revenue per call by 15-25%.
                </p>
              </div>
            )}
            
            {Object.values(analysis.compliance).some(c => c.quality === 'Excellent') && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-700 mb-1">Best Practices Observed</p>
                <p className="text-sm text-muted-foreground">
                  Strong performance in {Object.entries(analysis.compliance)
                    .filter(([, data]) => data.quality === 'Excellent')
                    .map(([stage]) => stage)
                    .join(', ')} stages. These approaches can be used as training examples.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}