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
    const exchanges: TranscriptExchange[] = []
    
    // Split by double newlines (AssemblyAI format)
    const segments = transcript.split('\n\n').filter(segment => segment.trim().length > 0)
    
    segments.forEach((segment, index) => {
      const trimmed = segment.trim()
      if (!trimmed) return
      
      // Parse format: "Speaker [timestamp]: text" or "Speaker: text"
      const match = trimmed.match(/^(Technician|Customer|Speaker [A-Z])\s*(?:\[([^\]]+)\])?\s*:\s*(.+)$/s)
      
      if (match) {
        const [, speaker, timestamp, text] = match
        exchanges.push({
          speaker: speaker.trim(),
          text: text.trim(),
          timestamp: timestamp?.trim(),
          originalIndex: index
        })
      } else {
        // Fallback parsing for malformed lines
        const colonIndex = trimmed.indexOf(':')
        if (colonIndex > 0) {
          const speaker = trimmed.substring(0, colonIndex).trim()
          const text = trimmed.substring(colonIndex + 1).trim()
          
          exchanges.push({
            speaker: speaker || 'Unknown',
            text,
            originalIndex: index
          })
        }
      }
    })
    
    console.log('Parsed exchanges sample:', exchanges.slice(0, 3).map(e => ({
      speaker: e.speaker,
      text: e.text.substring(0, 100) + '...',
      timestamp: e.timestamp
    })))
    
    return exchanges
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