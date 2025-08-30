import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  FileTextIcon, AlertTriangleIcon, CheckCircleIcon, 
  DownloadIcon, CalendarIcon, RefreshCwIcon 
} from 'lucide-react';
import { 
  ComplianceRequirement, 
  RegulatoryMetrics,
  regulatoryComplianceService 
} from '../services/regulatory-compliance-service';

const ComplianceReportingPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [metrics, setMetrics] = useState<RegulatoryMetrics | null>(null);

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    setLoading(true);
    try {
      const [requirementsData, metricsData] = await Promise.all([
        regulatoryComplianceService.getComplianceRequirements(),
        regulatoryComplianceService.getRegulatoryMetrics()
      ]);

      setRequirements(requirementsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800';
      case 'due_soon': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircleIcon className="h-4 w-4" />;
      case 'due_soon': return <CalendarIcon className="h-4 w-4" />;
      case 'overdue': return <AlertTriangleIcon className="h-4 w-4" />;
      default: return <FileTextIcon className="h-4 w-4" />;
    }
  };

  const handleGenerateReport = async (requirementId: string) => {
    try {
      const reportPeriod = {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      };

      const report = await regulatoryComplianceService.generateComplianceReport(
        requirementId,
        reportPeriod
      );

      console.log('Report generated:', report.id);
      await loadComplianceData();
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('Loading compliance data...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">{t('Regulatory Compliance')}</h1>
          <p className="text-gray-600">{t('Saudi Arabia healthcare compliance reporting')}</p>
        </div>
        
        <Button variant="outline" onClick={loadComplianceData}>
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          {t('Refresh')}
        </Button>
      </div>

      {/* Compliance Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.complianceRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">{t('Compliance Rate')}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.compliantReports}</div>
              <div className="text-sm text-gray-600">{t('Compliant Reports')}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{metrics.upcomingDeadlines}</div>
              <div className="text-sm text-gray-600">{t('Due Soon')}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{metrics.overdueReports}</div>
              <div className="text-sm text-gray-600">{t('Overdue')}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compliance Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Regulatory Requirements')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requirements.map((requirement) => (
              <div key={requirement.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium">{requirement.reportType}</h4>
                      <Badge className={`inline-flex items-center space-x-1 ${getStatusColor(requirement.status)}`}>
                        {getStatusIcon(requirement.status)}
                        <span>{t(requirement.status)}</span>
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {requirement.authorityNameAr} ({requirement.authority})
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">{t('Frequency')}:</span>
                        <span className="ml-1">{t(requirement.frequency)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('Next Due')}:</span>
                        <span className="ml-1">{new Date(requirement.nextDueDate).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('Submission Method')}:</span>
                        <span className="ml-1">{t(requirement.submissionMethod)}</span>
                      </div>
                      {requirement.lastSubmitted && (
                        <div>
                          <span className="text-gray-500">{t('Last Submitted')}:</span>
                          <span className="ml-1">{new Date(requirement.lastSubmitted).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateReport(requirement.id)}
                    >
                      <FileTextIcon className="h-4 w-4 mr-1" />
                      {t('Generate Report')}
                    </Button>
                    <Button variant="outline" size="sm">
                      <DownloadIcon className="h-4 w-4 mr-1" />
                      {t('Export')}
                    </Button>
                  </div>
                </div>

                {requirement.penaltyForDelay && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    <strong>{t('Penalty for delay')}:</strong> {requirement.penaltyForDelay}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplianceReportingPage;