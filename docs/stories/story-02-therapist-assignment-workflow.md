# Story 1.2: Advanced Therapist Assignment & Substitute Workflow - Brownfield Enhancement

## User Story

**As a therapy center administrator,**
**I want an automated therapist assignment system that ensures each student has exactly one therapist per session type with proper substitute notification and communication restrictions,**
**So that we maintain therapeutic consistency while handling staff changes transparently and professionally.**

## Story Context

### **Existing System Integration:**

- **Integrates with**: Current therapist management system (90% complete), student management (95% complete), existing assignment infrastructure
- **Technology**: Existing therapist assignment database schema, user roles system, notification infrastructure
- **Follows pattern**: Current useTherapists and useStudents hooks, existing assignment logic, established notification patterns
- **Touch points**: Therapist dashboard, student profiles, course assignments, parent communication system

## Acceptance Criteria

### **Core Assignment Rules:**

1. **One Therapist Per Session Type**: Each student automatically assigned exactly one primary therapist per therapy session type (Speech, OT, ABA, etc.)
2. **Assignment Validation**: System prevents multiple therapist assignments for same session type per student
3. **Specialization Matching**: Therapist assignments respect therapist specialization requirements
4. **Assignment History**: Complete audit trail of all therapist assignments and changes

### **Substitute Management Workflow:**

5. **Automatic Substitute Detection**: System identifies when primary therapist unavailable and triggers substitute assignment
6. **Parent Notification**: Parents automatically notified when substitute therapist assigned with substitute's basic information
7. **Communication Restrictions**: Parents can only initiate communication with primary assigned therapist, not substitutes
8. **Substitute Session Documentation**: Substitute therapists can document sessions but cannot initiate parent communication

### **Integration Requirements:**

9. **Existing Assignment System Enhancement**: Builds on current basic therapist-student assignment without breaking existing functionality
10. **Therapist Dashboard Integration**: Assignment changes reflect immediately in existing therapist dashboard calendars
11. **Parent Portal Respect**: New assignment rules integrate with existing parent portal without disrupting current access
12. **Notification System Extension**: Uses existing notification infrastructure without conflicting with current settings

### **Quality Requirements:**

13. **Existing Functionality Preserved**: All current therapist management and assignment features continue working unchanged
14. **Assignment Conflict Prevention**: System prevents assignment conflicts that could disrupt existing scheduled sessions
15. **Data Integrity**: Assignment changes maintain referential integrity with existing student and therapist records

## Technical Implementation Details

### **Database Enhancements:**
```sql
-- Extend existing assignment system
ALTER TABLE therapist_assignments 
ADD COLUMN is_primary BOOLEAN DEFAULT true,
ADD COLUMN substitute_for UUID REFERENCES therapists(id),
ADD COLUMN assignment_reason VARCHAR(100),
ADD COLUMN notification_sent BOOLEAN DEFAULT false;

-- Create assignment rules table
CREATE TABLE assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  session_type VARCHAR(50),
  primary_therapist_id UUID REFERENCES therapists(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Business Logic Implementation:**
- **Assignment Engine**: Extend existing assignment logic with business rules validation
- **Notification Service**: Enhance current notification system with assignment-specific templates
- **Permission Validator**: Create assignment-based permission checking for communication features
- **Audit System**: Extend existing audit logging for assignment changes

### **Component Integration:**
- **Assignment Manager Component**: New component integrated into existing therapist management interface
- **Assignment Rules Dashboard**: Addition to existing admin dashboard for rule management
- **Parent Notification Component**: Enhancement to existing parent portal notification system

## Advanced Acceptance Criteria

### **Assignment Rule Management:**

16. **Bulk Assignment Creation**: Administrators can create assignment rules for multiple students simultaneously
17. **Assignment Rule Templates**: Common assignment patterns saved as reusable templates
18. **Assignment Conflict Resolution**: System suggests solutions when assignment conflicts detected
19. **Assignment Analytics**: Dashboard showing assignment distribution and therapist workload

### **Substitute Management Advanced Features:**

20. **Substitute Pool Management**: Administrators can define approved substitute therapists per session type
21. **Emergency Assignment**: System enables rapid substitute assignment for urgent situations
22. **Substitute Qualification Validation**: System verifies substitute therapist meets session type requirements
23. **Substitute Performance Tracking**: Basic metrics on substitute therapist utilization

### **Communication Integration:**

24. **Assignment-Based Chat Permissions**: Messaging system automatically enforces assignment-based communication rules
25. **Substitute Communication Logs**: All substitute interactions logged for primary therapist review
26. **Assignment Change Notifications**: Parents notified when permanent assignment changes occur
27. **Communication Continuity**: Message history preserved through assignment changes

## Technical Architecture Notes

### **Integration with Existing Systems:**
- **Therapist Management**: Extends current therapist profile system with assignment rules
- **Student Profiles**: Enhances existing student profiles with assignment visualization  
- **Calendar System**: Integrates with existing calendar infrastructure for assignment scheduling
- **Permission System**: Leverages existing RBAC with assignment-specific permission layers

### **Performance Considerations:**
- **Assignment Queries**: Optimized queries to prevent impact on existing therapist and student loading
- **Real-time Updates**: Assignment changes propagated via existing Supabase real-time without additional overhead
- **Cache Management**: Assignment rules cached to prevent repeated database queries
- **Notification Batching**: Multiple assignment notifications bundled to prevent spam

## Risk Assessment & Mitigation

### **Primary Risk:** Complex assignment rules could create workflow bottlenecks or assignment conflicts

### **Mitigation Strategies:**
1. **Gradual Rollout**: Implement assignment rules center-by-center rather than system-wide
2. **Override Capabilities**: Administrators can manually override assignment rules for exceptional cases
3. **Validation Safeguards**: Extensive validation prevents invalid assignments that could break existing workflows
4. **Fallback Mode**: System can operate in "legacy mode" with simple assignments if complex rules cause issues

### **Rollback Plan:**
- **Feature Toggle**: Assignment rules can be disabled, reverting to existing simple assignment system
- **Data Preservation**: All assignment history preserved for analysis and potential re-enablement  
- **Minimal Impact**: Rollback affects only new assignment logic, existing assignments unchanged

## Definition of Done

- [x] **Assignment rule engine** implemented and tested with complex scenarios
- [x] **Substitute notification system** functional with bilingual Arabic/English templates  
- [x] **Communication restrictions** properly enforced in messaging system
- [x] **Parent notification workflow** tested with actual assignment change scenarios
- [x] **Existing therapist assignments** continue working without modification
- [x] **Assignment conflict detection** prevents invalid assignments
- [x] **Performance impact verified** - no degradation in existing therapist or student management
- [x] **Integration testing completed** - assignment system works with all existing modules
- [x] **User acceptance validation** - tested with administrators, therapists, and parents

## Success Metrics

### **Assignment Efficiency:**
- **Assignment Accuracy**: 99%+ of assignments respect session type specialization requirements
- **Conflict Prevention**: 95%+ reduction in assignment conflicts requiring manual resolution
- **Substitute Efficiency**: 100% parent notification rate for substitute assignments within 5 minutes

### **User Experience:**
- **Administrator Productivity**: 60%+ reduction in time spent on manual assignment coordination
- **Therapist Clarity**: 95%+ of therapists understand their assignments without clarification needed
- **Parent Communication**: 90%+ of parents successfully communicate only with assigned therapists

### **System Integration:**  
- **Performance Maintenance**: No increase in page load times for existing therapist and student interfaces
- **Data Integrity**: 100% accuracy in assignment data relationships with existing student and therapist records
- **Workflow Continuity**: Existing workflows continue operating without interruption during assignment rule deployment