const io = require('socket.io-client');

console.log('🧪 Testing final translation with database storage...\n');

const user1 = io('http://localhost:5000');
const user2 = io('http://localhost:5000');

let bothReady = false;

user1.on('connect', () => {
  console.log('✅ User1 connected');
  user1.emit('user_login', { username: 'finaltest1', preferredLanguage: 'English' });
});

user2.on('connect', () => {
  console.log('✅ User2 connected');
  user2.emit('user_login', { username: 'finaltest2', preferredLanguage: 'Hindi' });
});

user1.on('login_success', (username) => {
  console.log(`✅ User1 (${username}) logged in successfully`);
  checkBothReady();
});

user2.on('login_success', (username) => {
  console.log(`✅ User2 (${username}) logged in successfully`);
  checkBothReady();
});

function checkBothReady() {
  if (!bothReady) {
    bothReady = true;
    console.log('🎯 Both users ready! Testing final translation in 2 seconds...');
    setTimeout(() => {
      console.log('📤 Sending message from User1 (English) to User2 (Hindi)...');
      user1.emit('private_message', {
        to: 'finaltest2',
        from: 'finaltest1',
        message: 'Final test message with database storage!'
      });
    }, 2000);
  }
}

user1.on('message_sent', (data) => {
  console.log(`📤 User1 sent confirmation:`, data);
});

user2.on('private_message', (data) => {
  console.log(`📥 User2 received message:`, data);
  
  if (data.isTranslated) {
    console.log('✅ Translation working!');
    console.log(`   Original: "${data.originalMessage}"`);
    console.log(`   Translated: "${data.message}"`);
    console.log(`   Languages: ${data.originalLanguage} -> ${data.translatedLanguage}`);
  } else {
    console.log('❌ Translation not working');
  }
  
  // Wait a bit for database update, then check chat history
  setTimeout(() => {
    console.log('\n🔄 Checking chat history to see if translation data was stored...');
    user2.emit('fetch_history', { with: 'finaltest1' });
  }, 1000);
});

user2.on('chat_history', (data) => {
  console.log('\n📚 Chat history received:');
  data.messages.forEach((msg, index) => {
    console.log(`Message ${index + 1}:`);
    console.log(`   Content: "${msg.message}"`);
    console.log(`   Original: "${msg.originalMessage}"`);
    console.log(`   Is Translated: ${msg.isTranslated}`);
    console.log(`   Original Language: ${msg.originalLanguage}`);
    console.log(`   Translated Language: ${msg.translatedLanguage}`);
  });
  
  if (data.messages.some(msg => msg.isTranslated)) {
    console.log('\n🎉 SUCCESS! Translation data is being stored in database!');
  } else {
    console.log('\n❌ FAILED! Translation data not stored in database.');
  }
  
  setTimeout(() => {
    user1.disconnect();
    user2.disconnect();
    process.exit(0);
  }, 1000);
});

user1.on('connect_error', (error) => console.error('User1 error:', error));
user2.on('connect_error', (error) => console.error('User2 error:', error));

