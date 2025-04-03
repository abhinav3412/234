document.addEventListener("DOMContentLoaded", () => {
    let camps = [];
    let currentCampIndex = 0;
    let map = null; // Ensure map is only initialized once

    // Fetch Camps from Backend
    async function fetchCamps() {
        try {
            const response = await fetch('/user/list_all_camps');
            if (!response.ok) throw new Error("Failed to fetch camp data");

            camps = await response.json();
            console.log("Fetched camps:", camps);

            if (!Array.isArray(camps) || camps.length === 0) {
                alert("No camps available.");
                return;
            }

            // Update the map with the first camp
            if (camps[0]) {
                initMap(camps[0]);
            }

            // Update the camp details
            updateCampDetails();

            // Initialize the chart with the first camp's data
            if (camps[0]) {
                initializeChart(camps[0].food_capacity, camps[0].water_capacity);
            }

            // Add event listeners
            addEventListeners();

        } catch (error) {
            console.error("Error fetching camps:", error);
            alert("Error: Failed to fetch camp data");
        }
    }

    // Initialize App with Fetched Camps
    function initializeAppWithCamps() {
        currentCampIndex = 0; // Reset index
        initMap(camps[currentCampIndex]); // Initialize map with first camp
        updateCampDetails();
        addEventListeners();
    }

    // Initialize Map
    function initMap(camp) {
        if (!camp || !camp.coordinates_lat || !camp.coordinates_lng) {
            console.error("Invalid camp data for map initialization.");
            return;
        }

        const center = [camp.coordinates_lat, camp.coordinates_lng];

        if (!map) { 
            map = L.map("map").setView(center, 12);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
        } 

        updateMap();
    }

    // Update Map
    function updateMap() {
        if (!camps || camps.length === 0) return;
        if (currentCampIndex >= camps.length) return;

        const currentCamp = camps[currentCampIndex];
        if (!currentCamp || !currentCamp.coordinates_lat || !currentCamp.coordinates_lng) return;

        const center = [currentCamp.coordinates_lat, currentCamp.coordinates_lng];

        map.setView(center, 12);

        // Remove existing markers
        map.eachLayer(layer => {
            if (layer instanceof L.Marker) map.removeLayer(layer);
        });

        L.marker(center).addTo(map)
            .bindPopup(currentCamp.location)
            .openPopup();

        document.getElementById("directions-btn").onclick = () => {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${center[0]},${center[1]}`, "_blank");
        };
    }

    // Initialize Chart
    let resourcesChart;

    function initializeChart(food, water) {
        const ctx = document.getElementById("resources-chart").getContext("2d");
        if (resourcesChart) resourcesChart.destroy();

        resourcesChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: ["Food Capacity (kg)", "Water Capacity (liters)"],
                datasets: [{
                    label: "Camp Resources Capacity",
                    data: [food, water],
                    backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(153, 102, 255, 0.6)"],
                    borderColor: ["rgba(75, 192, 192, 1)", "rgba(153, 102, 255, 1)"],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { 
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Capacity'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Camp Resource Capacities'
                    }
                }
            }
        });
    }

    // Update Camp Details
    function updateCampDetails() {
        if (!camps || camps.length === 0) return;

        const currentCamp = camps[currentCampIndex];

        // Update basic camp information
        const elements = {
            "camp-id": currentCamp.cid || "N/A",
            "camp-location": currentCamp.location || "N/A",
            "camp-status": currentCamp.status || "N/A",
            "camp-capacity": `${currentCamp.current_occupancy || 0} / ${currentCamp.capacity || 0} people`,
            "camp-food": `${currentCamp.food_capacity || 0} kg`,
            "camp-water": `${currentCamp.water_capacity || 0} liters`,
            "camp-contact": currentCamp.contact_number || "N/A"
        };

        // Update each element if it exists
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        // Update chart with current capacity data
        initializeChart(currentCamp.food_capacity, currentCamp.water_capacity);
        
        // Update map and notifications
        updateMap();
        fetchAndDisplayNotifications(currentCamp.cid);
    }

    // Add Event Listeners
    function addEventListeners() {
        document.getElementById("next-camp-btn").addEventListener("click", () => {
            if (!camps.length) return;
            currentCampIndex = (currentCampIndex + 1) % camps.length;
            updateCampDetails();
        });

        document.getElementById("prev-camp-btn").addEventListener("click", () => {
            if (!camps.length) return;
            currentCampIndex = (currentCampIndex - 1 + camps.length) % camps.length;
            updateCampDetails();
        });

        document.getElementById("search-btn").addEventListener("click", async () => {
            const searchInput = document.getElementById("search-input").value.trim().toLowerCase();
            const currentCamp = camps[currentCampIndex];
            const searchResultContainer = document.getElementById("search-result");
        
            try {
                const response = await fetch(`/user/people-list/${currentCamp.cid}`);
                if (!response.ok) throw new Error("Failed to fetch people list");
        
                const people = await response.json();
                searchResultContainer.innerHTML = ""; // Clear previous results
        
                if (!Array.isArray(people) || people.length === 0) {
                    searchResultContainer.textContent = "No people found in this camp.";
                    return;
                }
 
                const matchingPeople = people.filter(person =>
                    person.name.toLowerCase().includes(searchInput)
                );
                
                if (matchingPeople.length === 0) {
                    searchResultContainer.textContent = "No matching records found.";
                } else {
                    const list = document.createElement("ul");
                    matchingPeople.forEach(person => {
                        const listItem = document.createElement("li");
                        listItem.textContent = `${person.name} (UID: ${person.uid})`;
                        list.appendChild(listItem);
                    });
                    searchResultContainer.appendChild(list);
                }
            } catch (error) {
                console.error("Error fetching people list:", error);
                searchResultContainer.textContent = "Error fetching people list.";
            }
        });
    }

    // Fetch and Display Notifications for a each Camp
    async function fetchAndDisplayNotifications(camp_id) {
        try {
            const response = await fetch(`/user/camp_notification/${camp_id}`);
            if (!response.ok) throw new Error("Failed to fetch notifications");
            const notifications = await response.json();

            const announcementsList = document.getElementById("announcements-list");
            announcementsList.innerHTML = ""; // Clear existing announcements

            if (notifications.length === 0) {
                const noAnnouncementItem = document.createElement("li");
                noAnnouncementItem.textContent = "No announcements available.";
                noAnnouncementItem.style.color = "gray";
                noAnnouncementItem.style.fontStyle = "italic";
                announcementsList.appendChild(noAnnouncementItem);
            } else {
                notifications.forEach(notification => {
                    const listItem = document.createElement("li");
                    listItem.textContent = notification.message;
                    announcementsList.appendChild(listItem);
                });
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
            const announcementsList = document.getElementById("announcements-list");
            announcementsList.innerHTML = ""; // Clear existing announcements
            const errorItem = document.createElement("li");
            errorItem.textContent = "Error loading announcements.";
            errorItem.style.color = "red";
            announcementsList.appendChild(errorItem);
        }
    }




    // Show/hide request form popup
    const requestSlotBtn = document.getElementById('request-slot-btn');
    const requestFormPopup = document.getElementById('request-form-popup');
    const closeBtn = document.querySelector('.close-btn');

    requestSlotBtn.addEventListener('click', () => {
        requestFormPopup.style.display = 'flex';
    });

    closeBtn.addEventListener('click', () => {
        requestFormPopup.style.display = 'none';
    });

    // Close popup when clicking outside the content
    window.addEventListener('click', (event) => {
        if (event.target === requestFormPopup) {
            requestFormPopup.style.display = 'none';
        }
    });

    // Fetch Camps on Page Load
    fetchCamps();
});


