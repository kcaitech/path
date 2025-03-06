/*
 * Copyright (c) vextra.io. All rights reserved.
 *
 * Use of this source code is governed by a MIT license that can be
 * found in the LICENSE file.
 */

declare module 'pathkit-wasm' {
    function PathKitInit(wasm: any): Promise<any>;
    export default PathKitInit
  }
  
  declare module "*.wasm" {
    const content: string
    export default content
  }