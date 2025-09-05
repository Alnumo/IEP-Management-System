/**
 * @file useAttendanceAnalytics.ts
 * @description Hooks for attendance analytics functionality
 * @version 3.2.1
 * @author Dev Agent - Story 3.2
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface AttendanceFilters {
  dateRange: {
    from: Date;
    to: Date;
  };
  studentId?: string;
  therapistId?: string;
  programType?: string;
  eventType?: 'center_check_in' | 'center_check_out' | 'session_check_in' | 'all';
  location?: string;
}

interface AttendanceAnalytics {
  total_attendance_today: number;
  currently_present: number;
  active_sessions: number;
  attendance_rate: number;
  center_checkins: number;
  session_checkins: number;
  checkouts: number;
  unique_students: number;
  avg_session_duration: number;
  location_breakdown: Record<string, number>;
  hourly_distribution: Record<string, number>;
}

interface CurrentAttendanceRecord {
  student_id: string;
  student_name_en: string;
  student_name_ar: string;
  check_in_time: string;
  scan_location: string;
  current_session_id: string | null;
  session_type: string;
  minutes_in_facility: number;
}

interface AttendanceTrend {
  date: string;
  total_attendance: number;
  center_checkins: number;
  session_checkins: number;
  attendance_rate: number;
}

// Main analytics hook
export const useAttendanceAnalytics = (filters: AttendanceFilters) => {
  const { language } = useLanguage();

  return useQuery({
    queryKey: ['attendance-analytics', filters],
    queryFn: async (): Promise<AttendanceAnalytics> => {
      const { from, to } = filters.dateRange;
      
      // Get attendance summary using our database function
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_attendance_summary', {
          p_start_date: from.toISOString().split('T')[0],
          p_end_date: to.toISOString().split('T')[0],
          p_student_id: filters.studentId || null,
          p_session_id: null
        });

      if (summaryError) throw summaryError;

      // Get current facility attendance
      const { data: currentData, error: currentError } = await supabase
        .rpc('get_current_facility_attendance');

      if (currentError) throw currentError;

      // Get location breakdown
      const locationQuery = supabase
        .from('attendance_logs')
        .select('scan_location, event_type')
        .gte('timestamp', from.toISOString())
        .lte('timestamp', to.toISOString());

      if (filters.eventType && filters.eventType !== 'all') {
        locationQuery.eq('event_type', filters.eventType);
      }

      const { data: locationData, error: locationError } = await locationQuery;
      if (locationError) throw locationError;

      // Process location breakdown
      const locationBreakdown = locationData.reduce((acc: Record<string, number>, record) => {
        const location = record.scan_location || 'Unknown';
        acc[location] = (acc[location] || 0) + 1;
        return acc;
      }, {});

      // Get hourly distribution
      const { data: hourlyData, error: hourlyError } = await supabase
        .from('attendance_logs')
        .select('timestamp, event_type')
        .gte('timestamp', from.toISOString())
        .lte('timestamp', to.toISOString());

      if (hourlyError) throw hourlyError;

      const hourlyDistribution = hourlyData.reduce((acc: Record<string, number>, record) => {
        const hour = new Date(record.timestamp).getHours().toString().padStart(2, '0') + ':00';
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {});

      // Calculate today's metrics
      const today = new Date().toISOString().split('T')[0];
      const todayData = summaryData?.find((d: any) => d.summary_date === today);

      return {
        total_attendance_today: todayData?.total_center_checkins || 0,
        currently_present: currentData?.length || 0,
        active_sessions: todayData?.total_session_checkins || 0,
        attendance_rate: todayData?.unique_students_present || 0,
        center_checkins: summaryData?.reduce((sum: number, d: any) => sum + (d.total_center_checkins || 0), 0) || 0,
        session_checkins: summaryData?.reduce((sum: number, d: any) => sum + (d.total_session_checkins || 0), 0) || 0,
        checkouts: summaryData?.reduce((sum: number, d: any) => sum + (d.total_checkouts || 0), 0) || 0,
        unique_students: Math.max(...(summaryData?.map((d: any) => d.unique_students_present || 0) || [0])),
        avg_session_duration: summaryData?.reduce((sum: number, d: any) => sum + (d.avg_facility_duration_minutes || 0), 0) / (summaryData?.length || 1) || 0,
        location_breakdown: locationBreakdown,
        hourly_distribution: hourlyDistribution
      };
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
};

// Current facility attendance hook
export const useCurrentFacilityAttendance = () => {
  return useQuery({
    queryKey: ['current-facility-attendance'],
    queryFn: async (): Promise<CurrentAttendanceRecord[]> => {
      const { data, error } = await supabase
        .rpc('get_current_facility_attendance');

      if (error) throw error;

      return data || [];
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
  });
};

// Attendance trends hook
export const useAttendanceTrends = (dateRange: { from: Date; to: Date }) => {
  return useQuery({
    queryKey: ['attendance-trends', dateRange],
    queryFn: async (): Promise<AttendanceTrend[]> => {
      const { from, to } = dateRange;
      
      const { data, error } = await supabase
        .rpc('get_attendance_summary', {
          p_start_date: from.toISOString().split('T')[0],
          p_end_date: to.toISOString().split('T')[0]
        });

      if (error) throw error;

      return (data || []).map((record: any) => ({
        date: record.summary_date,
        total_attendance: (record.total_center_checkins || 0) + (record.total_session_checkins || 0),
        center_checkins: record.total_center_checkins || 0,
        session_checkins: record.total_session_checkins || 0,
        attendance_rate: record.unique_students_present || 0
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Log attendance mutation (for QR scanning)
export const useLogAttendance = () => {
  const queryClient = useQueryClient();
  const { language } = useLanguage();

  return useMutation({
    mutationFn: async (attendanceData: {
      student_id: string | null;
      session_id?: string | null;
      event_type: 'center_check_in' | 'center_check_out' | 'session_check_in';
      scan_location?: string;
      qr_scan_data?: any;
      device_info?: string;
    }) => {
      const { data, error } = await supabase
        .rpc('log_attendance', {
          p_student_id: attendanceData.student_id,
          p_event_type: attendanceData.event_type,
          p_session_id: attendanceData.session_id || null,
          p_qr_scan_data: attendanceData.qr_scan_data || null,
          p_scan_location: attendanceData.scan_location || null,
          p_scanned_by: null, // Will be set by RLS to current user
          p_device_info: attendanceData.device_info || navigator.userAgent
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch attendance data
      queryClient.invalidateQueries({ queryKey: ['attendance-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['current-facility-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-trends'] });
      
      toast.success(
        language === 'ar' 
          ? 'تم تسجيل الحضور بنجاح' 
          : 'Attendance logged successfully'
      );
    },
    onError: (error) => {
      console.error('Attendance logging failed:', error);
      toast.error(
        language === 'ar' 
          ? 'فشل في تسجيل الحضور' 
          : 'Failed to log attendance'
      );
    }
  });
};

// Attendance history hook
export const useAttendanceHistory = (
  studentId?: string, 
  limit: number = 50,
  eventType?: string
) => {
  return useQuery({
    queryKey: ['attendance-history', studentId, limit, eventType],
    queryFn: async () => {
      let query = supabase
        .from('attendance_logs')
        .select(`
          id,
          student_id,
          session_id,
          timestamp,
          event_type,
          scan_location,
          qr_scan_data,
          students!inner(name_en, name_ar),
          sessions(id, course_id, scheduled_start_time)
        `)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      if (eventType && eventType !== 'all') {
        query = query.eq('event_type', eventType);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

// Real-time attendance subscription hook
export const useAttendanceRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to attendance_logs table changes
    const attendanceSubscription = supabase
      .channel('attendance_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_logs'
        },
        (payload) => {
          // Invalidate relevant queries when attendance data changes
          queryClient.invalidateQueries({ queryKey: ['attendance-analytics'] });
          queryClient.invalidateQueries({ queryKey: ['current-facility-attendance'] });
          queryClient.invalidateQueries({ queryKey: ['attendance-trends'] });
          queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
          
          // Show real-time notification for new attendance
          if (payload.eventType === 'INSERT') {
            const newRecord = payload.new;
            toast.info(
              `Student ${newRecord.event_type.replace('_', ' ')} recorded at ${new Date(newRecord.timestamp).toLocaleTimeString()}`
            );
          }
        }
      )
      .subscribe();

    // Subscribe to broadcast channel for live updates from Edge Function
    const broadcastSubscription = supabase
      .channel('attendance_updates')
      .on('broadcast', { event: 'attendance_logged' }, (payload) => {
        // Update queries with new data immediately
        queryClient.invalidateQueries({ queryKey: ['current-facility-attendance'] });
        
        // Optionally update cached data optimistically
        queryClient.setQueryData(
          ['attendance-analytics'],
          (oldData: AttendanceAnalytics | undefined) => {
            if (!oldData) return oldData;
            
            return {
              ...oldData,
              facility_count: payload.payload.facility_count,
              total_attendance_today: oldData.total_attendance_today + 1
            };
          }
        );
      })
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(attendanceSubscription);
      supabase.removeChannel(broadcastSubscription);
    };
  }, [queryClient]);
};

// Attendance validation hook
export const useAttendanceValidation = () => {
  const { language } = useLanguage();

  return useMutation({
    mutationFn: async (validationData: {
      student_id: string;
      event_type: 'center_check_in' | 'center_check_out' | 'session_check_in';
      session_id?: string;
      scan_location?: string;
    }) => {
      // Call the Edge Function for comprehensive validation
      const { data, error } = await supabase.functions.invoke('attendance-processor', {
        body: {
          ...validationData,
          validate_only: true // Flag to only validate without logging
        }
      });

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error('Attendance validation failed:', error);
      toast.error(
        language === 'ar' 
          ? 'فشل في التحقق من البيانات' 
          : 'Validation failed'
      );
    }
  });
};

// Bulk attendance sync hook for offline synchronization
export const useBulkAttendanceSync = () => {
  const queryClient = useQueryClient();
  const { language } = useLanguage();

  return useMutation({
    mutationFn: async (offlineRecords: Array<{
      student_id: string | null;
      session_id?: string | null;
      event_type: 'center_check_in' | 'center_check_out' | 'session_check_in';
      scan_location?: string;
      qr_scan_data?: any;
      offline_timestamp: string;
      device_info?: string;
    }>) => {
      // Call Edge Function with batch data
      const { data, error } = await supabase.functions.invoke('attendance-processor', {
        body: {
          batch_data: offlineRecords,
          offline_sync: true
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      // Clear offline storage after successful sync
      localStorage.removeItem('offline_attendance_records');
      
      // Invalidate all attendance queries
      queryClient.invalidateQueries({ queryKey: ['attendance-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['current-facility-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-trends'] });
      
      toast.success(
        language === 'ar' 
          ? `تم مزامنة ${result.batch_results?.length || 0} سجل بنجاح` 
          : `Successfully synced ${result.batch_results?.length || 0} records`
      );
    },
    onError: (error) => {
      console.error('Bulk sync failed:', error);
      toast.error(
        language === 'ar' 
          ? 'فشل في مزامنة البيانات' 
          : 'Failed to sync offline data'
      );
    }
  });
};

// Export attendance data hook
export const useExportAttendanceData = () => {
  const { language } = useLanguage();

  return useMutation({
    mutationFn: async (filters: AttendanceFilters & { format: 'csv' | 'json' }) => {
      const { from, to } = filters.dateRange;
      
      const { data, error } = await supabase
        .from('attendance_logs')
        .select(`
          id,
          timestamp,
          event_type,
          scan_location,
          students!inner(name_en, name_ar),
          sessions(id, course_id, scheduled_start_time)
        `)
        .gte('timestamp', from.toISOString())
        .lte('timestamp', to.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;

      if (filters.format === 'csv') {
        return convertToCSV(data, language);
      }

      return data;
    },
    onSuccess: (data, variables) => {
      if (variables.format === 'csv') {
        downloadCSV(data as string, `attendance-export-${new Date().toISOString().split('T')[0]}.csv`);
      } else {
        downloadJSON(data, `attendance-export-${new Date().toISOString().split('T')[0]}.json`);
      }
      
      toast.success(
        language === 'ar' 
          ? 'تم تصدير البيانات بنجاح' 
          : 'Data exported successfully'
      );
    },
    onError: (error) => {
      console.error('Export failed:', error);
      toast.error(
        language === 'ar' 
          ? 'فشل في تصدير البيانات' 
          : 'Failed to export data'
      );
    }
  });
};

// Helper functions
const convertToCSV = (data: any[], language: string): string => {
  if (!data.length) return '';

  const headers = language === 'ar' 
    ? ['التاريخ والوقت', 'الطالب', 'نوع الحدث', 'الموقع']
    : ['Timestamp', 'Student', 'Event Type', 'Location'];

  const rows = data.map(record => [
    new Date(record.timestamp).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US'),
    language === 'ar' ? record.students?.name_ar || record.students?.name_en : record.students?.name_en || record.students?.name_ar,
    record.event_type,
    record.scan_location || 'N/A'
  ]);

  return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
};

const downloadCSV = (csvData: string, filename: string) => {
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const downloadJSON = (data: any, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};