# Service Call Analysis Dashboard

A sophisticated web application for analyzing service call recordings to evaluate technician performance and identify sales opportunities.

## Features

### 🎯 Core Analysis
- **AI-Powered Transcription**: Converts audio/video recordings to text with speaker identification
- **Compliance Evaluation**: Checks adherence to standard service call procedures
- **Sales Opportunity Detection**: Identifies missed opportunities and successful sales actions
- **Performance Scoring**: Provides comprehensive performance metrics

### 📋 Compliance Checking
- **Introduction**: Proper greeting and identification
- **Problem Diagnosis**: Quality of problem investigation
- **Solution Explanation**: Clarity of solution presentation
- **Upselling Attempts**: Identification of additional sales efforts
- **Maintenance Plan Offers**: Long-term service agreement offerings
- **Professional Closing**: Courteous call conclusion

### 💼 Sales Insights
- **Opportunities Identified**: Potential sales moments in the conversation
- **Successful Actions**: Well-executed sales techniques
- **Missed Opportunities**: Areas where sales could have been improved

## Getting Started

### Demo Mode (No Setup Required)
1. Click "Test AI Analysis (Demo)" to see the system in action
2. Upload any audio/video file to get mock analysis results
3. Perfect for evaluation and testing

### Production Mode (Real Transcription)
1. Click "Setup Real Transcription" 
2. Choose a transcription provider:
   - **AssemblyAI** (Recommended): Best for service calls with speaker identification
   - **OpenAI Whisper**: Fast processing, multiple language support
3. Get your API key and configure the service
4. Upload real audio files for production analysis

## Supported File Formats

### Audio Files
- MP3, WAV, M4A, FLAC, OGG
- Maximum size: 100MB (AssemblyAI) / 25MB (OpenAI)

### Video Files  
- MP4, MOV, AVI, MKV
- Audio track will be extracted for transcription

## API Configuration

### AssemblyAI (Recommended)
- **Free Credits**: $50 (~185 hours of audio)
- **Features**: Speaker diarization, high accuracy, punctuation
- **Best For**: Service calls with multiple speakers
- **Setup**: Sign up at https://www.assemblyai.com/

### OpenAI Whisper
- **Pricing**: $0.006 per minute
- **Features**: High accuracy, fast processing, 99 languages
- **Best For**: Quick transcription needs
- **Setup**: Get API key from https://platform.openai.com/

## Privacy & Security

- **Local Storage**: API keys stored only in your browser
- **Direct Communication**: Your keys only communicate with chosen provider
- **No Data Sharing**: Recordings are not stored on our servers
- **Secure Processing**: All transcription happens via encrypted connections

## Analysis Output

### Performance Metrics
- Overall call score (0-100%)
- Stage-by-stage compliance evaluation
- Quality ratings: Poor, Fair, Good, Excellent

### Detailed Insights
- Segmented transcript with speaker identification
- Time-stamped conversation analysis  
- Specific coaching recommendations
- Sales opportunity breakdowns

### Visual Dashboard
- Interactive transcript viewer
- Compliance checklist with status indicators
- Sales insights categorization
- Exportable analysis reports

## Best Practices

### For Service Calls
- Clear audio quality improves transcription accuracy
- Multiple speakers should be clearly distinguishable
- Background noise should be minimized
- Call duration: 5-60 minutes for optimal analysis

### For Analysis Quality
- Review transcription accuracy before trusting analysis
- Use consistent naming conventions for technicians
- Ensure calls follow your standard procedures
- Regular analysis helps identify training needs

## Troubleshooting

### Transcription Issues
- **"Empty transcript"**: Check audio quality and file format
- **"API key invalid"**: Verify key format and provider selection
- **"File too large"**: Compress audio or use shorter clips
- **"Processing timeout"**: Very long files may need splitting

### Analysis Errors
- **"AI analysis failed"**: Try the demo mode to verify system functionality
- **"Invalid JSON"**: Temporary AI service issue - retry in a few moments
- **Poor analysis quality**: Ensure clear audio with distinguishable speakers

## Support & Resources

### Documentation
- Provider-specific setup guides included in configuration panel
- Real-time error messages with troubleshooting tips
- Comprehensive technical details in error reports

### Getting Help
- Check browser console for detailed error information
- Test with demo mode to isolate configuration issues
- Verify API key permissions and credit availability

---

*This tool is designed for professional service organizations to improve call quality and identify growth opportunities. All processing respects data privacy and security best practices.*