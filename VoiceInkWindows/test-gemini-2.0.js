#!/usr/bin/env node
/**
 * Test script for Gemini 2.0 Flash integration
 * Tests real transcription with the updated model
 */

const { GoogleGenerativeAI } = require('@google/generative-ai')
const fs = require('fs')
const path = require('path')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

async function testGeminiTranscription() {
  console.log(`${colors.cyan}🚀 Testing Gemini 2.0 Flash Model Integration${colors.reset}\n`)
  
  // Check for API key
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.log(`${colors.red}❌ GEMINI_API_KEY environment variable not set${colors.reset}`)
    console.log(`${colors.yellow}Please set your API key:${colors.reset}`)
    console.log('  export GEMINI_API_KEY="your-api-key-here"')
    process.exit(1)
  }
  
  try {
    // Initialize Gemini AI
    console.log(`${colors.blue}📡 Initializing Gemini AI...${colors.reset}`)
    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Test Gemini 2.0 Flash Experimental model
    console.log(`${colors.blue}🔧 Loading Gemini 2.0 Flash Experimental model...${colors.reset}`)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
      }
    })
    
    // Test basic text generation to verify model works
    console.log(`${colors.blue}📝 Testing text generation...${colors.reset}`)
    const textPrompt = 'Generate a simple JSON object with a greeting message.'
    const textResult = await model.generateContent(textPrompt)
    const textResponse = await textResult.response
    console.log(`${colors.green}✅ Text generation successful:${colors.reset}`)
    console.log(textResponse.text().substring(0, 200) + '...\n')
    
    // Create a test audio prompt
    console.log(`${colors.blue}🎤 Preparing audio transcription prompt...${colors.reset}`)
    const audioPrompt = `Please transcribe this audio file with the following requirements:
- Provide an accurate transcription of all spoken words
- Include timestamps in format [MM:SS] at the start of each segment
- Detect the language automatically
- Include confidence scores if uncertain about any sections
- Format the output as structured JSON with text, segments, and metadata

Output format:
\`\`\`json
{
  "text": "Full transcription text",
  "language": "detected language",
  "segments": [
    {
      "text": "Segment text",
      "startTime": 0,
      "endTime": 10,
      "confidence": 0.95
    }
  ],
  "duration": "total duration in seconds",
  "confidence": "overall confidence 0-1"
}
\`\`\``
    
    // Check if a test audio file exists
    const testAudioPath = path.join(__dirname, 'test-audio.wav')
    if (fs.existsSync(testAudioPath)) {
      console.log(`${colors.blue}🎵 Found test audio file, attempting transcription...${colors.reset}`)
      
      const audioBuffer = fs.readFileSync(testAudioPath)
      const audioPart = {
        inlineData: {
          mimeType: 'audio/wav',
          data: audioBuffer.toString('base64')
        }
      }
      
      const audioResult = await model.generateContent([audioPrompt, audioPart])
      const audioResponse = await audioResult.response
      console.log(`${colors.green}✅ Audio transcription successful:${colors.reset}`)
      console.log(audioResponse.text().substring(0, 500) + '...\n')
    } else {
      console.log(`${colors.yellow}⚠️ No test audio file found at ${testAudioPath}${colors.reset}`)
      console.log('Create a test-audio.wav file to test audio transcription\n')
    }
    
    // Test model switching capability
    console.log(`${colors.blue}🔄 Testing model switching to Gemini 1.5 Pro...${colors.reset}`)
    const proModel = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 8192,
      }
    })
    
    const proResult = await proModel.generateContent('Say "Hello from Gemini 1.5 Pro"')
    const proResponse = await proResult.response
    console.log(`${colors.green}✅ Gemini 1.5 Pro works:${colors.reset} ${proResponse.text()}\n`)
    
    // Summary
    console.log(`${colors.green}${'='.repeat(60)}${colors.reset}`)
    console.log(`${colors.green}✨ All tests passed successfully!${colors.reset}`)
    console.log(`${colors.cyan}Available models:${colors.reset}`)
    console.log('  • gemini-2.0-flash-exp (Fast, efficient)')
    console.log('  • gemini-1.5-pro (More capable, slower)')
    console.log(`${colors.green}${'='.repeat(60)}${colors.reset}`)
    
  } catch (error) {
    console.error(`${colors.red}❌ Test failed:${colors.reset}`, error.message)
    
    if (error.message.includes('API key')) {
      console.log(`${colors.yellow}Check your API key is valid and has access to Gemini models${colors.reset}`)
    } else if (error.message.includes('model')) {
      console.log(`${colors.yellow}The model might not be available in your region or with your API key${colors.reset}`)
    }
    
    process.exit(1)
  }
}

// Run the test
testGeminiTranscription()