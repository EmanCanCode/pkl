#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   PKL Club Production Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo ./deploy.sh)${NC}"
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo -e "${YELLOW}Copy .env.example to .env and configure it:${NC}"
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
fi

# Load environment variables
source .env

# Validate required variables
if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "yourdomain.com" ]; then
    echo -e "${RED}Error: Please set your DOMAIN in .env file${NC}"
    exit 1
fi

if [ -z "$SSL_EMAIL" ] || [ "$SSL_EMAIL" = "admin@yourdomain.com" ]; then
    echo -e "${RED}Error: Please set your SSL_EMAIL in .env file${NC}"
    exit 1
fi

echo -e "${YELLOW}Deploying for domain: $DOMAIN${NC}"

# Step 1: Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker installed successfully${NC}"
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

# Step 2: Install Certbot if not present
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Installing Certbot...${NC}"
    apt-get update
    apt-get install -y certbot
    echo -e "${GREEN}Certbot installed successfully${NC}"
else
    echo -e "${GREEN}Certbot already installed${NC}"
fi

# Step 3: Create SSL directory
mkdir -p ssl

# Step 4: Get SSL certificate (if not exists)
if [ ! -f "ssl/fullchain.pem" ]; then
    echo -e "${YELLOW}Obtaining SSL certificate for $DOMAIN...${NC}"
    
    # Stop any running containers that might be using port 80
    docker compose -f docker-compose.prod.yml down 2>/dev/null || true
    
    # Get certificate
    certbot certonly --standalone \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --email "$SSL_EMAIL" \
        --agree-tos \
        --non-interactive
    
    # Copy certificates to local ssl folder
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/
    
    echo -e "${GREEN}SSL certificate obtained successfully${NC}"
else
    echo -e "${GREEN}SSL certificate already exists${NC}"
fi

# Step 5: Update nginx config with actual domain
sed -i "s/server_name _;/server_name $DOMAIN www.$DOMAIN;/g" nginx.prod.conf

# Step 6: Build and start containers
echo -e "${YELLOW}Building and starting containers...${NC}"
docker compose -f docker-compose.prod.yml up -d --build

# Step 7: Set up SSL auto-renewal cron job
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    echo -e "${YELLOW}Setting up SSL auto-renewal...${NC}"
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/*.pem $(pwd)/ssl/ && docker compose -f $(pwd)/docker-compose.prod.yml restart pkl-site") | crontab -
    echo -e "${GREEN}SSL auto-renewal configured${NC}"
fi

# Step 8: Configure firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Your site is now live at: ${GREEN}https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  View logs:     docker compose -f docker-compose.prod.yml logs -f"
echo "  Stop:          docker compose -f docker-compose.prod.yml down"
echo "  Restart:       docker compose -f docker-compose.prod.yml restart"
echo "  Update:        git pull && docker compose -f docker-compose.prod.yml up -d --build"
echo ""
