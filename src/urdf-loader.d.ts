declare module "urdf-loader" {
  import * as THREE from "three";

  export default class URDFLoader {
    constructor();
    packages: { [key: string]: string };
    load(
      url: string,
      onLoad: (robot: THREE.Object3D) => void,
      onProgress?: (xhr: ProgressEvent) => void,
      onError?: (error: Error) => void
    ): void;
  }
}
