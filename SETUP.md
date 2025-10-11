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

### OpenAI API Key (Required for AI Features)

To enable AI-powered itinerary generation, you need to configure an OpenAI API key.

#### Step 1: Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy the generated API key (you won't be able to see it again!)

#### Step 2: Configure the API Key Locally

For local development, add your API key to the `.env` file:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

#### Step 3: Configure the API Key in Supabase Edge Functions

The OpenAI API key is used in the server-side Edge Function, so it needs to be configured in Supabase:

**Note:** Supabase Edge Functions automatically have access to environment variables configured in your Supabase project. The secrets are managed server-side and are never exposed to the client.

**To configure secrets in Supabase:**
1. The `OPENAI_API_KEY` will be automatically available in your Edge Function via `Deno.env.get('OPENAI_API_KEY')`
2. Secrets are managed securely and are not exposed in client-side code

## Security Best Practices

1. **Never commit your `.env` file to version control**
   - The `.env` file is already in `.gitignore`
   - Use `.env.example` as a template for other developers

2. **Never expose API keys in client-side code**
   - The OpenAI API key is only used in the Edge Function (server-side)
   - Client-side code only communicates with your Edge Function

3. **Rotate your API keys regularly**
   - If you suspect a key has been compromised, regenerate it immediately

4. **Monitor your API usage**
   - Keep track of your OpenAI API usage to avoid unexpected charges
   - Set up usage limits in your OpenAI dashboard

## File Structure

```
.env                # Your actual environment variables (not committed)
.env.example        # Template for environment variables (committed)
.gitignore          # Ensures .env is not committed
```

## Testing the Setup

1. Fill out the form in the application
2. Submit the form
3. Check the browser console for logs
4. Currently, the app returns a mock response
5. Once the OpenAI API key is configured, the edge function can be updated to use the actual API

## Troubleshooting

### "OpenAI API key not configured" warning
- This is expected until you add a real API key
- The application will continue to work with mock data

### API key not working
- Verify the key is correct and hasn't been revoked
- Check that you have credits available in your OpenAI account
- Review the Edge Function logs in your Supabase dashboard
