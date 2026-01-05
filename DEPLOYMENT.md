# 🚀 Render Deployment Checklist

## ⚠️ SECURITY WARNING
**IMPORTANT**: Your `.env` file contains real API keys that are currently committed to your repository. This is a security risk!

### Immediate Actions Required:
1. **Replace API keys** in `.env` with your own keys from the services
2. **Never commit real API keys** to version control
3. **Use environment variables** in Render dashboard instead

### How to Fix:
1. Get new API keys from the services
2. Update your `.env` file with new keys
3. Set the same keys as environment variables in Render

---

## Prerequisites
- [ ] GitHub repository connected to Render
- [ ] API keys obtained from services

## API Keys Required
- [ ] **SerpApi**: Get from https://serpapi.com/
- [ ] **Google Gemini AI**: Get from https://makersuite.google.com/app/apikey
- [ ] **ClickUp API**: Get from ClickUp settings (optional)

## Deployment Steps

### 1. Connect to Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Static Site"
3. Connect your GitHub repository

### 2. Configure Build Settings
- **Name**: `pricepredict-ai` (or your preferred name)
- **Branch**: `main` (or your deployment branch)
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`

### 3. Set Environment Variables
Add these environment variables in Render dashboard:

```
VITE_SERP_API_KEY=your_serpapi_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_CLICKUP_API_KEY=your_clickup_api_key
```

### 4. Deploy
- [ ] Click "Create Static Site"
- [ ] Wait for build to complete
- [ ] Visit the generated URL

## Post-Deployment Checks
- [ ] Site loads correctly
- [ ] Search functionality works
- [ ] AI chat assistant responds
- [ ] No console errors
- [ ] Mobile responsive

## Troubleshooting
- Check Render build logs for errors
- Verify API keys are set correctly
- Ensure environment variables start with `VITE_` for client-side access
- Test API endpoints manually if issues persist

## Performance Notes
- Bundle size is ~840KB (consider code splitting for better performance)
- API calls are made client-side (no server needed)
- Static hosting provides fast global CDN delivery