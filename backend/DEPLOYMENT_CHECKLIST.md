# Deployment Checklist

Complete checklist for deploying the multi-agent welfare scheme system.

## ✅ Pre-Deployment

### 1. Environment Setup

- [ ] Install Tesseract OCR on server
  ```bash
  # Linux
  sudo apt-get install tesseract-ocr tesseract-ocr-hin
  
  # Verify installation
  tesseract --version
  tesseract --list-langs  # Should show: eng, hin
  ```

- [ ] Install Python dependencies
  ```bash
  cd backend
  pip install -r requirements.txt
  ```

- [ ] Configure environment variables
  ```bash
  cp .env.example .env
  # Edit .env with production values
  ```

### 2. Configuration Validation

- [ ] Set `ENVIRONMENT=production` in `.env`
- [ ] Set `DEBUG=False` in `.env`
- [ ] Configure `DATABASE_URL` (PostgreSQL connection string)
- [ ] Set strong `SECRET_KEY` (32+ characters)
- [ ] Configure `TESSERACT_PATH` (system path to tesseract)
- [ ] Set `ALLOWED_ORIGINS` (frontend URL, no wildcards)
- [ ] Configure `ENCRYPTION_KEY` for file encryption
- [ ] Set `UPLOAD_DIR` (absolute path for file storage)
- [ ] Configure `REDIS_URL` (optional, for caching)

### 3. Database Setup

- [ ] Create PostgreSQL database
  ```sql
  CREATE DATABASE yojanamitra;
  CREATE USER yojana_user WITH PASSWORD 'strong_password';
  GRANT ALL PRIVILEGES ON DATABASE yojanamitra TO yojana_user;
  ```

- [ ] Run migrations
  ```bash
  cd backend
  alembic upgrade head
  ```

- [ ] Verify tables created
  ```bash
  python -c "from app.database import engine; from sqlalchemy import inspect; print(inspect(engine).get_table_names())"
  ```

- [ ] Seed initial data (schemes)
  ```bash
  # Run your scheme seeding script
  python scripts/seed_schemes.py
  ```

### 4. Security Hardening

- [ ] Generate strong SECRET_KEY
  ```bash
  openssl rand -hex 32
  ```

- [ ] Generate ENCRYPTION_KEY
  ```bash
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  ```

- [ ] Set up HTTPS/TLS certificates
- [ ] Configure firewall rules (allow only 80, 443, 22)
- [ ] Set up fail2ban for SSH protection
- [ ] Enable database SSL connections
- [ ] Configure CORS properly (no wildcards)

### 5. File Storage

- [ ] Create upload directory
  ```bash
  mkdir -p /var/www/yojanamitra/uploads
  chmod 750 /var/www/yojanamitra/uploads
  ```

- [ ] Set proper ownership
  ```bash
  chown -R www-data:www-data /var/www/yojanamitra/uploads
  ```

- [ ] Configure backup strategy for uploads
- [ ] (Optional) Set up S3/cloud storage

### 6. Testing

- [ ] Run unit tests
  ```bash
  cd backend
  python test_ocr_processor.py
  pytest tests/  # If you have pytest tests
  ```

- [ ] Test OCR endpoint
  ```bash
  python examples/test_ocr_endpoint.py sample_document.jpg
  ```

- [ ] Test agent endpoints
  ```bash
  curl -X POST http://localhost:8000/api/v1/agents/quick \
    -H "Content-Type: application/json" \
    -d '{"age": 35, "state": "Delhi"}'
  ```

- [ ] Verify database connections
- [ ] Test file upload/download
- [ ] Verify encryption/decryption

## 🚀 Deployment

### 1. Application Server Setup

#### Option A: Gunicorn + Nginx

- [ ] Install Gunicorn
  ```bash
  pip install gunicorn
  ```

- [ ] Create systemd service
  ```bash
  sudo nano /etc/systemd/system/yojanamitra.service
  ```
  
  ```ini
  [Unit]
  Description=YojanaMitra FastAPI Application
  After=network.target
  
  [Service]
  User=www-data
  Group=www-data
  WorkingDirectory=/var/www/yojanamitra/backend
  Environment="PATH=/var/www/yojanamitra/venv/bin"
  ExecStart=/var/www/yojanamitra/venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000
  Restart=always
  
  [Install]
  WantedBy=multi-user.target
  ```

- [ ] Enable and start service
  ```bash
  sudo systemctl enable yojanamitra
  sudo systemctl start yojanamitra
  sudo systemctl status yojanamitra
  ```

- [ ] Configure Nginx reverse proxy
  ```bash
  sudo nano /etc/nginx/sites-available/yojanamitra
  ```
  
  ```nginx
  server {
      listen 80;
      server_name api.yojanamitra.in;
      
      client_max_body_size 10M;
      
      location / {
          proxy_pass http://127.0.0.1:8000;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
  }
  ```

- [ ] Enable site and restart Nginx
  ```bash
  sudo ln -s /etc/nginx/sites-available/yojanamitra /etc/nginx/sites-enabled/
  sudo nginx -t
  sudo systemctl restart nginx
  ```

#### Option B: Docker

- [ ] Build Docker image
  ```bash
  docker build -t yojanamitra-backend .
  ```

- [ ] Run container
  ```bash
  docker run -d \
    --name yojanamitra \
    -p 8000:8000 \
    --env-file .env \
    -v /var/www/uploads:/app/uploads \
    yojanamitra-backend
  ```

- [ ] Set up Docker Compose (recommended)
  ```yaml
  version: '3.8'
  services:
    app:
      build: .
      ports:
        - "8000:8000"
      env_file: .env
      volumes:
        - ./uploads:/app/uploads
      depends_on:
        - db
    
    db:
      image: postgres:15
      environment:
        POSTGRES_DB: yojanamitra
        POSTGRES_USER: yojana_user
        POSTGRES_PASSWORD: ${DB_PASSWORD}
      volumes:
        - postgres_data:/var/lib/postgresql/data
  
  volumes:
    postgres_data:
  ```

### 2. SSL/TLS Setup

- [ ] Install Certbot
  ```bash
  sudo apt-get install certbot python3-certbot-nginx
  ```

- [ ] Obtain SSL certificate
  ```bash
  sudo certbot --nginx -d api.yojanamitra.in
  ```

- [ ] Verify auto-renewal
  ```bash
  sudo certbot renew --dry-run
  ```

### 3. Monitoring Setup

- [ ] Set up application logging
  ```bash
  mkdir -p /var/log/yojanamitra
  chmod 755 /var/log/yojanamitra
  ```

- [ ] Configure log rotation
  ```bash
  sudo nano /etc/logrotate.d/yojanamitra
  ```
  
  ```
  /var/log/yojanamitra/*.log {
      daily
      rotate 14
      compress
      delaycompress
      notifempty
      create 0640 www-data www-data
      sharedscripts
  }
  ```

- [ ] Set up monitoring (optional)
  - [ ] Install Prometheus + Grafana
  - [ ] Configure health check endpoints
  - [ ] Set up alerting

### 4. Backup Strategy

- [ ] Database backups
  ```bash
  # Daily backup script
  pg_dump -U yojana_user yojanamitra > backup_$(date +%Y%m%d).sql
  ```

- [ ] File storage backups
  ```bash
  # Daily backup of uploads
  tar -czf uploads_backup_$(date +%Y%m%d).tar.gz /var/www/yojanamitra/uploads
  ```

- [ ] Set up automated backups (cron)
  ```bash
  crontab -e
  # Add: 0 2 * * * /path/to/backup_script.sh
  ```

- [ ] Test backup restoration

## ✅ Post-Deployment

### 1. Smoke Tests

- [ ] Health check endpoint
  ```bash
  curl http://api.yojanamitra.in/health
  ```

- [ ] API documentation accessible
  ```bash
  curl http://api.yojanamitra.in/docs
  ```

- [ ] Test user registration
- [ ] Test user login
- [ ] Test profile creation
- [ ] Test document upload
- [ ] Test OCR extraction
- [ ] Test scheme discovery
- [ ] Test eligibility check

### 2. Performance Testing

- [ ] Load testing (Apache Bench or Locust)
  ```bash
  ab -n 1000 -c 10 http://api.yojanamitra.in/health
  ```

- [ ] Verify response times
  - [ ] Health check: <100ms
  - [ ] Quick pipeline: <2s
  - [ ] Full pipeline: <5s
  - [ ] OCR extraction: <3s

- [ ] Check database query performance
- [ ] Monitor memory usage
- [ ] Monitor CPU usage

### 3. Security Audit

- [ ] Run security scan (OWASP ZAP)
- [ ] Verify HTTPS enforcement
- [ ] Test rate limiting
- [ ] Verify authentication
- [ ] Test authorization
- [ ] Check for SQL injection vulnerabilities
- [ ] Verify file upload restrictions
- [ ] Test CORS configuration

### 4. Documentation

- [ ] Update API documentation
- [ ] Document deployment process
- [ ] Create runbook for common issues
- [ ] Document backup/restore procedures
- [ ] Create incident response plan

### 5. Monitoring & Alerts

- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure error alerting (Sentry, Rollbar)
- [ ] Set up log aggregation (ELK, Splunk)
- [ ] Configure performance monitoring (New Relic, DataDog)
- [ ] Set up database monitoring

## 📊 Production Checklist

### Environment Variables (Production)

```env
# Application
ENVIRONMENT=production
DEBUG=False
APP_NAME=YojanaMitra API
APP_VERSION=1.0.0
HOST=0.0.0.0
PORT=8000

# Database
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:pass@localhost:5432/yojanamitra
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=40

# Security
SECRET_KEY=<64-char-hex-string>
ENCRYPTION_KEY=<fernet-key>
ALLOWED_ORIGINS=https://yojanamitra.in

# OCR
TESSERACT_PATH=/usr/bin/tesseract
TESSERACT_LANGS=eng+hin
OCR_CONFIDENCE_THRESHOLD=0.6

# Storage
UPLOAD_DIR=/var/www/yojanamitra/uploads
MAX_UPLOAD_SIZE_MB=10

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_PERIOD=3600

# Cache (Optional)
REDIS_URL=redis://localhost:6379/0

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yojanamitra.in
SMTP_PASSWORD=<app-password>
```

### System Requirements

- [ ] **CPU**: 2+ cores (4+ recommended)
- [ ] **RAM**: 4GB minimum (8GB+ recommended)
- [ ] **Storage**: 50GB+ (depends on document volume)
- [ ] **OS**: Ubuntu 20.04+ or similar Linux distribution
- [ ] **Python**: 3.10+
- [ ] **PostgreSQL**: 13+
- [ ] **Tesseract**: 4.0+

### Network Requirements

- [ ] **Inbound**: 80 (HTTP), 443 (HTTPS), 22 (SSH)
- [ ] **Outbound**: 80, 443 (for external APIs)
- [ ] **Database**: 5432 (internal only)
- [ ] **Redis**: 6379 (internal only, if used)

## 🔧 Maintenance

### Daily

- [ ] Check application logs for errors
- [ ] Monitor disk space
- [ ] Verify backups completed

### Weekly

- [ ] Review performance metrics
- [ ] Check for security updates
- [ ] Review error rates
- [ ] Analyze user feedback

### Monthly

- [ ] Update dependencies
- [ ] Review and optimize database
- [ ] Test backup restoration
- [ ] Security audit
- [ ] Performance optimization

## 🆘 Troubleshooting

### Common Issues

**Issue**: Tesseract not found
```bash
# Solution
sudo apt-get install tesseract-ocr tesseract-ocr-hin
# Update TESSERACT_PATH in .env
```

**Issue**: Database connection failed
```bash
# Solution
# Check DATABASE_URL in .env
# Verify PostgreSQL is running
sudo systemctl status postgresql
```

**Issue**: File upload fails
```bash
# Solution
# Check upload directory permissions
chmod 750 /var/www/yojanamitra/uploads
chown -R www-data:www-data /var/www/yojanamitra/uploads
```

**Issue**: High memory usage
```bash
# Solution
# Reduce worker count in gunicorn
# Optimize database queries
# Enable Redis caching
```

## 📞 Support Contacts

- **Technical Lead**: [email]
- **DevOps**: [email]
- **Database Admin**: [email]
- **Security Team**: [email]

---

**Deployment Version**: 1.0.0

**Last Updated**: 2026-04-22

**Status**: Ready for Production
