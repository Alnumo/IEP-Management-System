/**
 * Lead Details Dialog Component
 * @description Comprehensive dialog for viewing and editing lead information
 * @author James (Dev Agent)
 * @date 2025-09-03
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  FileText, 
  History, 
  Edit3,
  UserPlus,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLead, useUpdateLeadStatus, useCreateInteraction } from '@/hooks/useLeads';
import { LeadStatusUpdate } from './LeadStatusUpdate';
import LeadConversionModal from './LeadConversionModal';
import type { Lead, LeadStatus, InteractionType, InteractionOutcome } from '@/types/crm';

interface LeadDetailsDialogProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDetailsDialog({ lead, open, onOpenChange }: LeadDetailsDialogProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // State for interaction form
  const [isAddingInteraction, setIsAddingInteraction] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [newInteraction, setNewInteraction] = useState({
    type: 'call' as InteractionType,
    subject: '',
    description: '',
    outcome: 'interested' as InteractionOutcome,
    duration: 0
  });

  // Fetch full lead details with audit trail and interactions
  const { data: fullLead, isLoading } = useLead(lead.id);
  const updateStatusMutation = useUpdateLeadStatus();
  const createInteractionMutation = useCreateInteraction();

  const currentLead = fullLead || lead;

  // Status color mapping
  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'new_booking': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'confirmed': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'evaluation_complete': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'registered': return 'bg-green-50 text-green-700 border-green-200';
      case 'archived': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Handle adding interaction
  const handleAddInteraction = async () => {
    if (!newInteraction.subject.trim()) return;

    try {
      await createInteractionMutation.mutateAsync({
        lead_id: lead.id,
        interaction_type: newInteraction.type,
        subject: newInteraction.subject,
        description: newInteraction.description || undefined,
        outcome: newInteraction.outcome || undefined,
        duration_minutes: newInteraction.duration > 0 ? newInteraction.duration : undefined
      });

      // Reset form
      setNewInteraction({
        type: 'call',
        subject: '',
        description: '',
        outcome: 'interested',
        duration: 0
      });
      setIsAddingInteraction(false);
    } catch (error) {
      console.error('Failed to add interaction:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isRTL && currentLead.parent_name_ar 
              ? currentLead.parent_name_ar 
              : currentLead.parent_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              {t('crm.details.tabs.overview', 'Overview')}
            </TabsTrigger>
            <TabsTrigger value="interactions">
              {t('crm.details.tabs.interactions', 'Interactions')}
            </TabsTrigger>
            <TabsTrigger value="history">
              {t('crm.details.tabs.history', 'History')}
            </TabsTrigger>
            <TabsTrigger value="actions">
              {t('crm.details.tabs.actions', 'Actions')}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[600px] mt-4">
            <TabsContent value="overview" className="space-y-6">
              {/* Lead Status and Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t('crm.details.parentInfo', 'Parent Information')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t('crm.details.parentName', 'Parent Name')}
                      </Label>
                      <p className="font-medium">
                        {isRTL && currentLead.parent_name_ar 
                          ? currentLead.parent_name_ar 
                          : currentLead.parent_name}
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t('crm.details.contact', 'Contact')}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <p>{currentLead.parent_contact}</p>
                      </div>
                      {currentLead.parent_contact_secondary && (
                        <div className="flex items-center gap-2 mt-1">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {currentLead.parent_contact_secondary}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t('crm.details.childInfo', 'Child Information')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t('crm.details.childName', 'Child Name')}
                      </Label>
                      <p className="font-medium">
                        {isRTL && currentLead.child_name_ar 
                          ? currentLead.child_name_ar 
                          : currentLead.child_name}
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t('crm.details.dateOfBirth', 'Date of Birth')}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p>
                          {format(new Date(currentLead.child_dob), 'PPP', {
                            locale: isRTL ? ar : undefined
                          })}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('crm.details.age', 'Age')}: {' '}
                        {Math.floor((new Date().getTime() - new Date(currentLead.child_dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} {t('common.years', 'years')}
                      </p>
                    </div>

                    {currentLead.child_gender && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {t('crm.details.gender', 'Gender')}
                        </Label>
                        <p>{t(`common.gender.${currentLead.child_gender}`, currentLead.child_gender)}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Status and Assignment */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {t('crm.details.status', 'Status')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className={`${getStatusColor(currentLead.status)} font-medium`}>
                      {t(`crm.status.${currentLead.status}`, currentLead.status)}
                    </Badge>
                  </CardContent>
                </Card>

                {currentLead.evaluation_date && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {t('crm.details.evaluation', 'Evaluation')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">
                        {format(new Date(currentLead.evaluation_date), 'PPp', {
                          locale: isRTL ? ar : undefined
                        })}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {currentLead.source && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        {t('crm.details.source', 'Source')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline">
                        {t(`crm.source.${currentLead.source}`, currentLead.source)}
                      </Badge>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Notes */}
              {(currentLead.notes || currentLead.evaluation_notes) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t('crm.details.notes', 'Notes')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {currentLead.notes && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {t('crm.details.generalNotes', 'General Notes')}
                        </Label>
                        <p className="text-sm">{currentLead.notes}</p>
                      </div>
                    )}
                    {currentLead.evaluation_notes && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {t('crm.details.evaluationNotes', 'Evaluation Notes')}
                        </Label>
                        <p className="text-sm">{currentLead.evaluation_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="interactions" className="space-y-6">
              {/* Add Interaction Form */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      {t('crm.details.interactions', 'Interactions')}
                    </CardTitle>
                    <Button 
                      size="sm" 
                      onClick={() => setIsAddingInteraction(!isAddingInteraction)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {t('crm.details.addInteraction', 'Add Interaction')}
                    </Button>
                  </div>
                </CardHeader>
                {isAddingInteraction && (
                  <CardContent className="border-t pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="interaction-type">
                          {t('crm.interaction.type', 'Type')}
                        </Label>
                        <Select 
                          value={newInteraction.type}
                          onValueChange={(value: InteractionType) => 
                            setNewInteraction(prev => ({ ...prev, type: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="call">{t('crm.interaction.types.call', 'Call')}</SelectItem>
                            <SelectItem value="email">{t('crm.interaction.types.email', 'Email')}</SelectItem>
                            <SelectItem value="meeting">{t('crm.interaction.types.meeting', 'Meeting')}</SelectItem>
                            <SelectItem value="whatsapp">{t('crm.interaction.types.whatsapp', 'WhatsApp')}</SelectItem>
                            <SelectItem value="note">{t('crm.interaction.types.note', 'Note')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="interaction-outcome">
                          {t('crm.interaction.outcome', 'Outcome')}
                        </Label>
                        <Select 
                          value={newInteraction.outcome}
                          onValueChange={(value: InteractionOutcome) => 
                            setNewInteraction(prev => ({ ...prev, outcome: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="interested">{t('crm.interaction.outcomes.interested', 'Interested')}</SelectItem>
                            <SelectItem value="not_interested">{t('crm.interaction.outcomes.not_interested', 'Not Interested')}</SelectItem>
                            <SelectItem value="follow_up_needed">{t('crm.interaction.outcomes.follow_up_needed', 'Follow-up Needed')}</SelectItem>
                            <SelectItem value="no_answer">{t('crm.interaction.outcomes.no_answer', 'No Answer')}</SelectItem>
                            <SelectItem value="scheduled_evaluation">{t('crm.interaction.outcomes.scheduled_evaluation', 'Scheduled Evaluation')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2">
                        <Label htmlFor="interaction-subject">
                          {t('crm.interaction.subject', 'Subject')}
                        </Label>
                        <Input
                          id="interaction-subject"
                          value={newInteraction.subject}
                          onChange={(e) => 
                            setNewInteraction(prev => ({ ...prev, subject: e.target.value }))
                          }
                          placeholder={t('crm.interaction.subjectPlaceholder', 'Brief description of the interaction')}
                        />
                      </div>

                      <div className="col-span-2">
                        <Label htmlFor="interaction-description">
                          {t('crm.interaction.description', 'Description')}
                        </Label>
                        <Textarea
                          id="interaction-description"
                          value={newInteraction.description}
                          onChange={(e) => 
                            setNewInteraction(prev => ({ ...prev, description: e.target.value }))
                          }
                          placeholder={t('crm.interaction.descriptionPlaceholder', 'Detailed notes about the interaction')}
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="interaction-duration">
                          {t('crm.interaction.duration', 'Duration (minutes)')}
                        </Label>
                        <Input
                          id="interaction-duration"
                          type="number"
                          value={newInteraction.duration}
                          onChange={(e) => 
                            setNewInteraction(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))
                          }
                          placeholder="0"
                        />
                      </div>

                      <div className="flex items-end gap-2">
                        <Button 
                          onClick={handleAddInteraction}
                          disabled={!newInteraction.subject.trim() || createInteractionMutation.isPending}
                          size="sm"
                        >
                          {t('common.save', 'Save')}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsAddingInteraction(false)}
                        >
                          {t('common.cancel', 'Cancel')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Interactions List */}
              <div className="space-y-3">
                {fullLead?.interactions?.map((interaction) => (
                  <Card key={interaction.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {interaction.interaction_type === 'call' && <Phone className="h-4 w-4" />}
                            {interaction.interaction_type === 'email' && <Mail className="h-4 w-4" />}
                            {interaction.interaction_type === 'meeting' && <User className="h-4 w-4" />}
                            {interaction.interaction_type === 'whatsapp' && <MessageSquare className="h-4 w-4" />}
                            {interaction.interaction_type === 'note' && <FileText className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{interaction.subject}</h4>
                              {interaction.outcome && (
                                <Badge variant="outline" className="text-xs">
                                  {interaction.outcome === 'interested' && <CheckCircle className="h-3 w-3 mr-1" />}
                                  {interaction.outcome === 'not_interested' && <XCircle className="h-3 w-3 mr-1" />}
                                  {t(`crm.interaction.outcomes.${interaction.outcome}`, interaction.outcome)}
                                </Badge>
                              )}
                            </div>
                            {interaction.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {interaction.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>
                                {format(new Date(interaction.interaction_date), 'PPp', {
                                  locale: isRTL ? ar : undefined
                                })}
                              </span>
                              {interaction.duration_minutes && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {interaction.duration_minutes} {t('common.minutes', 'min')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )) || (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{t('crm.details.noInteractions', 'No interactions recorded yet')}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {/* Audit Trail */}
              <div className="space-y-3">
                {fullLead?.audit_trail?.map((entry, index) => (
                  <Card key={entry.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <History className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {t(`crm.audit.${entry.action}`, entry.action)}
                          </p>
                          {entry.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {entry.notes}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(entry.performed_at), 'PPp', {
                              locale: isRTL ? ar : undefined
                            })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )) || (
                  <div className="text-center text-muted-foreground py-8">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{t('crm.details.noHistory', 'No history available')}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="actions" className="space-y-6">
              {/* Status Update */}
              <LeadStatusUpdate 
                lead={currentLead}
                onStatusUpdated={() => {
                  // Will be handled by the query invalidation in the hook
                }}
              />

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {t('crm.details.quickActions', 'Quick Actions')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="justify-start">
                      <Phone className="h-4 w-4 mr-2" />
                      {t('crm.actions.call', 'Call Parent')}
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {t('crm.actions.whatsapp', 'Send WhatsApp')}
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      {t('crm.actions.schedule', 'Schedule Evaluation')}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => setShowConversionModal(true)}
                      disabled={!['evaluation_complete', 'confirmed'].includes(currentLead.status)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t('crm.actions.convert_to_student', 'Convert to Student')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close', 'Close')}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Lead Conversion Modal */}
      <LeadConversionModal
        lead={currentLead}
        isOpen={showConversionModal}
        onClose={() => setShowConversionModal(false)}
        onSuccess={() => {
          setShowConversionModal(false);
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
}