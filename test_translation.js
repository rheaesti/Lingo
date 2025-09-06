async function testTranslation() {
  try {
    console.log('Testing translation endpoint...');
    const response = await fetch('http://localhost:5000/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'hi good morning',
        sourceLanguage: 'English',
        targetLanguage: 'Malayalam'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    const result = await response.json();
    console.log('Translation result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

testTranslation();
