import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Upload, 
  Download, 
  FileX, 
  CheckSquare, 
  AlertTriangle, 
  RefreshCw,
  FileText,
  Package,
  Users,
  Calendar,
  Filter,
  X,
  Check,
  Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

import type { 
  IEP, 
  IEPStatus, 
  IEPWorkflowStage,
  StudentBasicInfo
} from '@/types/iep';

interface IEPBulkOperationsProps {
  selectedIEPs: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  language: 'ar' | 'en';
  className?: string;
}

interface BulkOperation {
  id: string;
  type: 'status_update' | 'workflow_update' | 'assignment_update' | 'deadline_update' | 'export' | 'delete';
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  icon: React.ReactNode;
  requiresConfirmation: boolean;
  destructive?: boolean;
}

interface ImportResult {
  successful: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

interface ExportOptions {
  format: 'csv' | 'excel' | 'json' | 'pdf_batch';
  includeMetadata: boolean;
  includeGoals: boolean;
  includeServices: boolean;
  includeAccommodations: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface BatchUpdateData {
  status?: IEPStatus;
  workflowStage?: IEPWorkflowStage;
  assignedTherapist?: string;
  reviewDate?: Date;
  meetingDate?: Date;
}

const IEPBulkOperations: React.FC<IEPBulkOperationsProps> = ({
  selectedIEPs,
  onSelectionChange,
  language,
  className
}) => {
  const { t } = useTranslation();
  const isRTL = language === 'ar';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'batch'>('batch');
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [exportProgress, setExportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null);
  const [batchUpdateData, setBatchUpdateData] = useState<BatchUpdateData>({});
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    includeMetadata: true,
    includeGoals: true,
    includeServices: true,
    includeAccommodations: true
  });

  // Available bulk operations
  const bulkOperations: BulkOperation[] = [
    {
      id: 'status_update',
      type: 'status_update',
      name_ar: 'تحديث حالة البرنامج',
      name_en: 'Update IEP Status',
      description_ar: 'تحديث حالة البرامج التعليمية المختارة',
      description_en: 'Update status of selected IEPs',
      icon: <RefreshCw className="w-4 h-4" />,
      requiresConfirmation: true
    },
    {
      id: 'workflow_update',
      type: 'workflow_update',
      name_ar: 'تحديث مرحلة سير العمل',
      name_en: 'Update Workflow Stage',
      description_ar: 'نقل البرامج إلى مرحلة جديدة في سير العمل',
      description_en: 'Move IEPs to new workflow stage',
      icon: <CheckSquare className="w-4 h-4" />,
      requiresConfirmation: true
    },
    {
      id: 'assignment_update',
      type: 'assignment_update',
      name_ar: 'تحديث تعيين المعالج',
      name_en: 'Update Therapist Assignment',
      description_ar: 'تعيين معالج جديد للبرامج المختارة',
      description_en: 'Assign new therapist to selected IEPs',
      icon: <Users className="w-4 h-4" />,
      requiresConfirmation: true
    },
    {
      id: 'deadline_update',
      type: 'deadline_update',
      name_ar: 'تحديث مواعيد المراجعة',
      name_en: 'Update Review Dates',
      description_ar: 'تحديث مواعيد المراجعة والاجتماعات',
      description_en: 'Update review and meeting dates',
      icon: <Calendar className="w-4 h-4" />,
      requiresConfirmation: true
    },
    {
      id: 'export',
      type: 'export',
      name_ar: 'تصدير البرامج',
      name_en: 'Export IEPs',
      description_ar: 'تصدير البرامج المختارة بصيغ مختلفة',
      description_en: 'Export selected IEPs in various formats',
      icon: <Download className="w-4 h-4" />,
      requiresConfirmation: false
    },
    {
      id: 'delete',
      type: 'delete',
      name_ar: 'حذف البرامج',
      name_en: 'Delete IEPs',
      description_ar: 'حذف البرامج المختارة نهائياً',
      description_en: 'Permanently delete selected IEPs',
      icon: <FileX className="w-4 h-4" />,
      requiresConfirmation: true,
      destructive: true
    }
  ];

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', language);

      setIsImporting(true);
      setImportProgress(0);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      try {
        const response = await fetch('/api/iep/bulk-import', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Import failed');
        }

        const result = await response.json();
        clearInterval(progressInterval);
        setImportProgress(100);

        return result;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      } finally {
        setIsImporting(false);
      }
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ['ieps'] });
      
      toast({
        title: t('success.bulk_import_completed'),
        description: t('success.bulk_import_description', {
          successful: result.successful,
          failed: result.failed
        }),
        variant: result.failed > 0 ? 'warning' : 'success'
      });
    },
    onError: (error) => {
      toast({
        title: t('errors.bulk_import_failed'),
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async (options: ExportOptions & { iepIds: string[] }) => {
      setIsExporting(true);
      setExportProgress(0);

      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 15, 90));
      }, 300);

      try {
        const response = await fetch('/api/iep/bulk-export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(options),
        });

        if (!response.ok) {
          throw new Error('Export failed');
        }

        const blob = await response.blob();
        clearInterval(progressInterval);
        setExportProgress(100);

        // Download file
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ieps_export_${new Date().toISOString().split('T')[0]}.${options.format === 'excel' ? 'xlsx' : options.format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return blob;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      } finally {
        setIsExporting(false);
      }
    },
    onSuccess: () => {
      toast({
        title: t('success.export_completed'),
        description: t('success.export_description'),
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: t('errors.export_failed'),
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Batch update mutation
  const batchUpdateMutation = useMutation({
    mutationFn: async (data: BatchUpdateData & { iepIds: string[] }) => {
      setIsBatchUpdating(true);

      const response = await fetch('/api/iep/batch-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Batch update failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ieps'] });
      onSelectionChange([]);
      setSelectedOperation(null);
      setBatchUpdateData({});
      
      toast({
        title: t('success.batch_update_completed'),
        description: t('success.batch_update_description', {
          count: selectedIEPs.length
        }),
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: t('errors.batch_update_failed'),
        description: error.message,
        variant: 'destructive'
      });
    },
    onSettled: () => {
      setIsBatchUpdating(false);
    }
  });

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
    }
  };

  const handleBatchUpdate = () => {
    if (!selectedOperation || selectedIEPs.length === 0) return;

    const updateData = {
      ...batchUpdateData,
      iepIds: selectedIEPs,
      operation: selectedOperation.type
    };

    batchUpdateMutation.mutate(updateData);
  };

  const handleExport = () => {
    if (selectedIEPs.length === 0) return;

    const exportData = {
      ...exportOptions,
      iepIds: selectedIEPs
    };

    exportMutation.mutate(exportData);
  };

  const renderBatchOperationForm = () => {
    if (!selectedOperation) return null;

    switch (selectedOperation.type) {
      case 'status_update':
        return (
          <div className="space-y-4">
            <div>
              <Label className={isRTL ? 'text-right' : ''}>
                {t('forms.new_status')}
              </Label>
              <Select 
                value={batchUpdateData.status} 
                onValueChange={(value) => setBatchUpdateData(prev => ({ ...prev, status: value as IEPStatus }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('forms.select_status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t('status.draft')}</SelectItem>
                  <SelectItem value="active">{t('status.active')}</SelectItem>
                  <SelectItem value="under_review">{t('status.under_review')}</SelectItem>
                  <SelectItem value="completed">{t('status.completed')}</SelectItem>
                  <SelectItem value="archived">{t('status.archived')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'workflow_update':
        return (
          <div className="space-y-4">
            <div>
              <Label className={isRTL ? 'text-right' : ''}>
                {t('forms.new_workflow_stage')}
              </Label>
              <Select 
                value={batchUpdateData.workflowStage} 
                onValueChange={(value) => setBatchUpdateData(prev => ({ ...prev, workflowStage: value as IEPWorkflowStage }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('forms.select_workflow_stage')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="referral">{t('workflow.referral')}</SelectItem>
                  <SelectItem value="evaluation">{t('workflow.evaluation')}</SelectItem>
                  <SelectItem value="development">{t('workflow.development')}</SelectItem>
                  <SelectItem value="implementation">{t('workflow.implementation')}</SelectItem>
                  <SelectItem value="review">{t('workflow.review')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'assignment_update':
        return (
          <div className="space-y-4">
            <div>
              <Label className={isRTL ? 'text-right' : ''}>
                {t('forms.assigned_therapist')}
              </Label>
              <Select 
                value={batchUpdateData.assignedTherapist} 
                onValueChange={(value) => setBatchUpdateData(prev => ({ ...prev, assignedTherapist: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('forms.select_therapist')} />
                </SelectTrigger>
                <SelectContent>
                  {/* This would be populated from therapists query */}
                  <SelectItem value="therapist1">Dr. Ahmed Al-Rashid</SelectItem>
                  <SelectItem value="therapist2">Dr. Fatima Al-Zahra</SelectItem>
                  <SelectItem value="therapist3">Dr. Mohammad Al-Khaldi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'deadline_update':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className={isRTL ? 'text-right' : ''}>
                {t('forms.review_date')}
              </Label>
              <Input
                type="date"
                value={batchUpdateData.reviewDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setBatchUpdateData(prev => ({ 
                  ...prev, 
                  reviewDate: e.target.value ? new Date(e.target.value) : undefined 
                }))}
                className={isRTL ? 'text-right' : ''}
              />
            </div>
            <div>
              <Label className={isRTL ? 'text-right' : ''}>
                {t('forms.meeting_date')}
              </Label>
              <Input
                type="date"
                value={batchUpdateData.meetingDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setBatchUpdateData(prev => ({ 
                  ...prev, 
                  meetingDate: e.target.value ? new Date(e.target.value) : undefined 
                }))}
                className={isRTL ? 'text-right' : ''}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Package className="w-5 h-5" />
          {t('iep.bulk_operations')}
          {selectedIEPs.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedIEPs.length} {t('common.selected')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="batch">{t('tabs.batch_operations')}</TabsTrigger>
            <TabsTrigger value="import">{t('tabs.import')}</TabsTrigger>
            <TabsTrigger value="export">{t('tabs.export')}</TabsTrigger>
          </TabsList>

          {/* Batch Operations Tab */}
          <TabsContent value="batch" className="space-y-6">
            {selectedIEPs.length === 0 ? (
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  {t('alerts.select_ieps_for_batch_operations')}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bulkOperations.map((operation) => (
                    <div
                      key={operation.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedOperation?.id === operation.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      } ${operation.destructive ? 'border-destructive/50' : ''}`}
                      onClick={() => setSelectedOperation(operation)}
                    >
                      <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`mt-0.5 ${operation.destructive ? 'text-destructive' : 'text-primary'}`}>
                          {operation.icon}
                        </div>
                        <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
                          <h4 className="font-medium">
                            {language === 'ar' ? operation.name_ar : operation.name_en}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {language === 'ar' ? operation.description_ar : operation.description_en}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedOperation && (
                  <Card className="p-4">
                    <div className="space-y-4">
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="text-primary">{selectedOperation.icon}</div>
                        <h3 className="font-medium">
                          {language === 'ar' ? selectedOperation.name_ar : selectedOperation.name_en}
                        </h3>
                      </div>

                      {renderBatchOperationForm()}

                      <Separator />

                      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {t('common.selected_count', { count: selectedIEPs.length })}
                          </span>
                        </div>

                        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Button
                            variant="outline"
                            onClick={() => setSelectedOperation(null)}
                          >
                            {t('actions.cancel')}
                          </Button>
                          <Button
                            onClick={handleBatchUpdate}
                            disabled={isBatchUpdating}
                            variant={selectedOperation.destructive ? 'destructive' : 'default'}
                          >
                            {isBatchUpdating ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              selectedOperation.icon
                            )}
                            {t('actions.apply')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">{t('import.supported_formats')}</h3>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">CSV</Badge>
                  <Badge variant="outline">Excel (.xlsx)</Badge>
                  <Badge variant="outline">JSON</Badge>
                </div>
              </div>

              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.json"
                  onChange={handleFileImport}
                  className="hidden"
                />
                
                <div className="space-y-4">
                  <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </div>
                  
                  <div>
                    <h3 className="font-medium">{t('import.drag_drop_or_click')}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('import.supported_file_types')}
                    </p>
                  </div>

                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                  >
                    {isImporting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {t('actions.select_file')}
                  </Button>
                </div>
              </div>

              {isImporting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('import.importing')}</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} className="h-2" />
                </div>
              )}

              {importResult && (
                <Alert variant={importResult.failed > 0 ? "destructive" : "default"}>
                  <CheckSquare className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>
                        {t('import.result_summary', {
                          successful: importResult.successful,
                          failed: importResult.failed
                        })}
                      </p>
                      
                      {importResult.errors.length > 0 && (
                        <ScrollArea className="h-24 w-full border rounded p-2">
                          <div className="space-y-1">
                            {importResult.errors.map((error, index) => (
                              <p key={index} className="text-xs text-destructive">
                                • {error}
                              </p>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-6">
            {selectedIEPs.length === 0 ? (
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  {t('alerts.select_ieps_for_export')}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className={isRTL ? 'text-right' : ''}>
                        {t('export.format')}
                      </Label>
                      <Select 
                        value={exportOptions.format}
                        onValueChange={(value) => setExportOptions(prev => ({ 
                          ...prev, 
                          format: value as ExportOptions['format']
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="pdf_batch">PDF Batch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className={isRTL ? 'text-right' : ''}>
                      {t('export.include_sections')}
                    </Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-metadata"
                          checked={exportOptions.includeMetadata}
                          onCheckedChange={(checked) => 
                            setExportOptions(prev => ({ ...prev, includeMetadata: checked as boolean }))
                          }
                        />
                        <Label htmlFor="include-metadata" className="text-sm">
                          {t('export.metadata')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-goals"
                          checked={exportOptions.includeGoals}
                          onCheckedChange={(checked) => 
                            setExportOptions(prev => ({ ...prev, includeGoals: checked as boolean }))
                          }
                        />
                        <Label htmlFor="include-goals" className="text-sm">
                          {t('export.goals')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-services"
                          checked={exportOptions.includeServices}
                          onCheckedChange={(checked) => 
                            setExportOptions(prev => ({ ...prev, includeServices: checked as boolean }))
                          }
                        />
                        <Label htmlFor="include-services" className="text-sm">
                          {t('export.services')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-accommodations"
                          checked={exportOptions.includeAccommodations}
                          onCheckedChange={(checked) => 
                            setExportOptions(prev => ({ ...prev, includeAccommodations: checked as boolean }))
                          }
                        />
                        <Label htmlFor="include-accommodations" className="text-sm">
                          {t('export.accommodations')}
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>

                {isExporting && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t('export.exporting')}</span>
                      <span>{exportProgress}%</span>
                    </div>
                    <Progress value={exportProgress} className="h-2" />
                  </div>
                )}

                <div className={`flex gap-3 pt-4 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="min-w-32"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    {t('actions.export')}
                  </Button>
                  
                  <Badge variant="outline" className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {selectedIEPs.length} {t('common.items')}
                  </Badge>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default IEPBulkOperations;