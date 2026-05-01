# 🚀 Full-Stack AI Mock Interview Platform

An advanced, credit-based mock interview platform powered by Artificial Intelligence. This application allows users to practice interviews, receive feedback, and manage their mock interview credits.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.2.4-61DAFB.svg?style=flat&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933.svg?style=flat&logo=nodedotjs)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248.svg?style=flat&logo=mongodb)

## ✨ Features

- **🤖 AI-Powered Mock Interviews:** Practice with an intelligent AI interviewer that adapts to your responses.
- **💳 Credit-Based System:** Users purchase credits to access interview sessions, managed securely via Razorpay.
- **📄 Resume Analysis:** Upload resumes (PDF) for tailored interview questions using `pdfjs-dist`.
- **📊 Performance Dashboards:** Track progress with visual charts (`recharts`) and detailed feedback reports (exportable via `jspdf`).
- **🔐 Secure Authentication:** Robust user authentication and authorization using Firebase and JSON Web Tokens (JWT).
- **💫 Modern UI/UX:** A highly responsive, beautifully animated frontend built with React, TailwindCSS, and Framer Motion.

## 🛠️ Tech Stack

### Frontend (Client)
- **Framework:** React 19 + Vite
- **State Management:** Redux Toolkit
- **Styling:** TailwindCSS v4
- **Animations:** Framer Motion
- **Data Visualization:** Recharts
- **PDF Generation:** jsPDF & jsPDF-AutoTable
- **Authentication:** Firebase

### Backend (Server)
- **Framework:** Node.js with Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JWT (JSON Web Tokens)
- **Payments:** Razorpay Integration
- **File Handling:** Multer
- **PDF Parsing:** PDF.js

## 📂 Project Structure

```text
Full-Stack-AI-Mock-Interview-Platform-with-Credit-Based-Access/
├── client/                 # React frontend application
│   ├── src/                # Frontend source code
│   ├── package.json        # Frontend dependencies
│   └── vite.config.js      # Vite configuration
├── server/                 # Node.js Express backend
│   ├── index.js            # Server entry point
│   ├── package.json        # Backend dependencies
│   └── ...                 # Routes, controllers, models, etc.
└── README.md               # Project documentation
```

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas)
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/NareshChary0430/Full-Stack-AI-Mock-Interview-Platform-with-Credit-Based-Access.git
   cd Full-Stack-AI-Mock-Interview-Platform-with-Credit-Based-Access
   ```

2. **Install Server Dependencies:**
   ```bash
   cd server
   npm install
   ```

3. **Install Client Dependencies:**
   ```bash
   cd ../client
   npm install
   ```

## 🔐 Environment Variables

You need to create `.env` files in both the `client` and `server` directories.

### Server (`server/.env`)
Create a `.env` file in the `server` directory and add the following variables:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
# Add any other required backend keys (like AI API keys)
```

### Client (`client/.env`)
Create a `.env` file in the `client` directory and add the following variables:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

## 🏃‍♂️ Running the Application

1. **Start the Backend Server:**
   ```bash
   cd server
   npm run dev
   ```
   The server will start on `http://localhost:5000`

2. **Start the Frontend Client:**
   ```bash
   cd client
   npm run dev
   ```
   The client will start on `http://localhost:5173`

## 📝 Troubleshooting Git `.env` Tracking

If your `.env` files are being tracked by Git despite being in `.gitignore`, it means they were committed before the `.gitignore` rule was added. To fix this, run:

```bash
git rm --cached client/.env server/.env
git commit -m "chore: remove .env files from tracking"
```

## 📄 License

This project is licensed under the MIT License.
