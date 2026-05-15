import Tts from 'react-native-tts';
import { Platform } from 'react-native';

class TTSService {
  private initialized: boolean = false;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      if (Platform.OS === 'android') {
        await Tts.getInitStatus();
      }
      this.initialized = true;
      Tts.setDefaultRate(0.5); // Slower for better understanding
      Tts.setDefaultPitch(1.0);
    } catch (err) {
      if ((err as any).code === 'no_engine') {
        Tts.requestInstallEngine();
      } else {
        console.error('TTS Init error:', err);
      }
    }
  }

  public stop() {
    if (this.initialized) {
      Tts.stop();
    }
  }

  private async translateText(text: string, targetLangCode: string): Promise<string> {
    try {
      // Map TTS lang codes to Google Translate lang codes
      let tl = 'en';
      if (targetLangCode === 'hi-IN') tl = 'hi';
      else if (targetLangCode === 'gu-IN') tl = 'gu';
      else return text; // Don't translate if target is english or unknown

      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      // The API returns an array where the first element is an array of translated sentences
      if (data && data[0] && data[0].length > 0) {
        let translated = '';
        for (let i = 0; i < data[0].length; i++) {
          if (data[0][i][0]) {
            translated += data[0][i][0];
          }
        }
        return translated;
      }
      return text;
    } catch (error) {
      console.error('Translation failed:', error);
      return text; // Fallback to original text
    }
  }

  public async speak(text: string, language: 'hi-IN' | 'gu-IN' | 'en-US') {
    if (!this.initialized) {
      console.warn('TTS is not initialized yet');
      return;
    }

    try {
      this.stop(); // Stop any ongoing speech
      
      // Translate the text if we are trying to speak in Hindi or Gujarati
      const translatedText = await this.translateText(text, language);
      console.log(`[TTS] Original: "${text}" | Translated (${language}): "${translatedText}"`);
      
      await Tts.setDefaultLanguage(language);
      Tts.speak(translatedText);
    } catch (error) {
      console.error(`Failed to speak in ${language}:`, error);
      // Fallback to english if hindi/gujarati fails
      try {
        await Tts.setDefaultLanguage('en-US');
        Tts.speak(text);
      } catch (fallbackError) {
        console.error('TTS Fallback failed:', fallbackError);
      }
    }
  }
}

export const ttsService = new TTSService();
