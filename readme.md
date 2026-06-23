# Chat Server

Real-time chat backend with **two microservices** connected via HTTP and Socket.IO.

| Service      | Port | Tech                          | Database     |
|--------------|------|-------------------------------|--------------|
| User Service | 3001 | Express 5 + Passport + JWT    | PostgreSQL   |
| Chat Service | 3002 | Express 5 + Socket.IO + Redis | MongoDB      |

---

## Architecture

```
┌──────────────┐      HTTP      ┌──────────────┐
│  User Service │ ◄────────────► │  Chat Service │
│  (auth, users)│    REST        │  (messages,   │
│  Port 3001   │                │   conversations)│
└──────┬───────┘                │  Port 3002    │
       │                        └──────┬───────┘
       ▼                               ▼
┌──────────┐                   ┌──────────┐
│PostgreSQL│                   │ MongoDB  │
│ (users,  │                   │(messages,│
│  tokens) │                   │conversat.)│
└──────────┘                   └────┬─────┘
                                    │
                              ┌─────▼─────┐
                              │   Redis    │
                              │(Socket.IO  │
                              │  adapter)  │
                              └───────────┘
```

---

## User Service

### Database (PostgreSQL)

Auto-migrated on startup via `models/migrate.js`:

| Table                 | Purpose                         |
|-----------------------|---------------------------------|
| `users`               | id, email, name, password(bcrypt), avatar_url, bio, role, is_active, is_verified |
| `refresh_tokens`      | Refresh token storage, revocation, device tracking |
| `verification_tokens` | Email verification flow         |
| `password_reset_tokens`| Password reset flow             |
| `audit_logs`          | Security event log              |

### REST API

Base path: `/chat/user`

| Method | Endpoint            | Auth     | Description                     |
|--------|---------------------|----------|----------------------------------|
| POST   | `/signup`           | No       | Register with email + name + password |
| POST   | `/signin`           | No       | Login, returns accessToken + refreshToken cookie |
| POST   | `/refresh`          | Cookie   | Exchange refresh token for new access token |
| POST   | `/signout`          | Cookie   | Revoke refresh token             |
| POST   | `/changepassword`   | Bearer   | Change password (revokes all sessions) |
| GET    | `/me`               | Bearer   | Get current user profile         |
| GET    | `/allusers`         | Bearer   | Paginated user list with search (`?page=&limit=&search=`) |
| GET    | `/usersByIds`       | Bearer   | Get users by comma-separated IDs (`?ids=uuid1,uuid2`) |
| POST   | `/update`           | Bearer   | Update name, bio, avatar_url     |
| GET    | `/google`           | No       | Redirect to Google OAuth consent |
| GET    | `/google/callback`  | No       | OAuth callback → redirects to frontend with token |

#### Auth flow

1. Signup/login returns `accessToken` (1h JWT) in response body + `refreshToken` (30d JWT) in httpOnly cookie.
2. Every authenticated request sends `Authorization: Bearer <accessToken>`.
3. When accessToken expires, client calls `/refresh` with the cookie to get a new one.
4. Axios interceptor on the client handles automatic refresh + request queuing.

#### Google OAuth

1. Client redirects to `/chat/user/google`.
2. Passport sends user to Google, Google redirects to `/chat/user/google/callback`.
3. If user exists → login; if not → auto-create account with random password.
4. Redirects to `http://localhost:5100/chat?token=<accessToken>`.
5. Frontend reads `?token` param and stores it.

---

## Chat Service

### Database (MongoDB)

Collections:

| Collection     | Key fields                                               |
|----------------|----------------------------------------------------------|
| `conversations`| participants[{userId, role, lastReadMessageId}], lastMessage, isGroup, groupName |
| `messages`     | conversationId, senderId, clientMessageId (unique), content{text, attachments}, replyToMessageId, isDeleted |

### REST API

Conversations — base path: `/chat/conversations`

| Method | Endpoint                       | Auth   | Description                         |
|--------|--------------------------------|--------|-------------------------------------|
| POST   | `/`                            | Bearer | Create or get DM with targetUserId  |
| GET    | `/`                            | Bearer | List my conversations               |
| GET    | `/:conversationId`             | Bearer | Get single conversation             |
| PATCH  | `/:conversationId/read`        | Bearer | Mark read up to messageId           |

Messages — base path: `/chat/messages`

| Method | Endpoint                       | Auth   | Description                         |
|--------|--------------------------------|--------|-------------------------------------|
| POST   | `/:conversationId`             | Bearer | Send message (REST alternative)     |
| GET    | `/:conversationId`             | Bearer | Get messages (cursor via `?before=`)|
| DELETE | `/:messageId`                  | Bearer | Delete own message (soft delete)    |

Cursor pagination: `GET /chat/messages/:convId?limit=20&before=<messageId|clientMessageId>`

Admin — base path: `/chat/admin`

| Method | Endpoint         | Auth         | Description                  |
|--------|------------------|--------------|------------------------------|
| DELETE | `/clearalldata`  | Bearer+admin | Wipe all conversations + messages |

### Socket.IO

#### Authentication

Socket connection requires `auth.token` (JWT) in the handshake. Invalid/expired tokens are rejected in the `io.use()` middleware.

#### Rooms

| Room pattern   | Purpose                              |
|----------------|--------------------------------------|
| `{userId}`     | Direct user notifications            |
| `conv:{id}`    | Per-conversation message delivery    |

#### Events (Client → Server)

| Event              | Payload                                                      | Description                    |
|--------------------|--------------------------------------------------------------|--------------------------------|
| `join_conversation`| `conversationId`                                             | Join room (access checked)     |
| `leave_conversation`| `conversationId`                                            | Leave room                     |
| `send_message`     | `{ conversationId, text?, attachments?, replyToMessageId?, clientMessageId }` | Send message (expects ack) |
| `typing`           | `{ conversationId, isTyping }`                               | Typing indicator               |
| `mark_read`        | `{ conversationId, messageId }`                              | Mark read receipt              |
| `check_online`     | `targetUserId`                                               | Check online status (expects ack) |

#### Events (Server → Client)

| Event              | Payload                                   | Description                        |
|--------------------|-------------------------------------------|------------------------------------|
| `new_message`      | `message` object                          | New message in joined conversation |
| `messages_read`    | `{ conversationId, messageId, readByUserId }` | Read receipt notification    |
| `typing`           | `{ userId, conversationId, isTyping }`    | Remote user typing                 |
| `message_deleted`  | `{ messageId, conversationId }`           | Message removed                    |
| `user_online`      | `{ userId }`                              | User came online                   |
| `user_offline`     | `{ userId }`                              | User went offline (1s delay)       |
| `room_error`       | `{ message }`                             | Room join access denied            |

#### Message delivery flow

1. Client emits `send_message` with `clientMessageId` (UUID for dedup).
2. Server creates message in MongoDB, updates `conversation.lastMessage`.
3. Server emits `new_message` to **all** sockets in `conv:{id}` (including sender).
4. Sender's optimistic message is replaced/acknowledged; receivers append.
5. Duplicates are skipped by `clientMessageId` uniqueness check.

#### Online status

- On socket connect: user joins room `{userId}`, all **other** clients receive `user_online`.
- On socket disconnect: waits 1s, checks if any sockets remain in room `{userId}`. If none, broadcasts `user_offline`.
- `check_online` uses `io.in(userId).fetchSockets()`.

#### Redis adapter

The Socket.IO instance uses `@socket.io/redis-adapter` for multi-instance horizontal scaling. The `config/redis.js` file also exports dead-code helper functions (`setOnlineStatus`, `setOfflineStatus`, `isUserOnline`) that are not currently used.

---

## Project Structure

```
Chat-server/
├── docker-compose.yml        # Full stack: postgres, mongo, redis, userservice, chatservice
├── readme.md
│
├── userservice/              # User management (Express 5, PostgreSQL, Passport)
│   ├── index.js              # Entry point — creates Express app, runs migrations
│   ├── config/
│   │   ├── envVars.js        # Environment variable parsing + validation
│   │   ├── db.js             # pg Pool with connection pooling
│   │   └── cors.js           # CORS origin whitelist
│   ├── models/migrate.js     # Auto-create tables + indexes on startup
│   ├── routes/auth.routes.js # All REST + OAuth routes
│   ├── controllers/auth.controller.js  # Request handlers
│   ├── services/
│   │   ├── auth.service.js   # Business logic (signup, login, tokens, audit)
│   │   └── google_auth.js    # Passport Google OAuth strategy
│   ├── middleware/
│   │   ├── auth.middlewares.js    # JWT verify + role authorization
│   │   ├── Validate.middleware.js # express-validator rules
│   │   └── error.middleware.js    # Global error handler
│   └── utils/
│       ├── token.js          # JWT generation/verification
│       └── logger.js         # Pino logger with pino-pretty in dev
│
├── Chatservice/              # Chat & messaging (Express 5, MongoDB, Socket.IO)
│   ├── index.js              # Entry point — connects DB, starts HTTP + Socket.IO
│   ├── app.js                # Express app, routes, CORS, DNS config
│   ├── config/
│   │   ├── envVars.js        # Environment variables
│   │   ├── mongo.js          # Mongoose connection
│   │   └── redis.js          # Redis client + Socket.IO Redis adapter + dead helpers
│   ├── models/
│   │   ├── ConversationDb.js # Mongoose schema (participants, lastMessage)
│   │   └── MessageDb.js      # Mongoose schema (content, attachments, clientMessageId)
│   ├── routes/
│   │   ├── conversationRoutes.js
│   │   ├── messageRoutes.js
│   │   └── admin.routes.js
│   ├── controllers/
│   │   ├── conversationController.js
│   │   ├── messageController.js
│   │   └── admin.controller.js
│   ├── services/
│   │   ├── conversationService.js
│   │   └── messageService.js # Message CRUD, cursor pagination, dedup
│   ├── socket/
│   │   └── socketHandler.js  # All Socket.IO event handlers
│   └── middleware/
│       └── auth.js           # JWT auth + role guard middleware
```

---

## Running

### Docker (full stack)

```bash
docker compose up --build
```

Starts: PostgreSQL, MongoDB, Redis, User Service (3001), Chat Service (3002).

### Manual (development)

```bash
# User Service
cd userservice
cp .env.example .env   # configure
npm install
npm run dev

# Chat Service
cd Chatservice
cp .env.example .env   # configure
npm install
npm run dev
```

### Environment

See `Chat-server/userservice/.env` and `Chat-server/Chatservice/.env` for all configuration variables. Key settings:

| Variable       | Service      | Purpose                    |
|----------------|--------------|----------------------------|
| `JWT_SECRET`   | Chatservice  | Socket.IO auth JWT secret  |
| `ACCESS`       | userservice  | Access token signing key   |
| `REFRESH`      | userservice  | Refresh token signing key  |
| `MONGO_URI`    | Chatservice  | MongoDB connection string  |
| `REDIS_URL`    | Chatservice  | Redis connection string    |
| `PG_*`         | userservice  | PostgreSQL connection      |
| `GOOGLE_*`     | userservice  | Google OAuth credentials   |
