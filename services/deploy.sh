#!/usr/bin/env bash
# Deploy the long-running services to the EC2 instance.
#
# Ships the repo (minus node_modules and build output) over SSH, then rebuilds and restarts
# the containers there. Deliberately boring: no registry to maintain, no CI to configure, and
# the same command whether one service is running or five.
#
#   ./services/deploy.sh                       # uses WORKER_SSH_HOST from .env
#   WORKER_SSH_HOST=ec2-user@1.2.3.4 ./services/deploy.sh
#
# One-time setup on a fresh instance:
#   sudo yum install -y docker && sudo systemctl enable --now docker
#   sudo usermod -aG docker $USER            # then reconnect
#   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
#        -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose
#   mkdir -p ~/ganime
# Then copy services/worker.env.example to ~/ganime/services/worker.env and fill it in.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck disable=SC1091
[ -f .env ] && set -a && . ./.env && set +a

HOST="${WORKER_SSH_HOST:-}"
REMOTE_DIR="${WORKER_REMOTE_DIR:-~/ganime}"
SSH_KEY="${WORKER_SSH_KEY:-}"

if [ -z "$HOST" ]; then
  echo "WORKER_SSH_HOST is not set (e.g. ec2-user@1.2.3.4). Put it in .env or pass it inline." >&2
  exit 1
fi

SSH_OPTS=()
[ -n "$SSH_KEY" ] && SSH_OPTS=(-i "$SSH_KEY")

echo "==> syncing to $HOST:$REMOTE_DIR"
# worker.env lives only on the instance and is never overwritten by a deploy.
rsync -az --delete \
  --exclude node_modules --exclude .git --exclude www --exclude dist \
  --exclude 'services/worker.env' --exclude .netlify --exclude platforms \
  -e "ssh ${SSH_OPTS[*]}" \
  ./netlify ./services ./package.json ./package-lock.json \
  "$HOST:$REMOTE_DIR/"

echo "==> rebuilding and restarting"
# --remove-orphans so a service deleted from the compose file actually stops.
ssh "${SSH_OPTS[@]}" "$HOST" "cd $REMOTE_DIR/services && docker-compose up -d --build --remove-orphans && docker image prune -f"

echo "==> health"
ssh "${SSH_OPTS[@]}" "$HOST" "sleep 5 && curl -fsS http://127.0.0.1:8080/health && echo"

echo "==> done"
