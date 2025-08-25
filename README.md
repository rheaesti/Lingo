# Sincha Chat App

A real-time chatting webapp built with Next.js (frontend) and Node.js with Socket.IO (backend).

## Features

- **Real-time Messaging**: Instant message delivery using Socket.IO
- **User Authentication**: Simple username-based login (no passwords or database)
- **Online Users**: See who's currently online in real-time
- **One-to-One Chat**: Private conversations between users
- **Typing Indicators**: See when someone is typing
- **Modern UI**: Clean, WhatsApp-like interface built with TailwindCSS
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Frontend
- **Next.js 14** - React framework
- **TailwindCSS** - Utility-first CSS framework
- **Socket.IO Client** - Real-time communication

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.IO** - Real-time bidirectional communication
- **CORS** - Cross-origin resource sharing

## Project Structure

```
sincha/
├── server.js              # Backend server (Node.js + Express + Socket.IO)
├── package.json           # Dependencies and scripts
├── next.config.js         # Next.js configuration
├── tailwind.config.js     # TailwindCSS configuration
├── postcss.config.js      # PostCSS configuration
├── styles/
│   └── globals.css        # Global styles and TailwindCSS imports
├── pages/
│   ├── _app.js           # Main app component with routing logic
│   ├── _document.js      # HTML document structure
│   ├── index.js          # Login page
│   ├── users.js          # Online users list page
│   └── chat/
│       └── [id].js       # Individual chat page
└── README.md             # This file
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sincha
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start both:
   - Backend server on `http://localhost:5000`
   - Frontend (Next.js) on `http://localhost:3000`

### Alternative: Run servers separately

- **Backend only**: `npm run server`
- **Frontend only**: `npm run client`

## Usage

1. **Open your browser** and navigate to `http://localhost:3000`

2. **Login**: Enter a username (minimum 3 characters) and click "Start Chatting"

3. **View Online Users**: You'll be redirected to the users page showing all online users

4. **Start Chatting**: Click on any user to start a private conversation

5. **Test Multi-User**: Open the app in multiple browser tabs with different usernames to test real-time messaging

## API Endpoints

### Backend Server (`http://localhost:5000`)

- `GET /health` - Server health check
- WebSocket connection for real-time communication

### Socket.IO Events

#### Client to Server
- `user_login` - User login with username
- `private_message` - Send private message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator

#### Server to Client
- `login_success` - Login successful
- `login_error` - Login failed
- `users_list_update` - Updated list of online users
- `user_joined` - New user joined
- `user_left` - User left
- `private_message` - Receive private message
- `message_sent` - Message sent confirmation
- `typing_start` - User started typing
- `typing_stop` - User stopped typing

## Features in Detail

### Real-time Communication
- Messages are delivered instantly using Socket.IO
- No message persistence (messages are lost on page refresh)
- Typing indicators show when someone is composing a message

### User Management
- Usernames must be unique across all connected users
- Automatic disconnection handling when users close tabs
- Real-time updates when users join/leave

### UI/UX Features
- Clean, modern interface inspired by WhatsApp Web
- Responsive design for mobile and desktop
- Smooth animations and transitions
- Loading states and error handling
- Auto-scroll to latest messages

## Future Enhancements

The codebase is designed to be modular for future integrations:

- **Translation APIs**: Ready for Bhashini/Gemini integration
- **Message Persistence**: Database integration for message storage
- **File Sharing**: Image and document sharing capabilities
- **Group Chats**: Multi-user conversations
- **User Profiles**: Avatar and status updates
- **Message Encryption**: End-to-end encryption

## Development

### Code Structure
- **Frontend**: React components with hooks for state management
- **Backend**: Event-driven architecture with Socket.IO
- **Styling**: Utility-first CSS with TailwindCSS
- **State Management**: Local state with React hooks

### Adding Translation Middleware
The backend is structured to easily add translation middleware:

```javascript
// Example: Add translation before sending messages
socket.on('private_message', (data) => {
  // Add translation logic here
  const translatedMessage = await translateMessage(data.message, targetLanguage);
  
  // Send translated message
  // ... existing code
});
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000 and 5000 are available
2. **Socket connection errors**: Check if backend server is running
3. **Username already taken**: Choose a different username
4. **Messages not sending**: Verify both users are online

### Debug Mode
Enable debug logging by setting environment variables:
```bash
DEBUG=socket.io:* npm run dev
```

## License

This project is open source and available under the [MIT License](LICENSE).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions, please open an issue on the repository.
