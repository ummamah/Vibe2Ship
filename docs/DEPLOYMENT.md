# Deployment & Network Access Guide

## Running Locally on Your Network

This guide shows you how to access your AI assistant from any device on your WiFi network (phone, tablet, other computers).

### Step 1: Find Your Computer's Local IP Address

**On Windows:**

```powershell
# Get your local IP address
ipconfig | Select-String IPv4

# Look for something like: 192.168.1.X or 10.0.0.X
# Example output: IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

Your local IP will be something like `192.168.1.100` or `192.168.0.50`

### Step 2: Configure Backend for Network Access

The backend is already configured to listen on `0.0.0.0` (all network interfaces), which means it's accessible from your network.

**Verify `.env` settings:**

```env
# backend/.env
HOST=0.0.0.0  # This allows network access
PORT=8000

# Add your local IP to CORS origins
CORS_ORIGINS=http://localhost:3000,http://192.168.1.100:3000
```

Replace `192.168.1.100` with YOUR actual local IP address.

### Step 3: Configure Frontend for Network Access

Update `frontend/.env`:

```env
# frontend/.env
VITE_API_URL=http://192.168.1.100:8000
```

Again, replace `192.168.1.100` with your actual IP.

### Step 4: Update Vite Config for Network Access

Edit `frontend/vite.config.ts`:

```typescript
export default defineConfig({
  // ... other config ...
  server: {
    host: '0.0.0.0',  // Add this line
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
```

### Step 5: Configure Windows Firewall

You need to allow incoming connections on ports 8000 and 3000.

**Option A: Using PowerShell (Recommended)**

```powershell
# Allow Python (backend)
New-NetFirewallRule -DisplayName "Personal AI Backend" -Direction Inbound -Port 8000 -Protocol TCP -Action Allow

# Allow Node/Vite (frontend)
New-NetFirewallRule -DisplayName "Personal AI Frontend" -Direction Inbound -Port 3000 -Protocol TCP -Action Allow
```

**Option B: Using GUI**

1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. Select "TCP" and specify port `8000` → Next
6. Select "Allow the connection" → Next
7. Check all profiles → Next
8. Name it "Personal AI Backend" → Finish
9. Repeat for port `3000` (Frontend)

### Step 6: Start Both Services

**Terminal 1 - Backend:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python main.py
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

You should see output like:
```
Frontend:
  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.1.100:3000/
```

### Step 7: Access from Mobile/Other Devices

1. **Make sure your phone/device is on the SAME WiFi network**
2. **Open browser on phone**
3. **Navigate to**: `http://192.168.1.100:3000` (use your IP)

You should see your AI assistant!

### Step 8: Install as PWA on Phone

**On iPhone (Safari):**
1. Open the app in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Name it "AI Assistant"
5. Tap "Add"

**On Android (Chrome):**
1. Open the app in Chrome
2. Tap the three dots menu
3. Tap "Add to Home Screen"
4. Name it "AI Assistant"
5. Tap "Add"

Now it works like a native app!

---

## Keeping Your Laptop Running

For 24/7 access, you need to keep your laptop on:

### Prevent Sleep When Lid Closed

**Windows Settings:**
1. Open Control Panel → Power Options
2. Click "Choose what closing the lid does"
3. Set "When I close the lid" to "Do nothing" for "Plugged in"
4. Save changes

### Prevent Auto-Sleep

```powershell
# Disable sleep when plugged in (run as Administrator)
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 30  # Screen off after 30 min
```

---

## Production Deployment (Optional - Cloud Hosting)

If you want to access your assistant from ANYWHERE (not just home network), you have several options:

### Option 1: Cloudflare Tunnel (FREE, Recommended)

Access your local server from anywhere without opening ports or paying for hosting.

**Setup:**

```powershell
# Install Cloudflare Tunnel
winget install --id Cloudflare.cloudflared

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create personal-ai

# Configure tunnel
# Create config file: C:\Users\<YourUsername>\.cloudflared\config.yml
```

**config.yml:**
```yaml
url: http://localhost:3000
tunnel: <your-tunnel-id>
credentials-file: C:\Users\<YourUsername>\.cloudflared\<tunnel-id>.json
```

**Run tunnel:**
```powershell
cloudflared tunnel run personal-ai
```

Now you get a URL like `https://personal-ai.trycloudflare.com` accessible from anywhere!

### Option 2: Free Cloud Hosting

Deploy backend and frontend to free cloud services:

**Backend: Render.com (Free)**
1. Push code to GitHub
2. Sign up at render.com
3. Create "New Web Service"
4. Connect GitHub repo
5. Set build command: `pip install -r requirements.txt`
6. Set start command: `python main.py`
7. Add environment variables from `.env`
8. Deploy (free tier: 750 hours/month, sleeps after 15 min inactivity)

**Frontend: Vercel/Netlify (Free)**
1. Push frontend to GitHub
2. Sign up at vercel.com or netlify.com
3. Import repository
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com`
7. Deploy

**Cost: $0/month** for basic usage!

### Option 3: VPS Hosting (~$5/month)

For full control and better performance:

- **DigitalOcean** ($6/month for basic droplet)
- **Linode** ($5/month)
- **Oracle Cloud** (Free tier with limits)

---

## Auto-Start on Windows Boot (Optional)

To start services automatically when your laptop boots:

### Create Startup Scripts

**1. Create `start-backend.bat`:**
```batch
@echo off
cd C:\Users\amatu\OneDrive\Documents\Personalized_AI\backend
call venv\Scripts\activate.bat
python main.py
```

**2. Create `start-frontend.bat`:**
```batch
@echo off
cd C:\Users\amatu\OneDrive\Documents\Personalized_AI\frontend
npm run dev
```

### Add to Startup

1. Press `Win + R`, type `shell:startup`, press Enter
2. Create shortcuts to the .bat files
3. Place shortcuts in the Startup folder

---

## Monitoring & Logs

### View Backend Logs

Backend prints logs directly to console. To save them:

```powershell
python main.py > logs.txt 2>&1
```

### View Frontend Logs

Check browser console:
- Press `F12` → Console tab

---

## Security Considerations

Since you're running locally:

✅ **Good practices:**
- Keep your WiFi password strong
- Only allow trusted devices on your network
- Don't expose your local IP to the internet directly
- Use Cloudflare Tunnel if you need external access

❌ **Don't do:**
- Port forward 3000/8000 directly to internet
- Share your local IP publicly
- Use this on public WiFi without VPN

---

## Troubleshooting

### Can't Access from Phone

1. **Check if on same WiFi**: Phone and laptop must be on same network
2. **Check firewall**: Make sure ports 3000 and 8000 are allowed
3. **Check IP address**: Verify you're using correct local IP
4. **Try laptop's IP in browser directly**: `http://192.168.1.100:8000/health`

### "Connection Refused" Error

- Backend not running → Start it
- Wrong IP address → Check with `ipconfig`
- Firewall blocking → Add firewall rules

### PWA Not Installing

- Must use HTTPS or localhost (use Cloudflare Tunnel for HTTPS)
- Make sure manifest.json is properly configured
- Try different browser

### Performance Issues

- **Close other apps** on laptop to free resources
- **Upgrade to larger LLM model** if responses too basic
- **Add more RAM** if system sluggish (recommending 16GB+)

---

## Summary

**Local Network Access:**
1. Get your laptop's local IP (`ipconfig`)
2. Update `.env` files with your IP
3. Allow firewall rules for ports 3000 and 8000
4. Start backend and frontend
5. Access from phone: `http://YOUR_IP:3000`

**External Access (from anywhere):**
- Use Cloudflare Tunnel (free) OR
- Deploy to Render + Vercel (free with limits) OR
- Get VPS hosting ($5-10/month)

**Next Steps:** See [USAGE_GUIDE.md](USAGE_GUIDE.md) for how to use all features!
