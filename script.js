// script.js

// --- 1. Centralized Truck Data ---
// Initial default trucks (used if nothing in localStorage)
let trucks = [
    { id: 'Med-0', name: 'Med-0', location: 'City // HQ', status: 'available', timer: null, timerEndTime: null },
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
    { id: 'Med-13', name: 'Med-13', location: 'Honea Path', status: 'available', timer: null, timerEndTime: null },
    { id: 'Med-14', name: 'Med-14', location: 'Piedmont', status: 'available', timer: null, timerEndTime: null },
    { id: 'Med-15', name: 'Med-15', location: 'Wren', status: 'available', timer: null, timerEndTime: null },
    { id: 'Med-16', name: 'Med-16', location: 'Williamston', status: 'available', timer: null, timerEndTime: null },
    { id: 'Med-17', name: 'Med-17', location: 'City // HQ', status: 'available', timer: null, timerEndTime: null },
    { id: 'Med-18', name: 'Med-18', location: 'City // HQ', status: 'available', timer: null, timerEndTime: null },
];

// Define the order for right-click menu and status display
const allTruckStatuses = ['available', 'dispatched', 'onScene', 'enRouteToDestination', 'atDestination', 'logistics', 'unavailable'];

// Define the cycle order for left-click cycling (excluding 'posted')
const statusCycleOrder = ['available', 'dispatched', 'onScene', 'enRouteToDestination', 'atDestination'];

// Default timer durations (in minutes)
let timerDefaults = {
    atDestination: 20, // minutes (newly named, formerly 'enRouteToDestination' timer)
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
const destinationTimeInput = document.getElementById('destinationTime'); // Used for 'atDestination' timer now
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

// Data Management Elements
const exportDataBtn = document.getElementById('exportDataBtn');
const importFileInput = document.getElementById('importFileInput');

// Custom Modal Elements
const customModal = document.getElementById('customModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');

// New: Custom Context Menu Elements
const customContextMenu = document.getElementById('customContextMenu');
let activeTruckIdForContextMenu = null; // To store which truck was right-clicked


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
                // Do NOT set to available here, let initializeTimers re-evaluate and display elapsed time
                // if (t.timerEndTime && t.timerEndTime <= Date.now()) {
                //     t.status = 'available'; // If time expired, set to available
                //     t.timerEndTime = null;
                // }
            });
            trucks = parsedTrucks;
        }
        if (storedTimerDefaults) {
            timerDefaults = JSON.parse(storedTimerDefaults);
            // Ensure compatibility if old data had 'destination' or 'enRouteToDestination'
            if (timerDefaults.destination && !timerDefaults.atDestination) {
                timerDefaults.atDestination = timerDefaults.destination;
                delete timerDefaults.destination; // Clean up old property
            } else if (timerDefaults.enRouteToDestination && !timerDefaults.atDestination) {
                timerDefaults.atDestination = timerDefaults.enRouteToDestination;
                delete timerDefaults.enRouteToDestination;
            } else if (!timerDefaults.atDestination) {
                timerDefaults.atDestination = 30; // Default if missing
            }
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

        // Map internal status names to user-friendly display names
        let displayStatus = truck.status;
        switch (truck.status) {
            case 'dispatched':
                displayStatus = 'En Route';
                break;
            case 'onScene':
                displayStatus = 'On Scene';
                break;
            case 'enRouteToDestination':
                displayStatus = 'En Route to Destination';
                break;
            case 'atDestination':
                displayStatus = 'At Destination';
                break;
            // 'available', 'logistics', 'posted' remain as is
        }

        let content = `<p><strong>${truck.id}</strong></p>`;
        content += `<p>${truck.name} - ${displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}</p>`;


        // Always include the timer placeholder, even if empty, to prevent layout shifts
        let timerDisplay = '';
        let displayPrefix = '';
        let totalSeconds = 0;
        // Timer only for 'atDestination' and 'logistics' statuses, and if timerEndTime exists
        if ((truck.status === 'atDestination' || truck.status === 'logistics') && truck.timerEndTime) {
            const timeLeftMs = truck.timerEndTime - Date.now();

            if (timeLeftMs > 0) { // Still counting down
                totalSeconds = Math.floor(timeLeftMs / 1000);
                displayPrefix = ''; // No prefix for countdown
            } else { // Timer has expired, count up
                displayPrefix = '+';
                totalSeconds = Math.floor(Math.abs(timeLeftMs) / 1000); // Absolute value for elapsed time
            }

            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            timerDisplay = `Time: ${displayPrefix}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        content += `<p class="timer">${timerDisplay}</p>`; // Always add this <p> tag

        box.innerHTML = content;

        // Add flash-alert class if timer < 1 minute (and > 0), and only for countdown phase
        if ((truck.status === 'atDestination' || truck.status === 'logistics') && truck.timerEndTime && (truck.timerEndTime - Date.now()) > 0 && (truck.timerEndTime - Date.now()) < 60000) { // 60 seconds = 60000 ms
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
            // truck.timerEndTime = null; // Do NOT clear timerEndTime here if you want elapsed time
        }

        truck.status = newStatus;

        // Start timer if new status is atDestination or logistics
        if (newStatus === 'atDestination' || newStatus === 'logistics') {
            const durationInMinutes = timerDefaults[newStatus]; // Uses 'atDestination' or 'logistics'
            truck.timerEndTime = Date.now() + (durationInMinutes * 60 * 1000);
            truck.timer = setInterval(() => {
                // The interval's primary purpose is to ensure renderTrucks is called
                // to update the display, whether counting down or up.
                if (Date.now() >= truck.timerEndTime && truck.timer) { // If time has passed and interval is still running
                    clearInterval(truck.timer); // Stop the interval once expired
                    truck.timer = null; // Clear timer reference
                }
                renderTrucks(); // Re-render to update timer display and potentially flashing
            }, 1000); // Update every second
        } else {
            // If status changes away from a timed status, ensure timerEndTime is reset
            // This prevents old elapsed times from appearing if the truck returns to a non-timed status
            truck.timerEndTime = null;
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
        if (status === 'atDestination' || status === 'logistics') { // Check for new timer statuses
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

        let displayStatus = truck.status;
        switch (truck.status) {
            case 'dispatched':
                displayStatus = 'En Route';
                break;
            case 'onScene':
                displayStatus = 'On Scene';
                break;
            case 'enRouteToDestination':
                displayStatus = 'En Route to Destination';
                break;
            case 'atDestination':
                displayStatus = 'At Destination';
                break;
        }

        item.innerHTML = `
            <span><strong>${truck.id}</strong> - ${truck.name} <span class="truck-details">(${truck.location ? truck.location + ' - ' : ''}Status: ${displayStatus})</span></span>
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
}

// Function to initialize timers on page load for trucks already in timer status
function initializeTimers() {
    trucks.forEach(truck => {
        // Timer only for 'atDestination' and 'logistics' statuses
        if ((truck.status === 'atDestination' || truck.status === 'logistics')) {
            // Check if timerEndTime exists
            if (truck.timerEndTime) {
                // If the truck was previously in a timed status, re-initiate its timer.
                // The interval's primary purpose is to ensure renderTrucks is called
                // to update the display, whether counting down or up.
                truck.timer = setInterval(() => {
                    if (Date.now() >= truck.timerEndTime && truck.timer) { // If time has passed and interval is still running
                        clearInterval(truck.timer); // Stop the interval once expired
                        truck.timer = null; // Clear timer reference
                    }
                    renderTrucks();
                }, 1000);
            }
            // If timerEndTime is null for a timed status truck (e.g., initial state from default data),
            // this implies it just entered that status. Start a new timer for it based on defaults.
            else {
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
                    // Ensure compatibility for timerDefaults if old data had 'destination' or 'enRouteToDestination'
                    if (timerDefaults.destination && !timerDefaults.atDestination) {
                        timerDefaults.atDestination = timerDefaults.destination;
                        delete timerDefaults.destination;
                    } else if (timerDefaults.enRouteToDestination && !timerDefaults.atDestination) {
                        timerDefaults.atDestination = timerDefaults.enRouteToDestination;
                        delete timerDefaults.enRouteToDestination;
                    }


                    // Re-render and re-initialize timers for newly loaded data
                    renderTrucks();
                    renderAdminTruckList();
                    initializeTimers(); // Start timers for imported trucks if needed
                    // Update timer input fields in admin panel
                    destinationTimeInput.value = timerDefaults.atDestination; // Updated property name
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

/**
 * Displays a custom context menu for truck status changes.
 * @param {Event} event The contextmenu event.
 * @param {string} truckId The ID of the truck that was right-clicked.
 */
function showCustomContextMenu(event, truckId) {
    event.preventDefault(); // Prevent default browser context menu
    activeTruckIdForContextMenu = truckId; // Store the truck ID

    customContextMenu.innerHTML = ''; // Clear previous menu items

    // Define user-friendly names for statuses
    const statusDisplayNames = {
        available: 'Available',
        dispatched: 'En Route',
        onScene: 'On Scene',
        enRouteToDestination: 'En Route to Destination',
        atDestination: 'At Destination',
        logistics: 'Logistics',
        Unavailable: 'Unavailable'
    };

    allTruckStatuses.forEach(status => {
        const menuItem = document.createElement('div');
        menuItem.classList.add('context-menu-item');
        menuItem.textContent = statusDisplayNames[status];
        menuItem.dataset.status = status; // Store the actual status value

        if (status === 'posted') {
            menuItem.classList.add('danger-option'); // Add a class for specific styling
        }

        menuItem.addEventListener('click', () => {
            updateTruckStatus(activeTruckIdForContextMenu, status);
            hideCustomContextMenu();
        });
        customContextMenu.appendChild(menuItem);
    });

    // Position the menu
    customContextMenu.style.left = `${event.clientX}px`;
    customContextMenu.style.top = `${event.clientY}px`;
    customContextMenu.classList.add('active'); // Show the menu
}

/**
 * Hides the custom context menu.
 */
function hideCustomContextMenu() {
    customContextMenu.classList.remove('active');
    activeTruckIdForContextMenu = null;
}


// --- 4. Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    applyDarkModePreference(); // Apply dark mode preference on load
    loadData(); // Load data from localStorage on start

    renderTrucks(); // Initial render of all trucks
    initializeTimers(); // Start timers for any trucks already in timer status

    // NEW: Click to cycle truck status (reintroduced)
    trucksContainer.addEventListener('click', (event) => {
        const targetBox = event.target.closest('.status-box');
        if (targetBox) {
            const truckId = targetBox.dataset.truckId;
            const truckIndex = trucks.findIndex(truck => truck.id === truckId);
            if (truckIndex > -1) {
                const currentStatus = trucks[truckIndex].status;
                if (statusCycleOrder.includes(currentStatus)) {
                    const currentIndex = statusCycleOrder.indexOf(currentStatus);
                    const nextIndex = (currentIndex + 1) % statusCycleOrder.length;
                    const nextStatus = statusCycleOrder[nextIndex];
                    updateTruckStatus(truckId, nextStatus);
                } else if (currentStatus === 'posted') {
                    // If 'posted' and clicked, move to 'available' to restart cycle
                    updateTruckStatus(truckId, 'available');
                }
            }
        }
    });

    // Right-click to show custom context menu for truck status
    trucksContainer.addEventListener('contextmenu', (event) => {
        const targetBox = event.target.closest('.status-box');
        if (targetBox) {
            const truckId = targetBox.dataset.truckId;
            showCustomContextMenu(event, truckId);
        } else {
            hideCustomContextMenu(); // Hide if clicked outside a truck box
        }
    });

    // Hide context menu if clicking anywhere else on the document
    document.addEventListener('click', (event) => {
        if (!customContextMenu.contains(event.target) && customContextMenu.classList.contains('active')) {
            hideCustomContextMenu();
        }
    });


    // Admin Panel Toggling
    adminPanelToggleBtn.addEventListener('click', () => {
        adminPanel.classList.add('active');
        renderAdminTruckList(); // Render list when opening admin panel
        resetTruckForm(); // Clear/reset form when opening panel
        // Set initial values for timer inputs
        destinationTimeInput.value = timerDefaults.atDestination; // Updated property name
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
        const newAtDestTime = parseInt(destinationTimeInput.value); // Now for atDestination
        const newLogTime = parseInt(logisticsTimeInput.value);

        if (isNaN(newAtDestTime) || isNaN(newLogTime) || newAtDestTime <= 0 || newLogTime <= 0) {
            showModal('Please enter valid positive numbers for timer defaults.', 'alert');
            return;
        }

        timerDefaults.atDestination = newAtDestTime; // Updated property name
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

    // Data Management Event Listeners
    exportDataBtn.addEventListener('click', exportTrucksToJson);
    importFileInput.addEventListener('change', importTrucksFromJson);

});

