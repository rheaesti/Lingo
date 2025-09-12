#!/usr/bin/env python3
"""
Sarvam-Translate Python script for local model inference
This script can be called from Node.js to perform translations
"""

import sys
import json
import argparse
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

def load_model():
    """Load the Sarvam-Translate model and tokenizer"""
    model_name = "sarvamai/sarvam-translate"
    
    print("Loading tokenizer...", file=sys.stderr)
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    print("Loading model...", file=sys.stderr)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.bfloat16,
        device_map="auto"
    )
    
    return model, tokenizer

def translate_text(text, target_language, model, tokenizer):
    """Translate text to target language using Sarvam-Translate"""
    
    # Create the prompt for Sarvam-Translate
    messages = [
        {"role": "system", "content": f"Translate the text below to {target_language}."},
        {"role": "user", "content": text}
    ]
    
    # Apply chat template
    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )
    
    # Tokenize input
    model_inputs = tokenizer([prompt], return_tensors="pt").to(model.device)
    
    # Generate translation
    with torch.no_grad():
        generated_ids = model.generate(
            **model_inputs,
            max_new_tokens=1024,
            do_sample=True,
            temperature=0.01,
            num_return_sequences=1,
            pad_token_id=tokenizer.eos_token_id
        )
    
    # Decode output
    output_ids = generated_ids[0][len(model_inputs.input_ids[0]):].tolist()
    translated_text = tokenizer.decode(output_ids, skip_special_tokens=True)
    
    return translated_text

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
            tokenizer
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
