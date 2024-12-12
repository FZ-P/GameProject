'use strict';

// Initialize the map and set its view to a specific location (latitude, longitude) and zoom level
const map = L.map('map').setView([60, 24], 7); // Set initial view to Helsinki
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Global variables
const apiUrl = 'http://127.0.0.1:5000';
const startLoc = 'EFHK';
const airportMarkers = L.featureGroup().addTo(map); // Group for airport markers
let currentGameData = null; // To hold game data across functions

// Icons
const blueIcon = L.divIcon({ className: 'blue-icon' });
const greenIcon = L.divIcon({ className: 'green-icon' });

// Function to fetch data from API
async function getData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error fetching data: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error in getData:', error);
        alert('Failed to fetch data from the server. Check console for details.');
        throw error;
    }
}

// Function to update the airport name and fetch live weather
async function updateAirportDetails(location) {
    if (!location || !location.latitude || !location.longitude || !location.name) {
        console.error('Invalid location data:', location);
        return;
    }

    // Update the airport name in the UI
    document.querySelector('#airport_name').innerHTML = location.name;

    // Fetch live weather for the airport
    await fetchWeather(location.latitude, location.longitude);
}

// Function to fetch and display live weather
async function fetchWeather(latitude, longitude) {
    const weatherApiKey = 'cc1d145fc23f51bb4e94d44d89316beb'; // Your API key
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${weatherApiKey}`;

    console.log('Fetching weather from:', weatherUrl); // Log the URL

    try {
        const weatherData = await getData(weatherUrl);

        // Update weather details in the UI
        if (weatherData && weatherData.main) {
            document.querySelector('#airport-temp').innerHTML = `${weatherData.main.temp}°C`;
            document.querySelector('#airport-conditions').innerHTML = weatherData.weather[0].description;
            document.querySelector('#airport-wind').innerHTML = `${weatherData.wind.speed}m/s`;
            document.querySelector('#weather-icon').src = `http://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`;
        } else {
            throw new Error('Invalid weather data');
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
        alert('Unable to fetch live weather data.');
    }
}



// Function to update game status
function updateStatus(status) {
    document.querySelector('#player-name').innerHTML = `Player: ${status.name || 'Undefined'}`;
    document.querySelector('#consumed').innerHTML = `${status.co2_points}`;
    document.querySelector('#budget').innerHTML = `${10000 - status.co2_points}`;
    if (status.money !== undefined) {
        document.querySelector('#money').innerHTML = `Money: $${status.money}`;
    }
}

// Function to add fly options
function addFlyOptions(airports) {
    airportMarkers.clearLayers(); // Clear previous markers

    airports.forEach((airport) => {
        const marker = L.marker([airport.latitude, airport.longitude], { icon: blueIcon }).addTo(airportMarkers);
        marker.bindPopup(`<b>${airport.name}</b><br><button class="fly-btn" data-icao="${airport.icao_code}" data-consumption="100">Fly Here</button>`);

        // Add an event listener for the fly button
        marker.on('popupopen', () => {
            document.querySelectorAll('.fly-btn').forEach((btn) => {
                btn.addEventListener('click', async (event) => {
                    const dest = event.target.getAttribute('data-icao');
                    const consumption = event.target.getAttribute('data-consumption');

                    // Send a request to the flyto endpoint
                    const flyUrl = `${apiUrl}/flyto?game=${currentGameData.status.id}&dest=${dest}&consumption=${consumption}`;
                    const newGameData = await getData(flyUrl);

                    // Update game state
                    updateStatus(newGameData.status);
                    const newLocation = newGameData.status.location;

                    // Fly to new location
                    map.flyTo([newLocation.latitude, newLocation.longitude], 10);
                    L.marker([newLocation.latitude, newLocation.longitude], { icon: greenIcon })
                        .addTo(map)
                        .bindPopup(`<b>${newLocation.name}</b>`)
                        .openPopup();

                    // Update airport details
                    await updateAirportDetails(newLocation);
                });
            });
        });
    });
}

// Function to load destinations
async function loadDestinations() {
    const airportsUrl = `${apiUrl}/airports`; // Endpoint to fetch all airports
    const airports = await getData(airportsUrl);

    if (airports && airports.airports) {
        addFlyOptions(airports.airports); // Add markers for destinations
    } else {
        console.error('Invalid airport data');
    }
}

// Main function to start the game
async function gameSetup(url) {
    try {
        const gameData = await getData(url);

        if (!gameData || !gameData.status) {
            throw new Error('Invalid game data received');
        }

        currentGameData = gameData; // Store game data for later use
        updateStatus(gameData.status);

        const location = gameData.status.location;
        if (location.latitude && location.longitude) {
            map.flyTo([location.latitude, location.longitude], 10);
            L.marker([location.latitude, location.longitude], { icon: greenIcon })
                .addTo(map)
                .bindPopup(`<b>${location.name}</b>`)
                .openPopup();

            await updateAirportDetails(location);
        }

        await loadDestinations(); // Load destinations and enable flying
    } catch (error) {
        console.error('Error in gameSetup:', error);
    }
}

// Form submission to start the game
document.querySelector('#player-form').addEventListener('submit', function (evt) {
    evt.preventDefault();
    const playerName = document.querySelector('#player-input').value;
    if (!playerName) {
        alert('Player name is required!');
        return;
    }
    document.querySelector('#player-modal').classList.add('hide');
    gameSetup(`${apiUrl}/newgame?player=${playerName}&loc=${startLoc}`);
});
