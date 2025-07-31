# LaiLai Cloud Deployment Guide

## Overview

LaiLai uses a **hybrid deployment** approach:
- **Frontend**: Deployed on Vercel or Netlify (React app)
- **Backend**: Running on Vast.ai GPU instance (Flask API)

## Step 1: Deploy Backend on Vast.ai

### 1.1 Start Your Vast.ai Instance

If you don't have an instance running:

```bash
# Search for available instances
vastai search offers --memory 16 --gpu-name RTX_3090

# Launch instance (replace with your preferred offer)
vastai create instance <offer_id> --image nvidia/cuda:11.8-devel-ubuntu22.04
```

### 1.2 Connect to Your Instance

```bash
# Get instance connection details
vastai show instances

# Connect via SSH
ssh -p <port> root@<ip_address>
```

### 1.3 Deploy LaiLai Backend

```bash
# Clone repository
git clone https://github.com/your-username/lailai.git
cd lailai

# Install dependencies
apt update && apt install -y python3.10 python3.10-venv python3-pip ffmpeg git

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python packages
pip install flask flask-cors openai-whisper torch torchvision torchaudio

# Start the API
python3 app.py
```

Your backend will be running at: `http://<your-vast-ip>:5000`

### 1.4 Test Backend Connection

```bash
# Test health endpoint
curl http://localhost:5000/health

# Should return: {"status": "healthy", "message": "LaiLai Public API is running"}
```

## Step 2: Deploy Frontend

### Option A: Deploy to Vercel

1. **Prepare for deployment**:
   ```bash
   npm install
   npm run build
   ```

2. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

3. **Set environment variable**:
   - Update `.env.production` with your Vast.ai instance URL:
   ```
   REACT_APP_API_URL=http://YOUR_VAST_IP:5000
   ```

4. **Deploy**:
   ```bash
   vercel --prod
   ```

5. **Set Vercel environment variable**:
   ```bash
   vercel env add REACT_APP_API_URL production
   # Enter your Vast.ai URL: http://YOUR_VAST_IP:5000
   ```

### Option B: Deploy to Netlify

1. **Build the project**:
   ```bash
   npm install
   npm run build
   ```

2. **Deploy to Netlify** (via CLI):
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod --dir=build
   ```

3. **Or deploy via Netlify dashboard**:
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `build`
   - Add environment variable: `REACT_APP_API_URL = http://YOUR_VAST_IP:5000`

## Step 3: Configure CORS

Ensure your backend allows requests from your frontend domain.

In your `app.py` on Vast.ai:

```python
from flask_cors import CORS

app = Flask(__name__)
# Allow your frontend domain
CORS(app, origins=["https://your-app.vercel.app", "https://your-app.netlify.app"])
```

## Step 4: Test End-to-End

1. Visit your deployed frontend URL
2. Try uploading a video file
3. Verify the processing works correctly
4. Test video export functionality

## Configuration Files

### Frontend Environment Variables

- **Development**: `.env.local`
- **Production**: `.env.production` or deployment platform settings

### Backend Configuration

- **Local Storage**: Files stored on Vast.ai instance (temporary)
- **Persistent Storage**: Optional S3 integration available

## Troubleshooting

### CORS Issues
```bash
# Check if backend is accessible
curl -H "Origin: https://your-frontend-domain.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://YOUR_VAST_IP:5000/health
```

### Backend Connection Issues
```bash
# Check if backend is running
curl http://YOUR_VAST_IP:5000/health

# Check firewall/network
ping YOUR_VAST_IP
```

### File Upload Issues
- Check file size limits (500MB default)
- Verify supported formats: MP4, MOV, AVI, MP3, WAV, M4A
- Monitor backend logs for processing errors

## Security Notes

- Use HTTPS in production
- Consider adding authentication
- Implement rate limiting for API endpoints
- Regularly update dependencies

## Cost Optimization

- **Vast.ai**: ~$0.25/hour for RTX 3090
- **Frontend**: Free tier on Vercel/Netlify
- **Processing cost**: ~$0.05-0.10 per video

Stop Vast.ai instance when not in use to save costs!

## Scaling

For higher usage:
- Use multiple Vast.ai instances with load balancing
- Implement job queuing with Redis/Celery
- Consider AWS S3 for persistent storage
- Add CDN for faster video delivery