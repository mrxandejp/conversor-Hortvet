const scripts = new Map();
export function loadScript(path) {
  if (!scripts.has(path))
    scripts.set(
      path,
      new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = new URL(path, import.meta.url).href;
        script.onload = resolve;
        script.onerror = () => {
          script.remove();
          scripts.delete(path);
          reject(
            new Error("Não foi possível carregar os recursos do relatório."),
          );
        };
        document.head.append(script);
      }),
    );
  return scripts.get(path);
}

let fonts;
export function loadFonts() {
  if (!fonts)
    fonts = Promise.all(
      ["Regular", "Bold"].map(async (weight) => {
        const response = await fetch(
          new URL(`./vendor/fonts/Lato-${weight}.ttf`, import.meta.url),
        );
        if (!response.ok)
          throw new Error("Não foi possível carregar a fonte do relatório.");
        const bytes = new Uint8Array(await response.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192)
          binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        return btoa(binary);
      }),
    ).catch((error) => {
      fonts = undefined;
      throw error;
    });
  return fonts;
}
