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
  fetchCampDetails();
  fetchUserRequests();
  
  // Fetch people in camp
  async function fetchPeople() {
    try {
      const response = await fetch('/camp_manager/get_people');
      if (!response.ok) throw new Error('Failed to fetch people');
      
      const people = await response.json();
      const peopleList = document.getElementById('people-list');
      peopleList.innerHTML = '';
      
      if (people.length === 0) {
        const noPersonItem = document.createElement('li');
        noPersonItem.textContent = 'No people in camp';
        noPersonItem.style.color = 'gray';
        noPersonItem.style.fontStyle = 'italic';
        peopleList.appendChild(noPersonItem);
        return;
      }

      people.forEach(person => {
        const li = document.createElement('li');
        li.className = 'person-item';
        li.innerHTML = `
          <div class="person-info">
            <p><strong>Name:</strong> ${person.name}</p>
            <p><strong>Phone:</strong> ${person.phone}</p>
            <p><strong>Entry Date:</strong> ${person.entry_date}</p>
          </div>
        `;
        peopleList.appendChild(li);
      });

      // Update the filter functionality
      const filter = document.getElementById('filter');
      if (filter) {
        filter.addEventListener('input', function() {
          const filterValue = this.value.toLowerCase();
          const peopleItems = peopleList.getElementsByClassName('person-item');
          
          Array.from(peopleItems).forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(filterValue) ? '' : 'none';
          });
        });
      }
    } catch (error) {
      console.error('Error fetching people:', error);
      const peopleList = document.getElementById('people-list');
      peopleList.innerHTML = `
        <li style="color: red; padding: 10px; text-align: center;">
          Error loading people list: ${error.message}
        </li>
      `;
    }
  }

  // Fetch camp details
  async function fetchCampDetails() {
    try {
      const response = await fetch('/camp_manager/get_camp_details');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch camp details');
      }
      
      const data = await response.json();
      
      // Update resource remaining values
      document.getElementById('food-remaining').textContent = data.food_stock_quota || 0;
      document.getElementById('water-remaining').textContent = data.water_stock_litres || 0;
      document.getElementById('clothes-remaining').textContent = data.clothes_stock || 0;
      document.getElementById('essentials-remaining').textContent = data.essentials_stock || 0;
      
    } catch (error) {
      console.error('Error fetching camp details:', error);
      // Display error message to user
      const errorMessage = document.createElement('div');
      errorMessage.className = 'alert alert-danger';
      errorMessage.textContent = `Error: ${error.message}`;
      document.querySelector('.row').prepend(errorMessage);
    }
  }

  // Handle supply request submission
  document.getElementById('send-supply-request').addEventListener('click', async () => {
    const food = document.getElementById('food').value;
    const water = document.getElementById('water').value;
    const essentials = document.getElementById('essentials').value;
    const clothes = document.getElementById('clothes').value;

    if (!food && !water && !essentials && !clothes) {
      alert('Please enter at least one item quantity');
      return;
    }

    const items = {
      food: parseInt(food) || 0,
      water: parseInt(water) || 0,
      essentials: parseInt(essentials) || 0,
      clothes: parseInt(clothes) || 0
    };

    try {
      const response = await fetch('/camp_manager/request_resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items })
      });

      const data = await response.json();

      if (data.success) {
        // Show delivery status
        const deliveryStatus = document.getElementById('delivery-status');
        deliveryStatus.style.display = 'block';

        // Update delivery status details
        document.getElementById('warehouse-name').textContent = data.data.warehouse;
        document.getElementById('vehicle-id').textContent = data.data.vehicle_id;
        document.getElementById('delivery-eta').textContent = data.data.eta;
        document.getElementById('delivery-status-text').textContent = 'In Transit';

        // Clear form
        document.getElementById('food').value = '';
        document.getElementById('water').value = '';
        document.getElementById('essentials').value = '';
        document.getElementById('clothes').value = '';

        // Update resource remaining values
        await fetchCampDetails();
      } else {
        alert(data.message || 'Failed to request resources');
      }
    } catch (error) {
      console.error('Error requesting resources:', error);
      alert('Failed to request resources. Please try again.');
    }
  });

  // Filter people list
  document.getElementById('filter').addEventListener('input', function() {
    const filterValue = this.value.toLowerCase();
    const peopleList = document.getElementById('people-list');
    const people = peopleList.getElementsByTagName('li');
    
    for (let i = 0; i < people.length; i++) {
      const text = people[i].textContent.toLowerCase();
      if (text.includes(filterValue)) {
        people[i].style.display = '';
      } else {
        people[i].style.display = 'none';
      }
    }
  });

  // Function to update delivery status
  async function updateDeliveryStatus() {
    try {
      const response = await fetch('/camp_manager/get_delivery_status');
      if (!response.ok) throw new Error('Failed to fetch delivery status');
      
      const data = await response.json();
      const deliveryStatus = document.getElementById('delivery-status');
      
      if (data.success && data.deliveries.length > 0) {
        // Show delivery status section
        deliveryStatus.style.display = 'block';
        
        // Update delivery status details with the most recent delivery
        const latestDelivery = data.deliveries[0];
        document.getElementById('warehouse-name').textContent = latestDelivery.warehouse;
        document.getElementById('vehicle-id').textContent = latestDelivery.vehicle_id;
        document.getElementById('delivery-eta').textContent = latestDelivery.eta;
        document.getElementById('delivery-status-text').textContent = 'In Transit';
      } else {
        // Hide delivery status if no active deliveries
        deliveryStatus.style.display = 'none';
      }
    } catch (error) {
      console.error('Error updating delivery status:', error);
    }
  }

  // Function to fetch and display user requests
  async function fetchUserRequests() {
    try {
      const response = await fetch('/camp_manager/get_user_requests');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch user requests');
      }
      const requests = await response.json();
      
      const requestsList = document.getElementById('requests-list');
      requestsList.innerHTML = ''; // Clear existing requests
      
      if (requests.length === 0) {
        const noRequestsItem = document.createElement('li');
        noRequestsItem.textContent = 'No pending requests';
        noRequestsItem.style.color = 'gray';
        noRequestsItem.style.fontStyle = 'italic';
        requestsList.appendChild(noRequestsItem);
        return;
      }
      
      requests.forEach(request => {
        const listItem = document.createElement('li');
        listItem.className = 'request-item';
        listItem.innerHTML = `
          <div class="request-info">
            <p><strong>Name:</strong> ${request.name}</p>
            <p><strong>Phone:</strong> ${request.phone}</p>
            <p><strong>Slots:</strong> ${request.number_slots}</p>
            <p><strong>Priority:</strong> ${request.priority}</p>
            <p><strong>Status:</strong> ${request.status}</p>
            <p><strong>Requested:</strong> ${request.created_at}</p>
          </div>
          ${request.status === 'Pending' ? `
            <div class="request-actions">
              <button onclick="updateRequestStatus(${request.id}, 'Approved')" class="approve-btn">Approve</button>
              <button onclick="updateRequestStatus(${request.id}, 'Rejected')" class="reject-btn">Reject</button>
            </div>
          ` : ''}
        `;
        requestsList.appendChild(listItem);
      });
    } catch (error) {
      console.error('Error fetching user requests:', error);
      const requestsList = document.getElementById('requests-list');
      requestsList.innerHTML = `
        <li style="color: red; padding: 10px; text-align: center;">
          Error loading requests: ${error.message}
        </li>
      `;
    }
  }

  // Function to update request status
  window.updateRequestStatus = async function(requestId, status) {
    try {
      const response = await fetch('/camp_manager/update_request_status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request_id: requestId,
          status: status
        })
      });

      if (!response.ok) throw new Error('Failed to update request status');
      
      // Refresh the requests list
      fetchUserRequests();
      // Refresh camp details to update occupancy
      fetchCampDetails();
      // Refresh people list if request was approved
      if (status === 'Approved') {
        fetchPeople();
      }
      
      alert(`Request ${status.toLowerCase()} successfully`);
    } catch (error) {
      console.error('Error updating request status:', error);
      alert('Failed to update request status');
    }
  };

  // Initial load
  fetchPeople();
  updateDeliveryStatus();
  
  // Update delivery status every 30 seconds
  setInterval(updateDeliveryStatus, 30000);
});