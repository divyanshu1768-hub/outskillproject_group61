# Environment Setup Guide

This guide explains how to configure your environment variables for the Road Trip Planner application.

## Environment Variables Overview

The application uses environment variables to manage configuration securely. These are stored in the `.env` file at the root of the project.

### Supabase Configuration (Pre-configured)

These variables are automatically configured by the platform and should not be changed:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Google Gemini API Key (Required for Roady Features)

To enable Roady-powered itinerary generation, you need to configure a Google Gemini API key.

#### Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API key"
4. Select an existing Google Cloud project or create a new one
5. Copy the generated API key (keep it secure!)

**Note:** Gemini API has a generous free tier that includes:
- 15 requests per minute
- 1 million tokens per minute
- 1,500 requests per day

#### Step 2: Configure the API Key

Open the `.env` file in the project root and replace the placeholder:

```env
GEMINI_API_KEY=your_actual_api_key_here
```

For example:
```env
GEMINI_API_KEY=AIzaSyC1234567890abcdefghijklmnopqrstuv
```

#### Step 3: Verify the Setup

The Gemini API key is used in the server-side Edge Function, so it's automatically available via `Deno.env.get('GEMINI_API_KEY')`. Once configured:

1. Fill out the trip planning form in the application
2. Submit the form
3. Roady will generate a personalized itinerary
4. Check the browser console if you encounter any issues

## Security Best Practices

1. **Never commit your `.env` file to version control**
   - The `.env` file is already in `.gitignore`
   - Use `.env.example` as a template for other developers

2. **Never expose API keys in client-side code**
   - The Gemini API key is only used in the Edge Function (server-side)
   - Client-side code only communicates with your Edge Function

3. **Rotate your API keys regularly**
   - If you suspect a key has been compromised, regenerate it immediately in Google AI Studio

4. **Monitor your API usage**
   - Keep track of your Gemini API usage in the Google Cloud Console
   - Set up usage alerts to avoid exceeding quotas

## File Structure

```
.env                # Your actual environment variables (not committed)
.env.example        # Template for environment variables (committed)
.gitignore          # Ensures .env is not committed
```

## Testing the Setup

1. Ensure your `.env` file has the Gemini API key configured
2. Fill out the trip planning form:
   - Departure city
   - Destination city
   - Number of days
   - Number of people
   - Total budget
   - Interests
3. Click "Plan My Trip"
4. Roady should generate a detailed itinerary within a few seconds

## Troubleshooting

### "Gemini API key not configured" warning
- Check that your `.env` file exists in the project root
- Verify the API key is correctly set: `GEMINI_API_KEY=your_key`
- The application will use mock data until a valid key is configured

### API key not working
- Verify the key is correct and hasn't been revoked
- Check that you haven't exceeded the free tier limits
- Review the Edge Function logs in your Supabase dashboard
- Ensure you've enabled the Generative Language API in Google Cloud Console

### "Rate limit exceeded" error
- Gemini free tier has limits: 15 requests/minute, 1,500 requests/day
- Wait a few minutes before trying again
- Consider upgrading to a paid plan for higher limits

## Additional Resources

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Gemini API Pricing](https://ai.google.dev/pricing)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
