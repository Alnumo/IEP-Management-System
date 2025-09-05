import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Stepper, Step, StepLabel } from '@/components/ui/stepper';
import { CheckCircle, AlertTriangle, Users, FileText, CreditCard } from 'lucide-react';
import { Lead } from '@/types/crm';
import { useStudentPlans, useCreateStudent, useCreateEnrollment } from '@/hooks/useStudents';
import { useUpdateLeadStatus } from '@/hooks/useLeads';
import { toast } from 'sonner';

interface LeadConversionWizardProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ConversionData {
  // Student Information
  studentData: {
    name_ar: string;
    name_en: string;
    date_of_birth: string;
    gender: 'male' | 'female' | 'not_specified';
    medical_conditions: string;
    emergency_contact: string;
    emergency_contact_relation: string;
  };
  
  // Guardian Information
  guardianData: {
    primary_guardian_name: string;
    primary_guardian_phone: string;
    primary_guardian_email: string;
    primary_guardian_relation: string;
    secondary_guardian_name?: string;
    secondary_guardian_phone?: string;
    secondary_guardian_relation?: string;
  };
  
  // Enrollment Details
  enrollmentData: {
    therapy_plan_id: string;
    start_date: string;
    sessions_per_week: number;
    session_duration: number;
    notes: string;
  };
  
  // Billing Information
  billingData: {
    payment_method: 'monthly' | 'quarterly' | 'annual' | 'per_session';
    discount_percentage: number;
    payment_notes: string;
  };
}

const LeadConversionWizard: React.FC<LeadConversionWizardProps> = ({
  lead,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { t } = useTranslation();
  const { data: therapyPlans, isLoading: plansLoading } = useStudentPlans();
  const createStudent = useCreateStudent();
  const createEnrollment = useCreateEnrollment();
  const updateLeadStatus = useUpdateLeadStatus();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [conversionData, setConversionData] = useState<ConversionData>({
    studentData: {
      name_ar: lead.child_name_ar || '',
      name_en: lead.child_name || '',
      date_of_birth: lead.child_dob || '',
      gender: (lead.child_gender as 'male' | 'female' | 'not_specified') || 'not_specified',
      medical_conditions: '',
      emergency_contact: lead.parent_contact || '',
      emergency_contact_relation: 'parent'
    },
    guardianData: {
      primary_guardian_name: lead.parent_name || '',
      primary_guardian_phone: lead.parent_contact || '',
      primary_guardian_email: lead.parent_contact_secondary || '',
      primary_guardian_relation: 'parent',
      secondary_guardian_name: '',
      secondary_guardian_phone: '',
      secondary_guardian_relation: ''
    },
    enrollmentData: {
      therapy_plan_id: '',
      start_date: new Date().toISOString().split('T')[0],
      sessions_per_week: 2,
      session_duration: 60,
      notes: lead.notes || ''
    },
    billingData: {
      payment_method: 'monthly',
      discount_percentage: 0,
      payment_notes: ''
    }
  });
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isConverting, setIsConverting] = useState(false);

  const steps = [
    { label: t('crm.conversion.student_info'), icon: Users },
    { label: t('crm.conversion.guardian_info'), icon: Users },
    { label: t('crm.conversion.enrollment_details'), icon: FileText },
    { label: t('crm.conversion.billing_info'), icon: CreditCard },
    { label: t('crm.conversion.confirmation'), icon: CheckCircle }
  ];

  // Validation functions
  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    
    switch (step) {
      case 0: // Student Information
        if (!conversionData.studentData.name_en.trim()) {
          errors.name_en = t('crm.validation.student_name_required');
        }
        if (!conversionData.studentData.date_of_birth) {
          errors.date_of_birth = t('crm.validation.dob_required');
        }
        if (!conversionData.studentData.emergency_contact.trim()) {
          errors.emergency_contact = t('crm.validation.emergency_contact_required');
        }
        break;
        
      case 1: // Guardian Information
        if (!conversionData.guardianData.primary_guardian_name.trim()) {
          errors.primary_guardian_name = t('crm.validation.guardian_name_required');
        }
        if (!conversionData.guardianData.primary_guardian_phone.trim()) {
          errors.primary_guardian_phone = t('crm.validation.guardian_phone_required');
        }
        break;
        
      case 2: // Enrollment Details
        if (!conversionData.enrollmentData.therapy_plan_id) {
          errors.therapy_plan_id = t('crm.validation.therapy_plan_required');
        }
        if (!conversionData.enrollmentData.start_date) {
          errors.start_date = t('crm.validation.start_date_required');
        }
        if (conversionData.enrollmentData.sessions_per_week < 1) {
          errors.sessions_per_week = t('crm.validation.sessions_per_week_min');
        }
        break;
        
      case 3: // Billing Information
        if (conversionData.billingData.discount_percentage < 0 || conversionData.billingData.discount_percentage > 100) {
          errors.discount_percentage = t('crm.validation.discount_invalid');
        }
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleConversion = async () => {
    if (!validateStep(currentStep)) return;
    
    setIsConverting(true);
    
    try {
      // Create student record
      const studentResult = await createStudent.mutateAsync({
        ...conversionData.studentData,
        guardian_info: conversionData.guardianData,
        source: 'lead_conversion',
        lead_id: lead.id
      });
      
      // Create enrollment
      await createEnrollment.mutateAsync({
        student_id: studentResult.id,
        ...conversionData.enrollmentData,
        billing_info: conversionData.billingData,
        converted_from_lead_id: lead.id
      });
      
      // Update lead status to registered
      await updateLeadStatus.mutateAsync({
        id: lead.id,
        status: 'registered',
        notes: `Converted to student: ${studentResult.id}`
      });
      
      toast.success(t('crm.conversion.success_message'));
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error('Lead conversion failed:', error);
      toast.error(t('crm.conversion.error_message'));
    } finally {
      setIsConverting(false);
    }
  };

  const updateConversionData = (section: keyof ConversionData, field: string, value: any) => {
    setConversionData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Student Information
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name_en">{t('crm.conversion.student_name_en')} *</Label>
                <Input
                  id="name_en"
                  value={conversionData.studentData.name_en}
                  onChange={(e) => updateConversionData('studentData', 'name_en', e.target.value)}
                  className={validationErrors.name_en ? 'border-red-500' : ''}
                />
                {validationErrors.name_en && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.name_en}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="name_ar">{t('crm.conversion.student_name_ar')}</Label>
                <Input
                  id="name_ar"
                  value={conversionData.studentData.name_ar}
                  onChange={(e) => updateConversionData('studentData', 'name_ar', e.target.value)}
                  className="text-right"
                  dir="rtl"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date_of_birth">{t('crm.conversion.date_of_birth')} *</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={conversionData.studentData.date_of_birth}
                  onChange={(e) => updateConversionData('studentData', 'date_of_birth', e.target.value)}
                  className={validationErrors.date_of_birth ? 'border-red-500' : ''}
                />
                {validationErrors.date_of_birth && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.date_of_birth}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="gender">{t('crm.conversion.gender')}</Label>
                <Select
                  value={conversionData.studentData.gender}
                  onValueChange={(value) => updateConversionData('studentData', 'gender', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('common.gender.male')}</SelectItem>
                    <SelectItem value="female">{t('common.gender.female')}</SelectItem>
                    <SelectItem value="not_specified">{t('common.gender.not_specified')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="medical_conditions">{t('crm.conversion.medical_conditions')}</Label>
              <Textarea
                id="medical_conditions"
                value={conversionData.studentData.medical_conditions}
                onChange={(e) => updateConversionData('studentData', 'medical_conditions', e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergency_contact">{t('crm.conversion.emergency_contact')} *</Label>
                <Input
                  id="emergency_contact"
                  value={conversionData.studentData.emergency_contact}
                  onChange={(e) => updateConversionData('studentData', 'emergency_contact', e.target.value)}
                  className={validationErrors.emergency_contact ? 'border-red-500' : ''}
                />
                {validationErrors.emergency_contact && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.emergency_contact}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="emergency_contact_relation">{t('crm.conversion.emergency_contact_relation')}</Label>
                <Input
                  id="emergency_contact_relation"
                  value={conversionData.studentData.emergency_contact_relation}
                  onChange={(e) => updateConversionData('studentData', 'emergency_contact_relation', e.target.value)}
                />
              </div>
            </div>
          </div>
        );
        
      case 1: // Guardian Information
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('crm.conversion.primary_guardian')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary_guardian_name">{t('crm.conversion.guardian_name')} *</Label>
                <Input
                  id="primary_guardian_name"
                  value={conversionData.guardianData.primary_guardian_name}
                  onChange={(e) => updateConversionData('guardianData', 'primary_guardian_name', e.target.value)}
                  className={validationErrors.primary_guardian_name ? 'border-red-500' : ''}
                />
                {validationErrors.primary_guardian_name && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.primary_guardian_name}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="primary_guardian_relation">{t('crm.conversion.relation')}</Label>
                <Input
                  id="primary_guardian_relation"
                  value={conversionData.guardianData.primary_guardian_relation}
                  onChange={(e) => updateConversionData('guardianData', 'primary_guardian_relation', e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary_guardian_phone">{t('crm.conversion.phone_number')} *</Label>
                <Input
                  id="primary_guardian_phone"
                  value={conversionData.guardianData.primary_guardian_phone}
                  onChange={(e) => updateConversionData('guardianData', 'primary_guardian_phone', e.target.value)}
                  className={validationErrors.primary_guardian_phone ? 'border-red-500' : ''}
                />
                {validationErrors.primary_guardian_phone && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.primary_guardian_phone}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="primary_guardian_email">{t('crm.conversion.email_address')}</Label>
                <Input
                  id="primary_guardian_email"
                  type="email"
                  value={conversionData.guardianData.primary_guardian_email}
                  onChange={(e) => updateConversionData('guardianData', 'primary_guardian_email', e.target.value)}
                />
              </div>
            </div>
            
            <h3 className="text-lg font-semibold mt-6">{t('crm.conversion.secondary_guardian')} ({t('common.optional')})</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="secondary_guardian_name">{t('crm.conversion.guardian_name')}</Label>
                <Input
                  id="secondary_guardian_name"
                  value={conversionData.guardianData.secondary_guardian_name}
                  onChange={(e) => updateConversionData('guardianData', 'secondary_guardian_name', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="secondary_guardian_relation">{t('crm.conversion.relation')}</Label>
                <Input
                  id="secondary_guardian_relation"
                  value={conversionData.guardianData.secondary_guardian_relation}
                  onChange={(e) => updateConversionData('guardianData', 'secondary_guardian_relation', e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="secondary_guardian_phone">{t('crm.conversion.phone_number')}</Label>
              <Input
                id="secondary_guardian_phone"
                value={conversionData.guardianData.secondary_guardian_phone}
                onChange={(e) => updateConversionData('guardianData', 'secondary_guardian_phone', e.target.value)}
              />
            </div>
          </div>
        );
        
      case 2: // Enrollment Details
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="therapy_plan_id">{t('crm.conversion.therapy_plan')} *</Label>
              <Select
                value={conversionData.enrollmentData.therapy_plan_id}
                onValueChange={(value) => updateConversionData('enrollmentData', 'therapy_plan_id', value)}
              >
                <SelectTrigger className={validationErrors.therapy_plan_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder={t('crm.conversion.select_therapy_plan')} />
                </SelectTrigger>
                <SelectContent>
                  {therapyPlans?.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name_en} {plan.name_ar && `(${plan.name_ar})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.therapy_plan_id && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.therapy_plan_id}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="start_date">{t('crm.conversion.start_date')} *</Label>
              <Input
                id="start_date"
                type="date"
                value={conversionData.enrollmentData.start_date}
                onChange={(e) => updateConversionData('enrollmentData', 'start_date', e.target.value)}
                className={validationErrors.start_date ? 'border-red-500' : ''}
              />
              {validationErrors.start_date && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.start_date}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sessions_per_week">{t('crm.conversion.sessions_per_week')} *</Label>
                <Input
                  id="sessions_per_week"
                  type="number"
                  min="1"
                  max="7"
                  value={conversionData.enrollmentData.sessions_per_week}
                  onChange={(e) => updateConversionData('enrollmentData', 'sessions_per_week', parseInt(e.target.value) || 0)}
                  className={validationErrors.sessions_per_week ? 'border-red-500' : ''}
                />
                {validationErrors.sessions_per_week && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.sessions_per_week}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="session_duration">{t('crm.conversion.session_duration')} ({t('common.minutes')})</Label>
                <Select
                  value={conversionData.enrollmentData.session_duration.toString()}
                  onValueChange={(value) => updateConversionData('enrollmentData', 'session_duration', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 {t('common.minutes')}</SelectItem>
                    <SelectItem value="45">45 {t('common.minutes')}</SelectItem>
                    <SelectItem value="60">60 {t('common.minutes')}</SelectItem>
                    <SelectItem value="90">90 {t('common.minutes')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="enrollment_notes">{t('crm.conversion.enrollment_notes')}</Label>
              <Textarea
                id="enrollment_notes"
                value={conversionData.enrollmentData.notes}
                onChange={(e) => updateConversionData('enrollmentData', 'notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        );
        
      case 3: // Billing Information
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="payment_method">{t('crm.conversion.payment_method')}</Label>
              <Select
                value={conversionData.billingData.payment_method}
                onValueChange={(value) => updateConversionData('billingData', 'payment_method', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t('crm.conversion.payment.monthly')}</SelectItem>
                  <SelectItem value="quarterly">{t('crm.conversion.payment.quarterly')}</SelectItem>
                  <SelectItem value="annual">{t('crm.conversion.payment.annual')}</SelectItem>
                  <SelectItem value="per_session">{t('crm.conversion.payment.per_session')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="discount_percentage">{t('crm.conversion.discount_percentage')}</Label>
              <Input
                id="discount_percentage"
                type="number"
                min="0"
                max="100"
                step="1"
                value={conversionData.billingData.discount_percentage}
                onChange={(e) => updateConversionData('billingData', 'discount_percentage', parseFloat(e.target.value) || 0)}
                className={validationErrors.discount_percentage ? 'border-red-500' : ''}
              />
              {validationErrors.discount_percentage && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.discount_percentage}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="payment_notes">{t('crm.conversion.payment_notes')}</Label>
              <Textarea
                id="payment_notes"
                value={conversionData.billingData.payment_notes}
                onChange={(e) => updateConversionData('billingData', 'payment_notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        );
        
      case 4: // Confirmation
        return (
          <div className="space-y-6">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {t('crm.conversion.confirmation_message')}
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('crm.conversion.student_summary')}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><strong>{t('crm.conversion.name')}:</strong> {conversionData.studentData.name_en}</p>
                  <p><strong>{t('crm.conversion.date_of_birth')}:</strong> {conversionData.studentData.date_of_birth}</p>
                  <p><strong>{t('crm.conversion.gender')}:</strong> {t(`common.gender.${conversionData.studentData.gender}`)}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('crm.conversion.enrollment_summary')}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><strong>{t('crm.conversion.start_date')}:</strong> {conversionData.enrollmentData.start_date}</p>
                  <p><strong>{t('crm.conversion.sessions_per_week')}:</strong> {conversionData.enrollmentData.sessions_per_week}</p>
                  <p><strong>{t('crm.conversion.payment_method')}:</strong> {t(`crm.conversion.payment.${conversionData.billingData.payment_method}`)}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('crm.conversion.convert_lead')} - {lead.parent_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <Stepper activeStep={currentStep} alternativeLabel>
            {steps.map((step, index) => (
              <Step key={index}>
                <StepLabel
                  icon={<step.icon className="h-4 w-4" />}
                  className={currentStep === index ? 'text-primary' : ''}
                >
                  {step.label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
          
          <Card>
            <CardContent className="pt-6">
              {renderStepContent()}
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            {t('common.previous')}
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isConverting}
            >
              {t('common.cancel')}
            </Button>
            
            {currentStep < steps.length - 1 ? (
              <Button onClick={handleNext}>
                {t('common.next')}
              </Button>
            ) : (
              <Button
                onClick={handleConversion}
                disabled={isConverting || Object.keys(validationErrors).length > 0}
              >
                {isConverting ? t('common.processing') : t('crm.conversion.convert_to_student')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeadConversionWizard;