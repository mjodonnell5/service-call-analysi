# Service Call Analysis Dashboard - Product Requirements Document

## Core Purpose & Success
- **Mission Statement**: Analyze service call recordings to evaluate technician performance, ensure compliance with procedures, and identify sales opportunities using AI-powered transcription and analysis.
- **Success Indicators**: 
  - Accurate stage categorization (>90% of segments properly classified)
  - Meaningful compliance assessment across all 6 call stages
  - Actionable sales insights and missed opportunity identification
  - Clear, readable analysis reports for managers and trainers
- **Experience Qualities**: Professional, Insightful, Reliable

## Project Classification & Approach
- **Complexity Level**: Complex Application (advanced AI integration, multi-stage analysis, production transcription)
- **Primary User Activity**: Analyzing (reviewing call performance) and Acting (implementing training improvements)

## Core Problem Analysis
Service companies need to evaluate technician performance on customer calls to:
1. **Ensure Compliance**: Verify technicians follow standard procedures (introduction, diagnosis, solution explanation, upsell attempts, maintenance offers, professional closing)
2. **Identify Sales Opportunities**: Find missed upsell chances and successful sales techniques
3. **Improve Training**: Provide specific feedback on communication and sales performance
4. **Standardize Service**: Maintain consistent customer experience across all technicians

## Essential Features

### 1. Production Transcription Integration
- **Functionality**: Real-time transcription using AssemblyAI with speaker identification
- **Purpose**: Convert audio recordings to text with speaker diarization for accurate analysis
- **Success Criteria**: Clear speaker separation, accurate text transcription, handles various audio qualities

### 2. AI-Powered Stage Analysis
- **Functionality**: Automatically categorize conversation segments into 6 stages (introduction, diagnosis, solution, upsell, maintenance, closing)
- **Purpose**: Structure analysis around standard service call procedures
- **Success Criteria**: Proper distribution across all stages, logical conversation flow, minimal empty stages

### 3. Compliance Assessment
- **Functionality**: Evaluate quality and presence of each required call stage
- **Purpose**: Ensure technicians follow company procedures and best practices
- **Success Criteria**: Actionable feedback, quality ratings (Poor/Fair/Good/Excellent), specific improvement notes

### 4. Sales Opportunity Analysis
- **Functionality**: Identify successful sales techniques, missed opportunities, and customer buying signals
- **Purpose**: Maximize revenue per service call through better sales training
- **Success Criteria**: Specific, actionable insights tied to actual conversation content

### 5. Debug and Quality Assurance
- **Functionality**: Comprehensive debugging panel showing stage distribution, segment analysis, and AI processing details
- **Purpose**: Ensure analysis accuracy and provide transparency into AI decision-making
- **Success Criteria**: Clear identification of analysis issues, exportable debug data, stage distribution validation

## Design Direction

### Visual Tone & Identity
- **Emotional Response**: Confidence in analysis accuracy, clarity in complex data presentation
- **Design Personality**: Professional business tool with clear information hierarchy
- **Visual Metaphors**: Dashboard-style layout reflecting analytical nature, cards for different data views
- **Simplicity Spectrum**: Clean, organized interface that doesn't overwhelm with data

### Color Strategy
- **Color Scheme Type**: Professional business palette with semantic color coding
- **Primary Color**: Deep blue (oklch(0.45 0.15 220)) - conveys trust and professionalism
- **Secondary Colors**: Clean grays for backgrounds and text
- **Accent Color**: Warm orange (oklch(0.65 0.15 40)) - highlights important insights and opportunities
- **Color Psychology**: 
  - Blue: Trust, professionalism, reliability
  - Green: Success, compliance, positive outcomes
  - Red: Issues, missed opportunities, urgent attention
  - Orange: Insights, opportunities, actionable items
- **Color Accessibility**: All text combinations meet WCAG AA standards (4.5:1 contrast ratio)

### Typography System
- **Font Pairing Strategy**: Single font family (Inter) with weight variations for hierarchy
- **Typographic Hierarchy**: Clear distinction between headings (font-bold), body text (font-normal), and metadata (text-muted-foreground)
- **Font Personality**: Clean, readable, professional - avoids decorative elements that distract from data
- **Readability Focus**: Generous line spacing, appropriate font sizes for data-heavy content
- **Which fonts**: Inter (Google Fonts) - excellent for data display and professional interfaces
- **Legibility Check**: Inter is highly legible at all sizes and weights used

### Visual Hierarchy & Layout
- **Attention Direction**: Summary cards at top, detailed analysis in tabbed sections below
- **White Space Philosophy**: Generous spacing between data sections to avoid cognitive overload
- **Grid System**: Card-based layout with consistent spacing and alignment
- **Responsive Approach**: Stacked cards on mobile, side-by-side on desktop
- **Content Density**: Balanced between comprehensive data and visual clarity

### UI Elements & Component Selection
- **Component Usage**: 
  - Cards for data grouping and visual separation
  - Tabs for organizing different analysis views
  - Badges for status indicators (compliance quality, stage labels)
  - Progress bars for scores and completion indicators
  - Alerts for errors and important messages
- **Component Customization**: Semantic color variants for badges (success/warning/destructive)
- **Component States**: Clear hover and focus states for interactive elements
- **Icon Selection**: Phosphor icons for consistency and professional appearance
- **Mobile Adaptation**: Tab navigation remains accessible, cards stack vertically

## Implementation Considerations

### AI Analysis Pipeline
1. **Transcription**: AssemblyAI handles audio-to-text with speaker diarization
2. **Segmentation**: GPT-4o analyzes transcript and creates speaker segments with stage classification
3. **Compliance Analysis**: Second AI pass evaluates each stage for quality and presence
4. **Sales Analysis**: Third AI pass identifies opportunities and successful techniques
5. **Overall Assessment**: Final AI pass generates summary scores and call type identification

### Quality Assurance
- **Validation**: Multiple layers of validation for AI responses
- **Fallback Systems**: Rule-based analysis when AI fails
- **Debug Tools**: Comprehensive debugging panel for analysis transparency
- **Error Handling**: Graceful degradation with meaningful error messages

### Scalability Needs
- **Data Persistence**: Client-side storage for analysis results and configuration
- **Performance**: Efficient AI usage with proper caching
- **Extensibility**: Modular design allows for additional analysis types

## Edge Cases & Problem Scenarios
- **Poor Audio Quality**: Transcription service handles with confidence scoring
- **Unusual Call Structures**: Fallback analysis ensures coverage of all conversation types
- **AI Service Failures**: Comprehensive fallback systems maintain functionality
- **Empty Stages**: Debug panel identifies and explains stage distribution issues

## Reflection
This approach uniquely combines production-quality transcription with multi-stage AI analysis to provide actionable insights into service call performance. The debug panel ensures transparency and trust in the AI analysis, while the structured approach to compliance and sales evaluation provides specific, implementable feedback for service improvement.