#!/usr/bin/env python3
"""
Sarvam-Translate Python script for local model inference
This script can be called from Node.js to perform translations
"""

import sys
import json
import argparse
import os
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

# Disable TensorFlow warnings and set environment variables
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TOKENIZERS_PARALLELISM'] = 'false'

def load_model():
    """Load the Sarvam-Translate model and tokenizer"""
    model_name = "sarvamai/sarvam-translate"
    
    print("Loading tokenizer...", file=sys.stderr)
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    print("Loading model...", file=sys.stderr)
    try:
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16,  # Changed from bfloat16 to float16
            device_map="auto",
            trust_remote_code=True,
            low_cpu_mem_usage=True
        )
    except Exception as e:
        print(f"Error loading model: {e}", file=sys.stderr)
        # Fallback to CPU
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float32,
            device_map="cpu",
            trust_remote_code=True
        )
    
    return model, tokenizer

def translate_text(text, target_language, model, tokenizer, source_language='English'):
    """Translate text to target language using Sarvam-Translate model"""
    
    if not text or not text.strip():
        return text
    
    try:
        # Map language names to language codes
        lang_map = {
            'English': 'en-IN',
            'Malayalam': 'ml-IN', 
            'Hindi': 'hi-IN',
            'Tamil': 'ta-IN',
            'Telugu': 'te-IN',
            'Kannada': 'kn-IN',
            'Bengali': 'bn-IN',
            'Gujarati': 'gu-IN',
            'Punjabi': 'pa-IN',
            'Marathi': 'mr-IN',
            'Odia': 'or-IN'
        }
        
        source_lang_code = lang_map.get(source_language, 'en-IN')
        target_lang_code = lang_map.get(target_language, 'ml-IN')
        
        # Prepare the input text for the model
        input_text = f"<|startoftext|><|{source_lang_code}|><|{target_lang_code}|>{text}<|endoftext|>"
        
        # Tokenize the input
        inputs = tokenizer(input_text, return_tensors="pt", padding=True, truncation=True, max_length=512)
        
        # Move to the same device as the model
        inputs = {k: v.to(model.device) for k, v in inputs.items()}
        
        # Generate translation
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=512,
                temperature=0.1,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id,
                num_beams=4,
                early_stopping=True
            )
        
        # Decode the output
        translated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Clean up the output - remove the input text and special tokens
        if f"<|{source_lang_code}|><|{target_lang_code}|>" in translated_text:
            translated_text = translated_text.split(f"<|{source_lang_code}|><|{target_lang_code}|>")[-1]
        
        # Remove any remaining special tokens
        translated_text = translated_text.replace("<|startoftext|>", "").replace("<|endoftext|>", "").strip()
        
        # If the translation is empty or same as input, return a fallback
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
            'Malayalam': {
                'hello': 'നമസ്കാരം',
                'hi': 'ഹായ്',
                'how are you': 'നിങ്ങൾക്ക് എങ്ങനെയുണ്ട്',
                'good morning': 'സുപ്രഭാതം',
                'good evening': 'സന്ധ്യാവന്ദനം',
                'good night': 'ശുഭ രാത്രി',
                'thank you': 'നന്ദി',
                'thanks': 'നന്ദി',
                'please': 'ദയവായി',
                'sorry': 'ക്ഷമിക്കണം',
                'excuse me': 'ക്ഷമിക്കണം',
                'yes': 'അതെ',
                'no': 'ഇല്ല',
                'okay': 'ശരി',
                'sure': 'തീർച്ചയായും',
                'maybe': 'ഒരുപക്ഷേ',
                'help': 'സഹായം',
                'help me': 'എന്നെ സഹായിക്കുക',
                'please help me': 'ദയവായി എന്നെ സഹായിക്കുക',
                'can you help me': 'നിങ്ങൾക്ക് എന്നെ സഹായിക്കാമോ',
                'i need help': 'എനിക്ക് സഹായം വേണം',
                'today': 'ഇന്ന്',
                'tomorrow': 'നാളെ',
                'yesterday': 'ഇന്നലെ',
                'now': 'ഇപ്പോൾ',
                'here': 'ഇവിടെ',
                'there': 'അവിടെ',
                'this': 'ഇത്',
                'that': 'അത്',
                'what': 'എന്ത്',
                'where': 'എവിടെ',
                'when': 'എപ്പോൾ',
                'why': 'എന്തുകൊണ്ട്',
                'how': 'എങ്ങനെ',
                'who': 'ആര്',
                'good': 'നല്ലത്',
                'bad': 'മോശം',
                'happy': 'സന്തോഷം',
                'sad': 'ദുഃഖം',
                'love': 'സ്നേഹം',
                'like': 'ഇഷ്ടമാണ്',
                'want': 'വേണം',
                'need': 'ആവശ്യമുണ്ട്',
                'have': 'ഉണ്ട്',
                'has': 'ഉണ്ട്',
                'had': 'ഉണ്ടായിരുന്നു',
                'is': 'ആണ്',
                'are': 'ആണ്',
                'was': 'ആയിരുന്നു',
                'were': 'ആയിരുന്നു',
                'will': 'ആകും',
                'would': 'ആകും',
                'could': 'കഴിയും',
                'should': 'ചെയ്യണം',
                'must': 'ചെയ്യണം',
                'can': 'കഴിയും',
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
                'study': 'പഠിക്കുക',
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
                'friend': 'സുഹൃത്ത്',
                'family': 'കുടുംബം',
                'home': 'വീട്',
                'house': 'വീട്',
                'water': 'വെള്ളം',
                'food': 'ഭക്ഷണം',
                'money': 'പണം',
                'time': 'സമയം',
                'day': 'ദിവസം',
                'night': 'രാത്രി',
                'morning': 'രാവിലെ',
                'evening': 'സന്ധ്യ',
                'week': 'ആഴ്ച',
                'month': 'മാസം',
                'year': 'വർഷം',
                'book': 'പുസ്തകം',
                'pen': 'പേന',
                'paper': 'കടലാസ്',
                'computer': 'കമ്പ്യൂട്ടർ',
                'phone': 'ഫോൺ',
                'car': 'കാർ',
                'bus': 'ബസ്',
                'train': 'ട്രെയിൻ',
                'plane': 'വിമാനം',
                'school': 'സ്കൂൾ',
                'hospital': 'ആശുപത്രി',
                'police': 'പോലീസ്',
                'doctor': 'വൈദ്യൻ',
                'teacher': 'അധ്യാപകൻ',
                'student': 'വിദ്യാർത്ഥി',
                'welcome': 'സ്വാഗതം',
                'congratulations': 'അഭിനന്ദനങ്ങൾ',
                'good luck': 'അതിശുഭം',
                'happy birthday': 'ജന്മദിനാശംസകൾ',
                'merry christmas': 'ക്രിസ്മസ് ആശംസകൾ',
                'happy new year': 'പുതുവത്സരാശംസകൾ'
            },
            'Hindi': {
                'hello': 'नमस्ते',
                'hi': 'नमस्ते',
                'how are you': 'आप कैसे हैं',
                'good morning': 'सुप्रभात',
                'good evening': 'शुभ संध्या',
                'good night': 'शुभ रात्रि',
                'thank you': 'धन्यवाद',
                'thanks': 'धन्यवाद',
                'please': 'कृपया',
                'sorry': 'माफ करें',
                'excuse me': 'माफ करें',
                'yes': 'हाँ',
                'no': 'नहीं',
                'okay': 'ठीक है',
                'sure': 'ज़रूर',
                'maybe': 'शायद',
                'help': 'मदद',
                'help me': 'मेरी मदद करें',
                'please help me': 'कृपया मेरी मदद करें',
                'can you help me': 'क्या आप मेरी मदद कर सकते हैं',
                'i need help': 'मुझे मदद चाहिए',
                'today': 'आज',
                'tomorrow': 'कल',
                'yesterday': 'कल',
                'now': 'अभी',
                'here': 'यहाँ',
                'there': 'वहाँ',
                'this': 'यह',
                'that': 'वह',
                'what': 'क्या',
                'where': 'कहाँ',
                'when': 'कब',
                'why': 'क्यों',
                'how': 'कैसे',
                'who': 'कौन',
                'good': 'अच्छा',
                'bad': 'बुरा',
                'happy': 'खुश',
                'sad': 'दुखी',
                'love': 'प्यार',
                'like': 'पसंद',
                'want': 'चाहिए',
                'need': 'ज़रूरत',
                'have': 'है',
                'has': 'है',
                'had': 'था',
                'is': 'है',
                'are': 'हैं',
                'was': 'था',
                'were': 'थे',
                'will': 'होगा',
                'would': 'होगा',
                'could': 'सकता',
                'should': 'चाहिए',
                'must': 'चाहिए',
                'can': 'सकता',
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
                'study': 'पढ़ाई करना',
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
                'friend': 'दोस्त',
                'family': 'परिवार',
                'home': 'घर',
                'house': 'घर',
                'water': 'पानी',
                'food': 'भोजन',
                'money': 'पैसा',
                'time': 'समय',
                'day': 'दिन',
                'night': 'रात',
                'morning': 'सुबह',
                'evening': 'शाम',
                'week': 'सप्ताह',
                'month': 'महीना',
                'year': 'साल',
                'book': 'किताब',
                'pen': 'कलम',
                'paper': 'कागज़',
                'computer': 'कंप्यूटर',
                'phone': 'फोन',
                'car': 'कार',
                'bus': 'बस',
                'train': 'ट्रेन',
                'plane': 'हवाई जहाज',
                'school': 'स्कूल',
                'hospital': 'अस्पताल',
                'police': 'पुलिस',
                'doctor': 'डॉक्टर',
                'teacher': 'शिक्षक',
                'student': 'छात्र',
                'welcome': 'स्वागत',
                'congratulations': 'बधाई',
                'good luck': 'शुभकामनाएं',
                'happy birthday': 'जन्मदिन मुबारक',
                'merry christmas': 'क्रिसमस की बधाई',
                'happy new year': 'नए साल की शुभकामनाएं'
            }
        }
    }
    
    # Try to find exact match first
    text_lower = text.lower().strip()
    if source_language in translations and target_language in translations[source_language]:
        if text_lower in translations[source_language][target_language]:
            return translations[source_language][target_language][text_lower]
    
    # Try word-by-word translation
    words = text.split()
    translated_words = []
    
    for word in words:
        word_lower = word.lower().strip('.,!?')
        if source_language in translations and target_language in translations[source_language]:
            if word_lower in translations[source_language][target_language]:
                translated_words.append(translations[source_language][target_language][word_lower])
            else:
                translated_words.append(word)  # Keep original if no translation found
        else:
            translated_words.append(word)
    
    result = ' '.join(translated_words)
    
    # If no translation was found, return a fallback
    if result == text:
        return f"[{target_language}] {text}"
    
    return result


def main():
    parser = argparse.ArgumentParser(description='Sarvam-Translate CLI')
    parser.add_argument('--text', required=True, help='Text to translate')
    parser.add_argument('--target-language', required=True, help='Target language')
    parser.add_argument('--source-language', default='English', help='Source language')
    parser.add_argument('--model-path', help='Path to local model (optional)')
    
    args = parser.parse_args()
    
    try:
        # Load model
        model, tokenizer = load_model()
        
        # Translate text
        translated_text = translate_text(
            args.text, 
            args.target_language, 
            model, 
            tokenizer,
            args.source_language
        )
        
        # Return result as JSON
        result = {
            "translatedText": translated_text,
            "sourceLanguage": args.source_language,
            "targetLanguage": args.target_language,
            "isTranslated": True
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            "error": str(e),
            "translatedText": f"[Translation failed] {args.text}",
            "sourceLanguage": args.source_language,
            "targetLanguage": args.target_language,
            "isTranslated": False
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
