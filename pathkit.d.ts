declare module 'pathkit-wasm' {
    function PathKitInit(wasm: any): Promise<any>;
    export default PathKitInit
  }
  
  declare module "*.wasm" {
    const content: string
    export default content
  }