// script.js

// --- Firebase Imports (MUST be at the top) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, deleteDoc, collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


// --- 1. Centralized Truck Data (Will be synced with Firestore) ---
// Initialize with a minimal set or empty. Firestore will populate this.
let trucks = [
    // Example: Trucks starting in an active status with a timer that counts up from now
    // These will be loaded from Firestore if they exist there.
    // If you start with an empty database, these won't show initially.
    // { id: 'T401', name: 'Truck 401', location: 'Miami', status: 'destination', timer: null, timerStartTime: Date.now() - 30 * 1000, mapImageUrl: '' }, 
    // { id: 'T501', name: 'Truck 501', location: 'Houston', status: 'logistics', timer: null, timerStartTime: Date.now() - 70 * 1000, mapImageUrl: '' },
    // { id: 'T601', name: 'Truck 601', location: 'Orlando', status: 'transporting', timer: null, timerStartTime: Date.now() - 120 * 1000, mapImageUrl: '' },
    // { id: 'T701', name: 'Truck 701', location: 'Atlanta', status: 'en-route', timer: null, timerStartTime: Date.now() - 5 * 1000, mapImageUrl: '' },
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

// --- Firebase Variables ---
let db;
let auth;
let userId;
// The __app_id is provided by the Canvas environment.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
// Firebase configuration provided by the user (updated to database-d1c61)
const firebaseConfig = {
  apiKey: "AIzaSyA_f_4fIuphJLtW_uRRsLZZqLGFsDmUu6Q",
  authDomain: "database-d1c61.firebaseapp.com",
  projectId: "database-d1c61",
  storageBucket: "database-d1c61.firebasestorage.app",
  messagingSenderId: "702473947655",
  appId: "1:702473947655:web:759faf5caa1a11379e38a2",
  measurementId: "G-DJ45CCCWHM"
};


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

// Context Menu Elements
const contextMenu = document.getElementById('contextMenu');
const contextMenuList = document.getElementById('contextMenuList');

// NEW: Map Display Modal Elements
const mapModal = document.getElementById('mapModal');
const closeMapModalBtn = mapModal.querySelector('.close-map-modal');
const mapModalTitle = document.getElementById('mapModalTitle');
const mapImageContainer = document.getElementById('mapImageContainer');
const mapLoadingText = document.getElementById('mapLoadingText');
const mapImage = document.getElementById('mapImage');


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
    // Flash page red if available trucks <= 3
    if (count <= 3) {
        document.body.classList.add('system-level-alert');
    } else {
        document.body.classList.remove('system-level-alert');
    }
}

// Function to update a truck's status
async function updateTruckStatus(truckId, newStatus) {
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

        // NEW: Trigger map generation if en-route and system level is low (5 or lower)
        // Ensure mapImageUrl is reset if status changes from en-route
        if (newStatus === 'en-route' && availableTruckCountSpan.textContent <= 5) {
            // Only generate if we don't already have a map for this en-route leg or want a fresh one
            // For simplicity, generating every time it hits en-route with low system level
            handleEnRouteMapGeneration(truck.id, truck.location);
        } else if (newStatus !== 'en-route') {
            truck.mapImageUrl = ''; // Clear map URL if no longer en-route
        }

        await saveTruckToFirestore(truck); // Save updated truck to Firestore
        renderTrucks(); // Re-render all trucks to reflect status change
        renderAdminTruckList(); // Re-render admin list as well
    }
}

// NEW: Function to handle map generation and display when truck goes en-route
async function handleEnRouteMapGeneration(truckId, location) {
    mapModalTitle.textContent = `Map for Truck: ${truckId} (Location: ${location})`;
    mapImage.style.display = 'none';
    mapLoadingText.style.display = 'block';
    mapModal.style.display = 'flex'; // Show modal

    try {
        const imageUrl = await generateMapImage(location);
        const truck = trucks.find(t => t.id === truckId);
        if (truck) {
            truck.mapImageUrl = imageUrl; // Store the generated map URL
            await saveTruckToFirestore(truck); // Persist the map URL with the truck
        }
        mapImage.src = imageUrl;
        mapImage.style.display = 'block';
    } catch (error) {
        console.error('Error generating or displaying map:', error);
        mapImage.style.display = 'none';
        mapLoadingText.textContent = `Error generating map: ${error.message}.`;
        mapLoadingText.style.color = 'red';
    } finally {
        mapLoadingText.style.display = 'none';
    }
}

// NEW: Function to generate map image using Imagen API
async function generateMapImage(location) {
    const prompt = `Highly detailed map view of ${location} showing roads and geographical features. Include a red pin marker at the center.`;
    const payload = { instances: { prompt: prompt }, parameters: { "sampleCount": 1} };
    const apiKey = ""; // API key is handled by Canvas runtime for gemini-2.0-flash and imagen-3.0-generate-002
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Image generation failed: ${errorData.error ? errorData.error.message : response.statusText}`);
    }

    const result = await response.json();
    if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
        return `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
    } else {
        throw new Error('No image data received from API.');
    }
}


// Function to add or update a truck
async function addOrUpdateTruck() {
    const id = truckIdInput.value.trim();
    const name = truckNameInput.value.trim();
    const location = truckLocationInput.value.trim();
    const status = truckStatusSelect.value.toLowerCase(); // Ensure status from dropdown is lowercase


    if (!id || !name || !location) {
        alert('Please fill in all truck details.'); // Using alert for simplicity, consider custom modal
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
                 await updateTruckStatus(editingTruckId, status); // Await updateTruckStatus which saves to Firestore
            } else {
                // If only name/location changed, directly save. Status change handled above.
                await saveTruckToFirestore(trucks[truckIndex]);
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
            alert('Truck with this ID already exists. Please use a unique ID.'); // Using alert for simplicity, consider custom modal
            return;
        }
        // Initialize new truck with timerStartTime if it's a timed status
        const newTruck = { 
            id, 
            name, 
            location, 
            status, 
            timer: null, 
            timerStartTime: isTimedStatus(status) ? Date.now() : null,
            mapImageUrl: '' // Initialize with empty map URL
        };
        trucks.push(newTruck); // Add to local array first for immediate render
        await saveTruckToFirestore(newTruck); // Save new truck to Firestore
        // If the new truck has a timed status, start its timer interval (updateTruckStatus does this too)
        if (isTimedStatus(status)) {
            await updateTruckStatus(id, status); // This will initiate the interval and potentially map generation
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
async function removeTruck(truckId) {
    // Clear timer if truck being removed has one
    const truckToRemove = trucks.find(truck => truck.id === truckId);
    if (truckToRemove && truckToRemove.timer) {
        clearInterval(truckToRemove.timer);
    }
    trucks = trucks.filter(truck => truck.id !== truckId); // Remove from local array first
    await deleteTruckFromFirestore(truckId); // Delete from Firestore
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
}

// Function to initialize timers on page load for trucks already in timer status
function initializeTimers() {
    // Clear all existing timers before re-initializing
    trucks.forEach(truck => {
        if (truck.timer) {
            clearInterval(truck.timer);
            truck.timer = null;
        }
    });

    // Start timers for active trucks
    trucks.forEach(truck => {
        if (isTimedStatus(truck.status)) {
            // If truck doesn't have a timerStartTime (e.g., initial load from DB where it wasn't recorded), set it now.
            // In a real app, timerStartTime should be properly persisted in DB.
            if (!truck.timerStartTime) {
                 truck.timerStartTime = Date.now();
            }
            // Trigger updateTruckStatus to start the interval based on the current state
            // No need to await here, as we are just setting up intervals.
            updateTruckStatus(truck.id, truck.status); 
        }
    });
    // Final render to ensure all timers are showing and correct flash states
    renderTrucks();
}

// NEW: Firestore Integration Functions

async function saveTruckToFirestore(truck) {
    try {
        // Prepare truck object for Firestore - remove functions/intervals
        const truckData = { ...truck };
        delete truckData.timer; // Don't store setInterval ID
        
        const truckDocRef = doc(db, `artifacts/${appId}/public/data/trucks`, truck.id);
        await setDoc(truckDocRef, truckData, { merge: true }); // Use merge to update existing fields
        console.log(`Truck ${truck.id} saved to Firestore.`);
    } catch (e) {
        console.error("Error saving truck to Firestore: ", e);
        alert("Error saving truck data. Changes might not be persistent."); // Using alert for simplicity
    }
}

async function deleteTruckFromFirestore(truckId) {
    try {
        const truckDocRef = doc(db, `artifacts/${appId}/public/data/trucks`, truckId);
        await deleteDoc(truckDocRef);
        console.log(`Truck ${truckId} deleted from Firestore.`);
    } catch (e) {
        console.error("Error deleting truck from Firestore: ", e);
        alert("Error deleting truck data. Changes might not be persistent."); // Using alert for simplicity
    }
}

function setupFirestoreListener() {
    if (!db) {
        console.error("Firestore not initialized.");
        return;
    }

    const trucksCollectionRef = collection(db, `artifacts/${appId}/public/data/trucks`);
    const q = query(trucksCollectionRef); // You can add orderBy, where clauses here if needed

    // Set up real-time listener
    onSnapshot(q, (snapshot) => {
        const fetchedTrucks = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            // Important: Re-initialize timer properties for fetched trucks
            fetchedTrucks.push({ ...data, timer: null, timerStartTime: data.timerStartTime || null });
        });
        trucks = fetchedTrucks; // Update local array with latest data from Firestore
        console.log("Trucks data synced from Firestore:", trucks);
        renderTrucks(); // Re-render the UI with synced data
        initializeTimers(); // Re-initialize timers based on fetched data
    }, (error) => {
        console.error("Error fetching real-time truck data:", error);
        alert("Failed to sync truck data. Display might be outdated.");
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

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Firebase before anything else that depends on db/auth
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token !== '') {
        try {
            await signInWithCustomToken(auth, __initial_auth_token);
            userId = auth.currentUser.uid;
            console.log("Signed in with custom token:", userId);
        } catch (error) {
            console.error("Error signing in with custom token:", error);
            // Fallback to anonymous if custom token fails
            try {
                await signInAnonymously(auth);
                userId = auth.currentUser.uid;
                console.log("Signed in anonymously (custom token failed):", userId);
            } catch (anonError) {
                console.error("Error signing in anonymously:", anonError);
                alert("Authentication failed. Data persistence will not work.");
            }
        }
    } else {
        // If no custom token is provided (e.g., local development outside Canvas)
        try {
            await signInAnonymously(auth);
            userId = auth.currentUser.uid;
            console.log("Signed in anonymously (no custom token provided):", userId);
        } catch (anonError) {
            console.error("Error signing in anonymously:", anonError);
            alert("Authentication failed. Data persistence will not work.");
        }
    }

    // After auth, set up Firestore listener
    setupFirestoreListener();

    applyDarkModePreference(); // Apply dark mode preference on load

    // Initial render and timer initialization will be handled by the Firestore listener's onSnapshot callback


    // Removed hover effect event listeners, now truck boxes are static size:
    // trucksContainer.addEventListener('mouseover', (event) => { ... });
    // trucksContainer.addEventListener('mouseout', (event) => { ... });

    // Click to cycle truck status (left-click)
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

    // Right-Click (Context Menu) functionality
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
