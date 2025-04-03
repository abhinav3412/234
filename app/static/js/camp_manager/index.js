// Typewriter Text Loop
const texts = ["Lets's save!", "Protect Lives!"];
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
});


// Populate People List
document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("filter");
  const peopleList = document.getElementById("people-list");

  fetch('/camp_manager/get_people')
      .then(response => response.json())
      .then(data => {
          populatePeopleList(data);

          // Add search event listener
          searchInput.addEventListener("input", function () {
              const searchTerm = searchInput.value.toLowerCase();
              const filteredPeople = data.filter(person =>
                  person.username.toLowerCase().includes(searchTerm)
              );
              populatePeopleList(filteredPeople);
          });
      })
      .catch(error => console.error("Error fetching people:", error));

  function populatePeopleList(people) {
      peopleList.innerHTML = ""; // Clear existing list
      people.forEach(person => {
          const li = document.createElement("li");
          li.innerHTML = `
              <strong>ID:</strong> ${person.uid}<br>
              <strong>Name:</strong> ${person.username}<br>
              <strong>Contact:</strong> ${person.mobile}<br>
              <strong>Place:</strong> ${person.location}
          `;
          peopleList.appendChild(li);
      });
  }
});

// Fake Data for User Requests
const requests = [];
for (let i = 1; i <= 5; i++) {
  requests.push({
    id: `R${i}`,
    user: `User ${i}`,
    request: `Request ${i}`,
  });
}

// Populate Requests List
const requestsList = document.getElementById('requests-list');
requests.forEach(request => {
  const li = document.createElement('li');
  li.innerHTML = `
    <strong>User:</strong> ${request.user}<br>
    <strong>Request:</strong> ${request.request}<br>
    <button class="accept">Accept</button>
    <button class="decline">Decline</button>
  `;
  requestsList.appendChild(li);
});


document.addEventListener("DOMContentLoaded", function () {
  fetch('/camp_manager/get_camp_details')
        .then(response => response.json())
        .then(data => {
            if (!data) return;
            // Default values if data is missing
            const numPeoplePresent = data.num_people_present || 0;
            const capacity = data.capacity || 0;
            
            const foodStockQuota = data.food_stock_quota || 0;
            const foodCapacity = data.food_capacity || 0;
            const waterStockLitres = data.water_stock_litres || 0;
            
            const clothesRemaining = data.clothes_stock || 0;
            const clothesCapacity = data.clothes_capacity || 0;

            const essentialsRemaining = data.essentials_stock || 0;
            const essentialsCapacity = data.essentials_capacity || 0;

            // Update People Capacity Chart
            new Chart(document.getElementById('peopleCapacityChart'), {
                type: 'doughnut',
                data: {
                    labels: ['Current', 'Remaining'],
                    datasets: [{
                        data: [numPeoplePresent, Math.max(capacity - numPeoplePresent, 0)],
                        backgroundColor: ['#2575fc', '#ff6f61'],
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' },
                    },
                },
            });

            // Update Food & Water Section
            document.querySelector('.resource-details').innerHTML = `
                <i class="fas fa-utensils"></i>
                <p><strong>Food Remaining:</strong> ${foodStockQuota} kg</p>
                <p><strong>Food Capacity:</strong> ${foodCapacity} kg</p>
                <i class="fas fa-tint"></i>
                <p><strong>Water Remaining:</strong> ${waterStockLitres} L</p>
                <p><strong>Water Capacity:</strong> 5000 L</p>
            `;

            // Update Clothes & Essentials Section
            document.querySelectorAll('.resource-details')[1].innerHTML = `
                <i class="fas fa-tshirt"></i>
                <p><strong>Clothes:</strong> ${clothesRemaining} sets</p>
                <p><strong>Capacity:</strong> ${clothesCapacity} sets</p>
                <i class="fas fa-first-aid"></i>
                <p><strong>Essentials:</strong> ${essentialsRemaining} kits</p>
                <p><strong>Capacity:</strong> ${essentialsCapacity} kits</p>
            `;



            // Use nullish coalescing (??) to ensure default values
            const campID = data.cid ?? 0;
            const campName = data.camp_name ?? "Unknown";
            const location = data.location ?? "Not Available";
            const campHead = data.camp_head ?? "Unknown";
            const phone = data.mobile ?? "N/A";
            // Update Camp Details Section
            document.querySelector('.camp-details').innerHTML = `
                <div class="detail-item">
                    <i class="fas fa-id-badge"></i>
                    <span><strong>Camp ID:</strong> ${campID}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-id-badge"></i>
                    <span><strong>Camp Name:</strong> ${campName}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span><strong>Location:</strong> ${location}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-user"></i>
                    <span><strong>Camp Head:</strong> ${campHead}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-phone"></i>
                    <span><strong>Phone:</strong> ${phone}</span>
                </div>
            `;

        })
      .catch(error => console.error("Error fetching camp details:", error));
});



// Resource Usage Bar Chart
const resourceChart = new Chart(document.getElementById('resourceChart'), {
  type: 'bar',
  data: {
    labels: ['Food', 'Water', 'Clothes', 'Essentials'],
    datasets: [{
      label: 'Resource Usage',
      data: [500, 3000, 200, 150],
      backgroundColor: ['#2575fc', '#6a11cb', '#ff6f61', '#28a745'],
    }],
  },
});

// Requests Over Time Line Chart
const requestsChart = new Chart(document.getElementById('requestsChart'), {
  type: 'line',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [{
      label: 'Requests Over Time',
      data: [10, 20, 15, 25, 30],
      borderColor: '#ff6f61',
      fill: false,
    }],
  },
});

// Supply Request Form
document.getElementById('send-supply-request').addEventListener('click', () => {
  const food = document.getElementById('food').value;
  const water = document.getElementById('water').value;
  const essentials = document.getElementById('essentials').value;
  const clothes = document.getElementById('clothes').value;

  alert(`Request Sent:\nFood: ${food} kg\nWater: ${water} L\nEssentials: ${essentials} kits\nClothes: ${clothes} sets`);
});