# TradeDesk
This is a personal application, where I have all my strategies and then the journal. May be much more


# 1. Clone / create the project
mkdir tradedeck && cd tradedeck

# 2. Copy all files into the structure above

# 3. Install dependencies
npm install

# 4. Create your .env file
cp .env.example .env
# → Edit .env and paste your Supabase URL + anon key

# 5. Test locally
npm run dev

# 6. Push to GitHub, then in Netlify:
#    - New site → import from GitHub
#    - Build command:  npm run build
#    - Publish dir:    dist
#    - Add env vars:   VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
#    → Deploy!