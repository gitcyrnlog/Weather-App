// API Configuration
const apiKey = "063bb3f17cf699dffe09544868e71288";
const apiUrl = "https://api.openweathermap.org/data/2.5/weather?units=metric&q=";
const forecastUrl = "https://api.openweathermap.org/data/2.5/forecast?units=metric&q=";

// Global state
let currentCity = 'New York';
let isDarkMode = false;
let currentUnit = 'C';
let currentWeatherData = null;

// DOM Elements - will be set after DOM loads
let searchInput, searchForm, suggestionsContainer, loadingDiv, errorDiv, weatherContent;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    searchInput = document.getElementById('search-input');
    searchForm = document.querySelector('.search-form');
    suggestionsContainer = document.getElementById('search-suggestions');
    loadingDiv = document.getElementById('loading');
    errorDiv = document.getElementById('error');
    weatherContent = document.getElementById('weather-content');
    
    // Set current year in footer
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
    
    // Add event listeners
    if (searchInput) {
        const debouncedFetch = debounce(fetchLocationSuggestions, 300);
        searchInput.addEventListener('input', () => {
            debouncedFetch(searchInput.value);
        });
    }
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
    }
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (suggestionsContainer && !suggestionsContainer.contains(e.target) && e.target !== searchInput) {
            suggestionsContainer.style.display = 'none';
        }
    });
    
    // Load default location or user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                checkWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                checkWeather('New York');
            }
        );
    } else {
        checkWeather('New York');
    }
});

// Weather icons
function getWeatherIcon(weatherId, size = 80) {
    const code = weatherId.toString();
    let iconSvg = '';
    
    if (code.startsWith('2')) {
        iconSvg = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#facc15" stroke-width="2">
            <path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/>
            <path d="m13 12-3 5h4l-3 5"/>
        </svg>`;
    } else if (code.startsWith('3') || code.startsWith('5')) {
        iconSvg = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2">
            <path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/>
            <path d="M13 12v7"/>
            <path d="M10 13l3 3 3-3"/>
        </svg>`;
    } else if (code.startsWith('6')) {
        iconSvg = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2">
            <path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/>
            <path d="M6 20v-2"/>
            <path d="M12 20v-4"/>
            <path d="M18 20v-6"/>
        </svg>`;
    } else if (code === '800') {
        iconSvg = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2">
            <circle cx="12" cy="12" r="4"/>
            <path d="m12 2 0 2"/>
            <path d="m12 20 0 2"/>
            <path d="m4.93 4.93 1.41 1.41"/>
            <path d="m17.66 17.66 1.41 1.41"/>
            <path d="m2 12 2 0"/>
            <path d="m20 12 2 0"/>
            <path d="m6.34 17.66-1.41 1.41"/>
            <path d="m19.07 4.93-1.41 1.41"/>
        </svg>`;
    } else {
        iconSvg = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 0 1 0 9Z"/>
        </svg>`;
    }
    
    return iconSvg;
}

// Utility functions
function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDay(timestamp) {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
        weekday: 'short'
    });
}

function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function convertTemperature(temp, toUnit) {
    if (toUnit === 'F') {
        return Math.round((temp * 9/5) + 32);
    }
    return Math.round(temp);
}

// UI Functions
function showLoading() {
    if (loadingDiv) {
        loadingDiv.classList.remove('hidden');
    }
    if (weatherContent) {
        weatherContent.classList.add('hidden');
    }
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
}

function hideLoading() {
    if (loadingDiv) {
        loadingDiv.classList.add('hidden');
    }
}

function showError(message) {
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
    if (weatherContent) {
        weatherContent.classList.add('hidden');
    }
}

function showWeatherContent() {
    if (weatherContent) {
        weatherContent.classList.remove('hidden');
    }
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
}

// Search functionality
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

async function fetchLocationSuggestions(query) {
    if (!suggestionsContainer) return;
    
    if (query.length < 2) {
        suggestionsContainer.style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${apiKey}`);
        const data = await response.json();
        if (data.length > 0) {
            displaySuggestions(data);
        } else {
            suggestionsContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }
}

function displaySuggestions(locations) {
    if (!suggestionsContainer) return;
    
    suggestionsContainer.innerHTML = '';
    locations.forEach(location => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = `${location.name}, ${location.country}`;
        div.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = `${location.name}, ${location.country}`;
            }
            suggestionsContainer.style.display = 'none';
            checkWeatherByCoords(location.lat, location.lon);
        });
        suggestionsContainer.appendChild(div);
    });
    suggestionsContainer.style.display = 'block';
}

// Search form submission
function handleSearch(event) {
    event.preventDefault();
    const cityName = searchInput.value.trim();
    if (cityName) {
        checkWeather(cityName);
        suggestionsContainer.style.display = 'none';
    }
}

// Weather API functions
async function checkWeather(city) {
    try {
        showLoading();
        const response = await fetch(`${apiUrl}${city}&appid=${apiKey}`);
        if (!response.ok) throw new Error("City not found");
        const data = await response.json();
        currentWeatherData = data;
        updateWeatherUI(data);
        await updateForecast(city);
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

async function checkWeatherByCoords(lat, lon) {
    try {
        showLoading();
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
        const data = await response.json();
        currentWeatherData = data;
        updateWeatherUI(data);
        await updateForecast(data.name);
    } catch (error) {
        showError("Error fetching weather data.");
    } finally {
        hideLoading();
    }
}

async function updateForecast(city) {
    try {
        const response = await fetch(`${forecastUrl}${city}&appid=${apiKey}`);
        const forecastData = await response.json();
        updateForecastUI(forecastData);
    } catch (error) {
        console.error('Error updating forecast:', error);
    }
}

// Update UI functions
function updateWeatherUI(weather) {
    const temp = convertTemperature(weather.main.temp, currentUnit);
    const feelsLike = convertTemperature(weather.main.feels_like, currentUnit);
    
    // Update location and date
    const locationEl = document.getElementById('location');
    const dateEl = document.getElementById('current-date');
    if (locationEl) locationEl.textContent = `${weather.name}, ${weather.sys.country}`;
    if (dateEl) dateEl.textContent = formatDate(new Date());
    
    // Update weather icon and temperature
    const iconEl = document.getElementById('weather-icon');
    const tempEl = document.getElementById('temperature');
    const descEl = document.getElementById('description');
    
    if (iconEl) iconEl.innerHTML = getWeatherIcon(weather.weather[0].id);
    if (tempEl) tempEl.textContent = `${temp}°${currentUnit}`;
    if (descEl) descEl.textContent = weather.weather[0].description;
    
    // Update stats
    const feelsLikeEl = document.getElementById('feels-like');
    const humidityEl = document.getElementById('humidity');
    const windEl = document.getElementById('wind');
    const pressureEl = document.getElementById('pressure');
    
    if (feelsLikeEl) feelsLikeEl.textContent = `${feelsLike}°${currentUnit}`;
    if (humidityEl) humidityEl.textContent = `${weather.main.humidity}%`;
    if (windEl) windEl.textContent = `${Math.round(weather.wind.speed)} m/s`;
    if (pressureEl) pressureEl.textContent = `${weather.main.pressure} hPa`;
    
    // Update details
    const sunriseEl = document.getElementById('sunrise');
    const sunsetEl = document.getElementById('sunset');
    const windDetailEl = document.getElementById('wind-detail');
    const visibilityEl = document.getElementById('visibility');
    
    if (sunriseEl) sunriseEl.textContent = formatTime(weather.sys.sunrise);
    if (sunsetEl) sunsetEl.textContent = formatTime(weather.sys.sunset);
    if (windDetailEl) windDetailEl.textContent = `${weather.wind.speed} m/s${weather.wind.deg ? ', ' + weather.wind.deg + '°' : ''}`;
    if (visibilityEl) visibilityEl.textContent = `${(weather.visibility / 1000).toFixed(1)} km`;
    
    // Update weather advice
    const advice = getWeatherAdvice(weather.main.temp, weather.weather[0].main, weather.main.humidity, weather.wind.speed);
    const adviceEl = document.getElementById('weather-advice');
    if (adviceEl) adviceEl.innerHTML = advice;
    
    showWeatherContent();
}

function updateForecastUI(forecast) {
    const dailyForecast = forecast.list.filter((item, index) => index % 8 === 4).slice(0, 7);
    const forecastGrid = document.getElementById('forecast-grid');
    
    forecastGrid.innerHTML = '';
    
    dailyForecast.forEach(day => {
        const temp = convertTemperature(day.main.temp, currentUnit);
        const tempMin = convertTemperature(day.main.temp_min, currentUnit);
        const tempMax = convertTemperature(day.main.temp_max, currentUnit);
        
        const forecastDay = document.createElement('div');
        forecastDay.className = 'forecast-day';
        forecastDay.innerHTML = `
            <p style="font-weight: 600;">${formatDay(day.dt)}</p>
            <div class="forecast-icon">${getWeatherIcon(day.weather[0].id, 32)}</div>
            <div class="temp-range">
                <span class="temp-max">${tempMax}°</span>
                <span class="temp-min">${tempMin}°</span>
            </div>
        `;
        forecastGrid.appendChild(forecastDay);
    });
}

// Weather advice function
function getWeatherAdvice(temp, condition, humidity, windSpeed) {
    let advice = "";

    // Temperature advice
    if (temp <= 0) {
        advice += "❄️ <strong>Extreme cold!</strong> Layer up with thermal wear, heavy coat, gloves, and a warm hat. Limit outdoor exposure.<br><br>";
    } else if (temp <= 10) {
        advice += "🧥 <strong>Chilly conditions.</strong> Wear a warm coat, scarf, and consider gloves. Perfect for a brisk walk!<br><br>";
    } else if (temp <= 20) {
        advice += "👕 <strong>Pleasant temperatures.</strong> A light jacket or sweater will keep you comfortable. Great weather for outdoor activities!<br><br>";
    } else if (temp <= 30) {
        advice += "☀️ <strong>Warm weather!</strong> Light, breathable clothing recommended. Perfect for outdoor recreation, but stay hydrated.<br><br>";
    } else {
        advice += "🔥 <strong>Heat alert!</strong> Wear light, loose-fitting clothing. Stay hydrated and seek shade during peak hours.<br><br>";
    }
    
    // Condition-based advice
    switch(condition.toLowerCase()) {
        case 'rain':
            advice += "☔ <strong>Rainy conditions:</strong> Pack an umbrella and waterproof gear. Drive carefully on wet roads.<br><br>";
            break;
        case 'snow':
            advice += "❄️ <strong>Snowy conditions:</strong> Wear insulated, waterproof boots. Drive with caution and watch for ice.<br><br>";
            break;
        case 'thunderstorm':
            advice += "⚡ <strong>Severe weather:</strong> Stay indoors, avoid open areas and tall objects. Keep devices charged.<br><br>";
            break;
        case 'clear':
            advice += "😎 <strong>Beautiful clear skies!</strong> Perfect for outdoor activities. Don't forget sun protection!<br><br>";
            break;
        case 'clouds':
            advice += "☁️ <strong>Overcast conditions.</strong> Good for outdoor activities with less sun exposure.<br><br>";
            break;
    }

    // Additional comfort advice
    if (humidity > 70) {
        advice += "💧 <strong>High humidity:</strong> It may feel warmer than the actual temperature. Stay hydrated!<br><br>";
    }
    if (windSpeed > 20) {
        advice += "💨 <strong>Strong winds:</strong> Secure loose objects and be careful when driving.";
    }

    return advice;
}

// Theme and unit toggle functions
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark', isDarkMode);
    
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    
    if (isDarkMode) {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    } else {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }
}

function toggleUnit() {
    currentUnit = currentUnit === 'C' ? 'F' : 'C';
    document.querySelector('.unit-toggle').textContent = `°${currentUnit}`;
    
    // Update displayed temperatures if weather data is available
    if (currentWeatherData) {
        updateWeatherUI(currentWeatherData);
    }
}
