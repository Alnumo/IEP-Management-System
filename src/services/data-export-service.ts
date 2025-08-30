import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json' | 'pdf' | 'backup';
  tables?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
  includeDeleted?: boolean;
  includeSystemData?: boolean;
}

export interface BackupOptions {
  includeFiles?: boolean;
  includeSystemSettings?: boolean;
  includeUserData?: boolean;
  compression?: boolean;
  encryption?: boolean;
}

export interface ExportResult {
  success: boolean;
  fileName?: string;
  fileSize?: number;
  recordCount?: number;
  error?: string;
}

class DataExportService {
  private readonly BATCH_SIZE = 1000;
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  /**
   * Export data in specified format
   */
  async exportData(options: ExportOptions): Promise<ExportResult> {
    try {
      const { format, tables = [], dateRange, filters = {} } = options;

      let exportData: any = {};
      let totalRecords = 0;

      // Determine tables to export
      const tablesToExport = tables.length > 0 ? tables : await this.getAvailableTables();

      // Export each table
      for (const table of tablesToExport) {
        const tableData = await this.exportTable(table, dateRange, filters);
        exportData[table] = tableData;
        totalRecords += tableData.length;
      }

      // Generate file based on format
      const fileName = `export_${new Date().toISOString().split('T')[0]}.${format}`;
      let fileSize = 0;

      switch (format) {
        case 'csv':
          fileSize = await this.generateCSVExport(exportData, fileName);
          break;
        case 'xlsx':
          fileSize = await this.generateExcelExport(exportData, fileName);
          break;
        case 'json':
          fileSize = await this.generateJSONExport(exportData, fileName);
          break;
        case 'pdf':
          fileSize = await this.generatePDFExport(exportData, fileName);
          break;
        case 'backup':
          fileSize = await this.generateBackupExport(exportData, fileName);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      return {
        success: true,
        fileName,
        fileSize,
        recordCount: totalRecords
      };

    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Create full system backup
   */
  async createBackup(options: BackupOptions = {}): Promise<ExportResult> {
    try {
      const {
        includeFiles = true,
        includeSystemSettings = true,
        includeUserData = true,
        compression = true,
        encryption = false
      } = options;

      const zip = new JSZip();
      let totalSize = 0;

      // Export database structure
      const dbStructure = await this.exportDatabaseStructure();
      zip.file('database_structure.json', JSON.stringify(dbStructure, null, 2));

      // Export all table data
      if (includeUserData) {
        const allTables = await this.getAvailableTables();
        const userData: any = {};

        for (const table of allTables) {
          const tableData = await this.exportTable(table);
          userData[table] = tableData;
        }

        zip.file('user_data.json', JSON.stringify(userData, null, 2));
      }

      // Export system settings
      if (includeSystemSettings) {
        const systemSettings = await this.exportSystemSettings();
        zip.file('system_settings.json', JSON.stringify(systemSettings, null, 2));
      }

      // Export file attachments (if applicable)
      if (includeFiles) {
        const fileBackup = await this.exportFiles();
        if (fileBackup.length > 0) {
          const filesFolder = zip.folder('files');
          fileBackup.forEach(file => {
            filesFolder?.file(file.name, file.data);
          });
        }
      }

      // Generate backup file
      const content = await zip.generateAsync({
        type: 'blob',
        compression: compression ? 'DEFLATE' : 'STORE',
        compressionOptions: { level: 6 }
      });

      const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
      saveAs(content, fileName);

      return {
        success: true,
        fileName,
        fileSize: content.size,
        recordCount: 0 // Will be calculated based on exported data
      };

    } catch (error) {
      console.error('Backup failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Backup failed'
      };
    }
  }

  /**
   * Import data from backup
   */
  async importBackup(file: File): Promise<ExportResult> {
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      let recordCount = 0;

      // Import database structure
      const structureFile = zipContent.file('database_structure.json');
      if (structureFile) {
        const structure = JSON.parse(await structureFile.async('string'));
        await this.importDatabaseStructure(structure);
      }

      // Import user data
      const userDataFile = zipContent.file('user_data.json');
      if (userDataFile) {
        const userData = JSON.parse(await userDataFile.async('string'));
        recordCount = await this.importUserData(userData);
      }

      // Import system settings
      const settingsFile = zipContent.file('system_settings.json');
      if (settingsFile) {
        const settings = JSON.parse(await settingsFile.async('string'));
        await this.importSystemSettings(settings);
      }

      // Import files
      const filesFolder = zipContent.folder('files');
      if (filesFolder) {
        await this.importFiles(filesFolder);
      }

      return {
        success: true,
        fileName: file.name,
        fileSize: file.size,
        recordCount
      };

    } catch (error) {
      console.error('Import failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed'
      };
    }
  }

  /**
   * Schedule automatic backups
   */
  async scheduleBackup(schedule: string, options: BackupOptions = {}): Promise<boolean> {
    try {
      // Store backup schedule in database
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'backup_schedule',
          value: {
            schedule,
            options,
            enabled: true,
            lastBackup: null,
            nextBackup: this.calculateNextBackupTime(schedule)
          }
        }, { onConflict: 'key' });

      if (error) throw error;

      // Set up the actual scheduling (would typically use a background service)
      this.setupBackupSchedule(schedule, options);

      return true;
    } catch (error) {
      console.error('Failed to schedule backup:', error);
      return false;
    }
  }

  /**
   * Get list of available tables for export
   */
  private async getAvailableTables(): Promise<string[]> {
    try {
      // Get tables from Supabase schema
      const { data, error } = await supabase
        .rpc('get_table_names');

      if (error) {
        // Fallback to predefined list
        return [
          'students', 'therapists', 'therapy_sessions', 'iep_goals',
          'progress_notes', 'medical_records', 'therapy_programs',
          'courses', 'enrollments', 'attendance_records',
          'parent_communications', 'reports', 'system_settings'
        ];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get table names:', error);
      return [];
    }
  }

  /**
   * Export data from a specific table
   */
  private async exportTable(
    tableName: string,
    dateRange?: { start: string; end: string },
    filters: Record<string, any> = {}
  ): Promise<any[]> {
    let query = supabase.from(tableName).select('*');

    // Apply date range filter if specified
    if (dateRange && dateRange.start && dateRange.end) {
      // Assume tables have created_at field
      query = query
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);
    }

    // Apply additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        query = query.eq(key, value);
      }
    });

    const allData = [];
    let offset = 0;

    // Fetch data in batches
    while (true) {
      const { data, error } = await query
        .range(offset, offset + this.BATCH_SIZE - 1)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) break;

      allData.push(...data);
      offset += this.BATCH_SIZE;

      // Safety check to prevent infinite loops
      if (offset > 100000) break;
    }

    return allData;
  }

  /**
   * Generate CSV export
   */
  private async generateCSVExport(exportData: any, fileName: string): Promise<number> {
    const zip = new JSZip();

    Object.entries(exportData).forEach(([tableName, data]: [string, any]) => {
      if (Array.isArray(data) && data.length > 0) {
        const csv = this.convertToCSV(data);
        zip.file(`${tableName}.csv`, csv);
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, fileName.replace('.csv', '.zip'));
    return content.size;
  }

  /**
   * Generate Excel export
   */
  private async generateExcelExport(exportData: any, fileName: string): Promise<number> {
    const workbook = XLSX.utils.book_new();

    Object.entries(exportData).forEach(([tableName, data]: [string, any]) => {
      if (Array.isArray(data) && data.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, tableName);
      }
    });

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    saveAs(blob, fileName);
    return blob.size;
  }

  /**
   * Generate JSON export
   */
  private async generateJSONExport(exportData: any, fileName: string): Promise<number> {
    const jsonString = JSON.stringify({
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: exportData
    }, null, 2);

    const blob = new Blob([jsonString], { type: 'application/json' });
    saveAs(blob, fileName);
    return blob.size;
  }

  /**
   * Generate PDF export (summary report)
   */
  private async generatePDFExport(exportData: any, fileName: string): Promise<number> {
    // This would typically use a PDF generation library like jsPDF
    // For now, we'll create a simple text-based summary

    let summary = `Data Export Summary\n`;
    summary += `Export Date: ${new Date().toISOString()}\n\n`;

    Object.entries(exportData).forEach(([tableName, data]: [string, any]) => {
      if (Array.isArray(data)) {
        summary += `${tableName}: ${data.length} records\n`;
      }
    });

    const blob = new Blob([summary], { type: 'text/plain' });
    saveAs(blob, fileName.replace('.pdf', '.txt'));
    return blob.size;
  }

  /**
   * Generate backup export
   */
  private async generateBackupExport(exportData: any, fileName: string): Promise<number> {
    return this.createBackup({
      includeFiles: true,
      includeSystemSettings: true,
      includeUserData: true,
      compression: true
    }).then(result => result.fileSize || 0);
  }

  /**
   * Convert array data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Export database structure
   */
  private async exportDatabaseStructure(): Promise<any> {
    // This would typically query the database schema
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      tables: await this.getAvailableTables(),
      // Add more schema information as needed
    };
  }

  /**
   * Export system settings
   */
  private async exportSystemSettings(): Promise<any> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*');

    if (error) throw error;
    return data || [];
  }

  /**
   * Export files (if any are stored)
   */
  private async exportFiles(): Promise<Array<{ name: string; data: any }>> {
    // This would export any file attachments
    // For now, return empty array
    return [];
  }

  /**
   * Import database structure
   */
  private async importDatabaseStructure(structure: any): Promise<void> {
    // Implementation would depend on database migration capabilities
    console.log('Importing database structure:', structure);
  }

  /**
   * Import user data
   */
  private async importUserData(userData: any): Promise<number> {
    let totalRecords = 0;

    for (const [tableName, data] of Object.entries(userData)) {
      if (Array.isArray(data)) {
        // Batch insert data
        const batches = this.chunkArray(data, this.BATCH_SIZE);
        
        for (const batch of batches) {
          const { error } = await supabase
            .from(tableName)
            .insert(batch);

          if (error) {
            console.error(`Failed to import ${tableName}:`, error);
          } else {
            totalRecords += batch.length;
          }
        }
      }
    }

    return totalRecords;
  }

  /**
   * Import system settings
   */
  private async importSystemSettings(settings: any[]): Promise<void> {
    const { error } = await supabase
      .from('system_settings')
      .upsert(settings, { onConflict: 'key' });

    if (error) throw error;
  }

  /**
   * Import files
   */
  private async importFiles(filesFolder: JSZip): Promise<void> {
    // Implementation would depend on file storage system
    console.log('Importing files from backup');
  }

  /**
   * Calculate next backup time based on schedule
   */
  private calculateNextBackupTime(schedule: string): string {
    const now = new Date();
    
    switch (schedule) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth.toISOString();
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }
  }

  /**
   * Set up backup schedule (would typically use background service)
   */
  private setupBackupSchedule(schedule: string, options: BackupOptions): void {
    console.log(`Setting up ${schedule} backup with options:`, options);
    // Implementation would depend on background job system
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

export const dataExportService = new DataExportService();