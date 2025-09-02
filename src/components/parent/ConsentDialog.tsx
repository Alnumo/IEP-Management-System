/**
 * Consent Dialog Component
 * Dialog for obtaining parent consent for sensitive document access
 * مكون مربع حوار الموافقة للحصول على موافقة ولي الأمر للوصول للمستندات الحساسة
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Info, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface ConsentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConsent: (consentData: ConsentData) => Promise<void>;
  documentTitle: string;
  documentTitleEn: string;
  consentType: 'sensitive_document_access' | 'medical_records_access' | 'assessment_reports_access';
  isLoading?: boolean;
}

interface ConsentData {
  consent_type: string;
  consent_details: {
    document_id: string;
    understood_risks: boolean;
    data_usage_acknowledged: boolean;
    privacy_policy_read: boolean;
    ip_address?: string;
    user_agent: string;
  };
  expires_at: string;
}

const ConsentDialog: React.FC<ConsentDialogProps> = ({
  isOpen,
  onClose,
  onConsent,
  documentTitle,
  documentTitleEn,
  consentType,
  isLoading = false
}) => {
  const { language, isRTL } = useLanguage();
  const [consentChecks, setConsentChecks] = useState({
    understoodRisks: false,
    dataUsageAcknowledged: false,
    privacyPolicyRead: false
  });
  
  const allChecksCompleted = Object.values(consentChecks).every(Boolean);

  const consentTexts = {
    sensitive_document_access: {
      title_ar: 'موافقة الوصول للمستندات الحساسة',
      title_en: 'Sensitive Document Access Consent',
      description_ar: `أنت على وشك الوصول لمستند حساس: "${documentTitle}". هذا المستند يحتوي على معلومات طبية حساسة تتطلب موافقتك الصريحة للوصول إليها.`,
      description_en: `You are about to access a sensitive document: "${documentTitleEn}". This document contains sensitive medical information that requires your explicit consent to access.`,
      risks_ar: [
        'هذا المستند يحتوي على معلومات طبية حساسة وسرية',
        'قد تتضمن المعلومات تشخيصات طبية وخطط علاجية',
        'يجب الحفاظ على سرية هذه المعلومات وعدم مشاركتها مع الغير',
        'الوصول لهذا المستند يتم تسجيله لأغراض الأمان والمراجعة'
      ],
      risks_en: [
        'This document contains sensitive and confidential medical information',
        'Information may include medical diagnoses and treatment plans',
        'You must maintain confidentiality of this information and not share with others',
        'Access to this document is logged for security and audit purposes'
      ]
    },
    medical_records_access: {
      title_ar: 'موافقة الوصول للسجلات الطبية',
      title_en: 'Medical Records Access Consent',
      description_ar: `أنت على وشك الوصول للسجلات الطبية: "${documentTitle}". هذه السجلات تحتوي على معلومات طبية حساسة جداً.`,
      description_en: `You are about to access medical records: "${documentTitleEn}". These records contain highly sensitive medical information.`,
      risks_ar: [
        'السجلات الطبية تحتوي على معلومات حساسة جداً',
        'تتضمن التاريخ المرضي الكامل والتشخيصات',
        'قد تحتوي على معلومات وراثية أو نفسية حساسة',
        'يُمنع منعاً باتاً مشاركة هذه المعلومات مع أي طرف ثالث'
      ],
      risks_en: [
        'Medical records contain highly sensitive information',
        'Include complete medical history and diagnoses',
        'May contain sensitive genetic or psychological information',
        'Sharing this information with any third party is strictly prohibited'
      ]
    },
    assessment_reports_access: {
      title_ar: 'موافقة الوصول لتقارير التقييم',
      title_en: 'Assessment Reports Access Consent',
      description_ar: `أنت على وشك الوصول لتقرير التقييم: "${documentTitle}". هذا التقرير يحتوي على نتائج تقييمات نفسية وتطورية حساسة.`,
      description_en: `You are about to access assessment report: "${documentTitleEn}". This report contains sensitive psychological and developmental evaluation results.`,
      risks_ar: [
        'تقارير التقييم تحتوي على تحليلات نفسية وتطورية دقيقة',
        'قد تتضمن توصيات علاجية وتعليمية محددة',
        'المعلومات مخصصة لولي الأمر والفريق العلاجي فقط',
        'يجب استخدام المعلومات لأغراض الرعاية والعلاج فقط'
      ],
      risks_en: [
        'Assessment reports contain detailed psychological and developmental analyses',
        'May include specific therapeutic and educational recommendations',
        'Information is intended for parent and therapeutic team only',
        'Information should be used for care and treatment purposes only'
      ]
    }
  };

  const currentTexts = consentTexts[consentType];
  const title = language === 'ar' ? currentTexts.title_ar : currentTexts.title_en;
  const description = language === 'ar' ? currentTexts.description_ar : currentTexts.description_en;
  const risks = language === 'ar' ? currentTexts.risks_ar : currentTexts.risks_en;

  const handleSubmit = async () => {
    if (!allChecksCompleted) return;

    const consentData: ConsentData = {
      consent_type: consentType,
      consent_details: {
        document_id: '', // Will be set by the caller
        understood_risks: consentChecks.understoodRisks,
        data_usage_acknowledged: consentChecks.dataUsageAcknowledged,
        privacy_policy_read: consentChecks.privacyPolicyRead,
        user_agent: navigator.userAgent
      },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    await onConsent(consentData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "max-w-2xl max-h-[90vh] overflow-y-auto",
          isRTL && "text-right"
        )}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <DialogHeader className="space-y-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-orange-500" />
            {title}
          </DialogTitle>
          
          <DialogDescription className="text-base text-gray-700">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Security Warning */}
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              {language === 'ar' 
                ? 'تحذير أمني: هذا المستند يحتوي على معلومات حساسة تتطلب الحذر في التعامل معها'
                : 'Security Warning: This document contains sensitive information requiring careful handling'
              }
            </AlertDescription>
          </Alert>

          {/* Risks and Information */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              {language === 'ar' ? 'معلومات مهمة يجب قراءتها:' : 'Important information to read:'}
            </h4>
            
            <ul className={cn(
              "space-y-2 text-sm text-gray-600",
              isRTL ? "pr-6" : "pl-6"
            )}>
              {risks.map((risk, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0",
                    isRTL ? "mr-2" : "ml-2"
                  )} />
                  {risk}
                </li>
              ))}
            </ul>
          </div>

          {/* Consent Expiration Notice */}
          <Alert className="border-blue-200 bg-blue-50">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              {language === 'ar' 
                ? 'ملاحظة: هذه الموافقة صالحة لمدة 24 ساعة فقط ويجب تجديدها بعد انتهاء هذه المدة'
                : 'Note: This consent is valid for 24 hours only and must be renewed after expiration'
              }
            </AlertDescription>
          </Alert>

          {/* Consent Checkboxes */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium">
              {language === 'ar' ? 'الموافقات المطلوبة:' : 'Required Consents:'}
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-2 rtl:space-x-reverse">
                <Checkbox
                  id="understood-risks"
                  checked={consentChecks.understoodRisks}
                  onCheckedChange={(checked) => 
                    setConsentChecks(prev => ({ ...prev, understoodRisks: !!checked }))
                  }
                />
                <label htmlFor="understood-risks" className="text-sm font-medium">
                  {language === 'ar'
                    ? 'أؤكد أنني قرأت وفهمت جميع المخاطر والتحذيرات المذكورة أعلاه'
                    : 'I confirm that I have read and understood all risks and warnings mentioned above'
                  }
                </label>
              </div>

              <div className="flex items-start space-x-2 rtl:space-x-reverse">
                <Checkbox
                  id="data-usage"
                  checked={consentChecks.dataUsageAcknowledged}
                  onCheckedChange={(checked) => 
                    setConsentChecks(prev => ({ ...prev, dataUsageAcknowledged: !!checked }))
                  }
                />
                <label htmlFor="data-usage" className="text-sm font-medium">
                  {language === 'ar'
                    ? 'أوافق على استخدام البيانات لأغراض العلاج والرعاية فقط وأتعهد بالحفاظ على سريتها'
                    : 'I agree to use the data for treatment and care purposes only and commit to maintaining confidentiality'
                  }
                </label>
              </div>

              <div className="flex items-start space-x-2 rtl:space-x-reverse">
                <Checkbox
                  id="privacy-policy"
                  checked={consentChecks.privacyPolicyRead}
                  onCheckedChange={(checked) => 
                    setConsentChecks(prev => ({ ...prev, privacyPolicyRead: !!checked }))
                  }
                />
                <label htmlFor="privacy-policy" className="text-sm font-medium">
                  {language === 'ar'
                    ? 'أقر بأنني قرأت وفهمت سياسة الخصوصية وأوافق على شروط الوصول للمستندات الحساسة'
                    : 'I acknowledge that I have read and understood the privacy policy and agree to sensitive document access terms'
                  }
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={!allChecksCompleted || isLoading}
            className={cn(
              "bg-orange-600 hover:bg-orange-700",
              !allChecksCompleted && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                {language === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
              </div>
            ) : (
              language === 'ar' ? 'موافق والمتابعة' : 'Consent & Continue'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConsentDialog;