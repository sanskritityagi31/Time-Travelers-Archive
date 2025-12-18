# 🕰️ Time Travelers Archive

A production-ready, full-stack web application designed to archive, explore, and manage historical timelines and events.  
Built using modern software engineering principles, clean architecture, containerization, and CI/CD practices.

This project demonstrates **real-world system design**, **API-driven development**, and **deployment-ready workflows** expected in top product-based companies.

---

## 🚀 Key Highlights

- Full-stack architecture (Frontend + Backend)
- RESTful API design
- Dockerized services
- Automated testing
- CI/CD with GitHub Actions
- Clean, scalable folder structure
- Interview-ready system design documentation

---

## 🏗️ Architecture Overview

User → Frontend (Web UI)
→ Backend (Node.js + Express)
→ Database
→ Response back to UI

yaml
Copy code

📁 Detailed diagrams available in `/docs`

---

## 🛠️ Tech Stack

**Frontend**
- HTML, CSS, JavaScript

**Backend**
- Node.js
- Express.js

**DevOps**
- Docker & Docker Compose
- GitHub Actions (CI/CD)

**Testing**
- Jest
- Supertest

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js 18+
- Docker

---

### ▶️ Run Using Docker (Recommended)

```bash
git clone https://github.com/sanskritityagi31/Time-Travelers-Archive.git
cd Time-Travelers-Archive
docker-compose up --build
▶️ Run Locally (Without Docker)
bash
Copy code
cd backend
npm install
npm start
bash
Copy code
cd frontend
npm install
npm run dev
📡 API Endpoints
Method	Endpoint	Description
GET	/api/events	Fetch all events
POST	/api/events	Create event
GET	/api/events/:id	Fetch event
DELETE	/api/events/:id	Delete event

🧪 Testing
bash
Copy code
cd backend
npm test
All tests run automatically via GitHub Actions on every push and pull request.

📈 Roadmap
Authentication & authorization

Timeline visualizations

Advanced search & filters

Cloud deployment

Performance benchmarking

👩‍💻 Author
Sanskriti Tyagi
Final-Year Engineering Student
Aspiring Software Engineer

GitHub: https://github.com/sanskritityagi31

