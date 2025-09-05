/**
 * Lead Status Update Component
 * @description Component for updating lead status with validation and confirmation workflows
 * @author James (Dev Agent)
 * @date 2025-09-03
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUpdateLeadStatus, useConvertLead } from '@/hooks/useLeads';
import type { Lead, LeadStatus } from '@/types/crm';

interface LeadStatusUpdateProps {
  lead: Lead;
  onStatusUpdated?: () => void;
  className?: string;
}

// Define valid status transitions
const STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  'new_booking': ['confirmed', 'archived'],
  'confirmed': ['evaluation_complete', 'archived'],
  'evaluation_complete': ['registered', 'archived'],
  'registered': [], // Final state
  'archived': ['new_booking', 'confirmed'] // Can be reactivated
};

// Status descriptions
const STATUS_DESCRIPTIONS: Record<LeadStatus, { title: string; description: string; color: string; }> = {
  'new_booking': {
    title: 'New Booking',
    description: 'Initial evaluation booking received',
    color: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  'confirmed': {
    title: 'Confirmed',
    description: 'Parent confirmed evaluation appointment',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200'
  },
  'evaluation_complete': {
    title: 'Evaluation Complete',
    description: 'Initial evaluation completed, ready for enrollment decision',
    color: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  'registered': {
    title: 'Registered',
    description: 'Successfully converted to active student',
    color: 'bg-green-50 text-green-700 border-green-200'
  },
  'archived': {
    title: 'Archived',
    description: 'Lead is no longer active',
    color: 'bg-gray-50 text-gray-700 border-gray-200'
  }
};

export function LeadStatusUpdate({ lead, onStatusUpdated, className }: LeadStatusUpdateProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | ''>('');
  const [notes, setNotes] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const updateStatusMutation = useUpdateLeadStatus();
  const convertLeadMutation = useConvertLead();

  const currentStatus = lead.status;
  const availableTransitions = STATUS_TRANSITIONS[currentStatus] || [];

  // Handle status selection
  const handleStatusSelect = (status: LeadStatus) => {
    setSelectedStatus(status);
    setShowConfirmation(true);

    // Pre-fill notes based on status transition
    switch (status) {
      case 'confirmed':
        setNotes(t('crm.status.notes.confirmed', 'Parent confirmed evaluation appointment via phone call'));
        break;
      case 'evaluation_complete':
        setNotes(t('crm.status.notes.evaluationComplete', 'Initial evaluation session completed successfully'));
        break;
      case 'registered':
        setNotes(t('crm.status.notes.registered', 'Lead converted to active student registration'));
        break;
      case 'archived':
        setNotes(t('crm.status.notes.archived', 'Lead marked as archived'));
        break;
      default:
        setNotes('');
    }
  };

  // Handle status update confirmation
  const handleConfirmUpdate = async () => {
    if (!selectedStatus) return;

    try {
      if (selectedStatus === 'registered') {
        // Special handling for conversion to student
        await convertLeadMutation.mutateAsync({
          leadId: lead.id,
          studentData: {
            // Basic student data mapping
            name_ar: lead.child_name_ar || lead.child_name,
            name_en: lead.child_name,
            date_of_birth: lead.child_dob,
            gender: lead.child_gender || 'not_specified',
            parent_name: lead.parent_name,
            parent_phone: lead.parent_contact
          }
        });
      } else {
        // Regular status update
        await updateStatusMutation.mutateAsync({
          leadId: lead.id,
          status: selectedStatus,
          notes: notes.trim() || undefined
        });
      }

      // Reset form
      setSelectedStatus('');
      setNotes('');
      setShowConfirmation(false);
      
      onStatusUpdated?.();

    } catch (error) {
      console.error('Failed to update lead status:', error);
      // Error handling would show toast notification in real app
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setSelectedStatus('');
    setNotes('');
    setShowConfirmation(false);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          {t('crm.status.update', 'Update Status')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div>
          <Label className="text-xs text-muted-foreground">
            {t('crm.status.current', 'Current Status')}
          </Label>
          <div className="mt-2">
            <Badge className={`${STATUS_DESCRIPTIONS[currentStatus].color} font-medium`}>
              {t(`crm.status.${currentStatus}`, STATUS_DESCRIPTIONS[currentStatus].title)}
            </Badge>
            <p className="text-sm text-muted-foreground mt-1">
              {t(`crm.status.description.${currentStatus}`, STATUS_DESCRIPTIONS[currentStatus].description)}
            </p>
          </div>
        </div>

        {/* Available Transitions */}
        {availableTransitions.length > 0 ? (
          <div>
            <Label className="text-xs text-muted-foreground">
              {t('crm.status.availableActions', 'Available Actions')}
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {availableTransitions.map((status) => (
                <Button
                  key={status}
                  variant="outline"
                  size="sm"
                  className="justify-start h-auto p-3"
                  onClick={() => handleStatusSelect(status)}
                  disabled={updateStatusMutation.isPending || convertLeadMutation.isPending}
                >
                  <div className="text-left">
                    <div className="font-medium text-sm">
                      {t(`crm.status.${status}`, STATUS_DESCRIPTIONS[status].title)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t(`crm.status.description.${status}`, STATUS_DESCRIPTIONS[status].description)}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {currentStatus === 'registered' 
                ? t('crm.status.finalState', 'This lead has been successfully converted to a student.')
                : t('crm.status.noTransitions', 'No status transitions available from current state.')
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Confirmation Dialog */}
        {showConfirmation && selectedStatus && (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <h4 className="font-medium text-sm">
                {t('crm.status.confirmUpdate', 'Confirm Status Update')}
              </h4>
            </div>

            <div className="text-sm">
              <p className="text-muted-foreground">
                {t('crm.status.confirmMessage', 'You are about to change the status from:')}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">
                  {t(`crm.status.${currentStatus}`, STATUS_DESCRIPTIONS[currentStatus].title)}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Badge className={STATUS_DESCRIPTIONS[selectedStatus].color}>
                  {t(`crm.status.${selectedStatus}`, STATUS_DESCRIPTIONS[selectedStatus].title)}
                </Badge>
              </div>
            </div>

            {selectedStatus === 'registered' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {t('crm.status.conversionWarning', 'This action will create a new student record and cannot be easily undone.')}
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="status-notes" className="text-sm">
                {t('crm.status.notes', 'Notes')} 
                <span className="text-muted-foreground ml-1">
                  ({t('common.optional', 'optional')})
                </span>
              </Label>
              <Textarea
                id="status-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('crm.status.notesPlaceholder', 'Add any relevant notes about this status change...')}
                className="mt-2"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                onClick={handleConfirmUpdate}
                disabled={updateStatusMutation.isPending || convertLeadMutation.isPending}
              >
                {selectedStatus === 'registered' 
                  ? t('crm.status.convertToStudent', 'Convert to Student')
                  : t('crm.status.updateStatus', 'Update Status')
                }
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCancel}
                disabled={updateStatusMutation.isPending || convertLeadMutation.isPending}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
            </div>
          </div>
        )}

        {/* Loading and Error States */}
        {(updateStatusMutation.isPending || convertLeadMutation.isPending) && (
          <Alert>
            <AlertDescription>
              {t('crm.status.updating', 'Updating status...')}
            </AlertDescription>
          </Alert>
        )}

        {(updateStatusMutation.error || convertLeadMutation.error) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {updateStatusMutation.error?.message || convertLeadMutation.error?.message || 
                t('crm.status.error', 'Failed to update status. Please try again.')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}