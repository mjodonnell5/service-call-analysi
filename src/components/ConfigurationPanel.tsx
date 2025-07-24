import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useKV } from '@github/spark/hooks'
import { 
  TranscriptionConfig, 
  validateTranscriptionConfig, 
  getApiKeyInstructions,
  transcriptionService 
} from '@/services/transcription'
import { Key, CheckCircle, Warning, Info, Eye, EyeSlash } from '@phosphor-icons/react'

interface ConfigurationPanelProps {
  onConfigured: (config: TranscriptionConfig) => void
}

export function ConfigurationPanel({ onConfigured }: ConfigurationPanelProps) {
  const [config, setConfig] = useKV<TranscriptionConfig | null>('transcription-config', null)
  const [tempConfig, setTempConfig] = useState<Partial<TranscriptionConfig>>(
    config || { provider: 'assemblyai', apiKey: '' }
  )
  const [showApiKey, setShowApiKey] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const handleSave = async () => {
    if (!tempConfig.provider || !tempConfig.apiKey) {
      setErrors(['Please select a provider and enter an API key'])
      return
    }

    const fullConfig = tempConfig as TranscriptionConfig
    const validationErrors = validateTranscriptionConfig(fullConfig)
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsValidating(true)
    setErrors([])

    try {
      // Test the configuration with a small dummy request
      // Note: In a real implementation, you might want to test with a small audio file
      // For now, we'll just save the config and validate format
      
      setConfig(fullConfig)
      onConfigured(fullConfig)
      setErrors([])
    } catch (error) {
      setErrors([`Configuration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`])
    } finally {
      setIsValidating(false)
    }
  }

  const handleClearConfig = () => {
    setConfig(null)
    setTempConfig({ provider: 'assemblyai', apiKey: '' })
    setErrors([])
  }

  const providers = transcriptionService.getAvailableProviders()

  if (config) {
    const providerInfo = transcriptionService.getProviderInfo(config.provider)
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="text-green-600" weight="fill" />
            Transcription Configured
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{providerInfo.name}</p>
              <p className="text-sm text-muted-foreground">
                Max file size: {providerInfo.maxFileSize}
              </p>
            </div>
            <div className="flex gap-2">
              {providerInfo.features.map((feature) => (
                <Badge key={feature} variant="secondary" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              API Key: {config.apiKey.substring(0, 8)}...
            </p>
            <Badge variant="outline" className="text-green-600">
              <CheckCircle size={12} className="mr-1" />
              Active
            </Badge>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setConfig(null)}
            >
              Reconfigure
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleClearConfig}
            >
              Clear Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key size={20} />
          Configure Transcription Service
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>API Key Required:</strong> To use real transcription, you'll need an API key from a supported provider. 
            Don't worry - both AssemblyAI and OpenAI offer free credits to get started!
          </AlertDescription>
        </Alert>

        {errors.length > 0 && (
          <Alert className="border-destructive">
            <Warning className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="provider">Transcription Provider</Label>
            <Select 
              value={tempConfig.provider || ''} 
              onValueChange={(value) => setTempConfig(prev => ({ ...prev, provider: value as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => {
                  const info = transcriptionService.getProviderInfo(provider)
                  return (
                    <SelectItem key={provider} value={provider}>
                      <div className="flex items-center justify-between w-full">
                        <span>{info.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {info.maxFileSize}
                        </Badge>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {tempConfig.provider && (
            <>
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    value={tempConfig.apiKey || ''}
                    onChange={(e) => setTempConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Enter your API key"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
              </div>

              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    How to get {transcriptionService.getProviderInfo(tempConfig.provider).name} API Key
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {getApiKeyInstructions(tempConfig.provider)}
                  </pre>
                </CardContent>
              </Card>

              {tempConfig.provider && (
                <div className="space-y-2">
                  <Label>Provider Features</Label>
                  <div className="flex flex-wrap gap-2">
                    {transcriptionService.getProviderInfo(tempConfig.provider).features.map((feature) => (
                      <Badge key={feature} variant="secondary">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <Separator />

        <div className="flex gap-2">
          <Button 
            onClick={handleSave} 
            disabled={!tempConfig.provider || !tempConfig.apiKey || isValidating}
            className="flex-1"
          >
            {isValidating ? 'Validating...' : 'Save Configuration'}
          </Button>
          {config && (
            <Button variant="outline" onClick={() => setTempConfig(config)}>
              Reset
            </Button>
          )}
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Privacy Note:</strong> Your API keys are stored locally in your browser and never sent to our servers. 
            They are only used to communicate directly with your chosen transcription provider.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}