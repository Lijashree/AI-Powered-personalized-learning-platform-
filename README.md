# StudyMind AI – Intelligent Personalized Learning Platform

StudyMind AI is a full-stack personalized learning platform designed to help students prepare for university examinations and campus placements. It combines AI-assisted study tools, semantic question search, personalized learning history, and coding practice in a single application.

The platform helps students organize their learning, practice technical concepts, track study activity, and revisit previously studied topics.

## Features

- **User Authentication:** User registration and login using JWT authentication.
- **AI Study Notes:** Generate structured study notes based on selected topics.
- **Quiz Generation:** Practice multiple-choice questions and track quiz scores.
- **Interactive Flashcards:** Review concepts using front-and-back flashcards.
- **Similar Question Finder:** Discover conceptually similar questions using semantic embeddings rather than keyword matching alone.
- **Automatic Topic Classification:** Automatically assign relevant subject tags to questions.
- **AI Doubt Solver:** Get assistance with academic questions using relevant learning-history context.
- **Personalized Learning History:** Access previously saved study activities and questions.
- **Study Roadmaps:** Organize topics into structured learning levels.
- **Coding Practice:** Write, compile, and execute Python and Java programs.
- **Interview Preparation:** Practice technical interview questions and review suggested answers.
- **Study Planner:** Create and manage personal study goals.
- **Analytics Dashboard:** Review learning activity and progress statistics.
- **Unified History:** Access previous activities across supported learning modules.

## Technology Stack

### Frontend
- React.js
- JavaScript
- HTML5 and CSS
- React Router
- Axios
- Tailwind CSS
- Monaco Editor for coding practice
- Sonner for notifications

### Backend
- Python
- FastAPI
- Uvicorn
- JWT authentication
- Pydantic
- Motor or the MongoDB driver configured by the project

### Database
- MongoDB
- MongoDB Atlas or a local MongoDB instance, depending on configuration

### Artificial Intelligence and Machine Learning
- Sentence Transformers
- `all-MiniLM-L6-v2` for semantic embeddings
- NumPy
- Cosine similarity
- Retrieval-Augmented Generation (RAG)
- OpenRouter API for supported generative AI features

## System Architecture

StudyMind AI follows a React frontend, FastAPI backend, and MongoDB database architecture.

1. The student interacts with the React frontend.
2. The frontend sends API requests to the FastAPI backend.
3. The backend validates requests and authenticates users where required.
4. MongoDB stores user information and supported learning activities.
5. Sentence Transformers converts questions into semantic embeddings.
6. Cosine similarity helps identify questions with related meanings.
7. Topic classification assigns relevant academic categories to questions.
8. AI services generate learning content when configured.
9. The application displays study resources, previous activities, and analytics.

## Semantic Similarity and Automatic Topic Classification

### Semantic Embeddings

The Similar Question Finder converts questions into numerical vectors using a sentence-embedding model. These vectors represent semantic information about the questions.

Unlike simple keyword matching, semantic search can identify questions that discuss similar concepts even when their wording differs.

### Cosine Similarity

Cosine similarity compares question embeddings to estimate how closely their meanings are related. Questions with higher similarity scores can be presented as related questions.

### Automatic Topic Classification

The system compares a question's embedding with predefined topic representations or uses the topic-classification logic configured in the backend. It then assigns the most relevant subject category.

### Personalized Learning History

The platform stores supported learning activities in MongoDB. Where configured, retrieval logic can use relevant records belonging to the authenticated student to provide contextual assistance.

## Code Editor and Execution

The Coding Practice module provides an editor where students can write Python or Java code and optionally provide standard input.

### Execution Workflow

1. The student selects Python or Java in the coding interface.
2. The student writes code in the Monaco Editor.
3. Optional input can be provided through the standard-input field.
4. The frontend sends the code, language, and input to the backend.
5. The backend uses subprocess-based execution to run Python code or compile and execute Java code.
6. The application captures execution output and relevant errors and displays the result.

The execution service uses a timeout to limit how long a program can run. Java execution requires a compatible JDK installed and accessible through the system PATH.

### Security Considerations

The current subprocess-based execution mechanism should not be considered a secure sandbox. A timeout alone cannot prevent access to host files, environment variables, or other system resources.

Before making code execution available publicly, implement proper process isolation, resource limits, filesystem restrictions, and network controls. A dedicated sandboxing service or an appropriately configured container-based execution system is recommended.

## API Overview

The following are the main API routes documented for the project. Refer to the running FastAPI Swagger documentation for the actual registered endpoints and request schemas.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Authenticate a user |
| GET | `/api/auth/me` | Retrieve the authenticated user's profile |

### Questions

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/questions` | Submit a study question |
| GET | `/api/questions/history` | Retrieve question history |
| GET | `/api/questions/{id}` | Retrieve a specific question |
| DELETE | `/api/questions/{id}` | Delete a question |

### Study Tools

| Feature | Example route |
|---|---|
| Study notes | `/api/notes` |
| Quizzes | `/api/quizzes` |
| Flashcards | `/api/flashcards` |
| Doubt solver | `/api/doubts` |
| Roadmaps | `/api/roadmaps` |
| Coding practice | `/api/coding` |
| Interview preparation | `/api/interview` |
| Study planner | `/api/planner` |

These feature paths represent route groups; individual operations may use different HTTP methods and subpaths.

### Analytics and History

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard/stats` | Retrieve dashboard statistics |
| GET | `/api/history/all` | Retrieve supported learning activity history |
| GET | `/api/topics` | Retrieve available topics, if registered |

## Prerequisites

Install the following software before running the application:

- Python version compatible with `backend/requirements.txt`
- Node.js and npm
- MongoDB locally or a MongoDB Atlas account
- Java Development Kit (JDK), if using Java code execution
- Git

Check your installations:

```bash
python --version
node --version
npm --version
git --version
javac -version
java -version
```

The Java commands are required only if you intend to run Java programs.

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Lijashree/AI-STUDYMIND.git
cd AI-STUDYMIND
```

### 2. Configure the Backend

Open a terminal in the project root and run:

```bash
cd backend
python -m venv venv
```

On Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

On Linux or macOS:

```bash
source venv/bin/activate
```

Install the backend dependencies:

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a local `backend/.env` file using `backend/.env.example` as a reference.

Typical settings may include:

```dotenv
MONGO_URL=mongodb://localhost:27017
DB_NAME=studymind_db
JWT_SECRET=replace_with_a_unique_random_secret
JWT_ALGORITHM=HS256
JWT_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:3000
OPENROUTER_API_KEY=your_openrouter_api_key
AI_MODEL=your_configured_model_name
```

**Important:** These are example settings, not a guarantee of the exact variable names used by every project module. Check `backend/app/config.py`, the database configuration, and the AI service to confirm the required names and formats. For example, some configurations expect CORS origins as a JSON array rather than a single URL.

Use a unique, randomly generated JWT secret. Configure an OpenRouter API key only if you want to use AI features that require it.

Never commit your actual `.env` file, API keys, passwords, or production secrets to GitHub.

### 4. Start the Backend

From the `backend` directory, run the startup command supported by the project:

```bash
python server.py
```

If your project instead uses a standard ASGI application entry point, follow its configuration. For example, when `app.main:app` is the registered FastAPI application:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open the Swagger documentation:

http://localhost:8000/docs

If a health endpoint is registered, you can use it to check whether the backend is running. Verify its exact path in Swagger.

### 5. Configure the Frontend

Open a second terminal in the project root:

```bash
cd frontend
npm install
npm start
```

Open the application:

http://localhost:3000

If the frontend uses an API base URL environment variable, configure it using `frontend/.env.example` and the settings expected by the frontend source code.

## Testing

### Backend Test Suite

From the project root:

```bash
python backend/test_suite.py
```

This runs the project's backend verification script, provided its dependencies and required services are configured.

### Code Execution Tests

From the project root:

```bash
python test_executor.py
```

This checks the execution behavior covered by the standalone test script. Java-related tests require a working JDK.

### Frontend Production Build

From the frontend directory:

```bash
npm run build
```

A successful build verifies that the frontend can be compiled for production. It does not, by itself, prove that every feature or API integration works.

### Manual Testing Checklist

- [ ] Register a test user.
- [ ] Log in and verify authentication.
- [ ] Check that protected pages require authentication.
- [ ] Submit study questions and inspect related-question results.
- [ ] Check automatic topic classification.
- [ ] Generate and review study notes.
- [ ] Generate a quiz and submit answers.
- [ ] Use flashcards and roadmaps.
- [ ] Test the doubt solver if AI credentials are configured.
- [ ] Run Python code and, if a JDK is installed, Java code.
- [ ] Create and update study goals.
- [ ] Confirm that analytics changes after relevant activities.
- [ ] Review the learning history.

Feature availability depends on the backend configuration and external services.

## Troubleshooting

### Frontend Cannot Connect to the Backend

- Confirm that the backend is running.
- Check the frontend API base URL.
- Verify that CORS allows the frontend origin.
- Inspect the browser developer tools and backend logs.

### MongoDB Connection Errors

- Confirm that the local MongoDB service is running, or check your Atlas connection string.
- Verify database credentials and network access when using Atlas.
- Ensure the configured database name matches the intended database.

### AI Features Do Not Work

- Confirm that the relevant API key and model settings are configured.
- Check backend logs for authentication, network, rate-limit, or credit errors.
- Verify the external service's current model availability.

### Java Execution Fails

- Install a compatible JDK.
- Confirm that both `javac` and `java` are available through the system PATH.
- Restart the terminal after changing environment variables.

### Port Conflicts

If port 8000 or 3000 is already in use, stop the process using it or configure the application to use another available port.

## Environment and Repository Security

Before publishing or updating the repository:

- Keep `.env` files out of version control.
- Commit example environment files containing placeholders only.
- Exclude virtual environments, `node_modules`, build output, and cache files where appropriate.
- Never publish JWTs, API keys, passwords, or database credentials.
- Rotate credentials immediately if they have been exposed.
- Do not claim that subprocess-based code execution is fully sandboxed.

## Future Enhancements

- Multilingual question search
- Question bookmarking
- More personalized study recommendations
- Expanded performance analytics
- PDF study-note export
- Voice-based question input
- Improved isolation for code execution

## Project Information

**Project:** StudyMind AI  
**Author:** Lijashree B  
**GitHub:** https://github.com/Lijashree/AI-STUDYMIND  
**Portfolio:** https://lijashree.tech

StudyMind AI is an academic project exploring full-stack application development, semantic search, AI-assisted learning, personalized study workflows, and programming practice.
