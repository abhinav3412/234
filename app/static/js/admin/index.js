// Fake Data for Charts
const userActivityData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'User Activity',
      data: [65, 59, 80, 81, 56, 55],
      borderColor: '#ff6f61',
      fill: false,
    }]
  };
  
  const sensorStatusData = {
    labels: ['Active', 'Inactive', 'Maintenance'],
    datasets: [{
      label: 'Sensor Status',
      data: [400, 50, 30],
      backgroundColor: ['#2575fc', '#6a11cb', '#ff6f61'],
    }]
  };
  
  // Render Charts
  const userActivityChart = new Chart(document.getElementById('userActivityChart'), {
    type: 'line',
    data: userActivityData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
    },
  });
  
  const sensorStatusChart = new Chart(document.getElementById('sensorStatusChart'), {
    type: 'bar',
    data: sensorStatusData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
    },
  });

// Function to update sensor count
async function updateSensorCount() {
    try {
        const response = await fetch('/admin/get_sensors');
        const sensors = await response.json();
        const sensorCount = sensors.length;
        
        // Update the sensor count in the quick stats
        const sensorStat = document.querySelector('.stat:nth-child(4) .value');
        if (sensorStat) {
            sensorStat.textContent = sensorCount;
        }
    } catch (error) {
        console.error('Error updating sensor count:', error);
    }
}

// Update sensor count every 5 seconds
setInterval(updateSensorCount, 5000);

// Initial update
updateSensorCount();