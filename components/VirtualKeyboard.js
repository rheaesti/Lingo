import { useState, useEffect, useRef } from 'react';
import Keyboard from 'simple-keyboard';
import 'simple-keyboard/build/css/index.css';

const VirtualKeyboard = ({ 
  language = 'English', 
  onKeyPress, 
  onInputChange, 
  inputRef,
  isVisible = false,
  onToggle 
}) => {
  const keyboardRef = useRef(null);
  const [keyboard, setKeyboard] = useState(null);
  const [input, setInput] = useState('');

  // Language-specific keyboard layouts
  const getKeyboardLayout = (lang) => {
    const layouts = {
      'English': {
        default: [
          '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
          '{tab} q w e r t y u i o p [ ] \\',
          '{lock} a s d f g h j k l ; \' {enter}',
          '{shift} z x c v b n m , . / {shift}',
          '.com @ {space}'
        ]
      },
      'Hindi': {
        default: [
          '१ २ ३ ४ ५ ६ ७ ८ ९ ० - = {bksp}',
          '{tab} ौ ै ा ि ी ू ब ह ग द ज ड ़ ढ {enter}',
          '{lock} ो े ् ि ु प र क त च ट य श ष {enter}',
          '{shift} ॉ ॅ ा ि ु स न म व ल , . / {shift}',
          '.com @ {space}'
        ]
      },
      'Malayalam': {
        default: [
          '൧ ൨ ൩ ൪ ൫ ൬ ൭ ൮ ൯ ൦ - = {bksp}',
          '{tab} ൌ ാ ി ീ ു ൂ ബ ഹ ഗ ദ ജ ഡ ഢ ണ {enter}',
          '{lock} ോ േ ് ി ു പ ര ക ത ച ട യ ശ ഷ {enter}',
          '{shift} ോ ാ ി ു സ ന മ വ ല , . / {shift}',
          '.com @ {space}'
        ]
      },
      'Tamil': {
        default: [
          '௧ ௨ ௩ ௪ ௫ ௬ ௭ ௮ ௯ ௦ - = {bksp}',
          '{tab} ோ ே ் ி ீ ு ூ ப ஹ க த ஜ ட ண {enter}',
          '{lock} ோ ே ் ி ு ப ர க த ச ட ய ஶ ஷ {enter}',
          '{shift} ோ ா ி ு ச ந ம வ ல , . / {shift}',
          '.com @ {space}'
        ]
      },
      'Bengali': {
        default: [
          '১ ২ ৩ ৪ ৫ ৬ ৭ ৮ ৯ ০ - = {bksp}',
          '{tab} ৌ ৈ া ি ী ূ ব হ গ দ জ ড ঢ ণ {enter}',
          '{lock} ো ে ্ ি ু প র ক ত চ ট য শ ষ {enter}',
          '{shift} ো া ি ু স ন ম ব ল , . / {shift}',
          '.com @ {space}'
        ]
      },
      'Gujarati': {
        default: [
          '૧ ૨ ૩ ૪ ૫ ૬ ૭ ૮ ૯ ૦ - = {bksp}',
          '{tab} ૌ ૈ ા િ ી ૂ બ હ ગ દ જ ડ ઢ ણ {enter}',
          '{lock} ો ે ્ િ ુ પ ર ક ત ચ ટ ય શ ષ {enter}',
          '{shift} ો ા િ ુ સ ન મ વ લ , . / {shift}',
          '.com @ {space}'
        ]
      },
      'Telugu': {
        default: [
          '౧ ౨ ౩ ౪ ౫ ౬ ౭ ౮ ౯ ౦ - = {bksp}',
          '{tab} ౌ ై ా ి ీ ు ూ బ హ గ ద జ డ ఢ ణ {enter}',
          '{lock} ో ే ్ ి ు ప ర క త చ ట య శ ష {enter}',
          '{shift} ో ా ి ు స న మ వ ల , . / {shift}',
          '.com @ {space}'
        ]
      },
      'Kannada': {
        default: [
          '೧ ೨ ೩ ೪ ೫ ೬ ೭ ೮ ೯ ೦ - = {bksp}',
          '{tab} ೌ ೈ ಾ ಿ ೀ ು ೂ ಬ ಹ ಗ ದ ಜ ಡ ಢ ಣ {enter}',
          '{lock} ೋ ೇ ್ ಿ ು ಪ ರ ಕ ತ ಚ ಟ ಯ ಶ ಷ {enter}',
          '{shift} ೋ ಾ ಿ ು ಸ ನ ಮ ವ ಲ , . / {shift}',
          '.com @ {space}'
        ]
      },
      'Punjabi': {
        default: [
          '੧ ੨ ੩ ੪ ੫ ੬ ੭ ੮ ੯ ੦ - = {bksp}',
          '{tab} ੌ ੈ ਾ ਿ ੀ ੂ ਬ ਹ ਗ ਦ ਜ ਡ ਢ ਣ {enter}',
          '{lock} ੋ ੇ ੍ ਿ ੁ ਪ ਰ ਕ ਤ ਚ ਟ ਯ ਸ਼ ਷ {enter}',
          '{shift} ੋ ਾ ਿ ੁ ਸ ਨ ਮ ਵ ਲ , . / {shift}',
          '.com @ {space}'
        ]
      },
      'Marathi': {
        default: [
          '१ २ ३ ४ ५ ६ ७ ८ ९ ० - = {bksp}',
          '{tab} ौ ै ा ि ी ू ब ह ग द ज ड ढ ण {enter}',
          '{lock} ो े ् ि ु प र क त च ट य श ष {enter}',
          '{shift} ो ा ि ु स न म व ल , . / {shift}',
          '.com @ {space}'
        ]
      },
      'Odia': {
        default: [
          '୧ ୨ ୩ ୪ ୫ ୬ ୭ ୮ ୯ ୦ - = {bksp}',
          '{tab} ୌ ୈ ା ି ୀ ୁ ୂ ବ ହ ଗ ଦ ଜ ଡ ଢ ଣ {enter}',
          '{lock} ୋ େ ୍ ି ୁ ପ ର କ ତ ଚ ଟ ଯ ଶ ଷ {enter}',
          '{shift} ୋ ା ି ୁ ସ ନ ମ ଵ ଲ , . / {shift}',
          '.com @ {space}'
        ]
      }
    };
    
    return layouts[lang] || layouts['English'];
  };

  useEffect(() => {
    if (keyboardRef.current && isVisible) {
      // Destroy existing keyboard if it exists
      if (keyboard) {
        keyboard.destroy();
        setKeyboard(null);
      }
      
      // Create new keyboard
      const newKeyboard = new Keyboard(keyboardRef.current, {
        layout: getKeyboardLayout(language),
        onChange: (input) => {
          setInput(input);
          if (onInputChange) {
            onInputChange(input);
          }
          if (inputRef && inputRef.current) {
            inputRef.current.value = input;
          }
        },
        onKeyPress: (button) => {
          if (onKeyPress) {
            onKeyPress(button);
          }
        },
        theme: 'hg-theme-default hg-theme-ios',
        physicalKeyboardHighlight: true,
        syncInstanceInputs: true,
        mergeDisplay: true,
        display: {
          '{bksp}': '⌫',
          '{enter}': '↵',
          '{shift}': '⇧',
          '{lock}': '⇪',
          '{tab}': '⇥',
          '{space}': '⎵'
        }
      });
      
      setKeyboard(newKeyboard);
      
      // Force dark mode styles if needed
      setTimeout(() => {
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDarkMode) {
          const buttons = keyboardRef.current.querySelectorAll('.hg-button');
          buttons.forEach(button => {
            button.style.color = '#ffffff';
            button.style.backgroundColor = '#374151';
            button.style.borderColor = '#4b5563';
          });
        }
      }, 100);
    }
    
    // Cleanup function
    return () => {
      if (keyboard) {
        keyboard.destroy();
        setKeyboard(null);
      }
    };
  }, [isVisible, language, onKeyPress, onInputChange, inputRef]);

  useEffect(() => {
    if (keyboard) {
      keyboard.setOptions({
        layout: getKeyboardLayout(language)
      });
    }
  }, [language, keyboard]);

  useEffect(() => {
    if (keyboard && inputRef && inputRef.current) {
      const currentValue = inputRef.current.value;
      if (currentValue !== input) {
        setInput(currentValue);
        keyboard.setInput(currentValue);
      }
    }
  }, [keyboard, inputRef]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 max-h-80 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-gray-700">
            Virtual Keyboard - {language}
          </h3>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="keyboard-container">
          <div 
            ref={keyboardRef} 
            className="simple-keyboard" 
            data-language={language}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default VirtualKeyboard;
