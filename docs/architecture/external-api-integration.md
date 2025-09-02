# External API Integration

The enhancement introduces two key external integrations that are crucial for the CRM and communication workflows.

## Amelia WordPress Plugin (via n8n)

Purpose: To capture new lead data from the "Book Free Evaluation" form on the public-facing WordPress website and sync it with the Arkan Alnumo CRM.

Integration Method: The integration will be asynchronous and managed by an n8n workflow.

The Amelia plugin on WordPress will trigger a webhook upon a new successful booking.

An n8n workflow will listen for this webhook, receive the booking data, and transform it.

The n8n workflow will then make a secure API call to our new POST /api/leads endpoint to create the lead in the Arkan Alnumo system.

Authentication: The n8n webhook will be secured with a secret token. The API call from n8n to our backend will use a dedicated, long-lived API key.

## WhatsApp Business API

Purpose: To send automated notifications to parents, such as appointment confirmations and reminders, as part of the CRM and scheduling workflows.

Integration Method: An n8n workflow will serve as the middleware to connect our application to the WhatsApp Business API (Meta API).

Actions within our application (e.g., updating a lead's status to "Confirmed") will trigger a webhook call to a specific n8n workflow.

The n8n workflow will format a pre-approved message template.

n8n will then make a secure API call to the WhatsApp Business API to dispatch the message.

Authentication: The connection between n8n and the WhatsApp Business API will be authenticated using a permanent access token managed within n8n.
