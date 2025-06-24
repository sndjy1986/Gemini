// script.js

// --- 1. Centralized Truck Data ---
let trucks = [
    { id: 'Med-0', name: 'Med-0', location: 'City // HQ', status: 'available', timer: null, timerEndTime: null},
    { id: 'Med-1', name: 'Med-1', location: 'City // HQ', status: 'available', timer: null, timerEndTime: null },
    { id: 'Med-2', name: 'Med-2', location: 'Rock Springs', status: 'available', timer: null, timerEndTime: null },
    { id: 'Med-3', name: 'Med-3', location: 'Homeland Park', status: 'available', timer: null, timerEndTime: null },
    { id: 'Med-4', name: 'Med-4', location: 'Williamston', status: 'available', timer: null, timerEndTime: null },
    { id: 'Med-5', name: 'Med-5', location: 'Rock Springs', status: 'available', timer: null, timerEndTime: null },
    { id: 'Med-6', name: 'Med-6', location: 'Iva', status: 'available', timer: null, timerEndTime: null },
    { id: 'Med-7', name: 'Med-7', location: 'Pendleton', status: 'available', timer: null, timerEndTime: null },
    { id: 'Med-8', name: 'Med-8', location: 'Townville', status: 'available', timer: null, timerEndTime: null },
    { id: 'Med-9', name: 'Med-9', location: 'Centerville', status: 'available', timer: null, timerEndTime: null}, 
    { id: 'Med-11', name: 'Med-11', location: 'City // HQ', status: 'available', timer: null, timerEndTime: null},
    { id: 'Med-12', name: 'Med-12', location: 'City // HQ', status: 'available', timer: null, timerEndTime: null},
    { id: 'Med-13', name: 'Med-13', location: 'Honea Path', status: 'available', timer: null, timerEndTime: null},
    { id: 'Med-14', name: 'Med-14', location: 'Powdersville', status: 'available', timer: null, timerEndTime: null},
    { id: 'Med-15', name: 'Med-15', location: 'Wren', status: 'available', timer: null, timerEndTime: null},
    { id: 'Med-16', name: 'Med-16', location: 'City // HQ', status: 'available', timer: null, timerEndTime: null},
    { id: 'Med-17', name: 'Med-17', location: 'City // HQ', status: 'available', timer: null, timerEndTime: null},
    { id: 'Med-18', name: 'Med-18', location: 'City // HQ', status: 'available', timer: null, timerEndTime: null},
];

// Define the cycle order for truck statuses
const statusCycleOrder = ['Posted', 'Dispatched', 'On-Scene', 'Destination', 'Logistics'];


// Default timer durations (in minutes)
let timerDefaults = {
    destination: 20, // minutes
    logistics: 10    // minutes
};

// Variable to hold the ID of the truck currently being edited
let editingTruckId = null;

// --- 2. DOM Elements ---
const trucksContainer = document.getElementById('trucksContainer');
const availableTruckCountSpan = document.getElementById('availableTruckCount');
const adminPanelToggleBtn = document.getElementById('adminPanelToggle');
const adminPanel = document.getElementById('adminPanel');
const closeAdminPanelBtn = document.getElementById('closeAdminPanel');
const adminTruckList = document.getElementById('adminTruckList');
const destinationTimeInput = document.getElementById('destinationTime');
const logisticsTimeInput = document.getElementById('logisticsTime');
const saveTimerDefaultsBtn = document.getElementById('saveTimerDefaults');
const darkModeToggleBtn = document.getElementById('darkModeToggle'); // New Dark Mode Toggle button


// Add/Edit Truck Form Elements
const truckFormTitle = document.getElementById('truckFormTitle');
const truckIdInput = document.getElementById('truckIdInput');
const truckNameInput = document.getElementById('truckNameInput');
const truckLocationInput = document.getElementById('truckLocationInput');
const truckStatusSelect = document.getElementById('truckStatusSelect');
const saveTruckBtn = document.getElementById('saveTruckBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');


// --- 3. Functions ---

// Function to render all trucks to the main display
function renderTrucks() {
    trucksContainer.innerHTML = ''; // Clear existing trucks
    let availableCount = 0;

    trucks.forEach(truck => {
        // Create status box element
        const box = document.createElement('div');
        box.classList.add('status-box', truck.status);
        box.dataset.truckId = truck.id; // Store truck ID on the element

        // Conciser display: Truck ID - Status
        let content = `<p><strong>${truck.id}</strong></p>`;
        content += `<p>${truck.status.charAt(0).toUpperCase() + truck.status.slice(1)}</p>`;


        // Always include the timer placeholder, even if empty, to prevent layout shifts
        let timerDisplay = '';
        let timeLeftSeconds = 0;
        if ((truck.status === 'destination' || truck.status === 'logistics') && truck.timerEndTime) {
            timeLeftSeconds = Math.max(0, Math.floor((truck.timerEndTime - Date.now()) / 1000)); // Time left in seconds
            const minutes = Math.floor(timeLeftSeconds / 60);
            const seconds = timeLeftSeconds % 60;
            timerDisplay = `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        content += `<p class="timer">${timerDisplay}</p>`; // Always add this <p> tag
        
        box.innerHTML = content;

        // Add flash-alert class if timer < 1 minute (and > 0)
        // Flashes RED now!
        if ((truck.status === 'destination' || truck.status === 'logistics') && timeLeftSeconds > 0 && timeLeftSeconds < 60) {
            box.classList.add('flash-alert');
        } else {
            box.classList.remove('flash-alert'); // Ensure it's removed if condition no longer met
        }
        
        trucksContainer.appendChild(box);

        // Update available count
        if (truck.status === 'available') {
            availableCount++;
        }
    });

    updateSystemLevel(availableCount);
}

// Function to update the "System Level" display
function updateSystemLevel(count) {
    availableTruckCountSpan.textContent = count;
}

// Function to update a truck's status
function updateTruckStatus(truckId, newStatus) {
    const truckIndex = trucks.findIndex(truck => truck.id === truckId);
    if (truckIndex > -1) {
        const truck = trucks[truckIndex];

        // Clear any existing timer for the truck
        if (truck.timer) {
            clearInterval(truck.timer);
            truck.timer = null;
            truck.timerEndTime = null;
        }

        truck.status = newStatus;

        // Start timer if new status is destination or logistics
        if (newStatus === 'destination' || newStatus === 'logistics') {
            const durationInMinutes = timerDefaults[newStatus];
            truck.timerEndTime = Date.now() + (durationInMinutes * 60 * 1000);
            truck.timer = setInterval(() => {
                const timeLeft = Math.max(0, Math.floor((truck.timerEndTime - Date.now()) / 1000));
                if (timeLeft <= 0) {
                    clearInterval(truck.timer);
                    truck.timer = null;
                    truck.timerEndTime = null;
                    // Auto-transition to available when timer expires
                    updateTruckStatus(truckId, 'available'); // This will re-render
                } else {
                    renderTrucks(); // Re-render to update timer display and potentially flashing
                }
            }, 1000); // Update every second
        }

        renderTrucks(); // Re-render all trucks to reflect status change
        renderAdminTruckList(); // Re-render admin list as well
    }
}

// Function to add or update a truck
function addOrUpdateTruck() {
    const id = truckIdInput.value.trim();
    const name = truckNameInput.value.trim();
    const location = truckLocationInput.value.trim();
    const status = truckStatusSelect.value;

    if (!id || !name || !location) {
        alert('Please fill in all truck details.');
        return;
    }

    if (editingTruckId) {
        // Update existing truck
        const truckIndex = trucks.findIndex(truck => truck.id === editingTruckId);
        if (truckIndex > -1) {
            trucks[truckIndex].name = name;
            trucks[truckIndex].location = location;
            // Only update status if it's different and not a timed status that's already running
            if (trucks[truckIndex].status !== status) {
                 updateTruckStatus(editingTruckId, status); // Use updateTruckStatus to handle timers
            }
        }
        editingTruckId = null; // Clear editing state
        truckFormTitle.textContent = 'Add New Truck';
        saveTruckBtn.textContent = 'Add Truck';
        cancelEditBtn.style.display = 'none';
        truckIdInput.disabled = false; // Enable ID input for new trucks
    } else {
        // Add new truck
        if (trucks.some(truck => truck.id === id)) {
            alert('Truck with this ID already exists. Please use a unique ID.');
            return;
        }
        const newTruck = { id, name, location, status, timer: null, timerEndTime: null };
        trucks.push(newTruck);
        // If the new truck has a timed status, start its timer
        if (status === 'destination' || status === 'logistics') {
            updateTruckStatus(id, status); // This will initiate the timer
        }
    }

    // Clear form
    truckIdInput.value = '';
    truckNameInput.value = '';
    truckLocationInput.value = '';
    truckStatusSelect.value = 'available'; // Reset to default status

    renderTrucks();
    renderAdminTruckList();
}

// Function to load truck data into the form for editing
function editTruck(truckId) {
    const truck = trucks.find(t => t.id === truckId);
    if (truck) {
        editingTruckId = truck.id;
        truckFormTitle.textContent = `Edit Truck: ${truck.name} (ID: ${truck.id})`; // Display ID in title
        truckIdInput.value = truck.id;
        truckIdInput.disabled = true; // Prevent changing ID when editing
        truckNameInput.value = truck.name;
        truckLocationInput.value = truck.location;
        truckStatusSelect.value = truck.status;
        saveTruckBtn.textContent = 'Update Truck';
        cancelEditBtn.style.display = 'inline-block'; // Show cancel button
    }
}

// Function to reset the add/edit truck form
function resetTruckForm() {
    editingTruckId = null;
    truckFormTitle.textContent = 'Add New Truck';
    truckIdInput.value = '';
    truckIdInput.disabled = false;
    truckNameInput.value = '';
    truckLocationInput.value = '';
    truckStatusSelect.value = 'available';
    saveTruckBtn.textContent = 'Add Truck';
    cancelEditBtn.style.display = 'none';
}


// Function to remove a truck (e.g., "take down" from admin)
function removeTruck(truckId) {
    // Clear timer if truck being removed has one
    const truckToRemove = trucks.find(truck => truck.id === truckId);
    if (truckToRemove && truckToRemove.timer) {
        clearInterval(truckToRemove.timer);
    }
    trucks = trucks.filter(truck => truck.id !== truckId);
    renderTrucks();
    renderAdminTruckList();
    // If the removed truck was being edited, reset the form
    if (editingTruckId === truckId) {
        resetTruckForm();
    }
}

// Function to render the truck list in the admin panel
function renderAdminTruckList() {
    adminTruckList.innerHTML = '<h3>Manage Existing Trucks</h3>'; // Re-add title
    if (trucks.length === 0) {
        adminTruckList.innerHTML += '<p>No trucks currently in the system.</p>';
        return;
    }

    trucks.forEach(truck => {
        const item = document.createElement('div');
        item.classList.add('admin-truck-item');
        item.innerHTML = `
            <span><strong>${truck.id}</strong> - ${truck.name} <span class="truck-details">(${truck.location ? truck.location + ' - ' : ''}Status: ${truck.status})</span></span>
            <div class="controls">
                <button class="edit-truck" data-id="${truck.id}">Edit</button>
                ${truck.status === 'available' ? `<button class="take-down" data-id="${truck.id}">Take Down</button>` : ''}
            </div>
        `;
        adminTruckList.appendChild(item);
    });

    // Attach event listeners to the new buttons in the admin panel
    adminTruckList.querySelectorAll('.edit-truck').forEach(button => {
        button.addEventListener('click', (e) => editTruck(e.target.dataset.id));
    });
    adminTruckList.querySelectorAll('.take-down').forEach(button => {
        button.addEventListener('click', (e) => {
            if (confirm(`Are you sure you want to take down ${e.target.dataset.id}? This cannot be undone.`)) {
                removeTruck(e.target.dataset.id);
            }
        });
    });
    // Removed status change buttons from admin panel as they are now handled by clicking the box
}

// Function to initialize timers on page load for trucks already in timer status
function initializeTimers() {
    trucks.forEach(truck => {
        if ((truck.status === 'destination' || truck.status === 'logistics')) {
            // Check if timerEndTime exists and is in the future
            if (truck.timerEndTime && truck.timerEndTime > Date.now()) {
                updateTruckStatus(truck.id, truck.status); // This will restart the interval
            } else if (!truck.timerEndTime && truck.initialDuration) {
                // If no end time, but an initial duration, start new timer
                truck.timerEndTime = Date.now() + (truck.initialDuration * 60 * 1000);
                updateTruckStatus(truck.id, truck.status);
            } else if (truck.timerEndTime && truck.timerEndTime <= Date.now()) {
                // If the timer has already expired, immediately transition to available
                updateTruckStatus(truck.id, 'available');
            }
        }
    });
}

// Function to toggle dark mode
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    // Save preference to local storage
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('darkMode', 'enabled');
    } else {
        localStorage.setItem('darkMode', 'disabled');
    }
}

// Function to apply dark mode based on saved preference
function applyDarkModePreference() {
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }
}


// --- 4. Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    applyDarkModePreference(); // Apply dark mode preference on load

    renderTrucks(); // Initial render of all trucks
    initializeTimers(); // Start timers for any trucks already in timer status

    // Removed hover effect event listeners, now truck boxes are static size:
    // trucksContainer.addEventListener('mouseover', (event) => { ... });
    // trucksContainer.addEventListener('mouseout', (event) => { ... });

    // New: Click to cycle truck status
    trucksContainer.addEventListener('click', (event) => {
        const targetBox = event.target.closest('.status-box');
        if (targetBox) {
            const truckId = targetBox.dataset.truckId;
            const truckIndex = trucks.findIndex(truck => truck.id === truckId);
            if (truckIndex > -1) {
                const currentStatus = trucks[truckIndex].status;
                const currentIndex = statusCycleOrder.indexOf(currentStatus);
                const nextIndex = (currentIndex + 1) % statusCycleOrder.length;
                const nextStatus = statusCycleOrder[nextIndex];
                updateTruckStatus(truckId, nextStatus);
            }
        }
    });


    // Admin Panel Toggling
    adminPanelToggleBtn.addEventListener('click', () => {
        adminPanel.classList.add('active');
        renderAdminTruckList(); // Render list when opening admin panel
        resetTruckForm(); // Clear/reset form when opening panel
        // Set initial values for timer inputs
        destinationTimeInput.value = timerDefaults.destination;
        logisticsTimeInput.value = timerDefaults.logistics;
    });

    closeAdminPanelBtn.addEventListener('click', () => {
        adminPanel.classList.remove('active');
    });

    // Add/Update Truck
    saveTruckBtn.addEventListener('click', addOrUpdateTruck);
    cancelEditBtn.addEventListener('click', resetTruckForm);

    // Save Timer Defaults
    saveTimerDefaultsBtn.addEventListener('click', () => {
        const newDestTime = parseInt(destinationTimeInput.value);
        const newLogTime = parseInt(logisticsTimeInput.value);

        if (isNaN(newDestTime) || isNaN(newLogTime) || newDestTime <= 0 || newLogTime <= 0) {
            alert('Please enter valid positive numbers for timer defaults.');
            return;
        }

        timerDefaults.destination = newDestTime;
        timerDefaults.logistics = newLogTime;
        alert('Timer defaults saved!');
    });

    // Make admin panel content clickable, not the overlay itself
    adminPanel.addEventListener('click', (event) => {
        if (event.target === adminPanel) {
            adminPanel.classList.remove('active');
        }
    });

    // New: Dark Mode Toggle Event Listener
    darkModeToggleBtn.addEventListener('click', toggleDarkMode);
});
