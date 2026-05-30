import { useState, type InputHTMLAttributes } from "react";

// eslint-disable-next-line react-refresh/only-export-components
export enum NumberInputError {
  NotANumber = "Not a number",
  TooSmall = "Value is too small",
  TooLarge = "Value is too large",
}

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value?: never; // hard override omit doesn't work for some reason
  onChange?: never;
  type?: never;
  min?: number;
  max?: number;
  defaultValue?: number;
  onTextValueChange?: (value: string) => void;
  onValueChange?: (value: number | NumberInputError) => void;
};

function getStateFromValue(
  value: string,
  min?: number,
  max?: number,
): number | NumberInputError {
  const num = Number(value);
  if (value === "" || Number.isNaN(num)) return NumberInputError.NotANumber;
  if (min !== undefined && num < min) return NumberInputError.TooSmall;
  if (max !== undefined && num > max) return NumberInputError.TooLarge;
  return num;
}

export default function NumberInput({
  style,
  min,
  max,
  onValueChange,
  onTextValueChange,
  defaultValue = 0,
  ...rest
}: Props) {
  const [textValue, setTextValue] = useState(defaultValue.toString());
  const state = getStateFromValue(textValue, min, max);

  return (
    <input
      {...rest}
      {...(typeof state === "number"
        ? {}
        : { style: { ...style, border: "2px solid red" } })}
      type="text"
      value={textValue}
      onChange={(e) => {
        setTextValue(e.target.value);
        onTextValueChange?.(e.target.value);
        if (onValueChange)
          onValueChange(getStateFromValue(e.target.value, min, max));
      }}
    />
  );
}
