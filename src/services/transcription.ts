/**
 * Real transcription service for production use
 * Supports multiple providers: AssemblyAI, OpenAI Whisper, and others
 */

interface TranscriptionProvider {
  name: string
  transcribe: (file: File, apiKey: string) => Promise<string>
}

// AssemblyAI provider - recommended for service calls
class AssemblyAIProvider implements TranscriptionProvider {
  name = 'AssemblyAI'

  async transcribe(file: File, apiKey: string): Promise<string> {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('AssemblyAI API key is required')
    }

    // Step 1: Upload the file
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'content-type': 'application/octet-stream'
      },
      body: file
    })

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text()
      throw new Error(`Upload failed: ${error}`)
    }

    const { upload_url } = await uploadResponse.json()

    // Step 2: Start transcription with speaker diarization
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: upload_url,
        speaker_labels: true, // Enable speaker identification
        auto_chapters: false,
        filter_profanity: false,
        format_text: true,
        punctuate: true,
        dual_channel: false
      })
    })

    if (!transcriptResponse.ok) {
      const error = await transcriptResponse.text()
      throw new Error(`Transcription request failed: ${error}`)
    }

    const { id } = await transcriptResponse.json()

    // Step 3: Poll for completion
    return this.pollForCompletion(id, apiKey)
  }

  private async pollForCompletion(transcriptId: string, apiKey: string): Promise<string> {
    const maxAttempts = 60 // 5 minutes max
    let attempts = 0

    while (attempts < maxAttempts) {
      const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'authorization': apiKey
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to check transcription status: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.status === 'completed') {
        return this.formatTranscriptWithSpeakers(result)
      } else if (result.status === 'error') {
        throw new Error(`Transcription failed: ${result.error}`)
      }

      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000))
      attempts++
    }

    throw new Error('Transcription timeout - processing took too long')
  }

  private formatTranscriptWithSpeakers(result: any): string {
    if (!result.utterances || result.utterances.length === 0) {
      // Fallback to basic transcript without speaker labels
      return result.text || 'Transcription completed but no text returned'
    }

    // Format with speaker labels
    return result.utterances
      .map((utterance: any) => {
        const speaker = utterance.speaker === 'A' ? 'Technician' : 'Customer'
        return `${speaker}: ${utterance.text}`
      })
      .join('\n\n')
  }
}

// OpenAI Whisper provider - backup option
class OpenAIWhisperProvider implements TranscriptionProvider {
  name = 'OpenAI Whisper'

  async transcribe(file: File, apiKey: string): Promise<string> {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('OpenAI API key is required')
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'text')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI Whisper transcription failed: ${error}`)
    }

    const transcript = await response.text()
    
    // Note: Whisper doesn't provide speaker diarization by default
    // We'll add basic speaker inference based on conversation patterns
    return this.addBasicSpeakerLabels(transcript)
  }

  private addBasicSpeakerLabels(text: string): string {
    // Simple heuristic to add speaker labels
    // This is a fallback - real diarization requires specialized services
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    let currentSpeaker = 'Technician'
    
    return sentences.map((sentence, index) => {
      const trimmed = sentence.trim()
      if (!trimmed) return ''
      
      // Switch speakers based on conversation patterns
      if (index > 0 && (
        trimmed.toLowerCase().includes('thank you') ||
        trimmed.toLowerCase().includes('okay') ||
        trimmed.toLowerCase().includes('yes') ||
        trimmed.toLowerCase().includes('no') ||
        trimmed.toLowerCase().includes('that sounds')
      )) {
        currentSpeaker = currentSpeaker === 'Technician' ? 'Customer' : 'Technician'
      }
      
      return `${currentSpeaker}: ${trimmed}.`
    }).join('\n\n')
  }
}

// Main transcription service
export class TranscriptionService {
  private providers: Map<string, TranscriptionProvider> = new Map()
  private defaultProvider = 'assemblyai'

  constructor() {
    this.providers.set('assemblyai', new AssemblyAIProvider())
    this.providers.set('openai', new OpenAIWhisperProvider())
  }

  async transcribe(
    file: File, 
    apiKey: string, 
    provider: string = this.defaultProvider
  ): Promise<string> {
    // Validate file
    if (!file) {
      throw new Error('No audio file provided')
    }

    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      throw new Error('Please upload an audio or video file')
    }

    // Check file size (most APIs have limits)
    const maxSize = provider === 'openai' ? 25 * 1024 * 1024 : 100 * 1024 * 1024 // 25MB for OpenAI, 100MB for AssemblyAI
    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size: ${Math.floor(maxSize / 1024 / 1024)}MB`)
    }

    const transcriptionProvider = this.providers.get(provider)
    if (!transcriptionProvider) {
      throw new Error(`Unknown transcription provider: ${provider}`)
    }

    console.log(`Transcribing with ${transcriptionProvider.name}...`)
    return transcriptionProvider.transcribe(file, apiKey)
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  getProviderInfo(provider: string): { name: string; maxFileSize: string; features: string[] } {
    switch (provider) {
      case 'assemblyai':
        return {
          name: 'AssemblyAI',
          maxFileSize: '100MB',
          features: ['Speaker Diarization', 'High Accuracy', 'Punctuation', 'Format Text']
        }
      case 'openai':
        return {
          name: 'OpenAI Whisper',
          maxFileSize: '25MB',
          features: ['High Accuracy', 'Multiple Languages', 'Fast Processing']
        }
      default:
        return { name: 'Unknown', maxFileSize: 'Unknown', features: [] }
    }
  }
}

// Create singleton instance
export const transcriptionService = new TranscriptionService()

// Configuration management for API keys
export interface TranscriptionConfig {
  provider: 'assemblyai' | 'openai'
  apiKey: string
}

export function validateTranscriptionConfig(config: TranscriptionConfig): string[] {
  const errors: string[] = []

  if (!config.provider) {
    errors.push('Transcription provider is required')
  }

  if (!config.apiKey || config.apiKey.trim() === '') {
    errors.push('API key is required')
  }

  if (config.provider === 'assemblyai' && !config.apiKey.startsWith('')) {
    // AssemblyAI keys don't have a standard prefix, so just check for reasonable length
    if (config.apiKey.length < 32) {
      errors.push('AssemblyAI API key appears to be invalid (too short)')
    }
  }

  if (config.provider === 'openai' && !config.apiKey.startsWith('sk-')) {
    errors.push('OpenAI API key must start with "sk-"')
  }

  return errors
}

// Helper to get API key instructions
export function getApiKeyInstructions(provider: string): string {
  switch (provider) {
    case 'assemblyai':
      return `
1. Go to https://www.assemblyai.com/
2. Sign up for a free account (includes $50 credit)
3. Navigate to your dashboard
4. Copy your API key from the dashboard
5. Paste it in the configuration below

Note: AssemblyAI offers excellent speaker diarization and is recommended for service calls.`

    case 'openai':
      return `
1. Go to https://platform.openai.com/
2. Sign up or log into your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with "sk-")
6. Paste it in the configuration below

Note: OpenAI Whisper is fast but doesn't include speaker identification.`

    default:
      return 'Please select a transcription provider above.'
  }
}