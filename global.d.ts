declare module "*.css" {
  const styles: Record<string, string>;
  export default styles;
}

declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}
