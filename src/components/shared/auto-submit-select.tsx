"use client";

export function AutoSubmitSelect({
  name,
  defaultValue,
  options,
}: {
  name: string;
  defaultValue: string;
  options: string[];
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="mt-2 h-7 w-full rounded border text-xs"
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      {options.map((item) => (
        <option key={item} value={item}>
          {item.replaceAll("_", " ")}
        </option>
      ))}
    </select>
  );
}
