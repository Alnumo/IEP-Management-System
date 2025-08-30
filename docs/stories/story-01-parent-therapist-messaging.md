# Story 1.1: Parent-Therapist Real-time Messaging System - Brownfield Enhancement

## User Story

**As a parent of a special needs student,**
**I want to communicate directly with my child's assigned therapist through secure real-time messaging with photo and video sharing,**
**So that I can stay informed about therapy progress, share home practice documentation, and maintain continuous communication about my child's development.**

## Story Context

### **Existing System Integration:**

- **Integrates with**: Existing parent portal infrastructure (60% complete), therapist management system (90% complete), user authentication with RBAC (95% complete)
- **Technology**: Supabase real-time subscriptions, existing parent dashboard, current permission system
- **Follows pattern**: Existing useAuth hook pattern, shadcn/ui components, bilingual Arabic/English interface patterns
- **Touch points**: Parent portal dashboard, therapist assignment system, existing notification preferences, Supabase storage

## Acceptance Criteria

### **Functional Requirements:**

1. **Real-time Messaging**: Parents can send and receive messages instantly with their child's assigned therapist
2. **Media Attachments**: Parents can attach photos, videos, and files (max 10MB) with progress indicators
3. **Message Threading**: Conversations organized chronologically with read/unread status
4. **Bilingual Support**: All messaging interface supports Arabic RTL and English with proper typography
5. **Permission Restrictions**: Parents can ONLY message their child's assigned primary therapist (not substitutes)

### **Integration Requirements:**

6. **Existing Parent Portal Integration**: Messaging seamlessly integrated into current parent dashboard layout
7. **Therapist Assignment Respect**: Messaging respects current 1-therapist-per-session-type-per-student assignments
8. **Authentication Continuity**: Uses existing parent authentication without requiring re-login
9. **Notification System Extension**: Builds on existing notification preferences without disrupting current settings

### **Quality Requirements:**

10. **Existing Functionality Intact**: All current parent portal features (progress viewing, dashboard) continue working unchanged
11. **Performance Standards**: Message delivery under 2 seconds, media upload under 30 seconds for 5MB files
12. **Mobile Responsiveness**: Messaging interface optimized for tablets and smartphones used by parents
13. **Security Compliance**: All messages and media stored with same security standards as existing medical records

## Technical Implementation Notes

### **Integration Approach:**
- **Supabase Real-time Extension**: Extend existing Supabase real-time infrastructure for chat functionality
- **Message Storage**: New messages table with foreign keys to existing students and therapists tables
- **Media Handling**: Extend current Supabase storage bucket with organized folder structure
- **Permission Logic**: Leverage existing RBAC system with additional parent-therapist relationship validation

### **Existing Pattern References:**
- **Form Components**: Follow TherapyPlanFormDialog and StudentFormDialog validation patterns
- **Data Hooks**: Create useMessages hook following useStudents and useTherapists patterns
- **UI Components**: Use existing shadcn/ui Dialog, Button, and Input components with Arabic RTL support
- **Error Handling**: Follow existing error boundary and toast notification patterns

### **Key Technical Constraints:**
- **Must maintain**: Existing parent portal performance and responsiveness
- **Must respect**: Current therapist assignment business rules
- **Must extend**: Existing Arabic/English bilingual infrastructure
- **Must integrate**: Current notification preference system

## Advanced Acceptance Criteria

### **User Experience Requirements:**

14. **Conversation History**: Parents can view complete message history with their child's therapist
15. **Message Search**: Parents can search previous conversations by keyword (Arabic and English)
16. **Delivery Confirmation**: Parents see message delivery status (sent, delivered, read)
17. **Typing Indicators**: Real-time indication when therapist is typing response

### **Media Management Requirements:**

18. **Media Gallery**: Parents can browse shared photos and videos in organized gallery view
19. **Media Download**: Parents can download media shared by therapists for home reference
20. **Media Preview**: In-chat preview of images and videos before full-size viewing
21. **Media Organization**: Media automatically tagged by date and student for easy organization

### **Notification Integration:**

22. **Smart Notifications**: Parents receive notifications for new messages respecting existing preference settings
23. **Priority Alerts**: Important messages from therapists trigger priority notifications
24. **Digest Options**: Parents can choose immediate or daily digest notification preferences
25. **Quiet Hours**: Notification scheduling respects family quiet hours and time zones

## Definition of Done

- [x] **Core messaging functionality** implemented and tested with Arabic content
- [x] **Media sharing workflow** functional with 10MB file size support
- [x] **Parent portal integration** seamless with existing dashboard
- [x] **Therapist assignment respect** - only assigned therapists accessible
- [x] **Existing functionality verified** - all current parent portal features unchanged
- [x] **Mobile responsiveness confirmed** - tested on iOS and Android devices
- [x] **Performance benchmarks met** - messaging does not impact existing system speed
- [x] **Security validation completed** - message privacy and media access controls verified
- [x] **Bilingual testing passed** - full Arabic RTL and English functionality confirmed
- [x] **User acceptance testing** - validated with real parents and therapists

## Risk Assessment

### **Primary Risk:** Real-time messaging load could impact existing parent portal performance

### **Mitigation:** 
- Implement message pagination (50 messages per load)
- Use lazy loading for media attachments
- Optimize Supabase real-time subscription management
- Monitor performance with existing parent portal metrics

### **Rollback Plan:**
- Feature flag allows instant messaging disable
- Database messages table designed for safe deletion
- Existing parent portal functionality completely independent
- Supabase storage media can be archived without affecting core system

## Success Metrics

### **Immediate Success (Week 1-2 Post-Launch):**
- **Adoption Rate**: 70%+ of active parents start using messaging within first week
- **Engagement**: 50%+ of parents send at least one message with media attachment
- **Performance**: No degradation in existing parent portal page load times

### **Medium-term Success (Month 1-2 Post-Launch):**  
- **Daily Usage**: 80%+ of active parents check messages daily
- **Media Sharing**: Average 2+ media attachments per week per parent-therapist pair
- **User Satisfaction**: 90%+ satisfaction score for communication experience

### **Long-term Success (Month 3+ Post-Launch):**
- **Communication Quality**: Therapists report improved parent engagement and cooperation
- **Clinical Outcomes**: Measurable improvement in home practice compliance through communication
- **System Integration**: Messaging becomes integral part of therapy center workflow