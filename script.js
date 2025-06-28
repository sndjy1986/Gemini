// script.js

// --- 1. Centralized Truck Data ---
// Initial default trucks (used if nothing in localStorage)
let trucks = [
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
];

// Define the cycle order for truck statuses
const statusCycleOrder = ['dispatched', 'destination', 'available', 'posted', 'logistics'];

// Default timer durations (in minutes)
let timerDefaults = {
    destination: 30, // minutes
    logistics: 60    // minutes
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
const darkModeToggleBtn = document.getElementById('darkModeToggle');

// Add/Edit Truck Form Elements
const truckFormTitle = document.getElementById('truckFormTitle');
const truckIdInput = document.getElementById('truckIdInput');
const truckNameInput = document.getElementById('truckNameInput');
const truckLocationInput = document.getElementById('truckLocationInput');
const truckStatusSelect = document.getElementById('truckStatusSelect');
const saveTruckBtn = document.getElementById('saveTruckBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// New: Data Management Elements
const exportDataBtn = document.getElementById('exportDataBtn');
const importFileInput = document.getElementById('importFileInput');

// Custom Modal Elements
const customModal = document.getElementById('customModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');

// --- 3. Functions ---

/**
 * Shows a custom modal dialog.
 * @param {string} message The message to display in the modal.
 * @param {string} type 'alert' for a single OK button, 'confirm' for OK and Cancel.
 * @param {function} callback Function to execute if 'OK' is clicked (for confirm type).
 */
function showModal(message, type = 'alert', callback = () => {}) {
    modalTitle.textContent = type === 'alert' ? 'Notification' : 'Confirmation';
    modalMessage.textContent = message;
    customModal.classList.add('active');

    if (type === 'confirm') {
        customModal.classList.remove('alert-type');
        modalConfirmBtn.onclick = () => {
            customModal.classList.remove('active');
            callback(true); // Indicate confirmation
        };
        modalCancelBtn.onclick = () => {
            customModal.classList.remove('active');
            callback(false); // Indicate cancellation
        };
    } else { // 'alert' type
        customModal.classList.add('alert-type');
        modalConfirmBtn.onclick = () => {
            customModal.classList.remove('active');
            callback(); // Just close, no boolean needed
        };
    }
}


/**
 * Saves the current truck data and timer defaults to localStorage.
 */
function saveData() {
    try {
        localStorage.setItem('trucks', JSON.stringify(trucks));
        localStorage.setItem('timerDefaults', JSON.stringify(timerDefaults));
        // console.log("Data saved to localStorage.");
    } catch (e) {
        console.error("Error saving data to localStorage:", e);
        showModal("Could not save data. Your browser may be in private mode or storage is full.", "alert");
    }
}

/**
 * Loads truck data and timer defaults from localStorage.
 */
function loadData() {
    try {
        const storedTrucks = localStorage.getItem('trucks');
        const storedTimerDefaults = localStorage.getItem('timerDefaults');

        if (storedTrucks) {
            // Parse stored data, ensuring timers are cleared and not restored directly
            const parsedTrucks = JSON.parse(storedTrucks);
            // Clear any old intervals when loading to prevent memory leaks/duplicates
            parsedTrucks.forEach(t => {
                if (t.timer) clearInterval(t.timer); // Clear existing interval if it was running
                t.timer = null; // Ensure timer property is nullified
                // Re-evaluate timerEndTime for validity in case of long-term storage
                if (t.timerEndTime && t.timerEndTime <= Date.now()) {
                    t.status = 'available'; // If time expired, set to available
                    t.timerEndTime = null;
                }
            });
            trucks = parsedTrucks;
        }
        if (storedTimerDefaults) {
            timerDefaults = JSON.parse(storedTimerDefaults);
        }
        // console.log("Data loaded from localStorage.");
    } catch (e) {
        console.error("Error loading data from localStorage:", e);
        showModal("Could not load saved data. Data might be corrupted.", "alert");
    }
}


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
        content += `<p>${truck.name} - ${truck.status.charAt(0).toUpperCase() + truck.status.slice(1)}</p>`;


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
    saveData(); // Save data after rendering changes
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
        showModal('Please fill in all truck details.', 'alert');
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
            showModal('Truck with this ID already exists. Please use a unique ID.', 'alert');
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
            showModal(`Are you sure you want to take down ${e.target.dataset.id}? This cannot be undone.`, 'confirm', (confirmed) => {
                if (confirmed) {
                    removeTruck(e.target.dataset.id);
                }
            });
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
                // If the truck was previously in a timed status and has time left,
                // re-initiate its timer.
                // We need to re-assign timer and timerEndTime after loading from localStorage.
                const durationLeftMs = truck.timerEndTime - Date.now();
                truck.timer = setInterval(() => {
                    const timeLeft = Math.max(0, Math.floor((truck.timerEndTime - Date.now()) / 1000));
                    if (timeLeft <= 0) {
                        clearInterval(truck.timer);
                        truck.timer = null;
                        truck.timerEndTime = null;
                        updateTruckStatus(truck.id, 'available');
                    } else {
                        renderTrucks();
                    }
                }, 1000);
            } else if (truck.timerEndTime && truck.timerEndTime <= Date.now()) {
                // If the timer has already expired, immediately transition to available
                updateTruckStatus(truck.id, 'available');
            }
            // If timerEndTime is null for a timed status truck (e.g., initial state from default data),
            // this implies it just entered that status. Start a new timer for it based on defaults.
            else if (!truck.timerEndTime) {
                updateTruckStatus(truck.id, truck.status);
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

/**
 * Exports current truck data as a JSON file.
 */
function exportTrucksToJson() {
    // We only want to export the static data, not the setInterval timer objects.
    const exportableTrucks = trucks.map(({ id, name, location, status, timerEndTime }) => ({
        id,
        name,
        location,
        status,
        timerEndTime // timerEndTime can be re-used on import
    }));
    const data = {
        trucks: exportableTrucks,
        timerDefaults: timerDefaults
    };
    const jsonString = JSON.stringify(data, null, 2); // Pretty print JSON

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'truck_dispatch_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Clean up URL object
    showModal('Truck data exported successfully to truck_dispatch_data.json!', 'alert');
}

/**
 * Imports truck data from a selected JSON file.
 * @param {Event} event The file input change event.
 */
function importTrucksFromJson(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);

            if (!importedData || !Array.isArray(importedData.trucks) || typeof importedData.timerDefaults !== 'object') {
                showModal('Invalid JSON file format. Please ensure it contains "trucks" array and "timerDefaults" object.', 'alert');
                return;
            }

            showModal('Importing new data will overwrite current truck data. Continue?', 'confirm', (confirmed) => {
                if (confirmed) {
                    // Clear all existing timers before loading new data
                    trucks.forEach(truck => {
                        if (truck.timer) clearInterval(truck.timer);
                    });

                    // Assign new data
                    trucks = importedData.trucks.map(t => ({
                        id: t.id,
                        name: t.name,
                        location: t.location,
                        status: t.status,
                        timer: null, // Always nullify timers on import, they will be re-initialized
                        timerEndTime: t.timerEndTime // Preserve end time if available
                    }));
                    timerDefaults = importedData.timerDefaults;

                    // Re-render and re-initialize timers for newly loaded data
                    renderTrucks();
                    renderAdminTruckList();
                    initializeTimers(); // Start timers for imported trucks if needed
                    // Update timer input fields in admin panel
                    destinationTimeInput.value = timerDefaults.destination;
                    logisticsTimeInput.value = timerDefaults.logistics;

                    showModal('Truck data imported successfully!', 'alert');
                }
            });

        } catch (error) {
            console.error("Error parsing or importing JSON:", error);
            showModal('Failed to read or parse JSON file. Please ensure it is a valid JSON.', 'alert');
        }
    };
    reader.readAsText(file);
    // Clear the file input so the same file can be selected again after a failed import
    event.target.value = '';
}


// --- 4. Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    applyDarkModePreference(); // Apply dark mode preference on load
    loadData(); // Load data from localStorage on start

    renderTrucks(); // Initial render of all trucks
    initializeTimers(); // Start timers for any trucks already in timer status

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
            showModal('Please enter valid positive numbers for timer defaults.', 'alert');
            return;
        }

        timerDefaults.destination = newDestTime;
        timerDefaults.logistics = newLogTime;
        saveData(); // Save updated timer defaults
        showModal('Timer defaults saved!', 'alert');
    });

    // Make admin panel content clickable, not the overlay itself
    adminPanel.addEventListener('click', (event) => {
        if (event.target === adminPanel) {
            adminPanel.classList.remove('active');
        }
    });

    // Dark Mode Toggle Event Listener
    darkModeToggleBtn.addEventListener('click', toggleDarkMode);

    // New: Data Management Event Listeners
    exportDataBtn.addEventListener('click', exportTrucksToJson);
    importFileInput.addEventListener('change', importTrucksFromJson);
});
