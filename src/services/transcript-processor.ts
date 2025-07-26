/**
 * Transcript processing service for handling AssemblyAI output
 * Converts transcripts to markdown and truncates for optimal AI processing
 */

export interface ProcessedTranscript {
  markdown: string
  originalLength: number
  truncatedLength: number
  exchangeCount: number
  truncated: boolean
  summary: string
}

export interface TranscriptExchange {
  speaker: string
  text: string
  timestamp?: string
  originalIndex: number
}

export class TranscriptProcessor {
  /**
   * Process AssemblyAI transcript - truncate to first 10 exchanges and convert to markdown
   */
  static processAssemblyAITranscript(
    transcript: string, 
    maxExchanges: number = 10
  ): ProcessedTranscript {
    console.log('Processing AssemblyAI transcript...')
    console.log('Original length:', transcript.length)
    
    // Parse the transcript into exchanges
    const exchanges = this.parseTranscriptExchanges(transcript)
    console.log('Total exchanges found:', exchanges.length)
    
    // Truncate to first N exchanges
    const truncatedExchanges = exchanges.slice(0, maxExchanges)
    const truncated = exchanges.length > maxExchanges
    
    console.log('Exchanges after truncation:', truncatedExchanges.length)
    console.log('Was truncated:', truncated)
    
    // Convert to markdown
    const markdown = this.convertToMarkdown(truncatedExchanges, truncated, exchanges.length)
    
    // Generate summary
    const summary = this.generateSummary(truncatedExchanges, exchanges.length, truncated)
    
    return {
      markdown,
      originalLength: transcript.length,
      truncatedLength: markdown.length,
      exchangeCount: truncatedExchanges.length,
      truncated,
      summary
    }
  }
  
  /**
   * Parse transcript text into structured exchanges
   */
  private static parseTranscriptExchanges(transcript: string): TranscriptExchange[] {
    console.log('Parsing transcript exchanges...')
    console.log('Input length:', transcript.length)
    console.log('Input preview:', transcript.substring(0, 500))
    
    const exchanges: TranscriptExchange[] = []
    
    // Strategy 1: Try multiple parsing approaches for different AssemblyAI formats
    let segments: string[] = []
    
    // First try: Split by double newlines (standard format)
    segments = transcript.split('\n\n').filter(segment => segment.trim().length > 0)
    console.log('Double newline split found:', segments.length, 'segments')
    
    // If not many segments, try single newlines
    if (segments.length < 3) {
      segments = transcript.split('\n').filter(segment => segment.trim().length > 10)
      console.log('Single newline split found:', segments.length, 'segments')
    }
    
    // If still not many, try speaker diarization patterns
    if (segments.length < 3) {
      const speakerPattern = /Speaker [A-Z]:/gi
      if (speakerPattern.test(transcript)) {
        segments = transcript.split(speakerPattern).filter(s => s.trim().length > 5)
        // Add speaker labels back
        const speakers = transcript.match(/Speaker [A-Z]:/gi) || []
        segments = segments.slice(1).map((text, i) => `${speakers[i] || 'Speaker A:'} ${text}`)
        console.log('Speaker pattern split found:', segments.length, 'segments')
      }
    }
    
    console.log('Processing', segments.length, 'segments')
    
    segments.forEach((segment, index) => {
      const trimmed = segment.trim()
      if (!trimmed) return
      
      let speaker = 'Unknown'
      let text = trimmed
      let timestamp: string | undefined
      
      // Strategy 1: Parse standard format "Speaker [timestamp]: text" or "Speaker: text"
      const standardMatch = trimmed.match(/^(Technician|Customer|Tech|Agent|Service|Rep|Speaker [A-Z])\s*(?:\[([^\]]+)\])?\s*:\s*(.+)$/s)
      
      if (standardMatch) {
        const [, rawSpeaker, rawTimestamp, rawText] = standardMatch
        speaker = this.normalizeSpeaker(rawSpeaker.trim())
        text = rawText.trim()
        timestamp = rawTimestamp?.trim()
      } else {
        // Strategy 2: Look for colon-separated format
        const colonIndex = trimmed.indexOf(':')
        if (colonIndex > 0 && colonIndex < 50) { // Speaker names shouldn't be too long
          const potentialSpeaker = trimmed.substring(0, colonIndex).trim()
          const potentialText = trimmed.substring(colonIndex + 1).trim()
          
          // Check if it looks like a speaker name
          if (potentialSpeaker.length < 50 && potentialText.length > 10) {
            speaker = this.normalizeSpeaker(potentialSpeaker)
            text = potentialText
          }
        } else {
          // Strategy 3: Infer speaker from content if no clear format
          speaker = this.inferSpeakerFromContent(trimmed, index)
          text = trimmed
        }
      }
      
      if (text.length > 5) { // Only include meaningful exchanges
        exchanges.push({
          speaker,
          text,
          timestamp,
          originalIndex: index
        })
      }
    })
    
    // Post-process to ensure we have reasonable speaker distribution
    this.balanceSpeakerDistribution(exchanges)
    
    console.log('Final parsed exchanges:', exchanges.length)
    console.log('Speaker distribution:', exchanges.reduce((acc, e) => {
      acc[e.speaker] = (acc[e.speaker] || 0) + 1
      return acc
    }, {} as Record<string, number>))
    
    console.log('Sample exchanges:', exchanges.slice(0, 3).map(e => ({
      speaker: e.speaker,
      text: e.text.substring(0, 100) + '...',
      timestamp: e.timestamp
    })))
    
    return exchanges
  }
  
  /**
   * Normalize speaker names to standard format
   */
  private static normalizeSpeaker(rawSpeaker: string): string {
    const lower = rawSpeaker.toLowerCase()
    
    // Map various formats to our standard names
    if (lower.includes('tech') || lower.includes('service') || lower.includes('agent') || 
        lower.includes('rep') || lower.includes('field') || lower === 'speaker a') {
      return 'Technician'
    } else if (lower.includes('customer') || lower.includes('client') || lower.includes('caller') || 
               lower.includes('home') || lower.includes('user') || lower === 'speaker b') {
      return 'Customer'
    }
    
    // Default based on common patterns
    return rawSpeaker.includes('A') || rawSpeaker.includes('1') ? 'Technician' : 'Customer'
  }
  
  /**
   * Infer speaker from content when no clear speaker label exists
   */
  private static inferSpeakerFromContent(text: string, index: number): string {
    const lowerText = text.toLowerCase()
    
    // Strong technician indicators
    if (lowerText.includes('this is') && lowerText.includes('from') ||
        lowerText.includes('good morning') || lowerText.includes('good afternoon') ||
        lowerText.includes('let me') || lowerText.includes('i can') ||
        lowerText.includes('we offer') || lowerText.includes('system') ||
        lowerText.includes('repair') || lowerText.includes('diagnose') ||
        lowerText.includes('install') || lowerText.includes('maintenance') ||
        lowerText.includes('service plan') || lowerText.includes('recommend')) {
      return 'Technician'
    }
    
    // Strong customer indicators
    if (lowerText.includes('my') && (lowerText.includes('problem') || lowerText.includes('issue')) ||
        lowerText.includes('how much') || lowerText.includes('cost') ||
        lowerText.includes('thank you') || lowerText.includes('sounds good') ||
        lowerText.includes('yes please') || lowerText.includes('that works')) {
      return 'Customer'
    }
    
    // Alternate by index if unclear (common in real conversations)
    return index % 2 === 0 ? 'Technician' : 'Customer'
  }
  
  /**
   * Ensure reasonable speaker distribution and fix obvious errors
   */
  private static balanceSpeakerDistribution(exchanges: TranscriptExchange[]): void {
    if (exchanges.length < 2) return
    
    const speakerCounts = exchanges.reduce((acc, e) => {
      acc[e.speaker] = (acc[e.speaker] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const totalCount = exchanges.length
    const techCount = speakerCounts['Technician'] || 0
    const custCount = speakerCounts['Customer'] || 0
    
    // If one speaker dominates (>80%), try to rebalance
    if (techCount > totalCount * 0.8 || custCount > totalCount * 0.8) {
      console.log('Detected speaker imbalance, attempting to rebalance...')
      
      // Simple alternating pattern for better distribution
      exchanges.forEach((exchange, index) => {
        if (index === 0) {
          // First speaker is usually technician (greeting)
          exchange.speaker = 'Technician'
        } else {
          // Alternate speakers
          const prevSpeaker = exchanges[index - 1].speaker
          exchange.speaker = prevSpeaker === 'Technician' ? 'Customer' : 'Technician'
        }
      })
      
      console.log('Rebalanced speaker distribution')
    }
  }
  
  /**
   * Convert exchanges to well-formatted markdown for AI processing
   */
  private static convertToMarkdown(
    exchanges: TranscriptExchange[], 
    wasTruncated: boolean, 
    totalExchanges: number
  ): string {
    const markdown = [
      '# Service Call Transcript',
      '',
      `**Analysis Scope:** ${exchanges.length} of ${totalExchanges} total exchanges${wasTruncated ? ' (truncated for processing)' : ''}`,
      '',
      '## Conversation',
      ''
    ]
    
    exchanges.forEach((exchange, index) => {
      // Add speaker header
      markdown.push(`### Exchange ${index + 1}: ${exchange.speaker}`)
      
      // Add timestamp if available
      if (exchange.timestamp) {
        markdown.push(`**Time:** ${exchange.timestamp}`)
      }
      
      // Add the text content
      markdown.push('')
      markdown.push(exchange.text)
      markdown.push('')
      markdown.push('---')
      markdown.push('')
    })
    
    // Add processing note
    if (wasTruncated) {
      markdown.push('## Processing Note')
      markdown.push('')
      markdown.push(`⚠️ **Transcript Truncated**: This analysis is based on the first ${exchanges.length} exchanges out of ${totalExchanges} total exchanges. Additional content was truncated to ensure reliable AI processing.`)
      markdown.push('')
    }
    
    return markdown.join('\n')
  }
  
  /**
   * Generate a summary of the processed transcript
   */
  private static generateSummary(
    exchanges: TranscriptExchange[], 
    totalExchanges: number, 
    wasTruncated: boolean
  ): string {
    const technicianExchanges = exchanges.filter(e => e.speaker.includes('Technician')).length
    const customerExchanges = exchanges.filter(e => e.speaker.includes('Customer')).length
    
    const parts = [
      `Processed ${exchanges.length} exchanges`,
      `${technicianExchanges} technician`,
      `${customerExchanges} customer`
    ]
    
    if (wasTruncated) {
      parts.push(`(${totalExchanges - exchanges.length} additional exchanges truncated)`)
    }
    
    return parts.join(', ')
  }
  
  /**
   * Save transcript as markdown file (for debugging/review)
   */
  static createMarkdownBlob(processed: ProcessedTranscript): { blob: Blob; filename: string } {
    const blob = new Blob([processed.markdown], { type: 'text/markdown' })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `service-call-transcript-${timestamp}.md`
    
    return { blob, filename }
  }
  
  /**
   * Download markdown file to user's computer
   */
  static downloadMarkdown(processed: ProcessedTranscript): void {
    const { blob, filename } = this.createMarkdownBlob(processed)
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    
    URL.revokeObjectURL(url)
  }
  
  /**
   * Get processing statistics for display
   */
  static getProcessingStats(processed: ProcessedTranscript): {
    compressionRatio: string
    exchangeDensity: string
    avgExchangeLength: string
  } {
    const compressionRatio = ((1 - processed.truncatedLength / processed.originalLength) * 100).toFixed(1)
    const avgExchangeLength = Math.round(processed.truncatedLength / processed.exchangeCount)
    
    return {
      compressionRatio: `${compressionRatio}%`,
      exchangeDensity: `${processed.exchangeCount} exchanges`,
      avgExchangeLength: `${avgExchangeLength} chars/exchange`
    }
  }
}