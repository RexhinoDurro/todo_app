// static/js/charts.js - Chart Initialization and Data Processing

let productivityChart = null;
let categoryChart = null;

// Chart Configuration
const chartConfig = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
            labels: {
                padding: 20,
                usePointStyle: true,
                font: {
                    size: 12
                }
            }
        },
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            cornerRadius: 8,
            titleFont: {
                size: 14,
                weight: 'bold'
            },
            bodyFont: {
                size: 13
            }
        }
    }
};

// Initialize Charts
function initializeCharts() {
    initProductivityChart();
    initCategoryChart();
}

// Productivity Chart
function initProductivityChart() {
    const ctx = document.getElementById('productivityChart');
    if (!ctx) return;
    
    productivityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Tasks Created',
                    data: [],
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Tasks Completed',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            ...chartConfig,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Category Chart
function initCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            ...chartConfig,
            cutout: '60%',
            plugins: {
                ...chartConfig.plugins,
                legend: {
                    ...chartConfig.plugins.legend,
                    position: 'right'
                }
            }
        }
    });
}

// Update Productivity Chart
async function updateProductivityChart() {
    try {
        const stats = await statsAPI.getOverview();
        
        if (!stats.daily_activity || !productivityChart) return;
        
        const labels = stats.daily_activity.map(day => day.day);
        const created = stats.daily_activity.map(day => day.created);
        const completed = stats.daily_activity.map(day => day.completed);
        
        productivityChart.data.labels = labels;
        productivityChart.data.datasets[0].data = created;
        productivityChart.data.datasets[1].data = completed;
        
        productivityChart.update();
    } catch (error) {
        console.error('Failed to update productivity chart:', error);
    }
}

// Update Category Chart
async function updateCategoryChart() {
    try {
        const stats = await statsAPI.getOverview();
        
        if (!stats.categories || !categoryChart) return;
        
        const labels = stats.categories.map(cat => cat.category__name || 'Uncategorized');
        const data = stats.categories.map(cat => cat.total);
        const colors = stats.categories.map(cat => cat.category__color || '#6b7280');
        
        categoryChart.data.labels = labels;
        categoryChart.data.datasets[0].data = data;
        categoryChart.data.datasets[0].backgroundColor = colors;
        
        categoryChart.update();
    } catch (error) {
        console.error('Failed to update category chart:', error);
    }
}

// Create Activity Chart (for modal or expanded view)
function createActivityHeatmap(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Create a simple heatmap using divs
    const weeks = 12; // Show last 12 weeks
    const days = 7;
    
    let html = '<div class="activity-heatmap">';
    
    // Day labels
    html += '<div class="heatmap-days">';
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(day => {
        html += `<div class="heatmap-day-label">${day}</div>`;
    });
    html += '</div>';
    
    // Weeks
    html += '<div class="heatmap-weeks">';
    
    for (let week = 0; week < weeks; week++) {
        html += '<div class="heatmap-week">';
        for (let day = 0; day < days; day++) {
            const intensity = Math.floor(Math.random() * 5); // Replace with actual data
            html += `<div class="heatmap-cell" data-intensity="${intensity}" title="2 tasks completed"></div>`;
        }
        html += '</div>';
    }
    
    html += '</div></div>';
    
    container.innerHTML = html;
}

// Create Progress Comparison Chart
function createProgressChart(current, previous, label) {
    const increase = ((current - previous) / previous * 100).toFixed(1);
    const isPositive = increase >= 0;
    
    return `
        <div class="progress-comparison">
            <div class="progress-value">${current}</div>
            <div class="progress-label">${label}</div>
            <div class="progress-change ${isPositive ? 'positive' : 'negative'}">
                ${isPositive ? '↑' : '↓'} ${Math.abs(increase)}%
            </div>
        </div>
    `;
}

// Create Task Distribution Chart
function createDistributionChart(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const ctx = container.getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Tasks',
                data: data.values,
                backgroundColor: '#6366f1',
                borderRadius: 8
            }]
        },
        options: {
            ...chartConfig,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Create Burndown Chart
function createBurndownChart(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const ctx = container.getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.dates,
            datasets: [
                {
                    label: 'Ideal',
                    data: data.ideal,
                    borderColor: '#e5e7eb',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0
                },
                {
                    label: 'Actual',
                    data: data.actual,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            ...chartConfig,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Remaining Tasks'
                    }
                }
            }
        }
    });
}

// Update All Charts
async function updateAllCharts() {
    await updateProductivityChart();
    await updateCategoryChart();
}

// Export Chart as Image
function exportChart(chartInstance, filename = 'chart.png') {
    if (!chartInstance) return;
    
    const url = chartInstance.toBase64Image();
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
}

// Destroy Charts (for cleanup)
function destroyCharts() {
    if (productivityChart) {
        productivityChart.destroy();
        productivityChart = null;
    }
    
    if (categoryChart) {
        categoryChart.destroy();
        categoryChart = null;
    }
}

// Theme Change Handler for Charts
function updateChartsTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    const textColor = isDark ? '#e5e7eb' : '#374151';
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    
    const charts = [productivityChart, categoryChart];
    
    charts.forEach(chart => {
        if (!chart) return;
        
        // Update text colors
        chart.options.plugins.legend.labels.color = textColor;
        chart.options.plugins.tooltip.titleColor = '#ffffff';
        chart.options.plugins.tooltip.bodyColor = '#ffffff';
        
        // Update grid colors
        if (chart.options.scales) {
            Object.values(chart.options.scales).forEach(scale => {
                scale.ticks.color = textColor;
                scale.grid.color = gridColor;
                if (scale.title) {
                    scale.title.color = textColor;
                }
            });
        }
        
        chart.update();
    });
}

// Listen for theme changes
document.addEventListener('themeChanged', updateChartsTheme);

// Chart Styles (add to styles.css)
const chartStyles = `
.activity-heatmap {
    display: flex;
    gap: 10px;
    padding: 20px;
}

.heatmap-days {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-right: 5px;
}

.heatmap-day-label {
    height: 13px;
    width: 13px;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
}

.heatmap-weeks {
    display: flex;
    gap: 2px;
}

.heatmap-week {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.heatmap-cell {
    width: 13px;
    height: 13px;
    border-radius: 2px;
    background: var(--border);
    cursor: pointer;
    transition: all 0.2s;
}

.heatmap-cell[data-intensity="0"] { background: var(--border); }
.heatmap-cell[data-intensity="1"] { background: #c7d2fe; }
.heatmap-cell[data-intensity="2"] { background: #a5b4fc; }
.heatmap-cell[data-intensity="3"] { background: #818cf8; }
.heatmap-cell[data-intensity="4"] { background: #6366f1; }

.heatmap-cell:hover {
    outline: 2px solid var(--primary);
    outline-offset: 1px;
}

.progress-comparison {
    text-align: center;
    padding: 20px;
    background: var(--light);
    border-radius: var(--radius-lg);
}

.progress-value {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--primary);
}

.progress-label {
    color: var(--text-muted);
    margin: 5px 0;
}

.progress-change {
    font-size: 0.875rem;
    font-weight: 600;
}

.progress-change.positive {
    color: var(--success);
}

.progress-change.negative {
    color: var(--danger);
}
`;