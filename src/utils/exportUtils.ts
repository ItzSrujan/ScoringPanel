import * as XLSX from 'xlsx';
import { Event, TeamWithScores, Score } from '../types';

export const exportScoresToExcel = (
  event: Event,
  teamsWithScores: TeamWithScores[]
) => {
  // Sort teams by average score (descending)
  const sortedTeams = [...teamsWithScores].sort((a, b) => b.averageScore - a.averageScore);

  // Prepare data for export
  const exportData: any[] = [];

  sortedTeams.forEach((team, index) => {
    const rank = index + 1;

    // Add row for each judge's score
    team.individualScores.forEach((score) => {
      const row: any = {
        Rank: rank,
        'Team Name': team.teamName,
        'Team ID': team.id,
        Domain: team.domain,
        'Judge Name': score.judgeName,
        'Judge ID': score.judgeId,
      };

      // Add individual criterion scores
      event.scoringCriteria.forEach((criterion) => {
        row[criterion.name] = score.scores[criterion.id] || 0;
      });

      row['Total Score'] = score.totalScore;
      row['Remarks'] = score.remarks || '';
      row['Submitted At'] = new Date(score.submittedAt).toLocaleString();

      exportData.push(row);
    });

    // Add average score row
    exportData.push({
      Rank: rank,
      'Team Name': team.teamName,
      'Team ID': team.id,
      Domain: team.domain,
      'Judge Name': '** AVERAGE **',
      'Judge ID': '',
      ...event.scoringCriteria.reduce((acc, criterion) => {
        const avgForCriterion = team.individualScores.reduce(
          (sum, score) => sum + (score.scores[criterion.id] || 0),
          0
        ) / team.individualScores.length;
        acc[criterion.name] = avgForCriterion.toFixed(2);
        return acc;
      }, {} as any),
      'Total Score': team.averageScore.toFixed(2),
      'Remarks': `Scored by ${team.scoresReceived}/${team.totalJudges} judges`,
      'Submitted At': ''
    });

    // Add blank row for separation
    exportData.push({});
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  const columnWidths = [
    { wch: 6 },  // Rank
    { wch: 25 }, // Team Name
    { wch: 15 }, // Team ID
    { wch: 20 }, // Domain
    { wch: 25 }, // Judge Name
    { wch: 15 }, // Judge ID
  ];

  // Add widths for criteria columns
  event.scoringCriteria.forEach(() => {
    columnWidths.push({ wch: 18 });
  });

  columnWidths.push({ wch: 12 }); // Total Score
  columnWidths.push({ wch: 40 }); // Remarks
  columnWidths.push({ wch: 20 }); // Submitted At

  worksheet['!cols'] = columnWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Scoring Results');

  // Add summary sheet (without Average Score and Judges Evaluated)
  const summaryData = sortedTeams.map((team, index) => ({
    Rank: index + 1,
    'Team Name': team.teamName,
    Domain: team.domain,
    'Qualification Status': team.qualificationStatus,
    'Team Members': team.members.map(m => m.name).join(', ')
  }));

  const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
  summaryWorksheet['!cols'] = [
    { wch: 6 },  // Rank
    { wch: 25 }, // Team Name
    { wch: 20 }, // Domain
    { wch: 20 }, // Qualification Status
    { wch: 50 }  // Team Members
  ];

  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

  // Generate file name
  const fileName = `${event.name.replace(/\s+/g, '_')}_Scoring_Report_${new Date().toISOString().split('T')[0]}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, fileName);
};

export const exportTeamsToExcel = (eventName: string, teams: any[]) => {
  const exportData = teams.map((team, index) => ({
    'S.No': index + 1,
    'Team ID': team.id,
    'Team Name': team.teamName,
    Domain: team.domain,
    'Member 1': team.members[0]?.name || '',
    'Email 1': team.members[0]?.email || '',
    'Phone 1': team.members[0]?.phone || '',
    'Member 2': team.members[1]?.name || '',
    'Email 2': team.members[1]?.email || '',
    'Phone 2': team.members[1]?.phone || '',
    'Member 3': team.members[2]?.name || '',
    'Email 3': team.members[2]?.email || '',
    'Phone 3': team.members[2]?.phone || '',
    'Member 4': team.members[3]?.name || '',
    'Email 4': team.members[3]?.email || '',
    'Phone 4': team.members[3]?.phone || '',
    'PPT Submitted': team.pptSubmitted ? 'Yes' : 'No',
    'PPT URL': team.pptUrl || '',
    'Status': team.qualificationStatus,
    'Registered On': new Date(team.createdAt).toLocaleDateString()
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Teams');

  const fileName = `${eventName.replace(/\s+/g, '_')}_Teams_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

export const exportJsonToExcel = (
  data: Record<string, unknown>[],
  fileName: string
) => {
  if (!Array.isArray(data) || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

  const safeName = fileName.replace(/\s+/g, '_');
  const finalName = safeName.toLowerCase().endsWith('.xlsx') ? safeName : `${safeName}.xlsx`;
  XLSX.writeFile(workbook, finalName);
};
