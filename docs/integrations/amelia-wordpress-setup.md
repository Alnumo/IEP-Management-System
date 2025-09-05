# Amelia WordPress Plugin Integration Setup

This document provides comprehensive instructions for setting up the integration between the Amelia WordPress booking plugin and the Arkan Growth Center CRM system.

## Overview

The integration enables automatic lead creation in the Arkan CRM whenever a new evaluation booking is made through the Amelia WordPress plugin on the website. This eliminates manual data entry and ensures no leads are lost.

## Architecture

```
WordPress (Amelia) → n8n Webhook → Data Transformation → Supabase → CRM Dashboard
```

## Prerequisites

1. **Amelia WordPress Plugin** (Pro version recommended)
2. **n8n Instance** (self-hosted or cloud)
3. **WhatsApp Business API** account (optional, for confirmations)
4. **Slack Workspace** (optional, for monitoring)

## Step 1: Configure Amelia WordPress Plugin

### 1.1 Enable Webhooks

1. Navigate to **Amelia → Settings → Integrations → Webhooks**
2. Enable the webhook functionality
3. Add a new webhook with the following settings:

```json
{
  "name": "Arkan CRM Integration",
  "url": "https://your-n8n-instance.com/webhook/amelia-booking-webhook",
  "events": ["booking.created", "booking.updated"],
  "secret": "your-webhook-secret-key",
  "active": true
}
```

### 1.2 Configure Custom Fields

Add the following custom fields to capture child information:

```json
{
  "fields": [
    {
      "name": "child_name",
      "label": "Child Name (English)",
      "type": "text",
      "required": true
    },
    {
      "name": "child_name_ar",
      "label": "اسم الطفل (بالعربية)",
      "type": "text",
      "required": false
    },
    {
      "name": "child_dob",
      "label": "Child Date of Birth",
      "type": "date",
      "required": true
    },
    {
      "name": "child_gender",
      "label": "Child Gender",
      "type": "select",
      "options": ["male", "female", "not_specified"],
      "required": false
    },
    {
      "name": "concerns",
      "label": "Primary Concerns",
      "type": "textarea",
      "required": false
    },
    {
      "name": "previous_therapy",
      "label": "Previous Therapy Experience",
      "type": "select",
      "options": ["yes", "no"],
      "required": false
    }
  ]
}
```

### 1.3 Arabic Language Support

1. Install Arabic language pack for Amelia
2. Configure RTL layout in WordPress theme
3. Set up bilingual field labels:

```php
// Add to theme functions.php
function amelia_custom_labels() {
    return [
        'child_name' => __('Child Name', 'text-domain'),
        'child_name_ar' => __('اسم الطفل', 'text-domain'),
        'child_dob' => __('تاريخ الميلاد', 'text-domain'),
        'child_gender' => __('الجنس', 'text-domain'),
        'concerns' => __('الاهتمامات الأساسية', 'text-domain')
    ];
}
```

## Step 2: Configure n8n Workflow

### 2.1 Import Workflow

1. Login to your n8n instance
2. Go to **Workflows**
3. Click **Import from File**
4. Upload `amelia-webhook-integration.json`

### 2.2 Environment Variables

Set the following environment variables in n8n:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Webhook Security
AMELIA_WEBHOOK_SECRET=your-webhook-secret-key

# WhatsApp Business API (Optional)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0/your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token

# Slack Integration (Optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
```

### 2.3 Credential Configuration

Configure the following credentials in n8n:

1. **Supabase API Credentials**
   - URL: Your Supabase project URL
   - API Key: Your service role key

2. **WhatsApp Business API Credentials** (if using)
   - Access Token: Your WhatsApp Business access token
   - Phone Number ID: Your WhatsApp Business phone number ID

3. **Slack Credentials** (if using)
   - Webhook URL: Your Slack incoming webhook URL

## Step 3: Configure WhatsApp Business API (Optional)

### 3.1 Set up WhatsApp Business Account

1. Create Meta Business account
2. Set up WhatsApp Business API
3. Get phone number verification
4. Create message templates

### 3.2 Create Message Template

Create an evaluation confirmation template:

```json
{
  "name": "evaluation_confirmation",
  "category": "UTILITY",
  "language": "ar",
  "components": [
    {
      "type": "BODY",
      "text": "مرحباً {{1}}، شكراً لك على حجز جلسة التقييم المجانية لـ {{2}}. موعدك مؤكد يوم {{3}}. سنتصل بك قريباً لتأكيد التفاصيل."
    }
  ]
}
```

English version:
```json
{
  "name": "evaluation_confirmation_en",
  "category": "UTILITY", 
  "language": "en",
  "components": [
    {
      "type": "BODY",
      "text": "Hello {{1}}, thank you for booking a free evaluation for {{2}}. Your appointment is confirmed for {{3}}. We will contact you soon to confirm details."
    }
  ]
}
```

## Step 4: Database Schema Updates

The required database schema is already created in migration `045_crm_lead_management_schema.sql`. Ensure it's applied:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('leads', 'lead_audit_trail', 'lead_interactions');
```

## Step 5: Testing the Integration

### 5.1 Manual Test

1. Go to your WordPress site with Amelia booking form
2. Fill out evaluation booking with test data:
   - Parent Name: "Test Parent"
   - Parent Email: "test@example.com"
   - Child Name: "Test Child"
   - Child DOB: "2019-01-01"
   - Select evaluation time

3. Submit the booking
4. Check n8n execution log
5. Verify lead creation in Supabase
6. Check CRM dashboard

### 5.2 Webhook Testing Tool

Use n8n's webhook testing feature:

```bash
curl -X POST \
  https://your-n8n-instance.com/webhook-test/amelia-booking-webhook \
  -H 'Content-Type: application/json' \
  -d '{
    "event": "booking.created",
    "secret": "your-webhook-secret-key",
    "booking": {
      "id": "test_123",
      "bookingStart": "2025-09-10T10:00:00Z",
      "status": "approved",
      "customFields": {
        "child_name": "Test Child",
        "child_name_ar": "طفل تجريبي", 
        "child_dob": "2019-01-01",
        "child_gender": "male",
        "concerns": "Speech development concerns"
      }
    },
    "customer": {
      "id": "customer_123",
      "firstName": "Test",
      "lastName": "Parent",
      "email": "test@example.com",
      "phone": "+966501234567"
    },
    "service": {
      "id": "service_123",
      "name": "Free Evaluation",
      "duration": 60
    }
  }'
```

## Step 6: Monitoring Setup

### 6.1 Import Monitoring Workflow

1. Import `crm-monitoring-dashboard.json` into n8n
2. Configure Slack alerts (optional)
3. Set up execution schedule (every 15 minutes)

### 6.2 Create Integration Metrics Table

```sql
CREATE TABLE integration_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  metrics JSONB NOT NULL,
  anomalies JSONB,
  health_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_integration_metrics_created_at 
ON integration_metrics(created_at DESC);
```

### 6.3 Dashboard Queries

Monitor integration health with these queries:

```sql
-- Recent integration health
SELECT 
  health_score,
  metrics->>'total_new_leads' as new_leads,
  metrics->>'amelia_leads' as amelia_leads,
  created_at
FROM integration_metrics 
ORDER BY created_at DESC 
LIMIT 10;

-- Anomaly trends
SELECT 
  date_trunc('hour', created_at) as hour,
  COUNT(*) as total_checks,
  COUNT(*) FILTER (WHERE jsonb_array_length(anomalies) > 0) as anomaly_count,
  AVG(health_score) as avg_health_score
FROM integration_metrics 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

## Step 7: Error Handling and Recovery

### 7.1 Common Issues and Solutions

**Issue: Webhook not receiving data**
- Check Amelia webhook configuration
- Verify n8n webhook URL is accessible
- Check webhook secret key

**Issue: Lead creation failing**
- Verify Supabase credentials
- Check required field validation
- Review error logs in n8n

**Issue: WhatsApp messages not sending**
- Check WhatsApp Business API credentials
- Verify message template approval
- Validate phone number format

### 7.2 Retry Logic

The n8n workflow includes automatic retry logic:
- HTTP request retries: 3 attempts with exponential backoff
- WhatsApp delivery retries: 2 attempts with 30-second delay
- Database operation retries: 2 attempts with immediate retry

### 7.3 Fallback Procedures

1. **Manual Lead Entry**: If integration fails, staff can manually create leads in CRM
2. **Data Reconciliation**: Daily sync script to match Amelia bookings with CRM leads
3. **Notification Backup**: Email notifications if WhatsApp fails

## Step 8: Security Considerations

### 8.1 Webhook Security

- Use HTTPS for all webhook URLs
- Implement webhook signature validation
- Rotate webhook secrets regularly
- Rate limiting on webhook endpoints

### 8.2 Data Protection

- Encrypt sensitive data in transit
- Implement proper access controls
- Regular security audits
- GDPR/PDPL compliance measures

### 8.3 API Security

- Use service role keys only in server environments
- Implement proper CORS policies
- Regular credential rotation
- Monitor API usage

## Step 9: Maintenance and Updates

### 9.1 Regular Maintenance Tasks

**Weekly:**
- Review integration health metrics
- Check for failed executions
- Validate data accuracy

**Monthly:**
- Update webhook secrets
- Review and optimize workflows
- Performance analysis

**Quarterly:**
- Security audit
- Integration testing
- Documentation updates

### 9.2 Updating the Integration

When updating the integration:
1. Test changes in staging environment
2. Update n8n workflows gradually
3. Monitor metrics after deployment
4. Keep rollback procedures ready

## Support and Troubleshooting

### 9.3 Logging and Debugging

Enable detailed logging in n8n:
```javascript
// Add to workflow code nodes for debugging
console.log('Debug: Received data', JSON.stringify($input.all(), null, 2));
console.log('Debug: Transformed data', JSON.stringify(result, null, 2));
```

### 9.4 Contact Information

For technical support:
- n8n Documentation: https://docs.n8n.io
- Supabase Documentation: https://supabase.com/docs
- Amelia Documentation: https://wpamelia.com/documentation

---

This integration setup ensures reliable, automated lead capture from the WordPress website into the Arkan CRM system, with comprehensive monitoring and error handling capabilities.