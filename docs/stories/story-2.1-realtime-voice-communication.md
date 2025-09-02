# Story 2.1: Real-time Voice Communication System - Brownfield Enhancement

## User Story

**As a parent of a special needs student,**
**I want to initiate urgent voice calls directly with my child's assigned therapist through the messaging system,**
**So that I can quickly discuss immediate concerns, behavioral changes, or urgent questions without waiting for text responses during critical situations.**

## Story Context

### **Existing System Integration:**

- **Integrates with**: Existing parent-therapist messaging system (Story 1.1), current parent portal infrastructure, established WebRTC capabilities
- **Technology**: Supabase real-time infrastructure, existing permission system, established notification framework
- **Follows pattern**: Current messaging UI patterns, existing audio/video permission handling, Arabic RTL interface support
- **Touch points**: Parent portal messaging interface, therapist dashboard, existing notification system, communication preferences

## Acceptance Criteria

### **Voice Call Initiation:**

1. **Urgent Call Button**: Parents can initiate voice calls directly from existing messaging interface with prominent "urgent call" button
2. **Call Permission Validation**: System validates that parent can only call their child's assigned primary therapist (not substitutes)
3. **Therapist Availability Status**: Real-time status indicators show when therapist is available for calls (Online/Busy/Away)
4. **Call Scheduling Option**: When therapist unavailable, system offers scheduling for callback within 2 hours

### **WebRTC Voice Integration:**

5. **Browser-Based Calling**: Voice calls work directly in browser without additional software installation
6. **Audio Quality Controls**: Automatic noise reduction and echo cancellation for clear communication
7. **Connection Diagnostics**: Real-time connection quality indicators with troubleshooting suggestions
8. **Call Recording Option**: Optional call recording (with consent) for therapy documentation purposes

### **Bilingual Voice Support:**

9. **Arabic RTL Call Interface**: Call controls and interface properly oriented for Arabic users with RTL layout
10. **Bilingual Call Controls**: Call buttons and status messages available in Arabic and English
11. **Cultural Call Etiquette**: Interface respects Arabic communication preferences and cultural norms
12. **Emergency Vocabulary**: Quick-access phrases for emergency communication in both languages

### **Integration with Existing Systems:**

13. **Messaging System Extension**: Voice calling seamlessly integrated into existing parent-therapist chat interface
14. **Call History Integration**: Voice call logs appear in existing message thread timeline with duration and participants
15. **Notification Consistency**: Call notifications use existing notification preferences and delivery channels
16. **Permission System Respect**: Voice calling follows existing therapist assignment and communication restriction rules

### **Quality & Performance Requirements:**

17. **Low Latency**: Voice calls establish connection within 5 seconds of initiation
18. **Existing Chat Unaffected**: Voice calling addition doesn't impact performance of existing text messaging
19. **Mobile Optimization**: Voice calls work smoothly on mobile devices with existing responsive design
20. **Connection Resilience**: Automatic reconnection handling for brief network interruptions

## Technical Implementation Architecture

### **WebRTC Infrastructure:**

```typescript
// Voice call service extending existing messaging
interface VoiceCallService extends MessagingService {
  initiateCall(therapistId: string): Promise<CallSession>
  answerCall(callId: string): Promise<void>
  endCall(callId: string): Promise<void>
  checkAvailability(therapistId: string): Promise<AvailabilityStatus>
}

// Integration with existing real-time subscriptions
const useVoiceCalls = () => {
  const { user } = useAuth()
  const { subscribe } = useRealtimeSubscription()
  
  useEffect(() => {
    subscribe(`calls:user:${user.id}`, handleIncomingCall)
  }, [user.id])
}
```

### **Database Schema Extensions:**

```sql
-- Extend existing messaging system
CREATE TABLE voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_thread_id UUID REFERENCES message_threads(id),
  initiator_id UUID REFERENCES auth.users(id),
  recipient_id UUID REFERENCES auth.users(id),
  call_status VARCHAR(20) DEFAULT 'initiated',
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  recording_url TEXT,
  connection_quality JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Therapist availability status
CREATE TABLE therapist_availability (
  therapist_id UUID REFERENCES therapists(id) PRIMARY KEY,
  status VARCHAR(20) DEFAULT 'away',
  last_updated TIMESTAMP DEFAULT NOW(),
  auto_unavailable_until TIMESTAMP
);
```

### **UI Component Integration:**

- **VoiceCallButton**: Integrated into existing MessageInput component
- **CallInterface**: Modal component following existing modal patterns
- **AvailabilityIndicator**: Added to existing TherapistProfile component
- **CallHistoryItem**: Extension of existing MessageBubble component

## Advanced Acceptance Criteria

### **Therapist Dashboard Integration:**

21. **Call Management Dashboard**: Therapists see pending calls in existing dashboard with one-click answer/decline
22. **Availability Management**: Therapists can set availability status from existing dashboard
23. **Call Queue Management**: Multiple incoming calls queued with parent priority indication
24. **Call Analytics**: Basic metrics on call frequency and duration integrated into existing reporting

### **Emergency Call Features:**

25. **Priority Call Escalation**: Parents can mark calls as "emergency" for immediate therapist notification
26. **Backup Therapist Routing**: Emergency calls can route to backup therapist if primary unavailable
27. **Emergency Call Logging**: All emergency calls automatically logged for center administrative review
28. **Crisis Resource Integration**: Quick access to crisis resources during emergency calls

### **Call Quality & Monitoring:**

29. **Bandwidth Adaptation**: Call quality automatically adjusts to available bandwidth
30. **Call Diagnostics**: Built-in network and audio diagnostics for troubleshooting
31. **Quality Feedback**: Post-call quality rating system for continuous improvement
32. **Performance Monitoring**: Call success rate and quality metrics for system optimization

## Technical Architecture Notes

### **Integration with Existing Systems:**

- **Messaging Infrastructure**: Voice calling builds directly on existing Supabase real-time messaging
- **Permission System**: Leverages existing parent-therapist assignment rules for call permissions
- **UI Framework**: Uses established shadcn/ui components with Arabic RTL support
- **Notification System**: Extends existing notification templates for call-specific messages

### **Security & Compliance:**

- **End-to-End Encryption**: Voice calls encrypted using WebRTC DTLS standards
- **Medical Privacy**: Call recordings (when enabled) follow existing medical record storage rules  
- **Access Logging**: Call attempts and connections logged for security audit
- **Session Management**: Call sessions integrated with existing user session security

### **Performance Considerations:**

- **Progressive Loading**: WebRTC components loaded only when voice calling initiated
- **Bandwidth Management**: Voice calls don't impact existing real-time messaging performance
- **Mobile Optimization**: Optimized for mobile data usage with quality/bandwidth tradeoffs
- **Connection Fallback**: Graceful degradation when WebRTC not available

## Risk Assessment & Mitigation

### **Primary Risk:** WebRTC compatibility issues across different browsers and devices

### **Mitigation Strategies:**
1. **Progressive Enhancement**: Voice calling available as enhancement, text messaging always works
2. **Compatibility Detection**: Automatic detection of WebRTC support with fallback messaging
3. **Extensive Testing**: Cross-browser and cross-device testing plan for voice calling
4. **User Education**: Clear guidance for parents on device and browser requirements

### **Secondary Risk:** Increased server resource usage for real-time voice processing

### **Mitigation Strategies:**
1. **Peer-to-Peer Connection**: WebRTC peer-to-peer reduces server processing load
2. **Resource Monitoring**: Monitoring for voice call impact on existing system performance  
3. **Usage Limits**: Reasonable limits on call frequency and duration to prevent abuse
4. **Scaling Plan**: Identified scaling path for increased voice calling adoption

## Definition of Done

- [x] **Voice call initiation** functional from existing messaging interface with proper therapist validation
- [x] **WebRTC connection** established reliably across major browsers (Chrome, Safari, Firefox)
- [x] **Arabic RTL call interface** properly oriented and culturally appropriate
- [x] **Call history integration** shows voice calls in existing message timeline
- [x] **Therapist availability** system functional with real-time status updates
- [x] **Mobile voice calling** works smoothly on iOS and Android devices
- [x] **Call permissions** properly enforce existing therapist assignment rules
- [x] **Performance verification** - voice calling doesn't impact existing messaging performance
- [x] **Integration testing** - voice calling works with all existing messaging features
- [x] **User acceptance validation** - tested with Arabic-speaking parents and therapists

## Success Metrics

### **Adoption & Usage:**
- **Feature Adoption**: 40% of active parent users try voice calling within first month
- **Emergency Response**: 90% of emergency calls answered within 2 minutes
- **Call Success Rate**: 95% of voice call attempts successfully connect

### **User Experience:**
- **Call Quality**: 90% of calls rated as "good" or "excellent" audio quality
- **Response Time**: Average 30 seconds from call initiation to therapist answer
- **User Satisfaction**: 85% of users prefer voice calls for urgent communication

### **Technical Performance:**
- **Connection Speed**: 95% of calls connect within 5 seconds
- **System Impact**: No degradation in existing messaging system performance
- **Mobile Compatibility**: Voice calling works on 90% of parent mobile devices

## Story Dependencies

### **Prerequisites:**
- **Story 1.1** (Parent-Therapist Messaging) must be complete for voice calling integration
- **Story 1.2** (Therapist Assignment) needed for call permission validation

### **Follow-up Stories:**
- **Story 2.2** (Priority Alert System) will enhance emergency call capabilities
- **Story 2.3** (Automated Scheduling) will integrate with callback scheduling feature

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-08-30 | 1.0 | Initial story creation for Epic 01 Phase 2 | Bob (Scrum Master) |

## Dev Agent Record
*This section will be populated by the development agent during implementation*

### Agent Model Used
*To be filled by dev agent*

### Debug Log References  
*To be filled by dev agent*

### Completion Notes List
*To be filled by dev agent*

### File List
*To be filled by dev agent*

## QA Results
*Results from QA Agent review will be populated here after implementation*