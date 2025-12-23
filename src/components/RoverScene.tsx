import { useEffect, useRef } from "react";
import * as THREE from "three";
import URDFLoader from "urdf-loader";
import GUI from "lil-gui";
import { gsap } from "gsap";

const wheelStart = -14;

const startJointValues = {
  chassis_to_arm_a: 24,
  arm_a_to_arm_b: 0,
  arm_b_to_arm_c: 0,
  arm_c_to_arm_d: 0,
  arm_d_to_arm_e: 0,
  gripper_link: 8,
  left_bogie_to_front_left_wheel: wheelStart,
  left_bogie_to_center_left_wheel: wheelStart,
  left_rocker_to_back_left_wheel: wheelStart,
  right_bogie_to_front_right_wheel: wheelStart,
  right_bogie_to_center_right_wheel: wheelStart,
  right_rocker_to_back_right_wheel: wheelStart,
};

const endJointValues = {
  chassis_to_arm_a: 24,
  arm_a_to_arm_b: -0.785,
  arm_b_to_arm_c: 1.91,
  arm_c_to_arm_d: -1.2,
  arm_d_to_arm_e: -1.57,
  gripper_link: 0,
  left_bogie_to_front_left_wheel: 0,
  left_bogie_to_center_left_wheel: 0,
  left_rocker_to_back_left_wheel: 0,
  right_bogie_to_front_right_wheel: 0,
  right_bogie_to_center_right_wheel: 0,
  right_rocker_to_back_right_wheel: 0,
};

export default function RoverScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !canvasRef.current) return;
    initialized.current = true;

    const canvas = canvasRef.current;
    const gui = new GUI({ width: 400 });
    gui.hide(); // Hidden by default

    const cursor = { x: 0, y: 0 };
    let rover: any = null;
    let jointTweenObject: any = {};

    // Scene setup
    const scene = new THREE.Scene();
    const cameraGroup = new THREE.Group();
    scene.add(cameraGroup);
    scene.background = new THREE.Color(0x0a0a1a);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(-30, 150, 100);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x9eb4d0, 1.0);
    fillLight.position.set(-150, 100, -100);
    scene.add(fillLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(2, 3, 2);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Loading manager
    const manager = new THREE.LoadingManager();
    manager.onLoad = () => {
      console.log("Loading complete!");

      // Animate the rover
      const timeline = gsap.timeline({ repeat: -1, yoyo: true });

      timeline.to(rover.position, {
        x: 50,
        duration: 3,
        ease: "power2.inOut",
      });

      timeline.to(
        jointTweenObject,
        {
          ...endJointValues,
          duration: 3,
          ease: "power2.inOut",
          onUpdate: () => {
            for (const jointName in jointTweenObject) {
              if (rover.joints[jointName]) {
                rover.joints[jointName].setJointValue(jointTweenObject[jointName]);
              }
            }
          },
        },
        "<"
      );
    };

    // Load URDF
    const urdfLoader = new (URDFLoader as any)(manager);
    urdfLoader.packages = { "": "/urdf" };
    urdfLoader.load("/urdf/rover/rover.urdf", (robot: any) => {
      rover = robot;
      robot.position.set(-100, 0, 0);
      robot.rotation.x = -Math.PI / 2;
      robot.updateMatrixWorld();
      scene.add(robot);

      jointTweenObject = { ...startJointValues };
      for (const jointName in jointTweenObject) {
        if (robot.joints[jointName]) {
          robot.joints[jointName].setJointValue(jointTweenObject[jointName]);
        }
      }

      // GUI setup for debugging
      robot.traverse((obj: any) => {
        if (obj.jointType === "revolute" || obj.jointType === "continuous" || obj.jointType === "prismatic") {
          const name = obj.name || "unnamed_joint";
          const initialValue =
            typeof endJointValues[name as keyof typeof endJointValues] === "number"
              ? endJointValues[name as keyof typeof endJointValues]
              : typeof obj.jointValue === "number"
                ? obj.jointValue
                : 0;
          const min = obj.limit?.lower ?? -Math.PI;
          const max = obj.limit?.upper ?? Math.PI;
          const paramObj = { value: initialValue };
          obj.setJointValue(initialValue);
          gui
            .add(paramObj, "value", min, max, 0.01)
            .name(`${name} (${obj.jointType})`)
            .onChange((value: number) => {
              obj.setJointValue(value);
            });
        }
      });
    });

    // Camera setup
    const sizes = { width: window.innerWidth, height: window.innerHeight };
    const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);
    camera.position.set(200, 150, 250);
    camera.lookAt(0, 0, 0);
    cameraGroup.add(camera);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Event handlers
    const handleMouseMove = (event: MouseEvent) => {
      cursor.x = event.clientX / sizes.width - 0.5;
      cursor.y = event.clientY / sizes.height - 0.5;
    };

    const handleResize = () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    const handleDoubleClick = () => {
      const fullscreenElement = document.fullscreenElement || (document as any).webkitFullscreenElement;
      if (!fullscreenElement) {
        if (canvas.requestFullscreen) canvas.requestFullscreen();
        else if ((canvas as any).webkitRequestFullscreen) (canvas as any).webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);
    window.addEventListener("dblclick", handleDoubleClick);

    // Animation loop
    const tick = () => {
      const targetTiltY = -cursor.x * 0.2;
      const targetTiltX = -cursor.y * 0.2;
      cameraGroup.rotation.y += (targetTiltY - cameraGroup.rotation.y) * 0.01;
      cameraGroup.rotation.x += (targetTiltX - cameraGroup.rotation.x) * 0.01;
      renderer.render(scene, camera);
      window.requestAnimationFrame(tick);
    };
    tick();

    // Cleanup
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("dblclick", handleDoubleClick);
      renderer.dispose();
      gui.destroy();
    };
  }, []);

  return <canvas ref={canvasRef} className="webgl w-full h-full fixed top-0 left-0" />;
}
