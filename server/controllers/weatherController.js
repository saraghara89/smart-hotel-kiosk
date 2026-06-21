async function getHotelWeather(req, res, next) {
  try {
    const latitude = process.env.HOTEL_LAT || '32.0853';
    const longitude = process.env.HOTEL_LON || '34.7818';
    const city = process.env.HOTEL_CITY || 'Tel Aviv';
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('External weather service is unavailable.');
    const weather = await response.json();
    res.json({ success: true, source: 'Open-Meteo API', city, data: weather.current });
  } catch (error) {
    res.status(502).json({ success: false, message: error.message || 'Failed to load external weather data.' });
  }
}

module.exports = { getHotelWeather };
