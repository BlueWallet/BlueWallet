export const wait = (miliseconds: number) =>
  new Promise(resolve => {
    setTimeout(resolve, miliseconds);
  });
