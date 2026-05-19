import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart2, RefreshCw, Trash2 } from 'lucide-react';
import { analyticsApi } from '../../api/analytics';
import { PageSpinner } from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

const today = new Date().toISOString().split('T')[0];
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

export default function AnalyticsPage() {
  const qc = useQueryClient();
  const { hasRole } = useAuth();

  // Report generation form
  const [reportForm, setReportForm] = useState({
    title: '',
    scope: 'ALL',
    reportType: 'SLA_COMPLIANCE',
    fromDate: thirtyDaysAgo,
    toDate: today,
  });
  const [showReportForm, setShowReportForm] = useState(false);

  // Incident summary date range
  const [summaryFrom, setSummaryFrom] = useState(thirtyDaysAgo);
  const [summaryTo, setSummaryTo] = useState(today);

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => analyticsApi.getAll().then((r) => r.data),
  });

  const { data: incidentSummary } = useQuery({
    queryKey: ['incident-summary', summaryFrom, summaryTo],
    queryFn: () => analyticsApi.getIncidentSummary(summaryFrom, summaryTo).then((r) => r.data),
    enabled: !!summaryFrom && !!summaryTo,
  });

  const { data: snapshots } = useQuery({
    queryKey: ['snapshots'],
    queryFn: () => analyticsApi.getSnapshots().then((r) => r.data),
  });

  const generateMut = useMutation({
    mutationFn: () =>
      analyticsApi.generateReport({
        title: reportForm.title || `KPI Report – ${new Date().toLocaleDateString()}`,
        scope: reportForm.scope,
        reportType: reportForm.reportType,
        fromDate: reportForm.fromDate,
        toDate: reportForm.toDate,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report generated');
      setShowReportForm(false);
    },
    onError: () => toast.error('Failed to generate report'),
  });

  const snapshotMut = useMutation({
    mutationFn: () => analyticsApi.generateOperations(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['snapshots'] });
      toast.success('Snapshot captured');
    },
    onError: () => toast.error('Failed to capture snapshot'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => analyticsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reports'] }); toast.success('Deleted'); },
  });

  if (isLoading) return <PageSpinner />;

  // Build incident bar chart data from IncidentSummaryResponse
  const summaryData = incidentSummary
    ? [
        { name: 'Open', count: Number(incidentSummary.openIncidents) },
        { name: 'Resolved', count: Number(incidentSummary.resolvedIncidents) },
        { name: 'Closed', count: Number(incidentSummary.closedIncidents) },
        { name: 'Critical', count: Number(incidentSummary.criticalIncidents) },
        { name: 'High', count: Number(incidentSummary.highIncidents) },
        { name: 'Medium', count: Number(incidentSummary.mediumIncidents) },
        { name: 'Low', count: Number(incidentSummary.lowIncidents) },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Analytics & Reports</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{reports?.length ?? 0} reports generated</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<RefreshCw className="w-3 h-3" />}
            loading={snapshotMut.isPending} onClick={() => snapshotMut.mutate()}>
            Capture Snapshot
          </Button>
          <Button size="sm" icon={<BarChart2 className="w-4 h-4" />}
            onClick={() => setShowReportForm(!showReportForm)}>
            Generate Report
          </Button>
        </div>
      </div>

      {/* Report generation form */}
      {showReportForm && (
        <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">New Report</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
              <input value={reportForm.title} onChange={(e) => setReportForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={`KPI Report – ${new Date().toLocaleDateString()}`}
                className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Scope</label>
              <input value={reportForm.scope} onChange={(e) => setReportForm((f) => ({ ...f, scope: e.target.value }))}
                placeholder="e.g. ALL, VOICE, VIDEO"
                className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Report Type</label>
              <select value={reportForm.reportType} onChange={(e) => setReportForm((f) => ({ ...f, reportType: e.target.value }))}
                className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:border-blue-500 bg-white">
                {['SLA_COMPLIANCE', 'INCIDENT_SUMMARY', 'USAGE_TREND', 'SERVICE_HEALTH', 'OPERATIONS', 'CUSTOM'].map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">From</label>
                <input type="date" value={reportForm.fromDate} onChange={(e) => setReportForm((f) => ({ ...f, fromDate: e.target.value }))}
                  className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">To</label>
                <input type="date" value={reportForm.toDate} onChange={(e) => setReportForm((f) => ({ ...f, toDate: e.target.value }))}
                  className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setShowReportForm(false)}>Cancel</Button>
            <Button size="sm" loading={generateMut.isPending} onClick={() => generateMut.mutate()}>Generate</Button>
          </div>
        </div>
      )}

      {/* Incident summary */}
      <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Incident Summary</h3>
          <div className="flex gap-2 items-center">
            <input type="date" value={summaryFrom} onChange={(e) => setSummaryFrom(e.target.value)}
              className="text-xs px-2 py-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:border-blue-500" />
            <span className="text-xs text-slate-400 dark:text-slate-500">to</span>
            <input type="date" value={summaryTo} onChange={(e) => setSummaryTo(e.target.value)}
              className="text-xs px-2 py-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        {incidentSummary ? (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Total', value: incidentSummary.totalIncidents, color: 'text-slate-800' },
                { label: 'Open', value: incidentSummary.openIncidents, color: 'text-orange-600' },
                { label: 'Resolved', value: incidentSummary.resolvedIncidents, color: 'text-green-600' },
                { label: 'Avg MTTR', value: `${Math.round(Number(incidentSummary.averageMttrMinutes))}m`, color: 'text-blue-600' },
              ].map((stat) => (
                <div key={stat.label} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                  <p className={`text-lg font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
            {summaryData.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={summaryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </>
        ) : (
          <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
            Select a date range to view incident summary
          </div>
        )}
      </div>

      {/* Snapshots */}
      {snapshots && snapshots.length > 0 && (
        <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Dashboard Snapshots</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {snapshots.map((snap) => (
              <div key={snap.snapshotId} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <Badge color="purple">{snap.snapshotType}</Badge>
                  <span className="ml-3 text-xs text-slate-400 dark:text-slate-500">{new Date(snap.capturedAt).toLocaleString()}</span>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {snap.data ? (() => { try { return `${Object.keys(JSON.parse(snap.data)).length} metrics`; } catch { return 'snapshot'; } })() : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports Table */}
      <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Generated Reports</h3>
        </div>
        {!reports || reports.length === 0 ? (
          <div className="px-5 py-12 text-center text-slate-400">
            <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No reports yet</p>
            <p className="text-xs mt-1">Click "Generate Report" to create one</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[580px]">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
              <tr>
                {['Title', 'Type', 'Scope', 'Period', 'Generated by', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {reports.map((r) => (
                <tr key={r.reportId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-100">{r.title}</td>
                  <td className="px-5 py-3.5"><Badge color="cyan">{r.reportType}</Badge></td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs">{r.scope}</td>
                  <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 text-xs">{r.fromDate} → {r.toDate}</td>
                  <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 text-xs">User #{r.generatedBy}</td>
                  <td className="px-5 py-3.5">
                    {hasRole('ADMIN') && (
                      <button onClick={() => deleteMut.mutate(r.reportId)} className="text-red-400 hover:text-red-600 cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
