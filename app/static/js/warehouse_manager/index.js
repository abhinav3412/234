// Typewriter Text Loop
const texts = ["Your contribution can save lives!", "Be the change!"];
let textIndex = 0; // Tracks the current text
const typewriterElement = document.querySelector('.typewriter-text');

function typeWriter(text, element, callback) {
  let i = 0;
  const interval = setInterval(() => {
    if (i < text.length) {
      element.textContent += text.charAt(i); // Add one character at a time
      i++;
    } else {
      clearInterval(interval); // Stop typing
      setTimeout(() => {
        eraseText(element, callback); // Call erasing function
      }, 2000); // Wait 2 seconds before erasing
    }
  }, 100); // Adjust typing speed (100ms per character)
}

function eraseText(element, callback) {
  let text = element.textContent;
  const interval = setInterval(() => {
    if (text.length > 0) {
      text = text.slice(0, -1); // Remove one character at a time
      element.textContent = text;
    } else {
      clearInterval(interval); // Stop erasing
      callback(); // Call the callback to type the next text
    }
  }, 50); // Adjust erasing speed (50ms per character)
}

function startTypewriter() {
  const currentText = texts[textIndex];
  typeWriter(currentText, typewriterElement, () => {
    textIndex = (textIndex + 1) % texts.length; // Cycle through texts
    startTypewriter(); // Loop back to the next text
  });
}

// Start the typewriter effect on page load
document.addEventListener('DOMContentLoaded', () => {
  startTypewriter();

  // Get DOM elements
  const logoutBtn = document.querySelector(".logout");
  const warehouseId = document.getElementById("warehouse-id");
  const warehouseLocation = document.getElementById("warehouse-location");
  const warehouseCoordinates = document.getElementById("warehouse-coordinates");
  const warehouseStatus = document.getElementById("warehouse-status");
  const foodAvailable = document.getElementById("food-available");
  const foodCapacity = document.getElementById("food-capacity");
  const waterAvailable = document.getElementById("water-available");
  const waterCapacity = document.getElementById("water-capacity");
  const clothesAvailable = document.getElementById("clothes-available");
  const clothesCapacity = document.getElementById("clothes-capacity");
  const essentialsAvailable = document.getElementById("essentials-available");
  const essentialsCapacity = document.getElementById("essentials-capacity");
  const requestsList = document.getElementById('requests-list');

  // Initialize charts
  let availableResourcesChart = null;
  let requestsChart = null;

  // Initialize Available Resources Chart
  function initializeAvailableResourcesChart(data) {
    const ctx = document.getElementById('availableResourcesChart').getContext('2d');
    
    if (availableResourcesChart) {
      availableResourcesChart.destroy();
    }

    availableResourcesChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Food', 'Water', 'Clothes', 'Essentials'],
        datasets: [{
          label: 'Available Resources',
          data: [
            data.food_available,
            data.water_available,
            data.clothes_available,
            data.essentials_available
          ],
          backgroundColor: ['#2575fc', '#6a11cb', '#ff6f61', '#28a745'],
        }],
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.raw || 0;
                return `${label}: ${value}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Quantity',
            },
          },
          x: {
            title: {
              display: true,
              text: 'Resources',
            },
          },
        },
      },
    });
  }

  // Initialize Requests Over Time Chart
  function initializeRequestsChart(data) {
    const ctx = document.getElementById('requestsChart').getContext('2d');
    
    if (requestsChart) {
      requestsChart.destroy();
    }

    requestsChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Requests Over Time',
          data: data.values,
          borderColor: '#ff6f61',
          fill: false,
        }],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  // Update warehouse details
  function updateWarehouseDetails(data) {
    warehouseId.textContent = data.id;
    warehouseLocation.textContent = data.location;
    warehouseCoordinates.textContent = `${data.latitude}, ${data.longitude}`;
    
    // Update status badge
    warehouseStatus.textContent = data.status;
    warehouseStatus.className = 'badge ' + (
      data.status === 'Operational' ? 'bg-success' :
      data.status === 'Maintenance' ? 'bg-warning' : 'bg-danger'
    );
    
    // Update resource details
    foodAvailable.textContent = data.food_available || 0;
    foodCapacity.textContent = data.food_capacity;
    waterAvailable.textContent = data.water_available || 0;
    waterCapacity.textContent = data.water_capacity;
    clothesAvailable.textContent = data.clothes_available || 0;
    clothesCapacity.textContent = data.clothes_capacity;
    essentialsAvailable.textContent = data.essentials_available || 0;
    essentialsCapacity.textContent = data.essential_capacity;
  }

  // Fetch warehouse data
  async function fetchWarehouseData() {
    try {
      const response = await fetch("/warehouse_manager/get_warehouse");
      if (!response.ok) throw new Error("Failed to fetch warehouse data");
      const data = await response.json();
      updateWarehouseDetails(data);
      initializeAvailableResourcesChart(data);
      return data;
    } catch (error) {
      console.error("Error fetching warehouse data:", error);
      alert("Failed to load warehouse data. Please refresh the page.");
      return null;
    }
  }

  // Handle logout
  function handleLogout() {
    window.location.href = "/auth/logout";
  }

  // Event listeners
  logoutBtn.addEventListener("click", handleLogout);

  // Vehicle Management Functions
  async function fetchVehicles() {
    try {
      const response = await fetch("/warehouse_manager/list_vehicles");
      if (!response.ok) throw new Error("Failed to fetch vehicles");
      const vehicles = await response.json();
      updateVehiclesList(vehicles);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  }

  function updateVehiclesList(vehicles) {
    const vehiclesList = document.getElementById('vehicles-list');
    vehiclesList.innerHTML = ''; // Clear existing list

    vehicles.forEach(vehicle => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="vehicle-info">
          <strong>ID:</strong> ${vehicle.vehicle_id}<br>
          <strong>Capacity:</strong> ${vehicle.capacity} kg<br>
          <strong>Status:</strong> ${vehicle.status}
        </div>
        <div class="vehicle-actions">
          <button class="edit-btn" onclick="editVehicle(${vehicle.vid})">Edit</button>
          <button class="delete-btn" onclick="deleteVehicle(${vehicle.vid})">Delete</button>
        </div>
      `;
      vehiclesList.appendChild(li);
    });
  }

  async function addVehicle(event) {
    event.preventDefault();
    const vehicleId = document.getElementById('vehicle-id').value;
    const capacity = document.getElementById('vehicle-capacity').value;

    try {
        // First get the warehouse data to get the warehouse_id
        const warehouseResponse = await fetch("/warehouse_manager/get_warehouse");
        if (!warehouseResponse.ok) throw new Error("Failed to fetch warehouse data");
        const warehouseData = await warehouseResponse.json();

        const response = await fetch("/warehouse_manager/add_vehicle", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                vehicle_id: vehicleId,
                capacity: parseFloat(capacity),
                warehouse_id: warehouseData.id
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to add vehicle");
        }

        const newVehicle = await response.json();
        await fetchVehicles(); // Refresh the vehicles list
        document.getElementById('add-vehicle-form').reset();
        alert("Vehicle added successfully!");
    } catch (error) {
        console.error("Error adding vehicle:", error);
        alert(error.message || "Failed to add vehicle");
    }
  }

  async function editVehicle(vid) {
    try {
      const vehicle = await fetch(`/warehouse_manager/list_vehicles`).then(res => res.json())
        .then(vehicles => vehicles.find(v => v.vid === vid));

      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      // Create modal container
      const modalContainer = document.createElement('div');
      modalContainer.className = 'modal-container';
      modalContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      `;

      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';
      modalContent.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 5px;
        width: 400px;
        max-width: 90%;
      `;

      // Create form
      const form = document.createElement('form');
      form.innerHTML = `
        <h3 style="margin-top: 0;">Edit Vehicle</h3>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px;">Vehicle ID</label>
          <input type="text" id="edit-vehicle-id" value="${vehicle.vehicle_id}" required
            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px;">Capacity (kg)</label>
          <input type="number" id="edit-vehicle-capacity" value="${vehicle.capacity}" required
            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px;">Status</label>
          <select id="edit-vehicle-status" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            <option value="Available" ${vehicle.status === 'Available' ? 'selected' : ''}>Available</option>
            <option value="In Use" ${vehicle.status === 'In Use' ? 'selected' : ''}>In Use</option>
            <option value="Maintenance" ${vehicle.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
          </select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" onclick="closeModal()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
          <button type="button" onclick="submitEditVehicle(${vid})" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Save Changes</button>
        </div>
      `;

      // Add form to modal content
      modalContent.appendChild(form);
      modalContainer.appendChild(modalContent);
      document.body.appendChild(modalContainer);

      // Store form elements for later use
      window.editForm = form;
      window.currentModal = modalContainer;
    } catch (error) {
      console.error('Error editing vehicle:', error);
      alert('Failed to edit vehicle: ' + error.message);
    }
  }

  function closeModal() {
    if (window.currentModal) {
      window.currentModal.remove();
      window.currentModal = null;
    }
  }

  async function submitEditVehicle(vid) {
    try {
      const form = window.editForm;
      const vehicleId = form.querySelector('#edit-vehicle-id').value;
      const capacity = form.querySelector('#edit-vehicle-capacity').value;
      const status = form.querySelector('#edit-vehicle-status').value;

      const response = await fetch(`/warehouse_manager/update_vehicle/${vid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          capacity: parseFloat(capacity),
          status: status
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update vehicle');
      }

      // Close modal and refresh list
      closeModal();
      await fetchVehicles();
      alert('Vehicle updated successfully');
    } catch (error) {
      console.error('Error updating vehicle:', error);
      alert('Failed to update vehicle: ' + error.message);
    }
  }

  async function deleteVehicle(vid) {
    if (!confirm('Are you sure you want to delete this vehicle?')) {
      return;
    }

    try {
      const response = await fetch(`/warehouse_manager/delete_vehicle/${vid}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete vehicle');
      }

      await fetchVehicles();
      alert('Vehicle deleted successfully');
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      alert('Failed to delete vehicle: ' + error.message);
    }
  }

  // Make functions available globally
  window.editVehicle = editVehicle;
  window.submitEditVehicle = submitEditVehicle;
  window.deleteVehicle = deleteVehicle;
  window.closeModal = closeModal;

  // Add event listeners for vehicle management
  document.getElementById('add-vehicle-form').addEventListener('submit', addVehicle);

  // Initial data fetch
  fetchWarehouseData();
  fetchVehicles(); // Add this line to fetch vehicles on page load
});