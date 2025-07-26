# Service Call Analysis Dashboard

A professional web application for analyzing service call recordings to evaluate technician performance and identify sales opportunities.

**Experience Qualities**: 
1. **Professional** - Clean, business-appropriate interface that instills confidence in the analysis quality
2. **Analytical** - Clear data presentation with structured insights that highlight key findings immediately  
3. **Accessible** - Easy navigation between transcript segments and analysis with intuitive visual hierarchy

**Complexity Level**: Light Application (multiple features with basic state)
- Combines transcript display, compliance checking, and sales analysis in a cohesive dashboard without requiring complex user accounts or backend systems

## Essential Features

### Audio Upload & Transcription
- **Functionality**: Upload audio files and generate transcripts using AI transcription services
- **Purpose**: Convert voice recordings to analyzable text format for detailed review
- **Trigger**: User clicks upload button and selects audio file
- **Progression**: File selection → Upload progress → Transcription processing → Transcript display → Analysis generation
- **Success criteria**: Clear transcript with speaker identification and timestamps

### Compliance Analysis
- **Functionality**: Automatically evaluate transcript against standard service call procedures (Introduction, Diagnosis, Solution, Upsell, Maintenance, Closing)
- **Purpose**: Ensure technicians follow company protocols and identify training opportunities
- **Trigger**: Transcript completion automatically initiates analysis
- **Progression**: Transcript analysis → Stage identification → Compliance scoring → Recommendations display
- **Success criteria**: Clear pass/fail indicators for each stage with specific feedback

### Sales Opportunity Detection
- **Functionality**: Identify missed sales opportunities, successful upsells, and customer buying signals
- **Purpose**: Help managers understand revenue optimization potential and coach technicians
- **Trigger**: Runs alongside compliance analysis
- **Progression**: Conversation analysis → Signal detection → Opportunity categorization → Actionable insights
- **Success criteria**: Specific examples of opportunities with recommended actions

### Segmented Transcript Display
- **Functionality**: Break transcript into logical sections (Introduction, Diagnosis, etc.) with analysis annotations
- **Purpose**: Make long conversations easily reviewable and connect analysis to specific moments
- **Trigger**: User navigates through transcript sections
- **Progression**: Section selection → Highlighted transcript → Relevant analysis → Navigation to next section
- **Success criteria**: Easy jumping between sections with clear visual indicators

## Edge Case Handling
- **Poor Audio Quality**: Display confidence scores and highlight uncertain transcriptions
- **Multiple Speakers**: Clear speaker identification with consistent labeling throughout
- **Long Silences**: Handle gaps appropriately without breaking transcript flow
- **Technical Jargon**: Maintain accuracy for industry-specific terminology
- **No Clear Stages**: Gracefully handle calls that don't follow standard procedures

## Design Direction
The design should feel authoritative and data-driven like a business intelligence dashboard - clean lines, plenty of white space, and information hierarchy that guides users through complex analysis efficiently.

## Color Selection
Complementary (opposite colors) - Using professional blue and warm orange to create clear distinction between transcript content and analysis insights while maintaining readability.

- **Primary Color**: Deep Professional Blue (oklch(0.45 0.15 220)) - Conveys trust and reliability for business analysis
- **Secondary Colors**: Neutral Grays (oklch(0.95 0 0), oklch(0.85 0 0)) - Clean backgrounds that don't compete with content
- **Accent Color**: Warm Orange (oklch(0.65 0.15 40)) - Highlights important findings and call-to-actions
- **Foreground/Background Pairings**: 
  - Background White (oklch(1 0 0)): Dark Gray text (oklch(0.2 0 0)) - Ratio 16:1 ✓
  - Primary Blue (oklch(0.45 0.15 220)): White text (oklch(1 0 0)) - Ratio 9.2:1 ✓
  - Secondary Gray (oklch(0.95 0 0)): Dark Gray text (oklch(0.2 0 0)) - Ratio 15.1:1 ✓
  - Accent Orange (oklch(0.65 0.15 40)): White text (oklch(1 0 0)) - Ratio 5.8:1 ✓

## Font Selection
Typography should convey analytical precision and professional credibility, using Inter for its excellent readability in data-heavy interfaces.

- **Typographic Hierarchy**: 
  - H1 (Dashboard Title): Inter Bold/32px/tight letter spacing
  - H2 (Section Headers): Inter Semibold/24px/normal spacing  
  - H3 (Analysis Categories): Inter Medium/18px/normal spacing
  - Body (Transcript): Inter Regular/16px/relaxed line height
  - Small (Timestamps/Metadata): Inter Regular/14px/normal spacing

## Animations
Subtle transitions that enhance usability without distracting from analytical content - smooth section transitions and gentle loading states that maintain professional atmosphere.

- **Purposeful Meaning**: Smooth transitions between transcript sections communicate continuity while micro-animations on analysis updates show real-time processing
- **Hierarchy of Movement**: File upload progress and section navigation deserve primary animation focus, with subtle hover states on interactive elements

## Component Selection
- **Components**: Card components for analysis sections, Tabs for transcript segments, Badge components for compliance indicators, Progress bars for scoring, Accordion for detailed findings, Alert components for important insights
- **Customizations**: Custom transcript timeline component, specialized compliance scorecard, sales opportunity highlight system
- **States**: Upload buttons (idle/loading/complete), analysis cards (loading/complete/error), compliance badges (pass/fail/partial), section tabs (active/visited/unvisited)
- **Icon Selection**: Upload (CloudArrowUp), Analysis (ChartBar), Compliance (CheckCircle/XCircle), Sales (TrendingUp), Navigation (ChevronLeft/Right)
- **Spacing**: Consistent 4-unit spacing system (16px base) with generous whitespace around analysis blocks
- **Mobile**: Stacked layout with collapsible sections, touch-friendly tab navigation, simplified compliance cards for narrow screens