export function print(statement: string) {
  const prefix = `☂️ codecov`;
  console.log(`${prefix} :: ${statement}`);
}

export function displayChange(number: number) {
  const fixed = number.toFixed(2);
  if (number <= 0) {
    return fixed;
  } else {
    return `+${fixed}`;
  }
}
