# PKL Club - Production Deployment Guide

## Prerequisites

- A VPS server with Ubuntu 20.04+ (your GoDaddy VPS works perfectly)
- A domain name pointed to your server's IP address
- SSH access to the server

## Quick Start (3 Steps)

### 1. Clone the repository on your server

```bash
ssh root@YOUR_SERVER_IP
git clone YOUR_REPO_URL /var/www/pklclub
cd /var/www/pklclub
```

### 2. Configure environment

```bash
cp .env.example .env
nano .env
```

Update these values:

- `DOMAIN` - Your domain name (e.g., `pklclub.com`)
- `MONGO_PASSWORD` - A strong, unique password
- `JWT_SECRET` - A random 32+ character string
- `SSL_EMAIL` - Your email for SSL notifications

### 3. Deploy

```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

That's it! Your site will be live at `https://yourdomain.com`

---

## What the deploy script does

1. Installs Docker (if not present)
2. Installs Certbot for SSL certificates
3. Obtains free SSL certificate from Let's Encrypt
4. Builds and starts all containers
5. Sets up automatic SSL renewal
6. Configures firewall rules

---

## Manual Commands

### View running containers

```bash
docker ps
```

### View logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f pkl-site
docker compose -f docker-compose.prod.yml logs -f pkl-api
docker compose -f docker-compose.prod.yml logs -f pkl-mongo
```

### Restart services

```bash
docker compose -f docker-compose.prod.yml restart
```

### Stop everything

```bash
docker compose -f docker-compose.prod.yml down
```

### Update deployment

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### Access MongoDB shell

```bash
docker exec -it pkl-mongo mongosh -u pklroot -p 'YOUR_PASSWORD' --authenticationDatabase admin
```

---

## DNS Configuration

Point your domain to the server by adding these DNS records:

| Type | Host | Value          |
| ---- | ---- | -------------- |
| A    | @    | YOUR_SERVER_IP |
| A    | www  | YOUR_SERVER_IP |

For GoDaddy VPS IP `160.153.191.91`:

| Type | Host | Value          |
| ---- | ---- | -------------- |
| A    | @    | 160.153.191.91 |
| A    | www  | 160.153.191.91 |

---

## Troubleshooting

### SSL certificate issues

```bash
# Check certificate status
certbot certificates

# Force renewal
certbot renew --force-renewal
cp /etc/letsencrypt/live/yourdomain.com/*.pem ssl/
docker compose -f docker-compose.prod.yml restart pkl-site
```

### Container won't start

```bash
# Check logs for errors
docker compose -f docker-compose.prod.yml logs pkl-api

# Rebuild from scratch
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
```

### Port 80/443 already in use

```bash
# Find what's using the port
lsof -i :80
lsof -i :443

# Stop Plesk/Apache if running
systemctl stop sw-cp-server
systemctl stop apache2
```

---

## Backup MongoDB

```bash
# Create backup
docker exec pkl-mongo mongodump -u pklroot -p 'YOUR_PASSWORD' --authenticationDatabase admin --out /data/db/backup

# Copy backup to host
docker cp pkl-mongo:/data/db/backup ./backup-$(date +%Y%m%d)
```

---

## Security Notes

- Never commit `.env` file to git
- Change default MongoDB credentials
- Keep your server updated: `apt update && apt upgrade -y`
- Consider setting up fail2ban for SSH protection

---

## Support

For issues, contact the development team.
