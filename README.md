# ConnectSphere – Real-Time Communication Platform

**ConnectSphere** is a web-based communication platform that allows users to connect through video meetings, real-time communication, and collaborative tools.

🌐 **Live Demo:** https://connect-sphere-weld.vercel.app/

📂 **GitHub Repository:** https://github.com/AryaKishor-01978/ConnectSphere

## 🚀 Features

- User registration and login
- Real-time video and audio meetings
- Create and join meetings
- Host approval for meeting participants
- Camera and microphone controls
- Screen sharing
- File sharing
- Collaborative whiteboard
- Meeting history
- Multi-device access

## 🛠️ Technologies Used

**Frontend**
- React.js
- Vite
- HTML
- CSS
- JavaScript

**Backend**
- Node.js
- Express.js
- Socket.IO

**Database**
- MongoDB Atlas
- Mongoose

**Real-Time Communication**
- WebRTC
- Socket.IO

**Deployment**
- Vercel – Frontend
- Render – Backend

## 📁 Project Structure

```text
ConnectSphere/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── uploads/
│   ├── server.js
│   └── package.json
│
└── README.md
```

## ⚙️ Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/AryaKishor-01978/ConnectSphere.git
cd ConnectSphere
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

Create a `.env` file inside the backend folder:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
FRONTEND_URL=https://connect-sphere-weld.vercel.app
```

### 3. Start the backend

```bash
npm run dev
```

### 4. Install frontend dependencies

Open another terminal:

```bash
cd frontend
npm install
```

Create the frontend `.env` file:

```env
VITE_SERVER_URL=http://localhost:5000
```

Use your local HTTPS configuration if your development setup requires it.

### 5. Start the frontend

```bash
npm run dev
```

## 🔐 Security

- JWT-based user authentication
- Protected backend routes
- Meeting participant authorization
- Environment variables for sensitive configuration
- HTTPS for deployed communication

## 🌍 Live Application

Try ConnectSphere here:

https://connect-sphere-weld.vercel.app/

## 🎯 Project Objective

The main objective of ConnectSphere is to provide an accessible communication platform where users can conduct online meetings and collaborate using real-time communication features.

## 👨‍💻 Developer

**Arya Kishor**

B.Tech – Computer Science and Engineering

Galgotias University

GitHub: https://github.com/AryaKishor-01978

LinkedIn: http://linkedin.com/in/arya-kishor-b2494136b

---
## 📸 Application Screenshots

### Screenshot 1
![ConnectSphere Screenshot](Screenshot%202026-11-25%20092946.png)

### Screenshot 2
![ConnectSphere Screenshot](Screenshot%202026-11-25%20093038.png)

### Screenshot 3
![ConnectSphere Screenshot](Screenshot%202026-11-25%20093135.png)

### Screenshot 4
![ConnectSphere Screenshot](Screenshot%202026-11-25%20093155.png)

⭐ If you find this project interesting, feel free to explore the repository!
