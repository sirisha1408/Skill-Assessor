import { useState, useCallback, useRef } from 'react';

export function useSSE() {
  const [text, setText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const sourceRef = useRef(null);

  const startStream = useCallback((url) => {
    return new Promise((resolve, reject) => {
      setText('');
      setIsStreaming(true);
      setMetadata(null);
      let accumulated = '';

      const source = new EventSource(url);
      sourceRef.current = source;

      source.addEventListener('chunk', (e) => {
        const data = JSON.parse(e.data);
        accumulated += data.text;
        setText(accumulated);
      });

      source.addEventListener('done', (e) => {
        const data = JSON.parse(e.data);
        setMetadata(data);
        setIsStreaming(false);
        source.close();
        sourceRef.current = null;
        resolve({ text: accumulated, metadata: data });
      });

      source.onerror = () => {
        setIsStreaming(false);
        source.close();
        sourceRef.current = null;
        reject(new Error('Stream connection failed'));
      };
    });
  }, []);

  const stopStream = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  return { text, isStreaming, metadata, startStream, stopStream };
}
