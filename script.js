// script.js

// --- 1. Centralized Truck Data ---
let trucks = [
    { id: 'Med-0', name: 'Med-0', location: 'City // HQ', status: 'available', timer: null, timerStartTime: null},
    { id: 'Med-1', name: 'Med-1', location: 'City // HQ', status: 'available', timer: null, timerStartTime: null },
    { id: 'Med-2', name: 'Med-2', location: 'Rock Springs', status: 'available', timer: null, timerStartTime: null },
    { id: 'Med-3', name: 'Med-3', location: 'Homeland Park', status: 'available', timer: null, timerStartTime: null },
    { id: 'Med-4', name: 'Med-4', location: 'Williamston', status: 'available', timer: null, timerStartTime: null },
    { id: 'Med-5', name: 'Med-5', location: 'Rock Springs', status: 'available', timer: null, timerStartTime: null },
    { id: 'Med-6', name: 'Med-6', location: 'Iva', status: 'available', timer: null, timerStartTime: null },
    { id: 'Med-7', name: 'Med-7', location: 'Pendleton', status: 'available', timer: null, timerStartTime: null },
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
    // Example: Trucks starting in an active status with a timer that counts up from now
];

// Define the cycle order for truck statuses (all lowercase to match CSS)
const statusCycleOrder = ['posted', 'en-route', 'on-scene', 'transporting', 'destination', 'logistics', 'available'];


// Default timer durations (in minutes) for flashing
let timerDefaults = {
    destination: 20, // minutes
    logistics: 10    // minutes
};

// Variable to hold the ID of the truck currently being edited
let editingTruckId = null;
// Variable to hold the ID of the truck currently right-clicked for context menu
let rightClickedTruckId = null; 


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

// New: Context Menu Elements
const contextMenu = document.getElementById('contextMenu');
const contextMenuList = document.getElementById('contextMenuList');


// Add/Edit Truck Form Elements
const truckFormTitle = document.getElementById('truckFormTitle');
const truckIdInput = document.getElementById('truckIdInput');
const truckNameInput = document.getElementById('truckNameInput');
const truckLocationInput = document.getElementById('truckLocationInput');
const truckStatusSelect = document.getElementById('truckStatusSelect');
const saveTruckBtn = document.getElementById('saveTruckBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');


// --- 3. Functions ---

// Function to determine if a status should have a counting timer
function isTimedStatus(status) {
    return ['posted', 'en-route', 'on-scene', 'transporting', 'destination', 'logistics'].includes(status);
}

// Function to render all trucks to the main display
function renderTrucks() {
    trucksContainer.innerHTML = ''; // Clear existing trucks
    let availableCount = 0;

    trucks.forEach(truck => {
        // Create status box element
        const box = document.createElement('div');
        // Ensure the class added matches the lowercase status from the truck object
        box.classList.add('status-box', truck.status); 
        box.dataset.truckId = truck.id; // Store truck ID on the element

        // Conciser display: Truck ID - Status (capitalize for display only)
        let content = `<p><strong>${truck.id}</strong></p>`;
        // Display "En-route" correctly
        content += `<p>${truck.status === 'en-route' ? 'En-route' : truck.status.charAt(0).toUpperCase() + truck.status.slice(1)}</p>`;


        // Always include the timer placeholder if it's a timed status, even if time is 0
        let timerDisplay = '';
        let elapsedTimeSeconds = 0;
        if (isTimedStatus(truck.status) && truck.timerStartTime) {
            elapsedTimeSeconds = Math.floor((Date.now() - truck.timerStartTime) / 1000); // Time elapsed in seconds
            const minutes = Math.floor(elapsedTimeSeconds / 60);
            const seconds = elapsedTimeSeconds % 60;
            timerDisplay = `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        content += `<p class="timer">${timerDisplay}</p>`; // Always add this <p> tag
        
        box.innerHTML = content;

        // Add flash-alert class only for 'destination' or 'logistics' if elapsed time >= predetermined length
        if ((truck.status === 'destination' || truck.status === 'logistics') && truck.timerStartTime) {
            const requiredTimeSeconds = timerDefaults[truck.status] * 60;
            if (elapsedTimeSeconds >= requiredTimeSeconds) {
                box.classList.add('flash-alert');
            } else {
                box.classList.remove('flash-alert'); // Ensure it's removed if condition no longer met
            }
        } else {
            box.classList.remove('flash-alert'); // No flash for non-timed statuses or other timed statuses
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
    // NEW: Flash page red if available trucks <= 3
    if (count <= 3) {
        document.body.classList.add('system-level-alert');
    } else {
        document.body.classList.remove('system-level-alert');
    }
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
        }
        
        truck.status = newStatus;

        // Reset timer start time if it's becoming a timed status
        if (isTimedStatus(newStatus)) {
            truck.timerStartTime = Date.now(); // Set start time to now
            // Start the interval for this truck
            truck.timer = setInterval(() => {
                // No auto-transition here; renderTrucks will handle display and flashing
                renderTrucks(); 
            }, 1000); // Update every second
        } else {
            // If status is not timed (e.g., 'available'), clear timer start time
            truck.timerStartTime = null; 
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
    const status = truckStatusSelect.value.toLowerCase(); // Ensure status from dropdown is lowercase


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
            // Only update status if it's different. updateTruckStatus handles timers.
            if (trucks[truckIndex].status !== status) {
                 updateTruckStatus(editingTruckId, status); 
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
        // Initialize new truck with timerStartTime if it's a timed status
        const newTruck = { 
            id, 
            name, 
            location, 
            status, 
            timer: null, 
            timerStartTime: isTimedStatus(status) ? Date.now() : null 
        };
        trucks.push(newTruck);
        // If the new truck has a timed status, start its timer interval
        if (isTimedStatus(status)) {
            updateTruckStatus(id, status); // This will initiate the interval
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
        // Ensure status displayed in dropdown is consistent with lowercase status
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
            <span><strong>${truck.id}</strong> - ${truck.name} <span class="truck-details">(${truck.location ? truck.location + ' - ' : ''}Status: ${truck.status === 'en-route' ? 'En-route' : truck.status.charAt(0).toUpperCase() + truck.status.slice(1)})</span></span>
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
        // Only attempt to start timers for statuses that are meant to be timed AND have a start time
        if (isTimedStatus(truck.status) && truck.timerStartTime) {
            updateTruckStatus(truck.id, truck.status); // This will restart the interval if needed
        } else if (isTimedStatus(truck.status) && !truck.timerStartTime) {
            // If a truck is in a timed status but somehow doesn't have a start time (e.g., new default data)
            // set its start time now and update status to kick off timer.
            truck.timerStartTime = Date.now();
            updateTruckStatus(truck.id, truck.status);
        }
        // No action needed for 'available' status as it doesn't have a timer
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

    // New: Click to cycle truck status (left-click)
    trucksContainer.addEventListener('click', (event) => {
        const targetBox = event.target.closest('.status-box');
        if (targetBox) {
            // Check if right-click menu is currently open, if so, don't cycle on left-click on box
            if (contextMenu.style.display === 'block') {
                return;
            }

            const truckId = targetBox.dataset.truckId;
            const truckIndex = trucks.findIndex(truck => truck.id === truckId);
            if (truckIndex > -1) {
                const currentStatus = trucks[truckIndex].status;
                const currentIndex = statusCycleOrder.indexOf(currentStatus);
                // Cycle to next status, loop back to start if at end
                const nextIndex = (currentIndex + 1) % statusCycleOrder.length; 
                const nextStatus = statusCycleOrder[nextIndex];
                updateTruckStatus(truckId, nextStatus);
            }
        }
    });

    // NEW: Right-Click (Context Menu) functionality
    let activeTruckIdForContextMenu = null; // To store which truck was right-clicked

    trucksContainer.addEventListener('contextmenu', (event) => {
        const targetBox = event.target.closest('.status-box');
        if (targetBox) {
            event.preventDefault(); // Prevent default browser context menu
            activeTruckIdForContextMenu = targetBox.dataset.truckId; // Store truck ID

            // Populate context menu
            contextMenuList.innerHTML = ''; // Clear previous items
            statusCycleOrder.forEach(status => {
                const listItem = document.createElement('li');
                // Capitalize for display, use lowercase for data-status
                listItem.textContent = status === 'en-route' ? 'En-route' : status.charAt(0).toUpperCase() + status.slice(1);
                listItem.dataset.status = status; // Store status value (lowercase)
                contextMenuList.appendChild(listItem);
            });

            // Position context menu
            contextMenu.style.left = `${event.clientX}px`;
            contextMenu.style.top = `${event.clientY}px`;
            contextMenu.style.display = 'block';
        }
    });

    // Hide context menu on any click outside or scroll
    document.addEventListener('click', (event) => {
        // Hide if not clicking on the context menu itself
        if (!contextMenu.contains(event.target)) {
            contextMenu.style.display = 'none';
            activeTruckIdForContextMenu = null;
        }
    });

    window.addEventListener('scroll', () => {
        contextMenu.style.display = 'none';
        activeTruckIdForContextMenu = null;
    });

    // Handle clicks WITHIN the context menu
    contextMenuList.addEventListener('click', (event) => {
        const selectedStatus = event.target.dataset.status; // Get lowercase status
        if (selectedStatus && activeTruckIdForContextMenu) {
            updateTruckStatus(activeTruckIdForContextMenu, selectedStatus);
        }
        contextMenu.style.display = 'none'; // Hide menu after selection
        activeTruckIdForContextMenu = null; // Clear active truck
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

    // Dark Mode Toggle Event Listener
    darkModeToggleBtn.addEventListener('click', toggleDarkMode);
});
