import { useCallback, useEffect, useRef, useState } from "react";

type UseSpeechInputOptions = {
  onResult: (text: string) => void;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onend: (() => void) | null;
  onerror: ((event: unknown) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<{ [key: number]: { transcript: string } }>;
};

type SpeechRecognitionConstructor = {
  new (): SpeechRecognitionLike;
};

type SpeechWindow = typeof window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function useSpeechInput({ onResult }: UseSpeechInputOptions) {
  const [isSupported, setIsSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const speechWindow = window as SpeechWindow;
    const SpeechRecognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "uk-UA";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript;
      if (text) {
        onResult(text);
      }
    };
    recognition.onend = () => {
      setIsRecording(false);
    };
    recognition.onerror = () => {
      setIsRecording(false);
    };
    recognitionRef.current = recognition;
    setIsSupported(true);

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      try {
        recognition.stop();
      } catch {
        // ignore stop errors on cleanup
      }
      recognitionRef.current = null;
    };
  }, [onResult]);

  const start = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      return;
    }
    try {
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Speech recognition failed to start", error);
      setIsRecording(false);
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }
    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error("Speech recognition failed to stop", error);
    }
    setIsRecording(false);
  }, []);

  return {
    isSupported,
    isRecording,
    start,
    stop
  };
}
