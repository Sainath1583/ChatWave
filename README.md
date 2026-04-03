💬 ChatWave — A Real Time Chat App: 

      ChatWave is a full-stack chat application built with the MERN stack and Socket.io. It’s designed to feel fast, responsive, and intuitive—whether you're chatting one-on-one or inside a busy group channel.

      It handles the usual expectations (authentication, persistence, file sharing), but more importantly, it focuses on experience: real-time updates, presence, and subtle touches like typing indicators that make conversations feel natural.

***What You Can Do:

  Instead of a feature checklist, here’s how ChatWave behaves from a user’s point of view:

  1.You can sign up and log in securely, with passwords safely hashed and sessions handled via JWT.
  2.Messages appear instantly, without refreshing - thanks to WebSockets.
  3.You can create group channels or just have a quiet private conversation with someone.
  4.Sharing files is simple drop in an image or document and send.
  5.Conversations don’t disappear everything is saved and retrievable.
  6.You’ll see when someone is typing, and who’s online, so it feels like a real conversation not a delayed one.
  7.Older messages load smoothly when you scroll up, instead of overwhelming you all at once.


*** How It’s Built:

  At a high level:
    Frontend: React (with Vite for speed)
    Backend: Node.js + Express
    Realtime layer: Socket.io
    Database: MongoDB (via Mongoose)

    The frontend talks to the backend in two ways:
      REST APIs for things like login, rooms, and history
      WebSockets for live messaging and presence

    Everything is tied together with JWT-based authentication, so both HTTP and socket connections are secure.

*** Project Layout (in plain terms)

  The project is split cleanly into two halves:

    server/ — handles APIs, sockets, database, and uploads
    client/ — handles the UI, state, and user interactions

    If you’re exploring the code:
      Backend logic lives in routes, models, and a dedicated socket handler
      Frontend logic is broken into components, context providers, and API utilities

*** Before You Start

  Make sure you have:
    Node.js (v18+)
    MongoDB running locally
    npm (comes with Node)
    If those are in place, the rest is straightforward.

There are few steps:

  1. Install backend dependencies
    cd server
    npm install
  2. Set up environment variables 
    cp .env.example .env

    Then edit .env and change the JWT secret to something long and random.

  3. Install frontend dependencies

    Open a second terminal:
      cd client
      npm install
  4. Start everything

    Backend:
      cd server
      npm run dev

    Frontend:
      cd client
      npm run dev

    Then open: http://localhost:5173

If you want to see the real-time aspect, open two tabs and log in as different users.