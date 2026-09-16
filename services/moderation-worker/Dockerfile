# The worker shares the repo's server-side code (netlify/functions/utils/*) rather than
# duplicating it, so the build context is the repo root and the image carries both.
FROM node:22-slim

# ffmpeg-static ships its own binary, but the moderation pipeline also needs the shared
# libraries a slim image omits.
# The distro ffmpeg, not ffmpeg-static. The static build cannot resolve hostnames inside a
# container (it bypasses glibc's NSS), so every read of a remote video fails with
# "Failed to resolve hostname" while Node's fetch to the same host works fine.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates ffmpeg \
    && rm -rf /var/lib/apt/lists/*
ENV FFMPEG_PATH=/usr/bin/ffmpeg

WORKDIR /app

# Dependencies first, so a code change does not reinstall them.
COPY package.json package-lock.json* ./

# --ignore-scripts, then provision ffmpeg by hand.
#
# The repo's own postinstall is a Cordova/Android JDK patch that has no meaning in this image
# and fails outright, because the script it runs is not copied in at this layer. Skipping all
# install scripts fixes that, but ffmpeg-static downloads its binary in one — and the whole
# pipeline is ffmpeg — so that single script is run explicitly afterwards. The remaining
# packages with install scripts (esbuild, netlify-cli, sharp) are build tooling this service
# never imports.
RUN npm ci --omit=dev --ignore-scripts     && node node_modules/ffmpeg-static/install.js     && node -e "const p=require('ffmpeg-static'); require('fs').accessSync(p); console.log('ffmpeg provisioned at', p)"


# The worker's code and the shared server code it calls.
COPY netlify/functions ./netlify/functions
COPY services ./services

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "services/moderation-worker/src/index.js"]
