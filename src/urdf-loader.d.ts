declare module "urdf-loader" {
  import * as THREE from "three";

  export default class URDFLoader extends THREE.Loader {
    constructor(manager?: THREE.LoadingManager);
    packages: { [key: string]: string };
    load(
      url: string,
      onLoad: (robot: THREE.Object3D) => void,
      onProgress?: (xhr: ProgressEvent) => void,
      onError?: (error: Error) => void
    ): void;
    parse(content: string): THREE.Object3D;
  }
}
