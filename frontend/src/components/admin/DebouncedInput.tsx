import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  "aria-label": string;
  className?: string;
};

/**
 * A text field that pushes every change into the live store, but waits
 * for a pause in typing so we are not writing localStorage on each key.
 * It still accepts changes that arrive from elsewhere (an import, a
 * reset, another tab).
 */
export function DebouncedInput({ value, onCommit, placeholder, multiline, className, ...rest }: Props) {
  const [text, setText] = useState(value);
  const sent = useRef(value);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (value !== sent.current) {
      sent.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const change = (next: string) => {
    setText(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      sent.current = next;
      onCommit(next);
    }, 250);
  };

  const flush = () => {
    window.clearTimeout(timer.current);
    if (text !== sent.current) {
      sent.current = text;
      onCommit(text);
    }
  };

  const shared = {
    value: text,
    placeholder,
    className,
    onChange: (e: { target: { value: string } }) => change(e.target.value),
    onBlur: flush,
    "aria-label": rest["aria-label"]
  };

  return multiline ? <textarea {...shared} rows={3} /> : <input type="text" {...shared} />;
}
