import { Download } from 'lucide-react';
import { Event, Team, Score, Judge } from '../../types';
import * as XLSX from 'xlsx';
import { exportAllRound1ScoresToExcel, exportRound2ResultsToExcel } from '../../utils/excelExport';
import { listRoundOneResults, exportRoundTwoResults } from '../../api/scoringApi';
import { toast } from 'sonner';

interface ExportResultsPageProps {
  events: Event[];
  teams: Team[];
  scores: Score[];
  judges: Judge[];
}

export function ExportResultsPage({ events, teams, scores, judges }: ExportResultsPageProps) {
  const applyWrapAndWidths = (ws: any, widths: number[]) => {
    const cols = widths.map(w => ({ wch: w }));
    ws['!cols'] = cols;
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellAddress]) continue;
        if (!ws[cellAddress].s) ws[cellAddress].s = {};
        ws[cellAddress].s.alignment = { wrapText: true, vertical: 'top' };
      }
    }
  };

  const handleExportAllRound1Scores = async () => {
    if (events.length === 0) {
      alert('No events available. Please create an event first.');
      return;
    }

    const toastId = toast.loading('Exporting Round 1 scores...');

    try {
      const mainEvent = events[0];
      const allDomains = ['fintech_ecommerce', 'health_biotech', 'agritech_rural', 'sustainable_smart_cities', 'skills_edtech'];
      const domainNames: Record<string, string> = {
        fintech_ecommerce: 'Fintech and E-commerce',
        health_biotech: 'Health and BioTech',
        agritech_rural: 'Agri-Tech & Rural Empowerment',
        sustainable_smart_cities: 'Sustainable solutions and smart cities',
        skills_edtech: 'Skills and Edtech'
      };

      const workbook = XLSX.utils.book_new();
      let anyData = false;

      const teamTotals = new Map<string, { teamId: string; teamName: string; domain: string; totalSum: number; count: number }>();
      const domainScoresMap = new Map<string, any[]>();

      for (const domainKey of allDomains) {
        const results = await listRoundOneResults(domainKey).catch(() => []);
        domainScoresMap.set(domainKey, results || []);
        const domainTeams = teams.filter(t => (t as any).domainKey === domainKey || t.domain === domainKey || (t as any).domainKey === domainNames[domainKey] || t.domain === domainNames[domainKey]);
        if ((!results || results.length === 0) && domainTeams.length === 0) continue;
        anyData = true;

        const rows: any[] = [];
        const groupedByJudge = new Map<string, any[]>();
        (results || []).forEach((r: any) => {
          const judgeKey = r.judgeName || r.judgeId || 'Unknown Judge';
          if (!groupedByJudge.has(judgeKey)) groupedByJudge.set(judgeKey, []);
          groupedByJudge.get(judgeKey)!.push(r);

          const teamKey = r.teamId || r.teamName;
          if (teamKey) {
            const existing = teamTotals.get(teamKey) || {
              teamId: r.teamId || '',
              teamName: r.teamName || '',
              domain: domainNames[domainKey] || domainKey,
              totalSum: 0,
              count: 0
            };
            existing.totalSum += Number(r.total ?? 0);
            existing.count += 1;
            teamTotals.set(teamKey, existing);
          }
        });

        const judgeEntries = Array.from(groupedByJudge.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        judgeEntries.forEach(([judgeName, judgeScores]) => {
          rows.push({
            'Judge Name': judgeName
          });

          judgeScores.forEach((item: any, index: number) => {
            const teamInfo = domainTeams.find(t => t.id === item.teamId || t.teamName === item.teamName);
            rows.push({
              'S.No': index + 1,
              'Team ID': item.teamId || teamInfo?.id || '',
              'Team Name': item.teamName || teamInfo?.teamName || '',
              'Problem Statement': item.teamProblemStatement || teamInfo?.problemStatement || '',
              'Problem Identification': Number(item.problemIdentification ?? 0),
              'Innovation & Creativity': Number(item.innovationCreativity ?? 0),
              'Feasibility & Practicality': Number(item.feasibilityPracticality ?? 0),
              'Market/Impact Potential': Number(item.marketImpactPotential ?? 0),
              'Technology/Domain Relevance': Number(item.technologyDomainRelevance ?? 0),
              'Pitch Delivery & Q&A': Number(item.pitchDeliveryQA ?? 0),
              'Bonus': Number(item.bonus ?? 0),
              'Total Score': Number(item.total ?? 0)
            });
          });

          rows.push({});
        });

        const scoredTeamIds = new Set((results || []).map((r: any) => r.teamId));
        const unscoredTeams = domainTeams.filter(t => !scoredTeamIds.has(t.id));
        if (unscoredTeams.length > 0) {
          rows.push({ 'Judge Name': 'Unscored Teams' });
          unscoredTeams.forEach((team: any, index: number) => {
            rows.push({
              'S.No': index + 1,
              'Team ID': team.id || '',
              'Team Name': team.teamName || team.name || '',
              'Problem Statement': team.problemStatement || '',
              'Problem Identification': '',
              'Innovation & Creativity': '',
              'Feasibility & Practicality': '',
              'Market/Impact Potential': '',
              'Technology/Domain Relevance': '',
              'Pitch Delivery & Q&A': '',
              'Bonus': '',
              'Total Score': ''
            });
          });
        }

        const sheetName = domainNames[domainKey] || domainKey;
        const ws = XLSX.utils.json_to_sheet(rows);
        applyWrapAndWidths(ws, [22, 6, 14, 24, 40, 26, 10, 12, 14, 16, 18, 16, 10, 12]);
        XLSX.utils.book_append_sheet(workbook, ws, sheetName.substring(0, 31));
      }

      // Add aggregated sheet
      const aggregatedRows = Array.from(teamTotals.values())
        .sort((a, b) => (b.totalSum / b.count) - (a.totalSum / a.count))
        .map((item, index) => ({
          'Rank': index + 1,
          'Team ID': item.teamId,
          'Team Name': item.teamName,
          'Domain': item.domain,
          'Judge Count': item.count,
          'Total Score Sum': item.totalSum.toFixed(2),
          'Average Score': (item.totalSum / item.count).toFixed(2)
        }));

      if (aggregatedRows.length > 0) {
        const wsAgg = XLSX.utils.json_to_sheet(aggregatedRows);
        applyWrapAndWidths(wsAgg, [8, 14, 24, 36, 14, 14, 14]);
        XLSX.utils.book_append_sheet(workbook, wsAgg, 'All Teams Aggregated');
        anyData = true;
      }

      // Add Top 3 by Domain sheet
      const top3ByDomainRows: any[] = [];
      for (const domainKey of allDomains) {
        const domainName = domainNames[domainKey] || domainKey;
        const domainTeamsData = Array.from(teamTotals.values())
          .filter(t => t.domain === domainName || t.domain === domainKey)
          .sort((a, b) => (b.totalSum / b.count) - (a.totalSum / a.count))
          .slice(0, 3); // Get top 3

        if (domainTeamsData.length > 0) {
          top3ByDomainRows.push({
            'Domain': domainName,
            'Rank': '',
            'Team ID': '',
            'Team Name': '',
            'Judge Count': '',
            'Total Score Sum': '',
            'Average Score': ''
          });

          domainTeamsData.forEach((team, index) => {
            top3ByDomainRows.push({
              'Domain': '',
              'Rank': index + 1,
              'Team ID': team.teamId,
              'Team Name': team.teamName,
              'Judge Count': team.count,
              'Total Score Sum': team.totalSum.toFixed(2),
              'Average Score': (team.totalSum / team.count).toFixed(2)
            });
          });

          top3ByDomainRows.push({}); // Empty row between domains
        }
      }

      if (top3ByDomainRows.length > 0) {
        const wsTop3 = XLSX.utils.json_to_sheet(top3ByDomainRows);
        applyWrapAndWidths(wsTop3, [38, 8, 14, 24, 14, 14, 14]);
        XLSX.utils.book_append_sheet(workbook, wsTop3, 'Top 3 by Domain');
        anyData = true;
      }

      if (!anyData) {
        toast.dismiss(toastId);
        alert('No data available to export for any domain.');
        return;
      }

      XLSX.writeFile(workbook, `Round1_All_Scores_${mainEvent.name.replace(/\s+/g, '_')}.xlsx`);
      toast.dismiss(toastId);
      toast.success('Round 1 scores exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.dismiss(toastId);
      toast.error('Failed to export Round 1 scores');
    }
  };

  const handleExportRound2Results = async () => {
    if (events.length === 0) {
      alert('No events available.');
      return;
    }

    const toastId = toast.loading('Exporting Round 2 results...');
    try {
      const mainEvent = events[0];
      exportRound2ResultsToExcel(teams, scores, mainEvent, judges);
      toast.dismiss(toastId);
      toast.success('Round 2 results exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.dismiss(toastId);
      toast.error('Failed to export Round 2 results');
    }
  };

  const handleExportRound2CSV = async () => {
    const toastId = toast.loading('Downloading Round 2 results CSV...');
    try {
      await exportRoundTwoResults();
      toast.dismiss(toastId);
      toast.success('Round 2 CSV downloaded successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.dismiss(toastId);
      toast.error('Failed to download Round 2 CSV');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Download className="size-5 sm:size-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">Export Results</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Download competition data in Excel format</p>
        </div>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Round 1 Export */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Download className="size-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-900">Round 1 Scores</h2>
              <p className="text-sm text-slate-600 mt-1">
                Export all Round 1 scores organized by domain with judge details
              </p>
            </div>
          </div>

          <div className="mb-5 pl-1">
            <p className="text-xs font-semibold text-slate-700 mb-2">Includes:</p>
            <ul className="text-sm text-slate-600 space-y-1.5">
              <li>• All domain scores with judge names</li>
              <li>• Team problem statements</li>
              <li>• Individual criterion scores</li>
              <li>• Aggregated results with rankings</li>
              <li>• Top 3 teams by domain</li>
            </ul>
          </div>

          <button
            onClick={handleExportAllRound1Scores}
            className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-black rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Download className="size-5" />
            Export Round 1 Results
          </button>
        </div>

        {/* Round 2 Export */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Download className="size-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-900">Round 2 Results</h2>
              <p className="text-sm text-slate-600 mt-1">
                Export Round 2 scores with external judge evaluations
              </p>
            </div>
          </div>

          <div className="mb-5 pl-1">
            <p className="text-xs font-semibold text-slate-700 mb-2">Includes:</p>
            <ul className="text-sm text-slate-600 space-y-1.5">
              <li>• Top 3 teams per domain</li>
              <li>• External judge scores</li>
              <li>• Final rankings</li>
              <li>• Complete score breakdown</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleExportRound2Results}
              className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 text-black rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Download className="size-5" />
              Export as Excel
            </button>
            <button
              onClick={handleExportRound2CSV}
              className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 text-black rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Download className="size-5" />
              Download as CSV
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Export Information</h3>
            <p className="text-sm text-blue-800">
              Exported files will be downloaded to your default downloads folder.
              The Excel files include multiple sheets with detailed scoring information and can be opened in Microsoft Excel, Google Sheets, or any compatible spreadsheet application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
