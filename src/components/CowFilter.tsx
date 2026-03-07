import React, { useState, useEffect, KeyboardEvent } from "react";

type Props = {
  onChange: (codes: string[] | null, isAll: boolean) => void;
  onError?: (msg: string) => void;
};

const parseCodes = (text: string): string[] => {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

const CowFilter: React.FC<Props> = ({ onChange, onError }) => {
  const [isAll, setIsAll] = useState(true);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    // default: All
    onChange(null, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyText = (raw: string) => {
    const codes = parseCodes(raw);
    if (codes.length === 0) {
      // empty -> select All
      setIsAll(true);
      setEditing(false);
      setText("");
      onChange(null, true);
      return;
    }

    if (codes.length === 1 && codes[0] === "0") {
      onError && onError("Código '0' no es válido");
      return;
    }

    setIsAll(false);
    setEditing(false);
    setText(codes.join(", "));
    onChange(codes, false);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      applyText(text);
    }
  };

  return (
    <div className="cow-filter flex items-center gap-3">
      <button
        className={`px-3 py-1 rounded font-semibold ${isAll ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}
        onClick={() => {
          setIsAll(true);
          setEditing(false);
          setText("");
          onChange(null, true);
        }}
      >
        All
      </button>

      <div className="flex-1">
        {editing ? (
          <div className="flex items-center">
            <input
              className="border px-2 py-1 rounded flex-1 mr-2"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKey}
              onBlur={() => applyText(text)}
              autoFocus
              placeholder="Ej: 123, 456"
            />
            <button
              className="bg-green-500 text-white px-3 py-1 rounded"
              onClick={() => applyText(text)}
              aria-label="Enviar códigos"
            >
              →
            </button>
          </div>
        ) : (
          <div
            className={`px-2 py-1 rounded ${isAll ? "text-gray-500" : "text-gray-800 cursor-pointer"}`}
            onClick={() => {
              setEditing(true);
              setIsAll(false);
            }}
          >
            {isAll ? "Códigos" : text || "(editar códigos)"}
          </div>
        )}
      </div>
    </div>
  );
};

export default CowFilter;
