# Gemini API Integration Troubleshooting Guide

## Issues Fixed

1. **Enhanced API Key Validation**: Added format validation for Google AI Studio API keys
2. **Improved Error Messages**: More specific error messages for different failure types
3. **API Key Testing**: Added "Test" button to verify API connectivity before full analysis
4. **Better Debug Information**: Enhanced debugging with specific suggestions for each error type
5. **Fallback Analysis Clarity**: Made it clear when fallback analysis is being used due to AI failure

## Common Issues and Solutions

### "Gemini API error: Check your API key and quota"

**Possible Causes:**
- Invalid API key format
- Expired or disabled API key
- Exceeded quota/billing limits
- Network connectivity issues

**Solutions:**
1. **Verify API Key Format**: Ensure your API key starts with "AIza" and is complete
2. **Test API Key**: Use the new "Test" button to verify connectivity
3. **Check Google AI Studio**: Visit https://aistudio.google.com/ to verify:
   - Your API key is active
   - Billing is set up correctly
   - Usage limits haven't been exceeded

### "Invalid Gemini API key format"

**Solution:**
- Double-check that you copied the complete API key from Google AI Studio
- API keys should be 39+ characters starting with "AIzaSy"

### "Gemini API quota exceeded"

**Solution:**
- Check your usage dashboard at Google AI Studio
- Verify billing settings are configured
- Wait for quota reset or upgrade your plan

### "Network error accessing Gemini API"

**Solution:**
- Check your internet connection
- Try again in a few moments
- Ensure the domain isn't blocked by firewall/proxy

## Testing Your Setup

1. **Use the Test Button**: Before running full analysis, use the "Test" button next to the API key field
2. **Start with Demo**: Use the "Test AI Analysis (Demo)" button to verify the system works
3. **Check Debug Tab**: If issues persist, check the Debug tab for detailed error information

## Fallback Options

If Gemini continues to fail:
1. **Use Spark AI**: Uncheck "Use Gemini AI" to fall back to Spark's built-in analysis
2. **Manual Review**: The system will provide basic transcript parsing even if AI analysis fails

## API Key Setup Instructions

1. Go to https://aistudio.google.com/
2. Sign in with your Google account
3. Create a new API key
4. Copy the complete key (starts with "AIzaSy...")
5. Paste into the app and click "Test" to verify

The system now provides much better error messages and debugging information to help identify and resolve API issues quickly.