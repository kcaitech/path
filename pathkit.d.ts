/*
 * Copyright (c) 2023-2025 KCai Technology (https://kcaitech.com).
 * Licensed under the MIT License.
 */

declare module 'pathkit-wasm' {
    function PathKitInit(wasm: any): Promise<any>;
    export default PathKitInit
  }
  
  declare module "*.wasm" {
    const content: string
    export default content
  }