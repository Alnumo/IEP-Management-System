# INITIAL Feature Request: Intelligent Session Scheduling & Conflict Resolution System

## FEATURE:
Build a comprehensive scheduling system with intelligent conflict resolution for the Therapy Plans Manager that handles:
- **Multi-therapist scheduling** with automatic conflict detection across therapists, students, and rooms
- **Smart scheduling algorithm** that considers therapist specializations, student needs, and optimal session distribution
- **Real-time availability management** with calendar integration for therapists and parents
- **Automated rescheduling system** when conflicts arise or sessions are cancelled
- **Prayer time consideration** for Saudi Arabia (automatic blocking of prayer times)
- **Parent preference management** for preferred time slots and therapist assignments
- **Bulk scheduling capabilities** for recurring sessions with pattern recognition
- **n8n workflow integration** for automated notifications via WhatsApp/Email when schedules change
- **Bilingual interface** with full Arabic (RTL) and English (LTR) support for all scheduling features
- **Mobile-responsive** scheduling interface for therapists to manage on-the-go

## EXAMPLES:
The `examples/` folder contains reference implementations to guide development:

### Frontend Examples:
- `examples/components/BilingualCalendar.tsx` - A fully implemented bilingual calendar component that handles RTL/LTR switching, Hijri/Gregorian date systems, and Saudi weekends (Fri-Sat). Use this as the base for the scheduling calendar.
- `examples/components/ConflictResolver.tsx` - UI component showing how to display scheduling conflicts with resolution options. Implements the card-based conflict display pattern.
- `examples/components/TimeSlotPicker.tsx` - Accessible time slot selection component with prayer time blocking already implemented.

### Backend Examples:
- `examples/api/scheduling-engine.ts` - Core scheduling algorithm that demonstrates:
  - Conflict detection across multiple resources (therapists, rooms, students)
  - Optimal slot allocation based on therapist expertise matching
  - Handling of buffer times between sessions
  - Integration with Supabase real-time subscriptions

- `examples/database/scheduling-schema.sql` - Complete database schema for scheduling including:
  - `schedules` table with RLS policies
  - `schedule_conflicts` table for tracking conflicts
  - `schedule_preferences` table for parent/therapist preferences
  - Trigger functions for automatic conflict detection

### n8n Workflow Examples:
- `examples/n8n/schedule-notification-workflow.json` - Complete n8n workflow that:
  - Listens for schedule change webhooks
  - Sends WhatsApp notifications to parents in Arabic/English
  - Sends email summaries to therapists
  - Logs all notifications for audit trail

- `examples/n8n/webhook-handler.ts` - Edge function for handling n8n webhooks with:
  - Signature validation
  - Payload parsing for schedule events
  - Error handling and retry logic

### Testing Examples:
- `examples/__tests__/scheduling.test.ts` - Comprehensive test suite covering:
  - Conflict detection scenarios
  - Prayer time blocking
  - Timezone handling
  - Arabic/English notification formatting

## DOCUMENTATION:

### External Documentation to Reference:
1. **Supabase Real-time Documentation**: https://supabase.com/docs/guides/realtime
   - Focus on: Presence features for showing therapist availability
   - Broadcast for real-time schedule updates
   - PostgreSQL triggers for conflict detection

2. **React Big Calendar with RTL Support**: https://github.com/jquense/react-big-calendar
   - Custom toolbar implementation for Arabic
   - Event rendering with bilingual support
   - Mobile responsive views

3. **Saudi Arabia Prayer Times API**: https://aladhan.com/prayer-times-api
   - Automatic prayer time calculation by city
   - Hijri calendar integration
   - Adjustment methods for different schools of thought

4. **WhatsApp Business API Documentation**: https://developers.facebook.com/docs/whatsapp/business-management-api
   - Template message structure for Arabic/English
   - Rate limiting considerations
   - Media attachment for schedule PDFs

5. **n8n Webhook Documentation**: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
   - Webhook security best practices
   - Response handling
   - Error recovery patterns

### Internal Documentation to Update:
- `docs/scheduling-algorithm.md` - Document the conflict resolution algorithm
- `docs/api/scheduling-endpoints.md` - API documentation for new endpoints
- `docs/database/scheduling-erd.md` - Entity relationship diagram for scheduling tables

## OTHER CONSIDERATIONS:

### Critical Business Rules:
1. **Prayer Times are Sacred**: System MUST automatically block all 5 prayer times with 15-minute buffers before and after. No sessions can be scheduled during these times.

2. **Therapist-Student Ratio**: Each student can have maximum 3 therapists assigned. System must enforce this limit.

3. **Session Minimum Duration**: All sessions must be minimum 30 minutes, maximum 2 hours.

4. **Weekend Handling**: Saudi weekend is Friday-Saturday. System must handle this differently from Western calendars.

5. **Cancellation Policy**: Parents must cancel at least 24 hours in advance or it counts as attended for billing.

### Technical Gotchas to Avoid:
1. **Timezone Complexity**: 
   - Saudi Arabia doesn't observe DST but many therapists might be remote
   - Always store in UTC, display in user's timezone
   - Test with Ramadan dates when prayer times shift significantly

2. **RTL Calendar Issues**:
   - Week starts on Saturday in Saudi Arabia, not Sunday or Monday
   - Date pickers need special RTL handling
   - Moment.js has issues with Arabic - use date-fns with locale support

3. **Concurrent Booking Prevention**:
   - Use database-level locks to prevent double-booking
   - Implement optimistic UI updates with rollback on conflict
   - Real-time updates to prevent stale calendar views

4. **Performance Considerations**:
   - Calendar views with many therapists can be slow
   - Implement virtual scrolling for week/month views
   - Cache prayer times daily rather than calculating per request
   - Use database materialized views for complex availability queries

### Cultural Sensitivity Requirements:
1. **Arabic Names First**: In Arabic interface, always show Arabic names before English transliterations

2. **Gender Preferences**: Some parents prefer same-gender therapists. System should support this preference without making it mandatory.

3. **Hijri Calendar Support**: While Gregorian is primary, show Hijri dates in Arabic interface

4. **Notification Timing**: Don't send notifications during prayer times or after Isha (night prayer)

### Integration Requirements:
1. **Google Calendar Sync** (Future Phase):
   - Two-way sync with therapist Google calendars
   - Handle Google Meet link generation for online sessions

2. **SMS Integration** (in addition to WhatsApp):
   - Fallback to SMS if WhatsApp fails
   - Support for local Saudi mobile operators

### Testing Scenarios to Cover:
1. **Conflict Scenarios**:
   - Therapist double-booked
   - Room double-booked  
   - Student has overlapping sessions
   - Session scheduled during prayer time

2. **Edge Cases**:
   - Scheduling during Ramadan (shifted prayer times)
   - Scheduling during Hajj (many therapists unavailable)
   - Bulk scheduling hitting rate limits
   - Network failure during scheduling transaction

3. **Language Scenarios**:
   - Parent uses Arabic, therapist uses English
   - Mixed language notifications
   - RTL/LTR switching mid-session

### Security & Compliance:
1. **Audit Trail**: Every schedule change must be logged with user, timestamp, and reason

2. **Data Privacy**: Parent can only see their child's schedule, not other students

3. **Rate Limiting**: Prevent abuse of bulk scheduling API

4. **GDPR/Saudi Privacy Laws**: Implement data retention policies for schedule history

### Performance Targets:
- Calendar initial load: < 1 second
- Schedule conflict check: < 200ms
- Bulk scheduling (20 sessions): < 3 seconds
- Real-time update latency: < 500ms

### File Structure to Create:
src/
├── features/
│   └── scheduling/
│       ├── components/
│       │   ├── Calendar/
│       │   │   ├── Calendar.tsx
│       │   │   ├── CalendarHeader.tsx
│       │   │   ├── CalendarView.tsx
│       │   │   └── styles.module.css
│       │   ├── ConflictResolver/
│       │   │   ├── ConflictModal.tsx
│       │   │   ├── ConflictList.tsx
│       │   │   └── ResolutionOptions.tsx
│       │   ├── TimeSlotPicker/
│       │   │   ├── TimeSlotPicker.tsx
│       │   │   ├── PrayerTimeBlocker.tsx
│       │   │   └── AvailabilityGrid.tsx
│       │   └── ScheduleForm/
│       │       ├── ScheduleForm.tsx
│       │       ├── RecurrencePattern.tsx
│       │       └── validation.ts
│       ├── hooks/
│       │   ├── useScheduling.ts
│       │   ├── useConflictDetection.ts
│       │   ├── usePrayerTimes.ts
│       │   └── useRealtimeSchedule.ts
│       ├── api/
│       │   ├── scheduling.ts
│       │   ├── conflicts.ts
│       │   └── availability.ts
│       ├── utils/
│       │   ├── schedule-algorithm.ts
│       │   ├── conflict-detector.ts
│       │   ├── prayer-times.ts
│       │   └── date-helpers.ts
│       └── types.ts
├── tests/
│   └── scheduling/
│       ├── algorithm.test.ts
│       ├── conflicts.test.ts
│       ├── arabic.test.ts
│       └── integration.test.ts
supabase/
├── functions/
│   └── schedule-webhook/
│       └── index.ts
└── migrations/
└── 20240101_scheduling_system.sql

### Environment Variables to Add:
```env
# Prayer Times API
PRAYER_API_KEY=your_aladhan_api_key
PRAYER_CALCULATION_METHOD=4  # Umm Al-Qura
DEFAULT_CITY=Riyadh
DEFAULT_COUNTRY=Saudi Arabia

# WhatsApp Business
WHATSAPP_PHONE_ID=your_phone_id
WHATSAPP_TOKEN=your_token
WHATSAPP_WEBHOOK_VERIFY=your_verify_token

# Scheduling Configuration
MAX_THERAPISTS_PER_STUDENT=3
MIN_SESSION_DURATION_MINUTES=30
MAX_SESSION_DURATION_MINUTES=120
SCHEDULE_BUFFER_MINUTES=15
CANCELLATION_NOTICE_HOURS=24

# n8n Webhook
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/schedule
N8N_WEBHOOK_SECRET=your_webhook_secret
Definition of Done:

 All scheduling features work in both Arabic and English
 Prayer times are correctly blocked with no possibility of override
 Conflict detection prevents 100% of double-bookings
 Real-time updates work across all connected clients
 WhatsApp and Email notifications sent for all schedule changes
 Mobile responsive design works on devices 320px and wider
 Performance metrics meet all targets
 90% test coverage for scheduling module
 Accessibility audit passes WCAG 2.1 AA
 Security audit passes with no critical issues
 Documentation complete in both languages


This INITIAL.md provides:

1. **Clear feature description** with specific requirements
2. **Detailed examples** from your project structure
3. **Comprehensive documentation** links
4. **Critical considerations** specific to your Saudi Arabian healthcare context
5. **Technical gotchas** that AI assistants often miss
6. **Cultural sensitivity** requirements
7. **Complete file structure** to be created
8. **Environment variables** needed
9. **Clear success criteria**

This feature request can be used with the `/generate-prp` command to create a comprehensive PRP for implementing the scheduling system.RetryClaude can make mistakes. Please double-check responses.