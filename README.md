# Lingo Chat App

A real-time chatting webapp built with Next.js (frontend) and Node.js with Socket.IO (backend).

## Features

- **Real-time Messaging**: Instant message delivery using Socket.IO
- **User Authentication**: Simple username-based login (no passwords or database)
- **Online Users**: See who's currently online in real-time
- **One-to-One Chat**: Private conversations between users
- **Typing Indicators**: See when someone is typing
- **Real-time Translation**: AI-powered translation using Sarvam-Translate model
- **Multi-language Support**: Support for 22+ Indian languages
- **Virtual Keyboard**: On-screen keyboard for regional language input
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
- **Supabase** - PostgreSQL database with real-time features
- **CORS** - Cross-origin resource sharing

### Translation & AI
- **Sarvam-Translate** - AI-powered translation model for Indian languages
- **Python 3** - Translation service backend
- **Transformers** - Hugging Face transformers library
- **PyTorch** - Deep learning framework

## Project Structure

```
lingo/
├── server.js              # Backend server (Node.js + Express + Socket.IO + Supabase)
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (Supabase credentials)
├── next.config.js         # Next.js configuration
├── tailwind.config.js     # TailwindCSS configuration
├── postcss.config.js      # PostCSS configuration
├── requirements.txt       # Python dependencies for translation service
├── sarvam_translate.py    # Python script for Sarvam-Translate model
├── translationService.js  # Node.js translation service wrapper
├── test_final_translation.js # Translation testing script
├── components/
│   └── VirtualKeyboard.js # Virtual keyboard component for regional languages
├── styles/
│   ├── globals.css        # Global styles and TailwindCSS imports
│   └── virtual-keyboard.css # Virtual keyboard specific styles
├── pages/
│   ├── _app.js           # Main app component with routing logic
│   ├── _document.js      # HTML document structure
│   ├── index.js          # Login page
│   ├── users.js          # Online users list page
│   └── chat/
│       └── [id].js       # Individual chat page
├── DATABASE.md           # Database schema documentation
├── AGENTS.md             # AI agents documentation
├── SARVAM_TRANSLATE_SETUP.md # Translation setup guide
└── README.md             # This file
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Python 3.8 or higher (for translation service)
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lingo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies (for translation service)**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and service role key
   - Create a `.env` file with your credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   PORT=5000
   ```

5. **Set up the database**
   - Go to your Supabase dashboard → SQL Editor
   - Run the SQL commands from `DATABASE.md` to create the required tables

6. **Configure translation service (optional)**
   - By default, the app uses mock translations
   - To enable real Sarvam-Translate model, set `usePythonScript = true` in `translationService.js`
   - See `SARVAM_TRANSLATE_SETUP.md` for detailed setup instructions

7. **Start the development servers**
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

5. **Use Translation**: Select source and target languages to enable real-time translation

6. **Virtual Keyboard**: Use the on-screen keyboard for typing in regional languages

7. **Test Multi-User**: Open the app in multiple browser tabs with different usernames to test real-time messaging

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
- `translate_message` - Request message translation
- `set_language_preference` - Set user's language preference

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
- `translation_result` - Translation response
- `supported_languages` - List of supported languages

## Features in Detail

### Real-time Communication
- Messages are delivered instantly using Socket.IO
- Message persistence with Supabase PostgreSQL database
- Typing indicators show when someone is composing a message
- Chat history is automatically saved and retrieved

### Translation Features
- AI-powered translation using Sarvam-Translate model
- Support for 22+ Indian languages including Hindi, Tamil, Malayalam, Bengali, etc.
- Real-time translation of messages during chat
- Fallback to mock translation when AI model is not available
- Language preference settings per user

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
- Virtual keyboard for regional language input
- Language selection dropdowns
- Translation status indicators

## Future Enhancements

The codebase is designed to be modular for future integrations:

- **Enhanced Translation**: Integration with additional translation APIs (Bhashini, Google Translate)
- **Voice Messages**: Audio message recording and playback
- **File Sharing**: Image and document sharing capabilities
- **Group Chats**: Multi-user conversations with translation support
- **User Profiles**: Avatar and status updates
- **Message Encryption**: End-to-end encryption
- **Offline Support**: Message queuing when offline
- **Translation History**: Save and manage translation preferences

## Supported Languages

The translation service supports 22+ Indian languages:

- **English** (en-IN)
- **Hindi** (hi-IN)
- **Bengali** (bn-IN)
- **Tamil** (ta-IN)
- **Telugu** (te-IN)
- **Gujarati** (gu-IN)
- **Kannada** (kn-IN)
- **Malayalam** (ml-IN)
- **Marathi** (mr-IN)
- **Punjabi** (pa-IN)
- **Odia** (or-IN)
- **Assamese** (as-IN)
- **Bodo** (brx-IN)
- **Dogri** (doi-IN)
- **Kashmiri** (ks-IN)
- **Konkani** (gom-IN)
- **Maithili** (mai-IN)
- **Manipuri** (mni-IN)
- **Nepali** (ne-IN)
- **Sanskrit** (sa-IN)
- **Santali** (sat-IN)
- **Sindhi** (sd-IN)
- **Urdu** (ur-IN)

## Development

### Code Structure
- **Frontend**: React components with hooks for state management
- **Backend**: Event-driven architecture with Socket.IO
- **Styling**: Utility-first CSS with TailwindCSS
- **State Management**: Local state with React hooks

### Translation Service Integration
The translation service is already integrated and can be configured:

```javascript
// In translationService.js
const translationService = require('./translationService');

// Enable real Sarvam-Translate model
translationService.usePythonScript = true;

// Translate a message
const result = await translationService.translate(
  "Hello, how are you?", 
  "English", 
  "Hindi"
);
```

### Adding New Translation APIs
The backend is structured to easily add additional translation services:

```javascript
// Example: Add Google Translate integration
socket.on('private_message', async (data) => {
  const translatedMessage = await googleTranslate(data.message, targetLanguage);
  // Send translated message
});
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000 and 5000 are available
2. **Socket connection errors**: Check if backend server is running
3. **Username already taken**: Choose a different username
4. **Messages not sending**: Verify both users are online
5. **Translation not working**: Check if Python dependencies are installed and `usePythonScript = true` in `translationService.js`
6. **Python script errors**: Ensure Python 3.8+ is installed and `requirements.txt` dependencies are installed
7. **Virtual keyboard not showing**: Check if `VirtualKeyboard.js` component is properly imported

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
