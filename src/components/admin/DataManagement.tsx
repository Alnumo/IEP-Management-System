import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';
import {
  DownloadIcon, UploadIcon, DatabaseIcon, ShieldCheckIcon,
  FileIcon, SettingsIcon, AlertTriangleIcon,
  CheckCircleIcon, ClockIcon, RefreshCwIcon
} from 'lucide-react';
import { dataExportService, ExportOptions, BackupOptions, ExportResult } from '../../services/data-export-service';

interface BackupRecord {
  id: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  type: 'manual' | 'scheduled';
  status: 'completed' | 'failed' | 'in_progress';
  recordCount: number;
  options: BackupOptions;
}

interface ExportJob {
  id: string;
  format: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  result?: ExportResult;
  createdAt: string;
  options: ExportOptions;
}

export const DataManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [backupRecords, setBackupRecords] = useState<BackupRecord[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'json' | 'pdf'>('xlsx');
  const [backupSchedule, setBackupSchedule] = useState<string>('weekly');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const availableTables = [
    'students', 'therapists', 'therapy_sessions', 'iep_goals',
    'progress_notes', 'medical_records', 'therapy_programs',
    'courses', 'enrollments', 'attendance_records',
    'parent_communications', 'reports', 'system_settings'
  ];

  useEffect(() => {
    loadBackupHistory();
    loadExportJobs();
  }, []);

  const loadBackupHistory = async () => {
    // Mock data - replace with actual API call
    setBackupRecords([
      {
        id: '1',
        fileName: 'backup_2024-08-25.zip',
        fileSize: 15728640, // 15MB
        createdAt: '2024-08-25T10:30:00Z',
        type: 'scheduled',
        status: 'completed',
        recordCount: 12450,
        options: { includeFiles: true, includeSystemSettings: true, compression: true }
      },
      {
        id: '2',
        fileName: 'backup_2024-08-18.zip',
        fileSize: 14892356,
        createdAt: '2024-08-18T10:30:00Z',
        type: 'scheduled',
        status: 'completed',
        recordCount: 11980,
        options: { includeFiles: true, includeSystemSettings: true, compression: true }
      },
      {
        id: '3',
        fileName: 'manual_backup_2024-08-20.zip',
        fileSize: 16543210,
        createdAt: '2024-08-20T15:45:00Z',
        type: 'manual',
        status: 'completed',
        recordCount: 12200,
        options: { includeFiles: true, includeSystemSettings: true, compression: true, encryption: true }
      }
    ]);
  };

  const loadExportJobs = async () => {
    // Mock data - replace with actual API call
    setExportJobs([]);
  };

  const handleExportData = async () => {
    if (selectedTables.length === 0) {
      alert(t('Please select at least one table to export'));
      return;
    }

    setLoading(true);
    
    const exportOptions: ExportOptions = {
      format: exportFormat,
      tables: selectedTables,
      dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
      includeDeleted,
      includeSystemData: true
    };

    // Create export job
    const newJob: ExportJob = {
      id: Date.now().toString(),
      format: exportFormat,
      status: 'in_progress',
      progress: 0,
      createdAt: new Date().toISOString(),
      options: exportOptions
    };

    setExportJobs(prev => [newJob, ...prev]);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportJobs(prev => prev.map(job => 
          job.id === newJob.id && job.status === 'in_progress'
            ? { ...job, progress: Math.min(job.progress + 10, 90) }
            : job
        ));
      }, 500);

      const result = await dataExportService.exportData(exportOptions);

      clearInterval(progressInterval);

      setExportJobs(prev => prev.map(job => 
        job.id === newJob.id
          ? { 
              ...job, 
              status: result.success ? 'completed' : 'failed',
              progress: 100,
              result
            }
          : job
      ));

    } catch (error) {
      setExportJobs(prev => prev.map(job => 
        job.id === newJob.id
          ? { 
              ...job, 
              status: 'failed',
              progress: 100,
              result: { success: false, error: 'Export failed' }
            }
          : job
      ));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);

    const backupOptions: BackupOptions = {
      includeFiles: true,
      includeSystemSettings: true,
      includeUserData: true,
      compression: true,
      encryption: false
    };

    try {
      const result = await dataExportService.createBackup(backupOptions);
      
      if (result.success) {
        const newBackup: BackupRecord = {
          id: Date.now().toString(),
          fileName: result.fileName || 'backup.zip',
          fileSize: result.fileSize || 0,
          createdAt: new Date().toISOString(),
          type: 'manual',
          status: 'completed',
          recordCount: result.recordCount || 0,
          options: backupOptions
        };

        setBackupRecords(prev => [newBackup, ...prev]);
      }
    } catch (error) {
      console.error('Backup failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleBackup = async () => {
    setLoading(true);

    try {
      const success = await dataExportService.scheduleBackup(backupSchedule, {
        includeFiles: true,
        includeSystemSettings: true,
        includeUserData: true,
        compression: true
      });

      if (success) {
        alert(t('Backup schedule updated successfully'));
      } else {
        alert(t('Failed to update backup schedule'));
      }
    } catch (error) {
      alert(t('Failed to update backup schedule'));
    } finally {
      setLoading(false);
    }
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    dataExportService.importBackup(file)
      .then(result => {
        if (result.success) {
          alert(t('Backup imported successfully'));
          loadBackupHistory();
        } else {
          alert(t('Import failed: ') + result.error);
        }
      })
      .finally(() => setLoading(false));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'failed': return <AlertTriangleIcon className="h-4 w-4 text-red-600" />;
      case 'in_progress': return <RefreshCwIcon className="h-4 w-4 text-blue-600 animate-spin" />;
      default: return <ClockIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const renderExportTab = () => (
    <div className="space-y-6">
      {/* Export Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DownloadIcon className="h-5 w-5" />
            <span>{t('Data Export')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('Export Format')}</label>
              <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                  <SelectItem value="json">JSON (.json)</SelectItem>
                  <SelectItem value="pdf">PDF Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('Date Range')}</label>
              <div className="flex space-x-2">
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  placeholder={t('Start Date')}
                />
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  placeholder={t('End Date')}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('Tables to Export')}</label>
            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
              {availableTables.map(table => (
                <div key={table} className="flex items-center space-x-2">
                  <Checkbox
                    id={table}
                    checked={selectedTables.includes(table)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTables(prev => [...prev, table]);
                      } else {
                        setSelectedTables(prev => prev.filter(t => t !== table));
                      }
                    }}
                  />
                  <label htmlFor={table} className="text-sm capitalize">
                    {table.replace(/_/g, ' ')}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeDeleted"
              checked={includeDeleted}
              onCheckedChange={(checked) => setIncludeDeleted(checked === true)}
            />
            <label htmlFor="includeDeleted" className="text-sm">
              {t('Include deleted records')}
            </label>
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={handleExportData} 
              disabled={loading || selectedTables.length === 0}
              className="flex-1"
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              {t('Export Data')}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setSelectedTables(availableTables)}
              disabled={loading}
            >
              {t('Select All')}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setSelectedTables([])}
              disabled={loading}
            >
              {t('Clear All')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Export History')}</CardTitle>
        </CardHeader>
        <CardContent>
          {exportJobs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('No export jobs found')}</p>
          ) : (
            <div className="space-y-3">
              {exportJobs.map(job => (
                <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <p className="font-medium">{job.format.toUpperCase()} Export</p>
                      <p className="text-sm text-gray-600">
                        {new Date(job.createdAt).toLocaleString(i18n.language)}
                      </p>
                      {job.status === 'in_progress' && (
                        <Progress value={job.progress} className="w-48 mt-2" />
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      job.status === 'completed' ? 'default' :
                      job.status === 'failed' ? 'destructive' : 'secondary'
                    }>
                      {t(job.status)}
                    </Badge>
                    {job.result && job.result.success && (
                      <p className="text-sm text-gray-600 mt-1">
                        {job.result.recordCount} {t('records')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderBackupTab = () => (
    <div className="space-y-6">
      {/* Backup Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DatabaseIcon className="h-5 w-5" />
            <span>{t('System Backup')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Button
                onClick={handleCreateBackup}
                disabled={loading}
                className="w-full h-20 flex flex-col items-center space-y-2"
              >
                <DatabaseIcon className="h-6 w-6" />
                <span>{t('Create Manual Backup')}</span>
              </Button>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">{t('Import Backup')}</label>
              <input
                type="file"
                accept=".zip,.json"
                onChange={handleImportBackup}
                className="hidden"
                id="backup-import"
                disabled={loading}
              />
              <label htmlFor="backup-import">
                <Button
                  variant="outline"
                  disabled={loading}
                  className="w-full h-20 flex flex-col items-center space-y-2 cursor-pointer"
                  asChild
                >
                  <div>
                    <UploadIcon className="h-6 w-6" />
                    <span>{t('Import Backup')}</span>
                  </div>
                </Button>
              </label>
            </div>
          </div>

          {/* Scheduled Backup */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">{t('Automatic Backup Schedule')}</h4>
            <div className="flex items-center space-x-4">
              <Select value={backupSchedule} onValueChange={setBackupSchedule}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t('Daily')}</SelectItem>
                  <SelectItem value="weekly">{t('Weekly')}</SelectItem>
                  <SelectItem value="monthly">{t('Monthly')}</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={handleScheduleBackup} disabled={loading}>
                <SettingsIcon className="h-4 w-4 mr-2" />
                {t('Update Schedule')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Backup History')}</CardTitle>
        </CardHeader>
        <CardContent>
          {backupRecords.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('No backups found')}</p>
          ) : (
            <div className="space-y-3">
              {backupRecords.map(backup => (
                <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(backup.status)}
                    <FileIcon className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-medium">{backup.fileName}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(backup.createdAt).toLocaleString(i18n.language)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {backup.recordCount.toLocaleString()} {t('records')} • {formatFileSize(backup.fileSize)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={backup.type === 'manual' ? 'default' : 'secondary'}>
                      {t(backup.type)}
                    </Badge>
                    {backup.options.encryption && (
                      <Badge variant="outline">
                        <ShieldCheckIcon className="h-3 w-3 mr-1" />
                        {t('Encrypted')}
                      </Badge>
                    )}
                    <Button variant="outline" size="sm">
                      <DownloadIcon className="h-4 w-4 mr-1" />
                      {t('Download')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('Data Management Settings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Retention Settings */}
          <div>
            <h4 className="font-medium mb-3">{t('Data Retention')}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('Keep backups for')}</label>
                <Select defaultValue="90days">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30days">30 {t('days')}</SelectItem>
                    <SelectItem value="90days">90 {t('days')}</SelectItem>
                    <SelectItem value="6months">6 {t('months')}</SelectItem>
                    <SelectItem value="1year">1 {t('year')}</SelectItem>
                    <SelectItem value="forever">{t('Forever')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">{t('Maximum backup size')}</label>
                <Select defaultValue="100mb">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50mb">50 MB</SelectItem>
                    <SelectItem value="100mb">100 MB</SelectItem>
                    <SelectItem value="500mb">500 MB</SelectItem>
                    <SelectItem value="1gb">1 GB</SelectItem>
                    <SelectItem value="unlimited">{t('Unlimited')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">{t('Security Settings')}</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="encrypt-backups" defaultChecked />
                <label htmlFor="encrypt-backups" className="text-sm">
                  {t('Encrypt all backups')}
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox id="require-auth" defaultChecked />
                <label htmlFor="require-auth" className="text-sm">
                  {t('Require authentication for data export')}
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox id="audit-log" defaultChecked />
                <label htmlFor="audit-log" className="text-sm">
                  {t('Log all data management activities')}
                </label>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">{t('Notifications')}</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="backup-success" defaultChecked />
                <label htmlFor="backup-success" className="text-sm">
                  {t('Notify on successful backups')}
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox id="backup-failure" defaultChecked />
                <label htmlFor="backup-failure" className="text-sm">
                  {t('Notify on backup failures')}
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox id="export-complete" />
                <label htmlFor="export-complete" className="text-sm">
                  {t('Notify when exports are complete')}
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold">{t('Data Management')}</h2>
          <p className="text-gray-600">{t('Export data, create backups, and manage system data')}</p>
        </div>
        
        <Button variant="outline" onClick={loadBackupHistory} disabled={loading}>
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          {t('Refresh')}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="export">{t('Data Export')}</TabsTrigger>
          <TabsTrigger value="backup">{t('Backup & Restore')}</TabsTrigger>
          <TabsTrigger value="settings">{t('Settings')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="export">{renderExportTab()}</TabsContent>
        <TabsContent value="backup">{renderBackupTab()}</TabsContent>
        <TabsContent value="settings">{renderSettingsTab()}</TabsContent>
      </Tabs>
    </div>
  );
};