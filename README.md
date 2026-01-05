# PricePredict AI - Smart Shopping Assistant

A modern React application that helps users find the best deals on products using AI-powered search and price analysis.

## Features

- 🔍 **Smart Product Search** - AI-enhanced search queries
- 📊 **Price Analysis** - Real-time price tracking and market insights
- 🤖 **AI Chat Assistant** - Get personalized shopping recommendations
- 📱 **Responsive Design** - Works on all devices
- ⚡ **Fast & Modern** - Built with React, TypeScript, and Vite

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, Radix UI, Lucide Icons
- **APIs**: SerpApi (product search), Google Gemini AI (insights)
- **Deployment**: Render (static site)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
VITE_SERP_API_KEY=your_serpapi_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_CLICKUP_API_KEY=your_clickup_api_key_here
```

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment to Render

### Option 1: Static Site (Recommended)

1. **Connect Repository**: Link your GitHub repository to Render
2. **Service Type**: Choose "Static Site"
3. **Build Settings**:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. **Environment Variables**: Add your API keys as environment variables
5. **Deploy**: Render will automatically build and deploy your site

### Option 2: Web Service

If you need server-side functionality:

1. **Service Type**: Choose "Web Service"
2. **Runtime**: Node.js
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm run preview`
5. **Environment Variables**: Add your API keys

## API Keys Setup

### SerpApi
1. Sign up at [SerpApi](https://serpapi.com/)
2. Get your API key from the dashboard
3. Add it as `VITE_SERP_API_KEY`

### Google Gemini AI
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it as `VITE_GEMINI_API_KEY`

### ClickUp (Optional)
1. Get API token from ClickUp settings
2. Add it as `VITE_CLICKUP_API_KEY`

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   └── ...
├── lib/                # Utilities and API services
├── pages/              # Page components
└── assets/             # Static assets
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/820e647b-e2bc-42f8-8dd1-6f1d67e759ac) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
