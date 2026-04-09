# 💬 Chat Server

A real-time chat backend supporting **one-to-one** and **group messaging** via WebSockets, with full user management over REST.

---

## 📡 API Reference

### 👤 User Service

Base URL: `/v1/user`

| Method | Endpoint    | Payload                                                    | Description          |
|--------|-------------|------------------------------------------------------------|----------------------|
| `POST` | `/register` | `userName`, `email/phone`, `password`, `dob`, `profile_pic` | Register a new user  |
| `POST` | `/signin`   | `email/phone`, `password`                                  | Sign in              |
| `POST` | `/signout`  | `email/phone`, `password`                                  | Sign out             |
| `POST` | `/update`   | `userName`, `email/phone`, `password`, `dob`, `profile_pic` | Update user profile  |
| `POST` | `/delete`   | `email/phone`, `password`                                  | Delete user account  |

---

### 💬 One-to-One Chat

Base URL: `/v1`

| Method | Endpoint          | Payload                            | Description                        |
|--------|-------------------|------------------------------------|------------------------------------|
| `WS`   | `/message/send`   | `senderId`, `receiverId`, `message` | Send a direct message via WebSocket |
| `GET`  | `/chat/getall`    | `userId`                           | Get all chats for a user           |
| `GET`  | `/message/get`    | `userId`, `receiverId`              | Get messages between two users     |

---

### 👥 Group Chat

Base URL: `/v1/group`

| Method | Endpoint         | Payload                                                 | Description                   |
|--------|------------------|---------------------------------------------------------|-------------------------------|
| `POST` | `/create`        | `groupName`, `groupDescription`, `groupImage`, `groupAdminId` | Create a new group      |
| `POST` | `/addmember`     | `groupId`, `userId`                                     | Add a member to a group       |
| `POST` | `/removemember`  | `groupId`, `userId`                                     | Remove a member from a group  |
| `POST` | `/update`        | `groupId`, `groupName`, `groupDescription`, `groupImage` | Update group details          |
| `POST` | `/delete`        | `groupId`                                               | Delete a group                |
| `WS`   | `/sendmessage`   | `groupId`, `senderId`, `message`                        | Send a message to a group     |
| `GET`  | `/getall`        | `userId`                                                | Get all groups for a user     |
| `GET`  | `/get`           | `groupId`                                               | Get group details             |
| `GET`  | `/getmembers`    | `groupId`                                               | Get all members of a group    |
| `GET`  | `/getmessages`   | `groupId`                                               | Get all messages in a group   |

---

## 🏗️ Project Structure

```
Chat-server/
├── chat/               # WebSocket gateway / chat handler
├── userservice/        # User registration, auth & management
├── messageService/     # One-to-one message storage & retrieval
├── groupChat/          # Group chat logic & management
├── docker-compose.yml  # Multi-service container orchestration
└── readme.md
```

---

## 🐳 Running with Docker

```bash
docker compose up --build
```

| Service      | Container   | Port    | Description              |
|--------------|-------------|---------|--------------------------|
| `mongo1`     | `UserDB`    | `30001` | MongoDB for user data     |
| `mongo2`     | `MessageDB` | `30002` | MongoDB for messages      |
| `userservice`| `userservice`| `3001` | User management service   |

---

## 🔌 WebSocket Protocol

Connect to the WebSocket endpoint and send JSON payloads:

```json
// Direct Message
{ "senderId": "abc123", "receiverId": "xyz456", "message": "Hello!" }

// Group Message
{ "groupId": "grp789", "senderId": "abc123", "message": "Hey team!" }
```
