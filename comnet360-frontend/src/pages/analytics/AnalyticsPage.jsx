import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart2, RefreshCw, Trash2, Eye, X } from 'lucide-react';
import { analyticsApi } from '../../api/analytics';
import { usersApi } from '../../api/auth';
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
    reportType: 'SLA_COMPLIANCE',
    fromDate: thirtyDaysAgo,
    toDate: today,
  });
  const [showReportForm, setShowReportForm] = useState(false);
  const [viewReport, setViewReport] = useState(null); // report object to view

  // Incident summary date range
  const [summaryFrom, setSummaryFrom] = useState(thirtyDaysAgo);
  const [summaryTo, setSummaryTo] = useState(today);

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => analyticsApi.getAll().then((r) => r.data),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll().then((r) => r.data),
  });

  const userNameMap = useMemo(() => {
    const m = {};
    users?.forEach((u) => { m[u.userId] = u.name; });
    return m;
  }, [users]);

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
        title: reportForm.title || `${reportForm.reportType === 'SLA_COMPLIANCE' ? 'SLA Compliance' : 'Incident Summary'} – ${new Date().toLocaleDateString()}`,
        scope: 'ALL',
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

  const deleteSnapshotMut = useMutation({
    mutationFn: (id) => analyticsApi.deleteSnapshot(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['snapshots'] }); toast.success('Snapshot deleted'); },
    onError: () => toast.error('Failed to delete snapshot'),
  });

  if (isLoading) return <PageSpinner />;

  // Build incident bar chart data from IncidentSummaryResponse
  // CLOSED = fully resolved & done, so merge Resolved + Closed into one "Resolved" bar
  const summaryData = incidentSummary
    ? [
        { name: 'Open',       count: Number(incidentSummary.openIncidents) },
        { name: 'In Progress',count: Number(incidentSummary.inProgressIncidents) },
        { name: 'Resolved',   count: Number(incidentSummary.resolvedIncidents) + Number(incidentSummary.closedIncidents) },
        { name: 'Critical',   count: Number(incidentSummary.criticalIncidents) },
        { name: 'High',       count: Number(incidentSummary.highIncidents) },
        { name: 'Medium',     count: Number(incidentSummary.mediumIncidents) },
        { name: 'Low',        count: Number(incidentSummary.lowIncidents) },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Analytics & Reports</h2>
          <p className="text-sm text-slate-500">{reports?.length ?? 0} reports generated</p>
        </div>
        <div className="flex gap-2">
          {hasRole('ADMIN', 'OPERATIONS_HEAD') && (
            <Button variant="secondary" size="sm" icon={<RefreshCw className="w-3 h-3" />}
              loading={snapshotMut.isPending} onClick={() => snapshotMut.mutate()}>
              Capture Snapshot
            </Button>
          )}
          {hasRole('ADMIN', 'SERVICE_MANAGER', 'OPERATIONS_HEAD') && (
            <Button size="sm" icon={<BarChart2 className="w-4 h-4" />}
              onClick={() => setShowReportForm(!showReportForm)}>
              Generate Report
            </Button>
          )}
        </div>
      </div>

      {/* Report generation form */}
      {showReportForm && (
        <div className="bg-white rounded-xl border border-sky-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">New Report</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Title <span className="text-slate-400 font-normal">(optional)</span></label>
              <input value={reportForm.title} onChange={(e) => setReportForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Monthly SLA Report"
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Report Type</label>
              <select value={reportForm.reportType} onChange={(e) => setReportForm((f) => ({ ...f, reportType: e.target.value }))}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500 bg-white">
                <option value="SLA_COMPLIANCE">SLA Compliance</option>
                <option value="INCIDENT_SUMMARY">Incident Summary</option>
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-sm font-medium text-slate-700">From</label>
                <input type="date" value={reportForm.fromDate} onChange={(e) => setReportForm((f) => ({ ...f, fromDate: e.target.value }))}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500" />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-sm font-medium text-slate-700">To</label>
                <input type="date" value={reportForm.toDate} onChange={(e) => setReportForm((f) => ({ ...f, toDate: e.target.value }))}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-500" />
              </div>
            </div>
          </div>
          {reportForm.fromDate && reportForm.toDate && reportForm.fromDate > reportForm.toDate && (
            <p className="text-xs text-red-500 font-medium">"From" date must be before "To" date.</p>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setShowReportForm(false)}>Cancel</Button>
            <Button size="sm" loading={generateMut.isPending}
              disabled={!reportForm.fromDate || !reportForm.toDate || reportForm.fromDate > reportForm.toDate}
              onClick={() => generateMut.mutate()}>Generate</Button>
          </div>
        </div>
      )}

      {/* Incident summary */}
      <div className="bg-white rounded-xl border border-sky-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-slate-700">Incident Summary</h3>
          <div className="flex flex-wrap gap-2 items-center">
            <input type="date" value={summaryFrom} onChange={(e) => setSummaryFrom(e.target.value)}
              className="text-xs px-2 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500" />
            <span className="text-xs text-slate-400">to</span>
            <input type="date" value={summaryTo} onChange={(e) => setSummaryTo(e.target.value)}
              className="text-xs px-2 py-1 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        {incidentSummary ? (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Total',    value: incidentSummary.totalIncidents, color: 'text-slate-800' },
                { label: 'Open',     value: incidentSummary.openIncidents,  color: 'text-orange-600' },
                { label: 'Resolved', value: Number(incidentSummary.resolvedIncidents) + Number(incidentSummary.closedIncidents), color: 'text-green-600' },
                { label: 'Avg MTTR', value: `${Math.round(Number(incidentSummary.averageMttrMinutes))}m`, color: 'text-blue-600' },
              ].map((stat) => (
                <div key={stat.label} className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">{stat.label}</p>
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
        <div className="bg-white rounded-xl border border-sky-100 shadow-sm">
          <div className="px-5 py-4 border-b border-sky-50">
            <h3 className="text-sm font-semibold text-slate-700">Dashboard Snapshots</h3>
          </div>
          <div className="divide-y divide-sky-50">
            {snapshots.map((snap) => {
              // Parse nested incident metrics from snapshot data
              let incidents = null;
              let period = null;
              try {
                const parsed = JSON.parse(snap.data || '{}');
                incidents = parsed.incidents ?? null;
                period = parsed.period ?? null;
              } catch { /* ignore */ }

              return (
                <div key={snap.snapshotId} className="px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap hover:bg-sky-50/40">
                  {/* Left: badge + timestamp */}
                  <div className="flex items-center gap-3 flex-wrap min-w-0">
                    <Badge color="purple">{snap.snapshotType}</Badge>
                    <span className="text-xs text-slate-400">
                      {new Date(snap.capturedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })},{' '}
                      {new Date(snap.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {period && (
                      <span className="text-xs text-slate-400 hidden sm:inline">
                        · {period.from} → {period.to}
                      </span>
                    )}
                  </div>

                  {/* Right: inline metrics + delete */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {incidents ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { label: 'Total',       value: incidents.total,      color: 'text-slate-700' },
                          { label: 'Open',        value: incidents.open,       color: 'text-orange-600' },
                          { label: 'In Progress', value: incidents.inProgress, color: 'text-blue-600' },
                          { label: 'Resolved',    value: (incidents.resolved ?? 0) + (incidents.closed ?? 0), color: 'text-green-600' },
                          { label: 'Critical',    value: incidents.critical,   color: 'text-red-600' },
                        ].map((m, i) => (
                          <span key={m.label} className="flex items-center gap-1 text-xs">
                            {i > 0 && <span className="text-slate-300">·</span>}
                            <span className="text-slate-400">{m.label}:</span>
                            <span className={`font-semibold ${m.color}`}>{m.value ?? '—'}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">snapshot</span>
                    )}

                    {hasRole('ADMIN') && (
                      <button
                        onClick={() => deleteSnapshotMut.mutate(snap.snapshotId)}
                        disabled={deleteSnapshotMut.isPending}
                        className="text-red-400 hover:text-red-600 cursor-pointer disabled:opacity-40"
                        title="Delete snapshot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reports Table */}
      <div className="bg-white rounded-xl border border-sky-100 shadow-sm">
        <div className="px-5 py-4 border-b border-sky-50">
          <h3 className="text-sm font-semibold text-slate-700">Generated Reports</h3>
        </div>
        {!reports || reports.length === 0 ? (
          <div className="px-5 py-12 text-center text-slate-400">
            <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No reports yet</p>
            <p className="text-xs mt-1">Click "Generate Report" to create one</p>
          </div>
        ) : (
          <div className="divide-y divide-sky-50">
            {reports.map((r) => (
              <div key={r.reportId} className="px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap hover:bg-sky-50/40">
                <div className="flex items-center gap-3 flex-wrap min-w-0">
                  <span className="font-semibold text-slate-800 text-sm truncate">{r.title}</span>
                  <Badge color={r.reportType === 'SLA_COMPLIANCE' ? 'cyan' : 'purple'}>
                    {r.reportType === 'SLA_COMPLIANCE' ? 'SLA Compliance' : 'Incident Summary'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    {new Date(r.fromDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })} – {new Date(r.toDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
                  </span>
                  <span className="text-xs text-slate-400 hidden md:inline">{userNameMap[r.generatedBy] ?? 'Unknown User'}</span>
                  <button onClick={() => setViewReport(r)}
                    className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-2.5 py-1.5 rounded-lg cursor-pointer font-medium">
                    <Eye className="w-3 h-3" /> View
                  </button>
                  {hasRole('ADMIN') && (
                    <button onClick={() => deleteMut.mutate(r.reportId)} className="text-red-400 hover:text-red-600 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── View Report Modal ─────────────────────────────────── */}
      {viewReport && (() => {
        let m = {};
        try { m = JSON.parse(viewReport.metrics || '{}'); } catch {}
        const isSla = viewReport.reportType === 'SLA_COMPLIANCE';
        const resolved = Number(m.resolvedIncidents ?? 0) + Number(m.closedIncidents ?? 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between px-6 py-5 border-b border-sky-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{viewReport.title}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge color={isSla ? 'cyan' : 'purple'}>
                      {isSla ? 'SLA Compliance' : 'Incident Summary'}
                    </Badge>
                    <span className="text-xs text-slate-400">{viewReport.fromDate} → {viewReport.toDate}</span>
                    <span className="text-xs text-slate-400">· Generated by {userNameMap[viewReport.generatedBy] ?? 'Unknown User'}</span>
                  </div>
                </div>
                <button onClick={() => setViewReport(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer mt-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-6">
                {/* ── INCIDENT_SUMMARY sections ── */}
                {!isSla && (
                  <>
                    {/* Incident Summary */}
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Incident Summary</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Total Incidents',   value: m.totalIncidents ?? 0,     color: 'text-slate-800',  bg: 'bg-slate-50' },
                          { label: 'Open',              value: m.openIncidents ?? 0,       color: 'text-orange-600', bg: 'bg-orange-50' },
                          { label: 'In Progress',       value: m.inProgressIncidents ?? 0, color: 'text-blue-600',   bg: 'bg-blue-50' },
                          { label: 'Resolved / Closed', value: resolved,                   color: 'text-green-600',  bg: 'bg-green-50' },
                        ].map((s) => (
                          <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Severity Breakdown */}
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Severity Breakdown</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Critical', value: m.criticalIncidents ?? 0, color: 'text-red-600',    bg: 'bg-red-50' },
                          { label: 'High',     value: m.highIncidents ?? 0,     color: 'text-amber-600',  bg: 'bg-amber-50' },
                          { label: 'Medium',   value: m.mediumIncidents ?? 0,   color: 'text-yellow-600', bg: 'bg-yellow-50' },
                          { label: 'Low',      value: m.lowIncidents ?? 0,      color: 'text-green-600',  bg: 'bg-green-50' },
                        ].map((s) => (
                          <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* MTTR */}
                    <div className="bg-purple-50 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500">Avg. Mean Time to Resolve (MTTR)</p>
                        <p className="text-2xl font-bold text-purple-700 mt-0.5">{Math.round(m.averageMttrMinutes ?? 0)} min</p>
                      </div>
                      <div className="text-xs text-slate-400 text-right">
                        <p>Period: {viewReport.fromDate}</p>
                        <p>to {viewReport.toDate}</p>
                      </div>
                    </div>
                  </>
                )}

                {/* ── SLA_COMPLIANCE sections ── */}
                {isSla && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">SLA Breach Analysis</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Total Breaches',      value: m.totalBreaches ?? 0,      color: 'text-slate-800', bg: 'bg-slate-50' },
                        { label: 'Resolved Breaches',   value: m.resolvedBreaches ?? 0,   color: 'text-green-600', bg: 'bg-green-50' },
                        { label: 'Unresolved Breaches', value: m.unresolvedBreaches ?? 0, color: 'text-red-600',   bg: 'bg-red-50' },
                        { label: 'Compliance %',
                          value: `${m.compliancePercentage ?? 100}%`,
                          color: (m.compliancePercentage ?? 100) >= 80 ? 'text-green-600' : 'text-red-600',
                          bg: 'bg-sky-50' },
                      ].map((s) => (
                        <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                          <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex justify-end pt-2">
                  <button onClick={() => setViewReport(null)}
                    className="px-4 py-2 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 cursor-pointer">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
