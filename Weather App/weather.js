const apiKey = "063bb3f17cf699dffe09544868e71288";
const apiUrl = "https://api.openweathermap.org/data/2.5/weather?units=metric&q=";
const forecastUrl = "https://api.openweathermap.org/data/2.5/forecast?units=metric&q=";

const searchInput = document.querySelector("#location-search");
const searchBtn = document.querySelector(".search button");
const weatherIcon = document.querySelector(".weather-icon");
const weatherDiv = document.querySelector(".weather");
const forecastContainer = document.querySelector(".forecast-container");
const adviceText = document.querySelector(".advice-text");
const loadingDiv = document.querySelector(".loading");
const weatherAlert = document.querySelector(".weather-alert");
const suggestionsContainer = document.querySelector("#search-suggestions");
const themeSwitch = document.getElementById("theme-switch");
const unitToggle = document.getElementById("unit-toggle");

let currentTheme = 'light';
let currentUnit = 'C';

// Theme Switch
themeSwitch.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeSwitch.innerHTML = `<i class="fa-solid fa-${currentTheme === 'light' ? 'moon' : 'sun'}"></i>`;
});

// Temperature Unit Toggle
unitToggle.addEventListener('click', () => {
    currentUnit = currentUnit === 'C' ? 'F' : 'C';
    unitToggle.textContent = `°${currentUnit}`;
    updateTemperatureDisplay();
});

function updateTemperatureDisplay() {
    const tempElements = document.querySelectorAll(".temp, .feels-like");
    tempElements.forEach(el => {
        let temp = parseInt(el.dataset.temp);
        el.innerHTML = currentUnit === 'C' ? `${temp}°C` : `${Math.round((temp * 9/5) + 32)}°F`;
    });
}

// Debounce function to limit API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

async function fetchLocationSuggestions(query) {
    if (query.length < 2) {
        suggestionsContainer.style.display = 'none';
        return;
    }
    try {
        const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${apiKey}`);
        const data = await response.json();
        if (data.length > 0) displaySuggestions(data);
        else suggestionsContainer.style.display = 'none';
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        suggestionsContainer.style.display = 'none';
    }
}

function displaySuggestions(locations) {
    suggestionsContainer.innerHTML = '';
    locations.forEach(location => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = `${location.name}, ${location.country}`;
        div.addEventListener('click', () => {
            searchInput.value = `${location.name}, ${location.country}`;
            suggestionsContainer.style.display = 'none';
            checkWeatherByCoords(location.lat, location.lon);
        });
        suggestionsContainer.appendChild(div);
    });
    suggestionsContainer.style.display = 'block';
}

const debouncedFetch = debounce(fetchLocationSuggestions, 300);
searchInput.addEventListener('input', () => debouncedFetch(searchInput.value));

searchBtn.addEventListener("click", () => {
    const cityName = searchInput.value.trim();
    if (cityName) checkWeather(cityName);
});

searchInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        const cityName = searchInput.value.trim();
        if (cityName) checkWeather(cityName);
    }
});

document.addEventListener('click', (e) => {
    if (!suggestionsContainer.contains(e.target) && e.target !== searchInput) {
        suggestionsContainer.style.display = 'none';
    }
});

async function checkWeather(city) {
    try {
        loadingDiv.style.display = "block";
        const response = await fetch(`${apiUrl}${city}&appid=${apiKey}`);
        if (!response.ok) throw new Error("City not found");
        const data = await response.json();
        updateWeatherUI(data);
    } catch (error) {
        weatherAlert.textContent = error.message;
        weatherAlert.style.display = "block";
    } finally {
        loadingDiv.style.display = "none";
    }
}

function updateWeatherUI(weatherData) {
    // Get the weather condition
    const weatherCondition = weatherData.weather[0].main;

    document.querySelector(".city").textContent = weatherData.name;
    document.querySelector(".temp").textContent = `${Math.round(weatherData.main.temp)}°C`;
    document.querySelector(".temp").dataset.temp = Math.round(weatherData.main.temp);
    document.querySelector(".feels-like").textContent = `${Math.round(weatherData.main.feels_like)}°C`;
    document.querySelector(".feels-like").dataset.temp = Math.round(weatherData.main.feels_like);
    document.querySelector(".humidity").textContent = `${weatherData.main.humidity}%`;
    document.querySelector(".wind").textContent = `${Math.round(weatherData.wind.speed)} km/h`;
    
    // Determining time of day 
    const isNight = weatherData.dt > weatherData.sys.sunset || weatherData.dt < weatherData.sys.sunrise;

    // Get and Display advice
    const advice = getWeatherAdvice(
        weatherData.main.temp, 
        weatherCondition, 
        weatherData.main.humidity, 
        weatherData.wind.speed
    );
    adviceText.innerHTML = advice;

    // Displaying the weather info
    weatherDiv.style.display = "block";
    weatherAlert.style.display = "none";    

    // Update Forecast
    updateForecast(weatherData.name);

    // Update weather icon
    const iconName = getWeatherIcon(weatherCondition, isNight ? 'night' : 'day');
    weatherIcon.className = `fa-solid ${iconName} weather-icon`;
}

window.addEventListener('load', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => checkWeatherByCoords(position.coords.latitude, position.coords.longitude),
            () => checkWeather("London")
        );
    }
});

async function checkWeatherByCoords(lat, lon) {
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
        const data = await response.json();
        updateWeatherUI(data);
    } catch (error) {
        console.error('Error:', error);
        weatherAlert.textContent = "Error fetching weather data.";
        weatherAlert.style.display = "block";
    }
}

function getWeatherAdvice(temp, condition, humidity, windSpeed) {
    let advice = "";

    // Enhanced temperature advice
    if (temp <= 0) {
        advice += "❄️ Extreme cold! Layer up with thermal wear, heavy coat, gloves, and a warm hat. Limit outdoor exposure.\n";
    } else if (temp <= 10) {
        advice += "🧥 Chilly conditions. Wear a warm coat, scarf, and consider gloves. Perfect for a brisk walk!\n";
    } else if (temp <= 20) {
        advice += "👕 Pleasant temperatures. A light jacket or sweater will keep you comfortable. Great weather for outdoor activities!\n";
    } else if (temp <= 30) {
        advice += "☀️ Warm weather! Light, breathable clothing recommended. Perfect for outdoor recreation, but stay hydrated.\n";
    } else {
        advice += "🔥 Heat alert! Wear light, loose-fitting clothing. Stay hydrated and seek shade during peak hours.\n";
    }
    
    // Enhanced condition-based advice
    switch(condition.toLowerCase()) {
        case 'rain':
            advice += "☔ Rainy conditions: Pack an umbrella and waterproof gear. Drive carefully on wet roads.\n";
            break;
        case 'snow':
            advice += "❄️ Snowy conditions: Wear insulated, waterproof boots. Drive with caution and watch for ice.\n";
            break;
        case 'thunderstorm':
            advice += "⚡ Severe weather: Stay indoors, avoid open areas and tall objects. Keep devices charged.\n";
            break;
        case 'clear':
            advice += "😎 Beautiful clear skies! Perfect for outdoor activities. Don't forget sun protection!\n";
            break;
        case 'clouds':
            advice += "☁️ Overcast conditions. Good for outdoor activities with less sun exposure.\n";
            break;
    }

    // Additional comfort advice based on humidity and wind
    if (humidity > 70) {
        advice += "💧 High humidity: It may feel warmer than the actual temperature. Stay hydrated!\n";
    }
    if (windSpeed > 20) {
        advice += "💨 Strong winds: Secure loose objects and be careful when driving.\n";
    }

    return advice;
}

function getWeatherIcon(condition, timeOfDay = 'day') {
    const isNight = timeOfDay === 'night';
    
    switch(condition.toLowerCase()) {
        case 'clear': return isNight ? "fa-moon" : "fa-sun";
        case 'clouds': return isNight ? "fa-cloud-moon" : "fa-cloud-sun";
        case 'rain': return "fa-cloud-rain";
        case 'drizzle': return "fa-cloud-rain";
        case 'thunderstorm': return "fa-cloud-bolt";
        case 'snow': return "fa-snowflake";
        case 'mist': case 'fog': return "fa-smog";
        default: return "fa-cloud";
    }
}

async function updateForecast(city) {
    try {
        const forecastResponse = await fetch(forecastUrl + city + `&appid=${apiKey}`);
        const forecastData = await forecastResponse.json();

        forecastContainer.innerHTML = '';
        const dailyForecasts = forecastData.list.filter(item => item.dt_txt.includes('12:00:00')).slice(0, 5);

        dailyForecasts.forEach(day => {
            const date = new Date(day.dt * 1000);
            const dayName = date.toLocaleDateString('en-US', {weekday: 'short'});
            const icon = getWeatherIcon(day.weather[0].main);

            forecastContainer.innerHTML += `
                <div class="forecast-day">
                    <p>${dayName}</p>
                    <i class="fa-solid ${icon}"></i>
                    <p>${Math.round(day.main.temp)}°C</p>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error updating forecast:', error);
    }
}