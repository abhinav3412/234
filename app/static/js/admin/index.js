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
  
  // Initialize with empty data, will be updated with real data
  const sensorStatusData = {
    labels: ['Active', 'Inactive', 'Maintenance'],
    datasets: [{
      label: 'Sensor Status',
      data: [0, 0, 0],
      backgroundColor: ['#2575fc', '#6a11cb', '#ff6f61'],
    }]
  };
  
  let sensorStatusChart;

  // Initialize charts when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    try {
      // Initialize user activity chart
      const userActivityCtx = document.getElementById('userActivityChart');
      if (userActivityCtx) {
        const userActivityChart = new Chart(userActivityCtx, {
          type: 'line',
          data: userActivityData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
          }
        });
      }

      // Initialize sensor status chart
      const sensorStatusCtx = document.getElementById('sensorStatusChart');
      if (sensorStatusCtx) {
        sensorStatusChart = new Chart(sensorStatusCtx, {
          type: 'bar',
          data: sensorStatusData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
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

      // Initial data update
      updateSensorCount();
    } catch (error) {
      console.error('Error initializing charts:', error);
    }
  });

// Function to update sensor status chart with real data
async function updateSensorStatusChart() {
    if (!sensorStatusChart) {
        console.error('Chart not initialized yet');
        return;
    }

    try {
        const response = await fetch('/admin/get_sensors');
        if (!response.ok) {
            console.error('Failed to fetch sensor data:', response.status, response.statusText);
            return;
        }
        
        const sensors = await response.json();
        if (!Array.isArray(sensors)) {
            console.error('Invalid sensor data format:', sensors);
            return;
        }
        
        // Count sensors by operational status
        const statusCounts = {
            'Active': 0,
            'Inactive': 0,
            'Maintenance': 0
        };
        
        sensors.forEach(sensor => {
            if (!sensor) return; // Skip null values
            const status = sensor.operational_status || 'Active';
            if (statusCounts.hasOwnProperty(status)) {
                statusCounts[status]++;
            } else {
                statusCounts['Active']++; // Default to Active if unknown status
            }
        });
        
        // Update chart data
        sensorStatusChart.data.datasets[0].data = [
            statusCounts['Active'],
            statusCounts['Inactive'],
            statusCounts['Maintenance']
        ];
        
        // Update the chart
        sensorStatusChart.update();
        
        console.log('Sensor status chart updated with real data:', statusCounts);
    } catch (error) {
        console.error('Error updating sensor status chart:', error);
    }
}

// Function to update sensor count
async function updateSensorCount() {
    try {
        const response = await fetch('/admin/get_sensors');
        if (!response.ok) {
            console.error('Failed to fetch sensor data:', response.status, response.statusText);
            return;
        }
        
        const sensors = await response.json();
        if (!Array.isArray(sensors)) {
            console.error('Invalid sensor data format:', sensors);
            return;
        }
        
        // Filter out null values
        const validSensors = sensors.filter(sensor => sensor !== null);
        const sensorCount = validSensors.length;
        
        // Update the sensor count in the quick stats
        const sensorStat = document.querySelector('.stat:nth-child(4) .value');
        if (sensorStat) {
            sensorStat.textContent = sensorCount;
        }
        
        // Also update the sensor status chart
        await updateSensorStatusChart();
    } catch (error) {
        console.error('Error updating sensor count:', error);
    }
}

// Update sensor count every 5 seconds
setInterval(updateSensorCount, 5000);

// Initial update
updateSensorCount();

// Cache DOM elements
const mapElement = document.getElementById('map');
const alertBox = document.getElementById('alert-box');
const alertMessage = document.getElementById('alert-message');
const alertSound = document.getElementById('alert-sound');
const popupModal = document.getElementById('popup-modal');
const popupMessage = document.getElementById('popup-message');
const confirmShare = document.getElementById('confirm-share');
const cancelShare = document.getElementById('cancel-share');

// Cache map layers
let map;
let normalLayer;
let satelliteLayer;
let userLocationCircle;
let blueDot;

// Cache sensor data
let lastSensorData = null;
let lastDataHash = null;
let markers = [];
let warningCircles = [];
let pulseIntervals = [];

// Optimized distance calculation
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const lat1Rad = lat1 * (Math.PI / 180);
    const lat2Rad = lat2 * (Math.PI / 180);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLng/2) * Math.sin(dLng/2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Optimized sensor data fetching with caching
async function fetchSensorData() {
    try {
        const response = await fetch("/admin/get_sensors");
        if (!response.ok) throw new Error("Failed to fetch sensor data");
        
        const data = await response.json();
        console.log('Fetched sensor data:', data); // Debug log
        
        // Ensure data is an array
        if (!Array.isArray(data)) {
            console.error('Sensor data is not an array:', data);
            return [];
        }
        
        // Process and validate sensor data
        const processedData = data.map(sensor => ({
            name: sensor.name || 'Unknown Sensor',
            status: sensor.status || 'Normal',
            operational_status: sensor.operational_status || 'Active',
            latitude: parseFloat(sensor.latitude) || 0,
            longitude: parseFloat(sensor.longitude) || 0,
            rainfall: sensor.rainfall || 0,
            forecasted_rainfall: sensor.forecasted_rainfall || 0,
            soil_saturation: sensor.soil_saturation || 0,
            slope: sensor.slope || 0,
            seismic_activity: sensor.seismic_activity || 'Low',
            soil_type: sensor.soil_type || 'Unknown',
            risk_level: sensor.risk_level || 'Low',
            predicted_landslide_time: sensor.predicted_landslide_time || 'N/A',
            affected_radius: parseFloat(sensor.affected_radius) || 1000
        }));
        
        console.log('Processed sensor data:', processedData); // Debug log
        return processedData;
    } catch (error) {
        console.error("Error fetching sensor data:", error);
        return [];
    }
}

// Fetch hazardous features near a location using Overpass API
async function fetchHazardousFeatures(lat, lng, radius = 5) {
    const query = `
        [out:json];
        (
            node["natural"="water"](around:${radius * 1000},${lat},${lng});
            way["natural"="water"](around:${radius * 1000},${lat},${lng});
            relation["natural"="water"](around:${radius * 1000},${lat},${lng});
            node["natural"="cliff"](around:${radius * 1000},${lat},${lng});
            way["natural"="cliff"](around:${radius * 1000},${lat},${lng});
            relation["natural"="cliff"](around:${radius * 1000},${lat},${lng});
            node["landuse"="quarry"](around:${radius * 1000},${lat},${lng});
            way["landuse"="quarry"](around:${radius * 1000},${lat},${lng});
            relation["landuse"="quarry"](around:${radius * 1000},${lat},${lng});
            node["geological"="hazard"](around:${radius * 1000},${lat},${lng});
            way["geological"="hazard"](around:${radius * 1000},${lat},${lng});
            relation["geological"="hazard"](around:${radius * 1000},${lat},${lng});
        );
        out center;
    `;

    const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(overpassUrl, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.elements.map(element => {
            if (element.center) {
                return { lat: element.center.lat, lng: element.center.lon };
            } else if (element.lat && element.lon) {
                return { lat: element.lat, lng: element.lon };
            }
            return null;
        }).filter(Boolean);
    } catch (error) {
        console.error("Error fetching hazardous feature data:", error);
        return [];
    }
}

// Clear all intervals to prevent memory leaks
function clearAllIntervals() {
    pulseIntervals.forEach(interval => clearInterval(interval));
    pulseIntervals = [];
}

// Initialize map with sensor data
async function initAdminMap() {
    // Initialize map with optimized settings
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([0, 0], 2);

    // Add zoom control to top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initialize layers with optimized settings
    normalLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        updateWhenIdle: true
    }).addTo(map);

    satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        updateWhenIdle: true
    });

    // Add layer control
    L.control.layers({ "Normal View": normalLayer, "Satellite View": satelliteLayer }).addTo(map);

    // Try to get user location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                const accuracy = position.coords.accuracy;

                // Add user location with optimized styling
                userLocationCircle = L.circle([userLat, userLng], {
                    color: '#4285F4',
                    fillColor: '#4285F4',
                    fillOpacity: 0.3,
                    radius: accuracy
                }).addTo(map);

                blueDot = L.circleMarker([userLat, userLng], {
                    radius: 8,
                    color: '#4285F4',
                    fillColor: '#4285F4',
                    fillOpacity: 1,
                    weight: 2
                }).addTo(map);

                // Add user marker with optimized popup
                L.marker([userLat, userLng])
                    .addTo(map)
                    .bindPopup(`Your Location<br>Lat: ${userLat.toFixed(6)}<br>Lng: ${userLng.toFixed(6)}`);

                // Optimized circle animation
                let growing = true;
                setInterval(() => {
                    const currentRadius = userLocationCircle.getRadius();
                    userLocationCircle.setRadius(growing ? currentRadius * 1.15 : currentRadius * 0.85);
                    growing = !growing;
                }, 800);

                // Add recenter button with optimized styling
                const recenterButton = L.Control.extend({
                    options: { position: 'topleft' },
                    onAdd: () => {
                        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                        Object.assign(container.style, {
                            backgroundColor: 'white',
                            border: '1px solid #ccc',
                            padding: '5px',
                            cursor: 'pointer',
                            borderRadius: '5px'
                        });
                        container.innerHTML = '<span>📍</span>';
                        container.title = 'Recenter';
                        L.DomEvent.on(container, 'click', () => map.setView([userLat, userLng], 15));
                        return container;
                    }
                });
                map.addControl(new recenterButton());

                // Initialize sensor data with user location
                await initializeSensorData(userLat, userLng);
            },
            async (error) => {
                console.error("Error getting user location:", error);
                // Initialize sensor data without user location
                await initializeSensorData();
            }
        );
    } else {
        console.error("Geolocation is not supported by this browser.");
        // Initialize sensor data without user location
        await initializeSensorData();
    }
    
    // Update sensor data every 30 seconds
    setInterval(async () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;
                    await initializeSensorData(userLat, userLng);
                },
                async () => {
                    await initializeSensorData();
                }
            );
        } else {
            await initializeSensorData();
        }
    }, 30000);
}

// Optimized sensor data initialization
async function initializeSensorData(userLat, userLng) {
    // Clear previous intervals
    clearAllIntervals();
    
    const sensors = await fetchSensorData();
    console.log('Fetched sensors:', sensors); // Debug log
    
    const bounds = L.latLngBounds([]);

    // Clear existing markers and circles
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Circle) {
            map.removeLayer(layer);
        }
    });

    // Reset arrays
    markers = [];
    warningCircles = [];

    // Add sensor markers with optimized rendering
    sensors.forEach(sensor => {
        console.log('Processing sensor:', sensor); // Debug log
        const lat = parseFloat(sensor.latitude);
        const lng = parseFloat(sensor.longitude);

        if (!isNaN(lat) && !isNaN(lng)) {
            const marker = L.marker([lat, lng]).addTo(map);
            bounds.extend([lat, lng]);
            markers.push(marker);

            // Optimized popup content
            marker.bindPopup(`
                <strong>${sensor.name}</strong><br>
                Status: ${sensor.status}<br>
                Rainfall: ${sensor.rainfall} mm<br>
                Forecasted Rainfall: ${sensor.forecasted_rainfall || 'N/A'} mm<br>
                Soil Saturation: ${sensor.soil_saturation}%<br>
                Slope: ${sensor.slope}°<br>
                Seismic Activity: ${sensor.seismic_activity}<br>
                Soil Type: ${sensor.soil_type}<br>
                Risk Level: ${sensor.risk_level}<br>
                Predicted Landslide Time: ${sensor.predicted_landslide_time}
            `);

            // Add affected area with optimized styling
            if (sensor.status === 'Alert' || sensor.status === 'Warning') {
                console.log(`Adding warning circle for sensor ${sensor.name} with status ${sensor.status}`);
                
                // Ensure affected_radius is a number and has a reasonable default
                const radius = sensor.affected_radius ? parseFloat(sensor.affected_radius) : 1000;
                console.log(`Circle radius for ${sensor.name}:`, radius);
                
                const circle = L.circle([lat, lng], {
                    color: sensor.status === 'Alert' ? 'red' : 'orange',
                    fillColor: sensor.status === 'Alert' ? '#f03' : '#ffcc00',
                    fillOpacity: 0.5,
                    radius: radius
                }).addTo(map);
                
                warningCircles.push(circle);
                
                // Add pulsing effect to warning circles
                let growing = true;
                const pulseInterval = setInterval(() => {
                    if (circle && circle.getRadius) {
                        const currentRadius = circle.getRadius();
                        circle.setRadius(growing ? currentRadius * 1.1 : currentRadius * 0.9);
                        growing = !growing;
                    }
                }, 1000);
                
                pulseIntervals.push(pulseInterval);

                if (sensor.status === 'Alert') {
                    const warningIcon = L.marker([lat, lng], {
                        icon: L.divIcon({
                            className: 'danger-sign',
                            html: '⚠️',
                            iconSize: [30, 30]
                        })
                    }).addTo(map);
                    markers.push(warningIcon);
                }
            }
        }
    });

    // Update the alerts display
    updateAlerts(sensors);

    // Fit bounds with padding
    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
    } else if (userLat && userLng) {
        map.setView([userLat, userLng], 15);
    }
}

// Initialize alerts when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize map
    await initAdminMap();
    
    // Initial fetch and update of sensor data
    const sensors = await fetchSensorData();
    updateAlerts(sensors);
    
    // Update sensor status chart with real data
    updateSensorStatusChart();
});

// Clean up intervals when page is unloaded
window.addEventListener('beforeunload', clearAllIntervals);

// Optimized alerts update
function updateAlerts(sensors) {
    alertMessage.innerHTML = '';
    
    console.log('Updating alerts with sensors:', sensors);
    
    // Create a table structure for sensor data
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    
    // Create header row
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th>Sensor ID</th>
        <th>Status</th>
        <th>Rainfall</th>
        <th>Forecasted Rainfall</th>
        <th>Soil Saturation</th>
        <th>Slope</th>
        <th>Seismic Activity</th>
        <th>Soil Type</th>
        <th>Risk Level</th>
        <th>Predicted Landslide Time</th>
    `;
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Add each sensor to the table
    sensors.forEach(sensor => {
        console.log('Processing sensor for alerts:', sensor.name, 'Status:', sensor.status, 'Operational Status:', sensor.operational_status);
        
        // Only show alerts for active sensors with Alert or Warning status
        if (sensor.operational_status !== 'Active' || (sensor.status !== 'Alert' && sensor.status !== 'Warning')) {
            console.log('Skipping sensor:', sensor.name, 'Reason: Not active or not in alert/warning status');
            return;
        }
        
        console.log('Adding sensor to alert table:', sensor.name);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sensor.name}</td>
            <td><span style="color: ${sensor.status === 'Alert' ? 'red' : 
                               sensor.status === 'Warning' ? 'orange' : 'green'}">${sensor.status}</span></td>
            <td>${sensor.rainfall}mm</td>
            <td>${sensor.forecasted_rainfall || 'N/A'}mm</td>
            <td>${sensor.soil_saturation}%</td>
            <td>${sensor.slope}°</td>
            <td>${sensor.seismic_activity}</td>
            <td>${sensor.soil_type}</td>
            <td>${sensor.risk_level}</td>
            <td>${sensor.predicted_landslide_time || 'N/A'}</td>
        `;
        tbody.appendChild(row);

        // Add click handler for alert sound and map interaction
        row.addEventListener('click', () => {
            try {
                if (sensor.status === 'Alert' || sensor.status === 'Warning') {
                    alertSound.play().catch(console.log);
                }
            } catch (error) {
                console.log("Audio play error:", error);
            }

            // Update map view and show popup
            map.setView([sensor.latitude, sensor.longitude], 12);
            const marker = L.marker([sensor.latitude, sensor.longitude]).addTo(map);
            marker.bindPopup(`
                <strong>${sensor.name}</strong><br>
                Status: ${sensor.status}<br>
                Rainfall: ${sensor.rainfall} mm<br>
                Forecasted Rainfall: ${sensor.forecasted_rainfall || 'N/A'} mm<br>
                Soil Saturation: ${sensor.soil_saturation}%<br>
                Slope: ${sensor.slope}°<br>
                Seismic Activity: ${sensor.seismic_activity}<br>
                Soil Type: ${sensor.soil_type}<br>
                Risk Level: ${sensor.risk_level}<br>
                Predicted Landslide Time: ${sensor.predicted_landslide_time}
            `).openPopup();
        });
    });
    
    table.appendChild(tbody);
    alertMessage.appendChild(table);
}

// Optimized share alert functionality
document.addEventListener('click', e => {
    if (e.target.classList.contains('share-alert-btn')) {
        const alertText = e.target.closest('.alert-item').querySelector('p').textContent;
        popupMessage.textContent = alertText;
        popupModal.style.display = 'block';
    }
});

// Handle share confirmation
confirmShare.addEventListener('click', () => {
    const alertText = popupMessage.textContent;
    window.open(`https://wa.me/?text=${encodeURIComponent(alertText)}`, '_blank');
    popupModal.style.display = 'none';
});

// Handle share cancellation
cancelShare.addEventListener('click', () => {
    popupModal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', e => {
    if (e.target === popupModal) {
        popupModal.style.display = 'none';
    }
});

// Set up periodic data refresh with optimized interval
setInterval(async () => {
    const newSensors = await fetchSensorData();
    if (newSensors !== lastSensorData) {
        updateAlerts(newSensors);
        updateSensorStatusChart();
    }
}, 60000);