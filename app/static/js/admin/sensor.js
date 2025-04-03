// Mock Data for Sensors
const sensors = [
    {
        id: "S001",
        location: "Forest Edge",
        coordinates: "19.0760, 72.8777",
        status: "Active",
        description: "Monitors temperature and humidity."
    },
    {
        id: "S002",
        location: "River Bank",
        coordinates: "28.7041, 77.1025",
        status: "Inactive",
        description: "Detects water levels."
    }
];

// DOM Elements
const sensorTableBody = document.getElementById("sensor-table-body");
const addSensorBtn = document.getElementById("add-sensor-btn");
const sensorModal = document.getElementById("sensor-modal");
const closeModalBtn = document.querySelector(".close");
const sensorForm = document.getElementById("sensor-form");

// Populate Table
function populateTable() {
    sensorTableBody.innerHTML = "";
    sensors.forEach((sensor, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${sensor.id}</td>
            <td>${sensor.location}</td>
            <td>
                <button class="edit-btn" onclick="editSensor(${index})">Edit</button>
                <button class="delete-btn" onclick="deleteSensor(${index})">Delete</button>
            </td>
        `;
        row.addEventListener("click", () => showSensorDetails(sensor));
        sensorTableBody.appendChild(row);
    });
}

// Add Sensor
addSensorBtn.addEventListener("click", () => {
    document.getElementById("modal-title").textContent = "Add New Sensor";
    sensorModal.style.display = "flex";
});

// Close Modal
closeModalBtn.addEventListener("click", () => {
    sensorModal.style.display = "none";
});

// Handle Form Submission
sensorForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const sensor = {
        id: document.getElementById("sensor-id").value,
        location: document.getElementById("location").value,
        coordinates: document.getElementById("coordinates").value,
        status: document.getElementById("status").value,
        description: document.getElementById("description").value,
    };

    const modalTitle = document.getElementById("modal-title").textContent;
    if (modalTitle === "Add New Sensor") {
        sensors.push(sensor);
    } else {
        const index = parseInt(document.getElementById("sensor-index").value);
        sensors[index] = sensor;
    }

    populateTable();
    sensorModal.style.display = "none";
    sensorForm.reset();
});

// Delete Sensor
function deleteSensor(index) {
    sensors.splice(index, 1);
    populateTable();
}

// Edit Sensor
function editSensor(index) {
    const sensor = sensors[index];
    document.getElementById("modal-title").textContent = "Edit Sensor";
    document.getElementById("sensor-id").value = sensor.id;
    document.getElementById("location").value = sensor.location;
    document.getElementById("coordinates").value = sensor.coordinates;
    document.getElementById("status").value = sensor.status;
    document.getElementById("description").value = sensor.description;
    document.getElementById("sensor-index").value = index;

    sensorModal.style.display = "flex";
}

// Show Sensor Details
function showSensorDetails(sensor) {
    const detailsModal = document.getElementById("sensor-details-modal");
    document.getElementById("details-id").textContent = sensor.id;
    document.getElementById("details-location").textContent = sensor.location;
    document.getElementById("details-coordinates").textContent = sensor.coordinates;
    document.getElementById("details-status").textContent = sensor.status;
    document.getElementById("details-description").textContent = sensor.description;

    detailsModal.style.display = "flex";
}

// Close Sensor Details Modal
document.querySelectorAll(".close").forEach((btn) => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".modal").forEach((modal) => {
            modal.style.display = "none";
        });
    });
});

// Initialize Table
populateTable();