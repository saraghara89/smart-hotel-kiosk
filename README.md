# Smart Stay Kiosk

## Project Name
**Smart Stay Kiosk – Online Check-In & Self-Service Hotel System**

This project is a full-stack web application for a smart hotel check-in and self-service kiosk. It allows hotel guests to verify reservations, review stay details, complete smart check-in, receive room card information, view hotel facilities, and complete self-service checkout. Hotel staff can use a back-office dashboard to monitor reservations, rooms, payment status, and operational statistics.

## Main Idea
The system replaces part of the traditional reception process with a digital kiosk flow. A guest can enter a reservation code, last name, and email. The system verifies the reservation against the database, displays the reservation summary, shows hotel information and weather, and completes the check-in by updating the reservation status and issuing a virtual room card.

## Technologies
- Client: HTML, CSS, JavaScript
- Server: Node.js, Express.js
- Database: JSON file database for course demo purposes
- External API: Open-Meteo Weather API
- JavaScript Library: Chart.js for dashboard statistics
- API Testing: Postman Collection

## Folder Structure
```text
smart-hotel-kiosk-final/
├── client/
│   ├── index.html
│   ├── reservation.html
│   ├── summary.html
│   ├── thankyou.html
│   ├── checkout.html
│   ├── checkout-complete.html
│   ├── hotel-info.html
│   ├── edit-details.html
│   ├── login.html
│   ├── admin.html
│   ├── js/
│   └── style/
├── server/
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── db/
│   └── data/
├── postman/
├── docs/
├── package.json
├── .env.example
└── README.md
```

## Installation
```bash
npm install
npm start
```

Then open:
```text
http://localhost:3000
```

## Test Data
Guest reservation lookup:
```text
Reservation Code: HT123
Last Name: Ghara
Email: sara@email.com
```

Admin login:
```text
Email: admin@smarthotel.com
Password: Admin123
```

## Main Pages
- `/index.html` – Landing page
- `/reservation.html` – Reservation verification
- `/summary.html` – Reservation summary and check-in completion
- `/hotel-info.html` – Hotel facilities guide
- `/edit-details.html` – Guest details update before check-in
- `/checkout.html` – Self-service checkout
- `/login.html` – Staff login
- `/admin.html` – Hotel management dashboard

## REST API Routes
### Auth
- `POST /api/auth/login`

### Reservations
- `GET /api/reservations`
- `GET /api/reservations/:id`
- `POST /api/reservations`
- `POST /api/reservations/verify`
- `PUT /api/reservations/:id`
- `DELETE /api/reservations/:id`
- `PATCH /api/reservations/:id/check-in`
- `PATCH /api/reservations/:id/check-out`
- `PATCH /api/reservations/:id/pay`

### Rooms
- `GET /api/rooms`
- `PUT /api/rooms/:id`

### Statistics
- `GET /api/stats`

### External API
- `GET /api/weather`

## Complex Queries
The project includes more than two complex queries:
- Reservation search by guest name, email, or reservation code: `GET /api/reservations?q=sara`
- Reservation filter by status: `GET /api/reservations?status=checked-in`
- Reservation filter by room type or payment status
- Room filtering by status, type, and capacity
- System statistics calculated from reservation and room data

## External API Usage
The system uses **Open-Meteo API** to display live weather for the hotel city. This is related to the hotel experience because guests can see weather information before using hotel facilities or going out.

## JavaScript Library
The system uses **Chart.js** in the admin dashboard to display reservation statistics visually.

## Notes for Evaluators
- This version uses a JSON file as a simple database for the course project demo.
- No `alert`, `confirm`, or `prompt` are used. All messages appear inside the website UI.
- The server serves both the client and API from the same Express app.
- The `.env` file contains only non-secret demo configuration.

## Submission Links

* Live Project URL: https://smart-hotel-kiosk.onrender.com
* Figma Prototype: https://www.figma.com/proto/uvs77RjFyUSzditBffgoO0/Untitled?node-id=1-2&p=f&t=ln26a7VkJIDdUulj-1&scaling=scale-down-width&content-scaling=fixed&page-id=0%3A1
* GitHub Repository: https://github.com/saraghara89/smart-hotel-kiosk
* Postman Collection: Included in `/postman/Smart-Stay-Kiosk.postman_collection.json`

## Environment Variables

The real `.env` file is not uploaded to GitHub.

To run the project locally, create a `.env` file based on `.env.example`:

```env
PORT=3000
HOTEL_NAME=Smart Stay Hotel
HOTEL_CITY=Tel Aviv
HOTEL_LAT=32.0853
HOTEL_LON=34.7818
```

## Final Submission Notes

This project is a full-stack Node.js and Express application.
The server serves both the frontend pages and the backend API routes.

To run the project:

```bash
npm install
npm start
```

Then open:

```text
http://localhost:3000
```

The project includes:

* RESTful API routes
* Full CRUD for reservations
* Admin login and dashboard
* Search, filtering, and statistics
* External weather API integration
* Chart.js dashboard chart
* Postman API collection
* Error handling and UI messages without `alert`, `confirm`, or `prompt`
