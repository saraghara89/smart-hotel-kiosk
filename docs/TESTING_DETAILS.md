# Testing Details – Smart Stay Kiosk

## Project Links
Figma:
https://www.figma.com/proto/uvs77RjFyUSzditBffgoO0/Untitled?node-id=1-2&p=f&t=ln26a7VkJIDdUulj-1&scaling=scale-down-width&content-scaling=fixed&page-id=0%3A1

GitHub:
https://github.com/saraghara89/smart-hotel-kiosk

## External API
The project uses Open-Meteo API for weather information:
`GET /api/weather`

The weather appears on the reservation summary page and is connected to the hotel experience.

## JavaScript Library
The project uses Chart.js in the admin dashboard:
`client/admin.html`

Chart.js is used to display reservation statistics by status.

## Demo Credentials
Guest reservation:
- Reservation Code: HT123
- Last Name: Ghara
- Email: sara@email.com

Admin user:
- Email: admin@smarthotel.com
- Password: Admin123

## Important Notes
- Run the project through the Express server using `npm start`.
- Do not open the HTML files directly from the file system, because the client communicates with `/api` routes.
- The database is stored in `server/data/database.json`.
- The project does not require private API keys.


## Main User Flows to Test
1. Guest smart check-in: open `/reservation.html`, verify HT123, review summary, optionally edit details, complete check-in.
2. Guest self-checkout: open `/checkout.html`, enter reservation code and email, complete checkout.
3. Staff management: login with admin credentials, create a reservation, edit it, check it in, delete it, and verify the dashboard chart/statistics update.
4. Payment simulation: use a pending reservation such as HT456, process payment using `PATCH /api/reservations/:id/pay`, and confirm the balance becomes 0.

## Postman Collection
The Postman collection is located under:
`postman/Smart-Stay-Kiosk.postman_collection.json`

It includes success and error examples for the main API routes, including login, reservation verification, CRUD, check-in, checkout, payment, rooms, statistics and weather.
