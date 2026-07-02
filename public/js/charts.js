/**
 * Dashboard Chart.js configurations
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!window.chartsData) return;

  const data = window.chartsData;

  // Chart options defaults
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 16,
          font: { family: 'Inter', size: 11 }
        }
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: 'Poppins', size: 13 },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 10,
        cornerRadius: 6
      }
    }
  };

  // 1. Daily Attendance Line Chart
  const lineCtx = document.getElementById('dailyLineChartEl');
  if (lineCtx) {
    new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: data.dailyLineChart.labels,
        datasets: [
          {
            label: 'Present',
            data: data.dailyLineChart.present,
            borderColor: '#2563eb', // Blue
            backgroundColor: 'rgba(37, 99, 235, 0.05)',
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#2563eb'
          },
          {
            label: 'Absent',
            data: data.dailyLineChart.absent,
            borderColor: '#f43f5e', // Rose/Red
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: '#f43f5e'
          },
          {
            label: 'On Leave',
            data: data.dailyLineChart.leave,
            borderColor: '#a855f7', // Purple
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: '#a855f7'
          }
        ]
      },
      options: {
        ...chartOptions,
        scales: {
          y: {
            grid: { color: '#f1f5f9' },
            ticks: { font: { family: 'Inter' }, precision: 0 }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter' } }
          }
        }
      }
    });
  }

  // 2. Department-wise Pie (Doughnut) Chart
  const pieCtx = document.getElementById('deptPieChartEl');
  if (pieCtx) {
    new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: data.deptPieChart.labels,
        datasets: [{
          data: data.deptPieChart.counts,
          backgroundColor: [
            '#3b82f6', // Blue
            '#ec4899', // Pink
            '#8b5cf6', // Indigo
            '#10b981', // Emerald
            '#f59e0b', // Amber
            '#06b6d4'  // Cyan
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        ...chartOptions,
        cutout: '65%',
        plugins: {
          ...chartOptions.plugins,
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 10,
              font: { family: 'Inter', size: 10 }
            }
          }
        }
      }
    });
  }

  // 3. Monthly Attendance Bar Chart
  const barCtx = document.getElementById('monthlyBarChartEl');
  if (barCtx) {
    new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: data.monthlyBarChart.labels,
        datasets: [
          {
            label: 'Present Today / Avg',
            data: data.monthlyBarChart.present,
            backgroundColor: '#3b82f6',
            borderRadius: 6,
            barThickness: 18
          },
          {
            label: 'Absent Today / Avg',
            data: data.monthlyBarChart.absent,
            backgroundColor: '#cbd5e1',
            borderRadius: 6,
            barThickness: 18
          }
        ]
      },
      options: {
        ...chartOptions,
        scales: {
          y: {
            grid: { color: '#f1f5f9' },
            ticks: { font: { family: 'Inter' }, precision: 0 }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter' } }
          }
        }
      }
    });
  }
});
