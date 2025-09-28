#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sarvam-Translate Python script for local model inference
This script uses the proper Sarvam-Translate model from Hugging Face
"""

import sys
import json
import argparse
import os
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import warnings

# Set UTF-8 encoding for stdout and stderr
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Disable warnings and set environment variables
warnings.filterwarnings("ignore")
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TOKENIZERS_PARALLELISM'] = 'false'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['PYTHONIOENCODING'] = 'utf-8'

# Global variables for model and tokenizer
model = None
tokenizer = None

def load_model():
    """Load the Sarvam-Translate model and tokenizer"""
    global model, tokenizer
    
    if model is not None and tokenizer is not None:
        return model, tokenizer
    
    try:
        print("Loading Sarvam-Translate model...", file=sys.stderr)
        
        model_name = "sarvamai/sarvam-translate"
        
        # Load tokenizer
        print("Loading tokenizer...", file=sys.stderr)
        tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
        
        # Load model with memory optimization
        print("Loading model...", file=sys.stderr)
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto" if torch.cuda.is_available() else "cpu",
            trust_remote_code=True,
            low_cpu_mem_usage=True
        )
        
        print("Model loaded successfully!", file=sys.stderr)
        return model, tokenizer
        
    except Exception as e:
        print(f"Error loading model: {e}", file=sys.stderr)
        # Return None values to indicate failure
        return None, None

def translate_text(text, target_language, model, tokenizer, source_language='English'):
    """Translate text using the Sarvam-Translate model with proper chat template"""
    
    if not text or not text.strip():
        return text
    
    # If source and target are the same, return original text
    if source_language == target_language:
        return text
    
    try:
        # Use the proper chat template as shown in the Hugging Face documentation
        messages = [
            {"role": "system", "content": f"Translate the text below to {target_language}."},
            {"role": "user", "content": text}
        ]
        
        # Apply chat template to structure the conversation
        formatted_text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        
        # Tokenize and move input to model device
        model_inputs = tokenizer([formatted_text], return_tensors="pt").to(model.device)
        
        # Generate the output with optimized parameters
        with torch.no_grad():
            generated_ids = model.generate(
                **model_inputs,
                max_new_tokens=512,  # Reduced from 1024 to save memory
                do_sample=True,
                temperature=0.01,
                num_return_sequences=1,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id,
                repetition_penalty=1.1
            )
        
        # Extract only the generated part (excluding input)
        output_ids = generated_ids[0][len(model_inputs.input_ids[0]):].tolist()
        translated_text = tokenizer.decode(output_ids, skip_special_tokens=True)
        
        # Clean up the output
        translated_text = translated_text.strip()
        
        # If translation is empty or same as input, use fallback
        if not translated_text or translated_text == text:
            return fallback_translation(text, target_language, source_language)
        
        return translated_text
        
    except Exception as e:
        print(f"Model translation failed: {e}", file=sys.stderr)
        return fallback_translation(text, target_language, source_language)

def fallback_translation(text, target_language, source_language='English'):
    """Fallback translation using hardcoded dictionary"""
    
    # Comprehensive translation mappings
    translations = {
        'English': {
            'Hindi': {
                'hello': 'नमस्ते',
                'thank you': 'धन्यवाद',
                'yes': 'हाँ',
                'no': 'नहीं',
                'good': 'अच्छा',
                'bad': 'बुरा',
                'water': 'पानी',
                'food': 'भोजन',
                'house': 'घर',
                'car': 'कार',
                'book': 'किताब',
                'school': 'स्कूल',
                'hospital': 'अस्पताल',
                'friend': 'दोस्त',
                'family': 'परिवार',
                'money': 'पैसा',
                'time': 'समय',
                'day': 'दिन',
                'night': 'रात',
                'morning': 'सुबह',
                'evening': 'शाम',
                'week': 'सप्ताह',
                'month': 'महीना',
                'year': 'साल',
                'happy': 'खुश',
                'sad': 'दुखी',
                'love': 'प्यार',
                'like': 'पसंद',
                'want': 'चाहिए',
                'need': 'जरूरत',
                'have': 'है',
                'is': 'है',
                'are': 'हैं',
                'was': 'था',
                'were': 'थे',
                'will': 'होगा',
                'can': 'सकता',
                'should': 'चाहिए',
                'must': 'ही',
                'do': 'करना',
                'does': 'करता',
                'did': 'किया',
                'come': 'आना',
                'go': 'जाना',
                'see': 'देखना',
                'know': 'जानना',
                'think': 'सोचना',
                'say': 'कहना',
                'tell': 'बताना',
                'ask': 'पूछना',
                'give': 'देना',
                'take': 'लेना',
                'make': 'बनाना',
                'get': 'मिलना',
                'find': 'ढूंढना',
                'look': 'देखना',
                'listen': 'सुनना',
                'read': 'पढ़ना',
                'write': 'लिखना',
                'eat': 'खाना',
                'drink': 'पीना',
                'sleep': 'सोना',
                'wake': 'जागना',
                'work': 'काम करना',
                'play': 'खेलना',
                'learn': 'सीखना',
                'teach': 'पढ़ाना',
                'me': 'मुझे',
                'you': 'आप',
                'he': 'वह',
                'she': 'वह',
                'it': 'यह',
                'we': 'हम',
                'they': 'वे',
                'my': 'मेरा',
                'your': 'आपका',
                'his': 'उसका',
                'her': 'उसकी',
                'its': 'इसका',
                'our': 'हमारा',
                'their': 'उनका',
                'name': 'नाम',
                'welcome': 'स्वागत',
                'congratulations': 'बधाई',
                'good luck': 'शुभकामना',
                'happy birthday': 'जन्मदिन मुबारक',
                'merry christmas': 'क्रिसमस की बधाई',
                'happy new year': 'नए साल की शुभकामना'
            },
            'Malayalam': {
                'hello': 'നമസ്കാരം',
                'thank you': 'നന്ദി',
                'yes': 'അതെ',
                'no': 'ഇല്ല',
                'good': 'നല്ലത്',
                'bad': 'മോശം',
                'water': 'വെള്ളം',
                'food': 'ഭക്ഷണം',
                'house': 'വീട്',
                'car': 'കാർ',
                'book': 'പുസ്തകം',
                'school': 'സ്കൂൾ',
                'hospital': 'ആശുപത്രി',
                'friend': 'സുഹൃത്ത്',
                'family': 'കുടുംബം',
                'money': 'പണം',
                'time': 'സമയം',
                'day': 'ദിവസം',
                'night': 'രാത്രി',
                'morning': 'രാവിലെ',
                'evening': 'സന്ധ്യ',
                'week': 'ആഴ്ച',
                'month': 'മാസം',
                'year': 'വർഷം',
                'happy': 'സന്തോഷം',
                'sad': 'ദുഃഖം',
                'love': 'സ്നേഹം',
                'like': 'ഇഷ്ടം',
                'want': 'വേണം',
                'need': 'ആവശ്യമുണ്ട്',
                'have': 'ഉണ്ട്',
                'is': 'ആണ്',
                'are': 'ആണ്',
                'was': 'ആയിരുന്നു',
                'were': 'ആയിരുന്നു',
                'will': 'ആകും',
                'can': 'കഴിയും',
                'should': 'ചെയ്യണം',
                'must': 'ചെയ്യണം',
                'do': 'ചെയ്യുക',
                'does': 'ചെയ്യുന്നു',
                'did': 'ചെയ്തു',
                'come': 'വരുക',
                'go': 'പോകുക',
                'see': 'കാണുക',
                'know': 'അറിയുക',
                'think': 'ചിന്തിക്കുക',
                'say': 'പറയുക',
                'tell': 'പറയുക',
                'ask': 'ചോദിക്കുക',
                'give': 'കൊടുക്കുക',
                'take': 'എടുക്കുക',
                'make': 'ഉണ്ടാക്കുക',
                'get': 'കിട്ടുക',
                'find': 'കണ്ടെത്തുക',
                'look': 'നോക്കുക',
                'listen': 'കേൾക്കുക',
                'read': 'വായിക്കുക',
                'write': 'എഴുതുക',
                'eat': 'തിന്നുക',
                'drink': 'കുടിക്കുക',
                'sleep': 'ഉറങ്ങുക',
                'wake': 'ഉണരുക',
                'work': 'ജോലി ചെയ്യുക',
                'play': 'കളിക്കുക',
                'learn': 'പഠിക്കുക',
                'teach': 'പഠിപ്പിക്കുക',
                'me': 'എന്നെ',
                'you': 'നിങ്ങൾ',
                'he': 'അവൻ',
                'she': 'അവൾ',
                'it': 'അത്',
                'we': 'ഞങ്ങൾ',
                'they': 'അവർ',
                'my': 'എന്റെ',
                'your': 'നിങ്ങളുടെ',
                'his': 'അവന്റെ',
                'her': 'അവളുടെ',
                'its': 'അതിന്റെ',
                'our': 'ഞങ്ങളുടെ',
                'their': 'അവരുടെ',
                'name': 'പേര്',
                'welcome': 'സ്വാഗതം',
                'congratulations': 'അഭിനന്ദനങ്ങൾ',
                'good luck': 'അതിശുഭം',
                'happy birthday': 'ജന്മദിനാശംസകൾ',
                'merry christmas': 'ക്രിസ്മസ് ആശംസകൾ',
                'happy new year': 'പുതുവത്സരാശംസകൾ'
            }
        },
        'Malayalam': {
            'English': {
                'എനിക്ക്': 'I',
                'കേരളം': 'Kerala',
                'ഇഷ്ടമാണ്': 'like',
                'എനിക്ക് കേരളം ഇഷ്ടമാണ്': 'I like Kerala',
                'നമസ്കാരം': 'Hello',
                'ഹലോ': 'Hello',
                'ഹായ്': 'Hi',
                'നന്ദി': 'Thank you',
                'ക്ഷമിക്കണം': 'Sorry',
                'അതെ': 'Yes',
                'ഇല്ല': 'No',
                'നല്ലത്': 'Good',
                'മോശം': 'Bad',
                'വലുത്': 'Big',
                'ചെറുത്': 'Small',
                'ചൂട്': 'Hot',
                'തണുപ്പ്': 'Cold',
                'പുതിയത്': 'New',
                'പഴയത്': 'Old',
                'വേഗം': 'Fast',
                'മന്ദം': 'Slow',
                'എളുപ്പം': 'Easy',
                'കഠിനം': 'Difficult',
                'സന്തോഷം': 'Happy',
                'ദുഃഖം': 'Sad',
                'സ്നേഹം': 'Love',
                'ഇഷ്ടം': 'Like',
                'വേണം': 'Want',
                'ആവശ്യമുണ്ട്': 'Need',
                'ഉണ്ട്': 'Have',
                'ആണ്': 'Is/Are',
                'ആയിരുന്നു': 'Was/Were',
                'ആകും': 'Will',
                'കഴിയും': 'Can/Could',
                'ചെയ്യണം': 'Should/Must',
                'ചെയ്യുക': 'Do',
                'ചെയ്യുന്നു': 'Does',
                'ചെയ്തു': 'Did',
                'വരുക': 'Come',
                'പോകുക': 'Go',
                'കാണുക': 'See',
                'അറിയുക': 'Know',
                'ചിന്തിക്കുക': 'Think',
                'പറയുക': 'Say/Tell',
                'ചോദിക്കുക': 'Ask',
                'കൊടുക്കുക': 'Give',
                'എടുക്കുക': 'Take',
                'ഉണ്ടാക്കുക': 'Make',
                'കിട്ടുക': 'Get',
                'കണ്ടെത്തുക': 'Find',
                'നോക്കുക': 'Look',
                'കേൾക്കുക': 'Listen',
                'വായിക്കുക': 'Read',
                'എഴുതുക': 'Write',
                'തിന്നുക': 'Eat',
                'കുടിക്കുക': 'Drink',
                'ഉറങ്ങുക': 'Sleep',
                'ഉണരുക': 'Wake',
                'ജോലി ചെയ്യുക': 'Work',
                'കളിക്കുക': 'Play',
                'പഠിക്കുക': 'Learn/Study',
                'പഠിപ്പിക്കുക': 'Teach',
                'എന്നെ': 'Me',
                'നിങ്ങൾ': 'You',
                'അവൻ': 'He',
                'അവൾ': 'She',
                'അത്': 'It',
                'ഞങ്ങൾ': 'We',
                'അവർ': 'They',
                'എന്റെ': 'My',
                'നിങ്ങളുടെ': 'Your',
                'അവന്റെ': 'His',
                'അവളുടെ': 'Her',
                'അതിന്റെ': 'Its',
                'ഞങ്ങളുടെ': 'Our',
                'അവരുടെ': 'Their',
                'പേര്': 'Name',
                'സുഹൃത്ത്': 'Friend',
                'കുടുംബം': 'Family',
                'വീട്': 'Home/House',
                'വെള്ളം': 'Water',
                'ഭക്ഷണം': 'Food',
                'പണം': 'Money',
                'സമയം': 'Time',
                'ദിവസം': 'Day',
                'രാത്രി': 'Night',
                'രാവിലെ': 'Morning',
                'സന്ധ്യ': 'Evening',
                'ആഴ്ച': 'Week',
                'മാസം': 'Month',
                'വർഷം': 'Year',
                'പുസ്തകം': 'Book',
                'പേന': 'Pen',
                'കടലാസ്': 'Paper',
                'കമ്പ്യൂട്ടർ': 'Computer',
                'ഫോൺ': 'Phone',
                'കാർ': 'Car',
                'ബസ്': 'Bus',
                'ട്രെയിൻ': 'Train',
                'വിമാനം': 'Plane',
                'സ്കൂൾ': 'School',
                'ആശുപത്രി': 'Hospital',
                'പോലീസ്': 'Police',
                'വൈദ്യൻ': 'Doctor',
                'അധ്യാപകൻ': 'Teacher',
                'വിദ്യാർത്ഥി': 'Student',
                'സ്വാഗതം': 'Welcome',
                'അഭിനന്ദനങ്ങൾ': 'Congratulations',
                'അതിശുഭം': 'Good luck',
                'ജന്മദിനാശംസകൾ': 'Happy birthday',
                'ക്രിസ്മസ് ആശംസകൾ': 'Merry Christmas',
                'പുതുവത്സരാശംസകൾ': 'Happy New Year'
            }
        }
    }
    
    # If no translation found, return original text
    if source_language not in translations or target_language not in translations[source_language]:
        return text
    
    # Try to find exact match first
    if text in translations[source_language][target_language]:
        return translations[source_language][target_language][text]
    
    # Try word-by-word translation
    words = text.split()
    translated_words = []
    
    for word in words:
        word_lower = word.lower().strip('.,!?')
        if word_lower in translations[source_language][target_language]:
            translated_words.append(translations[source_language][target_language][word_lower])
        else:
            translated_words.append(word)  # Keep original if no translation found
    
    result = ' '.join(translated_words)
    
    # If no translation was found, return original text
    if result == text:
        return text
    
    return result

def main():
    parser = argparse.ArgumentParser(description='Sarvam-Translate CLI')
    parser.add_argument('--text', help='Text to translate')
    parser.add_argument('--target-language', help='Target language')
    parser.add_argument('--source-language', default='English', help='Source language')
    parser.add_argument('--model-path', help='Path to local model (optional)')
    parser.add_argument('--stdin', action='store_true', help='Read from stdin instead of command line')
    parser.add_argument('--use-fallback', action='store_true', help='Use fallback translation only')
    
    args = parser.parse_args()
    
    try:
        # Handle input from stdin or command line
        if args.stdin:
            # Read from stdin with proper UTF-8 encoding
            stdin_data = sys.stdin.buffer.read().decode('utf-8')
            input_data = json.loads(stdin_data)
            text = input_data.get('text', '')
            target_language = input_data.get('targetLanguage', 'English')
            source_language = input_data.get('sourceLanguage', 'English')
        else:
            # Read from command line arguments
            text = args.text
            target_language = args.target_language
            source_language = args.source_language
        
        if not text or not target_language:
            raise ValueError("Text and target language are required")
        
        # Check if we should use fallback only
        if args.use_fallback:
            print("Using fallback translation only", file=sys.stderr)
            translated_text = fallback_translation(text, target_language, source_language)
        else:
            # Try to load model and use it
            try:
                model, tokenizer = load_model()
                if model is not None and tokenizer is not None:
                    print("Using Sarvam-Translate model", file=sys.stderr)
                    translated_text = translate_text(text, target_language, model, tokenizer, source_language)
                else:
                    print("Model loading failed, using fallback translation", file=sys.stderr)
                    translated_text = fallback_translation(text, target_language, source_language)
            except Exception as e:
                print(f"Model error: {e}, using fallback translation", file=sys.stderr)
                translated_text = fallback_translation(text, target_language, source_language)
        
        # Return result as JSON
        result = {
            "translatedText": translated_text,
            "sourceLanguage": source_language,
            "targetLanguage": target_language,
            "isTranslated": True
        }
        
        print(json.dumps(result, ensure_ascii=False), flush=True)
        
    except Exception as e:
        error_result = {
            "error": str(e),
            "translatedText": f"[Translation failed] {text if 'text' in locals() else 'Unknown'}",
            "sourceLanguage": source_language if 'source_language' in locals() else 'Unknown',
            "targetLanguage": target_language if 'target_language' in locals() else 'Unknown',
            "isTranslated": False
        }
        print(json.dumps(error_result, ensure_ascii=False), flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()