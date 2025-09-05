import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertTriangle, Users, ArrowRight } from 'lucide-react';
import { Lead } from '@/types/crm';
import { useUpdateLeadStatus } from '@/hooks/useLeads';
import { toast } from 'sonner';
import LeadConversionWizard from './LeadConversionWizard';

interface LeadConversionModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const LeadConversionModal: React.FC<LeadConversionModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { t } = useTranslation();
  const updateLeadStatus = useUpdateLeadStatus();
  const [showWizard, setShowWizard] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Check if lead is eligible for conversion
  const isEligibleForConversion = (): { eligible: boolean; reasons: string[] } => {
    const reasons: string[] = [];
    
    // Check required fields
    if (!lead.child_name?.trim()) {
      reasons.push(t('crm.conversion.validation.missing_child_name'));
    }
    
    if (!lead.parent_name?.trim()) {
      reasons.push(t('crm.conversion.validation.missing_parent_name'));
    }
    
    if (!lead.parent_contact?.trim()) {
      reasons.push(t('crm.conversion.validation.missing_parent_contact'));
    }
    
    if (!lead.child_dob) {
      reasons.push(t('crm.conversion.validation.missing_child_dob'));
    }
    
    // Check lead status
    if (!['evaluation_complete', 'confirmed'].includes(lead.status)) {
      reasons.push(t('crm.conversion.validation.invalid_status'));
    }
    
    // Check for existing conversion
    if (lead.status === 'registered') {
      reasons.push(t('crm.conversion.validation.already_converted'));
    }
    
    return {
      eligible: reasons.length === 0,
      reasons
    };
  };

  const eligibilityCheck = isEligibleForConversion();

  const handleQuickConversion = async () => {
    if (!eligibilityCheck.eligible) return;
    
    setIsValidating(true);
    
    try {
      // For quick conversion, just update status to registered
      // This is for cases where manual student creation was already done
      await updateLeadStatus.mutateAsync({
        id: lead.id,
        status: 'registered',
        notes: 'Quick conversion - student record created manually'
      });
      
      toast.success(t('crm.conversion.quick_conversion_success'));
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error('Quick conversion failed:', error);
      toast.error(t('crm.conversion.quick_conversion_error'));
    } finally {
      setIsValidating(false);
    }
  };

  const handleFullConversion = () => {
    if (!eligibilityCheck.eligible) return;
    setShowWizard(true);
  };

  const handleWizardSuccess = () => {
    setShowWizard(false);
    onSuccess();
    onClose();
  };

  const calculateChildAge = (): number | null => {
    if (!lead.child_dob) return null;
    
    const birthDate = new Date(lead.child_dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const childAge = calculateChildAge();

  if (showWizard) {
    return (
      <LeadConversionWizard
        lead={lead}
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSuccess={handleWizardSuccess}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('crm.conversion.convert_lead')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Lead Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">{t('crm.lead.parent_name')}</p>
                  <p>{lead.parent_name || t('common.not_provided')}</p>
                </div>
                
                <div>
                  <p className="font-medium text-muted-foreground">{t('crm.lead.parent_contact')}</p>
                  <p>{lead.parent_contact || t('common.not_provided')}</p>
                </div>
                
                <div>
                  <p className="font-medium text-muted-foreground">{t('crm.lead.child_name')}</p>
                  <p>{lead.child_name || t('common.not_provided')}</p>
                  {lead.child_name_ar && (
                    <p className="text-right" dir="rtl">{lead.child_name_ar}</p>
                  )}
                </div>
                
                <div>
                  <p className="font-medium text-muted-foreground">{t('crm.lead.child_age')}</p>
                  <p>
                    {childAge ? `${childAge} ${t('common.years_old')}` : t('common.not_provided')}
                  </p>
                </div>
                
                <div>
                  <p className="font-medium text-muted-foreground">{t('crm.lead.status')}</p>
                  <p className="capitalize">{t(`crm.status.${lead.status}`)}</p>
                </div>
                
                <div>
                  <p className="font-medium text-muted-foreground">{t('crm.lead.evaluation_date')}</p>
                  <p>
                    {lead.evaluation_date 
                      ? new Date(lead.evaluation_date).toLocaleDateString()
                      : t('common.not_scheduled')
                    }
                  </p>
                </div>
              </div>
              
              {lead.notes && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="font-medium text-muted-foreground mb-2">{t('crm.lead.notes')}</p>
                    <p className="text-sm">{lead.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Eligibility Check */}
          {!eligibilityCheck.eligible ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div>
                  <p className="font-medium mb-2">{t('crm.conversion.not_eligible_title')}</p>
                  <ul className="list-disc list-inside space-y-1">
                    {eligibilityCheck.reasons.map((reason, index) => (
                      <li key={index} className="text-sm">{reason}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {t('crm.conversion.eligible_message')}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Conversion Options */}
          {eligibilityCheck.eligible && (
            <div className="space-y-4">
              <h3 className="font-semibold">{t('crm.conversion.choose_option')}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Quick Conversion */}
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-3">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                      <div>
                        <h4 className="font-medium">{t('crm.conversion.quick_conversion')}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('crm.conversion.quick_conversion_description')}
                        </p>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleQuickConversion}
                        disabled={isValidating}
                        className="w-full"
                      >
                        {isValidating ? t('common.processing') : t('crm.conversion.mark_as_registered')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Full Conversion */}
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-3">
                      <ArrowRight className="h-8 w-8 text-primary mx-auto" />
                      <div>
                        <h4 className="font-medium">{t('crm.conversion.full_conversion')}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('crm.conversion.full_conversion_description')}
                        </p>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={handleFullConversion}
                        className="w-full"
                      >
                        {t('crm.conversion.start_conversion')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeadConversionModal;