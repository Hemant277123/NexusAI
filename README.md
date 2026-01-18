# 🤖 NexusAI

A **production-ready AI assistant** with a Claude-like interface built with **Next.js** and **FastAPI**.

![Tech Stack](https://img.shields.io/badge/Next.js-black?style=flat&logo=next.js)
![Tech Stack](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Tech Stack](https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openai&logoColor=white)
![Tech Stack](https://img.shields.io/badge/LangChain-121212?style=flat)
![Tech Stack](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| ⚡ **Streaming Responses** | Real-time word-by-word generation |
| 🔍 **Web Search** | Tavily API for current information |
| 💾 **Semantic Memory** | Pinecone vector database for context |
| 👁️ **Vision AI** | Image understanding capability |
| 🔄 **Multi-Model** | Dynamic model selection (GPT-4o, GPT-4o-mini, etc.) |
| 🎨 **Theme Support** | Light and dark mode |
| 💬 **Chat History** | Persistent conversation management |

---

## 📁 Project Structure

```
NexusAI/
├── .env                  # API keys (create from .env.example)
├── .env.example          # Environment template
├── .gitignore           
├── README.md            
│
├── backend/              # FastAPI Python backend
│   ├── main.py           # API endpoints
│   ├── agent.py          # LangChain agent with tools
│   ├── config.py         # Configuration & settings
│   ├── memory.py         # Pinecone vector memory
│   └── requirements.txt  # Python dependencies
│
└── frontend/             # Next.js React frontend
    ├── src/
    │   └── app/
    │       ├── page.tsx      # Main application
    │       ├── layout.tsx    # Root layout
    │       └── globals.css   # Styles
    ├── package.json
    └── next.config.js
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Backend** | FastAPI, Python 3.11, Uvicorn |
| **AI/LLM** | OpenAI GPT-4o, LangChain, LangGraph |
| **Search** | Tavily API |
| **Memory** | Pinecone Vector Database |
| **Styling** | CSS Variables (no Tailwind) |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- API Keys: OpenAI, Tavily, Pinecone

### 1. Clone & Setup Environment

```bash
cd NexusAI
cp .env.example .env
# Edit .env with your API keys
```

### 2. Start Backend (Terminal 1)

```bash
cd backend
pip install -r requirements.txt
python main.py
```
→ API runs at **http://localhost:8000**

### 3. Start Frontend (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```
→ App runs at **http://localhost:3000**

---

## 🔑 Environment Variables

Create a `.env` file in the project root:

```env
# OpenAI API Key
OPENAI_API_KEY=sk-...

# Tavily API Key (free: 1000 calls/month)
TAVILY_API_KEY=tvly-...

# Pinecone API Key (free: 100K vectors)
PINECONE_API_KEY=...

# Pinecone Index Name
PINECONE_INDEX_NAME=nexusai-memory
```

---

## ⚙️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                    (Next.js + React + CSS)                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/SSE
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                               │
│                    (FastAPI + Uvicorn)                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       AI AGENT                                  │
│                 (LangChain + LangGraph)                         │
│                           │                                     │
│      ┌────────────────────┼────────────────────┐                │
│      ▼                    ▼                    ▼                │
│  [Web Search]        [Memory]            [Direct LLM]           │
│   (Tavily)          (Pinecone)           (OpenAI GPT)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📸 Screenshots

*Add screenshots of your application here*

---

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/config` | Get app configuration |
| POST | `/api/chat` | Send message (non-streaming) |
| POST | `/api/chat/stream` | Send message (streaming) |
| POST | `/api/chat/image` | Send message with image |
| GET | `/api/chats` | Get all chats |
| POST | `/api/chats` | Create new chat |
| PUT | `/api/chats/{id}` | Update chat |
| DELETE | `/api/chats/{id}` | Delete chat |

---

## 👤 Created By

**Hemant Pandey** - AI/ML Engineer

[![GitHub](https://img.shields.io/badge/GitHub-100000?style=flat&logo=github&logoColor=white)](https://github.com/Hemant277123)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://linkedin.com/in/hemantpandey-f4)

---

## 📄 License

MIT License - feel free to use this project for your portfolio!
