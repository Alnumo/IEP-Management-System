/**
 * CRM Dashboard Page
 * @description Main CRM dashboard page with lead management and statistics
 * @author James (Dev Agent)
 * @date 2025-09-03
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX, 
  TrendingUp, 
  Calendar,
  Filter,
  Download,
  Plus,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { LeadKanbanBoard } from '@/components/crm/LeadKanbanBoard';
import { useLeadStatistics, useLeads, useExportLeads } from '@/hooks/useLeads';
import type { LeadFilterOptions } from '@/types/crm';

export default function CrmDashboardPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [filters, setFilters] = useState<LeadFilterOptions>({});
  const [activeTab, setActiveTab] = useState('kanban');

  // API hooks
  const { data: statistics, isLoading: statsLoading } = useLeadStatistics();
  const { data: leads = [], isLoading: leadsLoading } = useLeads(filters);
  const exportLeadsMutation = useExportLeads();

  // Handle export
  const handleExport = async () => {
    try {
      const data = await exportLeadsMutation.mutateAsync(filters);
      
      // Create CSV content
      const headers = [
        'Parent Name',
        'Child Name', 
        'Contact',
        'Child Age',
        'Status',
        'Source',
        'Evaluation Date',
        'Created Date'
      ];
      
      const csvContent = [
        headers.join(','),
        ...data.map(lead => [
          lead.parent_name,
          lead.child_name,
          lead.parent_contact,
          Math.floor((new Date().getTime() - new Date(lead.child_dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
          lead.status,
          lead.source || '',
          lead.evaluation_date ? new Date(lead.evaluation_date).toLocaleDateString() : '',
          new Date(lead.created_at).toLocaleDateString()
        ].join(','))
      ].join('\n');

      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('crm.dashboard.title', 'CRM Dashboard')}
          </h1>
          <p className="text-muted-foreground">
            {t('crm.dashboard.subtitle', 'Manage leads and track conversion pipeline')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            {t('common.filter', 'Filter')}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            disabled={exportLeadsMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('common.export', 'Export')}
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('crm.dashboard.addLead', 'Add Lead')}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('crm.stats.totalLeads', 'Total Leads')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{statistics?.total_leads || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {t('crm.stats.allTimeLeads', 'All time leads')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('crm.stats.newBookings', 'New Bookings')}
            </CardTitle>
            <UserPlus className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-blue-600">
                {statistics?.new_bookings || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t('crm.stats.pendingConfirmation', 'Pending confirmation')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('crm.stats.conversionRate', 'Conversion Rate')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {statistics?.conversion_rate || 0}%
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t('crm.stats.leadsToStudents', 'Leads to students')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('crm.stats.avgConversionTime', 'Avg Conversion Time')}
            </CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((statistics?.average_conversion_time_days || 0) * 10) / 10}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t('crm.stats.daysToConvert', 'Days to convert')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              {t('crm.status.new_booking', 'New Bookings')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold">{statistics?.new_bookings || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              {t('crm.status.confirmed', 'Confirmed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold">{statistics?.confirmed || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              {t('crm.status.evaluation_complete', 'Evaluation Complete')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold">{statistics?.evaluation_complete || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              {t('crm.status.registered', 'Registered')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold">{statistics?.registered || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              {t('crm.status.archived', 'Archived')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold">{statistics?.archived || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="kanban" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('crm.dashboard.kanbanView', 'Kanban Board')}
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('crm.dashboard.listView', 'List View')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <LeadKanbanBoard />
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>{t('crm.dashboard.leadsList', 'Leads List')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leadsLoading ? (
                  // Loading skeletons for list view
                  Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))
                ) : leads.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {t('crm.dashboard.noLeads', 'No leads found')}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {t('crm.dashboard.noLeadsDescription', 'Start by adding your first lead or importing existing data.')}
                    </p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('crm.dashboard.addFirstLead', 'Add First Lead')}
                    </Button>
                  </div>
                ) : (
                  leads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold">
                            {isRTL && lead.parent_name_ar ? lead.parent_name_ar : lead.parent_name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {t('crm.lead.child', 'Child')}: {isRTL && lead.child_name_ar ? lead.child_name_ar : lead.child_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {lead.parent_contact}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {lead.source && (
                          <Badge variant="outline" className="text-xs">
                            {lead.source}
                          </Badge>
                        )}
                        <Badge 
                          className={`
                            ${lead.status === 'new_booking' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                            ${lead.status === 'confirmed' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ''}
                            ${lead.status === 'evaluation_complete' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                            ${lead.status === 'registered' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                            ${lead.status === 'archived' ? 'bg-gray-50 text-gray-700 border-gray-200' : ''}
                          `}
                        >
                          {t(`crm.status.${lead.status}`, lead.status)}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}