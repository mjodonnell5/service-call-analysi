interface CallAnalysis {
  callType: string
  overallScore: number
  compliance: {
    introduction: ComplianceStage
    diagnosis: ComplianceStage
    solution: ComplianceStage
    upsell: ComplianceStage
    maintenance: ComplianceStage
    closing: ComplianceStage
  }
  complianceSummaries?: {
    introduction: string
    diagnosis: string
    solution: string
    upsell: string
    maintenance: string
    closing: string
  }
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
    buyingSignals?: string[]
    objectionsHandled?: string[]
    objectionsMissed?: string[]
    upsellMoments?: string[]
    priceDiscussions?: string[]
    customerPainPoints?: string[]
    followUpOpportunities?: string[]
  }
  transcript: {
    segments: Array<{
      speaker: string
      timestamp: string
      text: string
      stage: string
      annotation?: string  // Analysis comment for this segment
      highlight?: 'success' | 'opportunity' | 'concern' | 'neutral'  // Visual indicator
    }>
  }
}

interface ComplianceStage {
  present: boolean
  quality: string
  notes: string
}

export class OpenAIAnalyzer {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim()
  }

  async analyzeServiceCall(markdownTranscript: string): Promise<CallAnalysis> {
    console.log('=== Starting OpenAI Analysis ===')
    console.log('Transcript length:', markdownTranscript.length)
    console.log('API Key exists:', !!this.apiKey)
    console.log('API Key starts with sk-:', this.apiKey.startsWith('sk-'))
    console.log('API Key length:', this.apiKey.length)

    // TEST MODE: Return sample data to verify UI works
    if (markdownTranscript.includes('TEST_MODE') || markdownTranscript.includes('FALLBACK_MODE')) {
      console.log('TEST/FALLBACK MODE: Returning sample data')
      return {
        callType: 'Service Call - Test Mode',
        overallScore: 85,
        compliance: {
          introduction: { present: true, quality: 'Good', notes: 'Test mode: Technician properly introduced themselves and company. Good rapport building with customer.' },
          diagnosis: { present: true, quality: 'Excellent', notes: 'Test mode: Thorough diagnostic approach with systematic questioning. Technician effectively communicated findings to customer.' },
          solution: { present: true, quality: 'Good', notes: 'Test mode: Clear explanation of repair options and costs. Good use of analogies to help customer understand technical issues.' },
          upsell: { present: true, quality: 'Fair', notes: 'Test mode: Some upselling attempts made but missed several key opportunities for additional services.' },
          maintenance: { present: false, quality: 'Poor', notes: 'Test mode: No maintenance plan discussed. Missed opportunity for recurring revenue and customer retention.' },
          closing: { present: true, quality: 'Good', notes: 'Test mode: Professional conclusion with clear next steps. Payment processed smoothly with good follow-up instructions.' }
        },
        salesInsights: {
          opportunities: [
            'Customer mentioned 18-year-old furnace making loud noises and $400 heating bills. Prime replacement opportunity worth $8,000-$12,000 with energy efficiency angle.',
            'Homeowner expressed interest in financing options and asked about 0% APR. Strong buying signal suggesting ready to purchase with right terms.',
            'Customer concerned about future gas leaks and mentioned neighbor got new efficient system. Perfect opening for heat pump consultation.',
            'Mentioned wanting quieter operation and better efficiency. High-end system opportunity with premium features and extended warranties.'
          ],
          successful: [
            'Technician used car battery analogy for capacitor which customer immediately understood, leading to quick approval of $180 repair.',
            'Educational approach about California energy regulations built trust and positioned company as knowledgeable experts in the field.',
            'Offering multiple financing options removed price objections and gave customer flexibility to choose comfortable payment terms.',
            'Demonstrating noise reduction with grill upgrade created immediate tangible value customer could understand and appreciate.'
          ],
          missed: [
            'At 21:45 when customer asked about Energy Star rebates, technician could have emphasized additional $1,000-$2,000 tax credit opportunity.',
            'Customer mentioned noise concerns multiple times but technician waited too long to offer attic installation option worth additional $4,000.',
            'When discussing neighbors system, missed opportunity to offer comparative energy audit or reference visit to build confidence.',
            'Customer showed strong interest in environmental benefits but technician didn\'t leverage carbon footprint reduction as selling point.'
          ]
        },
        transcript: {
          segments: [
            {"speaker": "Technician", "timestamp": "0:00", "text": "Good morning! This is Mike from ABC Service Company. I'm here for your scheduled maintenance appointment.", "stage": "introduction", "annotation": "Excellent professional greeting with name, company, and purpose", "highlight": "success"},
            {"speaker": "Customer", "timestamp": "0:15", "text": "Hi Mike, come on in. I've been having some issues with the AC making noise.", "stage": "introduction", "annotation": "Customer immediately provides symptom information - good rapport established", "highlight": "opportunity"},
            {"speaker": "Technician", "timestamp": "0:30", "text": "I appreciate you calling us. Let me get my tools and we'll take a look. Can you tell me more about the noise?", "stage": "diagnosis", "annotation": "Good transition to diagnostic phase with follow-up questioning", "highlight": "success"},
            {"speaker": "Customer", "timestamp": "1:00", "text": "It's been making a grinding sound, especially when it first turns on. Started about a week ago.", "stage": "diagnosis", "annotation": "Customer provides specific symptom details and timeline", "highlight": "neutral"},
            {"speaker": "Technician", "timestamp": "1:15", "text": "That grinding sound could indicate a bearing issue. Let me check the unit and I'll explain what I find.", "stage": "diagnosis", "annotation": "Professional diagnosis explanation, sets expectation for findings", "highlight": "success"},
            {"speaker": "Customer", "timestamp": "5:30", "text": "How much would something like that cost to fix?", "stage": "solution", "annotation": "Customer showing cost concern - opportunity to discuss value", "highlight": "opportunity"},
            {"speaker": "Technician", "timestamp": "5:45", "text": "The motor bearing replacement would be $280 including parts and labor. I can also show you our maintenance plan.", "stage": "solution", "annotation": "Clear pricing provided, good transition to maintenance offering", "highlight": "success"},
            {"speaker": "Customer", "timestamp": "6:00", "text": "What does the maintenance plan include?", "stage": "maintenance", "annotation": "Customer expressed interest - strong buying signal", "highlight": "opportunity"},
            {"speaker": "Technician", "timestamp": "6:15", "text": "It's $120 annually and includes two tune-ups plus priority service. Would save you money long-term.", "stage": "maintenance", "annotation": "Good value proposition but could be more detailed on benefits", "highlight": "success"},
            {"speaker": "Customer", "timestamp": "7:00", "text": "Let me think about the maintenance plan, but go ahead with the repair.", "stage": "closing", "annotation": "Repair approved but maintenance plan not closed - follow-up opportunity", "highlight": "opportunity"},
            {"speaker": "Technician", "timestamp": "7:30", "text": "Perfect! I'll get started on the repair. Here's my card for when you're ready on that maintenance plan.", "stage": "closing", "annotation": "Professional close with follow-up tool provided", "highlight": "success"}
          ]
        }
      }
    }

    if (!this.apiKey || !this.apiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format. API key must start with "sk-"')
    }

    if (markdownTranscript.length < 10) {
      throw new Error('Transcript too short for analysis')
    }

    // For large transcripts, use chunked processing with smaller, more reliable chunks
    const estimatedSegments = (markdownTranscript.match(/\n\w+:/g) || []).length
    const transcriptLength = markdownTranscript.length
    console.log('Estimated segments:', estimatedSegments)
    console.log('Transcript length:', transcriptLength)
    
    // Use chunking for any transcript over 10k characters OR more than 8 segments
    if (transcriptLength > 10000 || estimatedSegments > 8) {
      console.log('Large transcript detected, using chunked markdown processing...')
      return this.analyzeInChunks(markdownTranscript)
    }

    // For smaller transcripts, use the original single-pass analysis
    return this.analyzeSinglePass(markdownTranscript)
  }

  private async analyzeInChunks(markdownTranscript: string): Promise<CallAnalysis> {
    console.log('=== Starting Context-Aware Chunked Analysis ===')
    console.log('Original transcript length:', markdownTranscript.length)
    
    // STEP 1: Generate overall conversation context and stage mapping
    console.log('\n=== STEP 1: Analyzing Overall Conversation Flow ===')
    const conversationContext = await this.generateConversationContext(markdownTranscript)
    console.log('Generated conversation context:', conversationContext)
    
    // Create separate markdown chunks by speaker exchanges
    const markdownChunks = this.createMarkdownChunks(markdownTranscript)
    console.log(`\n=== STEP 2: Created ${markdownChunks.length} markdown chunks ===`)
    
    // Store results safely and analyze each chunk with fallbacks
    const chunkResults: Array<{ 
      index: number, 
      segments: any[], 
      success: boolean, 
      error?: string,
      rawResponse?: string
    }> = []
    
    for (let i = 0; i < markdownChunks.length; i++) {
      console.log(`\n=== Analyzing chunk ${i + 1}/${markdownChunks.length} with context ===`)
      console.log(`Chunk length: ${markdownChunks[i].length} characters`)
      console.log(`Chunk preview: ${markdownChunks[i].substring(0, 200)}...`)
      
      try {
        // Try to get a context-aware response with conversation context
        const simpleAnalysis = await this.analyzeChunkWithContext(markdownChunks[i], i, markdownChunks.length, conversationContext)
        chunkResults.push({
          index: i,
          segments: simpleAnalysis.segments,
          success: true
        })
        console.log(`✅ Chunk ${i + 1} analyzed successfully - ${simpleAnalysis.segments.length} segments`)
        
        // Add delay between chunks to avoid rate limiting
        if (i < markdownChunks.length - 1) {
          console.log('Waiting 2 seconds before next chunk...')
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (error) {
        console.error(`❌ Failed to analyze chunk ${i + 1}:`, error)
        
        // Store the error but try to extract what we can with context
        const fallbackSegments = this.extractSegmentsFallback(markdownChunks[i], i, markdownChunks.length)
        chunkResults.push({
          index: i,
          segments: fallbackSegments,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.log(`⚠️ Using fallback for chunk ${i + 1} - ${fallbackSegments.length} segments`)
      }
    }
    
    console.log(`\n=== Combining chunk results ===`)
    const successfulChunks = chunkResults.filter(r => r.success).length
    const totalSegments = chunkResults.reduce((sum, r) => sum + r.segments.length, 0)
    console.log(`Successful chunks: ${successfulChunks} out of ${markdownChunks.length}`)
    console.log(`Total segments collected: ${totalSegments}`)
    
    return await this.combineChunkResults(chunkResults, markdownTranscript)
  }

  private createMarkdownChunks(markdownTranscript: string): string[] {
    console.log('=== Creating Exchange-Based Chunks ===')
    console.log(`Original transcript length: ${markdownTranscript.length} characters`)
    
    // Split into complete exchanges based on the markdown structure
    const exchangePattern = /### Exchange \d+:/g
    const exchangeMatches = [...markdownTranscript.matchAll(exchangePattern)]
    
    if (exchangeMatches.length === 0) {
      console.log('No exchange patterns found, using entire transcript as single chunk')
      return [markdownTranscript]
    }
    
    console.log(`Found ${exchangeMatches.length} exchanges in transcript`)
    
    const exchanges: string[] = []
    
    // Extract each complete exchange
    for (let i = 0; i < exchangeMatches.length; i++) {
      const currentMatch = exchangeMatches[i]
      const nextMatch = exchangeMatches[i + 1]
      
      const startIndex = currentMatch.index!
      const endIndex = nextMatch ? nextMatch.index! : markdownTranscript.length
      
      const exchangeContent = markdownTranscript.substring(startIndex, endIndex).trim()
      exchanges.push(exchangeContent)
    }
    
    console.log(`Extracted ${exchanges.length} complete exchanges`)
    
    // Group exchanges into chunks with minimal overlap to reduce duplicates
    const chunks: string[] = []
    const maxExchangesPerChunk = 12 // Larger chunks for better context
    const overlapExchanges = 1 // Minimal overlap to reduce duplicates
    
    let currentChunkExchanges: string[] = []
    let exchangeIndex = 0
    
    while (exchangeIndex < exchanges.length) {
      // Add exchanges to current chunk
      while (currentChunkExchanges.length < maxExchangesPerChunk && exchangeIndex < exchanges.length) {
        currentChunkExchanges.push(exchanges[exchangeIndex])
        exchangeIndex++
      }
      
      // Create chunk from current exchanges
      if (currentChunkExchanges.length > 0) {
        const chunkContent = currentChunkExchanges.join('\n\n')
        chunks.push(chunkContent)
        
        console.log(`Created chunk ${chunks.length}: ${currentChunkExchanges.length} exchanges, ${chunkContent.length} chars`)
        console.log(`  Exchange range: ${this.extractExchangeNumber(currentChunkExchanges[0])} to ${this.extractExchangeNumber(currentChunkExchanges[currentChunkExchanges.length - 1])}`)
        
        // Prepare next chunk with minimal overlap
        if (exchangeIndex < exchanges.length) {
          const overlapStart = Math.max(0, currentChunkExchanges.length - overlapExchanges)
          currentChunkExchanges = currentChunkExchanges.slice(overlapStart)
          
          // Adjust exchange index to account for overlap
          exchangeIndex -= overlapExchanges
          console.log(`  Carrying forward ${overlapExchanges} exchange for context`)
        } else {
          currentChunkExchanges = []
        }
      }
    }
    
    console.log(`Created ${chunks.length} chunks total`)
    
    // Validate chunks don't exceed safe limits
    const validatedChunks = chunks.filter(chunk => {
      if (chunk.length > 15000) {
        console.warn(`Chunk too large (${chunk.length} chars), may cause processing issues`)
        return false
      }
      return true
    })
    
    if (validatedChunks.length < chunks.length) {
      console.log(`Filtered out ${chunks.length - validatedChunks.length} oversized chunks`)
    }
    
    return validatedChunks.length > 0 ? validatedChunks : [markdownTranscript]
  }

  private async generateConversationContext(markdownTranscript: string): Promise<string> {
    console.log('=== Generating Overall Conversation Context ===')
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Analyze this service call transcript and provide a BRIEF conversation context summary for stage classification.

Return ONLY this format:
CALL_TYPE: [type of service call]
MAIN_ISSUE: [primary problem being addressed]
CONVERSATION_FLOW: [brief description of how conversation progresses]
STAGE_DISTRIBUTION: introduction=[timeframe], diagnosis=[timeframe], solution=[timeframe], upsell=[timeframe], maintenance=[timeframe], closing=[timeframe]
KEY_TRANSITIONS: [main conversation turning points]

Example:
CALL_TYPE: HVAC repair service call
MAIN_ISSUE: AC unit making grinding noise, bearing replacement needed
CONVERSATION_FLOW: Greeting → problem diagnosis → repair explanation → cost discussion → maintenance plan offer → service completion
STAGE_DISTRIBUTION: introduction=0-5min, diagnosis=5-15min, solution=15-25min, upsell=25-30min, maintenance=30-35min, closing=35-40min
KEY_TRANSITIONS: Problem identified at 10min, repair approved at 20min, maintenance discussed at 30min

Keep each section under 15 words. Focus on stage timing and flow.`
            },
            {
              role: 'user',
              content: `Analyze the overall flow of this service call transcript:\n\n${markdownTranscript.substring(0, 8000)}${markdownTranscript.length > 8000 ? '...[truncated for context analysis]' : ''}`
            }
          ],
          temperature: 0.1,
          max_tokens: 500
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content?.trim()

      if (!content) {
        throw new Error('Empty response from context analysis')
      }

      console.log('Generated conversation context:', content)
      return content

    } catch (error) {
      console.error('Failed to generate conversation context:', error)
      // Return fallback context
      return `CALL_TYPE: Service call
MAIN_ISSUE: Technical service issue
CONVERSATION_FLOW: Standard service call progression
STAGE_DISTRIBUTION: introduction=early, diagnosis=early-mid, solution=mid, upsell=mid-late, maintenance=late, closing=end
KEY_TRANSITIONS: Problem diagnosis in early conversation, solution presentation in middle`
    }
  }

  private async analyzeChunkWithContext(markdownChunk: string, chunkIndex: number, totalChunks: number, conversationContext: string): Promise<{ segments: any[] }> {
    console.log(`=== Context-Enhanced Analysis for Chunk ${chunkIndex + 1}/${totalChunks} ===`)
    
    // Determine conversation position for better context
    const isEarlyConversation = chunkIndex < Math.ceil(totalChunks * 0.3) // First 30%
    const isMidConversation = chunkIndex >= Math.ceil(totalChunks * 0.3) && chunkIndex < Math.ceil(totalChunks * 0.7) // Middle 40%
    const isLateConversation = chunkIndex >= Math.ceil(totalChunks * 0.7) // Last 30%
    
    let positionContext = ''
    let expectedStages = ''
    
    if (isEarlyConversation) {
      positionContext = 'This is from the BEGINNING of the conversation.'
      expectedStages = 'Expected stages: introduction, early diagnosis. Avoid closing/maintenance unless clearly appropriate.'
    } else if (isMidConversation) {
      positionContext = 'This is from the MIDDLE of the conversation.'
      expectedStages = 'Expected stages: diagnosis, solution, upsell. Avoid introduction/closing unless clearly appropriate.'
    } else {
      positionContext = 'This is from the END of the conversation.'
      expectedStages = 'Expected stages: solution completion, upsell, maintenance, closing.'
    }
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Analyze this transcript chunk with FULL CONVERSATION CONTEXT and return ONLY a simple text format - NO JSON.

OVERALL CONVERSATION CONTEXT:
${conversationContext}

CHUNK POSITION CONTEXT:
${positionContext}
${expectedStages}

Use the conversation context above to make better stage predictions. Consider:
- The main issue and how it progresses
- Where this chunk fits in the overall conversation flow
- The expected stage distribution timing
- Key transition points in the conversation

The transcript has this format:
### Exchange N: Speaker
**Time:** 202:40
Content text here

IMPORTANT CONTEXT RULES:
- Use the CONVERSATION CONTEXT above to guide stage assignment
- "Got you all done" could be task completion (solution) not closing if early/mid conversation
- Consider the overall conversation flow and stage distribution
- Don't assume phrases mean stages without considering conversation position and overall context

Extract the EXACT timestamps from the markdown (like 202:40, 213:20) - do NOT generate new ones.
Process exchanges in the EXACT order they appear in the markdown.

For each exchange, return exactly this format:
SPEAKER|TIMESTAMP|TEXT|STAGE|ANNOTATION|HIGHLIGHT

Stage Guidelines Based on Conversation Context & Position:
- introduction: Greetings, introductions, initial contact (consider conversation context timing)
- diagnosis: Problem identification, troubleshooting, asking questions (align with main issue)
- solution: Explaining fixes, providing options, demonstrating solutions (consider main issue resolution)
- upsell: Offering additional services, upgrades, add-ons (consider conversation flow)
- maintenance: Service plans, ongoing maintenance offers (consider stage distribution)
- closing: Final wrap-up, payment, departure, actual conversation end (consider overall flow)

Rules:
- Use | as separator 
- Use the EXACT timestamps from the markdown (like 202:40, 213:20)
- Process exchanges in chronological order as they appear
- Include the COMPLETE text from each exchange (don't truncate)
- Keep annotations under 8 words
- Use highlights: success, opportunity, concern, neutral
- NO quotes, NO special characters
- Consider BOTH conversation position AND overall context when determining stages

Return ONLY the pipe-separated lines, nothing else.`
            },
            {
              role: 'user',
              content: `Process chunk ${chunkIndex + 1} of ${totalChunks} using the conversation context:\n\n${markdownChunk}`
            }
          ],
          temperature: 0.1,
          max_tokens: 1500
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content?.trim()

      if (!content) {
        throw new Error('Empty response from OpenAI')
      }

      console.log(`Raw context-enhanced response for chunk ${chunkIndex + 1}:`, content.substring(0, 400))

      // Parse the pipe-separated format
      const lines = content.split('\n').filter(line => line.trim() && line.includes('|'))
      const segments: any[] = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        const parts = line.split('|')
        
        if (parts.length >= 4) {
          const segment = {
            speaker: parts[0]?.trim() || 'Unknown',
            timestamp: parts[1]?.trim() || `${Math.floor(i * 2)}:${((i * 30) % 60).toString().padStart(2, '0')}`,
            text: parts[2]?.trim() || 'No text',
            stage: parts[3]?.trim() || 'introduction',
            annotation: parts[4]?.trim() || 'Context-aware analysis',
            highlight: parts[5]?.trim() || 'neutral'
          }
          
          // Clean up problematic characters but preserve ALL text content
          segment.text = segment.text.replace(/["\\\n\r\t]/g, ' ').trim()
          segment.annotation = segment.annotation.replace(/["\\\n\r\t]/g, ' ').substring(0, 80)
          
          // Keep complete text - no truncation for UI display
          
          segments.push(segment)
        }
      }

      if (segments.length === 0) {
        throw new Error('No valid segments parsed from context-enhanced analysis')
      }

      console.log(`✅ Parsed ${segments.length} context-enhanced segments for chunk ${chunkIndex + 1}`)
      return { segments }

    } catch (error) {
      console.error(`Context-enhanced analysis failed for chunk ${chunkIndex + 1}:`, error)
      throw error
    }
  }

  private async analyzeChunkSimple(markdownChunk: string, chunkIndex: number, totalChunks: number = 1): Promise<{ segments: any[] }> {
    console.log(`=== Context-Aware Analysis for Chunk ${chunkIndex + 1}/${totalChunks} ===`)
    
    // Determine conversation position for better context
    const isEarlyConversation = chunkIndex < Math.ceil(totalChunks * 0.3) // First 30%
    const isMidConversation = chunkIndex >= Math.ceil(totalChunks * 0.3) && chunkIndex < Math.ceil(totalChunks * 0.7) // Middle 40%
    const isLateConversation = chunkIndex >= Math.ceil(totalChunks * 0.7) // Last 30%
    
    let positionContext = ''
    let expectedStages = ''
    
    if (isEarlyConversation) {
      positionContext = 'This is from the BEGINNING of the conversation.'
      expectedStages = 'Expected stages: introduction, early diagnosis. Avoid closing/maintenance unless clearly appropriate.'
    } else if (isMidConversation) {
      positionContext = 'This is from the MIDDLE of the conversation.'
      expectedStages = 'Expected stages: diagnosis, solution, upsell. Avoid introduction/closing unless clearly appropriate.'
    } else {
      positionContext = 'This is from the END of the conversation.'
      expectedStages = 'Expected stages: solution completion, upsell, maintenance, closing.'
    }
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Analyze this transcript chunk with CONVERSATION CONTEXT and return ONLY a simple text format - NO JSON. 

${positionContext}
${expectedStages}

The transcript has this format:
### Exchange N: Speaker
**Time:** 202:40
Content text here

IMPORTANT CONTEXT RULES:
- "Got you all done" or similar phrases are usually NOT closing if in early/mid conversation
- "Hello" or greetings are usually NOT introduction if in mid/late conversation  
- Consider the conversation flow and position when assigning stages
- Don't assume every completion phrase means "closing" - could be completing a task or explanation

Extract the EXACT timestamps from the markdown (like 202:40, 213:20) - do NOT generate new ones.
Process exchanges in the EXACT order they appear in the markdown.

For each exchange, return exactly this format:
SPEAKER|TIMESTAMP|TEXT|STAGE|ANNOTATION|HIGHLIGHT

Stage Guidelines Based on Position:
- introduction: Greetings, introductions, initial contact (mainly early conversation)
- diagnosis: Problem identification, troubleshooting, asking questions (early to mid)
- solution: Explaining fixes, providing options, demonstrating solutions (mid conversation)
- upsell: Offering additional services, upgrades, add-ons (mid to late)
- maintenance: Service plans, ongoing maintenance offers (mid to late)
- closing: Final wrap-up, payment, departure, actual conversation end (late conversation)

Rules:
- Use | as separator 
- Use the EXACT timestamps from the markdown (like 202:40, 213:20)
- Process exchanges in chronological order as they appear
- Include the COMPLETE text from each exchange (don't truncate)
- Keep annotations under 8 words
- Use highlights: success, opportunity, concern, neutral
- NO quotes, NO special characters
- Consider conversation position when determining stages

Return ONLY the pipe-separated lines, nothing else.`
            },
            {
              role: 'user',
              content: `Process chunk ${chunkIndex + 1} of ${totalChunks}:\n\n${markdownChunk}`
            }
          ],
          temperature: 0.1,
          max_tokens: 1500
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content?.trim()

      if (!content) {
        throw new Error('Empty response from OpenAI')
      }

      console.log(`Raw pipe-separated response for chunk ${chunkIndex + 1}:`, content.substring(0, 400))

      // Parse the pipe-separated format
      const lines = content.split('\n').filter(line => line.trim() && line.includes('|'))
      const segments: any[] = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        const parts = line.split('|')
        
        if (parts.length >= 4) {
          const segment = {
            speaker: parts[0]?.trim() || 'Unknown',
            timestamp: parts[1]?.trim() || `${Math.floor(i * 2)}:${((i * 30) % 60).toString().padStart(2, '0')}`,
            text: parts[2]?.trim() || 'No text',
            stage: parts[3]?.trim() || 'introduction',
            annotation: parts[4]?.trim() || 'Analysis note',
            highlight: parts[5]?.trim() || 'neutral'
          }
          
          // Clean up problematic characters but preserve ALL text content
          segment.text = segment.text.replace(/["\\\n\r\t]/g, ' ').trim()
          segment.annotation = segment.annotation.replace(/["\\\n\r\t]/g, ' ').substring(0, 80)
          
          // Keep complete text - no truncation for UI display
          
          segments.push(segment)
        }
      }

      if (segments.length === 0) {
        throw new Error('No valid segments parsed from pipe format')
      }

      console.log(`✅ Parsed ${segments.length} segments from pipe format for chunk ${chunkIndex + 1}`)
      return { segments }

    } catch (error) {
      console.error(`Ultra-simple analysis failed for chunk ${chunkIndex + 1}:`, error)
      throw error
    }
  }

  private extractSegmentsFallback(markdownChunk: string, chunkIndex: number, totalChunks: number = 1): any[] {
    console.log(`=== Enhanced Context-Aware Fallback extraction for chunk ${chunkIndex + 1}/${totalChunks} ===`)
    
    // Determine conversation position for better stage assignment
    const isEarlyConversation = chunkIndex < Math.ceil(totalChunks * 0.3)
    const isMidConversation = chunkIndex >= Math.ceil(totalChunks * 0.3) && chunkIndex < Math.ceil(totalChunks * 0.7)
    const isLateConversation = chunkIndex >= Math.ceil(totalChunks * 0.7)
    
    const lines = markdownChunk.split('\n')
    const segments: any[] = []
    let currentSpeaker = ''
    let currentText = ''
    let currentTimestamp = ''
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Look for Exchange headers: "### Exchange N: Speaker"
      const exchangeMatch = line.match(/^###\s+Exchange\s+\d+:\s+(.+)$/)
      if (exchangeMatch) {
        currentSpeaker = exchangeMatch[1]
        continue
      }
      
      // Look for timestamps: "**Time:** 202:40"
      const timeMatch = line.match(/^\*\*Time:\*\*\s+(.+)$/)
      if (timeMatch) {
        currentTimestamp = timeMatch[1]
        continue
      }
      
      // Look for content lines (non-empty, not markdown formatting)
      if (line && !line.startsWith('#') && !line.startsWith('**') && !line.startsWith('---') && line !== '---') {
        if (currentText) {
          currentText += ' ' + line
        } else {
          currentText = line
        }
        
        // If we have all components, create a segment
        if (currentSpeaker && currentTimestamp && currentText) {
          // Clean up text but preserve ALL content for UI display
          let cleanText = currentText.replace(/["\\\n\r\t]/g, ' ').trim()
          if (cleanText.length === 0) cleanText = 'No text available'
          
          // Keep complete text - no truncation for exchange display
          
          // Context-aware stage assignment based on conversation position
          let stage = 'diagnosis' // Default to diagnosis as most common
          const lowerText = cleanText.toLowerCase()
          
          if (isEarlyConversation) {
            // Early conversation - favor introduction and diagnosis
            if (lowerText.includes('hello') || lowerText.includes('hi ') || lowerText.includes('good morning') || lowerText.includes('introduction') || lowerText.includes('name is')) {
              stage = 'introduction'
            } else if (lowerText.includes('problem') || lowerText.includes('issue') || lowerText.includes('diagnos') || lowerText.includes('what') || lowerText.includes('how')) {
              stage = 'diagnosis'
            } else if (lowerText.includes('fix') || lowerText.includes('repair')) {
              stage = 'solution'
            }
            // Avoid closing in early conversation unless very explicit
          } else if (isMidConversation) {
            // Mid conversation - favor diagnosis, solution, upsell
            if (lowerText.includes('problem') || lowerText.includes('issue') || lowerText.includes('diagnos') || lowerText.includes('check') || lowerText.includes('look')) {
              stage = 'diagnosis'
            } else if (lowerText.includes('fix') || lowerText.includes('repair') || lowerText.includes('cost') || lowerText.includes('price') || lowerText.includes('solution')) {
              stage = 'solution'
            } else if (lowerText.includes('upgrade') || lowerText.includes('recommend') || lowerText.includes('option') || lowerText.includes('replace') || lowerText.includes('additional')) {
              stage = 'upsell'
            } else if (lowerText.includes('maintenance') || lowerText.includes('service plan') || lowerText.includes('agreement')) {
              stage = 'maintenance'
            }
            // "done" in mid-conversation is usually completing a task, not closing
            if (lowerText.includes('done') && !lowerText.includes('thank')) {
              stage = 'solution' // Task completion
            }
          } else {
            // Late conversation - favor solution completion, upsell, maintenance, closing
            if (lowerText.includes('upgrade') || lowerText.includes('recommend') || lowerText.includes('option') || lowerText.includes('replace')) {
              stage = 'upsell'
            } else if (lowerText.includes('maintenance') || lowerText.includes('service plan') || lowerText.includes('agreement')) {
              stage = 'maintenance'
            } else if (lowerText.includes('thank') || (lowerText.includes('done') && lowerText.includes('all')) || lowerText.includes('finish') || lowerText.includes('complete') || lowerText.includes('goodbye')) {
              stage = 'closing'
            } else if (lowerText.includes('fix') || lowerText.includes('repair') || lowerText.includes('cost') || lowerText.includes('price')) {
              stage = 'solution'
            }
          }
          
          // Highlight based on content
          let highlight = 'neutral'
          if (lowerText.includes('great') || lowerText.includes('excellent') || lowerText.includes('perfect') || lowerText.includes('good')) {
            highlight = 'success'
          } else if (lowerText.includes('could') || lowerText.includes('might') || lowerText.includes('interested') || lowerText.includes('consider')) {
            highlight = 'opportunity'
          } else if (lowerText.includes('problem') || lowerText.includes('issue') || lowerText.includes('concern') || lowerText.includes('wrong')) {
            highlight = 'concern'
          }
          
          segments.push({
            speaker: currentSpeaker,
            timestamp: currentTimestamp,
            text: cleanText,
            stage,
            annotation: `Context-aware fallback (${isEarlyConversation ? 'early' : isMidConversation ? 'mid' : 'late'})`,
            highlight
          })
          
          // Reset for next segment
          currentSpeaker = ''
          currentText = ''
          currentTimestamp = ''
        }
      }
    } // Close the for loop
    
    // If no segments found, create at least one from the chunk
    if (segments.length === 0) {
      // Try to extract at least basic info from exchange headers
      const exchangeHeaders = markdownChunk.match(/### Exchange \d+: (.+)/g)
      if (exchangeHeaders) {
        segments.push({
          speaker: "System",
          timestamp: "0:00",
          text: `Processed ${exchangeHeaders.length} exchanges in chunk ${chunkIndex + 1}`,
          stage: "introduction",
          annotation: "Fallback processing",
          highlight: "neutral"
        })
      } else {
        segments.push({
          speaker: "System",
          timestamp: "0:00",
          text: `Chunk ${chunkIndex + 1} processed with fallback method`,
          stage: "introduction",
          annotation: "Fallback processing",
          highlight: "neutral"
        })
      }
    }
    
    console.log(`Enhanced fallback extracted ${segments.length} segments from chunk ${chunkIndex + 1}`)
    return segments
  }

  private parseTimestamp(timestamp: string): number {
    // Parse timestamps like "202:40", "13:20", etc. and convert to total seconds for sorting
    const parts = timestamp.split(':')
    if (parts.length >= 2) {
      const minutes = parseInt(parts[0]) || 0
      const seconds = parseInt(parts[1]) || 0
      return minutes * 60 + seconds
    }
    return 0
  }

  private extractExchangeNumber(exchangeContent: string): string {
    // Extract exchange number from "### Exchange 5: Customer" format
    const match = exchangeContent.match(/### Exchange (\d+):/)
    return match ? match[1] : '?'
  }

  private async combineChunkResults(chunkResults: Array<{ 
    index: number, 
    segments: any[], 
    success: boolean, 
    error?: string 
  }>, originalTranscript: string): Promise<CallAnalysis> {
    console.log('=== Combining Chunk Results ===')
    
    // Collect all segments in order - minimal duplicates expected with exchange-based chunking
    const allSegments = chunkResults
      .sort((a, b) => a.index - b.index) // Ensure correct order
      .flatMap(result => result.segments)
    
    // Sort segments by timestamp to ensure chronological order
    allSegments.sort((a, b) => {
      const timeA = this.parseTimestamp(a.timestamp)
      const timeB = this.parseTimestamp(b.timestamp)
      return timeA - timeB
    })
    
    // Simple duplicate removal - only remove exact duplicates from minimal overlap
    const uniqueSegments: any[] = []
    const seenTimestamps = new Set<string>()
    
    for (const segment of allSegments) {
      // Use timestamp + speaker as unique key since exchanges are distinct
      const uniqueKey = `${segment.timestamp}-${segment.speaker}`
      
      if (!seenTimestamps.has(uniqueKey)) {
        seenTimestamps.add(uniqueKey)
        uniqueSegments.push(segment)
      } else {
        console.log(`Removing exact duplicate: ${segment.speaker}@${segment.timestamp}`)
      }
    }
    
    console.log(`Total segments processed: ${uniqueSegments.length} (${allSegments.length - uniqueSegments.length} exact duplicates removed)`)
    console.log(`Successful chunks: ${chunkResults.filter(r => r.success).length}/${chunkResults.length}`)
    
    // Verify chronological order
    console.log(`Segments ordered chronologically from ${uniqueSegments[0]?.timestamp} to ${uniqueSegments[uniqueSegments.length - 1]?.timestamp}`)
    
    // Log sample segments to verify order and content
    console.log('Sample segments:')
    uniqueSegments.slice(0, 3).forEach((segment, i) => {
      console.log(`  ${i + 1}. ${segment.speaker}@${segment.timestamp}: ${segment.text.substring(0, 40)}...`)
    })
    if (uniqueSegments.length > 3) {
      console.log('  ...')
      uniqueSegments.slice(-2).forEach((segment, i) => {
        const actualIndex = uniqueSegments.length - 2 + i + 1
        console.log(`  ${actualIndex}. ${segment.speaker}@${segment.timestamp}: ${segment.text.substring(0, 40)}...`)
      })
    }
    
    // Preserve original timestamps from markdown - only fix clearly broken ones
    uniqueSegments.forEach((segment, index) => {
      // Only fix timestamps that are clearly broken, missing, or malformed
      if (!segment.timestamp || segment.timestamp === '0:00' || segment.timestamp.includes('undefined') || segment.timestamp.includes('null')) {
        // Generate realistic fallback timestamp
        const minutes = Math.floor(index * 2) // 2 minutes per exchange
        const seconds = (index * 30) % 60 // 30 seconds variance
        segment.timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`
        console.log(`Fixed missing timestamp for segment ${index}: ${segment.timestamp}`)
      }
      // Preserve original timestamps that look valid (like 202:40, 213:20, etc.)
      else {
        const timestampMatch = segment.timestamp.match(/^(\d+):(\d+)$/)
        if (timestampMatch) {
          const minutes = parseInt(timestampMatch[1])
          const seconds = parseInt(timestampMatch[2])
          
          // Only fix obviously malformed timestamps
          if (seconds > 59) {
            const additionalMins = Math.floor(seconds / 60)
            const fixedSeconds = seconds % 60
            segment.timestamp = `${minutes + additionalMins}:${fixedSeconds.toString().padStart(2, '0')}`
            console.log(`Fixed malformed timestamp: ${timestampMatch[0]} -> ${segment.timestamp}`)
          }
          // Keep all other timestamps as-is (including high minute values like 202:40)
        }
      }
    })
    
    // Create quality-based compliance analysis using segment highlights and content
    const stages = ['introduction', 'diagnosis', 'solution', 'upsell', 'maintenance', 'closing']
    const stageSegments = stages.map(stage => ({
      stage,
      segments: uniqueSegments.filter(s => s.stage === stage)
    }))
    
    const compliance = {
      introduction: this.assessStageQuality(stageSegments[0].segments, 'introduction'),
      diagnosis: this.assessStageQuality(stageSegments[1].segments, 'diagnosis'),
      solution: this.assessStageQuality(stageSegments[2].segments, 'solution'),
      upsell: this.assessStageQuality(stageSegments[3].segments, 'upsell'),
      maintenance: this.assessStageQuality(stageSegments[4].segments, 'maintenance'),
      closing: this.assessStageQuality(stageSegments[5].segments, 'closing')
    }
    
    // Calculate score based on successful chunks and segment quality
    const successRate = chunkResults.filter(r => r.success).length / chunkResults.length
    const overallScore = Math.round(successRate * 85) // Base score adjusted by success rate
    
    // Generate comprehensive sales insights from all segments
    const salesInsights = await this.generateSalesInsights(uniqueSegments, originalTranscript)
    
    // Generate detailed compliance summaries that answer specific questions
    const complianceSummaries = await this.generateDetailedComplianceSummaries(uniqueSegments, originalTranscript)
    
    // Generate comprehensive detailed recommendations
    const detailedRecommendations = await this.generateDetailedRecommendations(uniqueSegments, originalTranscript, compliance, salesInsights)
    
    // Generate AI-powered compliance score based on compliance check results
    const aiGeneratedScore = await this.generateComplianceScore(compliance, uniqueSegments)
    
    const result = {
      callType: `Service Call Analysis (${uniqueSegments.length} segments from ${chunkResults.length} chunks)`,
      overallScore: aiGeneratedScore,
      compliance,
      complianceSummaries,
      detailedRecommendations,
      salesInsights,
      transcript: { segments: uniqueSegments }
    }
    
    console.log('Combined analysis result:')
    console.log(`- Total segments: ${uniqueSegments.length}`)
    console.log(`- Overall score: ${overallScore}`)
    console.log(`- Success rate: ${(successRate * 100).toFixed(1)}%`)
    
    return result
  }

  private async generateDetailedComplianceSummaries(segments: any[], originalTranscript: string): Promise<any> {
    console.log('=== Generating Detailed Compliance Summaries ===')
    
    try {
      // Group segments by stage for focused analysis
      const stageSegments = {
        introduction: segments.filter(s => s.stage === 'introduction'),
        diagnosis: segments.filter(s => s.stage === 'diagnosis'),
        solution: segments.filter(s => s.stage === 'solution'),
        upsell: segments.filter(s => s.stage === 'upsell'),
        maintenance: segments.filter(s => s.stage === 'maintenance'),
        closing: segments.filter(s => s.stage === 'closing')
      }

      // Create a focused transcript for compliance analysis
      const complianceFocusedContent = Object.entries(stageSegments)
        .map(([stage, stageSegs]) => {
          if (stageSegs.length === 0) return `\n### ${stage.toUpperCase()} STAGE: No segments found\n`
          
          return `\n### ${stage.toUpperCase()} STAGE:\n` + 
            stageSegs.map(s => `${s.speaker} (${s.timestamp}): ${s.text}`).join('\n')
        })
        .join('\n')

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a service call compliance analyst. Analyze each stage and provide detailed summaries that answer specific questions.

For each stage, provide a detailed narrative summary that directly answers these questions:

INTRODUCTION:
- Did the technician properly greet the customer and introduce themselves/company?
- How professional and courteous was the opening interaction?
- Was rapport established effectively?

DIAGNOSIS:
- How did the technician inquire about and understand the customer's issue?
- What diagnostic questions were asked?
- How thoroughly was the problem investigated?
- Did the technician explain their diagnostic process?

SOLUTION:
- Did the technician clearly explain the solution or service performed?
- How well did they communicate technical information?
- Were options and alternatives presented?
- Was pricing discussed clearly and transparently?

UPSELL:
- Note if and how the technician attempted to upsell additional services or products
- What specific upselling techniques were used?
- How were additional services positioned and presented?
- What was the customer's response to upselling attempts?

MAINTENANCE:
- Did the technician offer any maintenance plans or long-term service agreements?
- How were maintenance benefits communicated?
- What specific maintenance services were discussed?
- Was recurring revenue opportunity maximized?

CLOSING:
- How did the technician conclude the call?
- Did they thank the customer and finish courteously?
- Were next steps clearly communicated?
- Was follow-up discussed or scheduled?

Return detailed summaries in this exact format:

INTRODUCTION_SUMMARY: [Detailed paragraph answering introduction questions]
DIAGNOSIS_SUMMARY: [Detailed paragraph answering diagnosis questions]
SOLUTION_SUMMARY: [Detailed paragraph answering solution questions]
UPSELL_SUMMARY: [Detailed paragraph answering upsell questions]
MAINTENANCE_SUMMARY: [Detailed paragraph answering maintenance questions]
CLOSING_SUMMARY: [Detailed paragraph answering closing questions]

Focus on specific behaviors, exact quotes where relevant, and comprehensive analysis of each stage.`
            },
            {
              role: 'user',
              content: `Analyze this service call transcript for detailed compliance summaries:\n\n${complianceFocusedContent}`
            }
          ],
          temperature: 0.1,
          max_tokens: 2000
        })
      })

      if (!response.ok) {
        throw new Error(`Compliance summaries API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content?.trim()

      if (!content) {
        throw new Error('Empty response from compliance summaries analysis')
      }

      console.log('Generated compliance summaries preview:', content.substring(0, 500))

      // Parse the detailed summaries
      const summaries: any = {}
      const lines = content.split('\n').filter(line => line.trim())
      
      for (const line of lines) {
        const trimmedLine = line.trim()
        
        if (trimmedLine.startsWith('INTRODUCTION_SUMMARY:')) {
          summaries.introduction = trimmedLine.replace('INTRODUCTION_SUMMARY:', '').trim()
        } else if (trimmedLine.startsWith('DIAGNOSIS_SUMMARY:')) {
          summaries.diagnosis = trimmedLine.replace('DIAGNOSIS_SUMMARY:', '').trim()
        } else if (trimmedLine.startsWith('SOLUTION_SUMMARY:')) {
          summaries.solution = trimmedLine.replace('SOLUTION_SUMMARY:', '').trim()
        } else if (trimmedLine.startsWith('UPSELL_SUMMARY:')) {
          summaries.upsell = trimmedLine.replace('UPSELL_SUMMARY:', '').trim()
        } else if (trimmedLine.startsWith('MAINTENANCE_SUMMARY:')) {
          summaries.maintenance = trimmedLine.replace('MAINTENANCE_SUMMARY:', '').trim()
        } else if (trimmedLine.startsWith('CLOSING_SUMMARY:')) {
          summaries.closing = trimmedLine.replace('CLOSING_SUMMARY:', '').trim()
        }
      }

      console.log('Parsed compliance summaries:', Object.keys(summaries))
      return summaries

    } catch (error) {
      console.error('Failed to generate detailed compliance summaries:', error)
      // Return fallback summaries
      return {
        introduction: 'Unable to generate detailed introduction summary - analysis not available',
        diagnosis: 'Unable to generate detailed diagnosis summary - analysis not available',
        solution: 'Unable to generate detailed solution summary - analysis not available',
        upsell: 'Unable to generate detailed upsell summary - analysis not available',
        maintenance: 'Unable to generate detailed maintenance summary - analysis not available',
        closing: 'Unable to generate detailed closing summary - analysis not available'
      }
    }
  }

  private async generateDetailedRecommendations(segments: any[], originalTranscript: string, compliance: any, salesInsights: any): Promise<any> {
    console.log('=== Generating Detailed Recommendations ===')
    
    try {
      // Create comprehensive analysis data for recommendations
      const analysisData = {
        compliance,
        salesInsights,
        segmentCount: segments.length,
        stageBreakdown: {
          introduction: segments.filter(s => s.stage === 'introduction').length,
          diagnosis: segments.filter(s => s.stage === 'diagnosis').length,
          solution: segments.filter(s => s.stage === 'solution').length,
          upsell: segments.filter(s => s.stage === 'upsell').length,
          maintenance: segments.filter(s => s.stage === 'maintenance').length,
          closing: segments.filter(s => s.stage === 'closing').length,
        },
        highlightBreakdown: {
          success: segments.filter(s => s.highlight === 'success').length,
          opportunity: segments.filter(s => s.highlight === 'opportunity').length,
          concern: segments.filter(s => s.highlight === 'concern').length,
          neutral: segments.filter(s => s.highlight === 'neutral').length,
        }
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a service call performance consultant. Generate comprehensive, actionable recommendations based on call analysis data.

Create detailed recommendations in these categories:

COMPLIANCE_RECOMMENDATIONS:
- Specific actions to improve compliance standards
- Training recommendations for each stage
- Process improvements to ensure consistency
- Quality assurance measures

SALES_TRAINING_RECOMMENDATIONS:
- Specific sales techniques to implement
- Training modules needed for technicians
- Upselling and cross-selling strategies
- Customer engagement improvements

COMMUNICATION_RECOMMENDATIONS:
- Ways to improve customer communication
- Technical explanation techniques
- Building rapport and trust strategies
- Professional presentation skills

PROCESS_OPTIMIZATION_RECOMMENDATIONS:
- Workflow improvements for service calls
- Time management strategies
- Documentation and follow-up processes
- Customer satisfaction enhancements

COACHING_PRIORITIES:
- Individual coaching focus areas
- Team training priorities
- Performance metrics to track
- Development goals and timelines

For each recommendation, provide:
- Specific actionable steps
- Expected outcomes/benefits
- Implementation timeline
- Success metrics
- Priority level (High/Medium/Low)

Return in this exact format:

COMPLIANCE_RECOMMENDATIONS:
- [HIGH] [Specific compliance recommendation with actionable steps and expected timeline]
- [MEDIUM] [Another compliance recommendation...]

SALES_TRAINING_RECOMMENDATIONS:
- [HIGH] [Specific sales training recommendation with implementation details]
- [MEDIUM] [Another sales training recommendation...]

COMMUNICATION_RECOMMENDATIONS:
- [HIGH] [Specific communication improvement with practical steps]
- [LOW] [Another communication recommendation...]

PROCESS_OPTIMIZATION_RECOMMENDATIONS:
- [MEDIUM] [Specific process improvement with clear benefits]
- [HIGH] [Another process optimization...]

COACHING_PRIORITIES:
- [HIGH] [Priority coaching area with specific development plan]
- [MEDIUM] [Another coaching priority...]

Focus on practical, specific recommendations that can be implemented immediately.`
            },
            {
              role: 'user',
              content: `Generate detailed recommendations based on this service call analysis:

COMPLIANCE DATA:
${Object.entries(compliance).map(([stage, data]: [string, any]) => 
  `${stage.toUpperCase()}: Present: ${data.present}, Quality: ${data.quality}, Notes: ${data.notes}`
).join('\n')}

SALES INSIGHTS:
Opportunities: ${salesInsights.opportunities?.length || 0} identified
Successful Techniques: ${salesInsights.successful?.length || 0} used
Missed Opportunities: ${salesInsights.missed?.length || 0} found

CONVERSATION BREAKDOWN:
Total Segments: ${analysisData.segmentCount}
Stage Distribution: ${Object.entries(analysisData.stageBreakdown).map(([stage, count]) => `${stage}: ${count}`).join(', ')}
Performance Highlights: ${analysisData.highlightBreakdown.success} successes, ${analysisData.highlightBreakdown.opportunity} opportunities, ${analysisData.highlightBreakdown.concern} concerns

Provide comprehensive, actionable recommendations for improvement.`
            }
          ],
          temperature: 0.1,
          max_tokens: 2500
        })
      })

      if (!response.ok) {
        throw new Error(`Recommendations API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content?.trim()

      if (!content) {
        throw new Error('Empty response from recommendations analysis')
      }

      console.log('Generated recommendations preview:', content.substring(0, 500))

      // Parse the detailed recommendations
      const recommendations: any = {
        compliance: [],
        salesTraining: [],
        communication: [],
        processOptimization: [],
        coachingPriorities: []
      }

      const lines = content.split('\n').filter(line => line.trim())
      let currentSection = ''
      
      for (const line of lines) {
        const trimmedLine = line.trim()
        
        if (trimmedLine.startsWith('COMPLIANCE_RECOMMENDATIONS:')) {
          currentSection = 'compliance'
        } else if (trimmedLine.startsWith('SALES_TRAINING_RECOMMENDATIONS:')) {
          currentSection = 'salesTraining'
        } else if (trimmedLine.startsWith('COMMUNICATION_RECOMMENDATIONS:')) {
          currentSection = 'communication'
        } else if (trimmedLine.startsWith('PROCESS_OPTIMIZATION_RECOMMENDATIONS:')) {
          currentSection = 'processOptimization'
        } else if (trimmedLine.startsWith('COACHING_PRIORITIES:')) {
          currentSection = 'coachingPriorities'
        } else if (trimmedLine.startsWith('- ') && currentSection) {
          const recommendation = trimmedLine.substring(2).trim()
          if (recommendation.length > 10) {
            // Extract priority level
            const priorityMatch = recommendation.match(/^\[(\w+)\]\s*(.+)$/)
            if (priorityMatch) {
              recommendations[currentSection].push({
                priority: priorityMatch[1].toLowerCase(),
                text: priorityMatch[2].trim()
              })
            } else {
              recommendations[currentSection].push({
                priority: 'medium',
                text: recommendation
              })
            }
          }
        }
      }

      console.log('Parsed recommendations:', {
        compliance: recommendations.compliance.length,
        salesTraining: recommendations.salesTraining.length,
        communication: recommendations.communication.length,
        processOptimization: recommendations.processOptimization.length,
        coachingPriorities: recommendations.coachingPriorities.length
      })

      return recommendations

    } catch (error) {
      console.error('Failed to generate detailed recommendations:', error)
      // Return fallback recommendations
      return {
        compliance: [
          { priority: 'high', text: 'Review compliance standards and ensure technicians understand all required stages of service calls' }
        ],
        salesTraining: [
          { priority: 'medium', text: 'Provide additional sales training focusing on opportunity identification and upselling techniques' }
        ],
        communication: [
          { priority: 'medium', text: 'Improve customer communication skills through role-playing and feedback sessions' }
        ],
        processOptimization: [
          { priority: 'low', text: 'Review current service call processes for efficiency improvements' }
        ],
        coachingPriorities: [
          { priority: 'high', text: 'Focus individual coaching on areas identified through call analysis' }
        ]
      }
    }
  }

  private async generateComplianceScore(compliance: any, segments: any[]): Promise<number> {
    console.log('=== Generating AI-Powered Compliance Score ===')
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a service call compliance scoring expert. Analyze compliance data and generate an overall performance score from 0-100.

SCORING CRITERIA:
- Introduction (20 points): Professional greeting, company identification, purpose statement
- Diagnosis (25 points): Problem identification, questioning techniques, technical assessment
- Solution (25 points): Clear explanation, options presented, pricing transparency
- Upselling (10 points): Additional service offerings, value proposition
- Maintenance (10 points): Long-term service plans, preventive care discussion
- Closing (10 points): Professional conclusion, next steps, follow-up

QUALITY IMPACT:
- Excellent: Full points for stage
- Good: 80% of points for stage
- Fair: 60% of points for stage
- Poor: 30% of points for stage
- Not Present: 0 points for stage

ADDITIONAL FACTORS:
- Deduct 5-10 points for major compliance violations
- Add 5-10 points for exceptional customer service
- Consider overall conversation flow and professionalism

Return ONLY a single number between 0-100 representing the overall compliance score.`
            },
            {
              role: 'user',
              content: `Calculate compliance score for this service call:

COMPLIANCE ANALYSIS:
${Object.entries(compliance).map(([stage, data]: [string, any]) => 
  `${stage.toUpperCase()}: Present: ${data.present}, Quality: ${data.quality}, Notes: ${data.notes}`
).join('\n')}

CONVERSATION METRICS:
Total Segments: ${segments.length}
Success Highlights: ${segments.filter(s => s.highlight === 'success').length}
Opportunity Areas: ${segments.filter(s => s.highlight === 'opportunity').length}
Concerns Identified: ${segments.filter(s => s.highlight === 'concern').length}

Calculate the overall compliance score (0-100).`
            }
          ],
          temperature: 0.1,
          max_tokens: 50
        })
      })

      if (!response.ok) {
        throw new Error(`Compliance scoring API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content?.trim()

      if (!content) {
        throw new Error('Empty response from compliance scoring')
      }

      // Extract numeric score from response
      const scoreMatch = content.match(/\b(\d{1,3})\b/)
      const score = scoreMatch ? parseInt(scoreMatch[1]) : null

      if (score !== null && score >= 0 && score <= 100) {
        console.log(`AI-generated compliance score: ${score}`)
        return score
      } else {
        console.warn('Invalid score from AI, using fallback calculation')
        return this.calculateFallbackScore(compliance)
      }

    } catch (error) {
      console.error('Failed to generate AI compliance score:', error)
      return this.calculateFallbackScore(compliance)
    }
  }

  private calculateFallbackScore(compliance: any): number {
    console.log('=== Calculating Fallback Compliance Score ===')
    
    const stageWeights = {
      introduction: 20,
      diagnosis: 25,
      solution: 25,
      upsell: 10,
      maintenance: 10,
      closing: 10
    }

    const qualityMultipliers = {
      'Excellent': 1.0,
      'Good': 0.8,
      'Fair': 0.6,
      'Poor': 0.3
    }

    let totalScore = 0

    Object.entries(stageWeights).forEach(([stage, weight]) => {
      const stageData = compliance[stage]
      if (stageData && stageData.present) {
        const multiplier = qualityMultipliers[stageData.quality as keyof typeof qualityMultipliers] || 0.3
        totalScore += weight * multiplier
      }
      // If stage not present, it contributes 0 points
    })

    const finalScore = Math.round(totalScore)
    console.log(`Fallback compliance score: ${finalScore}`)
    return finalScore
  }

  private assessStageQuality(segments: any[], stageName: string): { present: boolean; quality: string; notes: string } {
    if (!segments || segments.length === 0) {
      return {
        present: false,
        quality: 'Poor',
        notes: `No ${stageName} activities detected in conversation`
      }
    }

    // Analyze segment highlights to determine quality
    const successCount = segments.filter(s => s.highlight === 'success').length
    const opportunityCount = segments.filter(s => s.highlight === 'opportunity').length
    const concernCount = segments.filter(s => s.highlight === 'concern').length
    const neutralCount = segments.filter(s => s.highlight === 'neutral').length

    // Calculate quality score based on highlights and content
    let qualityScore = 0
    let qualityNotes: string[] = []

    // Success segments contribute most to quality
    qualityScore += successCount * 3
    if (successCount > 0) {
      qualityNotes.push(`${successCount} successful technique${successCount === 1 ? '' : 's'}`)
    }

    // Opportunities show engagement but need improvement
    qualityScore += opportunityCount * 1
    if (opportunityCount > 0) {
      qualityNotes.push(`${opportunityCount} opportunity${opportunityCount === 1 ? '' : 'ies'} identified`)
    }

    // Concerns reduce quality significantly
    qualityScore -= concernCount * 2
    if (concernCount > 0) {
      qualityNotes.push(`${concernCount} concern${concernCount === 1 ? '' : 's'} raised`)
    }

    // Neutral segments are baseline (no impact)
    
    // Stage-specific quality assessment
    let quality: string
    let minSegments: number
    
    switch (stageName) {
      case 'introduction':
        minSegments = 1
        if (qualityScore >= 6 && segments.length >= 2) quality = 'Excellent'
        else if (qualityScore >= 3 && segments.length >= 1) quality = 'Good'
        else if (qualityScore >= 1) quality = 'Fair'
        else quality = 'Poor'
        break
        
      case 'diagnosis':
        minSegments = 2
        if (qualityScore >= 9 && segments.length >= 3) quality = 'Excellent'
        else if (qualityScore >= 6 && segments.length >= 2) quality = 'Good'
        else if (qualityScore >= 2) quality = 'Fair'
        else quality = 'Poor'
        break
        
      case 'solution':
        minSegments = 2
        if (qualityScore >= 9 && segments.length >= 3) quality = 'Excellent'
        else if (qualityScore >= 6 && segments.length >= 2) quality = 'Good'
        else if (qualityScore >= 2) quality = 'Fair'
        else quality = 'Poor'
        break
        
      case 'upsell':
        minSegments = 1
        if (qualityScore >= 6 && segments.length >= 2) quality = 'Good'
        else if (qualityScore >= 3) quality = 'Fair'
        else quality = 'Poor'
        break
        
      case 'maintenance':
        minSegments = 1
        if (qualityScore >= 6 && segments.length >= 2) quality = 'Good'
        else if (qualityScore >= 3) quality = 'Fair'
        else quality = 'Poor'
        break
        
      case 'closing':
        minSegments = 1
        if (qualityScore >= 6 && segments.length >= 2) quality = 'Good'
        else if (qualityScore >= 3) quality = 'Fair'
        else quality = 'Poor'
        break
        
      default:
        minSegments = 1
        if (qualityScore >= 6) quality = 'Good'
        else if (qualityScore >= 3) quality = 'Fair'
        else quality = 'Poor'
    }

    // Build comprehensive notes
    const notes = [
      `${segments.length} segment${segments.length === 1 ? '' : 's'} analyzed`,
      ...qualityNotes,
      qualityScore > 0 ? `Quality score: +${qualityScore}` : qualityScore < 0 ? `Quality score: ${qualityScore}` : 'Quality score: 0'
    ].join(', ')

    return {
      present: true,
      quality,
      notes
    }
  }

  private async generateSalesInsights(segments: any[], originalTranscript: string): Promise<any> {
    console.log('=== Generating Comprehensive Sales Insights ===')
    
    try {
      // Create focused sales analysis from segments
      const salesFocusedContent = segments.map(seg => 
        `[${seg.timestamp}] ${seg.speaker}: ${seg.text}`
      ).join('\n')
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a sales performance analyst. Analyze this service call for SPECIFIC sales insights and opportunities.

Extract detailed sales intelligence in this EXACT format:

OPPORTUNITIES:
- [Specific opportunity with dollar value, customer signal, and action needed]
- [Another specific opportunity...]

SUCCESSFUL_TECHNIQUES:
- [Specific successful sales technique with example and result]
- [Another successful technique...]

MISSED_OPPORTUNITIES:
- [Specific missed opportunity with what should have been done]
- [Another missed opportunity...]

BUYING_SIGNALS:
- [Customer statement showing interest/readiness to buy]
- [Another buying signal...]

OBJECTIONS_HANDLED:
- [Customer objection and how technician addressed it]
- [Another objection handling example...]

OBJECTIONS_MISSED:
- [Customer concern that wasn't properly addressed]
- [Another missed objection...]

UPSELL_MOMENTS:
- [Specific moment where additional services could be sold]
- [Another upsell opportunity...]

PRICE_DISCUSSIONS:
- [How pricing was presented and customer response]
- [Another pricing interaction...]

CUSTOMER_PAIN_POINTS:
- [Specific problems customer mentioned beyond main issue]
- [Another pain point...]

FOLLOW_UP_OPPORTUNITIES:
- [Specific follow-up actions that could generate more sales]
- [Another follow-up opportunity...]

Focus on:
- Specific dollar amounts and service opportunities
- Exact customer quotes showing buying signals
- Precise moments where sales techniques worked or failed
- Concrete recommendations for improvement
- Actual customer pain points that create sales opportunities

Be specific - include timestamps, exact quotes, and dollar values where mentioned.`
            },
            {
              role: 'user',
              content: `Analyze this service call transcript for detailed sales insights:\n\n${salesFocusedContent}`
            }
          ],
          temperature: 0.1,
          max_tokens: 2000
        })
      })

      if (!response.ok) {
        throw new Error(`Sales insights API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content?.trim()

      if (!content) {
        throw new Error('Empty response from sales insights analysis')
      }

      console.log('Generated sales insights preview:', content.substring(0, 500))

      // Parse the structured sales insights
      const lines = content.split('\n').filter(line => line.trim())
      const salesInsights: any = {
        opportunities: [],
        successful: [],
        missed: [],
        buyingSignals: [],
        objectionsHandled: [],
        objectionsMissed: [],
        upsellMoments: [],
        priceDiscussions: [],
        customerPainPoints: [],
        followUpOpportunities: []
      }

      let currentSection = ''
      
      for (const line of lines) {
        const trimmedLine = line.trim()
        
        if (trimmedLine.startsWith('OPPORTUNITIES:')) {
          currentSection = 'opportunities'
        } else if (trimmedLine.startsWith('SUCCESSFUL_TECHNIQUES:')) {
          currentSection = 'successful'
        } else if (trimmedLine.startsWith('MISSED_OPPORTUNITIES:')) {
          currentSection = 'missed'
        } else if (trimmedLine.startsWith('BUYING_SIGNALS:')) {
          currentSection = 'buyingSignals'
        } else if (trimmedLine.startsWith('OBJECTIONS_HANDLED:')) {
          currentSection = 'objectionsHandled'
        } else if (trimmedLine.startsWith('OBJECTIONS_MISSED:')) {
          currentSection = 'objectionsMissed'
        } else if (trimmedLine.startsWith('UPSELL_MOMENTS:')) {
          currentSection = 'upsellMoments'
        } else if (trimmedLine.startsWith('PRICE_DISCUSSIONS:')) {
          currentSection = 'priceDiscussions'
        } else if (trimmedLine.startsWith('CUSTOMER_PAIN_POINTS:')) {
          currentSection = 'customerPainPoints'
        } else if (trimmedLine.startsWith('FOLLOW_UP_OPPORTUNITIES:')) {
          currentSection = 'followUpOpportunities'
        } else if (trimmedLine.startsWith('- ') && currentSection) {
          const insight = trimmedLine.substring(2).trim()
          if (insight.length > 10) {
            salesInsights[currentSection].push(insight)
          }
        }
      }

      console.log('Parsed sales insights:', {
        opportunities: salesInsights.opportunities.length,
        successful: salesInsights.successful.length,
        missed: salesInsights.missed.length,
        buyingSignals: salesInsights.buyingSignals.length,
        upsellMoments: salesInsights.upsellMoments.length
      })

      return salesInsights

    } catch (error) {
      console.error('Failed to generate sales insights:', error)
      // Return fallback sales insights based on segments
      return this.generateFallbackSalesInsights(segments)
    }
  }

  private generateFallbackSalesInsights(segments: any[]): any {
    console.log('=== Generating Fallback Sales Insights ===')
    
    const opportunities: string[] = []
    const successful: string[] = []
    const missed: string[] = []
    const buyingSignals: string[] = []
    const customerPainPoints: string[] = []
    
    for (const segment of segments) {
      const text = segment.text.toLowerCase()
      const speaker = segment.speaker.toLowerCase()
      
      // Look for customer buying signals
      if (speaker.includes('customer')) {
        if (text.includes('interested') || text.includes('sounds good') || text.includes('when can') || text.includes('how much')) {
          buyingSignals.push(`${segment.timestamp}: Customer expressed interest - "${segment.text.substring(0, 100)}..."`)
        }
        
        if (text.includes('problem') || text.includes('issue') || text.includes('concern') || text.includes('worry')) {
          customerPainPoints.push(`${segment.timestamp}: Customer pain point - "${segment.text.substring(0, 100)}..."`)
        }
        
        if (text.includes('old') || text.includes('replace') || text.includes('upgrade')) {
          opportunities.push(`${segment.timestamp}: Replacement opportunity mentioned - "${segment.text.substring(0, 100)}..."`)
        }
      }
      
      // Look for technician sales moments
      if (speaker.includes('technician')) {
        if (text.includes('recommend') || text.includes('suggest') || text.includes('option')) {
          successful.push(`${segment.timestamp}: Good recommendation approach - "${segment.text.substring(0, 100)}..."`)
        }
        
        if (text.includes('price') || text.includes('cost') || text.includes('$')) {
          if (segment.stage === 'solution') {
            successful.push(`${segment.timestamp}: Clear pricing communication - "${segment.text.substring(0, 100)}..."`)
          }
        }
      }
    }
    
    // Generate missed opportunities
    const hasUpsell = segments.some(s => s.stage === 'upsell')
    const hasMaintenance = segments.some(s => s.stage === 'maintenance')
    
    if (!hasUpsell) {
      missed.push('No upselling attempts detected - missed opportunity to offer additional services')
    }
    if (!hasMaintenance) {
      missed.push('No maintenance plan discussed - missed recurring revenue opportunity')
    }
    
    return {
      opportunities: opportunities.slice(0, 10),
      successful: successful.slice(0, 10),
      missed: missed.slice(0, 10),
      buyingSignals: buyingSignals.slice(0, 10),
      objectionsHandled: [],
      objectionsMissed: [],
      upsellMoments: [],
      priceDiscussions: [],
      customerPainPoints: customerPainPoints.slice(0, 10),
      followUpOpportunities: []
    }
  }

  private combineChunkAnalyses(chunkAnalyses: CallAnalysis[], originalTranscript: string): CallAnalysis {
    if (chunkAnalyses.length === 0) {
      throw new Error('No successful chunk analyses to combine')
    }
    
    console.log(`Combining analyses from ${chunkAnalyses.length} chunks`)
    
    // Combine all segments in order
    const allSegments = chunkAnalyses.flatMap(analysis => analysis.transcript.segments)
    console.log(`Total segments combined: ${allSegments.length}`)
    console.log(`Chunks breakdown:`, chunkAnalyses.map((analysis, i) => 
      `Chunk ${i+1}: ${analysis.transcript.segments.length} segments`
    ))
    
    // Debug each chunk's segments
    chunkAnalyses.forEach((analysis, i) => {
      console.log(`Chunk ${i+1} segments:`, analysis.transcript.segments.map(s => 
        `${s.speaker}@${s.timestamp}: ${s.text.substring(0, 30)}...`
      ))
    })
    
    // Keep original timestamps from the markdown - do not overwrite
    
    // Use the most descriptive call type
    const callTypes = chunkAnalyses.map(a => a.callType).filter(t => t !== 'Service Call')
    const callType = callTypes.length > 0 ? callTypes[0] : 'Service Call'
    
    // Calculate overall score as weighted average (later chunks might have more insight)
    const totalSegments = allSegments.length
    const weightedScore = chunkAnalyses.reduce((sum, analysis, index) => {
      const weight = analysis.transcript.segments.length / totalSegments
      return sum + (analysis.overallScore * weight)
    }, 0)
    const overallScore = Math.round(weightedScore)
    
    // Intelligently combine compliance - use best evidence found
    const combinedCompliance = {
      introduction: this.combineComplianceStage(chunkAnalyses.map(a => a.compliance.introduction)),
      diagnosis: this.combineComplianceStage(chunkAnalyses.map(a => a.compliance.diagnosis)),
      solution: this.combineComplianceStage(chunkAnalyses.map(a => a.compliance.solution)),
      upsell: this.combineComplianceStage(chunkAnalyses.map(a => a.compliance.upsell)),
      maintenance: this.combineComplianceStage(chunkAnalyses.map(a => a.compliance.maintenance)),
      closing: this.combineComplianceStage(chunkAnalyses.map(a => a.compliance.closing))
    }
    
    // Combine sales insights and remove duplicates
    const allOpportunities = chunkAnalyses.flatMap(a => a.salesInsights.opportunities)
    const allSuccessful = chunkAnalyses.flatMap(a => a.salesInsights.successful)
    const allMissed = chunkAnalyses.flatMap(a => a.salesInsights.missed)
    
    const combinedSalesInsights = {
      opportunities: this.removeSimilarInsights(allOpportunities),
      successful: this.removeSimilarInsights(allSuccessful),
      missed: this.removeSimilarInsights(allMissed)
    }
    
    console.log(`Combined result:`)
    console.log(`- Call type: ${callType}`)
    console.log(`- Overall score: ${overallScore}`)
    console.log(`- Total segments: ${allSegments.length}`)
    console.log(`- Sales opportunities: ${combinedSalesInsights.opportunities.length}`)
    console.log(`- Successful techniques: ${combinedSalesInsights.successful.length}`)
    console.log(`- Missed opportunities: ${combinedSalesInsights.missed.length}`)
    
    return {
      callType: `${callType} (${allSegments.length} segments from ${chunkAnalyses.length} chunks)`,
      overallScore,
      compliance: combinedCompliance,
      salesInsights: combinedSalesInsights,
      transcript: { segments: allSegments }
    }
  }
  
  private removeSimilarInsights(insights: string[]): string[] {
    // Remove duplicates and very similar insights
    const unique: string[] = []
    
    for (const insight of insights) {
      // Skip if we already have a very similar insight
      const isSimilar = unique.some(existing => {
        const similarity = this.calculateSimilarity(insight.toLowerCase(), existing.toLowerCase())
        return similarity > 0.7 // 70% similarity threshold
      })
      
      if (!isSimilar && insight.trim().length > 10) {
        unique.push(insight)
      }
    }
    
    return unique.slice(0, 10) // Limit to top 10 insights per category
  }
  
  private calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation based on common words
    const words1 = str1.split(/\s+/)
    const words2 = str2.split(/\s+/)
    const commonWords = words1.filter(word => words2.includes(word) && word.length > 3)
    
    return commonWords.length / Math.max(words1.length, words2.length)
  }
  
  private combineComplianceStage(stages: ComplianceStage[]): ComplianceStage {
    const presentStages = stages.filter(s => s.present)
    
    if (presentStages.length === 0) {
      return stages[0] // Return first stage if none present
    }
    
    // Find the best quality among present stages
    const qualities = ['Excellent', 'Good', 'Fair', 'Poor']
    const bestQuality = qualities.find(q => 
      presentStages.some(s => s.quality === q)
    ) || 'Fair'
    
    const bestStage = presentStages.find(s => s.quality === bestQuality) || presentStages[0]
    
    return {
      present: true,
      quality: bestQuality,
      notes: `Combined analysis: ${bestStage.notes}`
    }
  }

  private async analyzeSinglePass(markdownTranscript: string): Promise<CallAnalysis> {
    console.log('=== Starting OpenAI Analysis ===')
    console.log('Transcript length:', markdownTranscript.length)
    console.log('API Key exists:', !!this.apiKey)
    console.log('API Key starts with sk-:', this.apiKey.startsWith('sk-'))
    console.log('API Key length:', this.apiKey.length)

    // TEST MODE: Return sample data to verify UI works
    if (markdownTranscript.includes('TEST_MODE') || markdownTranscript.includes('FALLBACK_MODE')) {
      console.log('TEST/FALLBACK MODE: Returning sample data')
      return {
        callType: 'Service Call - Test Mode',
        overallScore: 85,
        compliance: {
          introduction: { present: true, quality: 'Good', notes: 'Test mode: Technician properly introduced themselves and company. Good rapport building with customer.' },
          diagnosis: { present: true, quality: 'Excellent', notes: 'Test mode: Thorough diagnostic approach with systematic questioning. Technician effectively communicated findings to customer.' },
          solution: { present: true, quality: 'Good', notes: 'Test mode: Clear explanation of repair options and costs. Good use of analogies to help customer understand technical issues.' },
          upsell: { present: true, quality: 'Fair', notes: 'Test mode: Some upselling attempts made but missed several key opportunities for additional services.' },
          maintenance: { present: false, quality: 'Poor', notes: 'Test mode: No maintenance plan discussed. Missed opportunity for recurring revenue and customer retention.' },
          closing: { present: true, quality: 'Good', notes: 'Test mode: Professional conclusion with clear next steps. Payment processed smoothly with good follow-up instructions.' }
        },
        salesInsights: {
          opportunities: [
            'Customer mentioned 18-year-old furnace making loud noises and $400 heating bills. Prime replacement opportunity worth $8,000-$12,000 with energy efficiency angle.',
            'Homeowner expressed interest in financing options and asked about 0% APR. Strong buying signal suggesting ready to purchase with right terms.',
            'Customer concerned about future gas leaks and mentioned neighbor got new efficient system. Perfect opening for heat pump consultation.',
            'Mentioned wanting quieter operation and better efficiency. High-end system opportunity with premium features and extended warranties.'
          ],
          successful: [
            'Technician used car battery analogy for capacitor which customer immediately understood, leading to quick approval of $180 repair.',
            'Educational approach about California energy regulations built trust and positioned company as knowledgeable experts in the field.',
            'Offering multiple financing options removed price objections and gave customer flexibility to choose comfortable payment terms.',
            'Demonstrating noise reduction with grill upgrade created immediate tangible value customer could understand and appreciate.'
          ],
          missed: [
            'At 21:45 when customer asked about Energy Star rebates, technician could have emphasized additional $1,000-$2,000 tax credit opportunity.',
            'Customer mentioned noise concerns multiple times but technician waited too long to offer attic installation option worth additional $4,000.',
            'When discussing neighbors system, missed opportunity to offer comparative energy audit or reference visit to build confidence.',
            'Customer showed strong interest in environmental benefits but technician didn\'t leverage carbon footprint reduction as selling point.'
          ]
        },
        transcript: {
          segments: [
            {"speaker": "Technician", "timestamp": "0:00", "text": "Good morning! This is Mike from ABC Service Company. I'm here for your scheduled maintenance appointment.", "stage": "introduction", "annotation": "Excellent professional greeting with name, company, and purpose", "highlight": "success"},
            {"speaker": "Customer", "timestamp": "0:15", "text": "Hi Mike, come on in. I've been having some issues with the AC making noise.", "stage": "introduction", "annotation": "Customer immediately provides symptom information - good rapport established", "highlight": "opportunity"},
            {"speaker": "Technician", "timestamp": "0:30", "text": "I appreciate you calling us. Let me get my tools and we'll take a look. Can you tell me more about the noise?", "stage": "diagnosis", "annotation": "Good transition to diagnostic phase with follow-up questioning", "highlight": "success"},
            {"speaker": "Customer", "timestamp": "1:00", "text": "It's been making a grinding sound, especially when it first turns on. Started about a week ago.", "stage": "diagnosis", "annotation": "Customer provides specific symptom details and timeline", "highlight": "neutral"},
            {"speaker": "Technician", "timestamp": "1:15", "text": "That grinding sound could indicate a bearing issue. Let me check the unit and I'll explain what I find.", "stage": "diagnosis", "annotation": "Professional diagnosis explanation, sets expectation for findings", "highlight": "success"},
            {"speaker": "Customer", "timestamp": "5:30", "text": "How much would something like that cost to fix?", "stage": "solution", "annotation": "Customer showing cost concern - opportunity to discuss value", "highlight": "opportunity"},
            {"speaker": "Technician", "timestamp": "5:45", "text": "The motor bearing replacement would be $280 including parts and labor. I can also show you our maintenance plan.", "stage": "solution", "annotation": "Clear pricing provided, good transition to maintenance offering", "highlight": "success"},
            {"speaker": "Customer", "timestamp": "6:00", "text": "What does the maintenance plan include?", "stage": "maintenance", "annotation": "Customer expressed interest - strong buying signal", "highlight": "opportunity"},
            {"speaker": "Technician", "timestamp": "6:15", "text": "It's $120 annually and includes two tune-ups plus priority service. Would save you money long-term.", "stage": "maintenance", "annotation": "Good value proposition but could be more detailed on benefits", "highlight": "success"},
            {"speaker": "Customer", "timestamp": "7:00", "text": "Let me think about the maintenance plan, but go ahead with the repair.", "stage": "closing", "annotation": "Repair approved but maintenance plan not closed - follow-up opportunity", "highlight": "opportunity"},
            {"speaker": "Technician", "timestamp": "7:30", "text": "Perfect! I'll get started on the repair. Here's my card for when you're ready on that maintenance plan.", "stage": "closing", "annotation": "Professional close with follow-up tool provided", "highlight": "success"}
          ]
        }
      }
    }

    if (!this.apiKey || !this.apiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format. API key must start with "sk-"')
    }

    if (markdownTranscript.length < 10) {
      throw new Error('Transcript too short for analysis')
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a service call analyzer. Return ONLY a simple text format - NO JSON.

The transcript has this format:
### Exchange N: Speaker
**Time:** 202:40
Content text here

Extract the EXACT timestamps from the markdown (like 202:40, 213:20) - do NOT generate new ones.

For each exchange, return exactly this format:
SPEAKER|TIMESTAMP|TEXT|STAGE|ANNOTATION|HIGHLIGHT

Then add analysis sections:
CALLTYPE: Service Call
SCORE: 85
COMPLIANCE_INTRO: true|Good|Brief notes
COMPLIANCE_DIAG: true|Excellent|Brief notes  
COMPLIANCE_SOL: true|Good|Brief notes
COMPLIANCE_UP: false|Poor|Brief notes
COMPLIANCE_MAINT: false|Poor|Brief notes
COMPLIANCE_CLOSE: true|Good|Brief notes
OPPORTUNITIES: Opportunity 1; Opportunity 2
SUCCESSFUL: Success 1; Success 2
MISSED: Missed 1; Missed 2

Rules:
- Use | as separator for segments
- Use ; as separator for insights
- Use the EXACT timestamps from the markdown (like 202:40, 213:20)
- Process exchanges in chronological order as they appear
- Include the COMPLETE text from each exchange (don't truncate)
- Keep annotations under 6 words
- Use stages: introduction, diagnosis, solution, upsell, maintenance, closing
- Use highlights: success, opportunity, concern, neutral
- NO quotes, NO special characters
- Process EVERY exchange from the markdown in order

Return ONLY the pipe-separated format, nothing else.`
            },
            {
              role: 'user',
              content: `Analyze this service call transcript:

${markdownTranscript}`
            }
          ],
          temperature: 0.1,
          max_tokens: 4096
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        if (response.status === 401) {
          throw new Error('Invalid OpenAI API key - check your API key is correct')
        } else if (response.status === 429) {
          throw new Error('OpenAI API quota exceeded - check your billing and usage limits')
        } else {
          throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
        }
      }

      const data = await response.json()
      console.log('OpenAI API response status:', response.status)
      
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        console.error('Empty content from OpenAI. Full response:', JSON.stringify(data, null, 2))
        throw new Error('Empty response from OpenAI - check your API usage and limits')
      }

      console.log('Raw pipe-format response preview:', content.substring(0, 500))

      // Parse the pipe-separated format into proper analysis structure
      const lines = content.split('\n').filter(line => line.trim())
      const segments: any[] = []
      let callType = 'Service Call'
      let overallScore = 75
      const compliance: any = {}
      const salesInsights: any = { opportunities: [], successful: [], missed: [] }

      for (const line of lines) {
        const trimmedLine = line.trim()
        
        // Parse segment lines (contain |)
        if (trimmedLine.includes('|')) {
          const parts = trimmedLine.split('|')
          if (parts.length >= 4) {
            const segment = {
              speaker: parts[0]?.trim() || 'Unknown',
              timestamp: parts[1]?.trim() || '0:00',
              text: parts[2]?.trim() || 'No text',
              stage: parts[3]?.trim() || 'introduction',
              annotation: parts[4]?.trim() || 'Analysis note',
              highlight: parts[5]?.trim() || 'neutral'
            }
            
            // Clean up problematic characters but preserve ALL text content
            segment.text = segment.text.replace(/["\\\n\r\t]/g, ' ').trim()
            segment.annotation = segment.annotation.replace(/["\\\n\r\t]/g, ' ').substring(0, 80)
            
            // Keep complete text for full exchange display in UI
            
            segments.push(segment)
          }
        }
        // Parse analysis lines
        else if (trimmedLine.startsWith('CALLTYPE:')) {
          callType = trimmedLine.replace('CALLTYPE:', '').trim()
        }
        else if (trimmedLine.startsWith('SCORE:')) {
          overallScore = parseInt(trimmedLine.replace('SCORE:', '').trim()) || 75
        }
        else if (trimmedLine.startsWith('COMPLIANCE_')) {
          const type = trimmedLine.split(':')[0].replace('COMPLIANCE_', '').toLowerCase()
          const value = trimmedLine.split(':')[1]?.trim()
          if (value) {
            const parts = value.split('|')
            const stageMap: any = {
              'intro': 'introduction',
              'diag': 'diagnosis', 
              'sol': 'solution',
              'up': 'upsell',
              'maint': 'maintenance',
              'close': 'closing'
            }
            const stageName = stageMap[type] || type
            compliance[stageName] = {
              present: parts[0] === 'true',
              quality: parts[1] || 'Fair',
              notes: parts[2] || 'Analysis notes'
            }
          }
        }
        else if (trimmedLine.startsWith('OPPORTUNITIES:')) {
          const value = trimmedLine.replace('OPPORTUNITIES:', '').trim()
          salesInsights.opportunities = value.split(';').map(s => s.trim()).filter(s => s.length > 0)
        }
        else if (trimmedLine.startsWith('SUCCESSFUL:')) {
          const value = trimmedLine.replace('SUCCESSFUL:', '').trim()
          salesInsights.successful = value.split(';').map(s => s.trim()).filter(s => s.length > 0)
        }
        else if (trimmedLine.startsWith('MISSED:')) {
          const value = trimmedLine.replace('MISSED:', '').trim()
          salesInsights.missed = value.split(';').map(s => s.trim()).filter(s => s.length > 0)
        }
      }

      // Ensure all compliance stages exist
      const stages = ['introduction', 'diagnosis', 'solution', 'upsell', 'maintenance', 'closing']
      stages.forEach(stage => {
        if (!compliance[stage]) {
          compliance[stage] = { present: false, quality: 'Poor', notes: 'Not assessed' }
        }
      })

      // Generate comprehensive sales insights for single-pass analysis
      const enhancedSalesInsights = await this.generateSalesInsights(segments, markdownTranscript)

      // Generate detailed compliance summaries that answer specific questions
      const complianceSummaries = await this.generateDetailedComplianceSummaries(segments, markdownTranscript)

      // Generate comprehensive detailed recommendations
      const detailedRecommendations = await this.generateDetailedRecommendations(segments, markdownTranscript, compliance, enhancedSalesInsights)

      // Generate AI-powered compliance score based on compliance check results
      const aiGeneratedScore = await this.generateComplianceScore(compliance, segments)

      const analysis = {
        callType,
        overallScore: aiGeneratedScore,
        compliance,
        complianceSummaries,
        detailedRecommendations,
        salesInsights: enhancedSalesInsights,
        transcript: { segments }
      }

      console.log('✅ Pipe-format parsing successful!')
      console.log('Segments:', analysis.transcript.segments.length)
      console.log('Overall score:', analysis.overallScore)

      return analysis

    } catch (error) {
      console.error('=== OpenAI Analysis Error ===')
      console.error('Error type:', typeof error)
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
      console.error('API Key provided:', !!this.apiKey)
      console.error('API Key starts with sk-:', this.apiKey.startsWith('sk-'))
      console.error('Transcript length:', markdownTranscript.length)
      console.error('=== End Error Details ===')
      
      // Use fallback extraction as last resort - single pass means chunk 0 of 1
      console.log('=== USING FALLBACK EXTRACTION ===')
      const fallbackSegments = this.extractSegmentsFallback(markdownTranscript, 0, 1)
      
      // Attempt quality-based compliance assessment even in fallback mode
      const stages = ['introduction', 'diagnosis', 'solution', 'upsell', 'maintenance', 'closing']
      const fallbackCompliance: any = {}
      
      for (const stage of stages) {
        const stageSegments = fallbackSegments.filter(s => s.stage === stage)
        if (stageSegments.length > 0) {
          fallbackCompliance[stage] = this.assessStageQuality(stageSegments, stage)
        } else {
          fallbackCompliance[stage] = {
            present: false,
            quality: 'Poor',
            notes: `No ${stage} activities detected in fallback analysis`
          }
        }
      }
      
      // Calculate fallback score based on compliance assessment
      const fallbackScore = this.calculateFallbackScore(fallbackCompliance)
      
      return {
        callType: 'Service Call - Fallback Analysis',
        overallScore: fallbackScore,
        compliance: fallbackCompliance,
        complianceSummaries: {
          introduction: 'Fallback analysis: Basic introduction elements detected but detailed assessment unavailable.',
          diagnosis: 'Fallback analysis: Diagnostic conversation identified but comprehensive evaluation not possible.',
          solution: 'Fallback analysis: Solution discussion found but detailed compliance review unavailable.',
          upsell: 'Fallback analysis: Limited upselling activity detected but thorough assessment not available.',
          maintenance: 'Fallback analysis: Maintenance discussion identified but detailed evaluation not possible.',
          closing: 'Fallback analysis: Closing statements found but comprehensive assessment unavailable.'
        },
        detailedRecommendations: {
          compliance: [
            { priority: 'high', text: 'Full AI analysis unavailable - manual review recommended for comprehensive compliance assessment' }
          ],
          salesTraining: [
            { priority: 'medium', text: 'Basic conversation structure maintained - detailed sales training recommendations require full analysis' }
          ],
          communication: [
            { priority: 'medium', text: 'Communication patterns identified but specific improvement recommendations need detailed AI analysis' }
          ],
          processOptimization: [
            { priority: 'low', text: 'Process review suggested when full analysis capabilities are restored' }
          ],
          coachingPriorities: [
            { priority: 'high', text: 'Manual coaching assessment recommended due to limited automated analysis capabilities' }
          ]
        },
        salesInsights: {
          opportunities: [`Processed ${fallbackSegments.length} conversation segments for basic analysis`],
          successful: ['Fallback processing maintained conversation structure'],
          missed: ['Full AI analysis unavailable - detailed insights not generated']
        },
        transcript: { segments: fallbackSegments }
      }
    }
  }
}
