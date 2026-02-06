# Gemini API Documentation


This is our Gemini AI integration for the academic progress tracker. It allows our app to use Google's Gemini AI to generate text responses.

## Setup

**The API key is already configured** You don't need to do anything with API keys unless you want to run the project locally on your computer.

### To run locally (optional):

1. Ask the team for the API key
2. Create a `.env.local` file in the project root
3. Add: `GEMINI_API_KEY=the_key_you_received`
4. Run `npm install`
5. Run `npm run dev`

### Using the deployed app:

Just use the live app - no setup needed! The API key is already configured on the server.

## How to use the API in code

**Check if it's running:**
- Open: `http://localhost:3000/api/gemini` (locally)
- You should see: `{"status":"Gemini API endpoint is running"}`

**Send a prompt to Gemini:**
```javascript
const response = await fetch('/api/gemini', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'Explain this topic in simple terms: Photosynthesis'
  }),
});

const data = await response.json();
console.log(data.text); // Gemini's response
```

## Request Format

Send a POST request with:
```json
{
  "prompt": "Your question or instruction here"
}
```

## Response Format

**Success:**
```json
{
  "success": true,
  "text": "Gemini's AI-generated response",
  "model": "gemini-pro"
}
```

**Error:**
```json
{
  "error": "Error message",
  "details": "More details about what went wrong"
}
```

## Example Use Cases for Our Project

- Generate study tips
- Explain difficult concepts
- Summarize course content
- Answer student questions
- Create practice questions

## Important Notes

- The API is ready to use - no configuration needed for most team members
- Don't share the API key publicly online or GitHub  
- If you need the key for local development, contact the team lead

## Troubleshooting

**Problem: "Gemini API key is not configured"**
- If testing locally: Make sure you have `.env.local` with the API key
- Restart the dev server after creating `.env.local`

## Created By

Okoh Perfection - 19, November 2025
