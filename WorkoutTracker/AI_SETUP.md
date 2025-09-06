# AI Trainer Setup Guide

## Environment Variables Required

Add these environment variables to your `.env` file in the root of the WorkoutTracker directory:

```bash
# OpenAI API Key for GPT-4o mini integration
# Get your API key from: https://platform.openai.com/api-keys
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
```

## Setup Steps

1. **Get OpenAI API Key**
   - Visit [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create an account or log in
   - Generate a new API key
   - Add billing information (GPT-4o mini is very cost-effective)

2. **Add to Environment**
   ```bash
   # Create .env file in WorkoutTracker directory
   echo "EXPO_PUBLIC_OPENAI_API_KEY=sk-your-key-here" >> .env
   ```

3. **Restart Development Server**
   ```bash
   npm start
   ```

## Features Implemented

- ✅ Natural conversation with GPT-4o mini
- ✅ Workout plan intent detection
- ✅ Interactive information gathering with quick replies
- ✅ State machine for conversation flow
- ✅ Fallback plan generation if AI fails
- ✅ Production-ready error handling
- ✅ Database integration for conversation persistence

## Usage

1. Navigate to the AI tab (middle tab)
2. Ask for workout advice or request a plan
3. Follow the guided flow for plan creation
4. Plans are automatically saved to calendar

## Cost Information

GPT-4o mini is extremely cost-effective:
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens
- Typical conversation costs ~$0.01-0.05
