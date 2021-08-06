declare module 'frisbee' {
  // TODO: improve with more specific types
  type RequestOptions = Record<string, any>;
  type Response = any;

  declare class Frisbee {
    constructor(options: { baseURI?: string; headers?: Record<string, string> });

    get(path: string, options?: RequestOptions): Promise<Response>;
    post(path: string, options?: RequestOptions): Promise<Response>;
    // TODO: add missing methods
  }

  export default Frisbee;
}
